# Phase 1 Deployment Checklist

**Date:** December 6, 2025  
**Feature:** AI-First Store Intelligence System  
**Status:** Ready for Production Deployment

---

## Pre-Deployment Checklist

### ✅ Code Review
- [x] All services implemented
- [x] API endpoints tested locally
- [x] UI components created
- [x] Error handling in place
- [x] No breaking changes to existing code
- [x] TypeScript compilation successful
- [x] Kiro IDE autofix applied

### ✅ Documentation
- [x] Environment variables documented
- [x] API endpoints documented
- [x] Database setup script created
- [x] Cost analysis completed
- [x] Deployment guide written

---

## Deployment Steps

### Step 1: Add Environment Variables to Railway ⏳

**Go to:** Railway Dashboard → Your Project → BFF Service → Variables

**Add these variables:**

```bash
# Feature Flags (Start Safe)
AI_CONTINUOUS_INTELLIGENCE_ENABLED=false
AI_ONDEMAND_INTELLIGENCE_ENABLED=true

# Cost Limits
AI_DAILY_COST_LIMIT=50.00
AI_MONTHLY_COST_LIMIT=1000.00
AI_COST_ALERT_THRESHOLD=0.80

# Rate Limits
AI_MAX_ANALYSES_PER_HOUR=100
AI_MAX_ANALYSES_PER_STORE_PER_DAY=5

# Model Selection
AI_STORE_ANALYSIS_MODEL=gpt-5-mini
AI_NETWORK_ANALYSIS_MODEL=gpt-5-mini
AI_CONTINUOUS_INTELLIGENCE_MODEL=gpt-5-mini
AI_PREMIUM_ANALYSIS_MODEL=gpt-5.1
```

**Checklist:**
- [ ] All 10 variables added
- [ ] Values match recommended defaults
- [ ] No typos in variable names
- [ ] Railway shows "Variables Updated"

---

### Step 2: Push Code to Git ⏳

**Commands:**

```bash
# Check status
git status

# Add all new files
git add .

# Commit with descriptive message
git commit -m "feat: Add AI-powered store intelligence system

Phase 1 Complete:
- AI analysis engine with GPT-5-mini
- Cost controls and rate limiting  
- Settings UI for control
- Enhanced Performance Tab with AI insights
- Complete API for store intelligence

Features:
- 8 new API endpoints
- AI Model Config Service
- Store Context Builder
- Store Intelligence Service
- AI Controller Service
- Settings page for control
- Enhanced Performance Tab

Safety:
- Feature flags default to safe values
- Cost limits prevent overruns
- Rate limiting prevents abuse
- Can be disabled instantly
- No breaking changes

Cost: ~\$0.007 per analysis (less than 1 cent!)
"

# Push to main (triggers Railway auto-deploy)
git push origin main
```

**Checklist:**
- [ ] Code committed successfully
- [ ] Pushed to main branch
- [ ] Railway deployment triggered
- [ ] No merge conflicts

---

### Step 3: Monitor Railway Deployment ⏳

**Go to:** Railway Dashboard → Deployments

**Watch for:**
- ✅ Build started
- ✅ Build successful
- ✅ Deploy started
- ✅ Deploy successful
- ✅ Health checks passing

**Estimated time:** 3-5 minutes

**Checklist:**
- [ ] Build completed without errors
- [ ] Deployment successful
- [ ] Service is running
- [ ] No error logs

---

### Step 4: Initialize Database ⏳

**Option A: Using Railway Dashboard**

1. Go to Railway Dashboard → Database → Query
2. Copy contents of `setup-ai-intelligence-db.sql`
3. Paste and execute

**Option B: Using Prisma Studio**

1. Run: `pnpm -C packages/db prisma studio`
2. Go to FeatureFlag table
3. Add records manually:
   - `ai_continuous_intelligence` → `false`
   - `ai_ondemand_intelligence` → `true`

**Checklist:**
- [ ] Feature flags created
- [ ] No database errors
- [ ] Flags visible in database

---

### Step 5: Verify API Endpoints ⏳

**Test 1: Health Check**

```bash
curl https://subwaybff-production.up.railway.app/ai/intelligence/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-06T...",
  "services": {
    "openai": {
      "configured": true,
      "status": "ready"
    },
    "database": {
      "status": "connected"
    }
  },
  "features": {
    "continuousIntelligence": false,
    "onDemandIntelligence": true
  }
}
```

**Test 2: Status Check**

```bash
curl https://subwaybff-production.up.railway.app/ai/intelligence/status
```

**Expected Response:**
```json
{
  "config": {
    "continuousEnabled": false,
    "onDemandEnabled": true,
    "dailyCostLimit": 50,
    "monthlyCostLimit": 1000
  },
  "costStatus": {
    "dailySpent": 0,
    "dailyLimit": 50,
    "monthlySpent": 0,
    "monthlyLimit": 1000
  },
  "canAnalyze": true
}
```

**Checklist:**
- [ ] Health endpoint returns 200
- [ ] Status endpoint returns 200
- [ ] OpenAI configured: true
- [ ] Database connected: true
- [ ] On-demand enabled: true
- [ ] Can analyze: true

---

### Step 6: Test Admin UI ⏳

**Test 1: Settings Page**

1. Navigate to: `https://your-admin-url/settings/ai-intelligence`
2. Verify page loads
3. Check toggle switches work
4. Verify cost status displays

**Test 2: Performance Tab**

