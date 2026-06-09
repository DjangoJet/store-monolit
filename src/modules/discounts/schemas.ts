import { z } from "zod";

export const discountTypeEnum = z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]);

/**
 * Walidacja wejścia w jednostkach użytkownika (procent / PLN), PRZED konwersją
 * na grosze. Akcja po sparsowaniu sama zamienia kwoty na minor units.
 */
export const discountInputSchema = z
  .object({
    code: z.string().trim().min(1, "Kod jest wymagany").max(40, "Kod jest zbyt długi"),
    type: discountTypeEnum,
    value: z.coerce.number({ message: "Wartość musi być liczbą" }).min(0, "Wartość nie może być ujemna"),
    minSubtotal: z.coerce.number().min(0, "Wartość nie może być ujemna").nullable().optional(),
    usageLimit: z.coerce
      .number()
      .int("Limit musi być liczbą całkowitą")
      .min(1, "Limit musi być co najmniej 1")
      .nullable()
      .optional(),
  })
  // Sensowny zakres wartości zależy od typu rabatu (zależność między polami).
  .superRefine((d, ctx) => {
    if (d.type === "PERCENT" && (d.value < 1 || d.value > 100)) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Procent musi być w zakresie 1–100" });
    }
    if (d.type === "FIXED" && d.value <= 0) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Kwota musi być większa od 0" });
    }
  });

export type DiscountInput = z.infer<typeof discountInputSchema>;
