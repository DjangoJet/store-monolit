import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import type { ProductInput, VariantInput } from "./schemas";

async function uniqueProductSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "produkt";
  let slug = root;
  let i = 1;
  for (;;) {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    i += 1;
    slug = `${root}-${i}`;
  }
}

// ---- Produkty ----

export async function createProduct(input: ProductInput, basePriceAmount: number) {
  const slug = await uniqueProductSlug(input.slug || input.title);
  return prisma.product.create({
    data: {
      slug,
      title: input.title,
      subtitle: input.subtitle,
      description: input.description,
      status: input.status,
      type: input.type,
      vatRate: input.vatRate,
      brandId: input.brandId || null,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      variants: {
        create: {
          title: input.title,
          priceAmount: basePriceAmount,
          currency: "PLN",
          inventory: { create: { quantity: 0 } },
        },
      },
    },
  });
}

export async function updateProduct(id: string, input: ProductInput) {
  const slug = input.slug
    ? await uniqueProductSlug(input.slug, id)
    : undefined;
  return prisma.product.update({
    where: { id },
    data: {
      ...(slug ? { slug } : {}),
      title: input.title,
      subtitle: input.subtitle,
      description: input.description,
      status: input.status,
      type: input.type,
      vatRate: input.vatRate,
      brandId: input.brandId || null,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
    },
  });
}

export async function softDeleteProduct(id: string) {
  return prisma.product.update({
    where: { id },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      brand: true,
      images: { orderBy: { position: "asc" } },
      categories: { include: { category: true } },
      variants: {
        orderBy: { position: "asc" },
        include: { inventory: true },
      },
    },
  });
}

export interface ListProductsParams {
  q?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  page?: number;
  perPage?: number;
}

export async function listProducts(params: ListProductsParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const perPage = params.perPage ?? 20;

  const where = {
    deletedAt: null,
    ...(params.status ? { status: params.status } : {}),
    ...(params.q
      ? { title: { contains: params.q, mode: "insensitive" as const } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        variants: { select: { priceAmount: true, inventory: { select: { quantity: true } } } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { items, total, page, perPage, pages: Math.ceil(total / perPage) };
}

// ---- Warianty ----

export async function addVariant(productId: string, input: VariantInput) {
  const count = await prisma.productVariant.count({ where: { productId } });
  return prisma.productVariant.create({
    data: {
      productId,
      title: input.title,
      sku: input.sku || null,
      priceAmount: input.priceAmount,
      compareAtAmount: input.compareAtAmount ?? null,
      currency: input.currency,
      weightGrams: input.weightGrams ?? null,
      position: count,
      inventory: { create: { quantity: input.quantity } },
    },
  });
}

export async function updateVariant(id: string, input: VariantInput) {
  return prisma.productVariant.update({
    where: { id },
    data: {
      title: input.title,
      sku: input.sku || null,
      priceAmount: input.priceAmount,
      compareAtAmount: input.compareAtAmount ?? null,
      currency: input.currency,
      weightGrams: input.weightGrams ?? null,
      inventory: {
        upsert: {
          create: { quantity: input.quantity },
          update: { quantity: input.quantity },
        },
      },
    },
  });
}

export async function deleteVariant(id: string) {
  return prisma.productVariant.delete({ where: { id } });
}

// ---- Media produktu ----

export async function addProductImage(
  productId: string,
  data: { url: string; alt?: string },
) {
  const count = await prisma.productImage.count({ where: { productId } });
  return prisma.productImage.create({
    data: { productId, url: data.url, alt: data.alt, position: count },
  });
}

export async function deleteProductImage(id: string) {
  return prisma.productImage.delete({ where: { id } });
}

// ---- Kategorie produktu ----

export async function setProductCategories(productId: string, categoryIds: string[]) {
  await prisma.$transaction([
    prisma.categoryProduct.deleteMany({ where: { productId } }),
    prisma.categoryProduct.createMany({
      data: categoryIds.map((categoryId) => ({ productId, categoryId })),
      skipDuplicates: true,
    }),
  ]);
}

/** Slug produktu (do rewalidacji cache po mutacji). */
export async function getProductSlug(id: string): Promise<string | null> {
  const p = await prisma.product.findUnique({
    where: { id },
    select: { slug: true },
  });
  return p?.slug ?? null;
}
