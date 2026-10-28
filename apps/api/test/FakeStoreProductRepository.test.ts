import { describe, expect, it, vi } from 'vitest';
import { FakeStoreProductRepository } from '../src/adapters/fakeStore/FakeStoreProductRepository.js';
import { UpstreamError } from '../src/errors.js';

const upstreamProducts = [
  {
    id: 1,
    title: 'Fjallraven Backpack',
    price: 109.95,
    description: 'Your perfect pack',
    category: "men's clothing",
    image: 'https://fakestoreapi.com/img/1.png',
    rating: { rate: 3.9, count: 120 },
  },
  {
    id: 9,
    title: 'WD 2TB Drive',
    price: 64,
    description: 'USB 3.0',
    category: 'electronics',
    image: 'https://fakestoreapi.com/img/9.png',
    rating: { rate: 3.3, count: 203 },
  },
];

function repository(fetchFn: typeof fetch) {
  return new FakeStoreProductRepository({
    baseUrl: 'https://fakestore.test',
    timeoutMs: 1000,
    cacheTtlMs: 60_000,
    fetchFn,
  });
}

const respondWith = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status }));

describe('FakeStoreProductRepository', () => {
  it('maps Fake Store products to our product shape', async () => {
    const repo = repository(respondWith(upstreamProducts));

    expect(await repo.getProduct(1)).toEqual({
      id: 1,
      title: 'Fjallraven Backpack',
      description: 'Your perfect pack',
      price: 109.95,
      imageUrl: 'https://fakestoreapi.com/img/1.png',
      category: { slug: 'mens-clothing', name: "men's clothing" },
      rating: { rate: 3.9, count: 120 },
    });
  });

  it('returns null for an unknown id', async () => {
    expect(await repository(respondWith(upstreamProducts)).getProduct(42)).toBeNull();
  });

  it('fetches the catalogue once and answers later queries from the cache', async () => {
    const fetchFn = respondWith(upstreamProducts);
    const repo = repository(fetchFn);

    await repo.listProducts();
    await repo.searchProducts('drive');
    await repo.listCategories();

    expect(fetchFn).toHaveBeenCalledOnce();
    expect(String(fetchFn.mock.calls[0]?.[0])).toBe('https://fakestore.test/products');
  });

  it('throws UpstreamError when Fake Store returns an error status', async () => {
    await expect(repository(respondWith({}, 503)).listProducts()).rejects.toBeInstanceOf(
      UpstreamError,
    );
  });

  it('throws UpstreamError when the request fails', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed'));
    await expect(repository(fetchFn).listProducts()).rejects.toBeInstanceOf(UpstreamError);
  });

  it('throws UpstreamError when the response shape is unexpected', async () => {
    const fetchFn = respondWith([{ id: 'not-a-number' }]);
    await expect(repository(fetchFn).listProducts()).rejects.toBeInstanceOf(UpstreamError);
  });
});
