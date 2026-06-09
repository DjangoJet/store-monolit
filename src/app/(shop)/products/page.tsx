import Link from "next/link";
import {
  listActiveProducts,
  listStorefrontCategories,
  type ProductSort,
} from "@/modules/catalog/storefront";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const revalidate = 60;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const sort = (sp.sort as ProductSort) || "newest";

  const [data, categories] = await Promise.all([
    listActiveProducts({ q: sp.q, categorySlug: sp.category, sort, page }),
    listStorefrontCategories(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Sklep</h1>

      <form className="mt-4 flex flex-wrap gap-2" method="get">
        <Input
          name="q"
          placeholder="Szukaj..."
          defaultValue={sp.q ?? ""}
          className="max-w-xs"
        />
        <Select name="category" defaultValue={sp.category ?? ""} className="max-w-48">
          <option value="">Wszystkie kategorie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select name="sort" defaultValue={sort} className="max-w-40">
          <option value="newest">Najnowsze</option>
          <option value="name">Nazwa A-Z</option>
        </Select>
        <Button type="submit" variant="outline">
          Filtruj
        </Button>
      </form>

      {data.items.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">Brak produktów.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {data.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {data.pages > 1 && (
        <div className="mt-8 flex justify-center gap-2 text-sm">
          {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/products?${new URLSearchParams({
                ...(sp.q ? { q: sp.q } : {}),
                ...(sp.category ? { category: sp.category } : {}),
                ...(sort ? { sort } : {}),
                page: String(p),
              })}`}
              className={`rounded-md border px-3 py-1 ${
                p === page ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
