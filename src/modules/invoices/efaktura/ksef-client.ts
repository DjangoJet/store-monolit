import crypto from "node:crypto";
import { buildAuthTokenRequestXml, type SubjectIdentifierType } from "./auth-request";
import { signXades } from "./xades";

// Klient API KSeF 2.0 (środowisko wg base URL). Ścieżka uwierzytelnienia: token KSeF.
// Specyfikacja: src/modules/invoices/efaktura/schema/openapi.json
//
// Krypto (wg OpenAPI):
//   - token: RSA-OAEP(SHA-256) z "token|timestampMs", Base64
//   - klucz sesji AES-256, zaszyfrowany RSA-OAEP(SHA-256)
//   - faktura: AES-256-CBC + PKCS#7, Base64; hashe SHA-256 (Base64)
// Klucze publiczne: GET /security/public-key-certificates (DER, Base64), wybór po `usage`.

const USAGE_TOKEN = "KsefTokenEncryption";
const USAGE_SYMMETRIC = "SymmetricKeyEncryption";

interface PublicKey {
  key: crypto.KeyObject;
  publicKeyId: string;
}

export interface KsefSession {
  sessionReference: string;
  aesKey: Buffer;
  iv: Buffer;
}

export interface KsefInvoiceStatus {
  code: number;
  description?: string;
  ksefNumber?: string;
  upoDownloadUrl?: string;
}

/** Pola żądania wysyłki faktury — deterministyczne, testowalne offline. */
export interface SendInvoicePayload {
  invoiceHash: string;
  invoiceSize: number;
  encryptedInvoiceHash: string;
  encryptedInvoiceSize: number;
  encryptedInvoiceContent: string;
}

const sha256b64 = (b: Buffer) => crypto.createHash("sha256").update(b).digest("base64");

