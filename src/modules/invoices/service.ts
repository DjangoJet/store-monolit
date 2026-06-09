import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { vatPortion } from "@/modules/orders/tax";
import { submitInvoiceToKsef } from "./efaktura/service";

const SETTINGS_KEY = "invoice.config";

export interface SellerSettings {
  name: string;
  address: string;
  taxId?: string; // NIP lub PESEL (opcjonalny — np. działalność nierejestrowana)
  vatExempt: boolean; // true → faktura bez VAT
  exemptionNote?: string; // podstawa zwolnienia (dla vatExempt)
  bankAccount?: string;
  vatRate: number; // domyślna stawka % (gdy nie vatExempt)
  numberPrefix: string; // np. "FV "
  paymentTermsDays: number;
}

const DEFAULT_SETTINGS: SellerSettings = {
  name: "Mój Sklep",
  address: "",
  taxId: undefined,
  vatExempt: false,
  exemptionNote: undefined,
  bankAccount: undefined,
  vatRate: 23,
  numberPrefix: "FV ",
  paymentTermsDays: 14,
};

export async function getInvoiceSettings(): Promise<SellerSettings> {
  const row = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(row.value as Partial<SellerSettings>) };
}

export async function saveInvoiceSettings(input: SellerSettings) {
  await prisma.setting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: input as unknown as Prisma.InputJsonValue },
    create: { key: SETTINGS_KEY, value: input as unknown as Prisma.InputJsonValue },
  });
}

async function nextInvoiceNumber(prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const count = await prisma.invoice.count({
    where: { issueDate: { gte: start, lt: end } },
  });
  return `${prefix}${year}/${String(count + 1).padStart(4, "0")}`;
}

interface BuiltLine {
  name: string;
  quantity: number;
  unitNet: number;
  unitGross: number;
  vatRate: number;
  net: number;
  vat: number;
  gross: number;
  position: number;
}

export async function createInvoiceFromOrder(
  orderId: string,
  opts: { buyerNip?: string; buyerName?: string } = {},
) {
  const existing = await prisma.invoice.findFirst({
    where: { orderId, status: "ISSUED" },
  });
  if (existing) return existing;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lines: true },
  });
  if (!order) throw new Error("Zamówienie nie istnieje");

  const settings = await getInvoiceSettings();
  const type = settings.vatExempt ? "NO_VAT" : "VAT";
  const shippingRate = type === "VAT" ? settings.vatRate : 0;
  const subtotal = order.subtotalAmount;

  const lines: BuiltLine[] = [];
  let pos = 0;

  // Rabat wbudowany proporcjonalnie w pozycje; stawka VAT z migawki zamówienia (wielostawkowo).
  for (const l of order.lines) {
    const lineRate = type === "VAT" ? l.vatRate : 0;
    const discountShare =
      subtotal > 0 ? Math.round((order.discountAmount * l.totalAmount) / subtotal) : 0;
    const gross = Math.max(0, l.totalAmount - discountShare);
    const vat = vatPortion(gross, lineRate);
    const net = gross - vat;
    const unitGross = l.quantity > 0 ? Math.round(gross / l.quantity) : gross;
    lines.push({
      name: `${l.productTitle}${l.variantTitle ? ` (${l.variantTitle})` : ""}`,
      quantity: l.quantity,
      unitNet: unitGross - vatPortion(unitGross, lineRate),
      unitGross,
      vatRate: lineRate,
      net,
      vat,
      gross,
      position: pos++,
    });
  }

  if (order.shippingAmount > 0) {
    const gross = order.shippingAmount;
    const vat = vatPortion(gross, shippingRate);
    lines.push({
      name: `Wysyłka${order.shippingMethod ? ` — ${order.shippingMethod}` : ""}`,
      quantity: 1,
      unitNet: gross - vat,
      unitGross: gross,
      vatRate: shippingRate,
      net: gross - vat,
      vat,
      gross,
      position: pos++,
    });
  }

  const notes =
    order.discountAmount > 0
      ? `Uwzględniono rabat${order.discountCode ? ` ${order.discountCode}` : ""}: -${(order.discountAmount / 100).toFixed(2)} ${order.currency}`
      : undefined;

  const netAmount = lines.reduce((s, l) => s + l.net, 0);
  const vatAmount = lines.reduce((s, l) => s + l.vat, 0);
  const grossAmount = lines.reduce((s, l) => s + l.gross, 0);

  // Dane nabywcy: priorytet ma adres do faktury (gdy klient go podał), inaczej adres dostawy.
  const billing = order.billingAddress as Record<string, string> | null;
  const addr = billing ?? (order.shippingAddress as Record<string, string> | null) ?? {};
  const buyerName =
    opts.buyerName ||
    billing?.company ||
    [addr.firstName, addr.lastName].filter(Boolean).join(" ").trim() ||
    order.email;
  const buyer = {
    name: buyerName,
    address: [addr.line1, addr.line2, `${addr.postalCode ?? ""} ${addr.city ?? ""}`.trim()]
      .filter(Boolean)
      .join(", "),
    email: order.email,
  };

  const seller = {
    name: settings.name,
    address: settings.address,
    taxId: settings.taxId,
    vatExempt: settings.vatExempt,
    exemptionNote: settings.exemptionNote,
    bankAccount: settings.bankAccount,
  };

  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + settings.paymentTermsDays);

  const invoice = await prisma.invoice.create({
    data: {
      number: await nextInvoiceNumber(settings.numberPrefix),
      orderId: order.id,
      type,
      saleDate: order.placedAt ?? order.createdAt,
      issueDate,
      dueDate,
      currency: order.currency,
      seller: seller as unknown as Prisma.InputJsonValue,
      buyer: buyer as unknown as Prisma.InputJsonValue,
      buyerNip: opts.buyerNip || order.buyerNip || null,
      netAmount,
      vatAmount,
      grossAmount,
      paymentMethod: order.paymentStatus === "PAID" ? "Zapłacono" : "Przelew",
      notes,
      lines: { create: lines },
    },
    include: { lines: true },
  });

  // Wysyłka do KSeF — no-op gdy KSEF_ENABLED=false. Nie blokuje wystawienia faktury.
  try {
    await submitInvoiceToKsef(invoice.id);
  } catch {
    // błąd KSeF nie może wywrócić tworzenia faktury (szczegóły lądują w invoice.ksefError)
  }

  return invoice;
}

export function getInvoice(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: { lines: { orderBy: { position: "asc" } } },
  });
}

export function getInvoiceByOrder(orderId: string) {
  return prisma.invoice.findFirst({
    where: { orderId, status: "ISSUED" },
    include: { lines: { orderBy: { position: "asc" } } },
  });
}

export function listInvoices() {
  return prisma.invoice.findMany({ orderBy: { issueDate: "desc" } });
}

/** Faktury należące do zamówień danego użytkownika (do historii konta). */
export function listUserInvoices(userId: string) {
  return prisma.invoice.findMany({
    where: { status: "ISSUED", order: { userId } },
    select: { id: true, orderId: true, number: true },
  });
}

export async function cancelInvoice(id: string) {
  return prisma.invoice.update({ where: { id }, data: { status: "CANCELLED" } });
}

/** Faktura widoczna dla klienta tylko gdy należy do jego zamówienia. */
export async function getInvoiceForUser(id: string, userId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { lines: { orderBy: { position: "asc" } }, order: { select: { userId: true } } },
  });
  if (!invoice || invoice.order?.userId !== userId) return null;
  return invoice;
}
