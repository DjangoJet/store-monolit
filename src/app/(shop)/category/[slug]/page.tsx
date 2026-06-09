import Link from "next/link";
import { notFound } from "next/navigation";
import {
  listActiveProducts,
  listStorefrontCategories,
} from "@/modules/catalog/storefront";
import { ProductCard } from "@/components/product-card";

export const revalidate = 60;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Number(sp.page) || 1;

  const categories = await listStorefrontCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const data = await listActiveProducts({ categorySlug: slug, page });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>

      {data.items.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          Brak produktów w tej kategorii.
        </p>
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
              href={`/category/${slug}?page=${p}`}
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
