# OpenAI Strategy Layer Guide

## Overview

The OpenAI Strategy Layer is an AI-powered component that replaces deterministic location selection with intelligent strategic analysis. It acts as a "Subway Expansion Strategist AI" that evaluates settlement candidates using comprehensive market data to make optimal location decisions.

## Architecture

### Integration Flow
```
Enhanced Candidate Generation (1500+ candidates)
    ↓
Intelligence Layers (Population, Anchors, Performance, Fairness)
    ↓
OpenAI Strategy Layer (AI-driven selection)
    ↓
Quality Validation & Guardrails
    ↓
Final Suggestions (600 locations)
```

### Key Components

1. **OpenAI Expansion Strategy Service** (`openai-expansion-strategy.service.ts`)
   - Handles API communication with OpenAI
   - Implements retry logic and error handling
   - Provides fallback to deterministic selection

2. **Prompt Engineering**
   - Structured prompt positions AI as retail expansion strategist
   - Includes candidate data, existing store context, and strategic objectives
   - Ensures consistent JSON response format

3. **Response Validation**
   - Schema validation for JSON structure
   - Geographic coordinate validation
   - Rationale quality assessment

4. **Quality Guardrails**
   - Geographic balance validation (max 40% per state)
   - Selection consistency checks (30% overlap with top deterministic candidates)
   - Performance comparison metrics

## Configuration

### Environment Variables

```bash
# Core Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
EXPANSION_OPENAI_ENABLED=true

# Model Settings
EXPANSION_OPENAI_MODEL=gpt-4                    # Recommended for strategic decisions
EXPANSION_OPENAI_TEMPERATURE=0.3                # Lower = more consistent
EXPANSION_OPENAI_MAX_TOKENS=4000                # Allows detailed analysis

# Performance Settings
EXPANSION_OPENAI_TIMEOUT_MS=30000               # 30 second timeout
EXPANSION_OPENAI_RETRY_ATTEMPTS=3               # Retry failed calls
EXPANSION_OPENAI_FALLBACK_ENABLED=true          # Enable deterministic fallback
```

### Model Selection

- **gpt-4**: Recommended for production (better strategic reasoning)
- **gpt-3.5-turbo**: Faster and cheaper (good for development/testing)

### Temperature Settings

- **0.1-0.3**: Consistent, deterministic decisions (recommended)
- **0.4-0.7**: More creative but less predictable
- **0.8-1.0**: Highly creative but potentially inconsistent

## API Integration

### Request Format

The service converts expansion candidates to structured data for AI analysis:

```typescript
interface StrategyPromptData {
  candidates: Array<{
    name: string;
    lat: number;
    lng: number;
    population: number;
    nearestStoreDistance: number;  // km
    anchorCount: number;
    peerPerformanceScore: number;  // 0-1
    stateCode: string;
  }>;
  existingStores: Array<{
    lat: number;
    lng: number;
    state: string;
  }>;
  targetCount: number;
}
```

### Response Format

The AI returns structured JSON with selections and strategic analysis:

```json
{
  "selected": [
    {
      "name": "Heidelberg",
      "lat": 49.3988,
      "lng": 8.6724,
      "rationale": "High population (160k), strong anchor network (12 POIs), 14km nearest store gap, and strong peer turnover performance."
    }
  ],
  "summary": {
    "selectedCount": 600,
    "stateDistribution": {
      "Bavaria": 75,
      "NRW": 80,
      "Hesse": 60,
      "Baden-Württemberg": 65
    },
    "keyDrivers": [
      "population_gap",
      "anchor_density", 
      "peer_performance"
    ]
  }
}
```

## Error Handling

### Retry Logic

The system implements exponential backoff for API failures:

1. **First attempt**: Immediate call
2. **Second attempt**: 2 second delay
3. **Third attempt**: 4 second delay
4. **Fourth attempt**: 8 second delay

### Rate Limiting

OpenAI rate limits are handled automatically:
- Detects rate limit errors in API response
- Applies exponential backoff delays
- Logs rate limit events for monitoring

### Fallback Mechanism

When OpenAI fails, the system falls back to enhanced deterministic selection:
- Sorts candidates by total score
- Applies geographic balance (max per state)
- Generates deterministic rationales
- Maintains target count and quality

### Error Types

```typescript
class OpenAIStrategyError extends Error {
  errorType: 'api_failure' | 'rate_limit' | 'invalid_response' | 'parsing_error';
  originalError?: Error;
  retryAttempt?: number;
}
```

## Quality Validation

### Geographic Balance

- **Maximum State Share**: 40% of selections per state
- **Distribution Check**: Validates fair representation across German states
- **Failure Action**: Logs warning but allows generation to continue

### Rationale Quality

- **Minimum Length**: 50 characters per rationale
- **Keyword Presence**: Must include strategic terms (population, anchor, gap, performance)
- **Failure Action**: Logs quality issues for monitoring

### Selection Consistency

