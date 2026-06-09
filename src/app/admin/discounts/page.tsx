import { listDiscounts } from "@/modules/discounts/service";
import { deleteDiscountAction } from "@/modules/discounts/actions";
import { formatMoney } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { DiscountForm } from "./discount-form";

function describeValue(d: { type: string; value: number }) {
  if (d.type === "PERCENT") return `${d.value}%`;
  if (d.type === "FIXED") return formatMoney(d.value);
  return "Darmowa wysyłka";
}

export default async function AdminDiscountsPage() {
  const discounts = await listDiscounts();

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Kody rabatowe</h1>

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[1fr_340px]">
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Kod</th>
                <th className="px-4 py-2 font-medium">Wartość</th>
                <th className="px-4 py-2 font-medium">Użycia</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {discounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Brak kodów.
                  </td>
                </tr>
              )}
              {discounts.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{d.code}</td>
                  <td className="px-4 py-2">{describeValue(d)}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {d.usageCount}
                    {d.usageLimit != null ? ` / ${d.usageLimit}` : ""}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={d.isActive ? "success" : "muted"}>
                      {d.isActive ? "aktywny" : "nieaktywny"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <form action={deleteDiscountAction}>
                      <input type="hidden" name="id" value={d.id} />
                      <button type="submit" className="text-xs text-destructive hover:underline">
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
          <h2 className="mb-3 text-lg font-medium">Nowy kod</h2>
          <DiscountForm />
        </div>
      </div>
    </div>
  );
}
