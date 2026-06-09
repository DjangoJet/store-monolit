import { prisma } from "@/lib/prisma";

export interface CartLineForTax {
  variantId: string;
  gross: number; // wartość brutto pozycji (lineTotal)
}

export interface OrderTaxResult {
  byVariant: Map<string, { vatRate: number; taxAmount: number }>;
  shippingVatRate: number;
  shippingTax: number;
  totalTax: number;
}

/** VAT zawarty w kwocie brutto przy danej stawce. */
export function vatPortion(gross: number, rate: number): number {
  if (rate <= 0) return 0;
  return gross - Math.round(gross / (1 + rate / 100));
}

/**
 * Liczy VAT zamówienia. Master-switch = vatExempt (status sprzedawcy):
 * gdy true → wszystko 0. Inaczej: stawka z produktu per pozycja, rabat rozdzielany
 * proporcjonalnie, wysyłka wg `shippingVatRate`.
 */
export async function computeOrderTax(input: {
  lines: CartLineForTax[];
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  vatExempt: boolean;
  shippingVatRate: number;
}): Promise<OrderTaxResult> {
  const byVariant = new Map<string, { vatRate: number; taxAmount: number }>();

  if (input.vatExempt) {
    for (const l of input.lines) byVariant.set(l.variantId, { vatRate: 0, taxAmount: 0 });
    return { byVariant, shippingVatRate: 0, shippingTax: 0, totalTax: 0 };
  }

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: input.lines.map((l) => l.variantId) } },
    select: { id: true, product: { select: { vatRate: true } } },
  });
  const rateByVariant = new Map(variants.map((v) => [v.id, v.product.vatRate]));

  let totalTax = 0;
  for (const l of input.lines) {
    const rate = rateByVariant.get(l.variantId) ?? 23;
    const discountShare =
      input.subtotal > 0
        ? Math.round((input.discountAmount * l.gross) / input.subtotal)
        : 0;
    const discounted = Math.max(0, l.gross - discountShare);
    const tax = vatPortion(discounted, rate);
    byVariant.set(l.variantId, { vatRate: rate, taxAmount: tax });
    totalTax += tax;
  }

  const shippingTax = vatPortion(input.shippingAmount, input.shippingVatRate);
  totalTax += shippingTax;

  return {
    byVariant,
    shippingVatRate: input.shippingVatRate,
    shippingTax,
    totalTax,
  };
}
