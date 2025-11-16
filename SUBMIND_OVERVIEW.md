# SubMind AI Assistant - Overview

## Purpose

SubMind is an AI-powered assistant integrated into the Subway Enterprise admin dashboard. It provides context-aware insights and analysis to help restaurant managers and executives make informed decisions.

## Current Model Configuration

**Backend Service (`apps/bff/src/services/submind.service.ts`):**
- **Model:** `gpt-5-mini`
- **Max Tokens:** 
  - General queries: 1,000 tokens
  - Expansion analysis: 1,200 tokens
  - Scope-specific expansion: 1,500 tokens

## Key Features

### 1. Ask Tab
- General Q&A about restaurant operations
- Context-aware responses based on current screen
- Access to KPIs, trends, and business metrics

### 2. Explain Tab
- Detailed explanations of data and metrics
- Screen-specific insights
- Operational efficiency analysis

### 3. Generate Tab
- AI-generated recommendations
- Strategic planning assistance
- Expansion opportunity analysis

## Specialized Analysis Modes

### General Query Processing
- **System Prompt:** SubMind acts as an AI assistant for Subway Enterprise management
- **Focus:** Restaurant operations, KPIs, trends, business metrics
- **Context:** Screen location, user scope, selected data

### Expansion Analysis
- **System Prompt:** Specialized for restaurant expansion decisions
- **Capabilities:**
  - Market analysis and demographic assessment
  - Competition evaluation and positioning
  - Site selection criteria
  - Financial projections and ROI analysis
  - Risk assessment
  - Regional market trends

### Scope-Specific Expansion Analysis
- **System Prompt:** Advanced location-specific analysis
- **Enhanced Capabilities:**
  - Geographic and demographic analysis for specific coordinates
  - Local market assessment
  - Site-specific operational feasibility
  - Cannibalization risk analysis
  - ROI projections based on location characteristics
  - Regulatory and zoning considerations

## UI Components

### Floating Action Button (FAB)
- **Location:** Fixed bottom-right corner (bottom-6 right-6)
- **Appearance:** Circular blue button with chat icon
- **Z-index:** 50 (high priority)
- **Visibility:** Only shown when `NEXT_PUBLIC_FEATURE_SUBMIND=true`

### Drawer Interface
- **Width:** 384px (w-96)
- **Position:** Right side of screen
- **Tabs:** Ask, Explain, Generate
- **Z-index:** 50 (drawer), 40 (overlay)

## Configuration

### Feature Flag
```bash
# Enable/disable SubMind feature
NEXT_PUBLIC_FEATURE_SUBMIND=true
```

### Backend Configuration
```bash
# OpenAI API key (required for AI functionality)
OPENAI_API_KEY=sk-...

# Rate limiting (optional)
SUBMIND_RATE_LIMIT_REQUESTS=10
SUBMIND_RATE_LIMIT_WINDOW=60
```

### Configuration Service
- **File:** `apps/admin/lib/config/index.ts`
- **Getter:** `config.isSubMindEnabled`
- **Default:** `true` (if env var not set)

## API Endpoints

### Query Endpoint
```
POST /ai/submind/query
```

**Request:**
```typescript
{
  prompt: string;
  context?: {
    screen?: string;
    selection?: any;
    scope?: {
      region?: string;
      country?: string;
      storeId?: string;
      franchiseeId?: string;
    };
  };
}
```

**Response:**
```typescript
{
  message: string;
  sources?: Array<{
    type: 'api' | 'sql' | 'note';
    ref: string;
  }>;
  meta?: {
    tokens?: number;
    latencyMs?: number;
  };
}
```

### Expansion Analysis Endpoint
```
POST /ai/submind/expansion
```

**Request:**
```typescript
{
  region: string;
  reasons: string[];
}
```

## Security Features

### Input Sanitization
- HTML stripping
- Whitespace normalization
- Prompt length validation (max 4,000 chars)
- Context data sanitization

### Rate Limiting
- Token bucket algorithm
- Default: 10 requests per 60 seconds
- Per-client IP tracking
- Configurable via environment variables

### Telemetry
- Query tracking
- Error logging
- Performance metrics
- Rate limit events
- Sampling for payload size (1 in 5 requests)

## Fallback Behavior

When OpenAI API key is not configured:
- Service returns placeholder responses
- Explains that AI integration is pending
- Provides information about what the feature would do
- Suggests configuring `OPENAI_API_KEY`

## Cost Considerations

**GPT-5-mini Pricing:**
- Input: $0.25 per 1M tokens
- Output: $2.00 per 1M tokens

**Typical Usage:**
- General query: ~500-1,000 tokens
- Expansion analysis: ~800-1,200 tokens
- Scope analysis: ~1,000-1,500 tokens

## Integration Points

### Provider Setup
- **Component:** `SubMindProvider` wraps the entire app
- **Location:** Root layout or app wrapper
- **Context:** Provides `isOpen`, `activeTab`, `openDrawer`, `closeDrawer`, `setActiveTab`, `isEnabled`

### Usage in Components
```typescript
import { useSubMind } from '@/app/components/submind/useSubMind';

function MyComponent() {
  const { openDrawer, isEnabled } = useSubMind();
  
  if (!isEnabled) return null;
  
  return (
    <button onClick={openDrawer}>
      Ask SubMind
    </button>
  );
}
```

## Troubleshooting

### Icon Not Showing
1. Check `NEXT_PUBLIC_FEATURE_SUBMIND=true` in `.env.local`
2. Verify `SubMindProvider` is in the component tree
3. Check browser console for errors
4. Verify z-index conflicts with other UI elements
5. Check if CSS classes are properly loaded

### API Errors
1. Verify `OPENAI_API_KEY` is set in backend `.env`
2. Check BFF service is running
3. Review rate limiting configuration
4. Check network connectivity to OpenAI API

### Performance Issues
1. Review token usage in telemetry
2. Adjust max_completion_tokens if needed
3. Consider implementing caching for common queries
4. Monitor rate limiting thresholds

## Future Enhancements

Potential areas for improvement:
1. **Model Upgrade:** Consider upgrading to `gpt-5.1` for complex analysis tasks
2. **Caching:** Implement response caching for common queries
3. **Context Enhancement:** Add more screen-specific context
4. **Streaming:** Implement streaming responses for better UX
5. **Multi-turn Conversations:** Add conversation history support
6. **Custom Prompts:** Allow users to customize system prompts
7. **Analytics Dashboard:** Track usage patterns and insights
