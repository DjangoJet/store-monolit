"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/session";
import { toMinor } from "@/lib/utils";
import { toFieldErrors } from "@/lib/forms";
import { shippingMethodSchema, shippingZoneSchema } from "./schemas";

export type ShippingState =
  | { error?: string; success?: string; fieldErrors?: Record<string, string> }
  | undefined;

function num(v: FormDataEntryValue | null): string | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? undefined : s;
}

export async function createZoneAction(
  _prev: ShippingState,
  formData: FormData,
): Promise<ShippingState> {
  await requireRole("STAFF");
  const parsed = shippingZoneSchema.safeParse({
    name: formData.get("name"),
    countries: formData.get("countries"),
  });
  if (!parsed.success) {
    return { error: "Sprawdź dane.", fieldErrors: toFieldErrors(parsed.error) };
  }
  await prisma.shippingZone.create({
    data: { name: parsed.data.name, countries: parsed.data.countries },
  });
  revalidatePath("/admin/shipping");
  return { success: "Dodano strefę." };
}

export async function deleteZoneAction(formData: FormData) {
  await requireRole("STAFF");
  const id = String(formData.get("id"));
  // onDelete: Cascade na metodach — usuwają się razem ze strefą.
  await prisma.shippingZone.delete({ where: { id } });
  revalidatePath("/admin/shipping");
}

export async function createMethodAction(
  _prev: ShippingState,
  formData: FormData,
): Promise<ShippingState> {
  await requireRole("STAFF");
  const parsed = shippingMethodSchema.safeParse({
    zoneId: formData.get("zoneId"),
    name: formData.get("name"),
    provider: formData.get("provider"),
    serviceCode: num(formData.get("serviceCode")),
    price: formData.get("price"),
    freeOver: num(formData.get("freeOver")),
    requiresPickupPoint: formData.get("requiresPickupPoint") === "on",
    minDays: num(formData.get("minDays")),
    maxDays: num(formData.get("maxDays")),
    isActive: true,
  });
  if (!parsed.success) {
    return { error: "Sprawdź dane.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const d = parsed.data;

  // Duplikat = ta sama usługa w strefie dla tego samego typu dostawy (kurier vs punkt).
  // Dotyczy tylko metod integrowanych (serviceCode != null); manual nie ograniczamy.
  if (d.serviceCode) {
    const dup = await prisma.shippingMethod.findFirst({
      where: {
        zoneId: d.zoneId,
        serviceCode: d.serviceCode,
        requiresPickupPoint: d.requiresPickupPoint,
      },
    });
    if (dup) {
      return {
        fieldErrors: {
          serviceCode: `Ta usługa (${d.requiresPickupPoint ? "punkt odbioru" : "kurier"}) jest już dodana w tej strefie.`,
        },
      };
    }
  }

  await prisma.shippingMethod.create({
    data: {
      zoneId: d.zoneId,
      name: d.name,
      provider: d.provider,
      serviceCode: d.serviceCode ?? null,
      priceAmount: toMinor(d.price),
      freeOver: d.freeOver != null ? toMinor(d.freeOver) : null,
      requiresPickupPoint: d.requiresPickupPoint,
      minDays: d.minDays ?? null,
      maxDays: d.maxDays ?? null,
      isActive: d.isActive,
    },
  });
  revalidatePath("/admin/shipping");
  return { success: "Dodano metodę wysyłki." };
}

export async function updateMethodAction(
  _prev: ShippingState,
  formData: FormData,
): Promise<ShippingState> {
  await requireRole("STAFF");
  const id = String(formData.get("id"));
  const existing = await prisma.shippingMethod.findUnique({ where: { id } });
  if (!existing) return { error: "Metoda nie istnieje." };

  const parsed = shippingMethodSchema.safeParse({
    zoneId: existing.zoneId, // strefy nie zmieniamy w edycji (przenosiny = usuń+dodaj)
    name: formData.get("name"),
    provider: formData.get("provider"),
    serviceCode: num(formData.get("serviceCode")),
    price: formData.get("price"),
    freeOver: num(formData.get("freeOver")),
    requiresPickupPoint: formData.get("requiresPickupPoint") === "on",
    minDays: num(formData.get("minDays")),
    maxDays: num(formData.get("maxDays")),
    isActive: existing.isActive,
  });
  if (!parsed.success) {
    return { error: "Sprawdź dane.", fieldErrors: toFieldErrors(parsed.error) };
  }
  const d = parsed.data;

  // Dedup: ta sama usługa + typ dostawy w strefie, ale pomijamy edytowany rekord.
  if (d.serviceCode) {
    const dup = await prisma.shippingMethod.findFirst({
      where: {
        zoneId: d.zoneId,
        serviceCode: d.serviceCode,
        requiresPickupPoint: d.requiresPickupPoint,
        id: { not: id },
      },
    });
    if (dup) {
      return {
        fieldErrors: {
          serviceCode: `Ta usługa (${d.requiresPickupPoint ? "punkt odbioru" : "kurier"}) jest już dodana w tej strefie.`,
        },
      };
    }
  }

  await prisma.shippingMethod.update({
    where: { id },
    data: {
      name: d.name,
      provider: d.provider,
      serviceCode: d.serviceCode ?? null,
      priceAmount: toMinor(d.price),
      freeOver: d.freeOver != null ? toMinor(d.freeOver) : null,
      requiresPickupPoint: d.requiresPickupPoint,
      minDays: d.minDays ?? null,
      maxDays: d.maxDays ?? null,
    },
  });
  revalidatePath("/admin/shipping");
  return { success: "Zapisano zmiany." };
}

export async function toggleMethodAction(formData: FormData) {
  await requireRole("STAFF");
  const id = String(formData.get("id"));
  const method = await prisma.shippingMethod.findUnique({ where: { id } });
  if (method) {
    await prisma.shippingMethod.update({
      where: { id },
      data: { isActive: !method.isActive },
    });
  }
  revalidatePath("/admin/shipping");
}

export async function deleteMethodAction(formData: FormData) {
  await requireRole("STAFF");
  const id = String(formData.get("id"));
  await prisma.shippingMethod.delete({ where: { id } });
  revalidatePath("/admin/shipping");
}
