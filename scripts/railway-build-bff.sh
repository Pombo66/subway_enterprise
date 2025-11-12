#!/bin/bash
set -e

echo "🔧 Generating Prisma Client..."
pnpm --filter @subway/db exec prisma generate

echo "🗄️  Running Prisma Migrations..."
pnpm --filter @subway/db exec prisma migrate deploy || \
pnpm --filter @subway/db exec prisma db push --accept-data-loss

echo "🏗️  Building BFF..."
turbo run build --filter=@subway/bff

echo "✅ Build complete!"
