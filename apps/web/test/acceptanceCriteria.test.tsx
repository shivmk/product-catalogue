import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderApp } from './renderApp';
import { API, receivedEnquiries, server } from './server';

/* One describe block per acceptance criterion in the brief. */

describe('Home page: shows the 5 chosen "top rated" products', () => {
  it('shows exactly the featured products, in the chosen order', async () => {
    renderApp('/');

    const list = await screen.findByRole('list', { name: 'Top rated products' });
    const titles = within(list)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(titles).toEqual([
      'Gold Bracelet',
      'SanDisk SSD',
      'Acer Monitor',
      'Silver Ring',
      'WD Hard Drive',
    ]);
  });
});

describe('Category page: top rated plus additional products', () => {
  it('opens from a category link and shows both sections', async () => {
    const { user, router } = renderApp('/');

    const nav = screen.getByRole('navigation', { name: 'Categories' });
    await user.click(await within(nav).findByRole('link', { name: 'Jewelery' }));

    expect(router.state.location.pathname).toBe('/categories/jewelery');
    const topRated = await screen.findByRole('list', { name: 'Top rated in Jewelery' });
    expect(
      within(topRated)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Gold Bracelet', 'Silver Ring']);
    const more = screen.getByRole('list', { name: 'More in Jewelery' });
    expect(
      within(more)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Pearl Necklace']);
  });

  it('shows a not found message for an unknown category', async () => {
    renderApp('/categories/garden');
    expect(await screen.findByRole('heading', { name: 'Category not found' })).toBeInTheDocument();
  });
});

describe('Search: only products matching the term', () => {
  it('searches when the Search button is clicked', async () => {
    const { user, router } = renderApp('/');

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'drive');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(router.state.location.pathname).toBe('/search');
    expect(router.state.location.search).toBe('?q=drive');
    const results = await screen.findByRole('list', { name: 'Search results for drive' });
    expect(
      within(results)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['WD Hard Drive']);
    expect(screen.getByRole('status')).toHaveTextContent('1 product found');
  });

  it('says so when nothing matches', async () => {
    renderApp('/search?q=zzz');
    expect(
      await screen.findByRole('heading', { name: 'No products match “zzz”' }),
    ).toBeInTheDocument();
  });

  it('does not search for a blank term', async () => {
    const { user, router } = renderApp('/');

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), '   ');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a word to search for.');
  });
});

describe('Product page: clicking a tile shows the details', () => {
  it('navigates from a product tile to its details page', async () => {
    const { user, router } = renderApp('/');

    const list = await screen.findByRole('list', { name: 'Top rated products' });
    await user.click(within(list).getByRole('link', { name: 'SanDisk SSD' }));

    expect(router.state.location.pathname).toBe('/products/1');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'SanDisk SSD' }),
    ).toBeInTheDocument();
    expect(screen.getByText('$10.00')).toBeInTheDocument();
    expect(screen.getByText('SanDisk SSD description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enquire' })).toBeInTheDocument();
  });

  it('shows a not found message for an unknown product', async () => {
    renderApp('/products/999');
    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument();
  });
});

describe('Enquiry: submit contact details, sales gets an email, customer sees thank you', () => {
  async function openEnquiryForm() {
    const app = renderApp('/products/4');
    await app.user.click(await screen.findByRole('button', { name: 'Enquire' }));
    // The form is lazy-loaded, so wait for it like a user would.
    expect(
      await screen.findByRole('form', { name: 'Enquire about this product' }),
    ).toBeInTheDocument();
    return app;
  }

  it('submits the form and shows a thank you message', async () => {
    const { user } = await openEnquiryForm();

    await user.type(screen.getByLabelText('Name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText(/Message/), 'Is this real gold?');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByRole('heading', { name: 'Thank you' })).toBeInTheDocument();
    expect(screen.getByText(/Reference: ref-123/)).toBeInTheDocument();
    expect(receivedEnquiries).toEqual([
      {
        productId: 4,
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        message: 'Is this real gold?',
      },
    ]);
  });

  it('shows field errors and sends nothing when the form is invalid', async () => {
    const { user } = await openEnquiryForm();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(screen.getByText('Please enter your name')).toBeInTheDocument();
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveFocus();
    expect(receivedEnquiries).toEqual([]);
  });

  it('keeps the form and explains when the email cannot be sent', async () => {
    server.use(
      http.post(`${API}/enquiries`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'UPSTREAM_UNAVAILABLE',
              message: 'Email could not be sent. Please try again shortly.',
            },
          },
          { status: 502 },
        ),
      ),
    );
    const { user } = await openEnquiryForm();

    await user.type(screen.getByLabelText('Name'), 'Ada');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email could not be sent. Please try again shortly.',
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Ada');
  });

  it('shows server errors about fields not on the form (e.g. the product was removed)', async () => {
    server.use(
      http.post(`${API}/enquiries`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Enquiry is for an unknown product',
              fields: { productId: 'This product no longer exists' },
            },
          },
          { status: 400 },
        ),
      ),
    );
    const { user } = await openEnquiryForm();

    await user.type(screen.getByLabelText('Name'), 'Ada');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enquiry is for an unknown product');
  });
});

describe('When the API is down', () => {
  it('shows an error with a retry button instead of a blank page', async () => {
    server.use(
      http.get(`${API}/products/featured`, () =>
        HttpResponse.json(
          { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Product source is unavailable.' } },
          { status: 502 },
        ),
      ),
    );
    renderApp('/');

    expect(await screen.findByRole('alert')).toHaveTextContent('Product source is unavailable.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
