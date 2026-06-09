import { prisma } from "@/lib/prisma";

async function getStats() {
  const [products, orders, customers] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.order.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
  ]);
  return { products, orders, customers };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    { label: "Produkty", value: stats.products },
    { label: "Zamówienia", value: stats.orders },
    { label: "Klienci", value: stats.customers },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Faza 1 — Auth & RBAC gotowe. Kolejne ekrany wg docs/02-admin-panel.md.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-3xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
