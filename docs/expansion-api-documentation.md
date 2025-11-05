# Expansion API Documentation

## Overview

The Expansion API provides intelligent location suggestions for new store openings using AI-powered strategic analysis and comprehensive market data.

## Endpoints

### Generate Expansion Suggestions

**POST** `/api/expansion/generate`

Generates expansion suggestions for a specified region using AI-driven strategic analysis.

#### Request Body

```typescript
interface GenerationParams {
  region: RegionFilter;
  aggression: number;           // 0-100
  populationBias: number;       // 0-1
  proximityBias: number;        // 0-1
  turnoverBias: number;         // 0-1
  minDistanceM: number;
  seed: number;
  targetCount?: number;         // Default: 100
  scenarioId?: string;
  enableMapboxFiltering?: boolean;    // Default: true
  enableAIRationale?: boolean;        // Default: true
  enableDiagnostics?: boolean;        // Default: false
}

interface RegionFilter {
  country?: string;
  state?: string;
  boundingBox?: BoundingBox;
}

interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

#### Response Format

```typescript
interface GenerationResult {
  suggestions: ExpansionSuggestionData[];
  metadata: GenerationMetadata;
}

interface ExpansionSuggestionData {
  lat: number;
  lng: number;
  confidence: number;
  rationale: {
    population: number;
    proximityGap: number;
    turnoverGap: number;
    notes: string;
  };
  rationaleText: string;
  band: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  urbanDensityIndex?: number;
  roadDistanceM?: number;
  buildingDistanceM?: number;
  landuseType?: string;
  mapboxValidated?: boolean;
  
  // NEW: Settlement-based fields
  candidateType?: 'settlement' | 'h3_explore' | 'hybrid';
  settlementName?: string;
  settlementType?: 'city' | 'town' | 'village';
  estimatedPopulation?: number;
  
  // NEW: OpenAI fields
  selectedByAI?: boolean;
  openaiRationale?: string;
  
  // NEW: Diagnostics (when enableDiagnostics=true)
  diagnostics?: {
    inputs: {
      population: number;
      nearest3Distances: number[];
      anchorPOIs: number;
      localDensity: number;
      peerTurnover: number;
      storeCount5km: number;
      storeCount10km: number;
      storeCount15km: number;
    };
    normalizedScores: {
      populationScore: number;
      gapScore: number;
      anchorScore: number;
      performanceScore: number;
      saturationPenalty: number;
    };
    weights: {
      population: number;
      gap: number;
      anchor: number;
      performance: number;
      saturation: number;
    };
    finalScore: number;
  };
}
```

#### Metadata Format

```typescript
interface GenerationMetadata {
  totalCellsScored: number;
  avgConfidence: number;
  generationTimeMs: number;
  dataVersion: string;
  seed: number;
  totalGenerated?: number;
  mapboxFiltered?: number;
  finalCount?: number;
  cacheHitRate?: number;
  
  // Expansion statistics
  expansionStats?: {
    iterations: number;
    totalEvaluated: number;
    totalAccepted: number;
    totalRejected: number;
    acceptanceRate: number;
    timeoutReached: boolean;
    maxCandidatesReached: boolean;
  };
  
  // Rejection breakdown
  rejectionReasons?: {
    excluded_landuse: number;
    no_road: number;
    no_building: number;
    no_valid_landuse: number;
    low_density: number;
    openai_error?: number;
  };
  
  // Feature flags
  featuresEnabled?: {
    mapboxFiltering: boolean;
    aiRationale: boolean;
    openaiStrategy?: boolean;
  };
  
  // NEW: Performance metrics
  performanceMetrics?: {
    candidatesPerSecond: number;
    memoryUsageMB: number;
    openaiApiCalls: number;
    openaiTokensUsed: number;
    openaiErrors: number;
    openaiResponseTimeMs: number;
  };
  
  // Generation mode information
  generationMode?: {
    isCountryWide: boolean;
    landMaskApplied: boolean;
    enhancedValidation: boolean;
    adaptiveTilequery: boolean;
  };
  
  // Scenario metadata
  scenarioMetadata?: {
    scenarioId: string;
    createdAt: string;
    osmSnapshotDate: string;
    dataVersions: {
      osm: string;
      demographic: string;
      stores: string;
    };
    parameters: {
      weights: Record<string, number>;
      mixRatio: Record<string, number>;
      popMin: number;
      seed: number;
      targetCount: number;
      enableDiagnostics: boolean;
    };
  };
  
  // Generation profile
  generationProfile?: {
    top50Candidates: Array<{
      rank: number;
      name: string;
      type: string;
      population: number;
      score: number;
      selected: boolean;
      rejectionReason?: string;
    }>;
    scoringDistribution: {
      populationScores: { min: number; max: number; avg: number; std: number };
      gapScores: { min: number; max: number; avg: number; std: number };
      anchorScores: { min: number; max: number; avg: number; std: number };
      performanceScores: { min: number; max: number; avg: number; std: number };
      finalScores: { min: number; max: number; avg: number; std: number };
    };
    rejectionBreakdown: Record<string, number>;
    
    // Mixing statistics
    mixingStats?: {
      targetRatio: { settlement: number; h3Explore: number };
      actualRatio: { settlement: number; h3Explore: number };
      candidateCounts: { settlement: number; h3Explore: number; total: number };
    };
    
    // Diversity validation
    diversityValidation?: {
      passed: boolean;
      diversityScore: number;
      spatialEntropy: number;
      clusterCount: number;
      averageDistance: number;
      issues: string[];
    };
    
    // NEW: OpenAI quality validation
    openaiQualityValidation?: {
      passed: boolean;
      geographicBalance: {
        passed: boolean;
        stateDistribution: Record<string, number>;
        maxStateShare: number;
      };
      rationaleQuality: {
        passed: boolean;
        averageLength: number;
        hasKeywords: boolean;
      };
      selectionConsistency: {
        passed: boolean;
        topCandidateOverlap: number;
        scoreCorrelation: number;
      };
      comparisonToDeterministic: {
        aiScore: number;
        deterministicScore: number;
        improvement: number;
      };
      issues: string[];
    };
  };
  
