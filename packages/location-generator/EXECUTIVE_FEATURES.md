# Executive Features - "2030 Intelligent" Location Generator

This document outlines the executive-ready features implemented in the National Store Location Generator, designed to meet the "2030 intelligent" standard for enterprise decision-making tools.

## 🎯 Executive Summary

The location generator now includes 10 key executive features that transform it from a basic optimization tool into an intelligent decision-support system:

1. **Pareto Frontier Analysis** - Multi-objective optimization with knee point selection
2. **Scenario Theater** - Instant scenario switching (< 500ms) with cached features  
3. **Counterfactual Analysis** - "What would flip this site?" threshold analysis
4. **Stability Analysis** - Portfolio confidence with weight jittering
5. **Live Backtesting** - Real-time model validation and learning
6. **Board Pack Autopilot** - One-click executive presentation generation
7. **Policy Guardrails** - AI drift prevention and bounds enforcement
8. **Regional Fairness** - Population-weighted distribution analysis
9. **Operations Monitoring** - Rate limiting, latency budgets, and health checks
10. **Quick vs Accurate Toggle** - Radial fallback for scenario exploration

## 📊 Feature Details

### 1. Pareto Frontier Analysis (`ParetoService`)

**Purpose**: Multi-objective optimization showing trade-offs between ROI, risk, and coverage.

**Key Capabilities**:
- Sweeps K from 5 to max_sites, computing portfolio metrics
- Filters to non-dominated points (Pareto frontier)
- Auto-selects "knee point" (largest ΔROI/ΔRisk change)
- Exposes 6-12 frontier points to UI for executive selection

**API Methods**:
```typescript
await api.generateParetoFrontier(candidates, config, existingStores, { minK: 5, maxK: 50 })
```

**Executive Value**: Executives can visualize optimal trade-offs and select risk-adjusted portfolios.

### 2. Scenario Theater (`ScenarioService`)

**Purpose**: Instant scenario switching without recomputing features or making new API calls.

**Key Capabilities**:
- Defend/Balanced/Blitz modes update portfolio instantly (< 500ms)
- Cached features - no fresh isochrone or LLM calls
- Policy-driven weight adjustments with bounds checking
- Cache hit/miss tracking for performance monitoring

**API Methods**:
```typescript
await api.switchScenario('Blitz', candidatesWithFeatures, baseWeights, config)
```

**Executive Value**: Real-time scenario exploration during board meetings.

### 3. Counterfactual Analysis (`CounterfactualService`)

**Purpose**: Shows thresholds that would change site rankings ("What would flip this from B→A?").

**Key Capabilities**:
- Deterministic threshold calculations for each feature
- "Nearest subway > 2.1km, population > 45k" style outputs
- Supports rank improvement targets (next_rank, top_10, top_5)
- Optional LLM formatting for natural language explanations
- **Primary thresholds**: Returns 1-2 key numeric thresholds for product integration

**API Methods**:
```typescript
const analysis = api.generateCounterfactuals(targetSite, allCandidates, weights, 'top_5')
// analysis.primaryThresholds contains key thresholds for UI display
```

**Executive Value**: Actionable insights for site improvement and market understanding with direct product integration.

### 4. Stability Analysis (`StabilityService`)

**Purpose**: Portfolio confidence analysis through weight jittering (±10%).

**Key Capabilities**:
- Jitters weights ±10% across multiple iterations (no extra APIs)
- Calculates how often each site stays selected
- Shows "Stable 86%" confidence scores
- Identifies portfolio sensitivity to parameter changes

**API Methods**:
```typescript
await api.analyzeStability(candidates, baseWeights, config, 50)
```

**Executive Value**: Risk assessment and confidence levels for investment decisions.

### 5. Live Backtesting (`BacktestService`)

**Purpose**: Real-time model validation by masking existing stores and testing predictions.

**Key Capabilities**:
- Masks 10% of stores and predicts their locations
- Measures hit rate (% within 2.5km threshold)
- Calculates coverage uplift vs baseline
- Provides validation pass/fail with recommendations

**API Methods**:
```typescript
await api.runBacktest(allStores, candidates, config, { maskPercentage: 0.1 })
```

**Executive Value**: Model validation and continuous learning feedback.

### 6. Board Pack Autopilot (`BoardPackService`)

**Purpose**: One-button generation of executive presentation materials.

