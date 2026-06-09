import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById } from "@/modules/catalog/products";
import { listCategories } from "@/modules/catalog/categories";
import {
  addVariantAction,
  deleteProductAction,
  deleteProductImageAction,
  deleteVariantAction,
  setProductCategoriesAction,
  updateVariantAction,
} from "@/modules/catalog/actions";
import { toMajorString } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DetailsForm } from "./details-form";
import { ImageUploader } from "./image-uploader";

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
            <form
              key={v.id}
              action={updateVariantAction}
              className="grid grid-cols-12 items-end gap-2 rounded-lg border p-3"
            >
              <input type="hidden" name="id" value={v.id} />
              <input type="hidden" name="productId" value={product.id} />
              <div className="col-span-4 space-y-1">
                <Label className="text-xs">Nazwa</Label>
                <Input name="title" defaultValue={v.title} required />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">SKU</Label>
                <Input name="sku" defaultValue={v.sku ?? ""} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Cena (PLN)</Label>
                <Input name="price" defaultValue={toMajorString(v.priceAmount)} required />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Stan</Label>
                <Input name="quantity" type="number" defaultValue={v.inventory?.quantity ?? 0} />
              </div>
              <div className="col-span-2 flex gap-2">
                <Button type="submit" size="sm" variant="outline">
                  Zapisz
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  formAction={deleteVariantAction}
                >
                  Usuń
                </Button>
              </div>
            </form>
          ))}
        </div>

        {/* Dodaj wariant */}
        <form
          action={addVariantAction}
          className="mt-4 grid grid-cols-12 items-end gap-2 rounded-lg border border-dashed p-3"
        >
          <input type="hidden" name="productId" value={product.id} />
          <div className="col-span-4 space-y-1">
            <Label className="text-xs">Nazwa</Label>
            <Input name="title" placeholder="np. Rozmiar M" required />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">SKU</Label>
            <Input name="sku" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Cena (PLN)</Label>
            <Input name="price" placeholder="0.00" required />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Stan</Label>
            <Input name="quantity" type="number" defaultValue={0} />
          </div>
          <div className="col-span-2">
            <Button type="submit" size="sm">
              Dodaj
            </Button>
          </div>
        </form>
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
