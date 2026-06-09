import { formatMoney } from "@/lib/utils";
import { emailLayout, type EmailBranding } from "./layout";

export function refundEmail(
  orderNumber: string,
  amount: number,
  currency: string,
  branding: EmailBranding,
) {
  const content = `
    <p>Zwróciliśmy <strong>${formatMoney(amount, currency)}</strong> za zamówienie
    <strong>${orderNumber}</strong>.</p>
    <p>Środki powinny pojawić się na Twoim koncie w ciągu kilku dni roboczych.</p>`;
  return {
    subject: `Zwrot środków — zamówienie ${orderNumber}`,
    html: emailLayout(branding, content),
  };
}
