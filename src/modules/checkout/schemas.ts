import { z } from "zod";

export const addressSchema = z.object({
  firstName: z.string().trim().min(1, "Imię jest wymagane"),
  lastName: z.string().trim().min(1, "Nazwisko jest wymagane"),
  line1: z.string().trim().min(1, "Adres jest wymagany"),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1, "Miasto jest wymagane"),
  postalCode: z.string().trim().min(1, "Kod pocztowy jest wymagany"),
  country: z.string().trim().default("PL"),
  phone: z.string().trim().optional(),
});

export const checkoutSchema = z.object({
  email: z.string().email("Nieprawidłowy email"),
  shippingMethodId: z.string().min(1, "Wybierz metodę wysyłki"),
  pickupPointCode: z.string().trim().optional(),
  customerNote: z.string().trim().optional(),
  address: addressSchema,
});

export type AddressInput = z.infer<typeof addressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
