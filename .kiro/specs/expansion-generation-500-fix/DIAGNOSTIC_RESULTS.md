# Expansion Generation 500 Error - Diagnostic Results

## Root Cause Identified

The 500 Internal Server Error is caused by **incorrect DATABASE_URL configuration** in the admin application.

### Issue Details

**Current Configuration** (`apps/admin/.env.local`):
```
DATABASE_URL=file:../../packages/db/prisma/dev.db
```

This points to a SQLite database file, but the expansion generation service requires PostgreSQL.

**Correct Configuration**:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/subway
```

### Health Check Results

Running `curl http://localhost:3002/api/expansion/health` shows:

```json
{
  "status": "degraded",
  "timestamp": "2025-10-30T21:39:25.356Z",
  "services": {
    "database": {
      "status": "down",
      "required": true
    },
    "mapbox": {
      "status": "up",
      "required": false
    },
    "openai": {
      "status": "up",
      "required": false
    }
  },
  "features": {
    "coreGeneration": false,
    "mapboxFiltering": true,
    "aiRationale": true
  }
}
```

**Key Findings**:
- ✅ Mapbox is configured and enabled
- ✅ OpenAI is configured and enabled
- ❌ Database connection is failing
- ❌ Core generation is disabled due to database issue

### Database Status

PostgreSQL database is running correctly:
```bash
$ docker compose -f infra/docker/compose.dev.yaml ps
NAME                 STATUS
docker-db-1          Up 5 weeks (healthy)
```

Database `subway` exists and is accessible:
```bash
$ docker exec docker-db-1 psql -U postgres -c "\l"
   Name    |  Owner   
-----------+----------
 postgres  | postgres
 subway    | postgres  ← Correct database
```

## Solution

### Immediate Fix

Update `apps/admin/.env.local` with the correct DATABASE_URL:

```bash
# Replace the SQLite URL with PostgreSQL URL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/subway
```

Then restart the admin application:
```bash
# Stop the current process (Ctrl+C)
# Restart
pnpm -C apps/admin dev
```

### Verification Steps

1. **Check health endpoint**:
   ```bash
   curl http://localhost:3002/api/expansion/health
   ```
   
   Expected result: `"status": "healthy"` and `"database": { "status": "up" }`

2. **Test expansion generation**:
   - Navigate to http://localhost:3002/stores/map
   - Enable expansion mode
   - Configure parameters and click Generate
   - Should now work without 500 errors

## Implementation Summary

The diagnostic and error handling improvements have been successfully implemented:

### ✅ Completed Features

1. **Configuration Validation Module** (`apps/admin/lib/config/expansion-config.ts`)
   - Validates DATABASE_URL at startup
   - Checks database connectivity
   - Detects optional features (Mapbox, OpenAI)
   - Provides singleton configuration access

2. **Enhanced Error Logging** (`apps/admin/lib/logging/expansion-logger.ts`)
   - Added `logServiceInitialization()` for startup diagnostics
   - Added `logDetailedError()` with full context and stack traces
   - Added `logDatabaseError()` for Prisma-specific errors
   - Added `logMissingDependency()` for optional feature warnings

3. **Health Check Endpoint** (`apps/admin/app/api/expansion/health/route.ts`)
   - GET /api/expansion/health returns service status
   - Shows database, Mapbox, and OpenAI status
   - Indicates which features are available
   - Returns 200 (healthy) or 503 (degraded/unhealthy)

4. **Enhanced API Error Handling** (`apps/admin/app/api/expansion/generate/route.ts`)
   - Validates configuration before processing requests
   - Returns 503 if database is unavailable
   - Provides specific error codes (NO_STORES, DATABASE_UNAVAILABLE, etc.)
   - Includes request IDs for error tracking
   - Handles JSON parsing errors gracefully

5. **Graceful Degradation**
   - Mapbox filtering: Skips if MAPBOX_ACCESS_TOKEN not configured
   - AI rationales: Uses templates if OPENAI_API_KEY not configured
   - Core generation: Works with just database connection

6. **Frontend Error Display** (`apps/admin/app/stores/map/components/ExpansionIntegratedMapPage.tsx`)
   - Parses error codes and shows user-friendly messages
   - Displays request IDs for support reference
   - Logs generation metadata on success

7. **Documentation**
   - Updated `.env.example` with clear descriptions
   - Added Expansion Predictor section to README.md
   - Included troubleshooting guide
   - Documented health check endpoint

## Benefits

### For Developers
- **Instant Diagnostics**: Health endpoint shows exactly what's wrong
- **Detailed Logging**: Full error context with stack traces and request IDs
- **Clear Error Messages**: Specific error codes instead of generic 500s
- **Configuration Validation**: Catches issues at startup, not runtime

### For Users
- **User-Friendly Errors**: Clear messages explaining what went wrong
- **Actionable Guidance**: Tells users how to fix issues
- **Graceful Degradation**: Core features work even if optional features are unavailable
- **No Breaking Changes**: Optional features don't break the entire system

## Next Steps

1. **Update Configuration**: Fix the DATABASE_URL in `apps/admin/.env.local`
2. **Restart Application**: Restart the admin app to pick up the new configuration
3. **Verify Health**: Check the health endpoint shows all services as "up"
4. **Test Generation**: Try generating expansion suggestions
5. **Monitor Logs**: Watch for any remaining issues in the console

## Lessons Learned

1. **Configuration is Critical**: Database URL misconfiguration was the root cause
2. **Health Checks are Essential**: The health endpoint immediately identified the issue
3. **Graceful Degradation Works**: Mapbox and OpenAI being optional prevented total failure
4. **Detailed Logging Helps**: Enhanced logging would have caught this issue faster
5. **Validation at Startup**: Checking configuration early prevents runtime surprises
