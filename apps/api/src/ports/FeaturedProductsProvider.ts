/**
 * Which products the business has chosen to feature as "top rated" on the home page.
 * Kept separate from ProductRepository: merchandising choices belong to the business,
 * not to whichever system holds product data. Today it is config; later an admin screen or CMS.
 */
export interface FeaturedProductsProvider {
  /** Product ids in display order. An empty list means "nothing chosen". */
  getFeaturedProductIds(): Promise<number[]>;
}
