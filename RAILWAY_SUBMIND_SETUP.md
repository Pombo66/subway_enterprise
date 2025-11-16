# Railway SubMind Setup Guide

## Important: Environment Variables in Railway

`.env.local` files are **NOT** pushed to Railway. They are local development files only.

For production deployment on Railway, you must set environment variables in the Railway dashboard.

## Required Environment Variables for Admin Dashboard

### Step 1: Access Railway Dashboard

1. Go to https://railway.app
2. Select your Admin Dashboard service
3. Click on the "Variables" tab

### Step 2: Add Required Environment Variables

Add these variables in the Railway dashboard:

```bash
# BFF API URL - CRITICAL for SubMind
NEXT_PUBLIC_BFF_URL=https://subwaybff-production.up.railway.app

# Feature Flags
NEXT_PUBLIC_FEATURE_SUBMIND=true
NEXT_PUBLIC_FEATURE_EXPANSION_PREDICTOR=true

# Supabase Authentication
NEXT_PUBLIC_SUPABASE_URL=https://qhjakyehsvmqbrsgydim.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoamFreWVoc3ZtcWJyc2d5ZGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NTYwMjgsImV4cCI6MjA3ODMzMjAyOH0.zBSQCvCDNJ8yxeQEQI_6qFW9y7uqfNICKGj_AavOm80

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoicG9tYm82NiIsImEiOiJjbWhucmJibzYwMnlkMmlzaWJicXo5cnFlIn0.DzVzgDQGWJjr60RpyC1aSw

# OpenAI (for client-side features if needed)
OPENAI_API_KEY=<your-openai-api-key>

# Development flags (optional)
NEXT_PUBLIC_DEV_AUTH_BYPASS=true
```

### Step 3: Verify BFF Service Environment Variables

Switch to your BFF service in Railway and verify these are set:

```bash
# OpenAI - REQUIRED for SubMind to work
OPENAI_API_KEY=<your-openai-api-key>

# AI Model Configuration
EXPANSION_OPENAI_MODEL=gpt-5-mini
MARKET_ANALYSIS_MODEL=gpt-5-mini
LOCATION_DISCOVERY_MODEL=gpt-5-nano
STRATEGIC_SCORING_MODEL=gpt-5-mini
RATIONALE_GENERATION_MODEL=gpt-5-mini

# Database (should already be set by Railway)
DATABASE_URL=<automatically-set-by-railway>

# CORS (set to your admin URL)
CORS_ENABLED=true
CORS_ORIGIN=https://subwayadmin-production.up.railway.app
```

### Step 4: Trigger Redeploy

After adding/updating environment variables:

1. **Admin Service:**
   - Go to Deployments tab
   - Click "Deploy" or "Redeploy"
   - Wait for build to complete

2. **BFF Service:**
   - If you changed BFF variables, redeploy BFF too
   - Go to Deployments tab
   - Click "Deploy" or "Redeploy"

## Alternative: Push Code Changes to Trigger Deploy

If you've made code changes (like the GPT-5.1 upgrade), you can push to trigger deployment:

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: Add GPT-5.1 support and fix SubMind configuration"

# Push to main branch (triggers Railway deployment)
git push origin main
```

## Verification Steps

### 1. Check Railway Deployment Logs

In Railway dashboard:
- Go to Deployments tab
- Click on latest deployment
- Check build logs for errors
- Verify deployment succeeded

### 2. Check Environment Variables Are Set

In Railway dashboard:
- Go to Variables tab
- Verify `NEXT_PUBLIC_BFF_URL` is present
- Verify `NEXT_PUBLIC_FEATURE_SUBMIND=true`
- Verify `OPENAI_API_KEY` is set in BFF service

### 3. Test SubMind in Production

1. Open your production URL: `https://subwayadmin-production.up.railway.app`
2. Look for circular blue button at bottom-right
3. Click it to open SubMind drawer
4. Try asking a question in the "Ask" tab
5. Check browser console for any errors

### 4. Check BFF Health

Visit: `https://subwaybff-production.up.railway.app/health`

Should return a healthy status.

## Troubleshooting

### SubMind Icon Still Not Showing

