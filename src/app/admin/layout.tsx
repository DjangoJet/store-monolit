import Link from "next/link";
import { requireRole } from "@/server/session";
import { logoutAction } from "@/modules/auth/actions";
import { features } from "@/lib/config";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/orders", label: "Zamówienia" },
  ...(features.invoices ? [{ href: "/admin/invoices", label: "Faktury" }] : []),
  { href: "/admin/products", label: "Produkty" },
  { href: "/admin/categories", label: "Kategorie" },
  { href: "/admin/customers", label: "Klienci" },
  { href: "/admin/discounts", label: "Rabaty" },
  { href: "/admin/reviews", label: "Recenzje" },
  { href: "/admin/content", label: "Treści" },
  { href: "/admin/shipping", label: "Wysyłka" },
  { href: "/admin/settings", label: "Ustawienia" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("STAFF");

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r bg-muted/30 p-4">
        <Link href="/admin/dashboard" className="block px-2 text-sm font-semibold">
          store-monolit
        </Link>
        <p className="mt-0.5 px-2 text-xs text-muted-foreground">Panel admina</p>
        <nav className="mt-6 flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-6">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <form action={logoutAction}>
            <Button variant="outline" size="sm" type="submit">
              Wyloguj
            </Button>
          </form>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
