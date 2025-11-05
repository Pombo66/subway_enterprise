# Design Document: Expansion Candidate Generation Improvement

## Overview

The current expansion suggestion system generates candidates in geometric patterns (vertical columns) rather than intelligently distributing across settlement centroids and population clusters. This design addresses the root cause: insufficient and poorly distributed candidate generation that constrains the downstream intelligence layers.

The solution involves restructuring the candidate generation pipeline to prioritize settlement-based exploration over geometric H3 grid sampling, while significantly expanding the candidate pool size to support the target of ~600 store suggestions.

## Architecture

### Current Architecture Issues

The existing system has a bottleneck in the candidate generation phase:

```
Settlement Generator (200 max) → H3 Grid (geometric) → Intelligence Layers → 28 suggestions
```

**Problems:**
- Settlement pool too small (200 vs 11,000+ available settlements)
- H3 grid creates geometric patterns instead of following population clusters
- Total candidate pool insufficient (300 vs 3000+ needed for 600 target)
- Early termination due to pool exhaustion

### Proposed Architecture

```
Enhanced Settlement Generator (2000+) → Intelligent H3 Sampling → Expanded Pool (1500+) → Intelligence Layers → OpenAI Strategy Layer → 600 suggestions
```

**Key Improvements:**
- Settlement-first approach with 10x larger pool
- H3 grid focused on settlement gaps rather than geometric coverage
- **OpenAI-driven selection replacing deterministic filtering**
- AI strategist analyzes all candidates and makes intelligent location decisions
- Configurable candidate pool scaling with timeout management
- Structured JSON output with rationale and strategic analysis

## Components and Interfaces

### 1. Enhanced Settlement Candidate Generator

**File:** `apps/admin/lib/services/settlement-candidate-generator.service.ts`

**Key Changes:**
- Increase `MAX_CANDIDATES_PER_REGION` from 200 to 2000+
- Implement settlement clustering to avoid over-sampling dense urban areas
- Add population-weighted sampling for better distribution
- Implement settlement type diversity (cities, towns, villages)

```typescript
interface SettlementGeneratorConfig {
  maxCandidatesPerRegion: number; // 2000+ (was 200)
  populationThreshold: number; // 1000 (configurable)
  diversityWeights: {
    cities: number; // 0.4
    towns: number; // 0.4
    villages: number; // 0.2
  };
  clusteringDistance: number; // 5000m to avoid over-sampling
  settlementPriority: number; // 0.8 (80% settlement, 20% H3)
}
```

### 2. Intelligent H3 Tiling Service

**File:** `apps/admin/lib/services/h3-tiling.service.ts`

**Key Changes:**
- Increase resolution from 7 to 8 for denser sampling (5km² → 0.7km²)
- Increase samples per tile from 15 to 25
- Implement settlement-aware H3 sampling (focus on gaps between settlements)
- Add adaptive resolution based on settlement density

```typescript
interface H3TileConfig {
  resolution: number; // 8 (was 7)
  samplesPerTile: number; // 25 (was 15)
  settlementAware: boolean; // true - focus on gaps
  adaptiveResolution: boolean; // true - adjust based on density
  bounds: BoundingBox;
}
```

### 3. OpenAI Strategy Layer Service

**File:** `apps/admin/lib/services/openai-expansion-strategy.service.ts`

**New Component:**
- Replace deterministic selection with OpenAI-powered analysis
- Implement Subway Expansion Strategist AI with structured prompts
- Analyze all candidates using population, anchors, performance, and fairness data
- Output structured JSON with selections, rationale, and strategic analysis

