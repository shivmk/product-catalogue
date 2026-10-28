import type { Product } from '@catalogue/shared';
import type { EmailMessage, Mailer } from '../src/ports/Mailer.js';

export function makeProduct(overrides: Partial<Product> & Pick<Product, 'id'>): Product {
  return {
    title: `Product ${overrides.id}`,
    description: 'A product',
    price: 10,
    imageUrl: `https://images.example.com/${overrides.id}.png`,
    category: { slug: 'electronics', name: 'electronics' },
    rating: { rate: 3, count: 10 },
    ...overrides,
  };
}

const mens = { slug: 'mens-clothing', name: "men's clothing" };
const womens = { slug: 'womens-clothing', name: "women's clothing" };
const electronics = { slug: 'electronics', name: 'electronics' };

export const catalogue: Product[] = [
  makeProduct({
    id: 1,
    title: 'Mens Casual Slim Fit Jacket',
    category: mens,
    rating: { rate: 4.1, count: 50 },
  }),
  makeProduct({
    id: 2,
    title: 'Mens Cotton T-Shirt',
    category: mens,
    rating: { rate: 4.7, count: 500 },
  }),
  makeProduct({ id: 3, title: 'Plain Polo', category: mens, rating: { rate: 2.1, count: 30 } }),
  makeProduct({
    id: 4,
    title: 'Classic Wool Coat',
    category: mens,
    rating: { rate: 3.9, count: 80 },
  }),
  makeProduct({
    id: 5,
    title: 'Womens Rain Jacket',
    category: womens,
    rating: { rate: 3.8, count: 70 },
  }),
  makeProduct({
    id: 6,
    title: 'SanDisk SSD 1TB',
    description: 'Fast solid state drive',
    category: electronics,
    rating: { rate: 4.8, count: 300 },
  }),
  makeProduct({
    id: 7,
    title: '4K Monitor',
    category: electronics,
    rating: { rate: 4.8, count: 100 },
  }),
];

/** Records sent emails instead of sending them. */
export class RecordingMailer implements Mailer {
  readonly sent: EmailMessage[] = [];
  failWith?: Error;

  async send(message: EmailMessage): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.sent.push(message);
  }
}
