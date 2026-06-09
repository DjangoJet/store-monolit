import nodemailer, { type Transporter } from "nodemailer";
import type { EmailAdapter } from "../email";

export interface SmtpConfig {
  host: string;
  port: number;
  user?: string;
  password?: string;
  from: string;
}

export class SmtpEmailAdapter implements EmailAdapter {
  private transporter: Transporter;

  constructor(private cfg: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      // auth tylko gdy podano dane (Mailpit/dev działa bez auth)
      ...(cfg.user
        ? { auth: { user: cfg.user, pass: cfg.password } }
        : {}),
    });
  }

  async send(input: { to: string; subject: string; html?: string }) {
    await this.transporter.sendMail({
      from: this.cfg.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
  }
}
