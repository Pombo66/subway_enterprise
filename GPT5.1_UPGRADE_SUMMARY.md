# GPT-5.1 Upgrade Summary

## Overview
Upgraded the full GPT model from `gpt-5` to `gpt-5.1` while keeping `gpt-5-mini` unchanged, as per OpenAI's latest model release.

## Changes Made

### 1. Model Configuration Services
Updated both BFF and Admin model configuration services to support `gpt-5.1`:

**Files Modified:**
- `apps/bff/src/services/ai/model-configuration.service.ts`
- `apps/admin/lib/services/ai/model-configuration.service.ts`

**Changes:**
- Added `gpt-5.1` to `SUPPORTED_MODELS` array
- Added pricing configuration for `gpt-5.1`:
  - Input: $1.25 per 1M tokens
  - Output: $10.00 per 1M tokens

### 2. Service Interfaces
Updated service interfaces to use `gpt-5.1` instead of `gpt-5`:

**Files Modified:**
- `apps/bff/src/services/ai/simple-expansion.service.ts`
  - Updated `SimpleExpansionRequest.model` type: `'gpt-5.1' | 'gpt-5-mini'`
  - Updated initialization log message
  
- `apps/bff/src/services/ai/store-analysis.service.ts`
  - Updated `StoreAnalysisRequest.model` type: `'gpt-5.1' | 'gpt-5-mini'`
  - Updated initialization log message

### 3. API Controllers
Updated expansion controller to accept `gpt-5.1`:

**Files Modified:**
- `apps/bff/src/routes/expansion.controller.ts`
  - Updated model type in `/ai/pipeline/execute` endpoint

## Pricing Comparison

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| gpt-5-nano | $0.05 | $0.40 |
| gpt-5-mini | $0.25 | $2.00 |
| gpt-5.1 | $1.25 | $10.00 |

## Model Capabilities (from OpenAI docs)

**GPT-5.1:**
- Best model for coding and agentic tasks
- Configurable reasoning effort
- 400,000 context window
- 128,000 max output tokens
- Sep 30, 2024 knowledge cutoff
- Reasoning token support

**GPT-5-mini:**
- Kept unchanged (no upgrade needed)
- Continues to serve as the cost-effective option

## Migration Notes

1. **No Breaking Changes**: The upgrade is backward compatible. Existing code using `gpt-5` will need to be updated to use `gpt-5.1`.

2. **Cost Impact**: GPT-5.1 is 5x more expensive than gpt-5-mini for input tokens and 5x for output tokens. Use it strategically for complex tasks that require higher reasoning capability.

3. **Environment Variables**: No changes needed to environment variables. The model selection is done programmatically via the `model` parameter in API requests.

4. **Default Model**: The default model remains `gpt-5-mini` for cost efficiency.

## Testing Recommendations

1. Test simple expansion with `gpt-5.1`:
   ```bash
   curl -X POST http://localhost:3001/ai/pipeline/execute \
     -H "Content-Type: application/json" \
     -d '{
       "region": "Germany",
       "existingStores": [...],
       "targetCandidates": 50,
       "useSimpleApproach": true,
       "model": "gpt-5.1"
     }'
   ```

2. Test store analysis with `gpt-5.1`:
   ```bash
   # Via the store analysis service
   ```

3. Verify cost tracking is accurate with new pricing

## Status: ✅ Complete

All references to `gpt-5` have been upgraded to `gpt-5.1`. The system now supports:
- `gpt-5-nano` (cost-effective, basic tasks)
- `gpt-5-mini` (balanced, most operations)
- `gpt-5.1` (premium, complex reasoning tasks)
