# Authentication Fix Summary

## Problem
The expansion API routes (`/api/expansion/scenarios` and `/api/expansion/generate`) were returning 401 errors in production (Railway) because:
1. The auth middleware had incomplete Supabase integration
2. The Next.js middleware was redirecting API routes to `/login` before they could handle their own auth

## Solution Implemented

### 1. Updated Auth Middleware (`apps/admin/lib/middleware/auth.ts`)
- Implemented proper Supabase session validation for production
- Kept dev auth bypass for local development
- Now checks Supabase session cookies and validates user authentication

### 2. Updated Next.js Middleware (`apps/admin/middleware.ts`)
- Added exception for API routes - they now handle their own authentication
- Prevents redirect loops where API routes were being redirected to `/login`
- Page routes still protected by Supabase auth

### 3. Environment Configuration
- Added `NEXT_PUBLIC_DEV_AUTH_BYPASS=true` to local `.env.local` for development
- Created `RAILWAY_ENV_SETUP.md` with required Railway environment variables

## How It Works Now

### Development (Local)
- `NEXT_PUBLIC_DEV_AUTH_BYPASS=true` allows browser requests without login
- Test scripts blocked unless they include `x-dev-auth: allow-dev-costs` header

### Production (Railway)
- Supabase authentication required for all requests
- Users must log in at `/login` page
- Session cookies automatically included in API requests
- API routes validate session using `getAuthContext()`

## Testing

### Local Development
```bash
# Start admin app
pnpm -C apps/admin dev

# Access at http://localhost:3002
# No login required in dev mode
```

### Production (Railway)
1. Set environment variables from `RAILWAY_ENV_SETUP.md`
2. Deploy admin service
3. Users will be redirected to `/login`
4. After login, API routes will work with session cookies

## Files Modified
- `apps/admin/lib/middleware/auth.ts` - Supabase auth implementation
- `apps/admin/middleware.ts` - API route exception
- `apps/admin/.env.local` - Dev auth bypass flag

## Next Steps
1. Add environment variables to Railway dashboard (see `RAILWAY_ENV_SETUP.md`)
2. Redeploy admin service
3. Test login flow in production
4. Verify expansion API routes work after authentication
