# Quick 500 Error Fix

## The Problem
Getting a 500 error when loading the map, showing 0 stores.

## Quick Fix Steps

### 1. Start the BFF Server
```bash
pnpm -C apps/bff dev
```

### 2. Start the Database
```bash
docker compose -f infra/docker/compose.dev.yaml up -d
```

### 3. Setup Database
```bash
pnpm -C packages/db prisma:generate
pnpm -C packages/db prisma:migrate
pnpm -C packages/db prisma:seed
```

### 4. Test the Fix
Visit: http://localhost:3002/stores/map

The API Debugger in the top-right corner will show if it's working.

## Expected Result
- Health check: ✅ Status 200
- Stores endpoint: ✅ Returns array with ~8 stores
- Map shows store markers

## Still Not Working?
Check the browser console for detailed error logs.