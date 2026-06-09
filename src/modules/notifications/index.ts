import { env } from "@/lib/env";
import type { EmailAdapter } from "./email";
import { ConsoleEmailAdapter } from "./adapters/console";
import { ResendEmailAdapter } from "./adapters/resend";
import { SmtpEmailAdapter } from "./adapters/smtp";

export type { EmailAdapter } from "./email";

let instance: EmailAdapter | null = null;

/**
 * Jawny wybór dostawcy maili przez EMAIL_PROVIDER (jak PAYMENT_PROVIDER):
 *   - "resend" → wymaga RESEND_API_KEY,
 *   - "smtp"   → wymaga SMTP_HOST,
 *   - "console" (domyślnie) → tylko logi, nie wysyła.
 * Gdy wybrany provider nie ma konfiguracji — bezpieczny fallback na console (+ ostrzeżenie).
 */
export function getEmailAdapter(): EmailAdapter {
  if (instance) return instance;
  instance = buildAdapter();
  return instance;
}

function buildAdapter(): EmailAdapter {
  if (env.EMAIL_PROVIDER === "resend") {
    if (env.RESEND_API_KEY) {
      return new ResendEmailAdapter(env.RESEND_API_KEY, env.EMAIL_FROM);
    }
    console.warn("EMAIL_PROVIDER=resend, ale brak RESEND_API_KEY → fallback console.");
  }

  if (env.EMAIL_PROVIDER === "smtp") {
    if (env.SMTP_HOST) {
      return new SmtpEmailAdapter({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
        from: env.EMAIL_FROM,
      });
    }
    console.warn("EMAIL_PROVIDER=smtp, ale brak SMTP_HOST → fallback console.");
  }

  return new ConsoleEmailAdapter();
}
