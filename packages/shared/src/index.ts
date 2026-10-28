/*
 * API contract shared by the web client and the API: types and constants only (no runtime deps).
 * The zod schemas these types come from live in "@catalogue/shared/schemas".
 */

import type { Category, Product } from './schemas.js';

export type { Category, EnquiryRequest, Product } from './schemas.js';
export { SEARCH_TERM_MAX_LENGTH } from './constants.js';

export interface ProductList {
  products: Product[];
}

export interface CategoryList {
  categories: Category[];
}

export interface CategoryPage {
  category: Category;
  topRated: Product[];
  others: Product[];
}

export interface EnquiryResponse {
  enquiryId: string;
}

export interface ApiErrorBody {
  error: {
    code: 'VALIDATION_FAILED' | 'NOT_FOUND' | 'UPSTREAM_UNAVAILABLE' | 'RATE_LIMITED' | 'INTERNAL';
    message: string;
    fields?: Record<string, string>;
  };
}
