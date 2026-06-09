import { emailLayout, type EmailBranding } from "./layout";

export function welcomeEmail(name: string | null, branding: EmailBranding) {
  const content = `
    <p>Cześć${name ? ` ${name}` : ""}!</p>
    <p>Dziękujemy za założenie konta w ${branding.storeName}.</p>
    <p><a href="${branding.appUrl}/products">Przejdź do sklepu →</a></p>`;
  return {
    subject: `Witaj w ${branding.storeName}`,
    html: emailLayout(branding, content),
  };
}
