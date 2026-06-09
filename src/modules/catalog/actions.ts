"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/server/session";
import { toMinor } from "@/lib/utils";
import { toFieldErrors } from "@/lib/forms";
import {
  categoryInputSchema,
  productInputSchema,
  variantInputSchema,
} from "./schemas";
import {
  addProductImage,
  addVariant,
  createProduct,
  deleteProductImage,
  deleteVariant,
  getProductSlug,
  setProductCategories,
  softDeleteProduct,
  updateProduct,
  updateVariant,
} from "./products";
import {
  createCategory,
  deleteCategory,
} from "./categories";

export type FormState =
  | { error?: string; success?: string; fieldErrors?: Record<string, string> }
  | undefined;

// Cache storefront opiera się na ISR (export const revalidate); tu wymuszamy natychmiastowe
// odświeżenie listy i konkretnej karty produktu po zmianie.
function revalidateCatalog(slug?: string | null) {
  revalidatePath("/products");
  if (slug) revalidatePath(`/product/${slug}`);
}

// ---- Produkty ----

export async function createProductAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("STAFF");

  const parsed = productInputSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle") || undefined,
    description: formData.get("description") || undefined,
    status: formData.get("status") || "DRAFT",
    type: formData.get("type") || "PHYSICAL",
    vatRate: formData.get("vatRate") ?? 23,
  });

  const price = toMinor(String(formData.get("price") ?? "0"));
  const fieldErrors = parsed.success ? {} : toFieldErrors(parsed.error);
  // Cena jest parsowana osobno (toMinor), więc walidujemy ją tutaj.
  if (!Number.isFinite(price) || price <= 0) {
    fieldErrors.price = "Podaj poprawną cenę większą od 0";
  }
  if (!parsed.success || Object.keys(fieldErrors).length > 0) {
    return { error: "Sprawdź poprawność danych.", fieldErrors };
  }

  const product = await createProduct(parsed.data, price);
  revalidateCatalog(product.slug);
  redirect(`/admin/products/${product.id}`);
}

export async function updateProductAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("STAFF");
  const id = String(formData.get("id"));

  const parsed = productInputSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug") || undefined,
    subtitle: formData.get("subtitle") || undefined,
    description: formData.get("description") || undefined,
    status: formData.get("status") || "DRAFT",
    type: formData.get("type") || "PHYSICAL",
    vatRate: formData.get("vatRate") ?? 23,
    metaTitle: formData.get("metaTitle") || undefined,
    metaDescription: formData.get("metaDescription") || undefined,
  });
  if (!parsed.success) {
    return { error: "Sprawdź poprawność danych.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const product = await updateProduct(id, parsed.data);
  revalidateCatalog(product.slug);
  revalidatePath(`/admin/products/${id}`);
  return { success: "Zapisano zmiany." };
}

export async function deleteProductAction(formData: FormData) {
  await requireRole("STAFF");
  const id = String(formData.get("id"));
  const slug = await getProductSlug(id);
  await softDeleteProduct(id);
  revalidateCatalog(slug);
  redirect("/admin/products");
}

// ---- Warianty ----

// Cena jest parsowana osobno (toMinor) i walidowana w akcji — patrz produkt.
// Klucz błędu ceny to `priceAmount` (nazwa pola w schemacie), formularz czyta go pod inputem `price`.
function parseVariant(formData: FormData) {
  const price = toMinor(String(formData.get("price") ?? "0"));
  const parsed = variantInputSchema.safeParse({
    title: formData.get("title"),
    sku: formData.get("sku") || undefined,
    priceAmount: Number.isFinite(price) ? price : 0,
    compareAtAmount: formData.get("compareAt")
      ? toMinor(String(formData.get("compareAt")))
      : undefined,
    quantity: formData.get("quantity") || 0,
    weightGrams: formData.get("weightGrams") || undefined,
  });

  const fieldErrors = parsed.success ? {} : toFieldErrors(parsed.error);
  if (!Number.isFinite(price) || price < 0) {
    fieldErrors.priceAmount = "Podaj poprawną cenę";
  }
  return { parsed, fieldErrors };
}

export async function addVariantAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("STAFF");
  const productId = String(formData.get("productId"));
  const { parsed, fieldErrors } = parseVariant(formData);
  if (!parsed.success || Object.keys(fieldErrors).length > 0) {
    return { error: "Sprawdź poprawność danych.", fieldErrors };
  }
  await addVariant(productId, parsed.data);
  revalidateCatalog(await getProductSlug(productId));
  revalidatePath(`/admin/products/${productId}`);
  return { success: "Dodano wariant." };
}

export async function updateVariantAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("STAFF");
  const id = String(formData.get("id"));
  const productId = String(formData.get("productId"));
  const { parsed, fieldErrors } = parseVariant(formData);
  if (!parsed.success || Object.keys(fieldErrors).length > 0) {
    return { error: "Sprawdź poprawność danych.", fieldErrors };
  }
  await updateVariant(id, parsed.data);
  revalidateCatalog(await getProductSlug(productId));
  revalidatePath(`/admin/products/${productId}`);
  return { success: "Zapisano wariant." };
}

export async function deleteVariantAction(formData: FormData) {
  await requireRole("STAFF");
  const id = String(formData.get("id"));
  const productId = String(formData.get("productId"));
  await deleteVariant(id);
  revalidateCatalog(await getProductSlug(productId));
  revalidatePath(`/admin/products/${productId}`);
}

// ---- Media produktu ----

export async function addProductImageAction(formData: FormData) {
  await requireRole("STAFF");
  const productId = String(formData.get("productId"));
  const url = String(formData.get("url"));
  const alt = formData.get("alt") ? String(formData.get("alt")) : undefined;
  if (!url) return;
  await addProductImage(productId, { url, alt });
  revalidateCatalog(await getProductSlug(productId));
  revalidatePath(`/admin/products/${productId}`);
}

export async function deleteProductImageAction(formData: FormData) {
  await requireRole("STAFF");
  const id = String(formData.get("id"));
  const productId = String(formData.get("productId"));
  await deleteProductImage(id);
  revalidateCatalog(await getProductSlug(productId));
  revalidatePath(`/admin/products/${productId}`);
}

// ---- Kategorie produktu ----

export async function setProductCategoriesAction(formData: FormData) {
  await requireRole("STAFF");
  const productId = String(formData.get("productId"));
  const categoryIds = formData.getAll("categoryIds").map(String);
  await setProductCategories(productId, categoryIds);
  revalidateCatalog(await getProductSlug(productId));
  revalidatePath(`/admin/products/${productId}`);
}

// ---- Kategorie ----

export async function createCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("STAFF");
  const parsed = categoryInputSchema.safeParse({
    name: formData.get("name"),
    parentId: formData.get("parentId") || undefined,
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: "Sprawdź poprawność danych.", fieldErrors: toFieldErrors(parsed.error) };
  }
  await createCategory(parsed.data);
  revalidateCatalog();
  revalidatePath("/admin/categories");
  return { success: "Dodano kategorię." };
}

export async function deleteCategoryAction(formData: FormData) {
  await requireRole("STAFF");
  const id = String(formData.get("id"));
  await deleteCategory(id);
  revalidateCatalog();
  revalidatePath("/admin/categories");
}
