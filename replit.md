# Portal PFVL

Portal financeiro público do PFVL com conteúdo, comunidade, roadmap de sugestões, indicadores e central de ajuda.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run seed` — idempotently add public demo content
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/portal-pfvl` — React/Vite public website
- `artifacts/api-server/src/routes/pfvl.ts` — read-only PFVL API
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `lib/db/src/schema/pfvl.ts` — PostgreSQL content schema
- `DEPLOYMENT.md` — Vercel, Neon, indicators, and R2 setup notes

## Architecture decisions

- The frontend and Express API are served from the same Vercel project; `DATABASE_URL` points to Neon in production.
- The current release exposes only GET endpoints; mutation and upload routes are intentionally absent until authentication is configured.
- The indicator API returns clearly marked illustrative examples when no PFVL provider URL is configured.

## Product

Responsive Portuguese-language pages for the PFVL home dashboard, published blog/news, searchable community topics and existing comments, public suggestions roadmap, economic indicators, and help center.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Vercel deployments use the repository root and configuration in `vercel.json`; `DATABASE_URL` must be the Neon connection string in that environment.
- Never describe the fallback indicator values as current or PFVL-sourced.
- Do not expose content-management or upload endpoints before authentication is in place.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
