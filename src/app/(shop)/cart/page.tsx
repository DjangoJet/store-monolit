import Link from "next/link";
import { getCurrentCart } from "@/modules/cart/service";
import {
  removeCartLineAction,
  updateCartLineAction,
} from "@/modules/cart/actions";
import { removeDiscountAction } from "@/modules/discounts/actions";
import { formatMoney } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DiscountForm } from "./discount-form";

export default async function CartPage() {
  const cart = await getCurrentCart();

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Koszyk</h1>
        <p className="mt-2 text-muted-foreground">Twój koszyk jest pusty.</p>
        <Link href="/products" className={`${buttonVariants()} mt-6`}>
          Przejdź do sklepu
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Koszyk</h1>

      <div className="mt-6 space-y-4">
        {cart.lines.map((line) => (
          <div key={line.id} className="flex items-center gap-4 rounded-lg border p-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted">
              {line.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={line.imageUrl} alt={line.productTitle} className="h-full w-full object-cover" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <Link href={`/product/${line.slug}`} className="font-medium hover:underline">
                {line.productTitle}
              </Link>
              <p className="text-sm text-muted-foreground">{line.variantTitle}</p>
              <p className="text-sm">{formatMoney(line.unitAmount, cart.currency)}</p>
            </div>

            <form action={updateCartLineAction} className="flex items-center gap-2">
              <input type="hidden" name="variantId" value={line.variantId} />
              <Input
                name="quantity"
                type="number"
                min={1}
                defaultValue={line.quantity}
                className="w-16"
              />
              <button type="submit" className="text-xs text-muted-foreground hover:underline">
                Aktualizuj
              </button>
            </form>

            <div className="w-24 text-right font-medium">
              {formatMoney(line.lineTotal, cart.currency)}
            </div>

            <form action={removeCartLineAction}>
              <input type="hidden" name="variantId" value={line.variantId} />
              <button type="submit" className="text-sm text-destructive hover:underline">
                Usuń
              </button>
            </form>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:justify-between">
        <DiscountForm />

        <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Produkty</span>
            <span>{formatMoney(cart.subtotal, cart.currency)}</span>
          </div>
          {cart.discountAmount > 0 && (
            <div className="flex items-center justify-between text-green-600">
              <span className="flex items-center gap-2">
                Rabat ({cart.discountCode})
                <form action={removeDiscountAction}>
                  <button type="submit" className="text-xs text-muted-foreground underline">
                    usuń
                  </button>
                </form>
              </span>
              <span>-{formatMoney(cart.discountAmount, cart.currency)}</span>
            </div>
          )}
          {cart.freeShipping && (
            <div className="flex justify-between text-green-600">
              <span>Darmowa wysyłka</span>
              <span>✓</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1 text-base font-semibold">
            <span>Suma</span>
            <span>{formatMoney(cart.total, cart.currency)}</span>
          </div>
          <Link href="/checkout" className={`${buttonVariants()} mt-3 w-full`}>
            Przejdź do kasy
          </Link>
        </div>
      </div>
    </div>
  );
}
