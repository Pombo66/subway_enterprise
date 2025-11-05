# Design Document

## Overview

This design optimizes both the OpenAI Rationale Service and Market Analysis Service to eliminate 5-minute execution times, improve reliability, and reduce costs. The solution implements robust output parsing, enforced JSON schemas, optimized token usage, proper timeout handling, and functional caching to achieve 3-6x performance improvements.

## Architecture

### High-Level Performance Optimization Flow
```
Input Request → Codebase Analysis → Data Aggregation → Optimized API Call → Robust Parsing → Cached Result
     ↓              ↓                    ↓                    ↓                ↓              ↓
Validate      Remove Redundant    Reduce Tokens    Timeout + Retry    Extract Text    Store Result
```

### Codebase Simplification Flow
```
Expansion System Audit → Redundancy Detection → Service Consolidation → Interface Cleanup → Validation
        ↓                       ↓                      ↓                    ↓              ↓
   Identify All         Find Duplicates        Merge Services      Clean APIs      Test Changes
```

### Component Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    Codebase Simplification Layer                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Expansion       │  │ Redundancy      │  │ Service         │ │
│  │ System Auditor  │  │ Detector        │  │ Consolidator    │ │
│  │                 │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    Performance Optimization Layer                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Output Text     │  │ JSON Schema     │  │ Response        │ │
│  │ Parser          │  │ Enforcer        │  │ Timeout Handler │ │
│  │                 │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Token           │  │ Data            │  │ Cache           │ │
│  │ Optimizer       │  │ Aggregator      │  │ Manager         │ │
│  │                 │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Concurrency     │  │ Deterministic   │  │ Configuration   │ │
│  │ Manager         │  │ Controls        │  │ Cleaner         │ │
│  │                 │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Codebase Simplification Components

### 1. Expansion System Auditor

**Purpose**: Comprehensive analysis of all expansion-related code to identify redundancies

**Interface**:
```typescript
interface IExpansionSystemAuditor {
  scanCodebase(): Promise<CodebaseAnalysis>;
  identifyExpansionServices(): Promise<ServiceInventory>;
  analyzeServiceDependencies(): Promise<DependencyGraph>;
  generateSimplificationReport(): Promise<SimplificationReport>;
}

interface CodebaseAnalysis {
  totalFiles: number;
  expansionRelatedFiles: string[];
  duplicateLogic: DuplicatePattern[];
  unusedCode: UnusedCodeBlock[];
  complexityMetrics: ComplexityMetric[];
}

interface ServiceInventory {
  services: ExpansionService[];
  duplicateServices: ServiceDuplicate[];
  overlappingFunctionality: FunctionalityOverlap[];
  consolidationOpportunities: ConsolidationOpportunity[];
}

interface DependencyGraph {
  nodes: ServiceNode[];
  edges: ServiceDependency[];
  circularDependencies: CircularDependency[];
  unusedDependencies: UnusedDependency[];
}
```

**Implementation Strategy**:
```typescript
class ExpansionSystemAuditor implements IExpansionSystemAuditor {
  async scanCodebase(): Promise<CodebaseAnalysis> {
    const expansionFiles = await this.findExpansionFiles();
    const duplicates = await this.detectDuplicateLogic(expansionFiles);
    const unused = await this.findUnusedCode(expansionFiles);
    const complexity = await this.analyzeComplexity(expansionFiles);

    return {
      totalFiles: expansionFiles.length,
      expansionRelatedFiles: expansionFiles,
      duplicateLogic: duplicates,
      unusedCode: unused,
      complexityMetrics: complexity
    };
  }

  private async findExpansionFiles(): Promise<string[]> {
    // Scan for files containing expansion-related keywords
    const patterns = [
      '**/expansion*.ts',
      '**/openai*.service.ts', 
      '**/market*.service.ts',
      '**/location*.service.ts',
      '**/strategic*.service.ts',
      '**/rationale*.service.ts'
    ];
    
    return await this.globSearch(patterns);
  }

  private async detectDuplicateLogic(files: string[]): Promise<DuplicatePattern[]> {
    const duplicates: DuplicatePattern[] = [];
    
    for (const file of files) {
      const ast = await this.parseFile(file);
      const patterns = this.extractPatterns(ast);
      
      // Compare with existing patterns to find duplicates
      const matches = this.findMatchingPatterns(patterns);
      duplicates.push(...matches);
    }
    
    return duplicates;
  }
}
```

