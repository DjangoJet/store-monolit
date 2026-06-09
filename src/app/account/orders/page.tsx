import Link from "next/link";
import { requireUser } from "@/server/session";
import { listUserOrders } from "@/modules/orders/service";
import { listUserInvoices } from "@/modules/invoices/service";
import { formatMoney, features } from "@/lib/config";
import { Badge } from "@/components/ui/badge";

export default async function AccountOrdersPage() {
  const user = await requireUser();
  const orders = await listUserOrders(user.id);
  const invoices = features.invoices ? await listUserInvoices(user.id) : [];
  const invoiceByOrder = new Map(invoices.map((i) => [i.orderId, i]));

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/account" className="text-sm text-muted-foreground hover:underline">
        ← Konto
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Moje zamówienia</h1>

      {orders.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Nie masz jeszcze zamówień.</p>
      ) : (
        <div className="mt-6 space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div>
                <p className="font-medium">{o.number}</p>
                <p className="text-muted-foreground">
                  {o.createdAt.toLocaleDateString("pl-PL")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {invoiceByOrder.get(o.id) && (
                  <Link
                    href={`/account/invoices/${invoiceByOrder.get(o.id)!.id}`}
                    className="text-xs underline"
                  >
                    Faktura
                  </Link>
                )}
                <Badge variant={o.paymentStatus === "PAID" ? "success" : "muted"}>
                  {o.paymentStatus}
                </Badge>
                <span className="font-medium">{formatMoney(o.totalAmount, o.currency)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
