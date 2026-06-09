import Link from "next/link";
import { requireUser } from "@/server/session";
import { requireFeature } from "@/server/feature";
import { listWishlist } from "@/modules/wishlist/service";
import { ProductCard } from "@/components/product-card";

export default async function AccountWishlistPage() {
  requireFeature("marketing");
  const user = await requireUser();
  const items = await listWishlist(user.id);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/account" className="text-sm text-muted-foreground hover:underline">
        ← Konto
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Lista życzeń</h1>

      {items.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Lista życzeń jest pusta.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard
              key={p.id}
              product={{
                id: p.id,
                slug: p.slug,
                title: p.title,
                imageUrl: p.imageUrl,
                imageAlt: null,
                minPrice: p.minPrice,
                maxPrice: p.minPrice,
                currency: p.currency,
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
