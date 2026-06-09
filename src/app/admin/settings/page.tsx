import Link from "next/link";
import { requireRole } from "@/server/session";

export default async function AdminSettingsPage() {
  await requireRole("ADMIN");

  const sections = [{ href: "/admin/settings/invoices", label: "Faktury", desc: "Dane sprzedawcy, status VAT, numeracja" }];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Ustawienia</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="rounded-lg border p-4 hover:bg-accent">
            <p className="font-medium">{s.label}</p>
            <p className="text-sm text-muted-foreground">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