- **Top Candidate Overlap**: Minimum 30% overlap with deterministic top candidates
- **Score Correlation**: AI selections should achieve 80% of deterministic average score
- **Failure Action**: Logs consistency warnings

### Performance Comparison

Tracks AI vs deterministic selection performance:
- Average candidate scores
- Geographic distribution quality
- Selection rationale coherence
- Processing time and token usage

## Monitoring and Diagnostics

### Performance Metrics

```typescript
interface PerformanceMetrics {
  candidatesPerSecond: number;
  memoryUsageMB: number;
  openaiApiCalls: number;
  openaiTokensUsed: number;
  openaiErrors: number;
  openaiResponseTimeMs: number;
}
```

### Cache Statistics

```typescript
interface CacheStats {
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  apiCalls: number;
  totalTokensUsed: number;
  apiErrors: number;
  fallbackUsed: number;
}
```

### Logging

The system provides comprehensive logging:

```bash
🤖 OpenAI Strategy Layer analyzing 1247 candidates for 600 selections...
   Attempt 1/3: Calling OpenAI API...
   OpenAI API success: 3247 tokens used
✅ OpenAI Strategy Layer selected 600 locations
🤖 OpenAI Selection Quality Validation: PASSED
   Geographic Balance: PASS (max state: 38.2%)
   Rationale Quality: PASS (avg length: 127 chars)
   Selection Consistency: PASS (overlap: 67.3%, correlation: 94.1%)
   AI vs Deterministic: +12.4% score improvement
```

## Troubleshooting

### Common Issues

#### API Key Problems
```bash
Error: OpenAI API key not configured and fallback is disabled
```
**Solution**: Set `OPENAI_API_KEY` in environment variables

#### Rate Limiting
```bash
⚠️ Rate limited, waiting 4000ms before retry...
```
**Solution**: System handles automatically; consider upgrading OpenAI plan for higher limits

#### Timeout Issues
```bash
Error: OpenAI API timeout after 30000ms
```
**Solutions**:
- Increase `EXPANSION_OPENAI_TIMEOUT_MS`
- Reduce candidate count
- Use faster model (gpt-3.5-turbo)

#### JSON Parsing Errors
```bash
Error: JSON parsing error: Unexpected token
```
**Solutions**:
- Check OpenAI model supports structured output
- Verify prompt template formatting
- Review API response in logs

#### Quality Validation Failures
```bash
⚠️ Geographic imbalance: One state has 45.2% of selections (max allowed: 40%)
```
**Solutions**:
- Review candidate distribution
- Adjust prompt to emphasize geographic balance
- Check state mapping logic

### Performance Optimization

#### Token Usage
- **Typical Usage**: 2000-4000 tokens per analysis
- **Large Regions**: Up to 8000 tokens for country-wide analysis
- **Optimization**: Reduce candidate descriptions in prompt

#### Response Time
- **Typical Time**: 15-30 seconds for 600 selections
- **Large Datasets**: 45-60 seconds for 1500+ candidates
- **Optimization**: Use gpt-3.5-turbo for faster responses

#### Memory Usage
- **Typical Usage**: 200-500MB for candidate processing
- **Large Regions**: 500MB-1GB for country-wide analysis
- **Optimization**: Process candidates in batches

### Debugging

#### Enable Debug Logging
```bash
# Add to environment
DEBUG=openai:*
EXPANSION_ENABLE_DIAGNOSTICS=true
```

#### Check Health Status
```bash
curl http://localhost:3002/api/expansion/health
```

#### Review Cache Performance
Check logs for cache hit rates and API usage patterns.

## Best Practices

### Production Deployment

1. **API Key Security**
   - Use environment variables, never hardcode
   - Rotate keys regularly
   - Monitor usage and costs

2. **Error Handling**
   - Always enable fallback mechanism
   - Monitor error rates and types
   - Set appropriate timeout values

3. **Performance**
   - Use caching for repeated analyses
   - Monitor token usage and costs
   - Set reasonable retry limits

4. **Quality Assurance**
   - Validate AI selections against business rules
   - Monitor geographic balance
   - Review rationale quality regularly

### Development

1. **Testing**
   - Use gpt-3.5-turbo for faster iteration
   - Test with smaller candidate sets
   - Validate JSON response format

2. **Debugging**
   - Enable comprehensive logging
   - Use deterministic fallback for comparison
   - Monitor cache performance

3. **Optimization**
   - Tune temperature for consistency
   - Adjust token limits based on needs
   - Profile memory usage with large datasets

## Security Considerations

### API Key Management
- Store in secure environment variables
- Never commit to version control
- Use different keys for dev/staging/production
- Monitor usage for anomalies

### Data Privacy
- Candidate data includes geographic coordinates only
- No personally identifiable information sent to OpenAI
- Responses cached locally for performance

### Rate Limiting
- Implement application-level rate limiting
- Monitor API usage against quotas
- Have fallback mechanisms ready

### Error Handling
- Never expose API keys in error messages
- Log errors securely without sensitive data
- Implement proper timeout handling