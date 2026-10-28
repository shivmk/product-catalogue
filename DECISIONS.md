# Decisions and assumptions

## Assumptions where the acceptance criteria were unclear

| #   | Criterion                                                                    | Gap                                                      | Assumption                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Where it lives                         |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1   | Home: _"GIVEN I have chosen 5 products to be top rated"_                     | Who chooses, and how? Fake Store has no "featured" flag. | **The business chooses them.** It is a merchandising decision, not a property of the product data, so it gets its own port (`FeaturedProductsProvider`), separate from the product source. Today it reads `FEATURED_PRODUCT_IDS` from config; later an admin screen or CMS implements the same interface. Products are shown **in the chosen order**. If an id no longer exists it is skipped rather than breaking the home page. If none are configured, it falls back to the 5 highest rated. | `CatalogueService.getFeaturedProducts` |
| 2   | Category: _"top rated products for that category … AND additional products"_ | Chosen by hand or computed? How many?                    | Nobody is choosing per-category products in this brief, so **top rated = highest `rating.rate`** (ties broken by number of ratings). The top 3 (configurable) are "Top rated" and the rest are "More in …".                                                                                                                                                                                                                                                                                     | `CatalogueService.getCategoryPage`     |
| 3   | Search: _"only see products that have text matching that search term"_       | Which fields? Partial words? Several words?              | Case-insensitive, over **title, description and category**. **Every word** of the term must match the **start of a word** in the product, so "jack" finds "jacket" and "jacket mens" works in any order, but "mens" doesn't match "womens" (a plain substring match would). Accents and apostrophes are ignored ("mens" finds "men's"). An empty search is rejected in the UI and the API. The term goes in the URL (`/search?q=`) so results can be shared and work with the back button.      | `domain/productQueries.ts`             |
| 4   | Search runs _"WHEN I click the search button"_                               | Search as you type?                                      | No. Search runs on submit (button or Enter), exactly as written. That's one request per search, and no debounce logic to maintain.                                                                                                                                                                                                                                                                                                                                                              | `SearchBar.tsx`                        |
| 5   | Enquiry: _"complete the subsequent form with my contact details"_            | Which fields?                                            | **Name and email required**; phone and message optional. The product is attached automatically. The form opens **inline** on the product page instead of a modal or new page: it's simpler, accessible by default, and keeps the product in view.                                                                                                                                                                                                                                               | `EnquiryRequestSchema`                 |
| 6   | Enquiry: _"the sales inbox will receive an email"_                           | Which inbox? A real provider?                            | The inbox is configured (`SALES_INBOX`). Locally, **Mailpit** is a real SMTP server with a web inbox, so the reviewer can see the email arrive without any accounts. The email includes a product link, a reference, and **Reply-To set to the customer**, so sales can just hit reply.                                                                                                                                                                                                         | `EnquiryService`, `enquiryEmail.ts`    |
| 7   | Enquiry: _"the customer will see a Thank you message"_                       | Should the customer also get an email?                   | No. Only the sales inbox is in the criteria. The thank-you message shows a reference number. A customer confirmation email is listed under "next".                                                                                                                                                                                                                                                                                                                                              | `EnquiryForm.tsx`                      |
| 8   | Product data                                                                 | Currency, images                                         | Fake Store prices are treated as **USD**. **Product images load directly from Fake Store's image host.** I read "do not call the Fake Store API from the client" as covering product _data_, which always goes through our API. Images are static assets referenced by URL, and the CSP allows only that host. A real catalogue would serve images from its own CDN.                                                                                                                            | `lib/format.ts`, `nginx.conf`          |
| 9   | Who uses it                                                                  | Accounts, cart, checkout                                 | None. The MVP is browse + enquire, and anonymous enquiries are fine.                                                                                                                                                                                                                                                                                                                                                                                                                            | —                                      |

## Requirements dropped or simplified, and why

- **No pagination.** Fake Store has 20 products. The API returns arrays wrapped in an object
  (`{ products }`), so pagination fields (`nextCursor`, `total`) can be added later without breaking clients.
- **Filtering happens in memory.** Fake Store can only return the whole catalogue (and returns
  200 with an empty body for unknown ids, which I confirmed by calling it). The adapter fetches it
  once, caches it (5 minutes, single-flight, serving the last good copy if a refresh fails) and
  answers every query from that snapshot. Search and category filtering sit _behind the
  `ProductRepository` interface_, so a real database or search index can do them natively.
- **No persistence of enquiries.** The email is the record for now. Each enquiry gets a reference id
  that appears in both the email and the thank-you message, ready for when it's stored.
- **Email is sent inside the request.** If SMTP is down the customer gets a clear "try again"
  message (502) rather than a false "thank you". That's the right call without a queue; with more
  volume I'd store the enquiry and send asynchronously (see "next").
