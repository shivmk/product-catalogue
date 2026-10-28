# Product Catalogue: proof of concept

A product catalogue where customers browse featured products, explore categories, search, view
product details and send an enquiry that lands in the sales inbox.

It is built as a **foundation rather than a throwaway prototype**. The three things the brief says
will change (the product data source, the look and feel, and the email provider) each sit behind
their own boundary, so each can be swapped without touching the rest.

> **Quick start:** with Docker running, one command starts everything (web app, API and a local
> email inbox):
>
> ```bash
> docker compose up --build
> ```
>
> Then open **http://localhost:8080**. Full steps are in [Run it with Docker](#run-it-with-docker).

![Home page](docs/screenshots/home.png)

| Document                     | What's in it                                                           |
| ---------------------------- | ---------------------------------------------------------------------- |
| [DECISIONS.md](DECISIONS.md) | Assumptions, cuts, how the design grows, what I'd do next              |
| [AI_USAGE.md](AI_USAGE.md)   | Tools, prompts, where the AI got things wrong and how it was caught    |
| [docs/PLAN.md](docs/PLAN.md) | The plan/spec written before any code                                  |
| [CLAUDE.md](CLAUDE.md)       | Instructions for the AI coding agent (architecture rules, conventions) |

## Run it with Docker

This takes about 3 minutes, most of it the first image build. No accounts, API keys or `.env` file
are needed.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (macOS/Windows), or Docker
  Engine with the Compose v2 plugin (Linux). Check with `docker compose version`.
- Docker must be **running**.
- Ports **8080**, **3000** and **8025** must be free.
- Internet access: the API fetches product data from fakestoreapi.com.

### Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/shivmk/product-catalogue.git
   cd product-catalogue
   ```

2. Build and start everything:

   ```bash
   docker compose up --build
   ```

   This starts three containers: `api` (Node.js), `web` (nginx serving the React app and
   proxying `/api`) and `mailpit` (the local email inbox). Once `web` has started, the app is
   ready. The web container waits for the API's health check.

3. Open the app:

   | What                      | URL                              |
   | ------------------------- | -------------------------------- |
   | Web app                   | http://localhost:8080            |
   | **Sales inbox** (Mailpit) | http://localhost:8025            |
   | API health check          | http://localhost:3000/api/health |

4. Try the enquiry flow: open any product → **Enquire** → fill in your name and email → **Send
   enquiry**. You'll see the "Thank you" message, and the email appears in the sales inbox at
   http://localhost:8025.

### Stopping and other useful commands

```bash
docker compose up --build -d   # start in the background instead
docker compose logs -f api     # follow the API logs
docker compose down            # stop and remove the containers
```

### Configuration (optional)

Defaults work out of the box. To change something (for example which products are featured on the
home page), copy the example file, edit it, and restart:

```bash
cp .env.example .env
docker compose up --build
```

### Troubleshooting

| Problem                                         | Fix                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `port is already allocated`                     | Another app is using 8080, 3000 or 8025. Stop it, or change the left-hand port in `docker-compose.yml`. |
| `Cannot connect to the Docker daemon`           | Start Docker Desktop and try again.                                                                     |
| The app loads but shows "We couldn't load this" | The API couldn't reach fakestoreapi.com. Check your internet connection, then click **Try again**.      |

### Run without Docker (for development)

Requires Node.js 22+.

```bash
npm install
npm run dev        # API on :3000, web on :5173 (Vite proxies /api to the API)
```

By default the API logs emails to the console instead of sending them (`MAIL_TRANSPORT=console`).
To get real emails locally, run only the inbox with `docker compose up mailpit` and set
`MAIL_TRANSPORT=smtp` in `.env`.

## Test

```bash
npm test             # all tests (API + web), about 3 seconds
npm run typecheck
npm run lint
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, format check, tests, the production build
and `docker compose build` on every pull request.

