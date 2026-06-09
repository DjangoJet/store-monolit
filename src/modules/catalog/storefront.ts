import { prisma } from "@/lib/prisma";

export type ProductSort = "newest" | "name";

export interface StorefrontListParams {
  q?: string;
  categorySlug?: string;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
}

export interface ProductCardDTO {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  imageAlt: string | null;
  minPrice: number;
  maxPrice: number;
  currency: string;
}

// Cache realizowany na poziomie tras (export const revalidate) + revalidatePath po mutacjach.
export async function listActiveProducts(params: StorefrontListParams) {
  const page = Math.max(1, params.page ?? 1);
  const perPage = params.perPage ?? 12;

  const where = {
    status: "ACTIVE" as const,
    deletedAt: null,
    ...(params.q
      ? { title: { contains: params.q, mode: "insensitive" as const } }
      : {}),
    ...(params.categorySlug
      ? { categories: { some: { category: { slug: params.categorySlug } } } }
      : {}),
  };

  const orderBy =
    params.sort === "name"
      ? ({ title: "asc" } as const)
      : ({ createdAt: "desc" } as const);

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        variants: { select: { priceAmount: true, currency: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const items: ProductCardDTO[] = rows.map((p) => {
    const prices = p.variants.map((v) => v.priceAmount);
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      imageUrl: p.images[0]?.url ?? null,
      imageAlt: p.images[0]?.alt ?? null,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      currency: p.variants[0]?.currency ?? "PLN",
    };
  });

  return { items, total, page, perPage, pages: Math.ceil(total / perPage) };
}

export async function getActiveProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, status: "ACTIVE", deletedAt: null },
    include: {
      brand: true,
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { position: "asc" }, include: { inventory: true } },
    },
  });
}

export async function listStorefrontCategories() {
  return prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true },
  });
}
