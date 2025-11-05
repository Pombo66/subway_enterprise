# Design Document

## Overview

This design provides a comprehensive solution for diagnosing and fixing the 500 Internal Server Error in the expansion generation endpoint. The approach focuses on defensive programming, detailed logging, graceful degradation, and clear error communication to users.

### Key Design Principles

1. **Fail Fast with Clear Messages**: Validate inputs and dependencies early, return specific error codes
2. **Graceful Degradation**: Optional features (Mapbox, OpenAI) should not break core functionality
3. **Comprehensive Logging**: Log everything needed to diagnose issues without exposing sensitive data to users
4. **User-Friendly Errors**: Translate technical errors into actionable user messages
5. **Health Checks**: Provide endpoints to verify system readiness

## Architecture

### Error Flow Diagram

```
Request → Validation → Auth Check → Rate Limit → Service Initialization → Generation
    ↓          ↓            ↓            ↓                ↓                    ↓
  400        400          401          429              503                 500
  Bad        Invalid      Unauth       Too Many         Service             Internal
  Request    Params       orized       Requests         Unavail             Error
```

### Service Dependency Chain

```
ExpansionGenerationService
├── PrismaClient (required)
│   └── Database connection (required)
├── MapboxTilequeryService (optional)
│   └── MAPBOX_ACCESS_TOKEN (optional)
└── OpenAIRationaleService (optional)
    └── OPENAI_API_KEY (optional)
```

## Components and Interfaces

### 1. Enhanced Error Logging

**Location**: `apps/admin/lib/logging/expansion-logger.ts`

Add new logging methods:

```typescript
export class ExpansionLogger {
  // Existing methods...
  
  static logServiceInitialization(config: {
    mapboxEnabled: boolean;
    openaiEnabled: boolean;
    databaseConnected: boolean;
  }) {
    console.log('🔧 Expansion Service Initialization:', {
      timestamp: new Date().toISOString(),
      mapbox: config.mapboxEnabled ? '✅ Enabled' : '⚠️  Disabled',
      openai: config.openaiEnabled ? '✅ Enabled' : '⚠️  Disabled',
      database: config.databaseConnected ? '✅ Connected' : '❌ Disconnected'
    });
  }
  
  static logDetailedError(error: Error, context: {
    endpoint: string;
    params?: any;
    userId?: string;
    requestId?: string;
  }) {
    console.error('❌ Expansion Generation Error:', {
      timestamp: new Date().toISOString(),
      endpoint: context.endpoint,
      userId: context.userId,
      requestId: context.requestId,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      params: context.params ? JSON.stringify(context.params, null, 2) : 'N/A'
    });
  }
  
  static logDatabaseError(error: any, operation: string) {
    console.error('💾 Database Error:', {
      timestamp: new Date().toISOString(),
      operation,
      errorCode: error.code,
      errorMessage: error.message,
      meta: error.meta
    });
  }
  
  static logMissingDependency(dependency: string, impact: string) {
    console.warn('⚠️  Missing Dependency:', {
      timestamp: new Date().toISOString(),
      dependency,
      impact,
      action: 'Feature will be disabled'
    });
  }
}
```

### 2. Environment Variable Validation

**Location**: `apps/admin/lib/config/expansion-config.ts` (new file)

