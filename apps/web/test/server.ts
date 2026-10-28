import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { Category, Product } from '@catalogue/shared';

export const API = 'http://localhost/api';

const electronics: Category = { slug: 'electronics', name: 'electronics' };
const jewelery: Category = { slug: 'jewelery', name: 'jewelery' };

function product(id: number, title: string, category: Category, rate = 4): Product {
  return {
    id,
    title,
    description: `${title} description`,
    price: id * 10,
    imageUrl: `https://images.test/${id}.png`,
    category,
    rating: { rate, count: 100 },
  };
}

export const products: Product[] = [
  product(1, 'SanDisk SSD', electronics, 4.7),
  product(2, 'Acer Monitor', electronics, 4.5),
  product(3, 'WD Hard Drive', electronics, 3.3),
  product(4, 'Gold Bracelet', jewelery, 4.6),
  product(5, 'Silver Ring', jewelery, 3.9),
  product(6, 'Pearl Necklace', jewelery, 2.1),
];

export const featuredIds = [4, 1, 2, 5, 3];

/** Enquiries received by the fake API, so tests can assert on what was sent. */
export const receivedEnquiries: unknown[] = [];

export const handlers = [
  http.get(`${API}/products/featured`, () =>
    HttpResponse.json({
      products: featuredIds.map((id) => products.find((p) => p.id === id)),
    }),
  ),
  http.get(`${API}/categories`, () => HttpResponse.json({ categories: [electronics, jewelery] })),
  http.get(`${API}/categories/:slug`, ({ params }) => {
    const category = [electronics, jewelery].find((c) => c.slug === params.slug);
    if (!category) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Category not found' } },
        { status: 404 },
      );
    }
    const inCategory = products
      .filter((p) => p.category.slug === category.slug)
      .sort((a, b) => b.rating.rate - a.rating.rate);
    return HttpResponse.json({
      category,
      topRated: inCategory.slice(0, 2),
      others: inCategory.slice(2),
    });
  }),
  http.get(`${API}/products`, ({ request }) => {
    const term = new URL(request.url).searchParams.get('search')?.toLowerCase() ?? '';
    return HttpResponse.json({
      products: products.filter((p) => p.title.toLowerCase().includes(term)),
    });
  }),
  http.get(`${API}/products/:id`, ({ params }) => {
    const found = products.find((p) => p.id === Number(params.id));
    return found
      ? HttpResponse.json(found)
      : HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Product not found' } },
          { status: 404 },
        );
  }),
  http.post(`${API}/enquiries`, async ({ request }) => {
    receivedEnquiries.push(await request.json());
    return HttpResponse.json({ enquiryId: 'ref-123' }, { status: 201 });
  }),
];

export const server = setupServer(...handlers);
