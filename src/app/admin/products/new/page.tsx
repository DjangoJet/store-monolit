import Link from "next/link";
import { NewProductForm } from "./new-form";

export default function NewProductPage() {
  return (
    <div>
      <Link href="/admin/products" className="text-sm text-muted-foreground hover:underline">
        ← Produkty
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Nowy produkt</h1>
      <div className="mt-6">
        <NewProductForm />
      </div>
    </div>
  );
}
