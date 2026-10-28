import type { Category, CategoryPage, Product } from '@catalogue/shared';
import type { ProductRepository } from '../ports/ProductRepository.js';
import type { FeaturedProductsProvider } from '../ports/FeaturedProductsProvider.js';
import { NotFoundError } from '../errors.js';

export interface CatalogueServiceOptions {
  /** How many products the home page features when the business has not chosen any. */
  featuredFallbackCount: number;
  categoryTopRatedCount: number;
}

/** Highest rating first; ties broken by number of ratings, then id, so the order is stable. */
export function byRatingDesc(a: Product, b: Product): number {
  return b.rating.rate - a.rating.rate || b.rating.count - a.rating.count || a.id - b.id;
}

export class CatalogueService {
  constructor(
    private readonly products: ProductRepository,
    private readonly featured: FeaturedProductsProvider,
    private readonly options: CatalogueServiceOptions,
  ) {}

  /**
   * The products the business chose as "top rated", in their chosen order.
   * Ids that no longer exist in the product source are skipped rather than failing the page.
   * If nothing has been chosen, fall back to the highest rated products.
   */
  async getFeaturedProducts(): Promise<Product[]> {
    const ids = await this.featured.getFeaturedProductIds();
    if (ids.length === 0) {
      const all = await this.products.listProducts();
      return all.toSorted(byRatingDesc).slice(0, this.options.featuredFallbackCount);
    }
    const products = await Promise.all(ids.map((id) => this.products.getProduct(id)));
    return products.filter((product): product is Product => product !== null);
  }

  listCategories(): Promise<Category[]> {
    return this.products.listCategories();
  }

  async getCategoryPage(slug: string): Promise<CategoryPage> {
    const categories = await this.products.listCategories();
    const category = categories.find((candidate) => candidate.slug === slug);
    if (!category) throw new NotFoundError(`Category "${slug}" not found`);

    const products = (await this.products.listProductsByCategory(slug)).toSorted(byRatingDesc);
    const topCount = this.options.categoryTopRatedCount;
    return {
      category,
      topRated: products.slice(0, topCount),
      others: products.slice(topCount),
    };
  }

  listProducts(): Promise<Product[]> {
    return this.products.listProducts();
  }

  searchProducts(term: string): Promise<Product[]> {
    return this.products.searchProducts(term);
  }

  async getProduct(id: number): Promise<Product> {
    const product = await this.products.getProduct(id);
    if (!product) throw new NotFoundError(`Product ${id} not found`);
    return product;
  }
}
