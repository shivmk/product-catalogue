import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { pino } from 'pino';
import { createApp } from '../src/http/app.js';
import { CatalogueService } from '../src/services/CatalogueService.js';
import { EnquiryService } from '../src/services/EnquiryService.js';
import { InMemoryProductRepository } from '../src/adapters/InMemoryProductRepository.js';
import { StaticFeaturedProductsProvider } from '../src/adapters/StaticFeaturedProductsProvider.js';
import { UpstreamError } from '../src/errors.js';
import type { ProductRepository } from '../src/ports/ProductRepository.js';
import { catalogue, RecordingMailer } from './fixtures.js';

function setup({
  products = new InMemoryProductRepository(catalogue) as ProductRepository,
  rateLimitMax = 100,
} = {}) {
  const mailer = new RecordingMailer();
  const app = createApp({
    catalogue: new CatalogueService(products, new StaticFeaturedProductsProvider([7, 1, 5, 2, 6]), {
      featuredFallbackCount: 5,
      categoryTopRatedCount: 2,
    }),
    enquiries: new EnquiryService(products, mailer, {
      salesInbox: 'sales@shop.test',
      publicWebUrl: 'https://shop.test',
    }),
    logger: pino({ level: 'silent' }),
    corsOrigins: [],
    trustProxy: 0,
    enquiryRateLimit: { max: rateLimitMax, windowMs: 60_000 },
  });
  return { app, mailer };
}

const ids = (products: { id: number }[]) => products.map((product) => product.id);

/** A product source that is down. */
const failingProducts: ProductRepository = {
  listProducts: () => Promise.reject(new UpstreamError('Product source is unavailable')),
  getProduct: () => Promise.reject(new UpstreamError('Product source is unavailable')),
  listCategories: () => Promise.reject(new UpstreamError('Product source is unavailable')),
  listProductsByCategory: () => Promise.reject(new UpstreamError('Product source is unavailable')),
  searchProducts: () => Promise.reject(new UpstreamError('Product source is unavailable')),
};

describe('GET /api/products/featured', () => {
  it('returns the five chosen products in order', async () => {
    const res = await request(setup().app).get('/api/products/featured').expect(200);
    expect(ids(res.body.products)).toEqual([7, 1, 5, 2, 6]);
  });
});

describe('GET /api/categories', () => {
  it('lists categories', async () => {
    const res = await request(setup().app).get('/api/categories').expect(200);
    expect(res.body.categories).toHaveLength(3);
  });
});

describe('GET /api/categories/:slug', () => {
  it('returns top rated and other products for the category', async () => {
    const res = await request(setup().app).get('/api/categories/mens-clothing').expect(200);
    expect(ids(res.body.topRated)).toEqual([2, 1]);
    expect(ids(res.body.others)).toEqual([4, 3]);
  });

  it('404s for an unknown category', async () => {
    const res = await request(setup().app).get('/api/categories/garden').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('400s for a malformed slug', async () => {
    await request(setup().app).get('/api/categories/NOT_A_SLUG!').expect(400);
  });
});

describe('GET /api/products?search=', () => {
  it('returns only matching products', async () => {
    const res = await request(setup().app)
      .get('/api/products')
      .query({ search: 'jacket' })
      .expect(200);
    expect(ids(res.body.products)).toEqual([1, 5]);
  });

  it('returns an empty list when nothing matches', async () => {
    const res = await request(setup().app)
      .get('/api/products')
      .query({ search: 'zzz' })
      .expect(200);
    expect(res.body.products).toEqual([]);
  });

  it('400s for a blank search term', async () => {
    const res = await request(setup().app).get('/api/products').query({ search: '  ' }).expect(400);
    expect(res.body.error.fields.search).toBe('Enter a search term');
  });

  it('400s for an overly long search term', async () => {
    await request(setup().app)
      .get('/api/products')
      .query({ search: 'a'.repeat(101) })
      .expect(400);
  });

  it('lists all products when no search is given', async () => {
    const res = await request(setup().app).get('/api/products').expect(200);
    expect(res.body.products).toHaveLength(catalogue.length);
  });
});

describe('GET /api/products/:id', () => {
  it('returns the product', async () => {
    const res = await request(setup().app).get('/api/products/6').expect(200);
    expect(res.body.title).toBe('SanDisk SSD 1TB');
  });

  it('404s for an unknown product', async () => {
    await request(setup().app).get('/api/products/999').expect(404);
  });

  it('400s for a non-numeric id', async () => {
    await request(setup().app).get('/api/products/abc').expect(400);
  });
});

describe('POST /api/enquiries', () => {
  const valid = { productId: 1, name: 'Ada', email: 'ada@example.com', message: 'Hi' };

  it('sends the email and returns a reference', async () => {
    const { app, mailer } = setup();
    const res = await request(app).post('/api/enquiries').send(valid).expect(201);
    expect(res.body.enquiryId).toEqual(expect.any(String));
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe('sales@shop.test');
  });

  it('400s with field messages for invalid input, without sending', async () => {
    const { app, mailer } = setup();
    const res = await request(app)
      .post('/api/enquiries')
      .send({ productId: 1, name: '', email: 'not-an-email' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(Object.keys(res.body.error.fields)).toEqual(['name', 'email']);
    expect(mailer.sent).toHaveLength(0);
  });

  it('400s for malformed JSON', async () => {
    await request(setup().app)
      .post('/api/enquiries')
      .set('content-type', 'application/json')
      .send('{"name":')
      .expect(400);
  });

  it('502s when the email cannot be sent', async () => {
    const { app, mailer } = setup();
    mailer.failWith = new UpstreamError('Email could not be sent');
    const res = await request(app).post('/api/enquiries').send(valid).expect(502);
    expect(res.body.error.code).toBe('UPSTREAM_UNAVAILABLE');
  });

  it('rate limits repeated enquiries', async () => {
    const { app } = setup({ rateLimitMax: 2 });
    await request(app).post('/api/enquiries').send(valid).expect(201);
    await request(app).post('/api/enquiries').send(valid).expect(201);
    const res = await request(app).post('/api/enquiries').send(valid).expect(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('when the product source is down', () => {
  it('responds 502 without leaking upstream details', async () => {
    const res = await request(setup({ products: failingProducts }).app)
      .get('/api/products/featured')
      .expect(502);
    expect(res.body).toEqual({
      error: {
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'Product source is unavailable. Please try again shortly.',
      },
    });
  });
});

describe('unknown routes', () => {
  it('404 as JSON', async () => {
    const res = await request(setup().app).get('/api/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