```typescript
export interface ExpansionConfig {
  database: {
    url: string;
    connected: boolean;
  };
  mapbox: {
    enabled: boolean;
    token?: string;
  };
  openai: {
    enabled: boolean;
    apiKey?: string;
  };
  features: {
    mapboxFiltering: boolean;
    aiRationale: boolean;
  };
}

export class ExpansionConfigValidator {
  private static instance: ExpansionConfig | null = null;
  
  static async validate(): Promise<ExpansionConfig> {
    if (this.instance) {
      return this.instance;
    }
    
    const config: ExpansionConfig = {
      database: {
        url: process.env.DATABASE_URL || '',
        connected: false
      },
      mapbox: {
        enabled: false,
        token: process.env.MAPBOX_ACCESS_TOKEN
      },
      openai: {
        enabled: false,
        apiKey: process.env.OPENAI_API_KEY
      },
      features: {
        mapboxFiltering: false,
        aiRationale: false
      }
    };
    
    // Validate database
    if (!config.database.url) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    try {
      const prisma = new PrismaClient();
      await prisma.$connect();
      config.database.connected = true;
      await prisma.$disconnect();
    } catch (error) {
      console.error('Database connection failed:', error);
      config.database.connected = false;
    }
    
    // Check optional features
    if (config.mapbox.token) {
      config.mapbox.enabled = true;
      config.features.mapboxFiltering = true;
    } else {
      ExpansionLogger.logMissingDependency(
        'MAPBOX_ACCESS_TOKEN',
        'Urban suitability filtering will be disabled'
      );
    }
    
    if (config.openai.apiKey) {
      config.openai.enabled = true;
      config.features.aiRationale = true;
    } else {
      ExpansionLogger.logMissingDependency(
        'OPENAI_API_KEY',
        'AI-generated rationales will be disabled'
      );
    }
    
    ExpansionLogger.logServiceInitialization({
      mapboxEnabled: config.mapbox.enabled,
      openaiEnabled: config.openai.enabled,
      databaseConnected: config.database.connected
    });
    
    this.instance = config;
    return config;
  }
  
  static getConfig(): ExpansionConfig | null {
    return this.instance;
  }
  
  static reset() {
    this.instance = null;
  }
}
```

### 3. Health Check Endpoint

**Location**: `apps/admin/app/api/expansion/health/route.ts` (new file)

```typescript
import { NextResponse } from 'next/server';
import { ExpansionConfigValidator } from '../../../../lib/config/expansion-config';

export async function GET() {
  try {
    const config = await ExpansionConfigValidator.validate();
    
    const health = {
      status: config.database.connected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: config.database.connected ? 'up' : 'down',
          required: true
        },
        mapbox: {
          status: config.mapbox.enabled ? 'up' : 'disabled',
          required: false
        },
        openai: {
          status: config.openai.enabled ? 'up' : 'disabled',
          required: false
        }
      },
      features: {
        coreGeneration: config.database.connected,
        mapboxFiltering: config.features.mapboxFiltering,
        aiRationale: config.features.aiRationale
      }
    };
    
    const statusCode = config.database.connected ? 200 : 503;
    
    return NextResponse.json(health, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      },
      { status: 503 }
    );
  }
}
```

### 4. Enhanced API Route Error Handling

**Location**: `apps/admin/app/api/expansion/generate/route.ts`

Modifications to the existing route:

```typescript
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    // 1. Validate configuration
    const config = await ExpansionConfigValidator.validate();
    
    if (!config.database.connected) {
      ExpansionLogger.logDetailedError(
        new Error('Database not connected'),
        { endpoint: '/api/expansion/generate', requestId }
      );
      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          message: 'Database connection failed. Please try again later.',
          code: 'DATABASE_UNAVAILABLE'
        },
        { status: 503 }
      );
    }
    
    // 2. Check authentication
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 3. Check authorization
    if (!hasExpansionAccess(authContext.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Expansion feature access required' },
        { status: 403 }
      );
    }
    
    // 4. Check rate limit
    const rateLimitResult = expansionRateLimiter.check(authContext.userId);
    if (!rateLimitResult.allowed) {
      ExpansionLogger.logRateLimitHit(authContext.userId);
      return NextResponse.json(
        {
          error: 'Too many generation requests',
          message: 'Please try again later',
          resetTime: rateLimitResult.resetTime
        },
        { status: 429 }
      );
    }
    
    // 5. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const validation = validateGenerationParams(body);
    if (!validation.valid) {
      ExpansionLogger.logValidationError(validation.errors);
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }
    
    // 6. Override optional features based on config
    const params = {
      ...validation.params!,
      enableMapboxFiltering: config.features.mapboxFiltering && 
        (validation.params!.enableMapboxFiltering !== false),
      enableAIRationale: config.features.aiRationale && 
        (validation.params!.enableAIRationale === true)
    };
    
    // 7. Generate suggestions
    ExpansionLogger.logGenerationStart(params);
    const service = new ExpansionGenerationService(prisma);
    const result = await service.generate(params);
    ExpansionLogger.logGenerationComplete(result);
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    // Enhanced error logging
    ExpansionLogger.logDetailedError(error, {
      endpoint: '/api/expansion/generate',
      params: await request.json().catch(() => null),
      requestId
    });
    
    // Specific error handling
    if (error.message === 'No stores found in region') {
      return NextResponse.json(
        {
          error: 'No stores found',
          message: 'No stores were found in the specified region. Please adjust your filters.',
          code: 'NO_STORES'
        },
        { status: 400 }
      );
    }
    
    if (error.code === 'P2002' || error.code?.startsWith('P')) {
      // Prisma error
      ExpansionLogger.logDatabaseError(error, 'generate');
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'A database error occurred. Please try again.',
          code: 'DATABASE_ERROR'
        },
        { status: 500 }
      );
    }
    
    // Generic 500 error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again or contact support.',
        code: 'INTERNAL_ERROR',
        requestId
      },
      { status: 500 }
    );
  }
}
```

