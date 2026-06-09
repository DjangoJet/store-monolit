import crypto from "node:crypto";
import * as xadesjs from "xadesjs";
import { Crypto } from "@peculiar/webcrypto";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

// Podpis XAdES dokumentu AuthTokenRequest dla KSeF.
// Wymogi MF: enveloped (detached zabroniony), C14N exclusive, SHA-256, RSASSA-PKCS1-v1_5, profil XAdES-BES.

const SIG_ALG = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } as const;

const webcrypto = new Crypto();
let engineReady = false;

function ensureEngine(): void {
  if (engineReady) return;
  // xadesjs w Node wymaga jawnego silnika krypto i zależności DOM.
  xadesjs.Application.setEngine("@peculiar/webcrypto", webcrypto);
  xadesjs.setNodeDependencies({ DOMParser, XMLSerializer });
  engineReady = true;
}

function pemToDerBase64(pem: string): string {
  return pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
}

/** Wczytuje klucz prywatny (PEM, opcjonalnie zaszyfrowany) jako WebCrypto CryptoKey do podpisu. */
async function importPrivateKey(keyPem: string, passphrase?: string): Promise<CryptoKey> {
  // node:crypto czyta PEM (też zaszyfrowany hasłem) i eksportuje do PKCS#8 DER dla WebCrypto.
  const keyObj = crypto.createPrivateKey(passphrase ? { key: keyPem, passphrase } : keyPem);
  const pkcs8 = keyObj.export({ type: "pkcs8", format: "der" });
  return webcrypto.subtle.importKey("pkcs8", pkcs8, SIG_ALG, false, ["sign"]) as Promise<CryptoKey>;
}

/**
 * Podpisuje XML podpisem XAdES (enveloped) i zwraca podpisany dokument jako string.
 * @param certPem certyfikat (PEM) — trafia do KeyInfo i właściwości XAdES SigningCertificate
 * @param keyPem  klucz prywatny (PEM)
 */
export async function signXades(
  xml: string,
  certPem: string,
  keyPem: string,
  passphrase?: string,
): Promise<string> {
  ensureEngine();
  const key = await importPrivateKey(keyPem, passphrase);
  const certBase64 = pemToDerBase64(certPem);

  const doc = xadesjs.Parse(xml);
  const signedXml = new xadesjs.SignedXml();
  await signedXml.Sign(SIG_ALG, key, doc, {
    references: [{ hash: "SHA-256", transforms: ["enveloped", "c14n"] }],
    x509: [certBase64],
    signingCertificate: certBase64,
  });

  const signatureNode = signedXml.GetXml();
  if (!signatureNode) throw new Error("XAdES: nie udało się wygenerować podpisu.");
  doc.documentElement.appendChild(signatureNode);
  return new XMLSerializer().serializeToString(doc);
}
