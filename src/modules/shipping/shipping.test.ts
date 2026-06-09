import { describe, expect, it } from "vitest";
import { resolveShippingPrice } from "./service";

describe("resolveShippingPrice", () => {
  it("zwraca stałą cenę poniżej progu darmowej wysyłki", () => {
    expect(resolveShippingPrice({ priceAmount: 1500, freeOver: 20000 }, 10000)).toBe(1500);
  });
  it("zwraca 0 powyżej progu darmowej wysyłki", () => {
    expect(resolveShippingPrice({ priceAmount: 1500, freeOver: 20000 }, 20000)).toBe(0);
    expect(resolveShippingPrice({ priceAmount: 1500, freeOver: 20000 }, 25000)).toBe(0);
  });
  it("bez progu zawsze stała cena", () => {
    expect(resolveShippingPrice({ priceAmount: 1200, freeOver: null }, 99999)).toBe(1200);
  });
});