### 2. Redundancy Detector

**Purpose**: Identify duplicate and overlapping functionality across services

**Interface**:
```typescript
interface IRedundancyDetector {
  detectDuplicateServices(): Promise<ServiceDuplicate[]>;
  findOverlappingFunctionality(): Promise<FunctionalityOverlap[]>;
  identifyUnusedInterfaces(): Promise<UnusedInterface[]>;
  analyzeCodeDuplication(): Promise<CodeDuplication[]>;
}

interface ServiceDuplicate {
  primaryService: string;
  duplicateServices: string[];
  similarityScore: number;
  duplicatedMethods: string[];
  consolidationStrategy: string;
}

interface FunctionalityOverlap {
  services: string[];
  overlappingMethods: MethodOverlap[];
  suggestedConsolidation: string;
  impactAssessment: string;
}

interface CodeDuplication {
  pattern: string;
  occurrences: CodeOccurrence[];
  extractionOpportunity: string;
  estimatedSavings: number;
}
```

### 3. Service Consolidator

**Purpose**: Merge redundant services and eliminate duplicate functionality

**Interface**:
```typescript
interface IServiceConsolidator {
  consolidateServices(duplicates: ServiceDuplicate[]): Promise<ConsolidationPlan>;
  mergeOverlappingFunctionality(overlaps: FunctionalityOverlap[]): Promise<MergePlan>;
  removeUnusedCode(unused: UnusedCodeBlock[]): Promise<RemovalPlan>;
  validateConsolidation(plan: ConsolidationPlan): Promise<ValidationResult>;
}

interface ConsolidationPlan {
  servicesToRemove: string[];
  servicesToModify: ServiceModification[];
  newServices: NewServiceDefinition[];
  migrationSteps: MigrationStep[];
}

interface ServiceModification {
  serviceName: string;
  methodsToAdd: MethodDefinition[];
  methodsToRemove: string[];
  methodsToModify: MethodModification[];
  dependencyChanges: DependencyChange[];
}
```

### Performance Optimization Components

### 4. Output Text Parser

**Purpose**: Robust text extraction from OpenAI Responses API

**Interface**:
```typescript
interface IOutputTextParser {
  extractText(response: OpenAIResponse): string;
  parseWithFallback(response: OpenAIResponse): ParseResult;
  validateTextContent(text: string): boolean;
}

interface ParseResult {
  text: string;
  source: 'output_text' | 'message_content' | 'fallback';
  success: boolean;
  diagnostics?: string;
}

interface OpenAIResponse {
  output_text?: string;
  output?: Array<{
    type: string;
    content?: Array<{
      type: string;
      text?: string;
    }>;
  }>;
  status?: string;
}
```

**Implementation Strategy**:
```typescript
class OutputTextParser implements IOutputTextParser {
  extractText(response: OpenAIResponse): string {
    // Primary: Use output_text field
    const primaryText = response.output_text?.trim();
    if (primaryText) {
      return primaryText;
    }

    // Fallback: Parse message content arrays
    const fallbackText = this.extractFromMessageContent(response.output);
    if (fallbackText) {
      return fallbackText;
    }

    // Error: No usable text found
    throw new Error(
      `No usable text in response. status=${response.status} ` +
      `outputs=${(response.output || []).map(o => o.type).join(',')}`
    );
  }

  private extractFromMessageContent(output: any[]): string | null {
    const msg = output?.find(o => o.type === 'message');
    if (!msg?.content) return null;

    const chunks = msg.content
      .filter(c => c?.type === 'output_text' && typeof c.text === 'string')
      .map(c => c.text);
    
    const joined = chunks.join('').trim();
    return joined || null;
  }
}
```

### 2. JSON Schema Enforcer

**Purpose**: Guarantee structured outputs using OpenAI's response_format

**Interface**:
```typescript
interface IJSONSchemaEnforcer {
  createMarketAnalysisSchema(): JSONSchema;
  createRationaleSchema(): JSONSchema;
  enforceSchema(request: APIRequest, schema: JSONSchema): APIRequest;
  validateResponse(response: any, schema: JSONSchema): ValidationResult;
}

interface JSONSchema {
  name: string;
  schema: {
    type: 'object';
    required: string[];
    properties: Record<string, any>;
  };
  strict: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  data?: any;
}
```

