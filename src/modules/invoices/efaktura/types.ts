// Kontrakt adaptera e-fakturowania (KSeF i ew. inne kraje).
// Wzorzec jak w płatnościach/wysyłce (patrz docs/04-adapters.md).
//
// KSeF jest asynchroniczny: submit() zwraca numer referencyjny (przyjęto do
// przetwarzania), a numer KSeF + UPO pojawiają się dopiero później — dlatego
// getStatus() jest oddzielną operacją odpytywaną przez job w tle.

/** Status przetwarzania po stronie KSeF. */
export type EInvoiceStatus = "PENDING" | "ACCEPTED" | "REJECTED";

/** Dane faktury w formie niezależnej od ORM — wejście do mapowania na XML FA(3). */
export interface EInvoiceData {
  id: string;
  number: string;
  issueDate: Date;
  saleDate: Date;
  currency: string;
  seller: { name: string; address: string; taxId?: string };
  buyer: { name: string; address: string; nip?: string; email?: string };
  // Kwoty w groszach.
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  // Sprzedaż zwolniona z VAT (nievatowiec / art. 113). Wtedy stawki = "zw", podstawa wymagana.
  vatExempt?: boolean;
  exemptionLegalBasis?: string; // np. "art. 113 ust. 1 ustawy o VAT"
  lines: Array<{
    name: string;
    quantity: number;
    unitNet: number;
    vatRate: number; // %
    net: number;
    vat: number;
    gross: number;
  }>;
}

export interface EInvoiceSubmitResult {
  /** Numer referencyjny KSeF — identyfikator do odpytywania statusu. */
  referenceNumber: string;
}

export interface EInvoiceStatusResult {
  status: EInvoiceStatus;
  ksefNumber?: string; // nadany po akceptacji
  upoXml?: string; // UPO po akceptacji
  error?: string; // powód odrzucenia
}

export interface EInvoiceProvider {
  readonly id: string;
  /** Czy provider faktycznie wysyła faktury (false dla `none`). */
  readonly active: boolean;

  submit(invoice: EInvoiceData): Promise<EInvoiceSubmitResult>;
  getStatus(referenceNumber: string): Promise<EInvoiceStatusResult>;
}
