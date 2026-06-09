import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { storeConfig } from "@/lib/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = storeConfig.appUrl.replace(/\/$/, "");

  const core: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/blog`, changeFrequency: "weekly", priority: 0.5 },
  ];

  // DB jest opcjonalna na etapie buildu (np. w kontenerze bez bazy) — wtedy zwracamy rdzeń.
  let products: { slug: string; updatedAt: Date }[] = [];
  let categories: { slug: string }[] = [];
  let posts: { slug: string; updatedAt: Date }[] = [];
  let pages: { slug: string; updatedAt: Date }[] = [];
  try {
    [products, categories, posts, pages] = await Promise.all([
      prisma.product.findMany({
        where: { status: "ACTIVE", deletedAt: null },
        select: { slug: true, updatedAt: true },
      }),
      prisma.category.findMany({
        where: { deletedAt: null },
        select: { slug: true },
      }),
      prisma.blogPost.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
      }),
      prisma.page.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
      }),
    ]);
  } catch {
    return core;
  }

  return [
    ...core,
    ...products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...categories.map((c) => ({
      url: `${base}/category/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      priority: 0.5,
    })),
    ...pages.map((p) => ({
      url: `${base}/p/${p.slug}`,
      lastModified: p.updatedAt,
      priority: 0.3,
    })),
  ];
}
