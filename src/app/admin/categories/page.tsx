import { listCategories } from "@/modules/catalog/categories";
import { deleteCategoryAction } from "@/modules/catalog/actions";
import { CategoryForm } from "./category-form";

export default async function AdminCategoriesPage() {
  const categories = await listCategories();
  const byId = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Kategorie</h1>

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Nazwa</th>
                <th className="px-4 py-2 font-medium">Nadrzędna</th>
                <th className="px-4 py-2 font-medium">Produkty</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Brak kategorii.
                  </td>
                </tr>
              )}
              {categories.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{c.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {c.parentId ? byId.get(c.parentId) ?? "—" : "—"}
                  </td>
                  <td className="px-4 py-2">{c._count.products}</td>
                  <td className="px-4 py-2 text-right">
                    <form action={deleteCategoryAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        className="text-xs text-destructive hover:underline"
                      >
                        Usuń
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-medium">Nowa kategoria</h2>
          <CategoryForm parents={categories.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
      </div>
    </div>
  );
}
