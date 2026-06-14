import Stripe from "stripe";
import { env } from "@/lib/env";
import type { PaymentEvent, PaymentProvider } from "../types";

/** Stripe przez Checkout Sessions (hosted) — bez SDK po stronie klienta, redirect + webhook. */
export class StripePaymentProvider implements PaymentProvider {
  readonly id = "stripe";
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY!);
  }

  async createPayment({
    order,
    returnUrl,
  }: {
    order: {
      id: string;
      number: string;
      publicToken: string;
      amount: number;
      currency: string;
      email: string;
    };
    returnUrl: string;
  }) {
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: order.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: order.currency.toLowerCase(),
            unit_amount: order.amount,
            product_data: { name: `Zamówienie ${order.number}` },
          },
        },
      ],
      success_url: `${returnUrl}?order=${encodeURIComponent(order.publicToken)}`,
      cancel_url: `${env.APP_URL}/checkout?canceled=1`,
      metadata: { orderId: order.id, orderNumber: order.number },
      payment_intent_data: { metadata: { orderId: order.id } },
    });

    return { providerRef: session.id, redirectUrl: session.url ?? undefined };
  }

  async parseWebhook(req: Request): Promise<PaymentEvent> {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    const event = this.stripe.webhooks.constructEvent(
      body,
      signature!,
      env.STRIPE_WEBHOOK_SECRET!,
    );

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const s = event.data.object as Stripe.Checkout.Session;
      // Metody asynchroniczne (BLIK/P24/przelew): `completed` przychodzi zanim środki
      // wpłyną (payment_status: "unpaid") — księgujemy dopiero przy statusie "paid"
      // (dla async potwierdzenie przychodzi osobnym eventem async_payment_succeeded).
      return {
        type: s.payment_status === "paid" ? "paid" : "authorized",
        providerRef: s.id,
        amount: s.amount_total ?? 0,
        currency: (s.currency ?? "pln").toUpperCase(),
        raw: { id: event.id, type: event.type },
      };
    }

    if (
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      const s = event.data.object as Stripe.Checkout.Session;
      return {
        type: "failed",
        providerRef: s.id,
        amount: s.amount_total ?? 0,
        currency: (s.currency ?? "pln").toUpperCase(),
        raw: { id: event.id, type: event.type },
      };
    }

    // Inne zdarzenia: no-op po stronie serwisu.
    return {
      type: "authorized",
      providerRef: "",
      amount: 0,
      currency: "PLN",
      raw: { id: event.id, type: event.type },
    };
  }

  async refund({ providerRef, amount }: { providerRef: string; amount: number }) {
    const session = await this.stripe.checkout.sessions.retrieve(providerRef);
    const pi =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    const refund = await this.stripe.refunds.create({ payment_intent: pi!, amount });
    return { providerRef: refund.id, amount };
  }
}
