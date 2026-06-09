import Link from "next/link";
import { PageForm } from "../page-form";

export default function NewPagePage() {
  return (
    <div>
      <Link href="/admin/content/pages" className="text-sm text-muted-foreground hover:underline">
        ← Strony
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Nowa strona</h1>
      <div className="mt-6">
        <PageForm />
      </div>
    </div>
  );
}
