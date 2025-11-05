# GPT-5 Reasoning Tokens Fix Summary

## Issue Discovered
GPT-5 models (gpt-5-mini, gpt-5-nano) were returning empty rationale text, causing the expansion system to show "N/A..." instead of actual AI-generated rationales.

## Root Cause Analysis
GPT-5 models use **reasoning tokens** for internal thinking before generating the actual response. The original token limits were too low:

### Original Configuration:
- **Admin rationale service**: 200 max tokens
- **BFF rationale service**: 150 max tokens

### GPT-5 Token Usage Pattern:
```json
{
  "completion_tokens": 426,
  "completion_tokens_details": {
    "reasoning_tokens": 320,  // Internal thinking
    "output_tokens": 106      // Actual response
  }
}
```

With only 200 max tokens, GPT-5 used all tokens for reasoning, leaving **zero tokens for output**.

## Solution Applied
**Increased max_completion_tokens to 500** to accommodate both reasoning and output tokens:

### Files Updated:
1. `apps/admin/lib/services/openai-rationale.service.ts`
   - Changed `MAX_TOKENS` from 200 to 500
2. `apps/bff/src/services/openai-rationale.service.ts`
   - Changed `MAX_TOKENS` from 150 to 500

### Result:
- **Reasoning tokens**: ~320 (internal thinking)
- **Output tokens**: ~100-200 (actual rationale text)
- **Total**: ~420-520 tokens per request

## Verification
Tested with GPT-5-mini and confirmed:
- ✅ Returns proper rationale text (442 characters)
- ✅ Finish reason: "stop" (complete response)
- ✅ No more "N/A..." in API responses

## Impact
- 🔧 **Fixed**: AI rationales now generate properly with GPT-5 models
- 💰 **Cost**: Slightly higher token usage (~2.5x) but necessary for GPT-5 functionality
- 🚀 **Performance**: GPT-5 models now work as intended
- ✅ **Quality**: High-quality, detailed rationales for expansion suggestions

## GPT-5 Model Behavior
GPT-5 models have a unique **reasoning-first** approach:
1. **Reasoning phase**: Internal analysis and thinking (uses reasoning tokens)
2. **Output phase**: Generate the actual response (uses output tokens)
3. **Total tokens**: reasoning_tokens + output_tokens

This is different from GPT-4 models that generate output directly without separate reasoning phases.

## Configuration Maintained
- ✅ Using GPT-5-mini and GPT-5-nano as specified
- ✅ No temperature parameter (GPT-5 uses default 1.0)
- ✅ Proper model configuration maintained
- ✅ Cost optimization with gpt-5-nano for location discovery