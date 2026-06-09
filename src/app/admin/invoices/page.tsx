import Link from "next/link";
import { listInvoices } from "@/modules/invoices/service";
import { formatMoney } from "@/lib/config";
import { Badge } from "@/components/ui/badge";

export default async function AdminInvoicesPage() {
  const invoices = await listInvoices();

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Faktury</h1>

      <div className="mt-6 overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Numer</th>
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium">Typ</th>
              <th className="px-4 py-2 font-medium">Kwota</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Brak faktur.
                </td>
              </tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2">
                  <Link href={`/admin/invoices/${inv.id}`} className="font-medium hover:underline">
                    {inv.number}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {inv.issueDate.toLocaleDateString("pl-PL")}
                </td>
                <td className="px-4 py-2">{inv.type === "VAT" ? "VAT" : "bez VAT"}</td>
                <td className="px-4 py-2">{formatMoney(inv.grossAmount, inv.currency)}</td>
                <td className="px-4 py-2">
                  <Badge variant={inv.status === "ISSUED" ? "success" : "outline"}>
                    {inv.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
