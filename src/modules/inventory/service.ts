import { prisma } from "@/lib/prisma";

export interface StockItem {
  variantId: string;
  quantity: number;
}

/** Rzucany, gdy rezerwacja przekracza dostępny stan (checkout pokazuje to klientowi). */
export class OutOfStockError extends Error {
  constructor(public readonly variantId: string) {
    super("Niewystarczający stan magazynowy");
    this.name = "OutOfStockError";
  }
}

/**
 * Rezerwuje stan (po złożeniu zamówienia, przed opłaceniem). Warunek dostępności
 * jest w UPDATE (atomowo) — dwa równoległe zamówienia nie zarezerwują ostatniej
 * sztuki podwójnie. Backorder/wyłączone śledzenie przechodzą bez limitu; brak
 * wiersza magazynu = wariant nieśledzony (jak dotąd: no-op).
 */
export async function reserve(items: StockItem[]) {
  await prisma.$transaction(async (tx) => {
    for (const it of items) {
      const updated = await tx.$executeRaw`
        UPDATE "InventoryItem"
        SET "reserved" = "reserved" + ${it.quantity}
        WHERE "variantId" = ${it.variantId}
          AND ("trackInventory" = false
            OR "allowBackorder" = true
            OR "quantity" - "reserved" >= ${it.quantity})`;
      if (updated === 0) {
        const exists = await tx.inventoryItem.findUnique({
          where: { variantId: it.variantId },
          select: { id: true },
        });
        // Wiersz istnieje, ale warunek dostępności nie przeszedł → brak stanu.
        if (exists) throw new OutOfStockError(it.variantId);
      }
    }
  });
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
