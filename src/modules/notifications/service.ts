import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { getEmailAdapter } from "./index";

/** Wysyła potwierdzenie zamówienia (best-effort — nie blokuje przepływu przy błędzie). */
export async function sendOrderConfirmation(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { lines: true },
    });
    if (!order) return;

    const rows = order.lines
      .map(
        (l) =>
          `<tr><td>${l.productTitle} (${l.variantTitle}) ×${l.quantity}</td>` +
          `<td>${formatMoney(l.totalAmount, order.currency)}</td></tr>`,
      )
      .join("");

    const html = `
      <h1>Dziękujemy za zamówienie ${order.number}</h1>
      <table>${rows}</table>
      <p>Razem: <strong>${formatMoney(order.totalAmount, order.currency)}</strong></p>
    `;

    await getEmailAdapter().send({
      to: order.email,
      subject: `Potwierdzenie zamówienia ${order.number}`,
      html,
    });
  } catch (err) {
    console.error("Nie udało się wysłać potwierdzenia zamówienia:", err);
  }
}
