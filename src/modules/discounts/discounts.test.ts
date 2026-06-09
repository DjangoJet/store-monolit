import { describe, expect, it } from "vitest";
import { computeDiscountAmount } from "./service";
import type { Discount } from "@/generated/prisma/client";

function discount(partial: Partial<Discount>): Discount {
  return {
    id: "d1",
    code: "TEST",
    description: null,
    type: "PERCENT",
    value: 10,
    currency: null,
    minSubtotal: null,
    startsAt: null,
    endsAt: null,
    usageLimit: null,
    usageCount: 0,
    perUserLimit: null,
    isActive: true,
    createdAt: new Date(),
    ...partial,
  } as Discount;
}

describe("computeDiscountAmount", () => {
  it("PERCENT liczy procent od subtotal", () => {
    expect(computeDiscountAmount(discount({ type: "PERCENT", value: 10 }), 10000)).toBe(1000);
    expect(computeDiscountAmount(discount({ type: "PERCENT", value: 25 }), 4000)).toBe(1000);
  });
  it("FIXED nie przekracza subtotal", () => {
    expect(computeDiscountAmount(discount({ type: "FIXED", value: 1500 }), 10000)).toBe(1500);
    expect(computeDiscountAmount(discount({ type: "FIXED", value: 20000 }), 10000)).toBe(10000);
  });
  it("FREE_SHIPPING nie zmniejsza subtotal", () => {
    expect(computeDiscountAmount(discount({ type: "FREE_SHIPPING", value: 0 }), 10000)).toBe(0);
  });
});