1. Navigate to any store: `https://your-admin-url/stores/[id]`
2. Click "Performance" tab
3. Scroll to "AI Performance Analysis"
4. Verify "Analyze with AI" button appears

**Checklist:**
- [ ] Settings page loads
- [ ] Toggle switches work
- [ ] Cost status displays
- [ ] Performance tab loads
- [ ] AI section visible
- [ ] Analyze button present

---

### Step 7: Test AI Analysis ⏳

**Pick a test store and analyze it:**

1. Go to store Performance tab
2. Click "Analyze with AI"
3. Wait 3-5 seconds
4. Verify results display

**Expected Results:**
- Location Quality Score (0-100)
- Location Rating (EXCELLENT/GOOD/FAIR/POOR)
- Primary Factor (LOCATION/OPERATOR/MARKET/BALANCED)
- Performance Gap (if available)
- Recommendation Priority (HIGH/MEDIUM/LOW)
- Analysis timestamp
- Model and token usage

**Checklist:**
- [ ] Analysis completes in <10 seconds
- [ ] Results display correctly
- [ ] No errors in console
- [ ] Cost tracking works
- [ ] Can analyze again

---

### Step 8: Monitor for 24 Hours ⏳

**Check Railway Logs:**
- Look for cost alerts
- Check for API errors
- Verify token usage
- Monitor response times

**Check Cost Status:**
- Visit Settings page daily
- Review cost report: `/ai/intelligence/costs/report`
- Verify within limits

**Checklist:**
- [ ] No critical errors in logs
- [ ] Cost tracking accurate
- [ ] Response times acceptable
- [ ] No rate limit issues

---

## Post-Deployment Verification

### ✅ Functionality Tests
- [ ] Health endpoint working
- [ ] Status endpoint working
- [ ] Can analyze stores
- [ ] Results save to database
- [ ] Settings page functional
- [ ] Toggle switches work
- [ ] Cost tracking accurate

### ✅ Performance Tests
- [ ] Analysis completes in <10 seconds
- [ ] API response times <2 seconds
- [ ] No memory leaks
- [ ] Database queries optimized

### ✅ Safety Tests
- [ ] Cost limits enforced
- [ ] Rate limiting works
- [ ] Feature flags toggle correctly
- [ ] Can disable instantly
- [ ] Graceful error handling

---

## Rollback Plan (If Needed)

### Option 1: Disable via Environment Variable

```bash
# In Railway BFF Variables:
AI_ONDEMAND_INTELLIGENCE_ENABLED=false
```

Railway will redeploy automatically.

### Option 2: Revert Git Commit

```bash
git revert HEAD
git push origin main
```

Railway will redeploy previous version.

### Option 3: Redeploy Previous Version

1. Go to Railway Dashboard → Deployments
2. Find last working deployment
3. Click "Redeploy"

---

## Success Criteria

### ✅ Deployment Successful If:
- [ ] All API endpoints return 200
- [ ] Settings page loads and works
- [ ] Can analyze stores successfully
- [ ] Results display correctly
- [ ] Cost tracking works
- [ ] No critical errors in logs
- [ ] Response times acceptable

### ✅ Ready for Users If:
- [ ] Tested with 5-10 stores
- [ ] AI output quality validated
- [ ] Cost tracking verified
- [ ] No errors for 24 hours
- [ ] Documentation complete

---

## Next Steps After Deployment

### Immediate (First Week)
1. Monitor costs daily
2. Test with 10-20 stores
3. Gather user feedback
4. Validate AI output quality
5. Adjust prompts if needed

### Short-term (First Month)
1. Enable for all users
2. Monitor usage patterns
3. Optimize costs
4. Plan Phase 2 features
5. Document learnings

### Long-term (3-6 Months)
1. Consider enabling continuous intelligence
2. Upgrade to GPT-5.1 for premium features
3. Build Phase 2 features
4. Expand to more use cases
5. Scale to more stores

---

## Support Contacts

### If Issues Occur:
- **Railway Support:** support@railway.app
- **OpenAI Support:** https://help.openai.com
- **Documentation:** See `PHASE_1_COMPLETE.md`

### Monitoring:
- **Railway Dashboard:** https://railway.app
- **Health Endpoint:** `/ai/intelligence/health`
- **Status Endpoint:** `/ai/intelligence/status`
- **Cost Report:** `/ai/intelligence/costs/report`

---

## Deployment Summary

**What's Being Deployed:**
- 5 new backend services
- 8 new API endpoints
- 2 new UI pages/sections
- Complete AI intelligence system

**Impact:**
- No breaking changes
- All new functionality
- Feature flags control rollout
- Can be disabled instantly

**Cost:**
- $0.007 per analysis
- $0-$50/month (on-demand only)
- ~$105/month (500 stores daily)

**Risk Level:** LOW
- All new code
- Feature flags default to safe
- Cost limits prevent overruns
- Easy rollback

---

## Final Checklist

Before marking deployment complete:

- [ ] Environment variables added
- [ ] Code pushed and deployed
- [ ] Database initialized
- [ ] API endpoints tested
- [ ] UI tested
- [ ] AI analysis tested
- [ ] Monitoring in place
- [ ] Documentation complete
- [ ] Team notified
- [ ] Rollback plan ready

---

## 🎉 Deployment Complete!

Once all checkboxes are marked, Phase 1 is live in production!

**Congratulations on deploying AI-powered store intelligence!** 🚀

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Verified By:** _____________  
**Status:** ⏳ In Progress / ✅ Complete / ❌ Rolled Back
