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

export const checkoutSchema = z.object({
  email: z.string().email("Nieprawidłowy email"),
  shippingMethodId: z.string().min(1, "Wybierz metodę wysyłki"),
  pickupPointCode: z.string().trim().optional(),
  customerNote: z.string().trim().max(1000, "Uwagi są zbyt długie").optional(),
  address: addressSchema,
});

export type AddressInput = z.infer<typeof addressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
