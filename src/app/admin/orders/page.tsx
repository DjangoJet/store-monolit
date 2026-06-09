import Link from "next/link";
import { listOrders } from "@/modules/orders/admin";
import { formatMoney } from "@/lib/utils";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const PAYMENT_VARIANT: Record<string, "success" | "muted" | "outline"> = {
  PAID: "success",
  UNPAID: "muted",
  REFUNDED: "outline",
  PARTIALLY_REFUNDED: "outline",
  FAILED: "outline",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; payment?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page) || 1;

  const { items, total, pages } = await listOrders({
    q: sp.q,
    status: (sp.status as OrderStatus) || undefined,
    paymentStatus: (sp.payment as PaymentStatus) || undefined,
    page,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Zamówienia</h1>
      <p className="mt-1 text-sm text-muted-foreground">{total} zamówień</p>

      <form className="mt-6 flex flex-wrap gap-2" method="get">
        <Input name="q" placeholder="Numer lub email..." defaultValue={sp.q ?? ""} className="max-w-xs" />
        <Select name="status" defaultValue={sp.status ?? ""} className="max-w-44">
          <option value="">Status: wszystkie</option>
          <option value="PENDING">PENDING</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </Select>
        <Select name="payment" defaultValue={sp.payment ?? ""} className="max-w-44">
          <option value="">Płatność: wszystkie</option>
          <option value="UNPAID">UNPAID</option>
          <option value="PAID">PAID</option>
          <option value="REFUNDED">REFUNDED</option>
          <option value="FAILED">FAILED</option>
        </Select>
        <Button type="submit" variant="outline">Filtruj</Button>
      </form>

      <div className="mt-4 overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Numer</th>
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium">Klient</th>
              <th className="px-4 py-2 font-medium">Suma</th>
              <th className="px-4 py-2 font-medium">Płatność</th>
              <th className="px-4 py-2 font-medium">Realizacja</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Brak zamówień.
                </td>
              </tr>
            )}
            {items.map((o) => (
              <tr key={o.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                    {o.number}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {o.createdAt.toLocaleDateString("pl-PL")}
                </td>
                <td className="px-4 py-2">{o.email}</td>
                <td className="px-4 py-2">{formatMoney(o.totalAmount, o.currency)}</td>
                <td className="px-4 py-2">
                  <Badge variant={PAYMENT_VARIANT[o.paymentStatus] ?? "muted"}>
                    {o.paymentStatus}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{o.fulfillmentStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex gap-2 text-sm">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/orders?${new URLSearchParams({
                ...(sp.q ? { q: sp.q } : {}),
                ...(sp.status ? { status: sp.status } : {}),
                ...(sp.payment ? { payment: sp.payment } : {}),
                page: String(p),
              })}`}
              className={`rounded-md border px-3 py-1 ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
