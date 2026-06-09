import { prisma } from "@/lib/prisma";
import type { CarrierService } from "./types";
import { availableCarriers, getCarrierProvider } from "./registry";

/** Aktywne metody wysyłki do wyboru w checkoucie. */
export async function listActiveShippingMethods() {
  return prisma.shippingMethod.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
  });
}

// --- Panel wysyłki (admin) ---

/** Strefy wraz z metodami — widok listy w panelu. */
export async function listZonesWithMethods() {
  return prisma.shippingZone.findMany({
    include: { methods: { orderBy: { position: "asc" } } },
    orderBy: { name: "asc" },
  });
}

/** Zarejestrowani przewoźnicy (manual zawsze; furgonetka gdy skonfigurowana). */
export function availableShippingProviders(): string[] {
  return availableCarriers();
}

/**
 * Usługi danego przewoźnika do wyboru przy tworzeniu metody. Pusta lista, gdy
 * przewoźnik nie wspiera listowania (np. manual) lub gdy API zawiedzie (best-effort).
 */
export async function listProviderServices(providerId: string): Promise<CarrierService[]> {
  let provider;
  try {
    provider = getCarrierProvider(providerId);
  } catch {
    return [];
  }
  if (!provider.listServices) return [];
  try {
    return await provider.listServices();
  } catch {
    return [];
  }
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
