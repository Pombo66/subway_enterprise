# API 500 Error Troubleshooting Guide

## Issue Description
Getting a network 500 error when trying to fetch stores data, resulting in:
```json
{
  "viewport": {
    "latitude": 42.464074,
    "longitude": -45.545064,
    "zoom": 2.1
  },
  "filters": {},
  "selectedStoreId": null,
  "storeCount": 0,
  "activeStoreCount": 0
}
```

## Debugging Steps

### 1. Check BFF Server Status
The admin app tries to connect to the BFF at `http://localhost:3001` by default.

**Verify BFF is running:**
```bash
# From workspace root
pnpm -C apps/bff dev
```

**Check if BFF is accessible:**
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

### 2. Check Database Connection
The BFF needs a PostgreSQL database connection.

**Verify database is running:**
```bash
# Start Docker containers
docker compose -f infra/docker/compose.dev.yaml up -d
```

**Check database connection:**
```bash
# From packages/db directory
pnpm -C packages/db prisma:generate
pnpm -C packages/db prisma:migrate
pnpm -C packages/db prisma:seed
```

### 3. Verify Stores Data
Check if stores exist in the database:

**Using Prisma Studio:**
```bash
pnpm -C packages/db prisma:studio
```

**Using direct query:**
```bash
# Connect to database and check stores table
docker exec -it subway_enterprise-postgres-1 psql -U postgres -d subway_enterprise
SELECT COUNT(*) FROM "Store";
SELECT * FROM "Store" LIMIT 5;
```

### 4. Check API Endpoint
Test the stores endpoint directly:

**Health check:**
```bash
curl http://localhost:3001/health
```

**Stores endpoint:**
```bash
curl http://localhost:3001/stores
```

**With filters:**
```bash
curl "http://localhost:3001/stores?region=EMEA"
curl "http://localhost:3001/stores?country=US"
```

### 5. Check Network Configuration
Verify the BFF URL configuration:

**Environment variables:**
```bash
echo $NEXT_PUBLIC_BFF_URL
```

**Default configuration:**
- Admin app: `http://localhost:3002`
- BFF app: `http://localhost:3001`
- Database: `localhost:5432`

### 6. Common Issues and Solutions

#### Issue: BFF Not Running
**Symptoms:** Connection refused, ECONNREFUSED
**Solution:**
```bash
pnpm -C apps/bff dev
```

#### Issue: Database Not Running
**Symptoms:** Database connection error in BFF logs
**Solution:**
```bash
docker compose -f infra/docker/compose.dev.yaml up -d
```

#### Issue: Database Not Seeded
**Symptoms:** Empty array response `[]`
**Solution:**
```bash
pnpm -C packages/db prisma:seed
```

#### Issue: Database Schema Out of Date
**Symptoms:** Prisma schema errors
**Solution:**
```bash
pnpm -C packages/db prisma:generate
pnpm -C packages/db prisma:migrate
```

#### Issue: Port Conflicts
**Symptoms:** Port already in use
**Solution:**
```bash
# Kill processes on ports
lsof -ti:3001 | xargs kill -9  # BFF port
lsof -ti:3002 | xargs kill -9  # Admin port
lsof -ti:5432 | xargs kill -9  # Database port
```

#### Issue: CORS Errors
**Symptoms:** CORS policy errors in browser
**Solution:** Check BFF CORS configuration in `apps/bff/src/main.ts`

### 7. Debug Mode
Enable debug logging:

**Environment variables:**
```bash
export NEXT_PUBLIC_DEBUG_MODE=true
export NEXT_PUBLIC_BFF_URL=http://localhost:3001
```

**Check browser console for detailed logs:**
- API request details
- Response status and data
- Error messages with stack traces

### 8. Full Development Setup
Complete setup from scratch:

```bash
# 1. Install dependencies
corepack enable && pnpm install

# 2. Start database
docker compose -f infra/docker/compose.dev.yaml up -d

# 3. Setup database
pnpm -C packages/db prisma:generate
pnpm -C packages/db prisma:migrate
pnpm -C packages/db prisma:seed

# 4. Start BFF
pnpm -C apps/bff dev

# 5. Start Admin (in another terminal)
pnpm -C apps/admin dev
```

### 9. Verify Setup
After setup, verify everything works:

1. **Database:** Should have ~8 stores across regions
2. **BFF Health:** `curl http://localhost:3001/health`
3. **BFF Stores:** `curl http://localhost:3001/stores`
4. **Admin App:** Visit `http://localhost:3002/stores/map`

### 10. API Debugger Component
The map page includes a temporary API debugger component that:
- Shows the configured BFF URL
- Tests health endpoint connectivity
- Tests stores endpoint directly
- Displays detailed error information

Use this to quickly identify connection issues.

## Expected Successful Response

When working correctly, the stores endpoint should return:
```json
[
  {
    "id": "store-id-1",
    "name": "Central Station",
    "country": "US",
    "region": "AMER",
    "city": "New York",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  },
  // ... more stores
]
```

And the map should display:
- Store count > 0
- Markers on the map
- Filter options populated
- No error messages

## Logs to Check

### BFF Logs
```bash
# Check BFF console output for:
- Database connection status
- Prisma query logs
- HTTP request logs
- Error stack traces
```

### Admin App Logs
```bash
# Check browser console for:
- API request details
- Network errors
- Performance monitoring logs
- Component error boundaries
```

### Database Logs
```bash
# Check Docker logs for database:
docker logs subway_enterprise-postgres-1
```

This troubleshooting guide should help identify and resolve the 500 error issue.