- **Spam protection is basic:** a honeypot field (bots get a fake success) plus rate limiting
  (5 per 15 minutes per IP). No CAPTCHA: it would add friction and a third-party account.
- **No Three.js.** It was considered for a richer hero. I chose not to, because the brief says the
  look and feel is being created by someone else, and 3D work now would be thrown away when that
  arrives. Instead: Motion animations (staggered grids, hover lift, animated thank-you check) and a
  CSS gradient hero, all of which honour `prefers-reduced-motion`. A 3D hero could still be added
  later as one lazy-loaded component behind a flag.
- **No end-to-end browser tests (Playwright).** The web tests render the whole app with real
  routing and data hooks against a fake API at the network level, which covers every acceptance
  criterion in about 1.5 seconds. I also checked the full Docker stack by hand, including the email
  arriving in Mailpit and screenshots at desktop and phone widths. One Playwright smoke test would be
  my first addition.
- **No infrastructure as code.** Constraint 3 only applies _if_ infra is included. The Dockerfiles
  are AWS-ready, but writing CDK/Terraform for a PoC that isn't being deployed felt like the wrong
  use of the time box.

## How the design supports growth beyond the PoC

| Expected change                                   | What changes                                                                                                                                                     | What does not                                                                                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Product data source** (database, Shopify, PIM…) | Add one adapter implementing `ProductRepository` and construct it in `server.ts`.                                                                                | Services, routes, the web app and the API contract. `InMemoryProductRepository` already proves a second implementation works (the tests use it). |
| **Email provider** (SES, SendGrid, Postmark)      | Any SMTP-compatible provider is **config only** (`SMTP_*`). For an HTTP API provider, add one class implementing `Mailer`.                                       | `EnquiryService` and the email template.                                                                                                         |
| **Look and feel**                                 | `theme/tokens.css` (colours, type, spacing, radii, shadows; light and dark), then component CSS modules as needed.                                               | Data hooks, routing, behaviour and tests (the tests query by role and label, not by class names, so a restyle doesn't break them).               |
| **Who picks featured products**                   | A new `FeaturedProductsProvider` (admin UI, CMS, A/B test).                                                                                                      | Everything else.                                                                                                                                 |
| **Mobile app**                                    | It would use the same `/api` and the same shared contract.                                                                                                       | The API.                                                                                                                                         |
| **Hosting on AWS**                                | API image → ECS Fargate or App Runner; web build → S3 + CloudFront (route `/api/*` to the API); SES via SMTP config; secrets in SSM/Secrets Manager as env vars. | Code. Config is already 12-factor, validated at startup, and fails fast.                                                                         |

Guard rails that keep this true as the code grows: `CLAUDE.md` states the layering rules for AI
agents (and humans); `packages/shared` makes contract drift a compile error; and CI blocks merges
on typecheck, lint, format, tests and the Docker build.

## Notable technical choices

- **Dependency versions:** latest stable everywhere, with three deliberate exceptions:
  **TypeScript 6.0** (typescript-eslint doesn't support TS 7 yet), **React Router 7** and
  **MSW 2**. The newest majors of those two had just come out; I picked the versions whose APIs I
  can stand behind in a review.
- **The zod schemas are a separate entry point** (`@catalogue/shared/schemas`), and the enquiry form
  is lazy-loaded. zod is about 90 kB gzipped when bundled whole, so the browser now downloads it
  only when someone clicks **Enquire** (that chunk is 26 kB gzipped).
- **The server looks the product up for the enquiry email**, instead of trusting a product title
  sent by the browser.
- **No personal data in logs.** Logs carry the enquiry reference and product id only.
- **Security basics:** helmet; a CSP and frame-blocking headers on the web server; 10 kB JSON
  body limit; validation on every input including query params and env vars; HTML-escaping of
  customer input in the email; non-root containers; `console` mail transport refused in production.

## What I'd do next with another day

1. **Store enquiries and send email asynchronously** (outbox table or SQS + worker) with retries,
   plus a confirmation email to the customer.
2. **One Playwright smoke test** against `docker compose up` (browse → enquire → assert the email
   in the Mailpit API), run in CI.
3. **Real product source spike:** pick the likely platform and write its adapter; add pagination
   and push search down to it.
4. **Observability:** request ids propagated into logs and the error body, a `/ready` check that
   covers the product source, and basic metrics (enquiries sent and failed).
5. **Frontend performance:** `LazyMotion` and route-level code splitting (main chunk is about 160 kB
   gzipped), responsive images once we own the image CDN.
6. **Accessibility audit** with axe in CI, and a manual pass with VoiceOver.
7. **Deploy** a preview environment on AWS (CDK) so the entrepreneur can try it without Docker.
