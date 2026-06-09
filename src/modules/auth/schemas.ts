import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Nieprawidłowy adres email"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Imię jest wymagane").optional(),
  email: z.string().email("Nieprawidłowy adres email"),
  password: z.string().min(8, "Hasło musi mieć min. 8 znaków"),
});

export const forgotSchema = z.object({
  email: z.string().email("Nieprawidłowy adres email"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