```typescript
interface OpenAIStrategyConfig {
  model: string; // 'gpt-4' or 'gpt-3.5-turbo'
  temperature: number; // 0.3 for consistent strategic decisions
  maxTokens: number; // 4000 for detailed analysis
  targetSelections: number; // 600 stores
  promptTemplate: string; // Structured Subway Strategist prompt
  fallbackToDeteministic: boolean; // true - fallback when API unavailable
}

interface StrategyAnalysisInput {
  candidates: EnhancedCandidate[];
  existingStores: Store[];
  regionData: RegionAnalysis;
  targetCount: number;
}

interface StrategyResponse {
  selected: SelectedLocation[];
  summary: {
    selectedCount: number;
    stateDistribution: Record<string, number>;
    keyDrivers: string[];
  };
}
```

### 4. Expansion Generation Service Orchestrator

**File:** `apps/admin/lib/services/expansion-generation.service.ts`

**Key Changes:**
- Increase total candidate pool from 300 to 1500+
- Implement progressive candidate generation with timeout management
- Add settlement-H3 mixing logic (80/20 ratio)
- **Integrate OpenAI Strategy Layer as final selection phase**
- Implement candidate diversity validation

```typescript
interface GenerationConfig {
  maxTotalCandidates: number; // 1500+ (was 300)
  maxIterationCandidates: number; // 10000 (was 3000)
  timeoutMs: number; // 180000 (3 minutes for country-wide)
  mixRatio: {
    settlement: number; // 0.8
    h3Explore: number; // 0.2
  };
  diversityThreshold: number; // Minimum spatial diversity required
  useOpenAISelection: boolean; // true - enable AI-driven selection
  openaiConfig: OpenAIStrategyConfig;
}
```

## Data Models

### Enhanced Candidate Data Structure

```typescript
interface EnhancedCandidate {
  // Core location data
  id: string;
  lat: number;
  lng: number;
  
  // Source information
  candidateType: 'settlement' | 'h3_explore' | 'hybrid';
  sourceData: {
    settlementId?: string;
    settlementName?: string;
    settlementType?: 'city' | 'town' | 'village';
    h3Index?: string;
    h3Resolution?: number;
  };
  
  // Population and demographic data
  population?: number;
  estimatedPopulation?: number;
  populationConfidence: number; // 0-1
  
  // Spatial context
  nearestSettlementDistance: number;
  settlementClusterSize: number;
  urbanDensityIndex: number;
  
  // Generation metadata
  generationIteration: number;
  generationTimestamp: Date;
  diversityScore: number; // How unique this candidate is spatially
}
```

### OpenAI Strategy Data Models

```typescript
interface SelectedLocation {
  name: string;
  lat: number;
  lng: number;
  rationale: string; // AI-generated explanation
}

interface StrategyPromptData {
  candidates: {
    name: string;
    lat: number;
    lng: number;
    population: number;
    nearestStoreDistance: number;
    anchorCount: number;
    peerPerformanceScore: number;
    stateCode: string;
  }[];
  existingStores: {
    lat: number;
    lng: number;
    state: string;
  }[];
  targetCount: number;
}

interface OpenAIResponse {
  selected: SelectedLocation[];
  summary: {
    selectedCount: number;
    stateDistribution: Record<string, number>;
    keyDrivers: string[];
  };
}
```

### Configuration Schema

```typescript
interface ExpansionConfig {
  // Settlement generation
  settlement: {
    maxCandidatesPerRegion: number; // 2000
    populationThreshold: number; // 1000
    clusteringDistance: number; // 5000
    diversityWeights: {
      cities: number; // 0.4
      towns: number; // 0.4
      villages: number; // 0.2
    };
  };
  
  // H3 grid generation
  h3: {
    resolution: number; // 8
    samplesPerTile: number; // 25
    settlementAware: boolean; // true
    gapFocusRadius: number; // 10000m
  };
  
  // Generation limits
  limits: {
    maxTotalCandidates: number; // 1500
    maxIterationCandidates: number; // 10000
    timeoutMs: number; // 180000
    targetSuggestions: number; // 600
  };
  
  // Mix ratios
  mixing: {
    settlementRatio: number; // 0.8
    h3ExploreRatio: number; // 0.2
    diversityThreshold: number; // 0.3
  };
  
  // OpenAI Strategy Layer
  openai: {
    enabled: boolean; // true
    model: string; // 'gpt-4'
    temperature: number; // 0.3
    maxTokens: number; // 4000
    apiKey: string; // from environment
    fallbackToDeterministic: boolean; // true
    promptTemplate: string; // Structured strategist prompt
    retryAttempts: number; // 3
    timeoutMs: number; // 30000
  };
}
```

