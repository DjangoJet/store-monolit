"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/server/session";
import { toFieldErrors } from "@/lib/forms";
import type { ReviewStatus } from "@/generated/prisma/enums";
import { createReview, setReviewStatus } from "./service";
import { reviewInputSchema } from "./schemas";

export type ReviewState =
  | { error?: string; success?: string; fieldErrors?: Record<string, string> }
  | undefined;

export async function submitReviewAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const user = await requireUser();
  const productId = String(formData.get("productId"));
  const slug = String(formData.get("slug"));
  if (!productId) return { error: "Brak produktu." };

  const parsed = reviewInputSchema.safeParse({
    rating: formData.get("rating"),
    title: formData.get("title") || undefined,
    body: formData.get("body") || undefined,
  });
  if (!parsed.success) {
    return { error: "Sprawdź poprawność danych.", fieldErrors: toFieldErrors(parsed.error) };
  }

  await createReview({
    userId: user.id,
    productId,
    rating: parsed.data.rating,
    title: parsed.data.title,
    body: parsed.data.body,
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
