import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  confirmOrderUnpaid,
  markOrderFailed,
  markOrderPaid,
} from "@/modules/orders/service";
import { sendRefundNotification } from "@/modules/notifications/service";
import { getDefaultProviderId, getPaymentProvider } from "./registry";

export interface CreatePaymentResultView {
  redirectUrl?: string;
  providerId: string;
}

/** Tworzy płatność dla zamówienia wybranym providerem; zwraca dokąd przekierować klienta. */
export async function createPaymentForOrder(order: {
  id: string;
  number: string;
  publicToken: string;
  totalAmount: number;
  currency: string;
  email: string;
}): Promise<CreatePaymentResultView> {
  const providerId = getDefaultProviderId();
  const provider = getPaymentProvider(providerId);

  const result = await provider.createPayment({
    order: {
      id: order.id,
      number: order.number,
      publicToken: order.publicToken,
      amount: order.totalAmount,
      currency: order.currency,
      email: order.email,
    },
    returnUrl: `${env.APP_URL}/checkout/success`,
  });

  await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: providerId,
      providerRef: result.providerRef,
      status: "UNPAID",
      amount: order.totalAmount,
      currency: order.currency,
    },
  });

  // Manual = brak płatności online → od razu potwierdzamy zamówienie.
  if (providerId === "manual") {
    await confirmOrderUnpaid(order.id);
  }

  return { redirectUrl: result.redirectUrl, providerId };
}

/** Zwrot środków (pełny lub częściowy). Działa dla Stripe i manual (manual = tylko zapis). */
export async function refundPayment(paymentId: string, amount?: number) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { refunds: true },
  });
  if (!payment) throw new Error("Płatność nie istnieje");

  const provider = getPaymentProvider(payment.provider);
  const alreadyRefunded = payment.refunds.reduce((s, r) => s + r.amount, 0);
  const remaining = payment.amount - alreadyRefunded;
  const refundAmount = amount ?? remaining;
  // Twardy limit po stronie aplikacji — Stripe by odrzucił, ale provider `manual`
  // zapisałby dowolną kwotę.
  if (refundAmount <= 0 || refundAmount > remaining) {
    throw new Error(
      `Kwota zwrotu przekracza pozostałą do zwrotu kwotę (${(remaining / 100).toFixed(2)} ${payment.currency})`,
    );
  }

  let providerRef: string | undefined;
  if (payment.providerRef && provider.refund) {
    const r = await provider.refund({
      providerRef: payment.providerRef,
      amount: refundAmount,
    });
    providerRef = r.providerRef;
  }

  await prisma.refund.create({
    data: { paymentId, amount: refundAmount, providerRef },
  });

  const totalRefunded = alreadyRefunded + refundAmount;
  const status = totalRefunded >= payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";

  await prisma.payment.update({ where: { id: paymentId }, data: { status } });
  await prisma.order.update({
    where: { id: payment.orderId },
    data: {
      paymentStatus: status,
      events: {
        create: {
          type: "refund",
          message: `Zwrot ${(refundAmount / 100).toFixed(2)} ${payment.currency}`,
        },
      },
    },
  });

  await sendRefundNotification(payment.orderId, refundAmount);
}

/** Obsługa webhooka bramki: aktualizuje Payment i status zamówienia. Idempotentne. */
export async function handleWebhook(providerId: string, req: Request) {
  const provider = getPaymentProvider(providerId);
  if (!provider.parseWebhook) {
    throw new Error(`Provider ${providerId} nie obsługuje webhooków.`);
  }

  const event = await provider.parseWebhook(req);
  if (!event.providerRef) return;

  const payment = await prisma.payment.findFirst({
    where: { providerRef: event.providerRef },
  });
  if (!payment) return;

  if (event.type === "paid") {
    // Kwota/waluta z bramki musi zgadzać się z płatnością — rozjazd nie może
    // po cichu zaksięgować zamówienia (zostaje UNPAID do ręcznej weryfikacji).
    if (
      event.amount !== payment.amount ||
      event.currency.toUpperCase() !== payment.currency.toUpperCase()
    ) {
      console.error(
        `Webhook ${providerId}: kwota ${event.amount} ${event.currency} niezgodna z płatnością ` +
          `${payment.amount} ${payment.currency} (payment ${payment.id})`,
      );
      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          events: {
            create: {
              type: "payment_mismatch",
              message: `Webhook zgłosił ${(event.amount / 100).toFixed(2)} ${event.currency}, oczekiwano ${(payment.amount / 100).toFixed(2)} ${payment.currency} — wymaga ręcznej weryfikacji`,
            },
          },
        },
      });
      return;
    }
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "PAID" },
    });
    await markOrderPaid(payment.orderId);
  } else if (event.type === "failed") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });
    await markOrderFailed(payment.orderId);
  }
}
