# Authentication Fix Guide

## Issue
The stores API is returning 500 errors because the `INTERNAL_ADMIN_SECRET` environment variable is missing from the Railway deployment.

## Root Cause
The BFF requires authentication for all API calls except public endpoints. The admin app uses `INTERNAL_ADMIN_SECRET` as a Bearer token to authenticate with the BFF, but this environment variable was not configured in Railway.

## Temporary Fix Applied
Added a temporary bypass in the BFF auth guard that allows requests in production when `INTERNAL_ADMIN_SECRET` is missing. This will restore functionality immediately.

## Permanent Fix Required

### Step 1: Generate a Secure Secret
```bash
# Generate a secure random secret
openssl rand -hex 32
```

### Step 2: Configure Railway Environment Variables

#### BFF Service
Add to Railway BFF service environment variables:
```bash
INTERNAL_ADMIN_SECRET=<your-generated-secret>
```

#### Admin Service  
Add to Railway Admin service environment variables:
```bash
INTERNAL_ADMIN_SECRET=<same-secret-as-bff>
```

### Step 3: Remove Temporary Bypass
After configuring the environment variables, remove the temporary bypass from `apps/bff/src/guards/auth.guard.ts`:

```typescript
// Remove this section:
// 1.5) Temporary production bypass until INTERNAL_ADMIN_SECRET is configured
// TODO: Remove this after setting INTERNAL_ADMIN_SECRET in Railway
if (process.env.NODE_ENV === 'production' && !process.env.INTERNAL_ADMIN_SECRET) {
  console.warn('[AuthGuard] TEMPORARY: Bypassing auth in production due to missing INTERNAL_ADMIN_SECRET');
  return true;
}
```

## Verification
1. Set the environment variables in Railway
2. Redeploy both services
3. Test that `/api/stores` returns data without errors
4. Remove the temporary bypass code
5. Redeploy and verify authentication still works

## Security Notes
- The `INTERNAL_ADMIN_SECRET` should be a long, random string
- It should be the same in both BFF and Admin services
- Never commit this secret to the repository
- Rotate the secret periodically for security

## Current Status
✅ Temporary fix deployed - stores API should work now
⚠️ Permanent fix required - set INTERNAL_ADMIN_SECRET in Railway
🔒 Remove temporary bypass after proper authentication is configured