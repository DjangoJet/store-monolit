import { env } from "@/lib/env";
import type { EInvoiceProvider } from "./types";
import { NoneEInvoiceProvider } from "./providers/none";
import { KsefProvider } from "./providers/ksef";

// `none` gdy KSeF wyłączony, `ksef` gdy KSEF_ENABLED=true.
// Dodanie e-fakturowania dla innego kraju = nowy provider + warunek tutaj.
let cached: EInvoiceProvider | null = null;

export function getEInvoiceProvider(): EInvoiceProvider {
  if (cached) return cached;
  cached = env.KSEF_ENABLED ? new KsefProvider() : new NoneEInvoiceProvider();
  return cached;
}
