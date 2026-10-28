import { z } from 'zod';
import type { Category, Product } from '@catalogue/shared';
import type { ProductRepository } from '../../ports/ProductRepository.js';
import { UpstreamError } from '../../errors.js';
import { slugify } from '../../domain/productQueries.js';
import { InMemoryProductRepository } from '../InMemoryProductRepository.js';
import { cachedLoader } from './cachedLoader.js';

/** The upstream shape. Validated, so a change on their side fails loudly here, not in the UI. */
const FakeStoreProductSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  price: z.number(),
  description: z.string(),
  category: z.string(),
  image: z.url(),
  rating: z.object({ rate: z.number(), count: z.number() }).optional(),
});
type FakeStoreProduct = z.infer<typeof FakeStoreProductSchema>;

export function toProduct(raw: FakeStoreProduct): Product {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    price: raw.price,
    imageUrl: raw.image,
    category: { slug: slugify(raw.category), name: raw.category },
    rating: raw.rating ?? { rate: 0, count: 0 },
  };
}

export interface FakeStoreOptions {
  baseUrl: string;
  timeoutMs: number;
  cacheTtlMs: number;
  fetchFn?: typeof fetch;
  onStaleServed?: (error: unknown) => void;
}

/**
 * Fake Store only offers "give me everything" (about 20 products), has no search, and returns
 * 200 with an empty body for unknown ids. So this adapter fetches the whole catalogue once,
 * caches it, and answers every query from that snapshot.
 */
export class FakeStoreProductRepository implements ProductRepository {
  private readonly snapshot: () => Promise<InMemoryProductRepository>;
  private readonly fetchFn: typeof fetch;

  constructor(private readonly options: FakeStoreOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.snapshot = cachedLoader(() => this.fetchCatalogue(), {
      ttlMs: options.cacheTtlMs,
      onStaleServed: options.onStaleServed,
    });
  }

  async listProducts(): Promise<Product[]> {
    return (await this.snapshot()).listProducts();
  }

  async getProduct(id: number): Promise<Product | null> {
    return (await this.snapshot()).getProduct(id);
  }

  async listCategories(): Promise<Category[]> {
    return (await this.snapshot()).listCategories();
  }

  async listProductsByCategory(categorySlug: string): Promise<Product[]> {
    return (await this.snapshot()).listProductsByCategory(categorySlug);
  }

  async searchProducts(term: string): Promise<Product[]> {
    return (await this.snapshot()).searchProducts(term);
  }

  private async fetchCatalogue(): Promise<InMemoryProductRepository> {
    const url = new URL('/products', this.options.baseUrl);
    let body: unknown;
    try {
      const response = await this.fetchFn(url, {
        signal: AbortSignal.timeout(this.options.timeoutMs),
        headers: { accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Fake Store responded with HTTP ${response.status}`);
      }
      body = await response.json();
    } catch (error) {
      throw new UpstreamError('Product source is unavailable', { cause: error });
    }

    const parsed = z.array(FakeStoreProductSchema).safeParse(body);
    if (!parsed.success) {
      throw new UpstreamError('Product source returned an unexpected response', {
        cause: parsed.error,
      });
    }
    return new InMemoryProductRepository(parsed.data.map(toProduct));
  }
}
