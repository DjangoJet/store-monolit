import { describe, expect, it } from "vitest";
import { buildFa3Xml } from "./fa3";
import type { EInvoiceData } from "./types";

// Faktura wielostawkowa (23% + 5%), nabywca z NIP. Kwoty w groszach.
const base: EInvoiceData = {
  id: "inv1",
  number: "FV 2026/0001",
  issueDate: new Date("2026-02-15T10:00:00Z"),
  saleDate: new Date("2026-02-14T00:00:00Z"),
  currency: "PLN",
  seller: { name: "Mój Sklep sp. z o.o.", address: "ul. Polna 1, 00-001 Warszawa", taxId: "9999999999" },
  buyer: { name: "Jan Kowalski", address: "ul. Kwiatowa 2, 00-002 Kraków", nip: "1111111111", email: "jan@example.pl" },
  netAmount: 16261 + 95,
  vatAmount: 3740 + 5,
  grossAmount: 20001 + 100,
  lines: [
    { name: "Lodówka X", quantity: 1, unitNet: 16261, vatRate: 23, net: 16261, vat: 3740, gross: 20001 },
    { name: "Promocja", quantity: 1, unitNet: 95, vatRate: 5, net: 95, vat: 5, gross: 100 },
  ],
};

describe("buildFa3Xml", () => {
  it("emituje poprawny nagłówek FA(3) i namespace", () => {
    const xml = buildFa3Xml(base, { systemInfo: "store-monolit" });
    expect(xml).toContain('xmlns="http://crd.gov.pl/wzor/2025/06/25/13775/"');
    expect(xml).toContain('<KodFormularza kodSystemowy="FA (3)" wersjaSchemy="1-0E">FA</KodFormularza>');
    expect(xml).toContain("<WariantFormularza>3</WariantFormularza>");
    expect(xml).toContain("<SystemInfo>store-monolit</SystemInfo>");
  });

  it("mapuje sprzedawcę i nabywcę z NIP", () => {
    const xml = buildFa3Xml(base);
    expect(xml).toContain("<NIP>9999999999</NIP>");
    expect(xml).toContain("<NIP>1111111111</NIP>");
    expect(xml).toContain("<Nazwa>Jan Kowalski</Nazwa>");
  });

  it("sumuje VAT per stawka do właściwych koszyków P_13_x/P_14_x", () => {
    const xml = buildFa3Xml(base);
    // 23% -> koszyk 1
    expect(xml).toContain("<P_13_1>162.61</P_13_1>");
    expect(xml).toContain("<P_14_1>37.40</P_14_1>");
    // 5% -> koszyk 3
    expect(xml).toContain("<P_13_3>0.95</P_13_3>");
    expect(xml).toContain("<P_14_3>0.05</P_14_3>");
    // brak koszyka 8%
    expect(xml).not.toContain("<P_13_2>");
  });

  it("formatuje kwoty (TKwotowy) i sumę brutto P_15", () => {
    const xml = buildFa3Xml(base);
    expect(xml).toContain("<P_15>201.01</P_15>");
  });

  it("emituje wiersze faktury z netto i stawką", () => {
    const xml = buildFa3Xml(base);
    expect(xml).toContain("<P_7>Lodówka X</P_7>");
    expect(xml).toContain("<P_9A>162.61</P_9A>");
    expect(xml).toContain("<P_11>162.61</P_11>");
    expect(xml).toContain("<P_12>23</P_12>");
    expect((xml.match(/<FaWiersz>/g) ?? []).length).toBe(2);
  });

  it("dla nabywcy bez NIP (B2C) używa BrakID", () => {
    const b2c: EInvoiceData = { ...base, buyer: { ...base.buyer, nip: undefined } };
    const xml = buildFa3Xml(b2c);
    expect(xml).toContain("<BrakID>1</BrakID>");
    expect(xml).not.toContain("<NIP>1111111111</NIP>");
  });

  it("escapuje znaki specjalne XML", () => {
    const xml = buildFa3Xml({ ...base, buyer: { ...base.buyer, name: "Tom & Jerry <sp>" } });
    expect(xml).toContain("Tom &amp; Jerry &lt;sp&gt;");
  });

  it("faktura zwolniona (zw): suma do P_13_7, P_12=zw, Zwolnienie z podstawą", () => {
    const zw: EInvoiceData = {
      ...base,
      vatExempt: true,
      exemptionLegalBasis: "art. 113 ust. 1 ustawy o VAT",
      vatAmount: 0,
      grossAmount: 10000,
      lines: [{ name: "Usługa", quantity: 1, unitNet: 10000, vatRate: 0, net: 10000, vat: 0, gross: 10000 }],
    };
    const xml = buildFa3Xml(zw);
    expect(xml).toContain("<P_13_7>100.00</P_13_7>");
    expect(xml).not.toContain("<P_14_1>");
    expect(xml).toContain("<P_12>zw</P_12>");
    expect(xml).toContain("<P_19>1</P_19>");
    expect(xml).toContain("<P_19A>art. 113 ust. 1 ustawy o VAT</P_19A>");
    expect(xml).not.toContain("<P_19N>");
  });

  it("faktura zwolniona bez podstawy prawnej → błąd", () => {
    expect(() => buildFa3Xml({ ...base, vatExempt: true })).toThrow(/podstawy zwolnienia/);
  });

  it("rzuca jasny błąd dla nieobsługiwanej stawki (0%/zw)", () => {
    const zero: EInvoiceData = {
      ...base,
      lines: [{ name: "Zw", quantity: 1, unitNet: 100, vatRate: 0, net: 100, vat: 0, gross: 100 }],
    };
    expect(() => buildFa3Xml(zero)).toThrow(/nieobsługiwana stawka VAT 0%/);
  });
});
