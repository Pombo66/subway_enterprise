# Design Document

## Overview

The OpenAI rationale integration in the expansion generation system has a critical disconnect between logging and actual API usage. The system logs "🤖 Using OpenAI rationale for location/settlement" messages but the final statistics show "0 API calls" and "1 fallbacks", indicating that the OpenAI rationale service is not being properly invoked. The issue stems from the `enableAIRationale` parameter being opt-in (default false) and potential configuration problems in the service initialization and method calls.

## Architecture

### Current Flow (Broken)
```
Expansion Generation → enableAIRationale check → generateRationales() → OpenAI Service
                                ↓ (false by default)
                           Skip AI rationales → Use deterministic rationales
```

### Fixed Flow
```
Expansion Generation → Configuration validation → generateRationales() → OpenAI Service
                                ↓ (proper validation)                        ↓
                           Mandatory AI rationales ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
```

## Components and Interfaces

### 1. Expansion Generation Service Fixes

**File**: `apps/admin/lib/services/expansion-generation.service.ts`

**Issues to Fix**:
- `enableAIRationale` parameter defaults to `false` (line 1012)
- No proper error handling when OpenAI service fails
- Statistics tracking is inconsistent between services
- Logging claims OpenAI usage but doesn't actually call the service

**Changes Required**:
```typescript
// Current problematic code:
const enableAI = params.enableAIRationale === true; // default false (opt-in)

// Fixed code:
const enableAI = params.enableAIRationale !== false; // default true (opt-out)
```

### 2. OpenAI Rationale Service Validation

**File**: `apps/admin/lib/services/openai-rationale.service.ts`

**Current State**: Service is correctly implemented with proper error handling
**Issues**: 
- Service throws errors when API key is missing (correct behavior)
- Statistics tracking works properly
- Cache implementation is functional

**No changes needed** - service is working as designed.

### 3. Configuration Validation

**File**: `apps/admin/lib/config/expansion-config.ts`

**New Component**: Add proper configuration validation to ensure OpenAI is properly configured before generation starts.

```typescript
export interface OpenAIConfig {
  enabled: boolean;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export class ExpansionConfigValidator {
  static validateOpenAIConfig(): OpenAIConfig {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'sk-your-openai-api-key-here') {
      throw new Error('OPENAI_API_KEY not properly configured');
    }
    
    return {
      enabled: true,
      apiKey,
      model: process.env.EXPANSION_OPENAI_MODEL || 'gpt-4o-mini',
      temperature: parseFloat(process.env.EXPANSION_OPENAI_TEMPERATURE || '0.2'),
      maxTokens: parseInt(process.env.EXPANSION_OPENAI_MAX_TOKENS || '200')
    };
  }
}
```

### 4. Statistics Tracking Fix

**Issue**: The OpenAI Strategy Service and OpenAI Rationale Service have separate statistics tracking, causing confusion in the logs.

**Solution**: Consolidate statistics reporting to clearly distinguish between:
- OpenAI Strategy Layer (location selection)
- OpenAI Rationale Service (rationale generation)

## Data Models

### Enhanced Generation Metadata

```typescript
interface GenerationMetadata {
  // ... existing fields ...
  
  // Enhanced OpenAI tracking
  openaiUsage: {
    strategyLayer: {
      apiCalls: number;
      tokensUsed: number;
      fallbacksUsed: number;
      cacheHitRate: number;
    };
    rationaleGeneration: {
      apiCalls: number;
      tokensUsed: number;
      errorsEncountered: number;
      cacheHitRate: number;
    };
  };
  
  // Clear feature status
  featuresEnabled: {
    mapboxFiltering: boolean;
    aiRationale: boolean;
    openaiStrategy: boolean;
  };
}
```

## Error Handling

### 1. Configuration Validation Errors

```typescript
// At service initialization
try {
  const openaiConfig = ExpansionConfigValidator.validateOpenAIConfig();
  console.log('✅ OpenAI configuration validated');
} catch (error) {
  console.error('❌ OpenAI configuration invalid:', error.message);
  throw new Error('Cannot proceed with expansion generation: OpenAI not configured');
}
```

### 2. API Call Error Handling

```typescript
// In generateRationales method
for (const suggestion of suggestions) {
  try {
    console.log(`🤖 Calling OpenAI API for location ${suggestion.lat}, ${suggestion.lng}`);
    const rationale = await this.openaiService.generateRationale(context);
    console.log(`✅ OpenAI rationale generated: ${rationale.text.substring(0, 50)}...`);
    // ... process rationale
  } catch (error) {
    console.error(`❌ OpenAI API failed for ${suggestion.lat}, ${suggestion.lng}:`, error);
    // Reject the candidate instead of using fallback
    continue; // Skip this suggestion
  }
}
```

### 3. Statistics Validation

