import type { Logger } from 'pino';
import type { EmailMessage, Mailer } from '../../ports/Mailer.js';

/**
 * Development-only mailer: writes the email to the log instead of sending it.
 * Lets `npm run dev` work without an SMTP server. Never select this in production,
 * because it logs customer contact details.
 */
export class ConsoleMailer implements Mailer {
  constructor(private readonly logger: Logger) {}

  async send(message: EmailMessage): Promise<void> {
    this.logger.info({ to: message.to, subject: message.subject }, 'ConsoleMailer: email not sent');
    this.logger.debug({ text: message.text }, 'ConsoleMailer: email body');
  }
}
