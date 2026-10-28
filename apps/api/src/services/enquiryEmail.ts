import type { EnquiryRequest, Product } from '@catalogue/shared';
import type { EmailMessage } from '../ports/Mailer.js';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Customer input goes into an HTML email, so every value is escaped before it is interpolated. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

export interface EnquiryEmailInput {
  enquiryId: string;
  enquiry: EnquiryRequest;
  product: Product;
  productUrl: string;
  salesInbox: string;
}

export function buildEnquiryEmail({
  enquiryId,
  enquiry,
  product,
  productUrl,
  salesInbox,
}: EnquiryEmailInput): EmailMessage {
  const rows: Array<[string, string]> = [
    ['Product', `${product.title} (#${product.id})`],
    ['Product link', productUrl],
    ['Name', enquiry.name],
    ['Email', enquiry.email],
    ['Phone', enquiry.phone || 'Not provided'],
    ['Message', enquiry.message || 'No message'],
    ['Reference', enquiryId],
  ];

  const text = [
    'A customer has sent an enquiry.',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
  ].join('\n');

  const html = `<p>A customer has sent an enquiry.</p>
<table cellpadding="6" style="border-collapse:collapse">
${rows
  .map(
    ([label, value]) =>
      `<tr><th align="left" valign="top">${escapeHtml(label)}</th><td style="white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
  )
  .join('\n')}
</table>`;

  return {
    to: salesInbox,
    // Sales can reply straight to the customer.
    replyTo: enquiry.email,
    subject: `New enquiry: ${product.title}`,
    text,
    html,
  };
}
