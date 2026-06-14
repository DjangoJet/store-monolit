import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getActiveProductBySlug } from "@/modules/catalog/storefront";
import { getProductReviews } from "@/modules/reviews/service";
import { isInWishlist } from "@/modules/wishlist/service";
import { getCurrentUser } from "@/server/session";
import { features } from "@/lib/config";
import { VariantPicker, type VariantDTO } from "./variant-picker";
import { ReviewForm } from "./review-form";
import { WishlistButton } from "./wishlist-button";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) return { title: "Nie znaleziono" };
  const image = product.images[0]?.url;
  return {
    title: product.metaTitle || product.title,
    description: product.metaDescription || product.subtitle || undefined,
    openGraph: {
      title: product.metaTitle || product.title,
      description: product.metaDescription || product.subtitle || undefined,
      images: image ? [image] : undefined,
    },
  };
}

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span aria-label={`${value.toFixed(1)} / 5`}>
      <span>{"★".repeat(full)}</span>
      <span className="text-muted-foreground">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) notFound();

  const user = await getCurrentUser();
  const reviews = features.marketing
    ? await getProductReviews(product.id)
    : { average: 0, count: 0, items: [] };
  const wished = user ? await isInWishlist(user.id, product.id) : false;

  const variants: VariantDTO[] = product.variants.map((v) => ({
    id: v.id,
    title: v.title,
    priceAmount: v.priceAmount,
    currency: v.currency,
    available: (v.inventory?.quantity ?? 0) - (v.inventory?.reserved ?? 0),
  }));

  const prices = variants.map((v) => v.priceAmount);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const inStock = variants.some((v) => v.available > 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.images.map((i) => i.url),
    description: product.metaDescription || product.subtitle || product.description || undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    offers: {
      "@type": "Offer",
      price: (minPrice / 100).toFixed(2),
      priceCurrency: variants[0]?.currency ?? "PLN",
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${process.env.APP_URL ?? ""}/product/${product.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // `<` escapowane, by treść (np. tytuł produktu) nie mogła domknąć tagu <script>.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        {/* Galeria */}
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.images[0].url}
                alt={product.images[0].alt ?? product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                brak zdjęcia
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.slice(1).map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.url}
                  alt={img.alt ?? ""}
                  className="h-16 w-16 rounded-md border object-cover"
                />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          {product.brand && (
            <p className="text-sm text-muted-foreground">{product.brand.name}</p>
          )}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{product.title}</h1>
            {product.subtitle && (
              <p className="mt-1 text-muted-foreground">{product.subtitle}</p>
            )}
            {features.marketing && reviews.count > 0 && (
              <p className="mt-2 text-sm">
                <Stars value={reviews.average} />{" "}
                <span className="text-muted-foreground">
                  {reviews.average.toFixed(1)} ({reviews.count})
                </span>
              </p>
            )}
          </div>

          <VariantPicker variants={variants} />

          {features.marketing && (
            <WishlistButton productId={product.id} slug={product.slug} initial={wished} />
          )}

          {product.description && (
            <div className="prose prose-sm max-w-none border-t pt-5 text-sm leading-relaxed">
              {product.description}
            </div>
          )}
        </div>
      </div>

      {/* Recenzje */}
      {features.marketing && (
        <section className="mt-12 border-t pt-8">
          <h2 className="text-xl font-semibold tracking-tight">Recenzje</h2>

          {reviews.items.length > 0 ? (
            <ul className="mt-4 space-y-4">
              {reviews.items.map((r) => (
                <li key={r.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <Stars value={r.rating} />
                    <span className="text-xs text-muted-foreground">
                      {r.author} · {r.createdAt.toLocaleDateString("pl-PL")}
                    </span>
                  </div>
                  {r.title && <p className="mt-1 font-medium">{r.title}</p>}
                  {r.body && <p className="mt-1 text-sm">{r.body}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-muted-foreground">Brak recenzji. Bądź pierwszy!</p>
          )}

          <div className="mt-6 max-w-xl">
            {user ? (
              <ReviewForm productId={product.id} slug={product.slug} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Zaloguj się, aby dodać recenzję.
              </p>
            )}
          </div>
        </section>
      )}
    </>
  );
}
