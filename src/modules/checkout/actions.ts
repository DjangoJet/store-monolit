"use server";

import { redirect } from "next/navigation";
import { toFieldErrors } from "@/lib/forms";
import { clearCart, getCurrentCart } from "@/modules/cart/service";
import { createOrderFromCart } from "@/modules/orders/service";
import { createPaymentForOrder } from "@/modules/payments/service";
import { getCurrentUser } from "@/server/session";
import { checkoutConfig } from "@/lib/config";
import { checkoutSchema } from "./schemas";

export type CheckoutState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

export async function placeOrderAction(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  if (checkoutConfig.requireAuth) {
    const user = await getCurrentUser();
    if (!user) return { error: "Zaloguj się, aby złożyć zamówienie." };
  }

  const cart = await getCurrentCart();
  if (!cart || cart.lines.length === 0) {
    return { error: "Koszyk jest pusty." };
  }

  const parsed = checkoutSchema.safeParse({
    email: formData.get("email"),
    shippingMethodId: formData.get("shippingMethodId"),
    pickupPointCode: formData.get("pickupPointCode") || undefined,
    customerNote: formData.get("customerNote") || undefined,
    address: {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      line1: formData.get("line1"),
      line2: formData.get("line2") || undefined,
      city: formData.get("city"),
      postalCode: formData.get("postalCode"),
      country: formData.get("country") || "PL",
      phone: formData.get("phone") || undefined,
    },
  });
  if (!parsed.success) {
    return {
      error: "Sprawdź poprawność danych.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const order = await createOrderFromCart(cart, parsed.data);
  const payment = await createPaymentForOrder(order);
  await clearCart(cart.id);

  redirect(
    payment.redirectUrl ??
      `/checkout/success?order=${encodeURIComponent(order.number)}`,
  );
}