| Suite                                       | What it covers                                                                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/test/app.test.ts`                 | Every endpoint over HTTP (supertest): happy paths, 400/404/429/502, malformed JSON, no leaked upstream details                     |
| `apps/api/test/*Service.test.ts`            | Business rules with in-memory fakes: featured order and fallback, category top-rated split, enquiry email, HTML escaping, honeypot |
| `apps/api/test/productQueries.test.ts`      | Search matching rules (incl. the "mens" vs "womens" regression)                                                                    |
| `apps/api/test/FakeStore…test.ts`           | Adapter mapping, caching, upstream failures, unexpected response shape                                                             |
| `apps/api/test/cachedLoader.test.ts`        | TTL, single-flight, stale-on-error                                                                                                 |
| `apps/web/test/acceptanceCriteria.test.tsx` | One `describe` per acceptance criterion, driving the real app (routes, hooks, components) against a fake API (MSW)                 |

## Stack and why

| Layer   | Choice                                                              | Why                                                                                                                                                                                                                           |
| ------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client  | **React + TypeScript** (Vite, React Router, TanStack Query, Motion) | A web app is the fastest way for the entrepreneur to try the PoC (just a link, no simulator or app store). TanStack Query handles caching, loading and error states; Motion adds polish and respects reduced-motion settings. |
| Backend | **Node.js + TypeScript** (Express 5, zod)                           | One language end to end, so the API contract is **shared code** (`packages/shared`), not a document that drifts. Express is boring and well known, so any future developer can pick it up.                                    |
| Infra   | Docker Compose (nginx, Mailpit)                                     | One command to run. Containers map directly onto AWS (ECS/App Runner for the API, S3 + CloudFront for the web build, SES for email).                                                                                          |

## Architecture

```
 Browser                      web (nginx)                     api (Express)
┌───────────────┐   /api/*   ┌───────────────┐   proxy   ┌───────────────────────────────────────────┐
│ React app     │──────────► │ static files  │─────────► │ http/      routes: validate, map errors   │
│  api/client   │            │ + /api proxy  │           │ services/  business rules                  │
│  (only knows  │            │ + CSP headers │           │ ports/     ProductRepository               │
│   /api)       │            └───────────────┘           │            FeaturedProductsProvider        │
└───────────────┘                                        │            Mailer                          │
                                                         │ adapters/  FakeStore ──► fakestoreapi.com  │
                                                         │            SmtpMailer ──► Mailpit / SMTP   │
                                                         │ server.ts  composition root (picks adapters)│
                                                         └───────────────────────────────────────────┘
```

- The browser never calls Fake Store. All product data goes through our API.
- **Services depend on interfaces (ports), never on Fake Store or nodemailer.** `server.ts` is the
  only file that knows which adapters are in use.
- **The API contract lives in `packages/shared`.** Both sides import the same types, and the web
  enquiry form validates with the same zod schema the API uses.
- **Look and feel lives in `apps/web/src/theme/tokens.css`.** Components only use CSS variables, so
  a new brand starts as a change to one file (light and dark themes included).

### API

| Method | Path                        | Response                                                  |
| ------ | --------------------------- | --------------------------------------------------------- |
| GET    | `/api/products/featured`    | `{ products }`: the chosen "top rated" products, in order |
| GET    | `/api/categories`           | `{ categories: [{ slug, name }] }`                        |
| GET    | `/api/categories/:slug`     | `{ category, topRated, others }`                          |
| GET    | `/api/products?search=term` | `{ products }` matching the term                          |
| GET    | `/api/products/:id`         | `Product`                                                 |
| POST   | `/api/enquiries`            | `201 { enquiryId }`; emails the sales inbox               |

Errors always look like `{ "error": { "code", "message", "fields"? } }`, with codes
`VALIDATION_FAILED` (400), `NOT_FOUND` (404), `RATE_LIMITED` (429) and `UPSTREAM_UNAVAILABLE` (502).

### Project layout

```
apps/api/src
  config.ts            env vars, validated with zod (fails fast on bad config)
  server.ts            composition root
  http/                Express app, routes, error mapping
  services/            CatalogueService, EnquiryService, enquiry email template
  ports/               interfaces the services depend on
  adapters/            Fake Store (+ cache), featured list, SMTP / console mailer, in-memory repo
  domain/              search and category helpers
apps/web/src
  api/                 fetch client + data hooks (the only code that talks to the API)
  pages/               Home, Category, Search, Product, NotFound
  components/          Layout, SearchBar, ProductCard/Grid, EnquiryForm, …
  theme/               design tokens + global styles
packages/shared        API contract: types, constants, zod schemas
```

## Configuration

Everything is optional; see [`.env.example`](.env.example) for the full list. The most useful:

| Variable                                              | Default                      | Purpose                                                                      |
| ----------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------- |
| `FEATURED_PRODUCT_IDS`                                | `1,5,9,13,18`                | The products chosen as "top rated" on the home page, in order                |
| `CATEGORY_TOP_RATED_COUNT`                            | `3`                          | Size of the "Top rated" section on category pages                            |
| `SALES_INBOX`                                         | `sales@example.com`          | Where enquiry emails go                                                      |
| `MAIL_TRANSPORT`                                      | `console` (`smtp` in Docker) | `smtp` sends real email; `console` logs it (dev only, refused in production) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Mailpit                      | Any SMTP provider (SES, SendGrid, …) works without code changes              |

## Time spent

See the time breakdown in [AI_USAGE.md](AI_USAGE.md#time-spent).
