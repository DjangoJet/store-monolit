import { readFileSync } from "node:fs";
import { env } from "@/lib/env";
import type {
  EInvoiceData,
  EInvoiceProvider,
  EInvoiceStatusResult,
  EInvoiceSubmitResult,
} from "../types";
import { KsefClient } from "../ksef-client";
import { buildFa3Xml } from "../fa3";

// Base URL per środowisko. Środowiska KSeF są w pełni odseparowane.
// URL-e demo/prod potwierdzić z dokumentacją MF: https://ksef.podatki.gov.pl/pliki-do-pobrania-ksef-20/
const BASE_URLS: Record<typeof env.KSEF_ENV, string> = {
  test: "https://api-test.ksef.mf.gov.pl/api/v2",
  demo: "https://api-demo.ksef.mf.gov.pl/api/v2", // TODO: zweryfikować host demo
  prod: "https://api.ksef.mf.gov.pl/api/v2", // TODO: zweryfikować host produkcyjny
};

// referenceNumber providera koduje sesję + fakturę: "sessionRef:invoiceRef".
const REF_SEP = ":";

/**
 * Adapter KSeF 2.0 (API v2, schema FA(3)). Dwie metody uwierzytelnienia (wybór po `.env`):
 *  - certyfikat (XAdES) — gdy ustawiono KSEF_CERT_PATH (+ KSEF_KEY_PATH); metoda docelowa (od 1.01.2027),
 *  - token KSeF — gdy ustawiono KSEF_TOKEN; szybsza ścieżka do testów (sunset 31.12.2026).
 */
export class KsefProvider implements EInvoiceProvider {
  readonly id = "ksef";
  readonly active = true;

  private readonly nip: string;
  private readonly authMode: "cert" | "token";
  private readonly client = new KsefClient(BASE_URLS[env.KSEF_ENV]);

  constructor() {
    if (!env.KSEF_NIP) throw new Error("KSeF: brak KSEF_NIP.");
    this.nip = env.KSEF_NIP;
    if (env.KSEF_CERT_PATH) {
      if (!env.KSEF_KEY_PATH) throw new Error("KSeF: ustaw KSEF_KEY_PATH (klucz prywatny do certyfikatu).");
      this.authMode = "cert";
    } else if (env.KSEF_TOKEN) {
      this.authMode = "token";
    } else {
      throw new Error("KSeF: brak metody uwierzytelnienia — ustaw KSEF_CERT_PATH (+KSEF_KEY_PATH) lub KSEF_TOKEN.");
    }
  }

  private authenticate(): Promise<string> {
    if (this.authMode === "cert") {
      const certPem = readFileSync(env.KSEF_CERT_PATH!, "utf8");
      const keyPem = readFileSync(env.KSEF_KEY_PATH!, "utf8");
      return this.client.authenticateWithCertificate(
        certPem,
        keyPem,
        this.nip,
        env.KSEF_CERT_SUBJECT_TYPE,
        env.KSEF_CERT_PASSWORD,
      );
    }
    return this.client.authenticateWithToken(env.KSEF_TOKEN!, this.nip);
  }

  async submit(invoice: EInvoiceData): Promise<EInvoiceSubmitResult> {
    const xml = buildFa3Xml(invoice, { systemInfo: "store-monolit" });
    const accessToken = await this.authenticate();
    const session = await this.client.openOnlineSession(accessToken);
    const invoiceRef = await this.client.sendInvoice(accessToken, session, xml);
    return { referenceNumber: `${session.sessionReference}${REF_SEP}${invoiceRef}` };
  }

  async getStatus(referenceNumber: string): Promise<EInvoiceStatusResult> {
    const [sessionRef, invoiceRef] = referenceNumber.split(REF_SEP);
    if (!sessionRef || !invoiceRef) {
      throw new Error(`KSeF: nieprawidłowy numer referencyjny "${referenceNumber}".`);
    }
    const accessToken = await this.authenticate();
    const st = await this.client.getInvoiceStatus(accessToken, sessionRef, invoiceRef);

    if (st.code === 200) {
      let upoXml: string | undefined;
      if (st.upoDownloadUrl) {
        upoXml = await this.client.downloadUpo(st.upoDownloadUrl).catch(() => undefined);
      }
      return { status: "ACCEPTED", ksefNumber: st.ksefNumber, upoXml };
    }
    if (st.code >= 400) {
      return { status: "REJECTED", error: `${st.code} ${st.description ?? ""}`.trim() };
    }
    return { status: "PENDING" };
  }
}
