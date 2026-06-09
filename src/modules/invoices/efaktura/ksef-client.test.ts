import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildSendInvoicePayload } from "./ksef-client";

describe("buildSendInvoicePayload", () => {
  const aesKey = Buffer.alloc(32, 7);
  const iv = Buffer.alloc(16, 3);
  const xml = "<Faktura>treść ąęś</Faktura>";

  it("liczy hash i rozmiar oryginału (SHA-256 Base64)", () => {
    const p = buildSendInvoicePayload(xml, aesKey, iv);
    const plain = Buffer.from(xml, "utf8");
    expect(p.invoiceSize).toBe(plain.length);
    expect(p.invoiceHash).toBe(crypto.createHash("sha256").update(plain).digest("base64"));
  });

  it("szyfruje AES-256-CBC/PKCS#7 — da się odszyfrować z powrotem", () => {
    const p = buildSendInvoicePayload(xml, aesKey, iv);
    const encrypted = Buffer.from(p.encryptedInvoiceContent, "base64");
    const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    expect(decrypted).toBe(xml);
  });

  it("hash i rozmiar zaszyfrowanej treści zgadzają się z zawartością", () => {
    const p = buildSendInvoicePayload(xml, aesKey, iv);
    const encrypted = Buffer.from(p.encryptedInvoiceContent, "base64");
    expect(p.encryptedInvoiceSize).toBe(encrypted.length);
    expect(p.encryptedInvoiceHash).toBe(crypto.createHash("sha256").update(encrypted).digest("base64"));
    // PKCS#7: rozmiar zaszyfrowany jest wielokrotnością 16 i > oryginału
    expect(p.encryptedInvoiceSize % 16).toBe(0);
  });
});
