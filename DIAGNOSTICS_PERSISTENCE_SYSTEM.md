# Diagnostics & Scenario Persistence System

## 🔍 **Diagnostics Toggle - Complete Transparency**

### **When `enableDiagnostics=true`, each suggestion includes:**

```typescript
{
  lat: 52.516275,
  lng: 13.377704,
  settlementName: "Berlin",
  settlementType: "city",
  estimatedPopulation: 3669491,
  
  // NEW: Complete diagnostic breakdown
  diagnostics: {
    inputs: {
      population: 3669491,
      nearest3Distances: [15.2, 18.7, 22.1], // km to nearest stores
      anchorPOIs: 18,                         // malls, stations, grocers
      localDensity: 0.045,                    // stores per km²
      peerTurnover: 825000,                   // avg nearby store turnover
      storeCount5km: 2,
      storeCount10km: 7,
      storeCount15km: 12
    },
    normalizedScores: {
      populationScore: 0.89,    // log-normalized population
      gapScore: 0.76,          // distance-based demand
      anchorScore: 0.90,       // commercial ecosystem
      performanceScore: 0.83,  // nearby store success
      saturationPenalty: 0.22  // competition penalty
    },
    weights: {
      population: 0.25,
      gap: 0.35,
      anchor: 0.20,
      performance: 0.20,
      saturation: 0.15
    },
    finalScore: 0.847
  }
}
```

### **Diagnostic Benefits**
- **Complete Transparency**: See exactly why each location scored high/low
- **Parameter Tuning**: Understand weight impact on specific locations
- **Quality Assurance**: Verify input data accuracy and normalization
- **Business Intelligence**: Quantify market factors for each suggestion

## 📊 **Generation Profile - Top-50 Analysis**

### **Logged JSON Profile on Each Run**
```json
{
  "top50Candidates": [
    {
      "rank": 1,
      "name": "Berlin",
      "type": "city", 
      "population": 3669491,
      "score": 0.847,
      "selected": true
    },
    {
      "rank": 2,
      "name": "Hamburg",
      "type": "city",
      "population": 1899160, 
      "score": 0.823,
      "selected": true
    },
    {
      "rank": 15,
      "name": "Heidelberg",
      "type": "town",
      "population": 159914,
      "score": 0.654,
      "selected": false,
      "rejectionReason": "drive_time_nms_suppressed"
    }
  ],
  "scoringDistribution": {
    "populationScores": { "min": 0.12, "max": 0.89, "avg": 0.45, "std": 0.18 },
    "gapScores": { "min": 0.05, "max": 0.92, "avg": 0.58, "std": 0.24 },
    "anchorScores": { "min": 0.00, "max": 0.90, "avg": 0.42, "std": 0.22 },
    "performanceScores": { "min": 0.20, "max": 0.85, "avg": 0.52, "std": 0.16 },
    "finalScores": { "min": 0.18, "max": 0.85, "avg": 0.49, "std": 0.15 }
  },
  "rejectionBreakdown": {
    "drive_time_nms_suppressed": 12,
    "regional_cap_exceeded": 8,
    "validation_failed": 5
  }
}
```

### **Analysis Capabilities**
- **Top Performer Analysis**: Why did top candidates score highest?
- **Rejection Pattern Analysis**: What causes most rejections?
- **Score Distribution**: Are weights balanced across factors?
- **Selection Efficiency**: How many top candidates make it through?

## 💾 **Scenario Persistence - Full Reproducibility**

### **Saved Scenario Metadata**
```typescript
{
  id: "scenario_aGVybWFueV8x",
  name: "Germany Expansion 2024-11-01",
  createdAt: "2024-11-01T10:30:00Z",
  
  // Complete parameter snapshot
  parameters: {
    region: { country: "Germany" },
    weights: {
      population: 0.25,
      gap: 0.35, 
      anchor: 0.20,
      performance: 0.20,
      saturation: 0.15
    },
    mixRatio: {
      settlement: 0.7,
      h3Explore: 0.3
    },
    popMin: 1000,
    seed: 12345,
    targetCount: 100,
    enableDiagnostics: true
  },
  
  // Data version tracking
  dataVersions: {
    osm: "mock-v1.0",
    demographic: "census-2023", 
    stores: "db-current",
    osmSnapshotDate: "2024-11-01"
  },
  
  // Results summary
  results: {
    suggestionCount: 87,
    acceptanceRate: 43.5,
    generationTimeMs: 12500,
    avgConfidence: 0.72
  }
}
```

### **Reproducibility Features**
- **Parameter Freezing**: Exact weights, ratios, and thresholds saved
- **Data Version Pinning**: OSM snapshot date ensures consistent base data
- **Seed Preservation**: Deterministic random generation
- **Environment Capture**: All relevant configuration saved

## 🔄 **Operational Benefits**

### **1. A/B Testing Framework**
```typescript
// Compare two scenarios
const comparison = await scenarioPersistence.compareScenarios(
  "scenario_baseline_v1", 
  "scenario_tuned_v2"
);

console.log(comparison.significantChanges);
// ["Acceptance rate changed significantly", "Average confidence improved"]
```

