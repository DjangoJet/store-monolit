import { prisma } from "@/lib/prisma";
import type { Discount } from "@/generated/prisma/client";

export interface DiscountEvaluation {
  ok: boolean;
  discount?: Discount;
  amount: number; // rabat na subtotal (grosze)
  freeShipping: boolean;
  error?: string;
}

export function computeDiscountAmount(discount: Discount, subtotal: number): number {
  switch (discount.type) {
    case "PERCENT":
      return Math.round((subtotal * discount.value) / 100);
    case "FIXED":
      return Math.min(discount.value, subtotal);
    case "FREE_SHIPPING":
      return 0;
    default:
      return 0;
  }
}

/** Waliduje kod rabatowy względem koszyka i użytkownika. */
export async function evaluateDiscount(
  code: string,
  subtotal: number,
  userId?: string | null,
): Promise<DiscountEvaluation> {
  const fail = (error: string): DiscountEvaluation => ({
    ok: false,
    amount: 0,
    freeShipping: false,
    error,
  });

  const d = await prisma.discount.findUnique({ where: { code: code.trim() } });
  if (!d || !d.isActive) return fail("Nieprawidłowy kod rabatowy.");

  const now = new Date();
  if (d.startsAt && d.startsAt > now) return fail("Kod nie jest jeszcze aktywny.");
  if (d.endsAt && d.endsAt < now) return fail("Kod wygasł.");
  if (d.minSubtotal && subtotal < d.minSubtotal) {
    return fail(`Minimalna wartość koszyka: ${(d.minSubtotal / 100).toFixed(2)} zł.`);
  }
  if (d.usageLimit != null && d.usageCount >= d.usageLimit) {
    return fail("Limit użyć kodu został wyczerpany.");
  }
  if (d.perUserLimit != null && userId) {
    const used = await prisma.order.count({
      where: { userId, discountCode: d.code },
    });
    if (used >= d.perUserLimit) return fail("Wykorzystano limit użyć tego kodu.");
  }

  return {
    ok: true,
    discount: d,
    amount: computeDiscountAmount(d, subtotal),
    freeShipping: d.type === "FREE_SHIPPING",
  };
}

/**
 * Atomowo zużywa jedno użycie kodu — warunek limitu jest w UPDATE, więc równoległe
 * zamówienia nie przekroczą `usageLimit` (evaluateDiscount tylko czyta, tu jest claim).
 * Zwraca false, gdy limit właśnie się wyczerpał.
 */
export async function claimDiscountUsage(code: string): Promise<boolean> {
  const updated = await prisma.$executeRaw`
    UPDATE "Discount"
    SET "usageCount" = "usageCount" + 1
    WHERE "code" = ${code}
      AND "isActive" = true
      AND ("usageLimit" IS NULL OR "usageCount" < "usageLimit")`;
  return updated > 0;
}

/** Oddaje zużycie kodu (gdy tworzenie zamówienia po claimie się nie powiodło). */
export async function releaseDiscountUsage(code: string) {
  await prisma.discount.updateMany({
    where: { code, usageCount: { gt: 0 } },
    data: { usageCount: { decrement: 1 } },
  });
}

// ---- Admin ----

export async function listDiscounts() {
  return prisma.discount.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createDiscount(input: {
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minSubtotal?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
}) {
  return prisma.discount.create({
    data: {
      code: input.code.trim(),
      type: input.type,
      value: input.value,
      minSubtotal: input.minSubtotal ?? null,
      usageLimit: input.usageLimit ?? null,
      perUserLimit: input.perUserLimit ?? null,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
    },
  });
}

export async function deleteDiscount(id: string) {
  return prisma.discount.delete({ where: { id } });
}
