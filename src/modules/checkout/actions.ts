"use server";

import { redirect } from "next/navigation";
import { toFieldErrors } from "@/lib/forms";
import { clearCart, getCurrentCart } from "@/modules/cart/service";
import { createOrderFromCart } from "@/modules/orders/service";
import { createPaymentForOrder } from "@/modules/payments/service";
import { getCurrentUser } from "@/server/session";
import { checkoutConfig } from "@/lib/config";
import { billingAddressSchema, checkoutSchema, type BillingAddressInput } from "./schemas";

export type CheckoutState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

/** Prefiksuje klucze błędów (np. `postalCode` -> `billingPostalCode`), by nie kolidowały z adresem dostawy. */
function prefixKeys(errs: Record<string, string>, prefix: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(errs)) {
    out[`${prefix}${k[0].toUpperCase()}${k.slice(1)}`] = v;
  }
  return out;
}

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

  const invoiceRequested = formData.get("invoiceRequested") === "on";
  const billingSameAsShipping = formData.get("billingSameAsShipping") === "on";

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
    invoiceRequested,
    buyerNip: formData.get("buyerNip") || undefined,
    buyerName: formData.get("buyerName") || undefined,
    billingSameAsShipping,
  });
  if (!parsed.success) {
    return {
      error: "Sprawdź poprawność danych.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  // Adres do faktury (gdy inny niż dostawy) — parsowany osobno, klucze błędów z prefiksem `billing`.
  let billingAddress: BillingAddressInput | undefined;
  if (invoiceRequested && !billingSameAsShipping) {
    const billing = billingAddressSchema.safeParse({
      line1: formData.get("billingLine1"),
      line2: formData.get("billingLine2") || undefined,
      city: formData.get("billingCity"),
      postalCode: formData.get("billingPostalCode"),
      country: formData.get("billingCountry") || "PL",
    });
    if (!billing.success) {
      return {
        error: "Sprawdź poprawność danych.",
        fieldErrors: prefixKeys(toFieldErrors(billing.error), "billing"),
      };
    }
    billingAddress = billing.data;
  }

  const order = await createOrderFromCart(cart, { ...parsed.data, billingAddress });
  const payment = await createPaymentForOrder(order);
  await clearCart(cart.id);

  redirect(
    payment.redirectUrl ??
      `/checkout/success?order=${encodeURIComponent(order.number)}`,
  );
}
