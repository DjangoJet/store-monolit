import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById } from "@/modules/catalog/products";
import { listCategories } from "@/modules/catalog/categories";
import {
  deleteProductAction,
  deleteProductImageAction,
  setProductCategoriesAction,
} from "@/modules/catalog/actions";
import { Button } from "@/components/ui/button";
import { DetailsForm } from "./details-form";
import { ImageUploader } from "./image-uploader";
import { AddVariantForm, VariantRow } from "./variants-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductById(id),
    listCategories(),
  ]);
  if (!product) notFound();

  const assigned = new Set(product.categories.map((c) => c.categoryId));

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/products" className="text-sm text-muted-foreground hover:underline">
            ← Produkty
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{product.title}</h1>
        </div>
        <form action={deleteProductAction}>
          <input type="hidden" name="id" value={product.id} />
          <Button type="submit" variant="destructive" size="sm">
            Usuń
          </Button>
        </form>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-medium">Szczegóły</h2>
        <DetailsForm product={product} />
      </section>

      {/* --- Warianty --- */}
      <section>
        <h2 className="mb-3 text-lg font-medium">Warianty</h2>
        <div className="space-y-3">
          {product.variants.map((v) => (
            <VariantRow
              key={v.id}
              productId={product.id}
              variant={{
                id: v.id,
                title: v.title,
                sku: v.sku,
                priceAmount: v.priceAmount,
                quantity: v.inventory?.quantity ?? 0,
              }}
            />
          ))}
        </div>

        <AddVariantForm productId={product.id} />
      </section>

      {/* --- Media --- */}
      <section>
        <h2 className="mb-3 text-lg font-medium">Zdjęcia</h2>
        <div className="flex flex-wrap gap-3">
          {product.images.map((img) => (
            <div key={img.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt ?? ""}
                className="h-24 w-24 rounded-md border object-cover"
              />
              <form action={deleteProductImageAction} className="absolute right-1 top-1">
                <input type="hidden" name="id" value={img.id} />
                <input type="hidden" name="productId" value={product.id} />
                <button
                  type="submit"
                  className="rounded bg-black/60 px-1 text-xs text-white"
                  aria-label="Usuń zdjęcie"
                >
                  ✕
                </button>
              </form>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <ImageUploader productId={product.id} />
        </div>
      </section>

      {/* --- Kategorie --- */}
      <section>
        <h2 className="mb-3 text-lg font-medium">Kategorie</h2>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Brak kategorii.{" "}
            <Link href="/admin/categories" className="underline">
              Dodaj kategorie
            </Link>
          </p>
        ) : (
          <form action={setProductCategoriesAction} className="space-y-3">
            <input type="hidden" name="productId" value={product.id} />
            <div className="flex flex-wrap gap-3">
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="categoryIds"
                    value={c.id}
                    defaultChecked={assigned.has(c.id)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
            <Button type="submit" size="sm" variant="outline">
              Zapisz kategorie
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
