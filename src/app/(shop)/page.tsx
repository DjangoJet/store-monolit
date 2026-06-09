import Link from "next/link";
import { listActiveProducts } from "@/modules/catalog/storefront";
import { getBanner } from "@/modules/content/service";
import { features } from "@/lib/config";
import { ProductCard } from "@/components/product-card";
import { buttonVariants } from "@/components/ui/button";

export const revalidate = 60;

export default async function HomePage() {
  const hero = features.cms ? await getBanner("hero") : null;
  const { items } = await listActiveProducts({ sort: "newest", perPage: 8 });

  return (
    <div className="space-y-12">
      {/* Hero */}
      {hero?.isActive && (
        <section
          className="relative overflow-hidden rounded-2xl border bg-muted"
          style={
            hero.imageUrl
              ? { backgroundImage: `url(${hero.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          <div className="bg-gradient-to-r from-background/90 to-background/40 p-10 sm:p-16">
            <h1 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
              {hero.title ?? "Witaj w sklepie"}
            </h1>
            {hero.subtitle && (
              <p className="mt-3 max-w-lg text-muted-foreground">{hero.subtitle}</p>
            )}
            <Link href={hero.linkUrl ?? "/products"} className={`${buttonVariants()} mt-6`}>
              Przejdź do sklepu
            </Link>
          </div>
        </section>
      )}

      {/* Nowości */}
      <section>
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Nowości</h2>
          <Link href="/products" className="text-sm font-medium underline">
            Zobacz wszystkie
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="mt-6 text-muted-foreground">Brak produktów.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
