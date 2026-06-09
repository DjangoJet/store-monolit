import Link from "next/link";
import { requireRole } from "@/server/session";
import { requireFeature } from "@/server/feature";
import { getInvoiceSettings } from "@/modules/invoices/service";
import { InvoiceSettingsForm } from "./settings-form";

export default async function InvoiceSettingsPage() {
  requireFeature("invoices");
  await requireRole("ADMIN");
  const settings = await getInvoiceSettings();

  return (
    <div>
      <Link href="/admin/settings" className="text-sm text-muted-foreground hover:underline">
        ← Ustawienia
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Faktury — dane sprzedawcy</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Status VAT decyduje o typie faktury (VAT vs bez VAT).
      </p>
      <div className="mt-6">
        <InvoiceSettingsForm settings={settings} />
      </div>
    </div>
  );
}
