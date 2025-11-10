#!/bin/bash
# Environment Sync Script
# Syncs the root .env file to all apps

echo "🔄 Syncing environment variables..."

# Copy to BFF
cp .env apps/bff/.env
echo "✅ Synced to apps/bff/.env"

# Copy to Admin
cp .env apps/admin/.env.local
echo "✅ Synced to apps/admin/.env.local"

# Update packages/db (remove quotes from DATABASE_URL)
grep DATABASE_URL .env > packages/db/.env
echo "✅ Synced to packages/db/.env"

echo ""
echo "🎉 All environment files synced!"
echo ""
echo "⚠️  Remember to restart your apps:"
echo "   pnpm dev"
