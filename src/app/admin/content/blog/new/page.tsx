import Link from "next/link";
import { PostForm } from "../post-form";

export default function NewPostPage() {
  return (
    <div>
      <Link href="/admin/content/blog" className="text-sm text-muted-foreground hover:underline">
        ← Blog
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Nowy wpis</h1>
      <div className="mt-6">
        <PostForm />
      </div>
    </div>
  );
}