## OpenAI Strategy Layer Architecture

### Prompt Engineering

The system uses a carefully crafted prompt to position the AI as a retail expansion strategist:

```typescript
const SUBWAY_STRATEGIST_PROMPT = `You are the Subway Expansion Strategist AI.

Your goal is to identify the strongest new Subway store locations across Germany using structured market data. You must act as both a data analyst and retail strategist — balancing population potential, market gaps, anchor presence, and regional fairness.

Evaluate each settlement using these key factors:
- Population size and growth potential
- Distance to nearest existing Subway stores (demand gap)
- Anchor density (shopping centres, transport hubs, grocers)
- Peer store performance and turnover
- Regional saturation (avoid over-represented states)
- Data completeness and confidence level

Select the most promising settlements for expansion, ensuring:
- Geographic balance across German states
- Realistic commercial clustering (urban and suburban mix)
- Strategic growth alignment with Subway's footprint doubling objective
- 600 target locations in total

Output your results in structured JSON:
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
    "stateDistribution": { "Bavaria": 75, "NRW": 80, "Hesse": 60 },
    "keyDrivers": ["population_gap", "anchor_density", "peer_performance"]
  }
}

Candidate Data:
{candidateData}`;
```

### Integration Flow

```typescript
class OpenAIExpansionStrategyService {
  async selectLocations(candidates: EnhancedCandidate[]): Promise<StrategyResponse> {
    // 1. Prepare structured data for AI analysis
    const promptData = this.preparePromptData(candidates);
    
    // 2. Execute OpenAI API call with retry logic
    const response = await this.callOpenAI(promptData);
    
    // 3. Validate and parse JSON response
    const parsed = this.validateResponse(response);
    
    // 4. Apply post-selection guardrails
    const validated = this.applyGuardrails(parsed);
    
    return validated;
  }
}
```

### Fallback Strategy

When OpenAI is unavailable, the system falls back to enhanced deterministic selection:

```typescript
interface FallbackConfig {
  enabled: boolean; // true
  strategy: 'enhanced_deterministic' | 'random_weighted' | 'top_scored';
  maintainGeographicBalance: boolean; // true
  preserveTargetCount: boolean; // true
}
```

## Error Handling

### Candidate Pool Exhaustion

```typescript
class CandidatePoolExhaustionError extends Error {
  constructor(
    public readonly generatedCount: number,
    public readonly targetCount: number,
    public readonly timeoutReached: boolean
  ) {
    super(`Candidate pool exhausted: ${generatedCount}/${targetCount} generated`);
  }
}
```

**Handling Strategy:**
1. Detect when candidate generation rate drops below threshold
2. Automatically expand search radius by 20%
3. Reduce population threshold by 25%
4. Switch to higher H3 resolution if needed
5. Log detailed diagnostics for tuning

### Settlement Data Quality Issues

```typescript
interface SettlementQualityFlags {
  missingPopulation: boolean;
  estimatedPopulation: boolean;
  lowConfidenceLocation: boolean;
  duplicateDetected: boolean;
  outsideBounds: boolean;
}
```

**Handling Strategy:**
1. Flag low-quality settlements but don't exclude
2. Apply confidence penalties in scoring
3. Prefer high-quality settlements when available
4. Log quality issues for data improvement

### OpenAI API Error Handling