### **2. Parameter Optimization**
```bash
# Test different weight configurations
EXPANSION_WEIGHT_GAP=0.40 EXPANSION_WEIGHT_POPULATION=0.20 npm run expansion
EXPANSION_WEIGHT_GAP=0.30 EXPANSION_WEIGHT_POPULATION=0.30 npm run expansion

# Compare results via scenario persistence
```

### **3. Quality Assurance**
```typescript
// Verify input data quality via diagnostics
suggestions.forEach(s => {
  if (s.diagnostics.inputs.population < 1000) {
    console.warn(`Low population: ${s.settlementName}`);
  }
  if (s.diagnostics.inputs.nearest3Distances[0] > 50) {
    console.warn(`Very isolated: ${s.settlementName}`);
  }
});
```

### **4. Business Intelligence**
```typescript
// Extract market insights from diagnostics
const highPerformers = suggestions.filter(s => 
  s.diagnostics?.normalizedScores.performanceScore > 0.8
);

const underservedAreas = suggestions.filter(s =>
  s.diagnostics?.normalizedScores.gapScore > 0.7
);
```

## 📈 **Configuration & Usage**

### **Environment Variables**
```bash
# Enable diagnostics (detailed scoring breakdown)
EXPANSION_ENABLE_DIAGNOSTICS=true

# Data version tracking
EXPANSION_OSM_SNAPSHOT_DATE=2024-11-01
EXPANSION_OSM_VERSION=mock-v1.0
EXPANSION_DEMOGRAPHIC_VERSION=census-2023
EXPANSION_STORES_VERSION=db-current
```

### **API Usage**
```typescript
// Generate with diagnostics
const result = await expansionService.generate({
  region: { country: 'Germany' },
  seed: 12345,
  targetCount: 100,
  enableDiagnostics: true  // 🔍 Enable detailed breakdown
});

// Access diagnostics
result.suggestions.forEach(suggestion => {
  if (suggestion.diagnostics) {
    console.log(`${suggestion.settlementName}:`, {
      population: suggestion.diagnostics.inputs.population,
      finalScore: suggestion.diagnostics.finalScore,
      topFactor: getTopScoringFactor(suggestion.diagnostics.normalizedScores)
    });
  }
});

// Access generation profile
console.log('Top 10 candidates:', result.metadata.generationProfile.top50Candidates.slice(0, 10));
console.log('Rejection reasons:', result.metadata.generationProfile.rejectionBreakdown);
```

### **Scenario Management**
```typescript
// Save scenario
const scenarioId = await scenarioPersistence.saveScenario(
  'custom_scenario_id',
  params,
  result,
  'Production Germany Expansion',
  'Optimized weights for Q4 2024'
);

// Load and re-run
const savedScenario = await scenarioPersistence.loadScenario(scenarioId);
const rerunResult = await expansionService.generate(savedScenario.parameters);

// Export for analysis
const csvData = await scenarioPersistence.exportScenario(scenarioId, 'csv');
```

## 🧪 **Testing & Validation**

### **Test Script**
```bash
node test-diagnostics-persistence.mjs
```

**Validates:**
- Diagnostics data generation with real inputs
- Scenario persistence and parameter capture
- Generation profile creation and analysis
- CSV export functionality
- Reproducible scenario ID generation

### **Expected Output**
```
✅ Sample diagnostics generated:
   Inputs: { population: 3669491, nearest3Distances: [15.2, 18.7, 22.1], ... }
   Normalized Scores: { populationScore: 0.89, gapScore: 0.76, ... }
   Final Score: 0.847

✅ Scenario saved successfully
   Scenario ID: scenario_aGVybWFueV8x
   OSM Snapshot: 2024-11-01
```

## 🎯 **Production Impact**

### **Before (Black Box)**
```
"Berlin shows potential based on balanced market conditions"
- No visibility into scoring factors
- No reproducibility across runs
- No systematic comparison capability
```

### **After (Full Transparency)**
```
"Berlin (city) shows strong expansion potential. Population: 3.67M residents, 
Gap score: 0.76 (15.2km to nearest store), Anchor score: 0.90 (18 POIs), 
Performance score: 0.83 ($825k avg turnover). Final score: 0.847"

+ Complete diagnostic breakdown available
+ Scenario saved for reproducibility  
+ Generation profile logged for analysis
+ A/B testing framework ready
```

### **Operational Readiness**
- ✅ **Transparency**: Every scoring decision is explainable
- ✅ **Reproducibility**: Scenarios can be re-run identically
- ✅ **Optimization**: Parameter tuning with measurable impact
- ✅ **Quality Assurance**: Input validation and anomaly detection
- ✅ **Business Intelligence**: Quantified market factor analysis
- ✅ **Compliance**: Full audit trail of expansion decisions

This system transforms expansion generation from a "black box" algorithm into a **fully transparent, reproducible, and optimizable business intelligence platform** with complete operational visibility.