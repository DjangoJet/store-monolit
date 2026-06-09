import Link from "next/link";
import { listPages } from "@/modules/content/service";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AdminPagesPage() {
  const pages = await listPages();

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Strony</h1>
        <Link href="/admin/content/pages/new" className={buttonVariants()}>
          Nowa strona
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <tbody>
            {pages.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground">Brak stron.</td>
              </tr>
            )}
            {pages.map((p) => (
              <tr key={p.id} className="border-t first:border-t-0">
                <td className="px-4 py-2">
                  <Link href={`/admin/content/pages/${p.id}`} className="font-medium hover:underline">
                    {p.title}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">/p/{p.slug}</span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Badge variant={p.status === "PUBLISHED" ? "success" : "muted"}>
                    {p.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
