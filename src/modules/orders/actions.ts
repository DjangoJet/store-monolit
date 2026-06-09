"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/session";
import { toMinor } from "@/lib/utils";
import type { OrderStatus } from "@/generated/prisma/enums";
import { addOrderNote, cancelOrder, changeOrderStatus } from "./admin";
import { markOrderPaid } from "./service";
import { sendOrderConfirmation } from "@/modules/notifications/service";
import { createShipment } from "@/modules/shipping/shipment-service";
import { refundPayment } from "@/modules/payments/service";

function refresh(orderId: string) {
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function updateOrderStatusAction(formData: FormData) {
  const admin = await requireRole("STAFF");
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as OrderStatus;
  await changeOrderStatus(id, status, admin.id);
  refresh(id);
}

export async function markOrderPaidAction(formData: FormData) {
  await requireRole("STAFF");
  const id = String(formData.get("id"));
  await markOrderPaid(id);
  refresh(id);
}

export async function cancelOrderAction(formData: FormData) {
  const admin = await requireRole("STAFF");
  const id = String(formData.get("id"));
  await cancelOrder(id, admin.id);
  refresh(id);
}

export async function addOrderNoteAction(formData: FormData) {
  const admin = await requireRole("STAFF");
  const id = String(formData.get("id"));
  const message = String(formData.get("message") ?? "").trim();
  if (message) await addOrderNote(id, message, admin.id);
  refresh(id);
}

export async function resendConfirmationAction(formData: FormData) {
  await requireRole("STAFF");
  const id = String(formData.get("id"));
  await sendOrderConfirmation(id);
  refresh(id);
}

export async function createShipmentAction(formData: FormData) {
  await requireRole("STAFF");
  const orderId = String(formData.get("orderId"));
  const provider = String(formData.get("provider") || "manual");
  const cost = formData.get("cost") ? toMinor(String(formData.get("cost"))) : undefined;

  await createShipment(orderId, {
    provider,
    carrier: formData.get("carrier") ? String(formData.get("carrier")) : undefined,
    serviceCode: formData.get("serviceCode")
      ? String(formData.get("serviceCode"))
      : undefined,
    trackingNumber: formData.get("trackingNumber")
      ? String(formData.get("trackingNumber"))
      : undefined,
    trackingUrl: formData.get("trackingUrl")
      ? String(formData.get("trackingUrl"))
      : undefined,
    costAmount: cost,
  });
  refresh(orderId);
}

export async function refundOrderAction(formData: FormData) {
  await requireRole("STAFF");
  const orderId = String(formData.get("orderId"));
  const paymentId = String(formData.get("paymentId"));
  const amount = formData.get("amount")
    ? toMinor(String(formData.get("amount")))
    : undefined;
  await refundPayment(paymentId, amount);
  refresh(orderId);
}
