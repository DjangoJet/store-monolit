import { z } from "zod";

export const contentStatusEnum = z.enum(["DRAFT", "PUBLISHED"]);

// URL opcjonalny: puste pole traktujemy jak brak, wartość musi być poprawnym URL-em.
const optionalUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().url("Nieprawidłowy URL").optional(),
);

export const pageInputSchema = z.object({
  title: z.string().trim().min(1, "Tytuł jest wymagany").max(200, "Tytuł jest zbyt długi"),
  slug: z.string().trim().optional(),
  body: z.string().default(""),
  status: contentStatusEnum.default("DRAFT"),
  metaTitle: z.string().trim().max(70, "Meta title jest zbyt długi").optional(),
  metaDescription: z.string().trim().max(200, "Meta description jest zbyt długi").optional(),
});

export const postInputSchema = z.object({
  title: z.string().trim().min(1, "Tytuł jest wymagany").max(200, "Tytuł jest zbyt długi"),
  slug: z.string().trim().optional(),
  excerpt: z.string().trim().max(500, "Zajawka jest zbyt długa").optional(),
  body: z.string().default(""),
  coverUrl: optionalUrl,
  status: contentStatusEnum.default("DRAFT"),
});

export const bannerInputSchema = z.object({
  key: z.string().trim().min(1, "Klucz jest wymagany").max(60, "Klucz jest zbyt długi"),
  title: z.string().trim().optional(),
  subtitle: z.string().trim().optional(),
  imageUrl: optionalUrl,
  linkUrl: optionalUrl,
  isActive: z.boolean().default(false),
});

export type PageInputSchema = z.infer<typeof pageInputSchema>;
export type PostInputSchema = z.infer<typeof postInputSchema>;
export type BannerInputSchema = z.infer<typeof bannerInputSchema>;
