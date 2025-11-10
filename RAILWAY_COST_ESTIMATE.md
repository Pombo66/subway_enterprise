# Railway Cost Estimate for Subway Enterprise App

## 🎯 Your App Profile

### What You're Running:
- **BFF (Backend)**: NestJS API server
- **Database**: SQLite (7.6MB currently, ~1,300 stores)
- **Background Worker**: Expansion job processor
- **AI Integration**: OpenAI API calls (separate cost)

### Resource Requirements:

**BFF Service:**
- Memory: ~512MB - 1GB (NestJS + Prisma + background worker)
- CPU: Low to moderate (spikes during AI operations)
- Storage: ~1GB (database + node_modules)
- Network: Moderate (API calls + OpenAI requests)

## 💰 Railway Pricing Breakdown

### Railway Plans:

**Hobby Plan ($5/month):**
- $5 credit included
- Pay-as-you-go after that
- **Usage Rates:**
  - vCPU: $0.000463/vCPU-minute
  - Memory: $0.000231/GB-minute
  - Storage: $0.25/GB-month
  - Network Egress: $0.10/GB

**Pro Plan ($20/month):**
- $20 credit included
- Same rates as Hobby
- Better support

### Your Estimated Monthly Cost:

#### Scenario 1: Light Usage (1-5 users, occasional use)
```
BFF Service (always running):
- Memory (512MB): 512MB × 43,800 min/month × $0.000231 = ~$5.20
- CPU (10% avg): 0.1 vCPU × 43,800 min × $0.000463 = ~$2.03
- Storage (1GB): 1GB × $0.25 = $0.25
- Network (5GB): 5GB × $0.10 = $0.50

Total: ~$8/month
With $5 Hobby credit: ~$3/month out of pocket
```

#### Scenario 2: Moderate Usage (5-20 users, daily use)
```
BFF Service:
- Memory (768MB): 768MB × 43,800 min × $0.000231 = ~$7.80
- CPU (20% avg): 0.2 vCPU × 43,800 min × $0.000463 = ~$4.06
- Storage (2GB): 2GB × $0.25 = $0.50
- Network (20GB): 20GB × $0.10 = $2.00

Total: ~$14/month
With $5 Hobby credit: ~$9/month out of pocket
```

#### Scenario 3: Heavy Usage (20+ users, frequent AI operations)
```
BFF Service:
- Memory (1GB): 1GB × 43,800 min × $0.000231 = ~$10.12
- CPU (40% avg): 0.4 vCPU × 43,800 min × $0.000463 = ~$8.11
- Storage (3GB): 3GB × $0.25 = $0.75
- Network (50GB): 50GB × $0.10 = $5.00

Total: ~$24/month
Better to use Pro Plan ($20 credit): ~$4/month out of pocket
```

## 🤖 OpenAI Costs (Separate from Railway)

Your app uses OpenAI for:
- Expansion generation
- Store analysis
- Strategic recommendations

### OpenAI Pricing (GPT-4o/GPT-5):
- **Input**: ~$2.50 per 1M tokens
- **Output**: ~$10 per 1M tokens

### Estimated OpenAI Costs:

**Per Expansion Generation:**
- Input: ~50,000 tokens = $0.125
- Output: ~10,000 tokens = $0.10
- **Total per generation: ~$0.23**

**Per Store Analysis:**
- Input: ~30,000 tokens = $0.075
- Output: ~5,000 tokens = $0.05
- **Total per analysis: ~$0.13**

**Monthly OpenAI Estimates:**
- Light (10 generations/month): ~$2.30
- Moderate (50 generations/month): ~$11.50
- Heavy (200 generations/month): ~$46

## 📊 Total Monthly Cost Estimates

### Light Usage (1-5 users):
- Railway: $3-8/month
- OpenAI: $2-5/month
- **Total: $5-13/month**

### Moderate Usage (5-20 users):
- Railway: $9-14/month
- OpenAI: $10-20/month
- **Total: $19-34/month**

### Heavy Usage (20+ users):
- Railway: $4-24/month (with Pro plan)
- OpenAI: $30-100/month
- **Total: $34-124/month**

## 💡 Cost Optimization Tips

### 1. Railway Optimization:
- ✅ Use Hobby plan to start ($5/month)
- ✅ Enable sleep mode for BFF (not recommended if you need 24/7 access)
- ✅ Monitor usage in Railway dashboard
- ✅ Upgrade to Pro only if you exceed $20/month consistently

### 2. OpenAI Optimization:
- ✅ Use GPT-4o-mini instead of GPT-4o (10x cheaper)
- ✅ Cache expansion results (already implemented)
- ✅ Set cost limits in OpenAI dashboard
- ✅ Use background jobs to avoid timeouts (already implemented)

### 3. Alternative Hosting (If Railway Gets Expensive):

**Fly.io:**
- Free tier: 3 shared-cpu-1x VMs
- Paid: ~$5-10/month for similar resources

**Render:**
- Free tier: Available (with limitations)
- Paid: $7/month for 512MB instance

**VPS (DigitalOcean, Linode):**
- $6/month for basic droplet
- More setup required

## 🎯 Recommended Starting Point

### For Your App:

**Start with Railway Hobby Plan ($5/month):**
- Covers most light-moderate usage
- Easy deployment
- Good monitoring
- Upgrade if needed

**OpenAI Strategy:**
- Use GPT-4o-mini for most operations
- Set monthly budget alert at $20
- Monitor usage in OpenAI dashboard

**Expected First Month:**
- Railway: $3-8 (after $5 credit)
- OpenAI: $5-15
- **Total: $8-23/month**

## 📈 Scaling Costs

As you grow:

| Users | Railway | OpenAI | Total/Month |
|-------|---------|--------|-------------|
| 1-5   | $3-8    | $2-10  | $5-18       |
| 5-20  | $9-14   | $10-30 | $19-44      |
| 20-50 | $15-25  | $30-80 | $45-105     |
| 50+   | $25-50  | $80+   | $105-150+   |

## 🔍 How to Monitor Costs

### Railway Dashboard:
1. Go to your project
2. Click "Usage" tab
3. See real-time costs
4. Set up billing alerts

### OpenAI Dashboard:
1. Go to https://platform.openai.com/usage
2. View daily/monthly usage
3. Set usage limits
4. Enable email alerts

## ⚠️ Cost Surprises to Avoid

1. **Runaway AI calls**: Set OpenAI rate limits
2. **Memory leaks**: Monitor Railway metrics
3. **Large database**: SQLite is fine up to ~10GB
4. **Network egress**: Cache API responses

## 🎁 Free Alternatives (For Testing)

**Before committing to Railway:**

1. **Vercel** (for Admin only):
   - Free tier: Generous
   - Good for Next.js

2. **Supabase** (for Database):
   - Free tier: 500MB database
   - Could replace SQLite

3. **Railway Free Trial**:
   - $5 credit to test
   - No credit card required initially

## 💰 Bottom Line

**Most Likely Scenario for Your App:**
- **Month 1-3**: $10-25/month (testing, light usage)
- **Month 4-6**: $20-40/month (regular usage)
- **Steady State**: $30-60/month (established usage)

**The biggest variable is OpenAI usage** - that's where costs can spike if you generate lots of expansions.

**Recommendation**: Start with Railway Hobby + OpenAI with $20/month limit. Monitor for first month and adjust.

---

**Want to deploy and test?** Railway gives you $5 credit to start, so you can try it risk-free!
