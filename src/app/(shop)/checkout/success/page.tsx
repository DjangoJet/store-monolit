import Link from "next/link";
import { getOrderByNumber } from "@/modules/orders/service";
import { formatMoney } from "@/lib/utils";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: number } = await searchParams;
  const order = number ? await getOrderByNumber(number) : null;

  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Dziękujemy za zamówienie!</h1>

      {order ? (
        <div className="mt-6 space-y-4 rounded-lg border p-6 text-left">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Numer zamówienia</span>
            <span className="font-medium">{order.number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status płatności</span>
            <span className="font-medium">{order.paymentStatus}</span>
          </div>
          <ul className="space-y-1 border-t pt-4 text-sm">
            {order.lines.map((l) => (
              <li key={l.id} className="flex justify-between">
                <span>
                  {l.productTitle} ({l.variantTitle}) ×{l.quantity}
                </span>
                <span>{formatMoney(l.totalAmount, order.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t pt-4 font-semibold">
            <span>Razem</span>
            <span>{formatMoney(order.totalAmount, order.currency)}</span>
          </div>
          {order.taxAmount > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>w tym VAT</span>
              <span>{formatMoney(order.taxAmount, order.currency)}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 text-muted-foreground">
          Zamówienie zostało przyjęte.
        </p>
      )}

      <Link href="/products" className="mt-8 inline-block text-sm font-medium underline">
        Kontynuuj zakupy
      </Link>
    </div>
  );
}
