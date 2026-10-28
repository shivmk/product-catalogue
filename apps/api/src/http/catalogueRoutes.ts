import { Router } from 'express';
import { z } from 'zod';
import type { CategoryList, CategoryPage, Product, ProductList } from '@catalogue/shared';
import { SearchQuerySchema } from '@catalogue/shared/schemas';
import type { CatalogueService } from '../services/CatalogueService.js';
import { parseOrThrow } from './validation.js';

const ProductIdParams = z.object({
  id: z.coerce.number().int().positive('Product id must be a positive number'),
});
const CategoryParams = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,64}$/, 'Invalid category'),
});

export function catalogueRoutes(catalogue: CatalogueService): Router {
  const router = Router();

  router.get('/categories', async (_req, res) => {
    const categories = await catalogue.listCategories();
    res.json({ categories } satisfies CategoryList);
  });

  router.get('/categories/:slug', async (req, res) => {
    const { slug } = parseOrThrow(CategoryParams, req.params);
    res.json((await catalogue.getCategoryPage(slug)) satisfies CategoryPage);
  });

  // Registered before /products/:id so "featured" is not read as an id.
  router.get('/products/featured', async (_req, res) => {
    const products = await catalogue.getFeaturedProducts();
    res.json({ products } satisfies ProductList);
  });

  /** GET /products lists everything; GET /products?search=term filters. */
  router.get('/products', async (req, res) => {
    if (req.query.search === undefined) {
      res.json({ products: await catalogue.listProducts() } satisfies ProductList);
      return;
    }
    const { search } = parseOrThrow(SearchQuerySchema, req.query, 'Search term is invalid');
    res.json({ products: await catalogue.searchProducts(search) } satisfies ProductList);
  });

  router.get('/products/:id', async (req, res) => {
    const { id } = parseOrThrow(ProductIdParams, req.params);
    res.json((await catalogue.getProduct(id)) satisfies Product);
  });

  return router;
}
