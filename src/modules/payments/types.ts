// Kontrakt adaptera płatności (patrz docs/04-adapters.md).
// Każda bramka (Stripe, Przelewy24, PayU...) implementuje ten interfejs.

export interface OrderForPayment {
  id: string;
  number: string;
  /** Niezgadywalny token do URL-a powrotu (strona sukcesu). */
  publicToken: string;
  amount: number; // grosze
  currency: string;
  email: string;
  description?: string;
}

export interface CreatePaymentResult {
  providerRef: string;
  clientSecret?: string;
  redirectUrl?: string;
}

export type PaymentEventType =
  | "paid"
  | "failed"
  | "authorized"
  | "refunded"
  | "partially_refunded";

export interface PaymentEvent {
  type: PaymentEventType;
  providerRef: string;
  amount: number;
  currency: string;
  raw: unknown;
}

export interface RefundResult {
  providerRef: string;
  amount: number;
}

export interface PaymentProvider {
  readonly id: string;

  createPayment(input: {
    order: OrderForPayment;
    returnUrl: string;
  }): Promise<CreatePaymentResult>;

  parseWebhook(req: Request): Promise<PaymentEvent>;

  refund(input: { providerRef: string; amount: number }): Promise<RefundResult>;
}
