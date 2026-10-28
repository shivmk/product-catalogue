export interface EmailMessage {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
}

/** Sends email. SMTP today (Mailpit locally); SES, SendGrid, etc. later as another adapter. */
export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}
