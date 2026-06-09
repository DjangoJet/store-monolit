"use server";

import { redirect } from "next/navigation";
import { clearCart, getCurrentCart } from "@/modules/cart/service";
import { createOrderFromCart } from "@/modules/orders/service";
import { createPaymentForOrder } from "@/modules/payments/service";
import { checkoutSchema } from "./schemas";

export type CheckoutState = { error?: string } | undefined;

export async function placeOrderAction(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
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
    return { error: parsed.error.issues[0]?.message ?? "Sprawdź poprawność danych." };
  }

  const order = await createOrderFromCart(cart, parsed.data);
  const payment = await createPaymentForOrder(order);
  await clearCart(cart.id);

  redirect(
    payment.redirectUrl ??
      `/checkout/success?order=${encodeURIComponent(order.number)}`,
  );
}
