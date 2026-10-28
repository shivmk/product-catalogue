import { z } from 'zod';

/*
 * API contract shared by the web client and the API.
 * Change a shape here first; TypeScript then points at every place on both sides that must follow.
 */

export const CategorySchema = z.object({
  slug: z.string(),
  name: z.string(),
});
export type Category = z.infer<typeof CategorySchema>;

export const ProductSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  description: z.string(),
  price: z.number().nonnegative(),
  imageUrl: z.url(),
  category: CategorySchema,
  rating: z.object({
    rate: z.number().min(0).max(5),
    count: z.number().int().nonnegative(),
  }),
});
export type Product = z.infer<typeof ProductSchema>;

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

export const SEARCH_TERM_MAX_LENGTH = 100;

export const SearchQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .min(1, 'Enter a search term')
    .max(
      SEARCH_TERM_MAX_LENGTH,
      `Search terms can be at most ${SEARCH_TERM_MAX_LENGTH} characters`,
    ),
});

export const EnquiryRequestSchema = z.object({
  productId: z.number().int().positive(),
  name: z.string().trim().min(1, 'Please enter your name').max(100, 'Name is too long'),
  email: z.email('Please enter a valid email address').max(254),
  phone: z
    .string()
    .trim()
    .max(30, 'Phone number is too long')
    .regex(/^[+\d\s()-]*$/, 'Phone number can only contain digits, spaces and + ( ) -')
    .optional(),
  message: z.string().trim().max(2000, 'Message is too long (2000 characters max)').optional(),
  /** Honeypot: hidden from people, so only bots fill it in. */
  website: z.string().optional(),
});
export type EnquiryRequest = z.infer<typeof EnquiryRequestSchema>;

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
