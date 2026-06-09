import type { ReactElement } from "react";

// Kontrakt adaptera email (Resend / SMTP). Patrz docs/04-adapters.md.
export interface EmailAdapter {
  send(input: {
    to: string;
    subject: string;
    react?: ReactElement;
    html?: string;
  }): Promise<void>;
}