### 5. Service-Level Error Handling

**Location**: `apps/admin/lib/services/expansion-generation.service.ts`

Add try-catch blocks around external service calls:

```typescript
private async applyMapboxFiltering(candidates: ScoredCell[]): Promise<ScoredCell[]> {
  const validated: ScoredCell[] = [];
  
  // Check if Mapbox is configured
  const config = ExpansionConfigValidator.getConfig();
  if (!config?.mapbox.enabled) {
    console.warn('⚠️  Mapbox filtering skipped: MAPBOX_ACCESS_TOKEN not configured');
    return candidates; // Return all candidates without filtering
  }
  
  for (const candidate of candidates) {
    try {
      const result = await this.mapboxService.validateLocation(
        candidate.center[1],
        candidate.center[0]
      );
      
      if (result.isSuitable) {
        (candidate as any).mapboxData = result;
        validated.push(candidate);
      }
    } catch (error) {
      console.error(`Mapbox validation failed for ${candidate.center}:`, error);
      // Graceful degradation: include candidate anyway
      (candidate as any).mapboxData = {
        isSuitable: true,
        landuseType: null,
        roadDistanceM: null,
        buildingDistanceM: null,
        urbanDensityIndex: null
      };
      validated.push(candidate);
    }
  }
  
  return validated;
}

private async generateRationales(suggestions: ExpansionSuggestionData[]): Promise<ExpansionSuggestionData[]> {
  const config = ExpansionConfigValidator.getConfig();
  if (!config?.openai.enabled) {
    console.warn('⚠️  AI rationale generation skipped: OPENAI_API_KEY not configured');
    return suggestions; // Return suggestions with default rationales
  }
  
  const withRationales: ExpansionSuggestionData[] = [];
  
  for (const suggestion of suggestions) {
    try {
      const mapboxData = (suggestion as any).mapboxData;
      
      const rationale = await this.openaiService.generateRationale({
        lat: suggestion.lat,
        lng: suggestion.lng,
        populationScore: suggestion.rationale.population,
        proximityScore: suggestion.rationale.proximityGap,
        turnoverScore: suggestion.rationale.turnoverGap,
        urbanDensity: mapboxData?.urbanDensityIndex || null,
        roadDistance: mapboxData?.roadDistanceM || null,
        buildingDistance: mapboxData?.buildingDistanceM || null
      });
      
      withRationales.push({
        ...suggestion,
        rationaleText: rationale,
        urbanDensityIndex: mapboxData?.urbanDensityIndex,
        roadDistanceM: mapboxData?.roadDistanceM,
        buildingDistanceM: mapboxData?.buildingDistanceM,
        landuseType: mapboxData?.landuseType,
        mapboxValidated: !!mapboxData
      });
    } catch (error) {
      console.error(`Rationale generation failed for ${suggestion.lat}, ${suggestion.lng}:`, error);
      // Keep suggestion with existing rationale
      withRationales.push(suggestion);
    }
  }
  
  return withRationales;
}

private async loadStores(region: RegionFilter): Promise<Store[]> {
  try {
    const where: any = {
      latitude: { not: null },
      longitude: { not: null }
    };
    
    if (region.country) {
      where.country = region.country;
    }
    
    if (region.state) {
      where.region = region.state;
    }
    
    if (region.boundingBox) {
      where.latitude = {
        gte: region.boundingBox.south,
        lte: region.boundingBox.north
      };
      where.longitude = {
        gte: region.boundingBox.west,
        lte: region.boundingBox.east
      };
    }
    
    const stores = await this.prisma.store.findMany({
      where,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        annualTurnover: true,
        cityPopulationBand: true
      },
      orderBy: { id: 'asc' }
    });
    
    const validStores = stores.filter(s => s.latitude !== null && s.longitude !== null) as Store[];
    
    if (validStores.length === 0) {
      throw new Error('No stores found in region');
    }
    
    console.log(`📍 Loaded ${validStores.length} stores for region:`, region);
    return validStores;
    
  } catch (error: any) {
    if (error.message === 'No stores found in region') {
      throw error; // Re-throw our custom error
    }
    
    // Database error
    ExpansionLogger.logDatabaseError(error, 'loadStores');
    throw new Error(`Failed to load stores: ${error.message}`);
  }
}
```

