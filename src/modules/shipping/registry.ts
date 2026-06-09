import { env } from "@/lib/env";
import type { CarrierProvider } from "./types";
import { ManualCarrierProvider } from "./providers/manual";
import { FurgonetkaProvider } from "./providers/furgonetka";

// Manual zawsze dostępny (admin wpisuje tracking ręcznie). Furgonetka gdy skonfigurowana.
const providers: Record<string, CarrierProvider> = {
  manual: new ManualCarrierProvider(),
};

if (
  env.FURGONETKA_CLIENT_ID &&
  env.FURGONETKA_CLIENT_SECRET &&
  env.FURGONETKA_USERNAME &&
  env.FURGONETKA_PASSWORD
) {
  providers.furgonetka = new FurgonetkaProvider();
}

export function getCarrierProvider(id: string): CarrierProvider {
  const provider = providers[id];
  if (!provider) {
    throw new Error(`Nieobsługiwany przewoźnik: ${id}`);
  }
  return provider;
}

export function availableCarriers(): string[] {
  return Object.keys(providers);
}
