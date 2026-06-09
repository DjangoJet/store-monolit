import { prisma } from "@/lib/prisma";
import { storeConfig } from "@/lib/config";
import { getEmailAdapter } from "./index";
import type { EmailBranding } from "./templates/layout";
import { orderConfirmationEmail } from "./templates/order-confirmation";
import { paymentConfirmationEmail } from "./templates/payment-confirmation";
import { refundEmail } from "./templates/refund";
import { cancellationEmail } from "./templates/cancellation";
import { welcomeEmail } from "./templates/welcome";
import { passwordResetEmail } from "./templates/password-reset";
import { shipmentEmail } from "./templates/shipment";

async function getBranding(): Promise<EmailBranding> {
  const row = await prisma.setting.findUnique({ where: { key: "store.name" } });
  const storeName = typeof row?.value === "string" ? row.value : "Sklep";
  return { storeName, appUrl: storeConfig.appUrl };
}

/** Wszystkie wysyłki best-effort: błąd maila nigdy nie blokuje przepływu. */
async function safeSend(to: string, mail: { subject: string; html: string }) {
  try {
    await getEmailAdapter().send({ to, subject: mail.subject, html: mail.html });
  } catch (err) {
    console.error("Wysyłka e-mail nie powiodła się:", err);
  }
}

export async function sendOrderConfirmation(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lines: true },
  });
  if (!order) return;
  const branding = await getBranding();
  await safeSend(order.email, orderConfirmationEmail(order, branding));
}

export async function sendPaymentConfirmation(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  const branding = await getBranding();
  await safeSend(order.email, paymentConfirmationEmail(order, branding));
}

export async function sendRefundNotification(orderId: string, amount: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  const branding = await getBranding();
  await safeSend(order.email, refundEmail(order.number, amount, order.currency, branding));
}

export async function sendOrderCancellation(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  const branding = await getBranding();
  await safeSend(order.email, cancellationEmail(order.number, branding));
}

export async function sendWelcome(email: string, name: string | null) {
  const branding = await getBranding();
  await safeSend(email, welcomeEmail(name, branding));
}

export async function sendPasswordReset(email: string, resetUrl: string) {
  const branding = await getBranding();
  await safeSend(email, passwordResetEmail(resetUrl, branding));
}

export async function sendShipmentNotification(orderId: string, shipmentId: string) {
  const [order, shipment] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId } }),
    prisma.shipment.findUnique({ where: { id: shipmentId } }),
  ]);
  if (!order || !shipment) return;
  const branding = await getBranding();
  await safeSend(order.email, shipmentEmail(order.number, shipment, branding));
}
