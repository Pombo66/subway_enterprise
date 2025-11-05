# Enable Full Testing Mode

## 🎛️ **Quick Toggle: Disable Safety Mode**

To fully test the expansion system and disable the safety warning, you have several options:

### **Option 1: Environment Variables (Recommended)**
Add these to your `.env.local` file:

```bash
# Enable full expansion testing
NEXT_PUBLIC_ENABLE_OPENAI_CALLS=true
NEXT_PUBLIC_ENABLE_JOB_PROCESSING=true

# Required for AI functionality
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=your_database_url_here
MAPBOX_ACCESS_TOKEN=your_mapbox_token_here

# Optional: Set cost limits
OPENAI_COST_LIMIT_GBP=5.00
AI_CANDIDATE_PERCENTAGE=20
AI_MAX_CANDIDATES=60
```

### **Option 2: Quick Development Toggle**
I can add a development toggle button to the UI for easy testing.

### **Option 3: Temporary Disable**
Comment out the safety warning component temporarily.

## 🚀 **Recommended Setup for Testing**

1. **Create `.env.local`** with the environment variables above
2. **Restart your development server**: `pnpm dev`
3. **The safety warning will change** from red (danger) to green (safe mode) or disappear entirely

## ⚠️ **Cost Protection Still Active**

Even with safety mode disabled, you still have:
- ✅ **Cost limits**: OPENAI_COST_LIMIT_GBP prevents runaway costs
- ✅ **Selective AI**: Only top 20% candidates get expensive AI analysis
- ✅ **Caching**: Prevents duplicate API calls
- ✅ **Error handling**: Graceful fallbacks if APIs fail

## 🧪 **What You Can Now Test**

With safety mode disabled:
- ✅ **Full expansion generation** with real AI rationales
- ✅ **Unique "Why Here" analysis** for each location
- ✅ **AI visual indicators** (gold rings, sparkles)
- ✅ **Cost optimization** (20% AI, 80% standard)
- ✅ **Job system** with real-time progress
- ✅ **All popup functionality** with location-specific data

Choose your preferred option and I'll help you implement it!