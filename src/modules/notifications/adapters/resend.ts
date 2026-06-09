import { Resend } from "resend";
import type { EmailAdapter } from "../email";

export class ResendEmailAdapter implements EmailAdapter {
  private client: Resend;

  constructor(
    apiKey: string,
    private from: string,
  ) {
    this.client = new Resend(apiKey);
  }

  async send(input: { to: string; subject: string; html?: string }) {
    await this.client.emails.send({
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html ?? "",
    });
  }
}
