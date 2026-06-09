import { env } from "./env";

/** Flagi funkcji — sterują widocznością modułów (patrz docs/00-architecture.md). */
export const features = {
  marketing: env.FEATURE_MARKETING,
  cms: env.FEATURE_CMS,
  multiregion: env.FEATURE_MULTIREGION,
  digital: env.FEATURE_DIGITAL,
  invoices: env.FEATURE_INVOICES,
} as const;

export type FeatureKey = keyof typeof features;

/** Zachowanie checkoutu. */
export const checkoutConfig = {
  requireAuth: env.REQUIRE_AUTH_CHECKOUT,
} as const;

/** Globalna konfiguracja sklepu (wartości domyślne; nadpisywalne przez model Setting). */
export const storeConfig = {
  defaultCurrency: env.DEFAULT_CURRENCY,
  defaultLocale: env.DEFAULT_LOCALE,
  appUrl: env.APP_URL,
} as const;

// Uwaga: formatMoney jest w @/lib/utils (klient-safe, bez importu env).
// config.ts importuje env (sekrety serwerowe) — NIE importuj go w komponentach klienckich.
