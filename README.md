# Subway Enterprise Baseline

[![CI](https://github.com/subway-enterprise/subway-enterprise/actions/workflows/ci.yml/badge.svg)](https://github.com/subway-enterprise/subway-enterprise/actions/workflows/ci.yml)

## Run order (after files are generated)
1) corepack enable && pnpm install
2) docker compose -f infra/docker/compose.dev.yaml up -d
3) pnpm -C packages/db prisma:generate && pnpm -C packages/db prisma:migrate && pnpm -C packages/db prisma:seed
4) pnpm -C apps/bff dev   (http://localhost:3001/healthz)
5) pnpm -C apps/admin dev (http://localhost:3002/dashboard)
