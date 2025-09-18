# Architecture Lock (Do Not Change Without ADR)
**Status:** LOCKED  
**Purpose:** Prevent unapproved changes to stack/ops and avoid “doom loops”.

## Non-Negotiables (Current Implementation)
- Frontend (Admin): Next.js (App Router) + TypeScript
- Backend (BFF): NestJS (REST), Node 20
- DB: Postgres (Docker compose) via Prisma; run prisma from `packages/db`
- Auth (dev): Supabase email/password (Auth.js later via ADR)
- Validation/Contracts: Zod (where applicable)
- Caching/Jobs: Redis via compose (queues require ADR)
- Files: S3-compatible (R2/minio) — not yet enabled
- Hosting targets: Admin → Vercel; BFF → Fly.io/Render (finalize via ADR)
- Observability: Sentry (FE/BE) + structured logs (ADR later for OTel)
- CI/CD: GitHub Actions (lint, typecheck, build); deploy on main
- Security: OWASP top-10 checks; env via GitHub/Vercel secrets

## Folder Boundaries
- `apps/admin` — Admin UI + routes (Server Components preferred)
- `apps/bff` — NestJS API gateway (REST)
- `packages/db` — Prisma schema & client
- `packages/ui` — shared UI components
- `packages/config` — tsconfig/eslint/shared config
- `infra/` — IaC, compose, workflows
- `docs/` — architecture, ADRs
- Tests colocated + `/tests/e2e` (Playwright planned)

## Operational Invariants
- Single dev entry: `pnpm -w run dev:all` (Admin :3002, BFF :3001, DB :5432).
- Do **not** run a separate Postgres when compose DB is up.
- Admin → BFF URL (dev): `NEXT_PUBLIC_BFF_URL=http://127.0.0.1:3001`.
- Prisma commands: run from `packages/db` (or `-C packages/db`) with `prisma/schema.prisma`.

## Change Control
All deviations require an ADR in `docs/adr/` with approver sign-off (CODEOWNERS).
