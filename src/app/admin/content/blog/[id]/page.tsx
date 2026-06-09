import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost } from "@/modules/content/service";
import { deletePostAction } from "@/modules/content/actions";
import { Button } from "@/components/ui/button";
import { PostForm } from "../post-form";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link href="/admin/content/blog" className="text-sm text-muted-foreground hover:underline">
          ← Blog
        </Link>
        <form action={deletePostAction}>
          <input type="hidden" name="id" value={post.id} />
          <Button type="submit" variant="destructive" size="sm">Usuń</Button>
        </form>
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{post.title}</h1>
      <div className="mt-6">
        <PostForm post={post} />
      </div>
    </div>
  );
}
