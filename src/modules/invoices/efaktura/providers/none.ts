import type {
  EInvoiceProvider,
  EInvoiceStatusResult,
  EInvoiceSubmitResult,
} from "../types";

/**
 * Domyślny provider gdy KSeF wyłączony. Nie wysyła niczego — faktury zostają
 * lokalne (status `NOT_SENT`). Wywołanie submit/getStatus to błąd konfiguracji.
 */
export class NoneEInvoiceProvider implements EInvoiceProvider {
  readonly id = "none";
  readonly active = false;

  // Interfejs dopuszcza implementację z mniejszą liczbą argumentów — pomijamy nieużywane.
  async submit(): Promise<EInvoiceSubmitResult> {
    throw new Error("KSeF jest wyłączony (KSEF_ENABLED=false) — brak wysyłki e-faktur.");
  }

  async getStatus(): Promise<EInvoiceStatusResult> {
    throw new Error("KSeF jest wyłączony (KSEF_ENABLED=false).");
  }
}
