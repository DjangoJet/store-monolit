import { emailLayout, type EmailBranding } from "./layout";

export function passwordResetEmail(resetUrl: string, branding: EmailBranding) {
  const content = `
    <p>Otrzymaliśmy prośbę o reset hasła do Twojego konta.</p>
    <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Ustaw nowe hasło</a></p>
    <p style="color:#888;font-size:12px">Link wygasa za 1 godzinę. Jeśli to nie Ty — zignoruj tę wiadomość.</p>`;
  return {
    subject: `Reset hasła — ${branding.storeName}`,
    html: emailLayout(branding, content),
  };
}
