"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/server/session";
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

export type ContentState = { error?: string; success?: string } | undefined;

function parseStatus(v: FormDataEntryValue | null): "DRAFT" | "PUBLISHED" {
  return v === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
}

// ---- Strony ----

export async function createPageAction(
  _prev: ContentState,
  formData: FormData,
): Promise<ContentState> {
  await requireRole("STAFF");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Tytuł jest wymagany." };
  const page = await createPage({
    title,
    body: String(formData.get("body") ?? ""),
    status: parseStatus(formData.get("status")),
    metaTitle: formData.get("metaTitle") ? String(formData.get("metaTitle")) : undefined,
    metaDescription: formData.get("metaDescription")
      ? String(formData.get("metaDescription"))
      : undefined,
  });
  revalidatePath(`/p/${page.slug}`);
  redirect(`/admin/content/pages/${page.id}`);
}

export async function updatePageAction(
  _prev: ContentState,
  formData: FormData,
): Promise<ContentState> {
  await requireRole("STAFF");
  const id = String(formData.get("id"));
  const page = await updatePage(id, {
    title: String(formData.get("title") ?? "").trim(),
    slug: formData.get("slug") ? String(formData.get("slug")) : undefined,
    body: String(formData.get("body") ?? ""),
    status: parseStatus(formData.get("status")),
    metaTitle: formData.get("metaTitle") ? String(formData.get("metaTitle")) : undefined,
    metaDescription: formData.get("metaDescription")
      ? String(formData.get("metaDescription"))
      : undefined,
  });
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
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Tytuł jest wymagany." };
  const post = await createPost({
    title,
    excerpt: formData.get("excerpt") ? String(formData.get("excerpt")) : undefined,
    body: String(formData.get("body") ?? ""),
    coverUrl: formData.get("coverUrl") ? String(formData.get("coverUrl")) : undefined,
    status: parseStatus(formData.get("status")),
  });
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
  const post = await updatePost(id, {
    title: String(formData.get("title") ?? "").trim(),
    slug: formData.get("slug") ? String(formData.get("slug")) : undefined,
    excerpt: formData.get("excerpt") ? String(formData.get("excerpt")) : undefined,
    body: String(formData.get("body") ?? ""),
    coverUrl: formData.get("coverUrl") ? String(formData.get("coverUrl")) : undefined,
    status: parseStatus(formData.get("status")),
  });
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

export async function saveBannerAction(formData: FormData) {
  await requireRole("STAFF");
  await upsertBanner({
    key: String(formData.get("key")).trim(),
    title: formData.get("title") ? String(formData.get("title")) : undefined,
    subtitle: formData.get("subtitle") ? String(formData.get("subtitle")) : undefined,
    imageUrl: formData.get("imageUrl") ? String(formData.get("imageUrl")) : undefined,
    linkUrl: formData.get("linkUrl") ? String(formData.get("linkUrl")) : undefined,
    isActive: formData.get("isActive") === "on",
  });
  revalidatePath("/");
  revalidatePath("/admin/content/banners");
}

export async function deleteBannerAction(formData: FormData) {
  await requireRole("STAFF");
  await deleteBanner(String(formData.get("id")));
  revalidatePath("/");
  revalidatePath("/admin/content/banners");
}
