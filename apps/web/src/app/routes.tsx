import type { RouteObject } from 'react-router';
import { Layout } from '../components/Layout';
import { HomePage } from '../pages/HomePage';
import { CategoryPage } from '../pages/CategoryPage';
import { SearchPage } from '../pages/SearchPage';
import { ProductPage } from '../pages/ProductPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/categories/:slug', element: <CategoryPage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/products/:id', element: <ProductPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
