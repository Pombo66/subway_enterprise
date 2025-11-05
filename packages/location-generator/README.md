# National Store Location Generator

A deterministic, cost-effective system for generating nationally comprehensive and fair Subway store location recommendations for any specified country. The system prioritizes correctness, coverage, and cost control while minimizing AI usage through caching and bounded operations.

## Features

### 🎯 Core Capabilities
- **Deterministic Results**: Identical outputs for same inputs with reproducibility hashing
- **Country-Agnostic**: Works with any country given proper boundary and demographic data
- **Multi-Factor Scoring**: Population, gap analysis, anchor points, performance, and saturation
- **Fairness Constraints**: Population-weighted regional distribution with configurable limits
- **Spacing Validation**: Configurable minimum distance between locations
- **Data Quality Handling**: Graceful handling of estimated/sparse data with quality scoring

### 🤖 AI Integration (Optional)
- **Cost-Controlled**: Strict 20k token budget with intelligent caching
- **Tiered Usage**: L0=Off, L1=Explanations, L2=Policy, L3=Learning
- **Scenario Policies**: AI-powered weight adjustment for Defend/Balanced/Blitz modes
- **Site Rationales**: Executive-grade explanations with counterfactual analysis
- **Portfolio Narratives**: Board-ready summaries with KPI analysis

### ⚡ Performance Optimizations
- **H3 Hexagonal Indexing**: Efficient geospatial operations
- **Windowed Refinement**: Detailed analysis only on promising candidates
- **Spatial Indexing**: Fast neighbor queries and constraint validation
- **Aggressive Caching**: 24-hour cache for AI results and expensive computations

## Installation

```bash
npm install @subway/location-generator
# or
pnpm add @subway/location-generator
```

## Quick Start

```typescript
import { LocationGeneratorAPI } from '@subway/location-generator';

const api = new LocationGeneratorAPI();

const request = {
  country: {
    countryCode: 'DE',
    boundary: { /* GeoJSON Polygon */ },
    administrativeRegions: [/* regions */],
    majorMetropolitanAreas: ['Berlin', 'Munich'],
    maxRegionShare: 0.4
  },
  existingStores: [/* current stores */],
  populationData: {
    cells: [/* population grid */],
    resolution: 8,
    dataSource: 'census-2023'
  },
  config: {
    targetK: 50,
    minSpacingM: 800,
    gridResolution: 8,
    weights: {
      population: 0.25,
      gap: 0.35,
      anchor: 0.20,
      performance: 0.20,
      saturation: 0.15
    },
    enableAI: false
  }
};

const result = await api.generateLocations(request);
console.log(`Generated ${result.sites.length} recommendations`);
```

## Architecture

### Pipeline Stages

1. **Grid Generation**: H3 hexagonal grid covering target country
2. **National Sweep**: Basic feature computation for all cells
3. **Shortlisting**: Top 1-3% nationally + regional fairness selection
4. **Windowed Refinement**: Detailed analysis on promising candidates
5. **Scoring & Ranking**: Multi-factor weighted scoring
6. **Constraint Validation**: Spacing and fairness enforcement
7. **Portfolio Building**: Greedy selection with optimization
8. **AI Enhancement**: Optional rationales and insights

### Service Architecture

```
LocationGenerator (Orchestrator)
├── GridService (H3 operations)
├── FeatureService (Population, competition, anchors)
├── ScoringService (Multi-factor scoring)
├── ConstraintService (Spacing, fairness, quality)
├── ShortlistService (National + regional selection)
├── RefinementService (Windowed processing)
├── PortfolioService (Greedy optimization)
└── AIService (Optional enhancements)
```

## Configuration

### Scoring Weights (Default)
```typescript
{
  population: 0.25,    // Population density weight
  gap: 0.35,          // Coverage gap weight (highest)
  anchor: 0.20,       // Anchor points weight
  performance: 0.20,  // Performance proxy weight
  saturation: 0.15    // Market saturation penalty
}
```

### Constraint Defaults
```typescript
{
  MIN_SPACING_M: 800,           // Minimum spacing between stores
  MAX_REGION_SHARE: 0.4,        // Maximum 40% per region
  MIN_COMPLETENESS: 0.5,        // Minimum data completeness
  MIN_ACCEPTANCE_RATE: 0.15,    // Minimum 15% acceptance rate
  MAX_ANCHORS_PER_SITE: 25      // Maximum anchors for scoring
}
```

### AI Configuration
```typescript
{
  enabled: false,               // AI disabled by default
  level: 'L0',                 // Usage level (L0-L3)
  model: 'gpt-4o-mini',        // Cost-optimized model
  maxTokens: 20000,            // Strict budget limit
  cacheTTL: 24                 // 24-hour cache
}
```

## Data Requirements

### Required Inputs
- **Country Boundary**: GeoJSON Polygon
- **Administrative Regions**: First-level divisions with populations
- **Existing Stores**: Current brand locations
- **Population Data**: Gridded demographic data

### Optional Inputs
- **Competitors**: Competitor store locations
- **Anchor Points**: POIs (malls, stations, grocers, retail)
- **Travel-Time Data**: Cached isochrone analysis

## Output Format

```typescript
{
  sites: [
    {
      id: "site_abc123",
      lat: 52.52,
      lng: 13.405,
      administrativeRegion: "BE",
      features: {
        population: 62000,
        nearestBrandKm: 18.7,
        competitorDensity: 0.12,
        anchors: { raw: 15, deduplicated: 12, diminishingScore: 6.9 }
      },
      scores: {
        population: 0.62,
        gap: 0.84,
        anchor: 0.78,
        performance: 0.50,
        final: 0.807
      },
      dataQuality: { completeness: 0.72, estimated: {...} },
      constraints: { spacingOk: true, stateShareOk: true },
      status: "SELECTED"
    }
  ],
  portfolio: {
    selectedCount: 50,
    rejectedCount: 1250,
    stateDistribution: {...},
    acceptanceRate: 0.038
  },
  diagnostics: {
    weightsUsed: {...},
    scoringDistribution: {...},
    rejectionBreakdown: {...}
  },
  reproducibility: {
    seed: "abc123",
    dataVersions: {...},
    scenarioHash: "xyz789"
  }
}
```

## Performance Targets

- **Processing Time**: <10 minutes for 300 locations
- **Memory Usage**: <4GB peak for largest countries
- **Reproducibility**: 100% deterministic with same inputs
- **Acceptance Rate**: >15% with quality gates
- **AI Cost**: <$0.50 per run with caching

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test --coverage

# Run specific test suite
pnpm test GridService

# Type checking
pnpm typecheck

# Build
pnpm build
```

## Examples

See the `examples/` directory for:
- Basic usage with sample data
- Advanced configuration options
- AI-powered enhancements
- Custom scoring weights
- Multi-country analysis

## API Reference

### LocationGeneratorAPI

#### `generateLocations(request: GenerationRequest): Promise<GenerationResult>`
Main method for generating store locations.

#### `getHealthStatus(): Promise<HealthStatus>`
Check system health and service availability.

#### `getCapabilities(): Capabilities`
Get system capabilities and configuration limits.

## Contributing

1. Follow TypeScript best practices
2. Maintain test coverage >90%
3. Update documentation for API changes
4. Validate against requirements before PR

## License

MIT License - see LICENSE file for details.

## Support

For technical support or questions:
- Create an issue in the repository
- Check the examples directory
- Review the test files for usage patterns

---

Built with ❤️ for intelligent location planning.