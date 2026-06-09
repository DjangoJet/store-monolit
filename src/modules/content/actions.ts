"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/server/session";
import { toFieldErrors } from "@/lib/forms";
import {
  createPage,
  createPost,
  deleteBanner,
  deletePage,
  deletePost,
  updatePage,
  updatePost,
  upsertBanner,
} from "./service";
import { bannerInputSchema, pageInputSchema, postInputSchema } from "./schemas";

export type ContentState =
  | { error?: string; success?: string; fieldErrors?: Record<string, string> }
  | undefined;

// ---- Strony ----

export async function createPageAction(
  _prev: ContentState,
  formData: FormData,
): Promise<ContentState> {
  await requireRole("STAFF");
  const parsed = pageInputSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") ?? "",
    status: formData.get("status") ?? "DRAFT",
    metaTitle: formData.get("metaTitle") || undefined,
    metaDescription: formData.get("metaDescription") || undefined,
  });
  if (!parsed.success) {
    return { error: "Sprawdź poprawność danych.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const page = await createPage(parsed.data);
  revalidatePath(`/p/${page.slug}`);
  redirect(`/admin/content/pages/${page.id}`);
}

export async function updatePageAction(
  _prev: ContentState,
  formData: FormData,
): Promise<ContentState> {
  await requireRole("STAFF");
  const id = String(formData.get("id"));
  const parsed = pageInputSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug") || undefined,
    body: formData.get("body") ?? "",
    status: formData.get("status") ?? "DRAFT",
    metaTitle: formData.get("metaTitle") || undefined,
    metaDescription: formData.get("metaDescription") || undefined,
  });
  if (!parsed.success) {
    return { error: "Sprawdź poprawność danych.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const page = await updatePage(id, parsed.data);
  revalidatePath(`/p/${page.slug}`);
  return { success: "Zapisano stronę." };
}

export async function deletePageAction(formData: FormData) {
  await requireRole("STAFF");
  await deletePage(String(formData.get("id")));
  revalidatePath("/admin/content/pages");
  redirect("/admin/content/pages");
}

// ---- Blog ----

export async function createPostAction(
  _prev: ContentState,
  formData: FormData,
): Promise<ContentState> {
  await requireRole("STAFF");
  const parsed = postInputSchema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt") || undefined,
    body: formData.get("body") ?? "",
    coverUrl: formData.get("coverUrl") || undefined,
    status: formData.get("status") ?? "DRAFT",
  });
  if (!parsed.success) {
    return { error: "Sprawdź poprawność danych.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const post = await createPost(parsed.data);
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  redirect(`/admin/content/blog/${post.id}`);
}

export async function updatePostAction(
  _prev: ContentState,
  formData: FormData,
): Promise<ContentState> {
  await requireRole("STAFF");
  const id = String(formData.get("id"));
  const parsed = postInputSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug") || undefined,
    excerpt: formData.get("excerpt") || undefined,
    body: formData.get("body") ?? "",
    coverUrl: formData.get("coverUrl") || undefined,
    status: formData.get("status") ?? "DRAFT",
  });
  if (!parsed.success) {
    return { error: "Sprawdź poprawność danych.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const post = await updatePost(id, parsed.data);
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  return { success: "Zapisano wpis." };
}

export async function deletePostAction(formData: FormData) {
  await requireRole("STAFF");
  await deletePost(String(formData.get("id")));
  revalidatePath("/blog");
  redirect("/admin/content/blog");
}

// ---- Bannery ----

export async function saveBannerAction(
  _prev: ContentState,
  formData: FormData,
): Promise<ContentState> {
  await requireRole("STAFF");
  const parsed = bannerInputSchema.safeParse({
    key: formData.get("key"),
    title: formData.get("title") || undefined,
    subtitle: formData.get("subtitle") || undefined,
    imageUrl: formData.get("imageUrl") || undefined,
    linkUrl: formData.get("linkUrl") || undefined,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    return { error: "Sprawdź poprawność danych.", fieldErrors: toFieldErrors(parsed.error) };
  }
  await upsertBanner(parsed.data);
  revalidatePath("/");
  revalidatePath("/admin/content/banners");
  return { success: "Zapisano banner." };
}

export async function deleteBannerAction(formData: FormData) {
  await requireRole("STAFF");
  await deleteBanner(String(formData.get("id")));
  revalidatePath("/");
  revalidatePath("/admin/content/banners");
}
