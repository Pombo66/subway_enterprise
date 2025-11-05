# Design Document

## Overview

This design implements a multi-model AI architecture that optimizes cost and intelligence by using GPT-5-nano for high-volume location discovery and GPT-5-mini for strategic analysis. The system moves AI integration earlier in the pipeline, removes all GPT-4o references, and provides centralized model configuration management.

## Architecture

### High-Level Flow
```
Market Intelligence (GPT-5-mini) → Strategic Zones → Location Discovery (GPT-5-nano) → Strategic Scoring (GPT-5-mini) → Final Recommendations
```

### Component Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Pipeline Controller                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Market Analysis │  │ Location        │  │ Strategic       │ │
│  │ Service         │  │ Discovery       │  │ Scoring Service │ │
│  │ (GPT-5-mini)    │  │ Service         │  │ (GPT-5-mini)    │ │
│  │                 │  │ (GPT-5-nano)    │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                Model Configuration Manager                       │
├─────────────────────────────────────────────────────────────────┤
│                Cost Optimization Engine                          │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Model Configuration Manager

**Purpose**: Centralized AI model configuration and management

**Interface**:
```typescript
interface IModelConfigurationManager {
  getModelForOperation(operation: AIOperationType): string;
  validateModelConfiguration(): boolean;
  updateModelConfiguration(config: ModelConfig): void;
  getModelPricing(model: string): ModelPricing;
}

enum AIOperationType {
  MARKET_ANALYSIS = 'market_analysis',
  LOCATION_DISCOVERY = 'location_discovery', 
  STRATEGIC_SCORING = 'strategic_scoring',
  RATIONALE_GENERATION = 'rationale_generation'
}

interface ModelConfig {
  marketAnalysisModel: string;      // 'gpt-5-mini'
  locationDiscoveryModel: string;   // 'gpt-5-nano'
  strategicScoringModel: string;    // 'gpt-5-mini'
  rationaleGenerationModel: string; // 'gpt-5-mini'
}
```

### 2. Market Analysis Service

**Purpose**: AI-driven market intelligence using GPT-5-mini

**Interface**:
```typescript
interface IMarketAnalysisService {
  analyzeMarket(region: RegionFilter): Promise<MarketAnalysis>;
  identifyStrategicZones(analysis: MarketAnalysis): Promise<StrategicZone[]>;
  assessCompetitiveLandscape(region: RegionFilter): Promise<CompetitiveAnalysis>;
}

interface MarketAnalysis {
  region: RegionFilter;
  marketSaturation: number;
  growthOpportunities: GrowthOpportunity[];
  competitiveGaps: CompetitiveGap[];
  demographicInsights: DemographicInsight[];
  strategicRecommendations: string[];
}

interface StrategicZone {
  id: string;
  bounds: BoundingBox;
  priority: number;
  reasoning: string;
  opportunityType: 'growth_corridor' | 'market_gap' | 'demographic_target' | 'competitive_advantage';
}
```

### 3. Location Discovery Service

**Purpose**: High-volume location candidate generation using GPT-5-nano

**Interface**:
```typescript
interface ILocationDiscoveryService {
  discoverLocations(zones: StrategicZone[], targetCount: number): Promise<LocationCandidate[]>;
  generateCandidatesInZone(zone: StrategicZone, count: number): Promise<LocationCandidate[]>;
  validateLocationViability(candidate: LocationCandidate): Promise<boolean>;
}

interface LocationCandidate {
  id: string;
  lat: number;
  lng: number;
  zoneId: string;
  basicScore: number;
  discoveryReasoning: string;
  viabilityFactors: string[];
  generatedBy: 'gpt-5-nano';
}
```

### 4. Strategic Scoring Service

**Purpose**: Intelligent scoring and analysis using GPT-5-mini

**Interface**:
```typescript
interface IStrategicScoringService {
  scoreStrategically(candidates: LocationCandidate[], marketContext: MarketAnalysis): Promise<ScoredCandidate[]>;
  generateRationale(candidate: ScoredCandidate): Promise<string>;
  rankCandidates(candidates: ScoredCandidate[]): Promise<ScoredCandidate[]>;
}

interface ScoredCandidate extends LocationCandidate {
  strategicScore: number;
  revenueProjection: number;
  riskAssessment: number;
  competitiveAdvantage: number;
  strategicReasoning: string;
  finalRationale?: string;
}
```

### 5. AI Pipeline Controller

**Purpose**: Orchestrates the multi-stage AI processing pipeline

**Interface**:
```typescript
interface IAIPipelineController {
  generateIntelligentRecommendations(params: GenerationParams): Promise<ExpansionJobResult>;
  executeMarketAnalysisPhase(params: GenerationParams): Promise<MarketAnalysis>;
  executeLocationDiscoveryPhase(analysis: MarketAnalysis, targetCount: number): Promise<LocationCandidate[]>;
  executeStrategicScoringPhase(candidates: LocationCandidate[], analysis: MarketAnalysis): Promise<ScoredCandidate[]>;
}
```

