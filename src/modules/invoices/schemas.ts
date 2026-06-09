import { z } from "zod";

// NIP: 10 cyfr (dopuszczamy myślniki/spacje przy wpisywaniu). PESEL: 11 cyfr.
// Pole jest opcjonalne (np. działalność nierejestrowana), ale gdy podane — musi mieć poprawny format.
const taxIdSchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z
    .string()
    .trim()
    .refine((v) => /^\d{10}$/.test(v.replace(/[\s-]/g, "")) || /^\d{11}$/.test(v), {
      message: "Podaj poprawny NIP (10 cyfr) lub PESEL (11 cyfr)",
    })
    .optional(),
);

export const invoiceSettingsSchema = z.object({
  name: z.string().trim().min(1, "Nazwa sprzedawcy jest wymagana"),
  address: z.string().trim().default(""),
  taxId: taxIdSchema,
  vatExempt: z.boolean().default(false),
  exemptionNote: z.string().trim().optional(),
  bankAccount: z.string().trim().optional(),
  vatRate: z.coerce.number().int().min(0, "Stawka VAT 0–100").max(100, "Stawka VAT 0–100").default(23),
  numberPrefix: z.string().default("FV "),
  paymentTermsDays: z.coerce
    .number()
    .int("Termin musi być liczbą całkowitą")
    .min(0, "Termin nie może być ujemny")
    .max(365, "Termin jest zbyt długi")
    .default(14),
});

export type InvoiceSettingsSchema = z.infer<typeof invoiceSettingsSchema>;
