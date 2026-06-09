import { emailLayout, type EmailBranding } from "./layout";

interface ShipmentData {
  carrier: string | null;
  provider: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
}

export function shipmentEmail(
  orderNumber: string,
  shipment: ShipmentData,
  branding: EmailBranding,
) {
  const tracking = shipment.trackingNumber
    ? `<p>Numer śledzenia: <strong>${shipment.trackingNumber}</strong>${
        shipment.trackingUrl ? ` — <a href="${shipment.trackingUrl}">śledź przesyłkę</a>` : ""
      }</p>`
    : "";
  const content = `
    <p>Twoje zamówienie <strong>${orderNumber}</strong> zostało wysłane (${shipment.carrier ?? shipment.provider}).</p>
    ${tracking}`;
  return {
    subject: `Zamówienie ${orderNumber} zostało wysłane`,
    html: emailLayout(branding, content),
  };
}
