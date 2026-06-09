import { env } from "@/lib/env";
import type {
  AddressLike,
  CarrierProvider,
  CarrierRate,
  Parcel,
  PickupPoint,
  ShipmentResult,
  TrackingStatus,
} from "../../types";
import { FurgonetkaClient } from "./client";
import type { FurgonetkaAddress, FurgonetkaParcel } from "./types";

const DEFAULT_PARCEL: FurgonetkaParcel = { width: 10, height: 10, depth: 10, weight: 1 };

function toFgParcel(p: Parcel): FurgonetkaParcel {
  return {
    width: p.widthMm ? Math.max(1, Math.round(p.widthMm / 10)) : DEFAULT_PARCEL.width,
    height: p.heightMm ? Math.max(1, Math.round(p.heightMm / 10)) : DEFAULT_PARCEL.height,
    depth: p.lengthMm ? Math.max(1, Math.round(p.lengthMm / 10)) : DEFAULT_PARCEL.depth,
    weight: p.weightGrams ? Math.max(0.01, p.weightGrams / 1000) : DEFAULT_PARCEL.weight,
  };
}

function toFgAddress(
  a: AddressLike,
  contact?: { name?: string; email?: string; phone?: string },
  point?: string,
): FurgonetkaAddress {
  const name =
    [a.firstName, a.lastName].filter(Boolean).join(" ").trim() || contact?.name;
  const street = [a.line1, a.line2].filter(Boolean).join(" ").trim();
  return {
    name,
    company: a.company || undefined,
    street,
    postcode: a.postalCode,
    city: a.city,
    country_code: (a.country || "PL").toUpperCase(),
    email: contact?.email,
    phone: a.phone || contact?.phone,
    ...(point ? { point } : {}),
  };
}

interface ServicesPriceRow {
  service_id: number;
  service?: string;
  available?: boolean;
  pricing?: { price_gross?: number };
  courier_details?: { avg_delivery_time?: number };
}

/** Adapter Furgonetki (broker) na bazie sprawdzonego klienta REST. */
export class FurgonetkaProvider implements CarrierProvider {
  readonly id = "furgonetka";
  private client: FurgonetkaClient;
  private sender: FurgonetkaAddress;

  constructor() {
    this.client = new FurgonetkaClient({
      clientId: env.FURGONETKA_CLIENT_ID!,
      clientSecret: env.FURGONETKA_CLIENT_SECRET!,
      username: env.FURGONETKA_USERNAME!,
      password: env.FURGONETKA_PASSWORD!,
      sandbox: env.FURGONETKA_SANDBOX,
    });
    this.sender = {
      name: env.FURGONETKA_SENDER_NAME ?? "Sklep",
      street: env.FURGONETKA_SENDER_STREET ?? "",
      postcode: env.FURGONETKA_SENDER_POSTCODE ?? "",
      city: env.FURGONETKA_SENDER_CITY ?? "",
      country_code: "PL",
      email: env.FURGONETKA_SENDER_EMAIL,
      phone: env.FURGONETKA_SENDER_PHONE,
    };
  }

  /** Lista usług konta (id = service_id, service = slug przewoźnika). Dla admina. */
  listServices() {
    return this.client.getServices();
  }

  async getRates(input: {
    parcels: Parcel[];
    destination: AddressLike;
    declaredValue: number;
    serviceCode?: string;
  }): Promise<CarrierRate[]> {
    const services = await this.client.getServices();
    const ids = input.serviceCode
      ? [Number(input.serviceCode)]
      : services.map((s) => s.id);

    const parcels = input.parcels.length
      ? input.parcels.map(toFgParcel)
      : [DEFAULT_PARCEL];

    const res = (await this.client.calculatePrice({
      package: {
        receiver: toFgAddress(input.destination),
        sender: this.sender,
        parcels,
        type: "package",
      },
      services: { service_id: ids },
    })) as { services_prices?: ServicesPriceRow[] };

    const rows = res.services_prices ?? [];
    return rows
      .filter((r) => r.available !== false && r.pricing?.price_gross != null)
      .map((r) => {
        const svc = services.find((s) => s.id === r.service_id);
        const days = r.courier_details?.avg_delivery_time;
        return {
          serviceCode: String(r.service_id),
          carrier: r.service ?? svc?.service ?? "furgonetka",
          amount: Math.round(Number(r.pricing!.price_gross) * 100),
          currency: "PLN",
          eta: days ? { maxDays: Math.max(1, Math.ceil(days / 1440)) } : undefined,
        } satisfies CarrierRate;
      });
  }

  async createShipment(input: {
    order: { id: string; number: string; email: string; shippingAddress: AddressLike };
    serviceCode: string;
    pickupPoint?: PickupPoint;
    parcels: Parcel[];
  }): Promise<ShipmentResult> {
    const serviceId = Number(input.serviceCode);
    if (!serviceId) throw new Error("Furgonetka: brak numerycznego service_id");

    const services = await this.client.getServices();
    const svc = services.find((s) => s.id === serviceId);

    const receiver = toFgAddress(
      input.order.shippingAddress,
      { name: input.order.email, email: input.order.email },
      input.pickupPoint?.code,
    );
    const parcels = input.parcels.length
      ? input.parcels.map(toFgParcel)
      : [DEFAULT_PARCEL];

    const created = await this.client.createPackage({
      service_id: serviceId,
      type: "package",
      pickup: this.sender,
      sender: this.sender,
      receiver,
      parcels,
      user_reference_number: input.order.number,
    });
    const packageId = created.package_id;
    if (!packageId) throw new Error("Furgonetka: brak package_id w odpowiedzi");

    // Akceptacja regulaminu przewoźnika (inaczej nadanie zwraca 409).
    if (svc?.service) {
      try {
        await this.client.acceptPendingRegulations([svc.service]);
      } catch {
        // best-effort
      }
    }

    await this.client.orderAndWait([packageId]);

    let labelUrl: string | undefined;
    try {
      const doc = await this.client.generateDocuments([packageId], ["labels"]);
      labelUrl = doc.url;
    } catch {
      // etykieta może być jeszcze niegotowa — można pobrać później
    }

    return {
      providerRef: String(packageId),
      carrier: svc?.service ?? "furgonetka",
      labelUrl,
    };
  }

  async getTracking(trackingNumber: string): Promise<TrackingStatus> {
    const data = (await this.client.getTracking(trackingNumber)) as {
      status?: string;
      tracking?: { status?: string }[];
    };
    const status =
      data?.status ?? data?.tracking?.[data.tracking.length - 1]?.status ?? "unknown";
    return { status, trackingNumber, updatedAt: new Date() };
  }

  async getPickupPoints(q: {
    lat?: number;
    lng?: number;
    postalCode?: string;
    query?: string;
  }): Promise<PickupPoint[]> {
    const location: Record<string, unknown> = {};
    if (q.lat != null && q.lng != null) location.coordinates = { lat: q.lat, lng: q.lng };
    if (q.postalCode) location.postcode = q.postalCode;
    if (q.query) location.search_phrase = q.query;

    const points = (await this.client.getPoints(location)) as Array<{
      code?: string;
      name?: string;
      type?: string;
      service?: string;
      address?: { line?: string; city?: string };
      latitude?: number;
      longitude?: number;
    }>;

    return points.slice(0, 50).map((p) => ({
      code: p.code ?? "",
      name: p.name ?? p.code ?? "",
      carrier: p.service ?? p.type ?? "furgonetka",
      address: [p.address?.line, p.address?.city].filter(Boolean).join(", "),
      lat: p.latitude,
      lng: p.longitude,
    }));
  }
}
