import { prisma } from "@/lib/prisma";
import type { ReviewStatus } from "@/generated/prisma/enums";

export async function createReview(input: {
  userId: string;
  productId: string;
  rating: number;
  title?: string;
  body?: string;
}) {
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  return prisma.review.create({
    data: {
      userId: input.userId,
      productId: input.productId,
      rating,
      title: input.title,
      body: input.body,
      status: "PENDING",
    },
  });
}

export interface ProductReviews {
  average: number;
  count: number;
  items: {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    author: string;
    createdAt: Date;
  }[];
}

export async function getProductReviews(productId: string): Promise<ProductReviews> {
  const [agg, rows] = await Promise.all([
    prisma.review.aggregate({
      where: { productId, status: "APPROVED" },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.review.findMany({
      where: { productId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
      take: 50,
    }),
  ]);

  return {
    average: agg._avg.rating ?? 0,
    count: agg._count,
    items: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      author: r.user?.name ?? "Anonim",
      createdAt: r.createdAt,
    })),
  };
}

// ---- Admin ----

export async function listReviews(status?: ReviewStatus) {
  return prisma.review.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { title: true, slug: true } },
      user: { select: { email: true } },
    },
  });
}

export async function setReviewStatus(id: string, status: ReviewStatus) {
  return prisma.review.update({ where: { id }, data: { status } });
}
