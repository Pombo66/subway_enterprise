# GPT-5 Response Parsing Fix

## Problem
The OpenAI expansion system was failing with "No response from OpenAI" errors because the GPT-5 Responses API has a completely different response structure than the Chat Completions API.

## Root Cause
The GPT-5 Responses API (`/v1/responses`) returns responses in this structure:
```json
{
  "output": [
    {
      "type": "reasoning",
      "summary": []
    },
    {
      "type": "message",
      "content": [
        {
          "type": "output_text",
          "text": "The actual response content"
        }
      ]
    }
  ]
}
```

But the code was trying to access `data.output.content` (which doesn't exist) instead of `data.output[1].content[0].text`.

## Solution Applied

### 1. Fixed Response Parsing
Updated all OpenAI services to correctly parse GPT-5 responses:
- Find the message output: `data.output.find(item => item.type === 'message')`
- Extract text: `messageOutput.content[0].text`

### 2. Optimized Token Usage
- Increased `max_output_tokens` from 500 to 1000
- Reduced `reasoning.effort` from 'medium' to 'low'
- Reduced `text.verbosity` from 'medium' to 'low'

This prevents the reasoning tokens from consuming the entire token budget.

### 3. Enhanced Error Handling
- Added detection for incomplete responses
- Improved error messages with response status details
- Added warnings for incomplete responses

## Files Fixed
- `apps/admin/lib/services/openai-rationale.service.ts`
- `apps/bff/src/services/openai-rationale.service.ts`
- `apps/admin/lib/services/openai-expansion-strategy.service.ts`
- `apps/admin/lib/services/ai/market-analysis.service.ts`
- `apps/admin/lib/services/ai/location-discovery.service.ts`
- And 13+ other AI services across the codebase

## Verification
The fix was tested with a live API call that successfully generated a rationale:
```
"Central Berlin (52.5200, 13.4050) shows strong population density and high footfall from residents, commuters and tourists, supporting steady daytime and evening demand (Population Score 85%). A moderate proximity gap (70%) indicates room to capture unmet demand versus competitors, and solid sales potential (75%) suggests above-average revenue prospects for a Subway concept in this transit-rich, mixed-use area."
```

## Impact
- ✅ OpenAI rationale generation now works correctly
- ✅ All GPT-5 AI services can parse responses properly
- ✅ Reduced token costs through optimized reasoning settings
- ✅ Better error handling for debugging future issues

The expansion system should now successfully generate AI-powered rationales for location suggestions.