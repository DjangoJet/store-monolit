import Link from "next/link";
import { notFound } from "next/navigation";
import { getPage } from "@/modules/content/service";
import { deletePageAction } from "@/modules/content/actions";
import { Button } from "@/components/ui/button";
import { PageForm } from "../page-form";

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await getPage(id);
  if (!page) notFound();

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link href="/admin/content/pages" className="text-sm text-muted-foreground hover:underline">
          ← Strony
        </Link>
        <form action={deletePageAction}>
          <input type="hidden" name="id" value={page.id} />
          <Button type="submit" variant="destructive" size="sm">Usuń</Button>
        </form>
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{page.title}</h1>
      <div className="mt-6">
        <PageForm page={page} />
      </div>
    </div>
  );
}
