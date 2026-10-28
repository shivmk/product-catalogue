import { describe, expect, it } from 'vitest';
import { EnquiryService } from '../src/services/EnquiryService.js';
import { InMemoryProductRepository } from '../src/adapters/InMemoryProductRepository.js';
import { ValidationError } from '../src/errors.js';
import { catalogue, RecordingMailer } from './fixtures.js';

function setup() {
  const mailer = new RecordingMailer();
  const service = new EnquiryService(new InMemoryProductRepository(catalogue), mailer, {
    salesInbox: 'sales@shop.test',
    publicWebUrl: 'https://shop.test',
    generateId: () => 'ref-123',
  });
  return { mailer, service };
}

const enquiry = {
  productId: 1,
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+61 400 000 000',
  message: 'Do you have this in blue?',
};

describe('EnquiryService', () => {
  it('emails the sales inbox with the enquiry and product details', async () => {
    const { mailer, service } = setup();

    const result = await service.submit(enquiry);

    expect(result).toEqual({ enquiryId: 'ref-123', delivered: true });
    expect(mailer.sent).toHaveLength(1);
    const [email] = mailer.sent;
    expect(email?.to).toBe('sales@shop.test');
    expect(email?.replyTo).toBe('ada@example.com');
    expect(email?.subject).toBe('New enquiry: Mens Casual Slim Fit Jacket');
    expect(email?.text).toContain('Name: Ada Lovelace');
    expect(email?.text).toContain('Phone: +61 400 000 000');
    expect(email?.text).toContain('Product link: https://shop.test/products/1');
    expect(email?.text).toContain('Reference: ref-123');
  });

  it('escapes customer input in the HTML body', async () => {
    const { mailer, service } = setup();

    await service.submit({ ...enquiry, message: '<script>alert("x")</script>' });

    const html = mailer.sent[0]?.html ?? '';
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });

  it('silently drops enquiries that fill in the honeypot field', async () => {
    const { mailer, service } = setup();

    const result = await service.submit({ ...enquiry, website: 'http://spam.example' });

    expect(result.delivered).toBe(false);
    expect(mailer.sent).toHaveLength(0);
  });

  it('rejects enquiries for products that do not exist', async () => {
    const { mailer, service } = setup();

    await expect(service.submit({ ...enquiry, productId: 999 })).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(mailer.sent).toHaveLength(0);
  });
});