/** Szyfruje XML faktury (AES-256-CBC/PKCS#7) i liczy hashe/rozmiary do wysyłki. */
export function buildSendInvoicePayload(xml: string, aesKey: Buffer, iv: Buffer): SendInvoicePayload {
  const plain = Buffer.from(xml, "utf8");
  const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv); // PKCS#7 domyślnie
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  return {
    invoiceHash: sha256b64(plain),
    invoiceSize: plain.length,
    encryptedInvoiceHash: sha256b64(encrypted),
    encryptedInvoiceSize: encrypted.length,
    encryptedInvoiceContent: encrypted.toString("base64"),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class KsefClient {
  constructor(private readonly baseUrl: string) {}

  private async request(
    path: string,
    opts: { method?: string; body?: unknown; xmlBody?: string; accessToken?: string } = {},
  ): Promise<Response> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: opts.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(opts.xmlBody ? { "Content-Type": "application/xml" } : {}),
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
        ...(opts.accessToken ? { Authorization: `Bearer ${opts.accessToken}` } : {}),
      },
      body: opts.xmlBody ?? (opts.body ? JSON.stringify(opts.body) : undefined),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`KSeF ${opts.method ?? "GET"} ${path} → ${res.status}: ${text.slice(0, 500)}`);
    }
    return res;
  }

  private async getPublicKey(usage: string): Promise<PublicKey> {
    const certs = (await (await this.request("/security/public-key-certificates")).json()) as Array<{
      certificate: string;
      publicKeyId: string;
      usage?: string[];
    }>;
    const cert = certs.find((c) => c.usage?.includes(usage)) ?? certs[0];
    if (!cert) throw new Error(`KSeF: brak certyfikatu klucza publicznego (usage=${usage}).`);
    const x509 = new crypto.X509Certificate(Buffer.from(cert.certificate, "base64"));
    return { key: x509.publicKey, publicKeyId: cert.publicKeyId };
  }

  private rsaOaep(key: crypto.KeyObject, data: Buffer): string {
    return crypto
      .publicEncrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, data)
      .toString("base64");
  }

  /** Uwierzytelnienie tokenem KSeF → zwraca accessToken (JWT). */
  async authenticateWithToken(token: string, nip: string): Promise<string> {
    const challenge = (await (await this.request("/auth/challenge", { method: "POST", body: {} })).json()) as {
      challenge: string;
      timestampMs: number;
    };

    const pub = await this.getPublicKey(USAGE_TOKEN);
    const encryptedToken = this.rsaOaep(pub.key, Buffer.from(`${token}|${challenge.timestampMs}`, "utf8"));

    const init = (await (
      await this.request("/auth/ksef-token", {
        method: "POST",
        body: {
          challenge: challenge.challenge,
          contextIdentifier: { type: "Nip", value: nip },
          encryptedToken,
          publicKeyId: pub.publicKeyId,
        },
      })
    ).json()) as { referenceNumber: string; authenticationToken: { token: string } };

    return this.finishAuth(init.referenceNumber, init.authenticationToken.token);
  }

  /** Uwierzytelnienie certyfikatem (podpis XAdES dokumentu AuthTokenRequest) → accessToken (JWT). */
  async authenticateWithCertificate(
    certPem: string,
    keyPem: string,
    nip: string,
    subjectType: SubjectIdentifierType,
    passphrase?: string,
  ): Promise<string> {
    const challenge = (await (await this.request("/auth/challenge", { method: "POST", body: {} })).json()) as {
      challenge: string;
    };
    const xml = buildAuthTokenRequestXml(challenge.challenge, nip, subjectType);
    const signed = await signXades(xml, certPem, keyPem, passphrase);
    const init = (await (
      await this.request("/auth/xades-signature", { method: "POST", xmlBody: signed })
    ).json()) as { referenceNumber: string; authenticationToken: { token: string } };
    return this.finishAuth(init.referenceNumber, init.authenticationToken.token);
  }

  /** Wspólny ogon uwierzytelnienia: poll statusu → redeem → accessToken. */
  private async finishAuth(referenceNumber: string, opToken: string): Promise<string> {
    await this.pollAuth(referenceNumber, opToken);
    const tokens = (await (
      await this.request("/auth/token/redeem", { method: "POST", accessToken: opToken })
    ).json()) as { accessToken: { token: string } };
    return tokens.accessToken.token;
  }

  private async pollAuth(referenceNumber: string, opToken: string, attempts = 20): Promise<void> {
    for (let i = 0; i < attempts; i++) {
      const st = (await (
        await this.request(`/auth/${referenceNumber}`, { accessToken: opToken })
      ).json()) as { status: { code: number; description?: string } };
      if (st.status.code === 200) return;
      if (st.status.code >= 400) {
        throw new Error(`KSeF auth nieudane: ${st.status.code} ${st.status.description ?? ""}`);
      }
      await sleep(1000);
    }
    throw new Error("KSeF auth: przekroczono czas oczekiwania.");
  }

  /** Otwiera sesję interaktywną dla FA(3) i zwraca klucz AES do szyfrowania faktur. */
  async openOnlineSession(accessToken: string): Promise<KsefSession> {
    const pub = await this.getPublicKey(USAGE_SYMMETRIC);
    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const res = (await (
      await this.request("/sessions/online", {
        method: "POST",
        accessToken,
        body: {
          formCode: { systemCode: "FA (3)", schemaVersion: "1-0E", value: "FA" },
          encryption: {
            encryptedSymmetricKey: this.rsaOaep(pub.key, aesKey),
            initializationVector: iv.toString("base64"),
            publicKeyId: pub.publicKeyId,
          },
        },
      })
    ).json()) as { referenceNumber: string };
    return { sessionReference: res.referenceNumber, aesKey, iv };
  }

  /** Wysyła zaszyfrowaną fakturę FA(3) w sesji online → numer referencyjny faktury. */
  async sendInvoice(accessToken: string, session: KsefSession, xml: string): Promise<string> {
    const payload = buildSendInvoicePayload(xml, session.aesKey, session.iv);
    const res = (await (
      await this.request(`/sessions/online/${session.sessionReference}/invoices`, {
        method: "POST",
        accessToken,
        body: payload,
      })
    ).json()) as { referenceNumber: string };
    return res.referenceNumber;
  }

  async getInvoiceStatus(
    accessToken: string,
    sessionRef: string,
    invoiceRef: string,
  ): Promise<KsefInvoiceStatus> {
    const res = (await (
      await this.request(`/sessions/${sessionRef}/invoices/${invoiceRef}`, { accessToken })
    ).json()) as {
      status: { code: number; description?: string };
      ksefNumber?: string;
      upoDownloadUrl?: string;
    };
    return {
      code: res.status.code,
      description: res.status.description,
      ksefNumber: res.ksefNumber,
      upoDownloadUrl: res.upoDownloadUrl,
    };
  }

  /** Pobiera UPO (XML) spod jednorazowego adresu zwróconego w statusie. */
  async downloadUpo(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`KSeF UPO → ${res.status}`);
    return res.text();
  }
}
