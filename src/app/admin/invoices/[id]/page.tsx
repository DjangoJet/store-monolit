import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoice } from "@/modules/invoices/service";
import { cancelInvoiceAction } from "@/modules/invoices/actions";
import { InvoiceView, type InvoiceViewData } from "@/components/invoice-view";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";

export default async function AdminInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

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

      <div className="mt-4 rounded-lg border print:border-0">
        <InvoiceView invoice={invoice as unknown as InvoiceViewData} />
      </div>
    </div>
  );
}
