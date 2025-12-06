# AI Intelligence Environment Variables Setup

**For Railway Production Deployment**

---

## Required Environment Variables

Add these to your Railway BFF service:

### **1. Feature Flags (Start Safe)**

```bash
# Continuous Intelligence (OFF by default - turn on when ready)
AI_CONTINUOUS_INTELLIGENCE_ENABLED=false

# On-Demand Intelligence (ON by default - safe for production)
AI_ONDEMAND_INTELLIGENCE_ENABLED=true
```

### **2. Cost Limits (Prevent Overruns)**

```bash
# Daily cost limit in USD
AI_DAILY_COST_LIMIT=50.00

# Monthly cost limit in USD
AI_MONTHLY_COST_LIMIT=1000.00

# Alert threshold (0.0-1.0) - alert at 80% of limit
AI_COST_ALERT_THRESHOLD=0.80
```

### **3. Rate Limits (Prevent Abuse)**

```bash
# Maximum analyses per hour (across all stores)
AI_MAX_ANALYSES_PER_HOUR=100

# Maximum analyses per store per day
AI_MAX_ANALYSES_PER_STORE_PER_DAY=5
```

### **4. Model Selection (Cost Optimization)**

```bash
# Default model for store analysis
AI_STORE_ANALYSIS_MODEL=gpt-5-mini

# Model for network-wide pattern analysis
AI_NETWORK_ANALYSIS_MODEL=gpt-5-mini

# Model for continuous intelligence (if enabled)
AI_CONTINUOUS_INTELLIGENCE_MODEL=gpt-5-mini

# Premium model for high-stakes analysis
AI_PREMIUM_ANALYSIS_MODEL=gpt-5.1
```

---

## Railway Setup Instructions

### **Step 1: Access Railway Dashboard**
1. Go to https://railway.app
2. Select your project
3. Click on the **BFF service**
4. Go to **Variables** tab

### **Step 2: Add Variables**
Click **+ New Variable** and add each variable above.

**Recommended order:**
1. Add feature flags first (both OFF initially)
2. Add cost limits
3. Add rate limits
4. Add model selection

### **Step 3: Deploy**
Railway will automatically redeploy with new variables.

---

## Testing Configuration

### **Test 1: Health Check**
```bash
curl https://subwaybff-production.up.railway.app/ai/intelligence/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "services": {
    "openai": { "configured": true, "status": "ready" },
    "database": { "status": "connected" }
  },
  "features": {
    "continuousIntelligence": false,
    "onDemandIntelligence": true
  }
}
```

### **Test 2: Status Check**
```bash
curl https://subwaybff-production.up.railway.app/ai/intelligence/status
```

**Expected response:**
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

### **Test 3: Analyze a Store**
```bash
curl -X POST https://subwaybff-production.up.railway.app/ai/intelligence/analyze/STORE_ID \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "premium": false}'
```

---

## Configuration Profiles

### **Profile 1: Development (Safe Testing)**
```bash
AI_CONTINUOUS_INTELLIGENCE_ENABLED=false
AI_ONDEMAND_INTELLIGENCE_ENABLED=true
AI_DAILY_COST_LIMIT=10.00
AI_MONTHLY_COST_LIMIT=100.00
AI_MAX_ANALYSES_PER_HOUR=20
AI_MAX_ANALYSES_PER_STORE_PER_DAY=2
AI_STORE_ANALYSIS_MODEL=gpt-5-mini
```
**Cost:** ~$0-$10/month

---

### **Profile 2: Production (Recommended Start)**
```bash
AI_CONTINUOUS_INTELLIGENCE_ENABLED=false
AI_ONDEMAND_INTELLIGENCE_ENABLED=true
AI_DAILY_COST_LIMIT=50.00
AI_MONTHLY_COST_LIMIT=1000.00
AI_MAX_ANALYSES_PER_HOUR=100
AI_MAX_ANALYSES_PER_STORE_PER_DAY=5
AI_STORE_ANALYSIS_MODEL=gpt-5-mini
AI_PREMIUM_ANALYSIS_MODEL=gpt-5.1
```
**Cost:** ~$0-$50/month (depends on usage)

---

### **Profile 3: Full Intelligence (After Testing)**
```bash
AI_CONTINUOUS_INTELLIGENCE_ENABLED=true
AI_ONDEMAND_INTELLIGENCE_ENABLED=true
AI_DAILY_COST_LIMIT=100.00
AI_MONTHLY_COST_LIMIT=2000.00
AI_MAX_ANALYSES_PER_HOUR=200
AI_MAX_ANALYSES_PER_STORE_PER_DAY=10
AI_STORE_ANALYSIS_MODEL=gpt-5-mini
AI_CONTINUOUS_INTELLIGENCE_MODEL=gpt-5-mini
AI_PREMIUM_ANALYSIS_MODEL=gpt-5.1
```
**Cost:** ~$105-$200/month (500 stores with daily analysis)

