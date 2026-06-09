import { env } from "@/lib/env";
import type { PaymentProvider } from "./types";
import { ManualPaymentProvider } from "./providers/manual";
import { StripePaymentProvider } from "./providers/stripe";

// Manual zawsze dostępny (offline). Stripe tylko gdy skonfigurowany klucz.
// Dodanie kolejnej bramki (Przelewy24/PayU) = nowa klasa + wpis tutaj.
const providers: Record<string, PaymentProvider> = {
  manual: new ManualPaymentProvider(),
};

if (env.STRIPE_SECRET_KEY) {
  providers.stripe = new StripePaymentProvider();
}

export function getPaymentProvider(id: string): PaymentProvider {
  const provider = providers[id];
  if (!provider) {
    throw new Error(`Nieobsługiwany provider płatności: ${id}`);
  }
  return provider;
}

/** Domyślny provider: Stripe gdy skonfigurowany, inaczej manual. */
export function getDefaultProviderId(): string {
  return env.STRIPE_SECRET_KEY ? "stripe" : "manual";
}
