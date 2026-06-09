// Kontrakt adaptera przewoźnika (patrz docs/04-adapters.md).
// Klient płaci stałą cenę metody; getRates() używany TYLKO po stronie admina
// do podglądu faktycznego kosztu przy realizacji.

export interface Parcel {
  weightGrams: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
}

export interface AddressLike {
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
}

export interface PickupPoint {
  code: string;
  name: string;
  carrier: string;
  address: string;
  lat?: number;
  lng?: number;
}

export interface CarrierRate {
  serviceCode: string;
  carrier: string;
  amount: number; // grosze
  currency: string;
  eta?: { minDays?: number; maxDays?: number };
}

export interface ShipmentResult {
  providerRef: string;
  carrier: string;
  trackingNumber?: string;
  trackingUrl?: string;
  labelUrl?: string;
}

export interface TrackingStatus {
  status: string;
  trackingNumber: string;
  updatedAt: Date;
}

export interface TrackingEvent {
  providerRef: string;
  status: string;
  raw: unknown;
}

export interface OrderForShipment {
  id: string;
  number: string;
  email: string;
  shippingAddress: AddressLike;
}

export interface CarrierService {
  id: number;
  service: string;
  name: string;
}

export interface CarrierProvider {
  readonly id: string;

  /** Usługi przewoźnika dostępne na koncie (admin: wybór przy tworzeniu metody wysyłki). */
  listServices?(): Promise<CarrierService[]>;

  /** Faktyczny koszt — używane po stronie admina, nie w checkoucie. */
  getRates(input: {
    parcels: Parcel[];
    destination: AddressLike;
    declaredValue: number;
    serviceCode?: string;
  }): Promise<CarrierRate[]>;

  createShipment(input: {
    order: OrderForShipment;
    serviceCode: string;
    pickupPoint?: PickupPoint;
    parcels: Parcel[];
  }): Promise<ShipmentResult>;

  getTracking(trackingNumber: string): Promise<TrackingStatus>;

  getPickupPoints?(q: {
    lat?: number;
    lng?: number;
    postalCode?: string;
    query?: string;
  }): Promise<PickupPoint[]>;

  parseWebhook?(req: Request): Promise<TrackingEvent>;

  cancelShipment?(providerRef: string): Promise<void>;
}
