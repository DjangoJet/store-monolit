import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPage } from "@/modules/content/service";
import { requireFeature } from "@/server/feature";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) return { title: "Nie znaleziono" };
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
  };
}

export default async function CmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  requireFeature("cms");
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) notFound();

  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
      <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">{page.body}</div>
    </article>
  );
}
