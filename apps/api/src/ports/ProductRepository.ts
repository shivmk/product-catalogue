import type { Category, Product } from '@catalogue/shared';

/**
 * Where product data comes from. Fake Store today; a database, CMS or commerce platform later.
 * Search and category filtering live behind this port so a future source can push them down
 * (SQL, a search index) instead of filtering in memory.
 */
export interface ProductRepository {
  listProducts(): Promise<Product[]>;
  /** Resolves to null when no product has this id. */
  getProduct(id: number): Promise<Product | null>;
  listCategories(): Promise<Category[]>;
  listProductsByCategory(categorySlug: string): Promise<Product[]>;
  searchProducts(term: string): Promise<Product[]>;
}
