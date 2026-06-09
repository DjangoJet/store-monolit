import { formatMoney } from "@/lib/utils";
import { emailLayout, type EmailBranding } from "./layout";

interface OrderData {
  number: string;
  currency: string;
  totalAmount: number;
  taxAmount: number;
  lines: { productTitle: string; variantTitle: string; quantity: number; totalAmount: number }[];
}

export function orderConfirmationEmail(order: OrderData, branding: EmailBranding) {
  const rows = order.lines
    .map(
      (l) =>
        `<tr><td style="padding:4px 0">${l.productTitle}${l.variantTitle ? ` (${l.variantTitle})` : ""} ×${l.quantity}</td>` +
        `<td align="right">${formatMoney(l.totalAmount, order.currency)}</td></tr>`,
    )
    .join("");

  const content = `
    <p>Dziękujemy za zamówienie <strong>${order.number}</strong>!</p>
    <table width="100%" style="border-collapse:collapse;margin:12px 0">${rows}</table>
    <p style="border-top:1px solid #eee;padding-top:8px">
      Razem: <strong>${formatMoney(order.totalAmount, order.currency)}</strong>
      ${order.taxAmount > 0 ? `<br><span style="color:#888;font-size:12px">w tym VAT ${formatMoney(order.taxAmount, order.currency)}</span>` : ""}
    </p>`;

  return {
    subject: `Potwierdzenie zamówienia ${order.number}`,
    html: emailLayout(branding, content),
  };
}
