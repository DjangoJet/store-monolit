import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

async function uniqueSlug(
  model: "page" | "blogPost",
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = slugify(base) || "strona";
  let slug = root;
  let i = 1;
  for (;;) {
    const existing =
      model === "page"
        ? await prisma.page.findUnique({ where: { slug } })
        : await prisma.blogPost.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    i += 1;
    slug = `${root}-${i}`;
  }
}

// ---- Strony (CMS) ----

export interface PageInput {
  title: string;
  slug?: string;
  body: string;
  status: "DRAFT" | "PUBLISHED";
  metaTitle?: string;
  metaDescription?: string;
}

export function listPages() {
  return prisma.page.findMany({ orderBy: { updatedAt: "desc" } });
}

export function getPage(id: string) {
  return prisma.page.findUnique({ where: { id } });
}

export function getPublishedPage(slug: string) {
  return prisma.page.findFirst({ where: { slug, status: "PUBLISHED" } });
}

export async function createPage(input: PageInput) {
  const slug = await uniqueSlug("page", input.slug || input.title);
  return prisma.page.create({ data: { ...input, slug } });
}

export async function updatePage(id: string, input: PageInput) {
  const slug = input.slug ? await uniqueSlug("page", input.slug, id) : undefined;
  return prisma.page.update({
    where: { id },
    data: { ...input, ...(slug ? { slug } : {}) },
  });
}

export function deletePage(id: string) {
  return prisma.page.delete({ where: { id } });
}

// ---- Blog ----

export interface PostInput {
  title: string;
  slug?: string;
  excerpt?: string;
  body: string;
  coverUrl?: string;
  status: "DRAFT" | "PUBLISHED";
}

export function listPosts() {
  return prisma.blogPost.findMany({ orderBy: { updatedAt: "desc" } });
}

export function getPost(id: string) {
  return prisma.blogPost.findUnique({ where: { id } });
}

export function listPublishedPosts() {
  return prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });
}

export function getPublishedPost(slug: string) {
  return prisma.blogPost.findFirst({ where: { slug, status: "PUBLISHED" } });
}

export async function createPost(input: PostInput) {
  const slug = await uniqueSlug("blogPost", input.slug || input.title);
  return prisma.blogPost.create({
    data: {
      ...input,
      slug,
      publishedAt: input.status === "PUBLISHED" ? new Date() : null,
    },
  });
}

export async function updatePost(id: string, input: PostInput) {
  const slug = input.slug ? await uniqueSlug("blogPost", input.slug, id) : undefined;
  const current = await prisma.blogPost.findUnique({ where: { id } });
  return prisma.blogPost.update({
    where: { id },
    data: {
      ...input,
      ...(slug ? { slug } : {}),
      publishedAt:
        input.status === "PUBLISHED"
          ? (current?.publishedAt ?? new Date())
          : null,
    },
  });
}

export function deletePost(id: string) {
  return prisma.blogPost.delete({ where: { id } });
}

// ---- Bannery ----

export interface BannerInput {
  key: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  linkUrl?: string;
  isActive: boolean;
}

export function listBanners() {
  return prisma.banner.findMany({ orderBy: { position: "asc" } });
}

export function getBanner(key: string) {
  return prisma.banner.findUnique({ where: { key } });
}

export function upsertBanner(input: BannerInput) {
  const { key, ...rest } = input;
  return prisma.banner.upsert({
    where: { key },
    update: rest,
    create: input,
  });
}

export function deleteBanner(id: string) {
  return prisma.banner.delete({ where: { id } });
}