**Market Analysis Schema**:
```typescript
const marketAnalysisSchema: JSONSchema = {
  name: "MarketAnalysis",
  schema: {
    type: "object",
    required: [
      "marketSaturation",
      "growthOpportunities", 
      "competitiveGaps",
      "demographicInsights",
      "strategicZones",
      "confidence"
    ],
    properties: {
      marketSaturation: {
        type: "object",
        required: ["level", "score", "storeCount", "populationPerStore", "marketPenetration", "reasoning"],
        properties: {
          level: { enum: ["LOW", "MODERATE", "HIGH", "OVERSATURATED"] },
          score: { type: "number" },
          storeCount: { type: "number" },
          populationPerStore: { type: "number" },
          marketPenetration: { type: "number" },
          reasoning: { type: "string" }
        }
      },
      growthOpportunities: {
        type: "array",
        items: {
          type: "object",
          required: ["type", "priority", "description", "potentialImpact"],
          properties: {
            type: { enum: ["DEMOGRAPHIC_SHIFT", "INFRASTRUCTURE_DEVELOPMENT", "COMPETITOR_GAP", "ECONOMIC_GROWTH"] },
            priority: { enum: ["HIGH", "MEDIUM", "LOW"] },
            description: { type: "string" },
            potentialImpact: { type: "number" }
          }
        }
      }
      // ... additional properties
    }
  },
  strict: true
};
```

### 3. Response Timeout Handler

**Purpose**: Implement hard timeouts and retry logic

**Interface**:
```typescript
interface IResponseTimeoutHandler {
  makeRequestWithTimeout<T>(
    request: () => Promise<T>, 
    timeoutMs: number,
    retryConfig?: RetryConfig
  ): Promise<T>;
  handleTimeout(error: Error, attempt: number): Promise<boolean>;
  calculateBackoff(attempt: number): number;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;
  retryOn: (error: Error) => boolean;
}
```

**Implementation**:
```typescript
class ResponseTimeoutHandler implements IResponseTimeoutHandler {
  async makeRequestWithTimeout<T>(
    request: () => Promise<T>,
    timeoutMs: number,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const result = await Promise.race([
          request(),
          this.createTimeoutPromise(timeoutMs)
        ]);

        clearTimeout(timeoutId);
        return result;

      } catch (error) {
        lastError = error as Error;
        
        if (attempt === retryConfig.maxAttempts || !retryConfig.retryOn(error)) {
          throw error;
        }

        const delay = this.calculateBackoff(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private calculateBackoff(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const jitter = Math.random() * 0.1; // 10% jitter
    
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    return delay * (1 + jitter);
  }
}
```

### 4. Token Optimizer

**Purpose**: Minimize token usage while maintaining quality

**Interface**:
```typescript
interface ITokenOptimizer {
  optimizePrompt(prompt: string, context: any): OptimizedPrompt;
  calculateOptimalTokenLimits(operationType: string): TokenLimits;
  preprocessContext(context: any): ProcessedContext;
  buildConciseInstructions(operationType: string): string;
}

interface OptimizedPrompt {
  text: string;
  estimatedTokens: number;
  optimizations: string[];
}

interface TokenLimits {
  maxOutput: number;
  reasoningEffort: 'low' | 'medium' | 'high';
  textVerbosity: 'low' | 'medium' | 'high';
}

interface ProcessedContext {
  summary: any;
  representatives: any[];
  nullSentinels: Record<string, string>;
}
```

