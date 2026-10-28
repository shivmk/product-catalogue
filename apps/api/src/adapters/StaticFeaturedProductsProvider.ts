import type { FeaturedProductsProvider } from '../ports/FeaturedProductsProvider.js';

/** Featured product ids from configuration (FEATURED_PRODUCT_IDS). */
export class StaticFeaturedProductsProvider implements FeaturedProductsProvider {
  constructor(private readonly productIds: readonly number[]) {}

  async getFeaturedProductIds(): Promise<number[]> {
    return [...this.productIds];
  }
}
