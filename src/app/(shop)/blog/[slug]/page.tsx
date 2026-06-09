import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedPost } from "@/modules/content/service";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "Nie znaleziono" };
  return { title: post.title, description: post.excerpt || undefined };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-2xl">
      <Link href="/blog" className="text-sm text-muted-foreground hover:underline">
        ← Blog
      </Link>
      {post.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverUrl}
          alt={post.title}
          className="mt-4 aspect-video w-full rounded-lg object-cover"
        />
      )}
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{post.title}</h1>
      {post.publishedAt && (
        <p className="mt-1 text-sm text-muted-foreground">
          {post.publishedAt.toLocaleDateString("pl-PL")}
        </p>
      )}
      <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">{post.body}</div>
    </article>
  );
}
