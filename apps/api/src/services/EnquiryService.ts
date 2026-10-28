import { randomUUID } from 'node:crypto';
import type { EnquiryRequest } from '@catalogue/shared';
import type { ProductRepository } from '../ports/ProductRepository.js';
import type { Mailer } from '../ports/Mailer.js';
import { ValidationError } from '../errors.js';
import { buildEnquiryEmail } from './enquiryEmail.js';

export interface EnquiryServiceOptions {
  salesInbox: string;
  publicWebUrl: string;
  generateId?: () => string;
}

export interface EnquiryResult {
  enquiryId: string;
  /** False when the enquiry was dropped as spam. The caller still answers as if it succeeded. */
  delivered: boolean;
}

export class EnquiryService {
  private readonly generateId: () => string;

  constructor(
    private readonly products: ProductRepository,
    private readonly mailer: Mailer,
    private readonly options: EnquiryServiceOptions,
  ) {
    this.generateId = options.generateId ?? randomUUID;
  }

  async submit(enquiry: EnquiryRequest): Promise<EnquiryResult> {
    const enquiryId = this.generateId();

    // Honeypot filled in: almost certainly a bot. Pretend it worked so bots learn nothing.
    if (enquiry.website) return { enquiryId, delivered: false };

    // Look the product up on the server rather than trusting a title sent by the client.
    const product = await this.products.getProduct(enquiry.productId);
    if (!product) {
      throw new ValidationError('Enquiry is for an unknown product', {
        productId: 'This product no longer exists',
      });
    }

    const productUrl = new URL(`/products/${product.id}`, this.options.publicWebUrl).toString();
    await this.mailer.send(
      buildEnquiryEmail({
        enquiryId,
        enquiry,
        product,
        productUrl,
        salesInbox: this.options.salesInbox,
      }),
    );
    return { enquiryId, delivered: true };
  }
}
