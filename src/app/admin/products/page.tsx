import Link from "next/link";
import { listProducts } from "@/modules/catalog/products";
import { formatMoney } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const STATUS_VARIANT = {
  ACTIVE: "success",
  DRAFT: "muted",
  ARCHIVED: "outline",
} as const;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = (sp.status as "DRAFT" | "ACTIVE" | "ARCHIVED" | undefined) || undefined;
  const page = Number(sp.page) || 1;

  const { items, total, pages } = await listProducts({ q: sp.q, status, page });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produkty</h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} pozycji</p>
        </div>
        <Link href="/admin/products/new" className={buttonVariants()}>
          Dodaj produkt
        </Link>
      </div>

      <form className="mt-6 flex gap-2" method="get">
        <Input
          name="q"
          placeholder="Szukaj po nazwie..."
          defaultValue={sp.q ?? ""}
          className="max-w-xs"
        />
        <Select name="status" defaultValue={status ?? ""} className="max-w-40">
          <option value="">Wszystkie statusy</option>
          <option value="ACTIVE">Aktywne</option>
          <option value="DRAFT">Szkice</option>
          <option value="ARCHIVED">Zarchiwizowane</option>
        </Select>
        <Button type="submit" variant="outline">
          Filtruj
        </Button>
      </form>

      <div className="mt-4 overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Produkt</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Cena</th>
              <th className="px-4 py-2 font-medium">Stan</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Brak produktów.
                </td>
              </tr>
            )}
            {items.map((p) => {
              const prices = p.variants.map((v) => v.priceAmount);
              const minPrice = prices.length ? Math.min(...prices) : 0;
              const stock = p.variants.reduce(
                (sum, v) => sum + (v.inventory?.quantity ?? 0),
                0,
              );
              return (
                <tr key={p.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">
                      {p.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">/{p.slug}</div>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-2">{formatMoney(minPrice)}</td>
                  <td className="px-4 py-2">{stock}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/products?${new URLSearchParams({
                ...(sp.q ? { q: sp.q } : {}),
                ...(status ? { status } : {}),
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