**Key Capabilities**:
- Auto-fills KPIs, scenario comparisons, top sites analysis
- Risk assessment with mitigation strategies
- Regional analysis with fairness scores
- Alternative options (conservative/aggressive)
- Export-ready PDF structure

**API Methods**:
```typescript
await api.generateBoardPack(paretoFrontier, kneePoint, scenarios, stability, portfolio, diagnostics, config)
```

**Executive Value**: Instant board-ready materials without manual preparation.

### 7. Policy Guardrails (`PolicyGuardrailService`)

**Purpose**: Prevents AI drift and enforces business constraints.

**Key Capabilities**:
- Clamps weights ±20% from baseline
- Enforces absolute bounds (spacing ∈ [0.5, 6] km)
- Prevents AI policy suggestions from drifting
- Validates all parameters against business rules

**API Methods**:
```typescript
api.validatePolicyGuardrails(weights, config, baseline)
api.enforceWeightGuardrails(weights, baselineWeights)
```

**Executive Value**: Governance and risk management for AI-driven decisions.

### 8. Regional Fairness (`RegionalFairnessService`)

**Purpose**: Population-weighted distribution analysis with fairness scoring.

**Key Capabilities**:
- Shows picks per region vs population share
- Calculates fairness scores (0-100%)
- Identifies under/over-represented regions
- Provides rebalancing recommendations

**API Methods**:
```typescript
api.analyzeRegionalFairness(portfolio, config)
api.getFairnessAdjustedRecommendations(candidates, currentPortfolio, config, targetSites)
```

**Executive Value**: Regulatory compliance and equitable market coverage.

### 9. Operations Monitoring (`OperationsService`)

**Purpose**: Rate limiting, latency budgets, system health monitoring, and intelligent degradation.

**Key Capabilities**:
- Isochrone concurrency limits and rate limiting
- LLM token budgets and usage tracking
- Live performance counters and health status
- Memory and execution time monitoring
- **Auto-degradation**: Falls back to L0 (explanations only) when cache unavailable
- **Uniqueness monitoring**: Tracks rationale uniqueness to detect prompt drift
- **Alert system**: Warns when uniqueness drops below thresholds

**API Methods**:
```typescript
api.getOperationalMetrics() // Now includes uniqueness metrics
api.canMakeIsochroneRequest()
api.canMakeLLMRequest(estimatedTokens)
api.operationsService.checkUniquenessAlert() // New alert checking
```

**Executive Value**: Operational excellence, cost control, and automatic resilience.

### 10. Quick vs Accurate Toggle

**Purpose**: Radial fallback for fast scenario exploration vs accurate isochrones for finals.

**Key Capabilities**:
- Quick mode: Radial distance calculations (< 100ms per site)
- Accurate mode: Isochrone-based catchments (2-5s per site)
- Automatic fallback on isochrone service failures
- Fallback rate monitoring and alerting

**Executive Value**: Responsive exploration with production-grade accuracy when needed.

## 🏆 Acceptance Checklist

The system meets all "2030 intelligent" acceptance criteria:

- ✅ **Scenarios**: Switching Defend↔Balanced↔Blitz updates portfolio & KPIs instantly (<500ms) with no extra map/LLM calls
- ✅ **Frontier**: Frontier chart shows 6–12 points; clicking a point swaps the portfolio
- ✅ **Rationales**: Every finalist has a unique, number-backed rationale + 1–3 risks + 1–3 actions; no duplication across sites
- ✅ **Counterfactuals**: Each site shows thresholds that would move its rank up/down
- ✅ **Backtest**: Mask 10% stores → median distance from top N picks to masked stores <2.5 km or coverage uplift exceeds threshold
- ✅ **Stability**: ≥70% of chosen sites remain selected under ±10% weight jitter
- ✅ **Export**: Board Pack renders without manual edits
- ✅ **Guardrails**: Policy bounds enforced on all parameters
- ✅ **Fairness**: Regional distribution visible with population share comparison
- ✅ **Operations**: Live monitoring of rates, latency, and system health

## 🚀 Usage Examples

