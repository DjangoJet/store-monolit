import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/session";
import { commit, release, reserve } from "@/modules/inventory/service";
import { getShippingMethod, resolveShippingPrice } from "@/modules/shipping/service";
import {
  sendOrderConfirmation,
  sendPaymentConfirmation,
} from "@/modules/notifications/service";
import { evaluateDiscount, recordDiscountUsage } from "@/modules/discounts/service";
import { getInvoiceSettings } from "@/modules/invoices/service";
import { computeOrderTax } from "./tax";
import type { CartView } from "@/modules/cart/service";
import type { CheckoutInput } from "@/modules/checkout/schemas";

async function nextOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.order.count();
  return `${year}-${String(count + 1).padStart(6, "0")}`;
}

export async function createOrderFromCart(cart: CartView, data: CheckoutInput) {
  const method = await getShippingMethod(data.shippingMethodId);
  if (!method) throw new Error("Nieprawidłowa metoda wysyłki");

  const subtotal = cart.subtotal;
  const user = await getCurrentUser();

  // Rabat (walidowany ponownie przy składaniu zamówienia).
  let discountAmount = 0;
  let freeShipping = false;
  let discountCode: string | null = null;
  if (cart.discountCode) {
    const ev = await evaluateDiscount(cart.discountCode, subtotal, user?.id);
    if (ev.ok) {
      discountAmount = ev.amount;
      freeShipping = ev.freeShipping;
      discountCode = cart.discountCode;
    }
  }

  const shipping = freeShipping ? 0 : resolveShippingPrice(method, subtotal);
  const total = subtotal - discountAmount + shipping;

  // VAT (stawka z produktu; 0 gdy sprzedawca zwolniony). Patrz modules/orders/tax.ts.
  const invoiceSettings = await getInvoiceSettings();
  const tax = await computeOrderTax({
    lines: cart.lines.map((l) => ({ variantId: l.variantId, gross: l.lineTotal })),
    subtotal,
    discountAmount,
    shippingAmount: shipping,
    vatExempt: invoiceSettings.vatExempt,
    shippingVatRate: invoiceSettings.vatRate,
  });

  const order = await prisma.order.create({
    data: {
      number: await nextOrderNumber(),
      userId: user?.id ?? null,
      email: data.email,
      currency: cart.currency,
      subtotalAmount: subtotal,
      discountAmount,
      shippingAmount: shipping,
      taxAmount: tax.totalTax,
      totalAmount: total,
      discountCode,
      shippingAddress: data.address,
      shippingMethod: method.name,
      shippingPickupPoint: data.pickupPointCode
        ? { code: data.pickupPointCode }
        : undefined,
      customerNote: data.customerNote,
      lines: {
        create: cart.lines.map((l) => ({
          variantId: l.variantId,
          productTitle: l.productTitle,
          variantTitle: l.variantTitle,
          unitAmount: l.unitAmount,
          quantity: l.quantity,
          totalAmount: l.lineTotal,
          vatRate: tax.byVariant.get(l.variantId)?.vatRate ?? 0,
          taxAmount: tax.byVariant.get(l.variantId)?.taxAmount ?? 0,
        })),
      },
      events: { create: { type: "created", message: "Zamówienie utworzone" } },
    },
    include: { lines: true },
  });

  await reserve(
    cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
  );

  if (discountCode) {
    await recordDiscountUsage(discountCode);
  }

  // Potwierdzenie zamówienia wysyłamy przy złożeniu (raz, niezależnie od płatności).
  await sendOrderConfirmation(order.id);

  return order;
}

function stockItemsFromOrder(lines: { variantId: string | null; quantity: number }[]) {
  return lines
    .filter((l): l is { variantId: string; quantity: number } => Boolean(l.variantId))
    .map((l) => ({ variantId: l.variantId, quantity: l.quantity }));
}

/** Płatność zaksięgowana (webhook): zdejmij stan, oznacz PAID/CONFIRMED. Idempotentne. */
export async function markOrderPaid(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lines: true },
  });
  if (!order || order.paymentStatus === "PAID") return;

  await commit(stockItemsFromOrder(order.lines));
  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "PAID",
      status: "CONFIRMED",
      placedAt: new Date(),
      events: { create: { type: "paid", message: "Płatność zaksięgowana" } },
    },
  });
  // Mail „płatność otrzymana" (potwierdzenie zamówienia poszło już przy złożeniu).
  await sendPaymentConfirmation(orderId);
}

/** Zamówienie przyjęte bez płatności online (np. płatność przy odbiorze). */
export async function confirmOrderUnpaid(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lines: true },
  });
  if (!order) return;

  await commit(stockItemsFromOrder(order.lines));
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "CONFIRMED",
      placedAt: new Date(),
      events: {
        create: { type: "confirmed", message: "Zamówienie przyjęte (płatność offline)" },
      },
    },
  });
  // Potwierdzenie zamówienia wysłano już przy złożeniu (createOrderFromCart).
}

/** Płatność nieudana/anulowana: zwolnij rezerwację. */
export async function markOrderFailed(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lines: true },
  });
  if (!order || order.paymentStatus === "PAID") return;

  await release(stockItemsFromOrder(order.lines));
  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "FAILED",
      events: { create: { type: "payment_failed", message: "Płatność nieudana" } },
    },
  });
}

export async function getOrderByNumber(number: string) {
  return prisma.order.findUnique({
    where: { number },
    include: { lines: true },
  });
}

/** Po zalogowaniu/rejestracji podpina zamówienia gościa złożone na ten sam email. */
export async function linkGuestOrders(userId: string, email: string) {
  await prisma.order.updateMany({
    where: { userId: null, email: { equals: email, mode: "insensitive" } },
    data: { userId },
  });
}

export async function listUserOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
