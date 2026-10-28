import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  CategoryList,
  CategoryPage,
  EnquiryRequest,
  EnquiryResponse,
  Product,
  ProductList,
} from '@catalogue/shared';
import { apiGet, apiPost } from './client';

/** Data hooks for every screen. Components never call fetch themselves. */

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['products', 'featured'],
    queryFn: ({ signal }) => apiGet<ProductList>('/products/featured', signal),
    select: (data) => data.products,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => apiGet<CategoryList>('/categories', signal),
    select: (data) => data.categories,
  });
}

export function useCategoryPage(slug: string) {
  return useQuery({
    queryKey: ['categories', slug],
    queryFn: ({ signal }) =>
      apiGet<CategoryPage>(`/categories/${encodeURIComponent(slug)}`, signal),
  });
}

export function useProductSearch(term: string) {
  return useQuery({
    queryKey: ['products', 'search', term],
    queryFn: ({ signal }) =>
      apiGet<ProductList>(`/products?${new URLSearchParams({ search: term })}`, signal),
    select: (data) => data.products,
    enabled: term.trim().length > 0,
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: ({ signal }) => apiGet<Product>(`/products/${id}`, signal),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useSubmitEnquiry() {
  return useMutation({
    mutationFn: (enquiry: EnquiryRequest) => apiPost<EnquiryResponse>('/enquiries', enquiry),
  });
}
