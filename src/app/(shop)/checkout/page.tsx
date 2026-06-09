import { redirect } from "next/navigation";
import { getCurrentCart } from "@/modules/cart/service";
import { listActiveShippingMethods } from "@/modules/shipping/service";
import { getCurrentUser } from "@/server/session";
import { checkoutConfig } from "@/lib/config";
import { CheckoutForm, type ShippingMethodOption } from "./checkout-form";

export default async function CheckoutPage() {
  const cart = await getCurrentCart();
  if (!cart || cart.lines.length === 0) {
    redirect("/cart");
  }

  const [methods, user] = await Promise.all([
    listActiveShippingMethods(),
    getCurrentUser(),
  ]);

  // Opcjonalne wymuszenie logowania przed kasą.
  if (checkoutConfig.requireAuth && !user) {
    redirect("/auth/login?callbackUrl=/checkout");
  }

  const options: ShippingMethodOption[] = methods.map((m) => ({
    id: m.id,
    name: m.name,
    priceAmount: m.priceAmount,
    currency: m.currency,
    freeOver: m.freeOver,
    requiresPickupPoint: m.requiresPickupPoint,
    minDays: m.minDays,
    maxDays: m.maxDays,
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Kasa</h1>
      <div className="mt-6">
        <CheckoutForm
          methods={options}
          subtotal={cart.subtotal}
          currency={cart.currency}
          defaultEmail={user?.email}
          discountAmount={cart.discountAmount}
          discountCode={cart.discountCode}
          freeShipping={cart.freeShipping}
        />
      </div>
    </div>
  );
}
