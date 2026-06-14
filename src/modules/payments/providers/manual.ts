import { env } from "@/lib/env";
import type { PaymentProvider } from "../types";

/**
 * Płatność offline (np. przy odbiorze / przelew tradycyjny). Brak integracji zewnętrznej —
 * pozwala uruchomić checkout bez konfiguracji bramki. Zamówienie potwierdzane od razu.
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly id = "manual";

  async createPayment({
    order,
  }: {
    order: { id: string; number: string; publicToken: string };
  }) {
    return {
      providerRef: `manual_${order.id}`,
      redirectUrl: `${env.APP_URL}/checkout/success?order=${encodeURIComponent(order.publicToken)}`,
    };
  }

  async parseWebhook(): Promise<never> {
    throw new Error("Provider 'manual' nie obsługuje webhooków.");
  }

  async refund({ providerRef, amount }: { providerRef: string; amount: number }) {
    return { providerRef, amount };
  }
}
