import { emailLayout, type EmailBranding } from "./layout";

export function welcomeEmail(
  name: string | null,
  branding: EmailBranding,
  verifyUrl?: string,
) {
  const content = `
    <p>Cześć${name ? ` ${name}` : ""}!</p>
    <p>Dziękujemy za założenie konta w ${branding.storeName}.</p>
    ${
      verifyUrl
        ? `<p><a href="${verifyUrl}">Potwierdź swój adres e-mail →</a></p>
    <p>Po potwierdzeniu zobaczysz w koncie także zamówienia złożone wcześniej jako gość na ten adres.</p>`
        : ""
    }
    <p><a href="${branding.appUrl}/products">Przejdź do sklepu →</a></p>`;
  return {
    subject: `Witaj w ${branding.storeName}`,
    html: emailLayout(branding, content),
  };
}
