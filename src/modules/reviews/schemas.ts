import { z } from "zod";

export const reviewInputSchema = z.object({
  rating: z.coerce
    .number({ message: "Wybierz ocenę" })
    .int("Ocena musi być liczbą całkowitą")
    .min(1, "Wybierz ocenę")
    .max(5, "Ocena musi być w zakresie 1–5"),
  title: z.string().trim().max(120, "Tytuł jest zbyt długi").optional(),
  body: z.string().trim().max(2000, "Treść jest zbyt długa").optional(),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;
