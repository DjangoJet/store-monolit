import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getCarrierProvider } from "./registry";
import { sendShipmentNotification } from "@/modules/notifications/service";
import type { AddressLike, Parcel } from "./types";

/** Buduje paczki z pozycji zamówienia (wymiary/waga z wariantów; domyślne, gdy brak). */
async function buildParcelsFromOrder(orderId: string): Promise<Parcel[]> {
  const lines = await prisma.orderLine.findMany({
    where: { orderId },
    include: { variant: true },
  });
  const parcels: Parcel[] = [];
  for (const line of lines) {
    const v = line.variant;
    const parcel: Parcel = {
      weightGrams: v?.weightGrams ?? 1000,
      lengthMm: v?.lengthMm ?? undefined,
      widthMm: v?.widthMm ?? undefined,
      heightMm: v?.heightMm ?? undefined,
    };
    for (let i = 0; i < line.quantity; i++) parcels.push({ ...parcel });
  }
  return parcels.length ? parcels : [{ weightGrams: 1000 }];
}

export interface CreateShipmentInput {
  provider: string; // "manual" | "furgonetka"
  serviceCode?: string;
  carrier?: string; // dla manual
  trackingNumber?: string;
  trackingUrl?: string;
  costAmount?: number; // grosze — faktyczny koszt przewoźnika
  parcels?: Parcel[];
}

export async function createShipment(orderId: string, input: CreateShipmentInput) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Zamówienie nie istnieje");

  let carrier = input.carrier ?? "manual";
  let trackingNumber = input.trackingNumber;
  let trackingUrl = input.trackingUrl;
  let labelUrl: string | undefined;
  let providerRef: string | undefined;

  // Dla brokera (Furgonetka) tworzymy przesyłkę przez adapter; manual = dane od admina.
  if (input.provider !== "manual") {
    const provider = getCarrierProvider(input.provider);
    const parcels = input.parcels ?? (await buildParcelsFromOrder(orderId));
    const res = await provider.createShipment({
      order: {
        id: order.id,
        number: order.number,
        email: order.email,
        shippingAddress:
          (order.shippingAddress as unknown as AddressLike) ?? {
            line1: "",
            city: "",
            postalCode: "",
            country: "PL",
          },
      },
      serviceCode: input.serviceCode ?? "",
      parcels,
    });
    carrier = res.carrier;
    trackingNumber = res.trackingNumber;
    trackingUrl = res.trackingUrl;
    labelUrl = res.labelUrl;
    providerRef = res.providerRef;
  }

  const shipment = await prisma.shipment.create({
    data: {
      orderId,
      provider: input.provider,
      carrier,
      serviceCode: input.serviceCode,
      providerRef,
      status: "LABEL_READY",
      trackingNumber,
      trackingUrl,
      labelUrl,
      costAmount: input.costAmount,
      costCurrency: input.costAmount ? order.currency : null,
      parcels: input.parcels
        ? (input.parcels as unknown as Prisma.InputJsonValue)
        : undefined,
      shippedAt: new Date(),
    },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      fulfillmentStatus: "FULFILLED",
      events: {
        create: {
          type: "shipment_created",
          message: `Przesyłka (${input.provider})${
            trackingNumber ? ` #${trackingNumber}` : ""
          }`,
        },
      },
    },
  });

  await sendShipmentNotification(orderId, shipment.id);

  return shipment;
}
