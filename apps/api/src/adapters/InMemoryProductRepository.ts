import type { Category, Product } from '@catalogue/shared';
import type { ProductRepository } from '../ports/ProductRepository.js';
import { categoriesOf, filterByCategory, searchProducts } from '../domain/productQueries.js';

/** Answers every query from a fixed list of products. Used for tests and as a catalogue snapshot. */
export class InMemoryProductRepository implements ProductRepository {
  constructor(private readonly products: readonly Product[]) {}

  async listProducts(): Promise<Product[]> {
    return [...this.products];
  }

  async getProduct(id: number): Promise<Product | null> {
    return this.products.find((product) => product.id === id) ?? null;
  }

  async listCategories(): Promise<Category[]> {
    return categoriesOf([...this.products]);
  }

  async listProductsByCategory(categorySlug: string): Promise<Product[]> {
    return filterByCategory([...this.products], categorySlug);
  }

  async searchProducts(term: string): Promise<Product[]> {
    return searchProducts([...this.products], term);
  }
}