---

## Monitoring & Alerts

### **Check Current Costs**
```bash
curl https://subwaybff-production.up.railway.app/ai/intelligence/costs/report?period=week
```

### **Cost Alert Thresholds**
The system will log warnings when:
- Daily spend reaches 80% of limit
- Monthly spend reaches 80% of limit

**Check Railway logs for alerts:**
```
⚠️ Daily AI cost at 85% of limit ($42.50/$50.00)
⚠️ Monthly AI cost at 82% of limit ($820.00/$1000.00)
```

---

## Troubleshooting

### **Issue: "Analysis not allowed: Continuous intelligence is disabled"**
**Solution:** This is expected if continuous mode is OFF. Use on-demand analysis instead.

### **Issue: "Analysis not allowed: Daily cost limit reached"**
**Solution:** 
1. Check current spend: `/ai/intelligence/costs/report`
2. Increase limit if needed: `AI_DAILY_COST_LIMIT=100.00`
3. Or wait until tomorrow (resets at midnight UTC)

### **Issue: "Analysis not allowed: Rate limit exceeded"**
**Solution:**
1. Check recent analyses: `/ai/intelligence/status`
2. Increase limit if needed: `AI_MAX_ANALYSES_PER_HOUR=200`
3. Or wait for rate limit window to reset

### **Issue: "OPENAI_API_KEY not configured"**
**Solution:** Verify `OPENAI_API_KEY` is set in Railway environment variables.

---

## Gradual Rollout Strategy

### **Week 1: Testing Phase**
```bash
AI_CONTINUOUS_INTELLIGENCE_ENABLED=false
AI_ONDEMAND_INTELLIGENCE_ENABLED=true
AI_DAILY_COST_LIMIT=10.00
```
- Test with 5-10 stores manually
- Validate AI output quality
- Check cost tracking accuracy

### **Week 2: Limited Production**
```bash
AI_CONTINUOUS_INTELLIGENCE_ENABLED=false
AI_ONDEMAND_INTELLIGENCE_ENABLED=true
AI_DAILY_COST_LIMIT=50.00
```
- Enable for all users
- Monitor usage patterns
- Gather feedback

### **Week 3: Continuous Intelligence (Pilot)**
```bash
AI_CONTINUOUS_INTELLIGENCE_ENABLED=true
AI_DAILY_COST_LIMIT=20.00
```
- Enable continuous for 50 stores
- Monitor costs and quality
- Refine prompts if needed

### **Week 4: Full Rollout**
```bash
AI_CONTINUOUS_INTELLIGENCE_ENABLED=true
AI_DAILY_COST_LIMIT=100.00
AI_MONTHLY_COST_LIMIT=2000.00
```
- Enable for all stores
- Full AI intelligence active
- Monitor and optimize

---

## Cost Optimization Tips

### **1. Use GPT-5-mini by Default**
```bash
AI_STORE_ANALYSIS_MODEL=gpt-5-mini  # 5x cheaper than GPT-5.1
```

### **2. Cache Aggressively**
The system automatically caches analyses for 24 hours.

### **3. Rate Limit Appropriately**
```bash
AI_MAX_ANALYSES_PER_STORE_PER_DAY=5  # Prevents redundant analyses
```

### **4. Start with On-Demand Only**
```bash
AI_CONTINUOUS_INTELLIGENCE_ENABLED=false  # Only analyze when needed
```

### **5. Monitor and Adjust**
Check costs weekly and adjust limits as needed.

---

## Security Best Practices

### **1. Never Commit API Keys**
✅ Use Railway environment variables  
❌ Don't add to `.env` files in git

### **2. Rotate Keys Periodically**
Update `OPENAI_API_KEY` every 90 days.

### **3. Monitor for Unusual Activity**
Check logs for unexpected spikes in usage.

### **4. Use Feature Flags**
Can disable features instantly if issues occur.

---

## Summary

**Minimum Required Variables:**
```bash
AI_ONDEMAND_INTELLIGENCE_ENABLED=true
AI_DAILY_COST_LIMIT=50.00
AI_MONTHLY_COST_LIMIT=1000.00
AI_STORE_ANALYSIS_MODEL=gpt-5-mini
```

**Recommended Start:**
- Continuous: OFF
- On-demand: ON
- Daily limit: $50
- Monthly limit: $1000
- Model: gpt-5-mini

**Expected Cost:** $0-$50/month (on-demand only)

**Ready to deploy!** 🚀
