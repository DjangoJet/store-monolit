import { prisma } from "@/lib/prisma";
import type { EInvoiceData } from "./types";
import { getEInvoiceProvider } from "./registry";

// --- Job odpytywania statusu KSeF (rejestrowany w @/modules/jobs) ---
export const KSEF_POLL_JOB = "ksef:poll-status";
const KSEF_POLL_MAX_ATTEMPTS = 12;
/** Backoff: 5s, 10s, 15s … maks. 60s. */
const ksefPollDelay = (attempt: number) => Math.min(5000 * attempt, 60_000);

// Minimalny kształt wiersza faktury potrzebny do wysyłki (niezależny od ORM).
interface InvoiceRow {
  id: string;
  number: string;
  issueDate: Date;
  saleDate: Date;
  currency: string;
  type: string; // VAT | NO_VAT
  seller: unknown;
  buyer: unknown;
  buyerNip: string | null;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  lines: Array<{
    name: string;
    quantity: number;
    unitNet: number;
    vatRate: number;
    net: number;
    vat: number;
    gross: number;
  }>;
}

/** Mapuje wiersz faktury (snapshoty JSON) na dane niezależne od ORM (wejście do FA(3)). */
function toEInvoiceData(invoice: InvoiceRow): EInvoiceData {
  const seller = (invoice.seller ?? {}) as {
    name?: string;
    address?: string;
    taxId?: string;
    exemptionNote?: string;
  };
  const buyer = (invoice.buyer ?? {}) as { name?: string; address?: string; email?: string };
  const exempt = invoice.type === "NO_VAT";
  return {
    id: invoice.id,
    number: invoice.number,
    issueDate: invoice.issueDate,
    saleDate: invoice.saleDate,
    currency: invoice.currency,
    vatExempt: exempt,
    exemptionLegalBasis: exempt ? seller.exemptionNote : undefined,
    seller: { name: seller.name ?? "", address: seller.address ?? "", taxId: seller.taxId },
    buyer: {
      name: buyer.name ?? "",
      address: buyer.address ?? "",
      nip: invoice.buyerNip ?? undefined,
      email: buyer.email,
    },
    netAmount: invoice.netAmount,
    vatAmount: invoice.vatAmount,
    grossAmount: invoice.grossAmount,
    lines: invoice.lines.map((l) => ({
      name: l.name,
      quantity: l.quantity,
      unitNet: l.unitNet,
      vatRate: l.vatRate,
      net: l.net,
      vat: l.vat,
      gross: l.gross,
    })),
  };
}

/**
 * Wysyła fakturę do KSeF (jeśli provider aktywny — czyli KSEF_ENABLED=true).
 * No-op gdy KSeF wyłączony. Best-effort: błąd providera zapisujemy w `ksefError`,
 * status zostaje wysyłalny ponownie. Nie rzuca przy błędzie KSeF.
 */
export async function submitInvoiceToKsef(invoiceId: string): Promise<void> {
  const provider = getEInvoiceProvider();
  if (!provider.active) return;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  if (!invoice) return;
  // Nie wysyłaj ponownie tego, co już przyjęte lub w trakcie przetwarzania.
  if (invoice.ksefStatus === "ACCEPTED" || invoice.ksefStatus === "PENDING") return;

  try {
    const { referenceNumber } = await provider.submit(toEInvoiceData(invoice));
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        ksefStatus: "PENDING",
        ksefReference: referenceNumber,
        ksefSentAt: new Date(),
        ksefError: null,
      },
    });
    // Auto-odpytywanie statusu w tle (dynamiczny import — bez cyklu z modułem jobs).
    const { getJobQueue } = await import("@/modules/jobs");
    await getJobQueue().enqueue(KSEF_POLL_JOB, { invoiceId, attempt: 1 }, { delayMs: ksefPollDelay(1) });
  } catch (err) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { ksefError: err instanceof Error ? err.message : String(err) },
    });
  }
}

/**
 * Odpytuje KSeF o status wysłanej faktury i utrwala wynik (numer KSeF + UPO lub
 * odrzucenie). Docelowo wołane cyklicznie przez job; na razie ręcznie z admina.
 */
export async function refreshKsefStatus(invoiceId: string): Promise<void> {
  const provider = getEInvoiceProvider();
  if (!provider.active) return;

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.ksefStatus !== "PENDING" || !invoice.ksefReference) return;

  try {
    const res = await provider.getStatus(invoice.ksefReference);
    if (res.status === "ACCEPTED") {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          ksefStatus: "ACCEPTED",
          ksefNumber: res.ksefNumber ?? null,
          ksefUpoXml: res.upoXml ?? null,
          ksefError: null,
        },
      });
    } else if (res.status === "REJECTED") {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { ksefStatus: "REJECTED", ksefError: res.error ?? "Odrzucono przez KSeF" },
      });
    }
    // PENDING → bez zmian, kolejne odpytanie później.
  } catch (err) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { ksefError: err instanceof Error ? err.message : String(err) },
    });
  }
}

/**
 * Handler joba `ksef:poll-status`: odpytuje status i — jeśli wciąż PENDING —
 * przekolejkowuje się z rosnącym opóźnieniem (do limitu prób). Rejestrowany w @/modules/jobs.
 */
export async function pollKsefStatusJob(payload: unknown): Promise<void> {
  const { invoiceId, attempt = 1 } = (payload ?? {}) as { invoiceId?: string; attempt?: number };
  if (!invoiceId) return;

  await refreshKsefStatus(invoiceId);

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { ksefStatus: true },
  });
  if (invoice?.ksefStatus === "PENDING" && attempt < KSEF_POLL_MAX_ATTEMPTS) {
    const { getJobQueue } = await import("@/modules/jobs");
    await getJobQueue().enqueue(
      KSEF_POLL_JOB,
      { invoiceId, attempt: attempt + 1 },
      { delayMs: ksefPollDelay(attempt + 1) },
    );
  }
}
