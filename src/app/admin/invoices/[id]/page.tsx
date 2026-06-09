import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoice } from "@/modules/invoices/service";
import {
  cancelInvoiceAction,
  refreshKsefAction,
  submitKsefAction,
} from "@/modules/invoices/actions";
import { getEInvoiceProvider } from "@/modules/invoices/efaktura/registry";
import { InvoiceView, type InvoiceViewData } from "@/components/invoice-view";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";

const KSEF_STATUS_LABEL: Record<string, string> = {
  NOT_SENT: "Nie wysłano",
  PENDING: "Wysłano — oczekuje na przetworzenie",
  ACCEPTED: "Przyjęta przez KSeF",
  REJECTED: "Odrzucona przez KSeF",
};

export default async function AdminInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  // Panel KSeF tylko gdy e-fakturowanie włączone (KSEF_ENABLED=true → provider aktywny).
  const ksefActive = getEInvoiceProvider().active;
  const ksefStatus = invoice.ksefStatus as string;
  const canSend = ksefStatus === "NOT_SENT" || ksefStatus === "REJECTED";

  return (
    <div>
      <div className="flex items-center justify-between print:hidden">
        <Link href="/admin/invoices" className="text-sm text-muted-foreground hover:underline">
          ← Faktury
        </Link>
        <div className="flex gap-2">
          <PrintButton />
          {invoice.status === "ISSUED" && (
            <form action={cancelInvoiceAction}>
              <input type="hidden" name="id" value={invoice.id} />
              {invoice.orderId && (
                <input type="hidden" name="orderId" value={invoice.orderId} />
              )}
              <Button type="submit" variant="destructive" size="sm">
                Anuluj
              </Button>
            </form>
          )}
        </div>
      </div>

      {ksefActive && (
        <div className="mt-4 rounded-lg border p-4 print:hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1 text-sm">
              <p className="font-medium">KSeF</p>
              <p className="text-muted-foreground">
                Status: {KSEF_STATUS_LABEL[ksefStatus] ?? ksefStatus}
                {invoice.ksefNumber ? ` — ${invoice.ksefNumber}` : ""}
              </p>
              {invoice.ksefError && (
                <p className="text-destructive">{invoice.ksefError}</p>
              )}
            </div>
            <div className="flex gap-2">
              {canSend && (
                <form action={submitKsefAction}>
                  <input type="hidden" name="id" value={invoice.id} />
                  <Button type="submit" size="sm">
                    Wyślij do KSeF
                  </Button>
                </form>
              )}
              {ksefStatus === "PENDING" && (
                <form action={refreshKsefAction}>
                  <input type="hidden" name="id" value={invoice.id} />
                  <Button type="submit" size="sm" variant="outline">
                    Odśwież status
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg border print:border-0">
        <InvoiceView invoice={invoice as unknown as InvoiceViewData} />
      </div>
    </div>
  );
}
