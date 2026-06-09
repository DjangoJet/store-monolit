import { z } from "zod";

/**
 * Walidacja wejścia panelu wysyłki (admin). Ceny w PLN — akcja konwertuje na grosze.
 * Wzorzec jak w rabatach: schemat = źródło prawdy, akcja zwraca fieldErrors.
 */
export const shippingZoneSchema = z.object({
  name: z.string().trim().min(1, "Nazwa strefy jest wymagana").max(80, "Nazwa zbyt długa"),
  // Lista krajów rozdzielona przecinkami → tablica 2-literowych kodów ISO.
  countries: z.preprocess(
    (v) =>
      typeof v === "string"
        ? v
            .split(",")
            .map((c) => c.trim().toUpperCase())
            .filter(Boolean)
        : v,
    z
      .array(z.string().regex(/^[A-Z]{2}$/, "Kod kraju to 2 litery (np. PL)"))
      .min(1, "Podaj co najmniej jeden kraj"),
  ),
});

export const shippingMethodSchema = z
  .object({
    zoneId: z.string().min(1, "Wybierz strefę"),
    name: z.string().trim().min(1, "Nazwa jest wymagana").max(80, "Nazwa zbyt długa"),
    provider: z.string().min(1, "Wybierz przewoźnika"),
    // Dla Furgonetki: numeryczny service_id; dla manual: puste.
    serviceCode: z.string().trim().optional(),
    price: z.coerce.number({ message: "Cena musi być liczbą" }).min(0, "Cena nie może być ujemna"),
    freeOver: z.coerce.number().min(0, "Próg nie może być ujemny").nullable().optional(),
    requiresPickupPoint: z.boolean().default(false),
    minDays: z.coerce.number().int().min(0).nullable().optional(),
    maxDays: z.coerce.number().int().min(0).nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((d, ctx) => {
    // Przewoźnik integrowany (≠ manual) wymaga wskazania konkretnej usługi.
    if (d.provider !== "manual" && !d.serviceCode) {
      ctx.addIssue({ code: "custom", path: ["serviceCode"], message: "Wybierz usługę przewoźnika" });
    }
  });

export type ShippingZoneInput = z.infer<typeof shippingZoneSchema>;
export type ShippingMethodInput = z.infer<typeof shippingMethodSchema>;