### 6. Frontend Error Display

**Location**: `apps/admin/app/stores/map/components/ExpansionIntegratedMapPage.tsx`

Update the error handling in the generate handler:

```typescript
const handleGenerate = async (params: GenerationParams) => {
  setLoading(true);
  setError(null);
  
  try {
    const response = await fetch('/api/expansion/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Handle specific error codes
      let errorMessage = data.message || 'Failed to generate suggestions';
      
      switch (data.code) {
        case 'NO_STORES':
          errorMessage = 'No stores found in the selected region. Try adjusting your filters or selecting a different area.';
          break;
        case 'DATABASE_UNAVAILABLE':
          errorMessage = 'Database connection failed. Please try again in a moment.';
          break;
        case 'DATABASE_ERROR':
          errorMessage = 'A database error occurred. Please try again.';
          break;
        case 'INTERNAL_ERROR':
          errorMessage = `An unexpected error occurred. Request ID: ${data.requestId}. Please contact support if this persists.`;
          break;
      }
      
      setError(errorMessage);
      
      // Show toast notification
      toast.error(errorMessage);
      
      return;
    }
    
    setSuggestions(data.suggestions);
    
    // Show success message with metadata
    const { metadata } = data;
    toast.success(
      `Generated ${data.suggestions.length} suggestions in ${metadata.generationTimeMs}ms`
    );
    
    // Log feature usage
    console.log('Generation metadata:', {
      mapboxFiltering: metadata.mapboxFiltered !== undefined,
      aiRationale: data.suggestions[0]?.rationaleText?.length > 100,
      cacheHitRate: metadata.cacheHitRate
    });
    
  } catch (error: any) {
    console.error('Generation error:', error);
    setError('Network error. Please check your connection and try again.');
    toast.error('Network error. Please check your connection and try again.');
  } finally {
    setLoading(false);
  }
};
```

### 7. Startup Configuration Check

**Location**: `apps/admin/app/api/expansion/generate/route.ts`

Add initialization at module level:

```typescript
// Initialize configuration on first import
let configInitialized = false;

async function ensureConfigInitialized() {
  if (!configInitialized) {
    try {
      await ExpansionConfigValidator.validate();
      configInitialized = true;
    } catch (error) {
      console.error('Failed to initialize expansion configuration:', error);
    }
  }
}

// Call on module load
ensureConfigInitialized();
```

## Data Flow

### Successful Generation Flow
```
1. User clicks Generate
2. Frontend validates params
3. POST /api/expansion/generate
4. Config validation (database, optional features)
5. Auth & rate limit checks
6. Load stores from database
7. Generate hex grid & score cells
8. Apply NMS filtering
9. [Optional] Mapbox filtering
10. [Optional] AI rationale generation
11. Return suggestions with metadata
12. Frontend displays markers on map
```

### Error Flow
```
1. Error occurs at any step
2. Catch error in try-catch block
3. Log detailed error with context
4. Determine error type and code
5. Return appropriate HTTP status
6. Frontend receives error response
7. Display user-friendly message
8. Log error details to console
9. Provide retry option if applicable
```

## Error Handling Strategy

### Error Categories

| Category | HTTP Status | User Message | Action |
|----------|-------------|--------------|--------|
| Validation Error | 400 | "Invalid parameters: {details}" | Fix input |
| No Stores | 400 | "No stores found in region" | Adjust filters |
| Unauthorized | 401 | "Please log in" | Redirect to login |
| Forbidden | 403 | "Access denied" | Contact admin |
| Rate Limit | 429 | "Too many requests" | Wait and retry |
| Database Down | 503 | "Service unavailable" | Retry later |
| Database Error | 500 | "Database error occurred" | Retry |
| Internal Error | 500 | "Unexpected error: {requestId}" | Contact support |

