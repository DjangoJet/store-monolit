import type { CarrierProvider } from "../types";

/**
 * Ręczna obsługa wysyłki — admin sam wpisuje przewoźnika i numer śledzenia.
 * Pozwala realizować zamówienia bez integracji z brokerem.
 */
export class ManualCarrierProvider implements CarrierProvider {
  readonly id = "manual";

  async getRates() {
    return [];
  }

  async createShipment() {
    return { providerRef: `manual_${Date.now()}`, carrier: "manual" };
  }

  async getTracking(trackingNumber: string) {
    return { status: "unknown", trackingNumber, updatedAt: new Date() };
  }
}