**Optimization Strategies**:
```typescript
class TokenOptimizer implements ITokenOptimizer {
  optimizePrompt(prompt: string, context: any): OptimizedPrompt {
    const optimizations: string[] = [];
    let optimizedText = prompt;

    // Replace verbose nulls with sentinels
    const processedContext = this.preprocessContext(context);
    optimizations.push('Replaced null values with NA sentinels');

    // Remove redundant instructions
    optimizedText = this.removeDuplicateInstructions(optimizedText);
    optimizations.push('Removed duplicate instructions');

    // Use concise formatting instructions
    optimizedText = optimizedText.replace(
      /Always respond with valid JSON.*formatting/gi,
      'Return JSON only.'
    );
    optimizations.push('Simplified formatting instructions');

    return {
      text: optimizedText,
      estimatedTokens: this.estimateTokens(optimizedText),
      optimizations
    };
  }

  calculateOptimalTokenLimits(operationType: string): TokenLimits {
    const limits: Record<string, TokenLimits> = {
      'rationale_generation': {
        maxOutput: 200,
        reasoningEffort: 'low',
        textVerbosity: 'low'
      },
      'market_analysis': {
        maxOutput: 3500,
        reasoningEffort: 'medium', 
        textVerbosity: 'medium'
      },
      'location_discovery': {
        maxOutput: 1000,
        reasoningEffort: 'low',
        textVerbosity: 'low'
      }
    };

    return limits[operationType] || limits['rationale_generation'];
  }
}
```

### 5. Data Aggregator

**Purpose**: Pre-process large datasets to reduce token usage

**Interface**:
```typescript
interface IDataAggregator {
  aggregateStoreData(stores: Store[]): StoreAggregation;
  aggregateCompetitorData(competitors: Competitor[]): CompetitorAggregation;
  selectRepresentativePoints(points: GeoPoint[], maxCount: number): GeoPoint[];
  calculateSummaryStatistics(data: number[]): SummaryStats;
}

interface StoreAggregation {
  totalCount: number;
  density: number;
  meanDistance: number;
  medianDistance: number;
  populationPerStore: number;
  representatives: GeoPoint[];
  clusters: ClusterSummary[];
}

interface CompetitorAggregation {
  totalCount: number;
  brandMix: Record<string, number>;
  averageProximity: number;
  competitiveGaps: GapArea[];
  representatives: GeoPoint[];
}
```

**Implementation**:
```typescript
class DataAggregator implements IDataAggregator {
  aggregateStoreData(stores: Store[]): StoreAggregation {
    const coordinates = stores.map(s => ({ lat: s.lat, lng: s.lng }));
    
    return {
      totalCount: stores.length,
      density: this.calculateDensity(coordinates),
      meanDistance: this.calculateMeanDistance(coordinates),
      medianDistance: this.calculateMedianDistance(coordinates),
      populationPerStore: this.calculatePopulationPerStore(stores),
      representatives: this.selectRepresentativePoints(coordinates, 10),
      clusters: this.identifyClusters(coordinates)
    };
  }

  selectRepresentativePoints(points: GeoPoint[], maxCount: number): GeoPoint[] {
    if (points.length <= maxCount) return points;

    // Use k-means clustering to select representative points
    const clusters = this.performKMeansClustering(points, maxCount);
    return clusters.map(cluster => cluster.centroid);
  }

  private calculateDensity(points: GeoPoint[]): number {
    // Calculate stores per square kilometer
    const bounds = this.calculateBounds(points);
    const area = this.calculateArea(bounds);
    return points.length / area;
  }
}
```

### 6. Cache Manager

**Purpose**: Implement functional caching with proper invalidation

**Interface**:
```typescript
interface ICacheManager {
  getCachedResult<T>(key: string): Promise<T | null>;
  setCachedResult<T>(key: string, result: T, ttl: number): Promise<void>;
  buildCacheKey(params: any): string;
  invalidateCache(pattern: string): Promise<void>;
  getCacheStats(): CacheStats;
}

interface CacheStats {
  hitRate: number;
  totalRequests: number;
  cacheSize: number;
  oldestEntry: Date;
}

interface CachedResult<T> {
  data: T;
  metadata: {
    model: string;
    maxTokens: number;
    reasoningEffort: string;
    timestamp: Date;
    version: string;
  };
}
```

**Implementation**:
```typescript
class CacheManager implements ICacheManager {
  async getCachedResult<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (!cached) return null;

      const parsed: CachedResult<T> = JSON.parse(cached);
      
      // Validate cache entry is still valid
      if (this.isCacheEntryValid(parsed.metadata)) {
        return parsed.data;
      }

      // Invalid cache entry, remove it
      await this.redis.del(key);
      return null;

    } catch (error) {
      console.warn('Cache retrieval failed:', error);
      return null;
    }
  }

  buildCacheKey(params: any): string {
    // Create stable cache key with explicit null handling
    const normalized = this.normalizeParams(params);
    const hash = this.createHash(normalized);
    return `ai_analysis:${hash}`;
  }

  private normalizeParams(params: any): string {
    const normalized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) {
        normalized[key] = 'NA';
      } else if (value === 0) {
        normalized[key] = '0'; // Distinguish real zero from null
      } else {
        normalized[key] = String(value);
      }
    }

    return JSON.stringify(normalized, Object.keys(normalized).sort());
  }
}
```