```typescript
// At the end of generation
const rationaleStats = this.openaiService.getCacheStats();
const strategyStats = this.openaiStrategyService.getCacheStats();

// Validate that API calls were actually made
if (enableAI && rationaleStats.apiCalls === 0) {
  console.error('🚨 CRITICAL: AI rationales enabled but 0 API calls made!');
  console.error('   This indicates a configuration or integration issue');
}

console.log(`🤖 OpenAI Rationale Service: ${rationaleStats.apiCalls} API calls, ${rationaleStats.totalTokensUsed} tokens`);
console.log(`🤖 OpenAI Strategy Layer: ${strategyStats.apiCalls} API calls, ${strategyStats.totalTokensUsed} tokens, ${strategyStats.fallbackUsed} fallbacks`);
```

## Testing Strategy

### 1. Unit Tests

**File**: `apps/admin/lib/services/__tests__/openai-rationale-integration.test.ts`

```typescript
describe('OpenAI Rationale Integration', () => {
  test('should make actual API calls when enabled', async () => {
    const service = new ExpansionGenerationService(prisma);
    const params = {
      region: { country: 'Germany' },
      enableAIRationale: true, // Explicitly enabled
      // ... other params
    };
    
    const result = await service.generate(params);
    
    // Verify API calls were made
    const stats = service.getOpenAIStats();
    expect(stats.rationaleGeneration.apiCalls).toBeGreaterThan(0);
    expect(stats.rationaleGeneration.tokensUsed).toBeGreaterThan(0);
  });
  
  test('should fail fast when OpenAI not configured', async () => {
    // Temporarily unset API key
    delete process.env.OPENAI_API_KEY;
    
    const service = new ExpansionGenerationService(prisma);
    const params = {
      region: { country: 'Germany' },
      enableAIRationale: true,
    };
    
    await expect(service.generate(params)).rejects.toThrow('OPENAI_API_KEY not properly configured');
  });
});
```

### 2. Integration Tests

**File**: `apps/admin/lib/services/__tests__/expansion-generation-integration.test.ts`

```typescript
describe('Expansion Generation Integration', () => {
  test('should generate rationales for all suggestions', async () => {
    const service = new ExpansionGenerationService(prisma);
    const result = await service.generate({
      region: { country: 'Germany' },
      enableAIRationale: true,
      targetCount: 10
    });
    
    // Verify all suggestions have AI-generated rationales
    result.suggestions.forEach(suggestion => {
      expect(suggestion.rationaleText).toBeDefined();
      expect(suggestion.rationaleText).not.toContain('deterministic');
      expect(suggestion.rationaleText.length).toBeGreaterThan(50);
    });
    
    // Verify statistics match actual usage
    expect(result.metadata.openaiUsage.rationaleGeneration.apiCalls).toBe(result.suggestions.length);
  });
});
```

### 3. End-to-End Tests

**File**: `apps/admin/__tests__/e2e/expansion-generation.test.ts`

```typescript
describe('Expansion Generation E2E', () => {
  test('should complete full generation with OpenAI rationales', async () => {
    const response = await request(app)
      .post('/api/expansion/generate')
      .send({
        region: { country: 'Germany' },
        enableAIRationale: true,
        targetCount: 5
      });
    
    expect(response.status).toBe(200);
    expect(response.body.suggestions).toHaveLength(5);
    
    // Verify OpenAI usage in metadata
    const metadata = response.body.metadata;
    expect(metadata.openaiUsage.rationaleGeneration.apiCalls).toBeGreaterThan(0);
    expect(metadata.featuresEnabled.aiRationale).toBe(true);
  });
});
```

## Implementation Plan

### Phase 1: Configuration Validation
1. Create `ExpansionConfigValidator` class
2. Add OpenAI configuration validation at service startup
3. Implement fail-fast behavior for missing configuration

### Phase 2: Fix Parameter Defaults
1. Change `enableAIRationale` default from opt-in to opt-out
2. Update parameter documentation
3. Add environment variable override

### Phase 3: Enhanced Logging and Statistics
1. Add detailed logging for each OpenAI API call
2. Separate statistics tracking for Strategy vs Rationale services
3. Add validation that API calls match expected counts

### Phase 4: Error Handling Improvements
1. Implement proper error handling in `generateRationales`
2. Add retry logic for transient API failures
3. Improve error messages for debugging

### Phase 5: Testing and Validation
1. Write comprehensive unit tests
2. Add integration tests for full generation flow
3. Create E2E tests for API endpoints
4. Validate fix with real OpenAI API calls

## Performance Considerations

### API Rate Limiting
- Implement exponential backoff for rate limit errors
- Add configurable concurrency limits for batch processing
- Use caching to minimize duplicate API calls

### Cost Optimization
- Cache rationales for 90 days to reduce API costs
- Use `gpt-4o-mini` model for cost efficiency
- Implement token usage monitoring and alerts

### Timeout Management
- Set reasonable timeouts for OpenAI API calls (30 seconds)
- Implement circuit breaker pattern for repeated failures
- Add graceful degradation when API is unavailable

## Security Considerations

### API Key Management
- Validate API key format and permissions
- Never log API keys in plaintext
- Use environment variables for configuration

### Input Validation
- Sanitize location coordinates before API calls
- Validate score ranges (0-1) before sending to OpenAI
- Implement input size limits to prevent token overflow

### Error Information Disclosure
- Avoid exposing internal API errors to clients
- Log detailed errors server-side only
- Return generic error messages to prevent information leakage