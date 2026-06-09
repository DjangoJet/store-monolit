import Link from "next/link";
import { listPosts } from "@/modules/content/service";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AdminBlogPage() {
  const posts = await listPosts();

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
        <Link href="/admin/content/blog/new" className={buttonVariants()}>
          Nowy wpis
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <tbody>
            {posts.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground">Brak wpisów.</td>
              </tr>
            )}
            {posts.map((p) => (
              <tr key={p.id} className="border-t first:border-t-0">
                <td className="px-4 py-2">
                  <Link href={`/admin/content/blog/${p.id}`} className="font-medium hover:underline">
                    {p.title}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">/blog/{p.slug}</span>
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
