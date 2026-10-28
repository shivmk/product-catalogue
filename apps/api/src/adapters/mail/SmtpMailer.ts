import nodemailer, { type Transporter } from 'nodemailer';
import type { EmailMessage, Mailer } from '../../ports/Mailer.js';
import { UpstreamError } from '../../errors.js';

export interface SmtpOptions {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

export class SmtpMailer implements Mailer {
  private readonly transporter: Transporter;

  constructor(private readonly options: SmtpOptions) {
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: options.user ? { user: options.user, pass: options.pass } : undefined,
      connectionTimeout: 10_000,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.options.from, ...message });
    } catch (error) {
      throw new UpstreamError('Email could not be sent', { cause: error });
    }
  }
}
