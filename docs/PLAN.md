# Plan / spec

This is the plan agreed before any code was written. It was used as the spec for the AI coding agent.

## Goal

A proof-of-concept product catalogue that is a **foundation, not a throwaway**. Three things are
called out as expected to change: the product data source, the look and feel, and the email
provider. Each one gets an explicit boundary.

## Stack

- Client: React + TypeScript (Vite, React Router, TanStack Query, Motion for animation)
- Backend: Node.js + TypeScript (Express 5, zod)
- Shared: `packages/shared`, the zod schemas that form the API contract, used by both sides
- Local infra: Docker Compose (api, web via nginx, Mailpit as a local SMTP inbox)

## Architecture

```
Browser ──► web (React) ──/api──► api (Express)
                                    ├─ routes      HTTP only: validate input, map errors
                                    ├─ services    business rules (featured, top rated, search, enquiry)
                                    ├─ ports       ProductRepository, FeaturedProductsProvider, Mailer
                                    └─ adapters    Fake Store (+ cache), env-configured featured list,
                                                   SMTP / console mailer
```

Rules:
- The client never calls Fake Store; it only knows `/api`.
- Routes never call adapters directly; services depend on ports only.
- `server.ts` is the single composition root that picks adapters from config.

## Acceptance criteria → design

| Criterion | Endpoint | Notes |
|---|---|---|
| Home: 5 chosen "top rated" products | `GET /api/products/featured` | Curated IDs from config (`FEATURED_PRODUCT_IDS`); falls back to highest rated if unset |
| Category: top rated + additional | `GET /api/categories/:slug` | Top N by rating (`CATEGORY_TOP_RATED_COUNT`, default 3), then the rest |
| Search | `GET /api/products?search=term` | Case-insensitive match on title, description, category |
| Product page | `GET /api/products/:id` | |
| Enquiry → sales email + thank you | `POST /api/enquiries` | zod validation, honeypot, rate limit, HTML-escaped email |

## Quality bar

- Validation at the API boundary, central error handler, no upstream details leaked
- helmet, body size limit, rate limit on enquiries
- Timeout + TTL cache on Fake Store
- Loading / empty / error states, accessible forms, `prefers-reduced-motion` respected
- Tests: services (with in-memory fakes), routes (supertest), adapter mapping, key web flows (Testing Library + MSW)
- CI: typecheck, lint, test

## Phases

1. Scaffold monorepo, tooling, Docker Compose, CI
2. API: ports, adapters, services, routes, tests
3. Web: API client, pages, theme tokens, motion, tests
4. Review, hardening, end-to-end run
5. README, DECISIONS.md, AI_USAGE.md, PR description

Stretch (only if time allows): a lazy-loaded Three.js hero, behind a flag, on the home page only.