### Graceful Degradation

| Feature | Dependency | Fallback Behavior |
|---------|------------|-------------------|
| Core Generation | Database | **Required** - Return 503 if unavailable |
| Mapbox Filtering | MAPBOX_ACCESS_TOKEN | Skip filtering, return all candidates |
| AI Rationale | OPENAI_API_KEY | Use default template-based rationales |
| Cache | Redis (future) | Direct API calls without caching |

## Testing Strategy

### Manual Testing

1. **Test with all dependencies available**
   - Set DATABASE_URL, MAPBOX_ACCESS_TOKEN, OPENAI_API_KEY
   - Generate suggestions
   - Verify all features work

2. **Test without Mapbox**
   - Unset MAPBOX_ACCESS_TOKEN
   - Generate suggestions
   - Verify generation works without filtering
   - Check logs for warning message

3. **Test without OpenAI**
   - Unset OPENAI_API_KEY
   - Generate suggestions
   - Verify default rationales are used
   - Check logs for warning message

4. **Test with database down**
   - Stop database container
   - Try to generate
   - Verify 503 error with clear message
   - Check health endpoint returns unhealthy

5. **Test with invalid region**
   - Select region with no stores
   - Verify 400 error with "No stores found" message

6. **Test with invalid parameters**
   - Send invalid aggression value (e.g., 150)
   - Verify 400 error with validation details

### Health Check Testing

```bash
# Test health endpoint
curl http://localhost:3002/api/expansion/health

# Expected response (healthy):
{
  "status": "healthy",
  "timestamp": "2025-10-30T...",
  "services": {
    "database": { "status": "up", "required": true },
    "mapbox": { "status": "up", "required": false },
    "openai": { "status": "disabled", "required": false }
  },
  "features": {
    "coreGeneration": true,
    "mapboxFiltering": true,
    "aiRationale": false
  }
}
```

### Integration Testing

Create test cases for:
- All error scenarios
- Graceful degradation paths
- Configuration validation
- Database connectivity
- External API failures

## Documentation

### Environment Variables

Create `.env.example` with:

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/subway

# Optional - Mapbox urban suitability filtering
# If not set, filtering will be disabled
MAPBOX_ACCESS_TOKEN=pk.your_token_here

# Optional - AI-generated rationales
# If not set, template-based rationales will be used
OPENAI_API_KEY=sk-your_key_here

# Feature flags
NEXT_PUBLIC_FEATURE_EXPANSION_PREDICTOR=true
```

### README Section

Add to `apps/admin/README.md`:

```markdown
## Expansion Predictor

### Required Configuration
- `DATABASE_URL`: PostgreSQL connection string (required)

### Optional Features
- `MAPBOX_ACCESS_TOKEN`: Enables urban suitability filtering
- `OPENAI_API_KEY`: Enables AI-generated rationales

### Health Check
Check service status: `GET /api/expansion/health`

### Troubleshooting
- 503 errors: Check database connectivity
- Missing features: Check environment variables
- 500 errors: Check server logs for request ID
```

## Performance Considerations

- Configuration validation happens once at startup (cached)
- Health checks are lightweight (no heavy operations)
- Graceful degradation prevents cascading failures
- Detailed logging helps diagnose issues quickly

## Security Considerations

- Never expose API keys or database credentials in error messages
- Use request IDs for error tracking (not user IDs in public errors)
- Sanitize error messages before sending to frontend
- Log sensitive details only to server console

## Migration Plan

1. **Phase 1: Add logging and configuration validation**
   - Create ExpansionConfigValidator
   - Add enhanced logging methods
   - Update API route with config checks

2. **Phase 2: Add health check endpoint**
   - Create /api/expansion/health route
   - Test with various configurations

3. **Phase 3: Enhance error handling**
   - Update service methods with try-catch
   - Add graceful degradation
   - Update frontend error display

4. **Phase 4: Testing and documentation**
   - Test all error scenarios
   - Update documentation
   - Add monitoring alerts