**Check 1: Verify Build Completed**
- Railway dashboard → Deployments
- Ensure latest deployment shows "Success"
- Check build logs for any errors

**Check 2: Verify Environment Variables**
- Railway dashboard → Variables
- Confirm `NEXT_PUBLIC_BFF_URL` is set
- Confirm `NEXT_PUBLIC_FEATURE_SUBMIND=true`

**Check 3: Check Browser Console**
- Open DevTools (F12)
- Look for errors related to SubMind or config
- Check Network tab for failed API calls

**Check 4: Hard Refresh**
- Clear browser cache
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

**Check 5: Verify BFF is Running**
- Visit `https://subwaybff-production.up.railway.app/health`
- Should return healthy status
- If not, check BFF service logs in Railway

### API Connection Errors

**Check CORS Configuration:**
- BFF service should have `CORS_ORIGIN` set to your admin URL
- Or use `*` for testing (not recommended for production)

**Check BFF URL:**
- Verify `NEXT_PUBLIC_BFF_URL` matches actual BFF URL
- No trailing slash
- Uses HTTPS

### OpenAI Errors

**Check API Key:**
- Verify `OPENAI_API_KEY` is set in BFF service
- Key should start with `sk-proj-` or `sk-`
- Check OpenAI dashboard for usage/limits

**Check Model Names:**
- Verify model names are correct: `gpt-5-mini`, `gpt-5-nano`, `gpt-5.1`
- Check BFF logs for model-related errors

## Current Code Changes

The following code changes have been made locally and need to be pushed:

### 1. GPT-5.1 Model Support
- ✅ Updated `apps/bff/src/services/ai/simple-expansion.service.ts`
- ✅ Updated `apps/bff/src/services/ai/store-analysis.service.ts`
- ✅ Updated `apps/bff/src/services/ai/model-configuration.service.ts` (BFF)
- ✅ Updated `apps/admin/lib/services/ai/model-configuration.service.ts` (Admin)
- ✅ Updated `apps/bff/src/routes/expansion.controller.ts`

### 2. Documentation Updates
- ✅ Created `GPT5.1_UPGRADE_SUMMARY.md`
- ✅ Created `SUBMIND_OVERVIEW.md`
- ✅ Created `SUBMIND_ICON_FIX.md`
- ✅ Updated `.kiro/steering/product.md`
- ✅ Updated `.kiro/steering/tech.md`
- ✅ Created `.kiro/steering/deployment.md`

### 3. Environment Configuration
- ✅ Updated `apps/admin/.env.local` (local only, not pushed)

## Push to Railway

To deploy all changes to Railway:

```bash
# Check what will be committed
git status

# Stage all changes
git add .

# Commit with message
git commit -m "feat: Add GPT-5.1 model support and SubMind configuration

- Upgrade from gpt-5 to gpt-5.1 for premium analysis
- Add gpt-5.1 pricing configuration ($1.25/$10.00 per 1M tokens)
- Update model configuration services (BFF and Admin)
- Add comprehensive deployment documentation
- Document SubMind AI assistant features and configuration
- Update steering docs with production deployment info"

# Push to trigger Railway deployment
git push origin main
```

## Post-Deployment Checklist

After pushing to Railway:

- [ ] Check Railway dashboard for successful deployment
- [ ] Verify Admin service deployed successfully
- [ ] Verify BFF service is running
- [ ] Check environment variables are set in Railway
- [ ] Test SubMind icon appears in production
- [ ] Test SubMind functionality (ask a question)
- [ ] Check browser console for errors
- [ ] Verify BFF health endpoint
- [ ] Monitor Railway logs for any issues
- [ ] Test expansion features with new GPT-5.1 model

## Important Notes

1. **Environment Variables:** Always set in Railway dashboard, never commit to git
2. **API Keys:** Keep secure, rotate periodically
3. **Build Time:** Next.js needs `NEXT_PUBLIC_*` variables at build time
4. **Redeploy Required:** After changing environment variables, redeploy the service
5. **Cache:** May need to hard refresh browser after deployment

## Support

If issues persist:
- Check Railway logs for detailed error messages
- Review browser console for client-side errors
- Verify all environment variables are set correctly
- Test BFF endpoints directly using curl or Postman
- Check OpenAI API status and usage limits
