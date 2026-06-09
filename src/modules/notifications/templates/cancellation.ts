import { emailLayout, type EmailBranding } from "./layout";

export function cancellationEmail(orderNumber: string, branding: EmailBranding) {
  const content = `
    <p>Twoje zamówienie <strong>${orderNumber}</strong> zostało anulowane.</p>
    <p>Jeśli płatność została pobrana, zwrot nastąpi automatycznie. W razie pytań — odpisz na tę wiadomość.</p>`;
  return {
    subject: `Zamówienie ${orderNumber} zostało anulowane`,
    html: emailLayout(branding, content),
  };
}