### 7. Concurrency Manager

**Purpose**: Handle parallel processing with rate limiting

**Interface**:
```typescript
interface IConcurrencyManager {
  processInParallel<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number
  ): Promise<R[]>;
  rateLimitedCall<T>(call: () => Promise<T>): Promise<T>;
  getQueueStatus(): QueueStatus;
}

interface QueueStatus {
  pending: number;
  active: number;
  completed: number;
  failed: number;
}
```

**Implementation**:
```typescript
class ConcurrencyManager implements IConcurrencyManager {
  private semaphore: Semaphore;
  private rateLimiter: RateLimiter;

  constructor() {
    this.semaphore = new Semaphore(4); // Max 4 concurrent requests
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: 10,
      interval: 'minute'
    });
  }

  async processInParallel<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number = 4
  ): Promise<R[]> {
    const results: R[] = [];
    const chunks = this.chunkArray(items, concurrency);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(item => this.rateLimitedCall(() => processor(item)))
      );
      results.push(...chunkResults);
    }

    return results;
  }

  async rateLimitedCall<T>(call: () => Promise<T>): Promise<T> {
    await this.rateLimiter.removeTokens(1);
    return await this.semaphore.acquire(call);
  }
}
```

## Data Models

### Enhanced API Request Configuration
```typescript
interface OptimizedAPIRequest {
  model: string;
  input: StructuredMessage[];
  max_output_tokens: number;
  reasoning: {
    effort: 'low' | 'medium' | 'high';
  };
  text: {
    verbosity: 'low' | 'medium' | 'high';
  };
  response_format?: {
    type: 'json_schema';
    json_schema: JSONSchema;
  };
  seed?: number;
}

interface StructuredMessage {
  role: 'system' | 'user' | 'assistant';
  content: Array<{
    type: 'input_text';
    text: string;
  }>;
}
```

### Performance Metrics
```typescript
interface PerformanceMetrics {
  executionTime: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  cacheHit: boolean;
  retryCount: number;
  qualityScore: number;
}
```

## Error Handling

### Comprehensive Error Recovery
```typescript
enum OptimizationError {
  PARSING_FAILED = 'PARSING_FAILED',
  TIMEOUT_EXCEEDED = 'TIMEOUT_EXCEEDED',
  SCHEMA_VALIDATION_FAILED = 'SCHEMA_VALIDATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CACHE_ERROR = 'CACHE_ERROR',
  TOKEN_LIMIT_EXCEEDED = 'TOKEN_LIMIT_EXCEEDED'
}

interface ErrorRecoveryStrategy {
  error: OptimizationError;
  recovery: (context: any) => Promise<any>;
  fallback: (context: any) => Promise<any>;
}
```

### Fallback Strategies
1. **Parsing Failure**: Retry with simpler schema, then fallback to text parsing
2. **Timeout**: Reduce token limits and retry with lower reasoning effort
3. **Rate Limit**: Implement exponential backoff with jitter
4. **Schema Validation**: Fallback to text parsing with manual validation
5. **Cache Error**: Continue without cache, log for investigation

## Testing Strategy

### Performance Tests
- Measure execution time improvements (target: 3-6x faster)
- Validate token usage reduction (target: 50% reduction)
- Test concurrent processing throughput
- Benchmark cache hit rates and performance

### Reliability Tests
- Test timeout and retry mechanisms
- Validate error recovery strategies
- Test schema enforcement edge cases
- Validate cache invalidation logic

### Quality Assurance Tests
- Compare output quality before/after optimization
- Test deterministic output with seed values
- Validate JSON schema compliance
- Test fallback quality when optimizations fail

## Implementation Phases

