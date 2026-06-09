import { prisma } from "@/lib/prisma";

export interface StockItem {
  variantId: string;
  quantity: number;
}

/** Rezerwuje stan (np. po złożeniu zamówienia, przed opłaceniem). */
export async function reserve(items: StockItem[]) {
  await prisma.$transaction(
    items.map((it) =>
      prisma.inventoryItem.updateMany({
        where: { variantId: it.variantId },
        data: { reserved: { increment: it.quantity } },
      }),
    ),
  );
}

/** Finalizuje sprzedaż: zdejmuje ze stanu i z rezerwacji (po opłaceniu/potwierdzeniu). */
export async function commit(items: StockItem[]) {
  await prisma.$transaction(
    items.map((it) =>
      prisma.inventoryItem.updateMany({
        where: { variantId: it.variantId },
        data: {
          quantity: { decrement: it.quantity },
          reserved: { decrement: it.quantity },
        },
      }),
    ),
  );
}

/** Zwalnia rezerwację (np. po nieudanej/anulowanej płatności). */
export async function release(items: StockItem[]) {
  await prisma.$transaction(
    items.map((it) =>
      prisma.inventoryItem.updateMany({
        where: { variantId: it.variantId },
        data: { reserved: { decrement: it.quantity } },
      }),
    ),
  );
}
