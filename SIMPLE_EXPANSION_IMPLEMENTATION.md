# Simple Single-Call Expansion Implementation

## Overview

Replaced the complex 5-stage AI pipeline with a simple single-call approach that's faster, cheaper, and easier to maintain.

## What Changed

### Before (Complex Pipeline)
- **5 stages**: Market Analysis → Zone Identification → Location Discovery → Viability Validation → Strategic Scoring
- **55+ API calls**: 1 + 1 + 1 + 50 + 2 = ~55 calls
- **5+ minutes**: Sequential processing with batching
- **Complex**: Multiple services, orchestration, error handling

### After (Simple Approach)
- **1 stage**: Single GPT call with all store data
- **1 API call**: All analysis in one request
- **~30 seconds**: Single fast call
- **Simple**: One service, straightforward logic

## Architecture

```
User clicks "Generate" 
  ↓
Frontend: POST /api/expansion/generate
  ↓
Shared Expansion Service
  ↓
BFF: POST /ai/pipeline/execute (useSimpleApproach: true)
  ↓
Simple Expansion Service
  ↓
OpenAI GPT-5-nano (single call)
  ↓
Returns 50 suggestions with coordinates + rationale
  ↓
Display on map
```

## Files Created/Modified

### New Files
- `apps/bff/src/services/ai/simple-expansion.service.ts` - New simple expansion service

### Modified Files
- `packages/shared-expansion/src/services/expansion.service.ts` - Added feature flag and simple approach
- `apps/bff/src/routes/expansion.controller.ts` - Added simple approach handling

## Feature Flag

Control which approach to use via environment variable:

```bash
# Use simple approach (default)
USE_SIMPLE_EXPANSION=true

# Use complex 5-stage pipeline (legacy)
USE_SIMPLE_EXPANSION=false
```

## Model Configuration

Currently using **GPT-5-nano** for testing:
- Fast and cheap
- Good for initial testing
- Can upgrade to GPT-5-mini or GPT-5 for production

To change model, edit `apps/bff/src/services/ai/simple-expansion.service.ts`:
```typescript
private readonly MODEL = 'gpt-5-nano'; // Change to 'gpt-5-mini' or 'gpt-5'
```

## How It Works

### 1. Fetch Existing Stores
```typescript
const existingStores = await prisma.store.findMany({
  where: {
    status: 'Open',  // Only open stores
    latitude: { not: null },
    longitude: { not: null },
    country: 'Germany'
  }
});
```

### 2. Build Prompt
```
Analyze Subway expansion in Germany.

EXISTING STORES (1297):
Berlin, 52.5001, 13.3121, €450k
Munich, 48.1374, 11.5755, €520k
...

Suggest 50 new locations that:
- Are at least 500m from existing stores
- Fill geographic gaps
- Target high-population areas

Output JSON with lat, lng, rationale, confidence
```

### 3. Single GPT Call
```typescript
const response = await openai.responses.create({
  model: 'gpt-5-nano',
  input: prompt,
  text: { format: { type: 'json_object' } }
});
```

### 4. Validate & Return
- Parse JSON response
- Validate coordinates
- Check minimum distance (500m)
- Return suggestions to frontend

## Benefits

1. **Speed**: 30 seconds vs 5+ minutes
2. **Cost**: 1 call vs 55+ calls
3. **Simplicity**: 1 service vs 5 services
4. **Reliability**: Fewer points of failure
5. **Coherence**: GPT sees full picture at once
6. **Maintainability**: Much easier to debug and modify

## Token Usage

- **Input**: ~65,000 tokens (1297 stores × 50 tokens each)
- **Output**: ~5,000 tokens (50 suggestions with rationale)
- **Total**: ~70,000 tokens per request
- **Limit**: GPT-5-nano supports 128,000 tokens ✅

## Cost Comparison

### Complex Pipeline (GPT-5-mini)
- 55 calls × ~2,000 tokens = 110,000 tokens
- Cost: ~£0.10 per generation

### Simple Approach (GPT-5-nano)
- 1 call × 70,000 tokens
- Cost: ~£0.03 per generation

**Savings: 70% cheaper**

## Testing

To test the simple approach:

1. Ensure environment variable is set (or not set, as it defaults to simple):
   ```bash
   USE_SIMPLE_EXPANSION=true
   ```

2. Visit the map page: `/stores/map`

3. Click "Generate Expansion Suggestions"

4. Watch the console for:
   ```
   🎯 Using SIMPLE single-call expansion approach
   ```

5. Suggestions should appear in ~30 seconds

## Fallback to Complex Pipeline

The old 5-stage pipeline is still available:

```bash
USE_SIMPLE_EXPANSION=false
```

This keeps the legacy system as a fallback if needed.

## Next Steps

1. ✅ Test with GPT-5-nano
2. Test with real Germany data (1297 stores)
3. Evaluate suggestion quality
4. Consider upgrading to GPT-5-mini if needed
5. Remove complex pipeline once confident

## Notes

- Only analyzes **open stores** (`status: 'Open'`)
- Only uses stores with **valid coordinates**
- Enforces **500m minimum distance** between stores
- Returns suggestions with **rationale and confidence scores**
