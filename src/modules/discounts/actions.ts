"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCart, getOrCreateCartId } from "@/modules/cart/service";
import { getCurrentUser, requireRole } from "@/server/session";
import { toMinor } from "@/lib/utils";
import { toFieldErrors } from "@/lib/forms";
import { createDiscount, deleteDiscount, evaluateDiscount } from "./service";
import { discountInputSchema } from "./schemas";

export type DiscountState =
  | { error?: string; success?: string; fieldErrors?: Record<string, string> }
  | undefined;

// ---- Koszyk ----

export async function applyDiscountAction(
  _prev: DiscountState,
  formData: FormData,
): Promise<DiscountState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Podaj kod rabatowy." };

  const cart = await getCurrentCart();
  if (!cart || cart.lines.length === 0) return { error: "Koszyk jest pusty." };

  const user = await getCurrentUser();
  const ev = await evaluateDiscount(code, cart.subtotal, user?.id);
  if (!ev.ok) return { error: ev.error };

  const cartId = await getOrCreateCartId();
  await prisma.cart.update({ where: { id: cartId }, data: { discountCode: code } });
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { success: "Kod rabatowy zastosowany." };
}

export async function removeDiscountAction() {
  const cartId = await getOrCreateCartId();
  await prisma.cart.update({ where: { id: cartId }, data: { discountCode: null } });
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

// ---- Admin ----

export async function createDiscountAction(
  _prev: DiscountState,
  formData: FormData,
): Promise<DiscountState> {
  await requireRole("STAFF");

  const parsed = discountInputSchema.safeParse({
    code: formData.get("code"),
    type: formData.get("type"),
    value: formData.get("value") ?? 0,
    minSubtotal: formData.get("minSubtotal") || null,
    usageLimit: formData.get("usageLimit") || null,
  });
  if (!parsed.success) {
    return { error: "Sprawdź poprawność danych.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const { code, type } = parsed.data;
  // Kwoty -> grosze; procent zostaje liczbą całkowitą.
  const value = type === "FIXED" ? toMinor(String(parsed.data.value)) : Math.round(parsed.data.value);
  const minSubtotal =
    parsed.data.minSubtotal != null ? toMinor(String(parsed.data.minSubtotal)) : null;
  const usageLimit = parsed.data.usageLimit ?? null;

  try {
    await createDiscount({ code, type, value, minSubtotal, usageLimit });
  } catch {
    return { fieldErrors: { code: "Kod o tej nazwie już istnieje." } };
  }
  revalidatePath("/admin/discounts");
  return { success: "Dodano kod rabatowy." };
}

export async function deleteDiscountAction(formData: FormData) {
  await requireRole("STAFF");
  await deleteDiscount(String(formData.get("id")));
  revalidatePath("/admin/discounts");
}