```typescript
class OpenAIStrategyError extends Error {
  constructor(
    public readonly errorType: 'api_failure' | 'rate_limit' | 'invalid_response' | 'parsing_error',
    public readonly originalError?: Error,
    public readonly retryAttempt?: number
  ) {
    super(`OpenAI Strategy Error: ${errorType}`);
  }
}
```

**Handling Strategy:**
1. Implement exponential backoff for rate limits (1s, 2s, 4s delays)
2. Retry API calls up to 3 times with different parameters
3. Validate JSON response structure before parsing
4. Fall back to deterministic selection on persistent failures
5. Log all API interactions for debugging and monitoring

### Geographic Boundary Issues

```typescript
interface BoundaryValidation {
  withinCountry: boolean;
  withinState: boolean;
  withinBoundingBox: boolean;
  landMaskValid: boolean;
  coastlineDistance: number;
}
```

**Handling Strategy:**
1. Validate all candidates against multiple boundary sources
2. Apply buffer zones for coastal areas
3. Handle edge cases near borders gracefully
4. Provide clear rejection reasons for debugging

## Testing Strategy

### Unit Tests

1. **Settlement Generator Tests**
   - Population threshold filtering
   - Clustering distance validation
   - Settlement type diversity
   - Configuration parameter handling

2. **H3 Tiling Tests**
   - Resolution scaling behavior
   - Samples per tile generation
   - Settlement-aware gap detection
   - Boundary coverage validation

3. **OpenAI Strategy Layer Tests**
   - Prompt data preparation and formatting
   - JSON response parsing and validation
   - Error handling and retry logic
   - Fallback mechanism activation
   - API rate limit handling

4. **Generation Orchestrator Tests**
   - Candidate pool size management
   - Timeout handling
   - Mix ratio enforcement
   - OpenAI integration flow
   - Diversity validation

### Integration Tests

1. **End-to-End Generation with OpenAI**
   - Full pipeline from region → OpenAI analysis → suggestions
   - Performance under different region sizes with AI selection
   - OpenAI response quality and consistency
   - Fallback behavior when OpenAI is unavailable

2. **OpenAI Strategy Integration**
   - Real API calls with test data
   - Response time and reliability testing
   - Geographic balance validation in AI selections
   - Rationale quality assessment

3. **Configuration Validation**
   - Environment variable parsing including OpenAI settings
   - Default value fallbacks for AI configuration
   - Invalid configuration handling
   - Runtime parameter updates

### Performance Tests

1. **Scalability Testing**
   - Country-wide generation (Germany, France)
   - Large candidate pool handling (5000+ candidates)
   - Memory usage under load
   - Timeout behavior under stress

2. **Quality Metrics**
   - Spatial distribution uniformity
   - Settlement coverage completeness
   - Suggestion count consistency
   - Intelligence layer effectiveness

### Regression Tests

1. **Pattern Detection**
   - Verify no geometric column patterns
   - Validate settlement-based distribution
   - Check suggestion count targets
   - Monitor acceptance rates

2. **Backward Compatibility**
   - Existing configuration support
   - API response format consistency
   - Performance baseline maintenance
   - Error handling preservation

## Implementation Phases

### Phase 1: Configuration Enhancement
- Update environment variable defaults
- Implement new configuration schema including OpenAI settings
- Add validation and error handling
- Update documentation

### Phase 2: Settlement Generator Enhancement
- Increase candidate pool limits
- Implement clustering logic
- Add settlement type diversity
- Enhance population weighting

### Phase 3: H3 Grid Intelligence
- Increase resolution and sampling density
- Implement settlement-aware gap detection
- Add adaptive resolution logic
- Optimize boundary coverage

### Phase 4: OpenAI Strategy Layer Implementation
- **Create OpenAI expansion strategy service**
- **Implement Subway Strategist AI prompt engineering**
- **Add structured JSON response parsing and validation**
- **Implement error handling, retries, and fallback mechanisms**
- **Integrate with existing generation pipeline**

### Phase 5: Generation Orchestration
- Implement progressive generation
- Add timeout and iteration management
- Enhance candidate mixing logic
- **Integrate OpenAI selection as final phase**
- Add diversity validation

