# Quick Start Guide - Expansion Suggestion Quality Improvements

## 🚀 Get Started in 5 Minutes

### Step 1: Run Database Migration
```bash
cd packages/db
pnpm prisma migrate dev
pnpm prisma generate
```

### Step 2: Configure Environment Variables
Add to `apps/admin/.env.local`:
```bash
# Required
MAPBOX_ACCESS_TOKEN=pk.your-token-here
OPENAI_API_KEY=sk-your-key-here

# Optional (defaults shown)
EXPANSION_COASTLINE_BUFFER_M=300
EXPANSION_MAX_SNAP_DISTANCE_M=1500
EXPANSION_H3_RESOLUTION=7
EXPANSION_SAMPLES_PER_TILE=15
EXPANSION_TARGET_MIN=50
EXPANSION_TARGET_MAX=150
```

### Step 3: Install Dependencies
```bash
pnpm install
```

### Step 4: Restart Services
```bash
pnpm dev
```

### Step 5: Test It Out
1. Open admin dashboard: http://localhost:3002
2. Navigate to Stores → Map
3. Enable Expansion Mode
4. Generate suggestions for a region
5. Look for **teal markers** (#06b6d4) on the map!

## ✨ What's New?

### Visual Changes
- **Teal Markers**: All AI suggestions now appear in teal (#06b6d4)
- **Simplified Legend**: Single "AI suggestion (NEW)" entry instead of confidence levels

### Quality Improvements
- **No Water Suggestions**: All suggestions validated to be on land
- **Coastline Buffer**: Minimum 300m from coastlines
- **Infrastructure Snapping**: Snapped to nearest road or building within 1.5km
- **Mandatory AI Rationale**: Every suggestion has OpenAI-generated explanation

### Performance Improvements
- **H3 Tiling**: Better geographic distribution across regions
- **Progressive Batching**: Faster results with early yield
- **90-Day Caching**: Reduced API costs with long-term caching

## 🔧 Configuration Options

### Adjust Coastline Buffer
```bash
EXPANSION_COASTLINE_BUFFER_M=500  # Stricter (500m from coast)
EXPANSION_COASTLINE_BUFFER_M=100  # More lenient (100m from coast)
```

### Adjust Snapping Distance
```bash
EXPANSION_MAX_SNAP_DISTANCE_M=2000  # Accept more remote locations
EXPANSION_MAX_SNAP_DISTANCE_M=1000  # Stricter infrastructure requirements
```

### Adjust Target Count
```bash
EXPANSION_TARGET_MIN=100  # Generate more suggestions
EXPANSION_TARGET_MAX=200  # Allow up to 200 suggestions
```

## 🐛 Troubleshooting

### "No suggestions generated"
**Check:**
1. Is `OPENAI_API_KEY` configured?
2. Is `MAPBOX_ACCESS_TOKEN` configured?
3. Are there stores in the selected region?

**Try:**
```bash
# Increase timeout
EXPANSION_TIMEOUT_MS=30000

# Decrease target
EXPANSION_TARGET_MIN=10
```

### "Markers not teal"
**Solution:** Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)

### "OpenAI errors"
**Check:** API key is valid and has credits
```bash
# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

## 📊 Monitoring

### Check Cache Performance
Look for these log messages:
```
📊 Mapbox cache hit rate: 85%
📊 OpenAI cache hit rate: 92%
🔷 Generated 127 H3 tiles at resolution 7
✅ Generated 87 suggestions in 8.2s
```

### Expected Performance
- **First run**: 0% cache hit rate, slower generation
- **Repeat runs**: >80% cache hit rate, much faster
- **Generation time**: <15 seconds for most regions
- **Suggestions**: 50-150 per generation

## 🎯 Testing Checklist

- [ ] Database migration completed successfully
- [ ] Environment variables configured
- [ ] Dependencies installed (h3-js)
- [ ] Services restarted
- [ ] Can generate suggestions for test region
- [ ] Markers appear in teal color
- [ ] Legend shows "AI suggestion (NEW)"
- [ ] No suggestions in water
- [ ] All suggestions have AI rationale
- [ ] Cache hit rate increases on repeat runs

## 📚 Additional Resources

- **Full Implementation Summary**: See `IMPLEMENTATION_SUMMARY.md`
- **Requirements**: See `requirements.md`
- **Design**: See `design.md`
- **Tasks**: See `tasks.md`

## 🆘 Need Help?

### Common Issues

**Issue**: `Cannot find module 'h3-js'`
**Solution**: `pnpm install`

**Issue**: `OPENAI_API_KEY not configured`
**Solution**: Add to `.env.local` file

**Issue**: `Prisma Client not generated`
**Solution**: `pnpm -C packages/db prisma generate`

**Issue**: `Migration failed`
**Solution**: Check database connection and try again

## ✅ Success Indicators

You'll know it's working when:
1. ✅ Teal markers appear on map
2. ✅ Legend shows "AI suggestion (NEW)"
3. ✅ Suggestions generate in <15 seconds
4. ✅ No suggestions appear in water
5. ✅ Cache hit rate >80% on repeat runs
6. ✅ All suggestions have AI-generated rationale

## 🎉 You're Done!

The expansion suggestion system is now enhanced with:
- Teal markers for clear visual distinction
- Land and coastline validation
- Infrastructure snapping
- Mandatory AI rationale
- H3 tiling for better distribution
- 90-day caching for performance

Enjoy generating high-quality expansion suggestions! 🚀
