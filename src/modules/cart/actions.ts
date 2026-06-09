"use server";

import { revalidatePath } from "next/cache";
import { addItem, removeItem, setItemQuantity } from "./service";

export async function addToCart(variantId: string, quantity = 1) {
  await addItem(variantId, quantity);
  revalidatePath("/cart");
}

export async function updateCartLineAction(formData: FormData) {
  const variantId = String(formData.get("variantId"));
  const quantity = Number(formData.get("quantity")) || 0;
  await setItemQuantity(variantId, quantity);
  revalidatePath("/cart");
}

export async function removeCartLineAction(formData: FormData) {
  const variantId = String(formData.get("variantId"));
  await removeItem(variantId);
  revalidatePath("/cart");
}
