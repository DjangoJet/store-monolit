import Link from "next/link";
import { listPublishedPosts } from "@/modules/content/service";

export const revalidate = 120;

export default async function BlogPage() {
  const posts = await listPublishedPosts();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>

      {posts.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Brak wpisów.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="group block rounded-lg border p-4">
              {p.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.coverUrl}
                  alt={p.title}
                  className="mb-3 aspect-video w-full rounded object-cover"
                />
              )}
              <h2 className="font-medium group-hover:underline">{p.title}</h2>
              {p.excerpt && (
                <p className="mt-1 text-sm text-muted-foreground">{p.excerpt}</p>
              )}
              {p.publishedAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {p.publishedAt.toLocaleDateString("pl-PL")}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
