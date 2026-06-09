"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCart, getOrCreateCartId } from "@/modules/cart/service";
import { getCurrentUser, requireRole } from "@/server/session";
import { toMinor } from "@/lib/utils";
import { createDiscount, deleteDiscount, evaluateDiscount } from "./service";

export type DiscountState = { error?: string; success?: string } | undefined;

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
  const code = String(formData.get("code") ?? "").trim();
  const type = String(formData.get("type")) as "PERCENT" | "FIXED" | "FREE_SHIPPING";
  if (!code) return { error: "Kod jest wymagany." };

  const rawValue = String(formData.get("value") ?? "0");
  const value = type === "FIXED" ? toMinor(rawValue) : Math.round(Number(rawValue) || 0);
  const minSubtotal = formData.get("minSubtotal")
    ? toMinor(String(formData.get("minSubtotal")))
    : null;
  const usageLimit = formData.get("usageLimit")
    ? Number(formData.get("usageLimit"))
    : null;

  try {
    await createDiscount({ code, type, value, minSubtotal, usageLimit });
  } catch {
    return { error: "Kod o tej nazwie już istnieje." };
  }
  revalidatePath("/admin/discounts");
  return { success: "Dodano kod rabatowy." };
}

export async function deleteDiscountAction(formData: FormData) {
  await requireRole("STAFF");
  await deleteDiscount(String(formData.get("id")));
  revalidatePath("/admin/discounts");
}