### Phase 6: Testing and Validation
- Comprehensive test suite implementation including OpenAI testing
- Performance benchmarking with AI selection
- Quality metrics validation comparing AI vs deterministic selection
- Production deployment preparation with API key management

## Configuration Parameters

### Environment Variables

```bash
# Settlement Generation (Critical Changes)
EXPANSION_MAX_CANDIDATES_PER_REGION=2000    # was 200
EXPANSION_POP_MIN=1000                      # unchanged
EXPANSION_SETTLEMENT_CLUSTERING_M=5000      # new
EXPANSION_MIX_SETTLEMENT=0.8                # was 0.7

# H3 Grid Generation (Important Changes)
EXPANSION_H3_RESOLUTION=8                   # was 7
EXPANSION_SAMPLES_PER_TILE=25               # was 15
EXPANSION_H3_SETTLEMENT_AWARE=true          # new
EXPANSION_H3_GAP_FOCUS_RADIUS_M=10000       # new

# Generation Limits (Critical Changes)
EXPANSION_MAX_CANDIDATES=1500               # was 300
EXPANSION_MAX_TOTAL_CANDIDATES=10000        # was 3000
EXPANSION_TIMEOUT_MS=180000                 # was 15000 (3 minutes)
EXPANSION_TARGET_SUGGESTIONS=600            # was 50

# OpenAI Strategy Layer (NEW - Critical)
OPENAI_API_KEY=sk-...                       # OpenAI API key
EXPANSION_OPENAI_ENABLED=true               # Enable AI-driven selection
EXPANSION_OPENAI_MODEL=gpt-4                # AI model to use
EXPANSION_OPENAI_TEMPERATURE=0.3            # Consistency for strategic decisions
EXPANSION_OPENAI_MAX_TOKENS=4000            # Allow detailed analysis
EXPANSION_OPENAI_TIMEOUT_MS=30000           # 30 second API timeout
EXPANSION_OPENAI_RETRY_ATTEMPTS=3           # Retry failed API calls
EXPANSION_OPENAI_FALLBACK_ENABLED=true      # Fallback to deterministic

# Quality and Diversity (New)
EXPANSION_DIVERSITY_THRESHOLD=0.3           # new
EXPANSION_SETTLEMENT_DIVERSITY_CITIES=0.4   # new
EXPANSION_SETTLEMENT_DIVERSITY_TOWNS=0.4    # new
EXPANSION_SETTLEMENT_DIVERSITY_VILLAGES=0.2 # new
```

### Backward Compatibility

All existing configurations will continue to work with sensible defaults. The system will log warnings when using legacy values that may impact performance.

## Monitoring and Diagnostics

### Key Metrics

1. **Generation Performance**
   - Candidates generated per second
   - Settlement vs H3 ratio achieved
   - Timeout frequency
   - Memory usage patterns

2. **Quality Indicators**
   - Spatial distribution entropy
   - Settlement coverage percentage
   - Suggestion count consistency
   - Intelligence layer acceptance rates

3. **Error Tracking**
   - Candidate pool exhaustion frequency
   - Settlement data quality issues
   - Boundary validation failures
   - Configuration parsing errors

### Logging Strategy

```typescript
interface GenerationDiagnostics {
  phase: 'settlement' | 'h3' | 'mixing' | 'intelligence';
  candidatesGenerated: number;
  candidatesAccepted: number;
  acceptanceRate: number;
  timeElapsed: number;
  memoryUsage: number;
  qualityFlags: string[];
  spatialDistribution: {
    entropy: number;
    clusterCount: number;
    averageDistance: number;
  };
}
```

This design provides a comprehensive solution to transform the expansion candidate generation from a geometric constraint system into an intelligent, settlement-aware exploration engine that can support the target scale of 600+ store suggestions while maintaining high quality and spatial intelligence.