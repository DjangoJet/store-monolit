import type { EmailAdapter } from "../email";

/** Fallback dev: loguje maile do konsoli, nic nie wysyła. */
export class ConsoleEmailAdapter implements EmailAdapter {
  async send(input: { to: string; subject: string }) {
    console.log(`[email:console] → ${input.to} :: ${input.subject}`);
  }
}
