
SHELL:=/bin/bash
.PHONY: up down db.migrate db.seed dev smoke
up: ; docker compose -f infra/docker/compose.dev.yaml up -d --build
down: ; docker compose -f infra/docker/compose.dev.yaml down -v
db.migrate: ; pnpm -C packages/db prisma:migrate && pnpm -C packages/db prisma:generate
db.seed: ; pnpm -C packages/db prisma:seed
dev:
	corepack enable
	pnpm install
	make up
	pnpm -C packages/db prisma:migrate
	pnpm -C packages/db prisma:seed
	pnpm -C apps/bff dev & pnpm -C apps/admin dev
smoke: ; node scripts/smoke.mjs
