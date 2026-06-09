import { formatMoney } from "@/lib/utils";
import { emailLayout, type EmailBranding } from "./layout";

export function paymentConfirmationEmail(
  order: { number: string; currency: string; totalAmount: number },
  branding: EmailBranding,
) {
  const content = `
    <p>Otrzymaliśmy płatność za zamówienie <strong>${order.number}</strong>
    na kwotę <strong>${formatMoney(order.totalAmount, order.currency)}</strong>.</p>
    <p>Rozpoczynamy realizację — o wysyłce poinformujemy osobnym e-mailem.</p>`;
  return {
    subject: `Płatność otrzymana — zamówienie ${order.number}`,
    html: emailLayout(branding, content),
  };
}
