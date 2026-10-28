import { describe, expect, it } from 'vitest';
import { categoriesOf, searchProducts, slugify } from '../src/domain/productQueries.js';
import { catalogue } from './fixtures.js';

const ids = (products: { id: number }[]) => products.map((product) => product.id);

describe('slugify', () => {
  it('makes URL-safe slugs from Fake Store category names', () => {
    expect(slugify("men's clothing")).toBe('mens-clothing');
    expect(slugify("Women's Clothing")).toBe('womens-clothing');
    expect(slugify('electronics')).toBe('electronics');
  });
});

describe('searchProducts', () => {
  it('is case-insensitive', () => {
    expect(ids(searchProducts(catalogue, 'JACKET'))).toEqual([1, 5]);
  });

  it('matches on word prefixes', () => {
    expect(ids(searchProducts(catalogue, 'jack'))).toEqual([1, 5]);
  });

  it('does not match "mens" inside "womens"', () => {
    expect(ids(searchProducts(catalogue, 'mens jacket'))).toEqual([1]);
  });

  it('requires every word to match', () => {
    expect(ids(searchProducts(catalogue, 'jacket wool'))).toEqual([]);
  });

  it('matches the description and category, not just the title', () => {
    expect(ids(searchProducts(catalogue, 'solid state'))).toEqual([6]);
    expect(ids(searchProducts(catalogue, 'electronics'))).toEqual([6, 7]);
  });

  it('ignores apostrophes so "mens" finds "men\'s clothing"', () => {
    expect(ids(searchProducts(catalogue, 'mens'))).toEqual([1, 2, 3, 4]);
  });

  it('returns nothing for a blank term', () => {
    expect(searchProducts(catalogue, '   ')).toEqual([]);
  });
});

describe('categoriesOf', () => {
  it('returns each category once, sorted by name', () => {
    expect(categoriesOf(catalogue).map((category) => category.slug)).toEqual([
      'electronics',
      'mens-clothing',
      'womens-clothing',
    ]);
  });
});
