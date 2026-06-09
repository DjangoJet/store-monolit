import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as xadesjs from "xadesjs";
import { Crypto } from "@peculiar/webcrypto";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { buildAuthTokenRequestXml } from "./auth-request";
import { signXades } from "./xades";

// Test wymaga openssl do wygenerowania self-signed certu (nie commitujemy kluczy do repo).
function hasOpenssl(): boolean {
  try {
    execFileSync("openssl", ["version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe.skipIf(!hasOpenssl())("signXades", () => {
  let dir: string;
  let certPem: string;
  let keyPem: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "ksef-xades-"));
    execFileSync("openssl", [
      "req", "-x509", "-newkey", "rsa:2048",
      "-keyout", join(dir, "key.pem"), "-out", join(dir, "cert.pem"),
      "-days", "1", "-nodes", "-subj", "/CN=KSeF Test",
    ], { stdio: "ignore" });
    certPem = readFileSync(join(dir, "cert.pem"), "utf8");
    keyPem = readFileSync(join(dir, "key.pem"), "utf8");
  });

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("produkuje podpis XAdES, który przechodzi weryfikację (round-trip)", async () => {
    const xml = buildAuthTokenRequestXml(
      "20260101-CR-1A2B3C4D5E-0F1E2D3C4B-A1",
      "1111111111",
      "certificateFingerprint",
    );
    const signed = await signXades(xml, certPem, keyPem);

    expect(signed).toMatch(/Signature/);
    expect(signed).toMatch(/SignedProperties|SigningCertificate/); // XAdES-BES

    // weryfikacja podpisu tym samym silnikiem
    xadesjs.Application.setEngine("@peculiar/webcrypto", new Crypto());
    xadesjs.setNodeDependencies({ DOMParser, XMLSerializer });
    const doc = xadesjs.Parse(signed);
    const sigEl = doc.getElementsByTagNameNS("http://www.w3.org/2000/09/xmldsig#", "Signature")[0];
    const verifier = new xadesjs.SignedXml(doc);
    verifier.LoadXml(sigEl);
    expect(await verifier.Verify()).toBe(true);
  });
});
