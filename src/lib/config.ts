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

/** Globalna konfiguracja sklepu (wartości domyślne; nadpisywalne przez model Setting). */
export const storeConfig = {
  defaultCurrency: env.DEFAULT_CURRENCY,
  defaultLocale: env.DEFAULT_LOCALE,
  appUrl: env.APP_URL,
} as const;

/** Formatowanie kwot przechowywanych w groszach (Int) → string waluty. */
export function formatMoney(
  amountMinor: number,
  currency: string = storeConfig.defaultCurrency,
  locale: string = storeConfig.defaultLocale,
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}
