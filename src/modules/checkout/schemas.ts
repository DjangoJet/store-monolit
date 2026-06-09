import { z } from "zod";

/**
 * Kraje obsługiwane w checkoucie wraz z regexem kodu pocztowego.
 * Rozszerzasz sklep o nowy kraj? Dodaj wpis tutaj — `country` (enum) i
 * walidacja kodu pocztowego zaktualizują się automatycznie.
 */
export const POSTAL_CODE_RULES = {
  PL: { pattern: /^\d{2}-\d{3}$/, hint: "Format: 00-000" },
  DE: { pattern: /^\d{5}$/, hint: "Format: 00000" },
  CZ: { pattern: /^\d{3} ?\d{2}$/, hint: "Format: 000 00" },
  GB: { pattern: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, hint: "Format: SW1A 1AA" },
} as const;

export type CountryCode = keyof typeof POSTAL_CODE_RULES;

const COUNTRY_CODES = Object.keys(POSTAL_CODE_RULES) as [CountryCode, ...CountryCode[]];

// Luźny format międzynarodowy: opcjonalny +, cyfry, spacje, myślniki, nawiasy.
const PHONE_PATTERN = /^\+?[\d\s\-()]{7,20}$/;

export const addressSchema = z
  .object({
    firstName: z.string().trim().min(1, "Imię jest wymagane"),
    lastName: z.string().trim().min(1, "Nazwisko jest wymagane"),
    line1: z.string().trim().min(1, "Adres jest wymagany"),
    line2: z.string().trim().optional(),
    city: z.string().trim().min(1, "Miasto jest wymagane"),
    postalCode: z.string().trim().min(1, "Kod pocztowy jest wymagany"),
    country: z.enum(COUNTRY_CODES).default("PL"),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || PHONE_PATTERN.test(v), "Nieprawidłowy numer telefonu"),
  })
  // Kod pocztowy walidujemy względem kraju (zależność między polami).
  .superRefine((data, ctx) => {
    const rule = POSTAL_CODE_RULES[data.country];
    if (data.postalCode && !rule.pattern.test(data.postalCode)) {
      ctx.addIssue({
        code: "custom",
        path: ["postalCode"],
        message: `Nieprawidłowy kod pocztowy (${rule.hint})`,
      });
    }
  });

/**
 * Adres do faktury — bez imienia/nazwiska (nazwę nabywcy niesie buyerName lub
 * dane z adresu wysyłki). Walidacja kodu pocztowego per kraj, jak w adresie wysyłki.
 * W formularzu pola mają prefiks `billing*`, by nie kolidować z adresem dostawy.
 */
export const billingAddressSchema = z
  .object({
    line1: z.string().trim().min(1, "Adres jest wymagany"),
    line2: z.string().trim().optional(),
    city: z.string().trim().min(1, "Miasto jest wymagane"),
    postalCode: z.string().trim().min(1, "Kod pocztowy jest wymagany"),
    country: z.enum(COUNTRY_CODES).default("PL"),
  })
  .superRefine((data, ctx) => {
    const rule = POSTAL_CODE_RULES[data.country];
    if (data.postalCode && !rule.pattern.test(data.postalCode)) {
      ctx.addIssue({
        code: "custom",
        path: ["postalCode"],
        message: `Nieprawidłowy kod pocztowy (${rule.hint})`,
      });
    }
  });

// NIP nabywcy (B2B): opcjonalny, ale gdy podany — dokładnie 10 cyfr (myślniki/spacje czyszczone).
const optionalNip = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    const cleaned = v.replace(/[\s-]/g, "");
    return cleaned === "" ? undefined : cleaned;
  },
  z.string().regex(/^\d{10}$/, "NIP musi mieć 10 cyfr").optional(),
);

export const checkoutSchema = z.object({
  email: z.string().email("Nieprawidłowy email"),
  shippingMethodId: z.string().min(1, "Wybierz metodę wysyłki"),
  pickupPointCode: z.string().trim().optional(),
  customerNote: z.string().trim().max(1000, "Uwagi są zbyt długie").optional(),
  address: addressSchema,
  // Faktura: intencja + dane nabywcy. billingAddress parsujemy osobno w akcji
  // (prefiks pól), więc tu jest tylko opcjonalnym nośnikiem typu.
  invoiceRequested: z.boolean().default(false),
  buyerNip: optionalNip,
  buyerName: z.string().trim().max(200, "Nazwa jest zbyt długa").optional(),
  billingSameAsShipping: z.boolean().default(true),
  billingAddress: billingAddressSchema.optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type BillingAddressInput = z.infer<typeof billingAddressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
