import { prisma } from "@/lib/prisma";

/** Aktywne metody wysyłki do wyboru w checkoucie. */
export async function listActiveShippingMethods() {
  return prisma.shippingMethod.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
  });
}

export async function getShippingMethod(id: string) {
  return prisma.shippingMethod.findUnique({ where: { id } });
}

/** Cena wysyłki dla klienta (stała; darmowa powyżej progu). Patrz docs/04-adapters.md. */
export function resolveShippingPrice(
  method: { priceAmount: number; freeOver: number | null },
  subtotal: number,
): number {
  if (method.freeOver !== null && subtotal >= method.freeOver) return 0;
  return method.priceAmount;
}
