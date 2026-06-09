import { describe, expect, it } from "vitest";
import { toMinor, toMajorString, slugify } from "./utils";

describe("toMinor", () => {
  it("konwertuje PLN na grosze", () => {
    expect(toMinor("79.99")).toBe(7999);
    expect(toMinor("10")).toBe(1000);
    expect(toMinor(5)).toBe(500);
  });
  it("obsługuje przecinek jako separator", () => {
    expect(toMinor("12,50")).toBe(1250);
  });
  it("zwraca 0 dla nieprawidłowych", () => {
    expect(toMinor("abc")).toBe(0);
  });
});

describe("toMajorString", () => {
  it("formatuje grosze na string PLN", () => {
    expect(toMajorString(7999)).toBe("79.99");
    expect(toMajorString(1000)).toBe("10.00");
  });
});

describe("slugify", () => {
  it("obsługuje polskie znaki", () => {
    expect(slugify("Ćma Żółć")).toBe("cma-zolc");
    expect(slugify("Koszulka Basic")).toBe("koszulka-basic");
  });
  it("usuwa znaki specjalne i krawędziowe myślniki", () => {
    expect(slugify("  Hello, World!  ")).toBe("hello-world");
  });
});
