import { z } from "zod";

export const productStatusEnum = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);
export const productTypeEnum = z.enum(["PHYSICAL", "DIGITAL"]);

export const productInputSchema = z.object({
  title: z.string().trim().min(1, "Tytuł jest wymagany"),
  slug: z.string().trim().optional(),
  subtitle: z.string().trim().optional(),
  description: z.string().trim().optional(),
  status: productStatusEnum.default("DRAFT"),
  type: productTypeEnum.default("PHYSICAL"),
  vatRate: z.coerce.number().int().min(0).max(100).default(23),
  brandId: z.string().optional().nullable(),
  metaTitle: z.string().trim().optional(),
  metaDescription: z.string().trim().optional(),
});

export const variantInputSchema = z.object({
  title: z.string().trim().min(1, "Nazwa wariantu jest wymagana"),
  sku: z.string().trim().optional().nullable(),
  priceAmount: z.coerce.number().int().min(0, "Cena nie może być ujemna"),
  compareAtAmount: z.coerce.number().int().min(0).optional().nullable(),
  currency: z.string().default("PLN"),
  quantity: z.coerce.number().int().min(0).default(0),
  weightGrams: z.coerce.number().int().min(0).optional().nullable(),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Nazwa jest wymagana"),
  slug: z.string().trim().optional(),
  description: z.string().trim().optional(),
  parentId: z.string().optional().nullable(),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
