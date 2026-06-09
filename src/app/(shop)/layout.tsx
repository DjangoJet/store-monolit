import Link from "next/link";
import { listStorefrontCategories } from "@/modules/catalog/storefront";
import { getCurrentCart } from "@/modules/cart/service";
import { features } from "@/lib/config";
import { NewsletterForm } from "@/components/newsletter-form";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, cart] = await Promise.all([
    listStorefrontCategories(),
    getCurrentCart(),
  ]);
  const cartCount = cart?.itemCount ?? 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="font-semibold">
            store-monolit
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/products" className="hover:underline">
              Sklep
            </Link>
            {categories.slice(0, 4).map((c) => (
              <Link key={c.id} href={`/category/${c.slug}`} className="hover:underline">
                {c.name}
              </Link>
            ))}
            {features.cms && (
              <Link href="/blog" className="hover:underline">
                Blog
              </Link>
            )}
            <Link href="/account" className="hover:underline">
              Konto
            </Link>
            <Link href="/cart" className="hover:underline">
              Koszyk{cartCount > 0 ? ` (${cartCount})` : ""}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} store-monolit</span>
          {features.marketing && (
            <div>
              <p className="mb-1 font-medium text-foreground">Newsletter</p>
              <NewsletterForm />
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