### Basic Executive Demo
```typescript
import { LocationGeneratorAPI } from '@subway/location-generator';

const api = new LocationGeneratorAPI();

// 1. Generate locations
const result = await api.generateLocations(request);

// 2. Get Pareto frontier
const pareto = await api.generateParetoFrontier(result.candidates, request, request.existingStores);

// 3. Switch scenarios instantly
const blitzResult = await api.switchScenario('Blitz', result.candidates, request.config.weights, request);

// 4. Analyze stability
const stability = await api.analyzeStability(result.candidates, request.config.weights, request);

// 5. Generate board pack
const boardPack = await api.generateBoardPack(pareto.frontier, pareto.kneePoint, {}, stability, result.selected, result.diagnostics, request);
```

### Operations Monitoring
```typescript
// Check system health
const health = api.getDetailedHealthStatus();
console.log(`System: ${health.status}, Issues: ${health.issues.length}`);

// Monitor token usage
const metrics = api.getOperationalMetrics();
console.log(`Tokens: ${metrics.llm.tokensUsed}/${api.getOperationalLimits().llm.tokenBudget}`);

// Check rate limits
const canMakeLLMCall = api.canMakeLLMRequest(1000);
if (!canMakeLLMCall.allowed) {
  console.log(`Rate limited: ${canMakeLLMCall.reason}`);
}
```

### Regional Fairness Analysis
```typescript
// Analyze current fairness
const fairness = api.analyzeRegionalFairness(portfolio, config);
console.log(`Fairness Score: ${fairness.overallScore * 100}%`);

// Get fairness-adjusted recommendations
const adjusted = api.getFairnessAdjustedRecommendations(candidates, portfolio, config, 10);
console.log(`Recommended: ${adjusted.recommendations.length} sites for better balance`);
```

## 🎨 UI Integration Points

### Executive Dashboard
- **Pareto Chart**: Interactive frontier with knee point highlighting
- **Scenario Slider**: Defend ↔ Balanced ↔ Blitz with instant updates
- **Stability Halo**: Confidence rings around map pins
- **Fairness Bar**: Regional distribution vs population share

### Site Details
- **Counterfactual Panel**: "To reach Top 5: Population > 45k, Subway distance > 2.1km"
- **Stability Badge**: "Stable 86%" confidence indicator
- **Risk Indicators**: Data quality and saturation warnings

### Operations Panel (Hidden)
- **Health Status**: System health with issue details
- **Rate Limits**: Live counters for isochrone/LLM usage
- **Performance**: Execution time and memory usage
- **Cache Stats**: Hit rates and token consumption

## 📈 Performance Characteristics

- **Scenario Switching**: < 500ms (cached features)
- **Pareto Generation**: 2-5 seconds for 50 points
- **Stability Analysis**: 10-30 seconds for 50 iterations
- **Backtest Validation**: 5-15 seconds depending on data size
- **Board Pack Generation**: 1-3 seconds (mostly LLM calls)
- **Memory Usage**: < 2GB for national-scale analysis
- **Token Budget**: 20k tokens per run (configurable)

## 🔧 Configuration

All executive features are configurable through the API:

```typescript
const operationsLimits = {
  isochrone: { concurrency: 10, ratePerMinute: 300 },
  llm: { concurrency: 5, ratePerMinute: 60, tokenBudget: 20000 },
  processing: { maxExecutionTimeMs: 600000, memoryLimitMB: 2048 }
};

const policyBounds = {
  weights: { population: { min: 0.1, max: 0.4 } },
  constraints: { minSpacing: { min: 0.5, max: 6.0 } },
  aiLimits: { maxWeightChange: 0.2 }
};
```

## 🎯 Business Impact

These executive features transform the location generator from a technical tool into a strategic decision-support system:

1. **Speed**: Instant scenario exploration enables real-time strategy sessions
2. **Confidence**: Stability analysis and backtesting provide investment confidence
3. **Governance**: Policy guardrails ensure AI recommendations stay within business bounds
4. **Compliance**: Regional fairness analysis supports regulatory requirements
5. **Efficiency**: Board pack autopilot eliminates manual presentation preparation
6. **Transparency**: Counterfactual analysis makes AI decisions explainable
7. **Reliability**: Operations monitoring ensures production-grade performance
8. **Resilience**: Auto-degradation to L0 mode when cache fails ensures system availability
9. **Quality Assurance**: Uniqueness monitoring detects prompt drift and cache issues
10. **Product Integration**: Primary thresholds enable direct "what would flip this site" UI features

The system is now ready for enterprise deployment with executive-grade intelligence, operational excellence, and production resilience.