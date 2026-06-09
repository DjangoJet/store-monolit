"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/session";
import { toggleWishlist } from "./service";

export async function toggleWishlistAction(productId: string, slug?: string) {
  const user = await requireUser();
  const inWishlist = await toggleWishlist(user.id, productId);
  if (slug) revalidatePath(`/product/${slug}`);
  revalidatePath("/account/wishlist");
  return inWishlist;
}
