import type { Category, Product } from '@catalogue/shared';

/**
 * In-memory query helpers for product sources that can only return the whole catalogue
 * (Fake Store, fixtures). A source with real querying would not need these.
 */

export function slugify(name: string): string {
  return normalise(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Lower-case, strip accents and apostrophes, so "Men's" matches "mens". */
function normalise(text: string): string {
  return text.normalize('NFKD').replace(/\p{Diacritic}/gu, '').replace(/['’]/g, '').toLowerCase();
}

export function categoriesOf(products: Product[]): Category[] {
  const bySlug = new Map<string, Category>();
  for (const { category } of products) {
    bySlug.set(category.slug, category);
  }
  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function filterByCategory(products: Product[], categorySlug: string): Product[] {
  return products.filter((product) => product.category.slug === categorySlug);
}

function words(text: string): string[] {
  return normalise(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * A product matches when every word of the term is the start of some word in its title,
 * description or category name (case-insensitive). So "jacket mens" finds
 * "Mens Casual Slim Fit Jacket" and "jack" finds "jacket", but "mens" does not match
 * "womens" (which a plain substring match would).
 */
export function searchProducts(products: Product[], term: string): Product[] {
  const termWords = words(term);
  if (termWords.length === 0) return [];
  return products.filter((product) => {
    const productWords = words(`${product.title} ${product.description} ${product.category.name}`);
    return termWords.every((termWord) =>
      productWords.some((productWord) => productWord.startsWith(termWord)),
    );
  });
}
