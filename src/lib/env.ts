import { z } from "zod";

/**
 * Walidacja zmiennych środowiskowych (fail-fast przy starcie).
 * Sekrety integracji są opcjonalne, by template uruchamiał się bez nich
 * (poszczególne adaptery zgłoszą brak konfiguracji dopiero przy użyciu).
 */
const boolish = z
  .enum(["true", "false"])
  .transform((v) => v === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL jest wymagane"),

  AUTH_SECRET: z.string().min(1, "AUTH_SECRET jest wymagane"),
  AUTH_TRUST_HOST: boolish.default(true),

  // Wybór domyślnego providera (opcjonalny; gdy pusty — auto wg dostępnych kluczy)
  PAYMENT_PROVIDER: z.string().optional(),
  SHIPPING_PROVIDER: z.string().optional(),

  // Płatności — Stripe (opcjonalne na starcie)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Wysyłka — Furgonetka (OAuth2 password grant; opcjonalne)
  FURGONETKA_CLIENT_ID: z.string().optional(),
  FURGONETKA_CLIENT_SECRET: z.string().optional(),
  FURGONETKA_USERNAME: z.string().optional(),
  FURGONETKA_PASSWORD: z.string().optional(),
  FURGONETKA_SANDBOX: boolish.default(true),
  FURGONETKA_COD_IBAN: z.string().optional(),
  FURGONETKA_WEBHOOK_SECRET: z.string().optional(),
  // Adres nadawcy (pickup/sender) dla przesyłek
  FURGONETKA_SENDER_NAME: z.string().optional(),
  FURGONETKA_SENDER_STREET: z.string().optional(),
  FURGONETKA_SENDER_POSTCODE: z.string().optional(),
  FURGONETKA_SENDER_CITY: z.string().optional(),
  FURGONETKA_SENDER_EMAIL: z.string().optional(),
  FURGONETKA_SENDER_PHONE: z.string().optional(),

  // Storage S3 (opcjonalne na starcie)
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
  S3_FORCE_PATH_STYLE: boolish.default(true),

  // Email (opcjonalne)
  // Jawny wybór dostawcy maili (jak PAYMENT_PROVIDER). console = tylko logi (nie wysyła).
  EMAIL_PROVIDER: z.enum(["console", "smtp", "resend"]).default("console"),
  EMAIL_FROM: z.string().default("Sklep <noreply@example.com>"),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),

  // KSeF — Krajowy System e-Faktur (opcjonalne; bez konfiguracji provider e-fakturowania = `none`).
  // Uwierzytelnianie docelowe: certyfikat KSeF (jedyna metoda od 1.01.2027; token jako ścieżka tymczasowa).
  KSEF_ENABLED: boolish.default(false),
  KSEF_ENV: z.enum(["test", "demo", "prod"]).default("test"),
  KSEF_NIP: z.string().optional(), // NIP podmiotu wystawiającego (10 cyfr)
  KSEF_CERT_PATH: z.string().optional(), // ścieżka do certyfikatu (PEM) — włącza auth XAdES
  KSEF_KEY_PATH: z.string().optional(), // ścieżka do klucza prywatnego (PEM)
  KSEF_CERT_PASSWORD: z.string().optional(), // hasło klucza prywatnego (jeśli zaszyfrowany)
  KSEF_CERT_SUBJECT_TYPE: z
    .enum(["certificateSubject", "certificateFingerprint"])
    .default("certificateFingerprint"), // jak KSeF ma rozpoznać podmiot po certyfikacie
  KSEF_TOKEN: z.string().optional(), // token KSeF — tylko do szybkich testów (wygasa 31.12.2026)

  // Feature flags
  FEATURE_MARKETING: boolish.default(true),
  FEATURE_CMS: boolish.default(true),
  FEATURE_MULTIREGION: boolish.default(false),
  FEATURE_DIGITAL: boolish.default(false),
  FEATURE_INVOICES: boolish.default(true),

  // Wymuś logowanie przed kasą (domyślnie guest checkout dozwolony)
  REQUIRE_AUTH_CHECKOUT: boolish.default(false),

  // Domyślne ustawienia sklepu
  DEFAULT_CURRENCY: z.string().default("PLN"),
  DEFAULT_LOCALE: z.string().default("pl"),
});

function loadEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Nieprawidłowa konfiguracja środowiska:");
    console.error(z.treeifyError(parsed.error));
    throw new Error("Błąd walidacji zmiennych środowiskowych");
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
