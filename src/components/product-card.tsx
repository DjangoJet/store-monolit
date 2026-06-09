import Link from "next/link";
import { formatMoney } from "@/lib/config";
import type { ProductCardDTO } from "@/modules/catalog/storefront";

export function ProductCard({ product }: { product: ProductCardDTO }) {
  const priceLabel =
    product.minPrice === product.maxPrice
      ? formatMoney(product.minPrice, product.currency)
      : `od ${formatMoney(product.minPrice, product.currency)}`;

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.imageAlt ?? product.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            brak zdjęcia
          </div>
        )}
      </div>
      <h3 className="mt-2 text-sm font-medium">{product.title}</h3>
      <p className="text-sm text-muted-foreground">{priceLabel}</p>
    </Link>
  );
}
