import { prisma } from "@/lib/prisma";

export async function isInWishlist(userId: string, productId: string) {
  const item = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  return Boolean(item);
}

/** Przełącza obecność produktu na liście życzeń. Zwraca stan po zmianie. */
export async function toggleWishlist(userId: string, productId: string): Promise<boolean> {
  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return false;
  }
  await prisma.wishlistItem.create({ data: { userId, productId } });
  return true;
}

export async function listWishlist(userId: string) {
  // WishlistItem.productId nie ma relacji w schemacie — pobieramy produkty osobno.
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, deletedAt: null },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      variants: { select: { priceAmount: true, currency: true } },
    },
  });
  return products.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    imageUrl: p.images[0]?.url ?? null,
    minPrice: p.variants.length ? Math.min(...p.variants.map((v) => v.priceAmount)) : 0,
    currency: p.variants[0]?.currency ?? "PLN",
  }));
}
