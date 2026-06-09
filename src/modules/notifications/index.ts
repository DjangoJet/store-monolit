import type { EmailAdapter } from "./email";

export type { EmailAdapter } from "./email";

/** Fallback: loguje maile do konsoli. Resend/SMTP podłączysz tutaj, gdy ENV uzupełnione. */
class ConsoleEmailAdapter implements EmailAdapter {
  async send(input: { to: string; subject: string }) {
    console.log(`[email] → ${input.to} :: ${input.subject}`);
  }
}

let instance: EmailAdapter | null = null;

export function getEmailAdapter(): EmailAdapter {
  if (instance) return instance;
  // TODO (Faza 3+): jeśli RESEND_API_KEY → ResendAdapter; jeśli SMTP_HOST → SmtpAdapter.
  instance = new ConsoleEmailAdapter();
  return instance;
}