### Phase 1: Codebase Analysis and Audit (Week 1)
1. Implement Expansion System Auditor to scan entire codebase
2. Create Redundancy Detector to identify duplicate services and functionality
3. Generate comprehensive simplification report with consolidation opportunities
4. Analyze service dependencies and identify circular dependencies

### Phase 2: Service Consolidation (Week 2)
1. Implement Service Consolidator to merge redundant services
2. Remove duplicate OpenAI service implementations
3. Consolidate overlapping expansion generation logic
4. Eliminate unused interfaces and deprecated code

### Phase 3: Core Performance Infrastructure (Week 3)
1. Implement Output Text Parser with fallback logic
2. Create Response Timeout Handler with retry mechanisms
3. Build Token Optimizer with prompt optimization
4. Add comprehensive logging and monitoring

### Phase 4: Schema and Caching (Week 4)
1. Implement JSON Schema Enforcer for structured outputs
2. Create functional Cache Manager with proper invalidation
3. Build Data Aggregator for token reduction
4. Add cache key stability improvements

### Phase 5: Concurrency and Performance (Week 5)
1. Implement Concurrency Manager for parallel processing
2. Add Deterministic Controls with seed management
3. Optimize reasoning effort and verbosity settings
4. Remove deprecated temperature configurations

### Phase 6: Integration and Testing (Week 6)
1. Integrate all optimizations into consolidated services
2. Add comprehensive performance monitoring
3. Implement quality assurance validations
4. Create performance benchmarking suite

## Migration Strategy

### Backward Compatibility
- Maintain existing API interfaces during optimization
- Use feature flags to enable/disable optimizations
- Provide fallback to original implementation if needed
- Gradual rollout with A/B testing

### Performance Monitoring
- Track execution time improvements
- Monitor token usage and cost reductions
- Measure cache hit rates and effectiveness
- Alert on performance regressions

### Rollback Plan
- Feature flags to disable optimizations
- Preserve original service implementations
- Database rollback for cache schema changes
- Monitoring alerts for quality degradation

## Security Considerations

### API Security
- Secure handling of OpenAI API keys
- Rate limiting to prevent abuse
- Input validation and sanitization
- Audit logging for API usage

### Data Privacy
- No PII in cached results
- Secure cache encryption
- Data retention policy compliance
- Anonymization of sensitive data

## Codebase Simplification Targets

### Service Consolidation
- Merge duplicate OpenAI rationale services (admin/lib and bff/src versions)
- Consolidate expansion generation services into single optimized service
- Remove redundant AI service implementations across admin and BFF
- Eliminate duplicate market analysis and strategic scoring logic

### Code Reduction
- 40% reduction in expansion-related code files
- Remove 60% of duplicate method implementations
- Eliminate 80% of unused interfaces and types
- Consolidate 50% of overlapping service functionality

### Complexity Reduction
- Reduce cyclomatic complexity by 30% through service consolidation
- Eliminate circular dependencies in expansion services
- Simplify service interfaces by removing redundant methods
- Standardize error handling patterns across all services

### Specific Cleanup Targets
Based on the codebase structure, target these specific areas:
- **OpenAI Services**: Merge `apps/admin/lib/services/openai-*.service.ts` and `apps/bff/src/services/openai-*.service.ts`
- **AI Services**: Consolidate `apps/admin/lib/services/ai/*` and `apps/bff/src/services/ai/*`
- **Expansion Services**: Merge expansion-generation services and remove duplicates
- **Interface Duplication**: Eliminate duplicate interfaces between admin and BFF
- **Utility Functions**: Consolidate duplicate utility functions into shared packages

## Performance Targets

### Execution Time
- Rationale generation: < 10 seconds (from ~60 seconds)
- Market analysis: < 30 seconds (from ~300 seconds)
- Location discovery: < 15 seconds (from ~90 seconds)

### Token Usage
- 50% reduction in input tokens through data aggregation
- 60% reduction in output tokens through optimized limits
- 40% overall cost reduction through efficiency improvements

### Reliability
- 99.5% success rate for API calls
- < 1% timeout rate with proper retry handling
- 90%+ cache hit rate for repeated analyses
- < 5 second average response time for cached results

### Maintainability
- Single source of truth for each AI service functionality
- Consistent error handling and logging patterns
- Simplified service interfaces with clear responsibilities
- Reduced cognitive load for developers working on expansion features