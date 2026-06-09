"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/server/session";
import type { ReviewStatus } from "@/generated/prisma/enums";
import { createReview, setReviewStatus } from "./service";

export type ReviewState = { error?: string; success?: string } | undefined;

export async function submitReviewAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const user = await requireUser();
  const productId = String(formData.get("productId"));
  const slug = String(formData.get("slug"));
  const rating = Number(formData.get("rating"));
  if (!productId || !rating) return { error: "Wybierz ocenę." };

  await createReview({
    userId: user.id,
    productId,
    rating,
    title: formData.get("title") ? String(formData.get("title")) : undefined,
    body: formData.get("body") ? String(formData.get("body")) : undefined,
  });

  if (slug) revalidatePath(`/product/${slug}`);
  return { success: "Dziękujemy! Recenzja czeka na moderację." };
}

export async function moderateReviewAction(formData: FormData) {
  await requireRole("STAFF");
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as ReviewStatus;
  await setReviewStatus(id, status);
  revalidatePath("/admin/reviews");
}
