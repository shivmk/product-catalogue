import { describe, expect, it } from 'vitest';
import { CatalogueService } from '../src/services/CatalogueService.js';
import { InMemoryProductRepository } from '../src/adapters/InMemoryProductRepository.js';
import { StaticFeaturedProductsProvider } from '../src/adapters/StaticFeaturedProductsProvider.js';
import { NotFoundError } from '../src/errors.js';
import { catalogue } from './fixtures.js';

function service(featuredIds: number[] = [], categoryTopRatedCount = 2) {
  return new CatalogueService(
    new InMemoryProductRepository(catalogue),
    new StaticFeaturedProductsProvider(featuredIds),
    { featuredFallbackCount: 5, categoryTopRatedCount },
  );
}

const ids = (products: { id: number }[]) => products.map((product) => product.id);

describe('CatalogueService.getFeaturedProducts', () => {
  it('returns exactly the chosen products, in the chosen order', async () => {
    const featured = await service([3, 1, 7, 5, 2]).getFeaturedProducts();
    expect(ids(featured)).toEqual([3, 1, 7, 5, 2]);
  });

  it('skips chosen ids that no longer exist instead of failing', async () => {
    const featured = await service([1, 999, 2]).getFeaturedProducts();
    expect(ids(featured)).toEqual([1, 2]);
  });

  it('falls back to the five highest rated when nothing is chosen', async () => {
    const featured = await service([]).getFeaturedProducts();
    // 6 and 7 tie on rate; 6 has more ratings so it comes first.
    expect(ids(featured)).toEqual([6, 7, 2, 1, 4]);
  });
});

describe('CatalogueService.getCategoryPage', () => {
  it('splits a category into top rated and the rest', async () => {
    const page = await service().getCategoryPage('mens-clothing');
    expect(page.category).toEqual({ slug: 'mens-clothing', name: "men's clothing" });
    expect(ids(page.topRated)).toEqual([2, 1]);
    expect(ids(page.others)).toEqual([4, 3]);
  });

  it('returns everything as top rated when the category is small', async () => {
    const page = await service([], 3).getCategoryPage('womens-clothing');
    expect(ids(page.topRated)).toEqual([5]);
    expect(page.others).toEqual([]);
  });

  it('throws NotFoundError for an unknown category', async () => {
    await expect(service().getCategoryPage('garden')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('CatalogueService.getProduct', () => {
  it('throws NotFoundError for an unknown id', async () => {
    await expect(service().getProduct(999)).rejects.toBeInstanceOf(NotFoundError);
  });
});
