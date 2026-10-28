# Agent instructions

Product catalogue proof of concept. Read `docs/PLAN.md` for the spec and `DECISIONS.md` for recorded assumptions.

## Layout

- `apps/api`: Express 5 + TypeScript backend
- `apps/web`: React + Vite frontend
- `packages/shared`: zod schemas / types shared by both (the API contract)

## Architecture rules (do not break these)

- The web app must never call the Fake Store API (or any product source) directly. It only talks to `/api`.
- API layering: `routes` → `services` → `ports` (interfaces). Adapters implement ports and are wired up only in `apps/api/src/server.ts`.
- Services must not import adapters. Routes must not import adapters.
- New external providers (data source, email, etc.) are added as a new adapter behind an existing port, selected by config.
- Request/response shapes live in `packages/shared`. Change the schema there first, then both sides.
- Styling uses the design tokens in `apps/web/src/theme/tokens.css`. Don't hard-code colours or spacing in components.

## Conventions

- TypeScript strict mode, ES modules, no `any`.
- Validate all external input with zod (HTTP bodies, query params, env vars, upstream API responses).
- Errors: throw the typed errors from `apps/api/src/errors.ts`; the error middleware maps them to HTTP responses. Never send upstream error details or stack traces to clients.
- Don't log personal data (customer names, emails, phone numbers).
- Never commit secrets. New config goes in `.env.example` with a safe default.

## Commands

- `npm install`: install all workspaces
- `npm run dev`: run api + web locally (needs an SMTP server, or `MAIL_TRANSPORT=console`)
- `npm test`: all tests
- `npm run typecheck` / `npm run lint`
- `docker compose up --build`: full stack including the Mailpit inbox

Before finishing a change: run `npm run typecheck && npm run lint && npm test`.