  // Quality guardrails
  qualityGuardrails?: {
    passed: boolean;
    failures: string[];
    blockedPublish: boolean;
  };
}
```

### Health Check

**GET** `/api/expansion/health`

Returns the health status of the expansion service and its dependencies.

#### Response Format

```typescript
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: { status: 'up' | 'down'; required: boolean };
    mapbox: { status: 'up' | 'down' | 'disabled'; required: boolean };
    openai: { status: 'up' | 'down' | 'disabled'; required: boolean };
  };
  features: {
    coreGeneration: boolean;
    mapboxFiltering: boolean;
    aiRationale: boolean;
    openaiStrategy: boolean;
  };
}
```

## OpenAI Strategy Layer

### AI Selection Process

The OpenAI Strategy Layer replaces deterministic selection with intelligent AI analysis:

1. **Candidate Preparation**: Converts technical candidates to business-friendly format
2. **Strategic Analysis**: AI evaluates using population, anchors, gaps, and performance
3. **Geographic Balance**: Ensures fair distribution across regions
4. **Quality Validation**: Validates selections and rationale quality

### AI Response Format

The AI returns structured selections with detailed rationale:

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
      "Hesse": 60
    },
    "keyDrivers": [
      "population_gap",
      "anchor_density",
      "peer_performance"
    ]
  }
}
```

### Quality Metrics

The system validates AI selections across multiple dimensions:

- **Geographic Balance**: Maximum 40% of selections per state
- **Rationale Quality**: Minimum 50 characters with strategic keywords
- **Selection Consistency**: 30% overlap with top deterministic candidates
- **Score Correlation**: AI selections achieve 80% of deterministic average score

## Error Handling

### HTTP Status Codes

- **200 OK**: Successful generation
- **400 Bad Request**: Invalid parameters
- **500 Internal Server Error**: Generation failure
- **503 Service Unavailable**: Required services unavailable

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;
  message: string;
  requestId: string;
  timestamp: string;
  details?: {
    service?: string;
    cause?: string;
    suggestion?: string;
  };
}
```

### Common Errors

#### Database Connection Error
```json
{
  "error": "SERVICE_UNAVAILABLE",
  "message": "Database connection failed",
  "requestId": "req_123456",
  "timestamp": "2024-01-01T12:00:00Z",
  "details": {
    "service": "database",
    "cause": "Connection timeout",
    "suggestion": "Check database connectivity and retry"
  }
}
```

#### OpenAI API Error
```json
{
  "error": "OPENAI_ERROR",
  "message": "OpenAI API rate limit exceeded",
  "requestId": "req_123456",
  "timestamp": "2024-01-01T12:00:00Z",
  "details": {
    "service": "openai",
    "cause": "Rate limit exceeded",
    "suggestion": "System will retry automatically or fallback to deterministic selection"
  }
}
```

#### No Stores Found Error
```json
{
  "error": "NO_STORES_FOUND",
  "message": "No stores found in specified region",
  "requestId": "req_123456",
  "timestamp": "2024-01-01T12:00:00Z",
  "details": {
    "cause": "Empty region or invalid filters",
    "suggestion": "Verify region parameters and ensure stores exist in the area"
  }
}
```

## Rate Limiting

### Limits
- **Expansion Generation**: 10 requests per 15 minutes per IP
- **Health Check**: 60 requests per minute per IP

### Headers
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded Response
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests",
  "retryAfter": 900
}
```

## Caching

### Response Caching
- **Duration**: 24 hours for identical parameters
- **Key**: MD5 hash of normalized parameters
- **Headers**: `X-Cache-Status: HIT|MISS`

### Cache Invalidation
- Automatic expiration after 24 hours
- Manual invalidation on data updates
- Cache warming for common regions

## Performance

### Typical Response Times
- **Small Region** (city): 5-15 seconds
- **Medium Region** (state): 15-45 seconds  
- **Large Region** (country): 45-90 seconds

### Factors Affecting Performance
- **Candidate Count**: More candidates = longer processing
- **OpenAI Model**: GPT-4 slower but higher quality than GPT-3.5-turbo
- **Mapbox Filtering**: Adds 10-30% to processing time
- **Cache Status**: Cache hits return in <1 second

### Optimization Tips
- Use appropriate `targetCount` for your needs
- Enable caching for repeated analyses
- Consider GPT-3.5-turbo for faster responses
- Use smaller regions for development/testing

## Monitoring

### Metrics Available
- Request count and response times
- Error rates by type and service
- Cache hit rates and performance
- OpenAI API usage and costs
- Memory and CPU utilization

### Logging
All requests include structured logging with:
- Request ID for tracing
- Performance metrics
- Error details and stack traces
- Cache status and statistics
- OpenAI API usage and costs

### Alerting
Monitor these key metrics:
- Error rate > 5%
- Response time > 60 seconds
- OpenAI API errors > 10%
- Cache hit rate < 50%
- Memory usage > 1GB