### 6. Cost Optimization Engine

**Purpose**: Track costs and optimize model usage

**Interface**:
```typescript
interface ICostOptimizationEngine {
  trackTokenUsage(model: string, tokens: number, operation: AIOperationType): void;
  estimateOperationCost(operation: AIOperationType, volume: number): number;
  generateCostReport(): CostReport;
  optimizeModelSelection(operation: AIOperationType, volume: number): string;
}

interface CostReport {
  totalCost: number;
  costByModel: Record<string, number>;
  costByOperation: Record<AIOperationType, number>;
  savingsAchieved: number;
  recommendations: string[];
}
```

## Data Models

### Enhanced Generation Parameters
```typescript
interface EnhancedGenerationParams extends GenerationParams {
  enableMarketIntelligence: boolean;
  enableStrategicZoning: boolean;
  locationDiscoveryVolume: number;
  strategicAnalysisDepth: 'basic' | 'detailed' | 'comprehensive';
}
```

### AI Operation Context
```typescript
interface AIOperationContext {
  operation: AIOperationType;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  duration: number;
  quality: number;
  timestamp: Date;
}
```

## Error Handling

### Model Fallback Strategy
1. **Primary Model Failure**: If GPT-5-nano fails, escalate to GPT-5-mini
2. **Configuration Errors**: Fall back to safe defaults (GPT-5-mini for all operations)
3. **Cost Limit Exceeded**: Reduce volume or switch to more cost-effective operations
4. **Quality Threshold Not Met**: Retry with higher-tier model

### Error Types
```typescript
enum AIOptimizationError {
  MODEL_NOT_AVAILABLE = 'MODEL_NOT_AVAILABLE',
  COST_LIMIT_EXCEEDED = 'COST_LIMIT_EXCEEDED', 
  QUALITY_THRESHOLD_NOT_MET = 'QUALITY_THRESHOLD_NOT_MET',
  CONFIGURATION_INVALID = 'CONFIGURATION_INVALID'
}
```

## Testing Strategy

### Unit Tests
- Model Configuration Manager validation
- Cost calculation accuracy
- Service interface compliance
- Error handling scenarios

### Integration Tests  
- End-to-end AI pipeline execution
- Model switching and fallback behavior
- Cost tracking accuracy
- Quality validation

### Performance Tests
- High-volume location discovery with GPT-5-nano
- Cost optimization under various load scenarios
- Response time benchmarks for each AI operation type

### Cost Tests
- Verify actual costs match estimates
- Test cost optimization recommendations
- Validate savings calculations

## Implementation Phases

### Phase 1: Model Configuration Cleanup
1. Create Model Configuration Manager
2. Remove all GPT-4o references from existing services
3. Update environment configuration
4. Implement centralized model selection

### Phase 2: Market Intelligence Integration
1. Create Market Analysis Service with GPT-5-mini
2. Implement strategic zone identification
3. Integrate market analysis into generation pipeline
4. Add competitive landscape assessment

### Phase 3: Location Discovery Optimization  
1. Create Location Discovery Service with GPT-5-nano
2. Implement high-volume candidate generation
3. Add basic viability scoring
4. Integrate with strategic zones

### Phase 4: Strategic Scoring Enhancement
1. Enhance Strategic Scoring Service with GPT-5-mini
2. Implement intelligent ranking algorithms
3. Add detailed rationale generation
4. Integrate market context into scoring

### Phase 5: Cost Optimization & Monitoring
1. Implement Cost Optimization Engine
2. Add comprehensive cost tracking
3. Create cost optimization recommendations
4. Add performance monitoring and alerting

## Migration Strategy

### Backward Compatibility
- Maintain existing API interfaces during transition
- Support both old and new pipeline execution modes
- Gradual rollout with feature flags

### Data Migration
- No database schema changes required
- Update cached rationales to include model information
- Migrate existing job configurations

### Rollback Plan
- Feature flags to disable new AI pipeline
- Fallback to existing expansion generation service
- Preserve existing model configurations as backup

## Performance Considerations

### Optimization Strategies
- Batch multiple nano operations to reduce API overhead
- Cache market analysis results for similar regions
- Implement intelligent caching for strategic zones
- Use connection pooling for AI service calls

### Scalability
- Horizontal scaling of AI services
- Load balancing across multiple AI endpoints
- Queue management for high-volume operations
- Rate limiting and throttling controls

## Security Considerations

### API Key Management
- Secure storage of OpenAI API keys
- Rotation policies for API credentials
- Environment-specific key isolation
- Audit logging for API usage

### Data Privacy
- No PII in AI prompts or responses
- Secure handling of location data
- Compliance with data retention policies
- Anonymization of sensitive business data