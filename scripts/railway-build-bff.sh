#!/bin/bash
set -e

echo "🔧 Generating Prisma Client..."
pnpm --filter @subway/db prisma generate

echo "🗄️  Pushing database schema..."
pnpm --filter @subway/db prisma db push --accept-data-loss

echo "🏗️  Building BFF..."
turbo run build --filter=@subway/bff

echo "✅ Build complete!"
