# GPT-5 Responses API Migration

## Summary

All AI services have been migrated from the deprecated Chat Completions API format to the new GPT-5 Responses API format.

## Key Changes Made

### 1. Parameter Structure Updates

**Old Format (Chat Completions API):**
```typescript
{
  model: "gpt-5-mini",
  messages: [...],
  response_format: {
    type: 'json_schema',
    json_schema: {...}
  }
}
```

**New Format (Responses API):**
```typescript
{
  model: "gpt-5-mini",
  input: "System: ...\n\nUser: ...",
  max_output_tokens: 3000,
  reasoning: { effort: 'low' | 'minimal' | 'medium' | 'high' },
  text: { 
    verbosity: 'low' | 'medium' | 'high',
    format: {  // Only when structured output is needed
      type: 'json_schema',
      json_schema: {...}
    }
  }
}
```

### 2. Services Updated

#### ✅ Location Discovery Service
- **File:** `apps/bff/src/services/ai/location-discovery.service.ts`
- **Reasoning Effort:** `low` (for speed in high-volume generation)
- **Verbosity:** `low` (concise output)
- **Format:** JSON schema for structured location candidates

#### ✅ Strategic Zone Identification Service
- **File:** `apps/bff/src/services/ai/strategic-zone-identification.service.ts`
- **Reasoning Effort:** `high` (strategic analysis needs deep reasoning)
- **Verbosity:** `medium` (balanced strategic analysis)
- **Format:** JSON schema for enhanced zones

#### ✅ Viability Scoring & Validation Service
- **File:** `apps/bff/src/services/ai/viability-scoring-validation.service.ts`
- **Two Assessment Types:**
  - **Basic (GPT-5-nano):** `minimal` reasoning, `low` verbosity
  - **Enhanced (GPT-5-mini):** `medium` reasoning, `medium` verbosity
- **Format:** JSON schema for both assessment types

#### ✅ Competitive Landscape Assessment Service
- **File:** `apps/bff/src/services/ai/competitive-landscape-assessment.service.ts`
- **Reasoning Effort:** Configurable via `REASONING_EFFORT`
- **Verbosity:** Configurable via `TEXT_VERBOSITY`
- **Format:** Free-form JSON (no schema constraint)

#### ✅ Strategic Scoring Service
- **File:** `apps/bff/src/services/ai/strategic-scoring.service.ts`
- **Reasoning Effort:** Configurable via `REASONING_EFFORT`
- **Verbosity:** Configurable via `TEXT_VERBOSITY`
- **Format:** Free-form JSON (no schema constraint)

### 3. Reasoning Effort Levels

The system uses different reasoning effort levels based on the task complexity:

- **`minimal`**: Quick assessments (basic viability checks)
- **`low`**: High-volume generation (location discovery)
- **`medium`**: Balanced analysis (enhanced viability, strategic scoring)
- **`high`**: Deep strategic analysis (zone identification)

### 4. Response Handling

All services use the shared utilities from `@subway/shared-ai`:
- `extractText()` - Extracts text from various response formats
- `extractJSON()` - Extracts JSON from markdown or mixed content
- `safeParseJSONWithSchema()` - Validates against Zod schemas

### 5. Error Handling

Services implement graceful degradation:
- If AI enhancement fails, fall back to deterministic algorithms
- Log warnings but don't crash the pipeline
- Return partial results when possible

## Testing

To test the migration:

```bash
# Start the dev servers
pnpm dev

# Trigger an expansion generation
# Navigate to http://localhost:3002/stores/map
# Click "Generate Expansion Suggestions"
```

## Benefits

1. **Better Performance**: GPT-5 models are optimized for the Responses API
2. **Cost Control**: Reasoning effort levels allow fine-tuned token usage
3. **Structured Output**: JSON schema validation ensures consistent responses
4. **Context Retention**: Support for `previous_response_id` (not yet implemented)

## Future Enhancements

- [ ] Implement `previous_response_id` for multi-turn conversations
- [ ] Add response caching for repeated queries
- [ ] Fine-tune reasoning effort levels based on performance metrics
- [ ] Add telemetry for token usage and cost tracking
