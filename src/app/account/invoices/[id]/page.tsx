import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/session";
import { getInvoiceForUser } from "@/modules/invoices/service";
import { InvoiceView, type InvoiceViewData } from "@/components/invoice-view";
import { PrintButton } from "@/components/print-button";

export default async function AccountInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const invoice = await getInvoiceForUser(id, user.id);
  if (!invoice) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/account/orders" className="text-sm text-muted-foreground hover:underline">
          ← Zamówienia
        </Link>
        <PrintButton />
      </div>
      <div className="mt-4 rounded-lg border print:border-0">
        <InvoiceView invoice={invoice as unknown as InvoiceViewData} />
      </div>
    </main>
  );
}
