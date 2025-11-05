# Subway Expansion Predictor

An intelligent system that generates AI-driven store expansion recommendations based on spatial density, store performance, and population data.

## Features

- **AI-Driven Recommendations**: Multi-factor scoring algorithm combining population density, proximity gaps, and turnover potential
- **Deterministic Results**: Seed-based generation ensures identical inputs produce identical outputs
- **Scenario Management**: Save, load, and refresh expansion scenarios for comparison
- **Transparent Rationales**: Every recommendation includes detailed explanations with factor breakdowns
- **Performance Optimized**: Handles 30k+ stores with efficient spatial algorithms
- **Cost Controlled**: Minimizes Mapbox API usage through server-side processing

## Quick Start

### 1. Environment Setup

Copy the required environment variables to your `.env.local` file:

```bash
# Feature Flag
NEXT_PUBLIC_FEATURE_EXPANSION_PREDICTOR=true

# Mapbox Tokens
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-public-token
MAPBOX_SECRET_TOKEN=sk.your-secret-token

# Mapbox Access Token (Optional - for urban suitability filtering)
MAPBOX_ACCESS_TOKEN=pk.your-mapbox-access-token

# OpenAI API Key (Optional - for AI-generated rationales)
OPENAI_API_KEY=sk-your-openai-key

# Rate Limiting (optional)
EXPANSION_RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
EXPANSION_RATE_LIMIT_MAX=10            # 10 requests per window

# Urban Suitability Filtering Thresholds (optional)
EXPANSION_MAX_ROAD_DISTANCE_M=1000        # Max distance from road (default: 1000m)
EXPANSION_MAX_BUILDING_DISTANCE_M=800     # Max distance from building (default: 800m)
EXPANSION_TILEQUERY_RADIUS_M=500          # Mapbox search radius (default: 500m)

# Dynamic Expansion Settings (optional)
EXPANSION_TARGET_MIN_SUGGESTIONS=50       # Minimum suggestions to generate (default: 50)
EXPANSION_MAX_TOTAL_CANDIDATES=2000       # Max candidates to evaluate (default: 2000)
EXPANSION_TIMEOUT_MS=15000                # Generation timeout (default: 15000ms)
EXPANSION_MAX_CANDIDATES=300              # Initial candidate pool size (default: 300)
```

### 2. Database Migration

Run the Prisma migration to create the required tables:

```bash
pnpm -C packages/db prisma migrate dev
```

This creates:
- `ExpansionScenario` table
- `ExpansionSuggestion` table
- Adds optional fields to `Store` table (annualTurnover, openedAt, cityPopulationBand)

### 3. Start the Application

```bash
pnpm dev
```

Navigate to `/stores/map` and click "Enable Expansion Mode".

## Usage

### Generating Suggestions

1. **Enable Expansion Mode**: Click the toggle button at the top of the map
2. **Configure Parameters**:
   - **Region**: Select country or define bounding box
   - **Aggression** (0-100): Controls how many suggestions to generate
   - **Population Bias** (0-1): Weight for population density (default: 0.5)
   - **Proximity Bias** (0-1): Weight for distance from existing stores (default: 0.3)
   - **Turnover Bias** (0-1): Weight for nearby store performance (default: 0.2)
   - **Minimum Distance**: Minimum spacing between suggestions in meters (default: 800)
3. **Click Generate**: Wait for suggestions to appear on the map

### Understanding Suggestions

Each suggestion is color-coded by confidence:
- 🟢 **Teal (HIGH)**: High confidence (≥70%) - Strong recommendation
- 🟣 **Purple (MEDIUM)**: Medium confidence (50-70%) - Moderate potential
- 🟤 **Brown (LOW)**: Low confidence (30-50%) - Requires validation
- ⚫ **Black (INSUFFICIENT_DATA)**: <30% confidence - Limited data

Click any marker to see the "Why here?" card with:
- Confidence score
- Distance to nearest store
- Factor breakdown (population, proximity, turnover)
- AI-generated rationale
- Action buttons (Approve/Review/Reject)

### Managing Scenarios

**Save a Scenario**:
1. Generate suggestions
2. Click "Save Scenario"
3. Enter a descriptive label (e.g., "Germany_2025_Agg60")
4. Click Save

**Load a Scenario**:
1. Select from the "Load Scenario" dropdown
2. Previous suggestions and parameters are restored

**Refresh a Scenario**:
1. Load a saved scenario
2. Click "Refresh Scenario"
3. Suggestions are regenerated with current store data

## API Endpoints

### POST /api/expansion/generate
Generate expansion suggestions.

**Request**:
```json
{
  "region": { "country": "Germany" },
  "aggression": 60,
  "populationBias": 0.5,
  "proximityBias": 0.3,
  "turnoverBias": 0.2,
  "minDistanceM": 800,
  "seed": 20251029
}
```

**Response**:
```json
{
  "suggestions": [
    {
      "lat": 52.5200,
      "lng": 13.4050,
      "confidence": 0.85,
      "band": "HIGH",
      "rationale": {
        "population": 0.9,
        "proximityGap": 0.8,
        "turnoverGap": 0.85,
        "notes": "strong population density, underserved area"
      },
      "rationaleText": "This location shows strong potential...",
      "urbanDensityIndex": 0.75,
      "roadDistanceM": 120,
      "buildingDistanceM": 45,
      "landuseType": "residential",
      "mapboxValidated": true
    }
  ],
  "metadata": {
    "totalCellsScored": 1250,
    "avgConfidence": 0.72,
    "generationTimeMs": 3450,
    "dataVersion": "2025-10-29T13:00:00.000Z",
    "seed": 20251029,
    "expansionStats": {
      "iterations": 3,
      "totalEvaluated": 250,
      "totalAccepted": 75,
      "totalRejected": 175,
      "acceptanceRate": 30,
      "timeoutReached": false,
      "maxCandidatesReached": false
    },
    "rejectionReasons": {
      "excluded_landuse": 12,
      "no_road": 45,
      "no_building": 78,
      "no_valid_landuse": 40,
      "low_density": 0
    },
    "featuresEnabled": {
      "mapboxFiltering": true,
      "aiRationale": true
    }
  }
}
```

### POST /api/expansion/scenarios
Save a scenario.

**Request**:
```json
{
  "label": "Germany_2025_Agg60",
  "regionFilter": { "country": "Germany" },
  "aggressionLevel": 60,
  "populationBias": 0.5,
  "proximityBias": 0.3,
  "turnoverBias": 0.2,
  "minDistanceM": 800,
  "seed": 20251029,
  "suggestions": [...]
}
```

### GET /api/expansion/scenarios/:id
Load a saved scenario.

### POST /api/expansion/scenarios/:id/refresh
Refresh a scenario with current data.

### PATCH /api/expansion/suggestions/:id/status
Update suggestion status (APPROVED, REJECTED, REVIEWED).

### GET /api/expansion/scenarios
List all scenarios with pagination.

## Algorithm Details

### Spatial Analysis

The system uses an adaptive hexagonal grid overlay for spatial analysis:

1. **Adaptive Grid Sizing**: Cell size adjusts based on store density:
   - **Very sparse** (<0.01 stores/km²): 5000m cells
   - **Sparse** (0.01-0.1 stores/km²): 2000m cells
   - **Moderate** (0.1-1 stores/km²): 1000m cells
   - **Dense** (>1 store/km²): 500m cells

2. **Multi-Factor Scoring**: Each cell receives scores for:
   - **Population**: Based on city population bands (large/medium/small)
   - **Proximity**: Distance to nearest existing store (sigmoid curve)
   - **Turnover**: Average performance of nearby stores (within 10km)

3. **Weighted Combination**: `score = w_pop × pop + w_prox × prox + w_turn × turn`

4. **Non-Maximum Suppression**: Enforces minimum distance between suggestions

5. **Confidence Computation**: `confidence = score × data_completeness`

### Dynamic Candidate Pool Expansion

The system dynamically expands the candidate pool until sufficient valid suggestions are found:

1. **Initial Batch**: Evaluates first 100 candidates
2. **Iterative Expansion**: If target not met, expands batch size by 50% and continues
3. **Performance Safeguards**:
   - **Max candidates**: 2000 (configurable via `EXPANSION_MAX_TOTAL_CANDIDATES`)
   - **Timeout**: 15 seconds (configurable via `EXPANSION_TIMEOUT_MS`)
4. **Detailed Logging**: Tracks acceptance rates and rejection reasons at each iteration

### Urban Suitability Filtering

When Mapbox is enabled, candidates are validated for urban suitability:

**Acceptance Criteria** (relaxed for large areas):
- Has valid landuse (residential, commercial, retail, industrial), OR
- Has road (including tertiary/residential) AND (building OR populated place), OR
- Has populated place (city, town, village, hamlet)

**Hard Rejections**:
- Farmland, forest, water, wetland, or park landuse

**Configurable Thresholds**:
- Road distance: 1000m (default)
- Building distance: 800m (default)
- Search radius: 500m (default)

### Determinism

All generation is deterministic using seed-based random number generation:
- Same seed + same parameters = identical results
- Enables reproducible analysis and A/B testing
- Supports scenario comparison and auditing
- Note: Dynamic expansion may produce different results if store data changes between runs

## Performance Considerations

- **Marker Clustering**: Handles 30k+ stores efficiently
- **Lazy Loading**: Loads stores only for visible region
- **Server-Side Processing**: All heavy computation on backend
- **Database Indexing**: Optimized queries for spatial operations
- **Caching**: Rationale caching reduces OpenAI API calls

## Cost Control

### Mapbox Usage
- **1 map load per page view**: No reloads on mode toggle or generation
- **Client-side tiles only**: Public token for map rendering
- **Server-side geocoding**: Secret token for API calls (minimal usage)

### OpenAI Usage
- **Rate limiting**: Max 100 requests per hour
- **Fallback templates**: Automatic fallback if API fails
- **Caching**: Location-based rationale caching

## Troubleshooting

### No suggestions generated
- **Check store data**: Verify stores exist in the selected region with valid coordinates
- **Review rejection stats**: Check `metadata.rejectionReasons` in API response to see why candidates were rejected
- **Adjust filtering thresholds**: Increase `EXPANSION_MAX_ROAD_DISTANCE_M` or `EXPANSION_MAX_BUILDING_DISTANCE_M` for sparse areas
- **Disable Mapbox filtering**: Set `enableMapboxFiltering: false` in request to skip urban suitability checks
- **Increase timeout**: Set `EXPANSION_TIMEOUT_MS` higher for large regions
- **Check logs**: Review server logs for detailed rejection reasons and iteration stats

### Low acceptance rate (<20%)
- **Relax filtering criteria**: Increase distance thresholds in environment variables
- **Check Mapbox data**: Verify Mapbox has good coverage for your region
- **Review rejection reasons**: Use `metadata.rejectionReasons` to identify main rejection causes
- **Disable strict filtering**: Consider disabling Mapbox filtering for very sparse areas

### Timeout reached
- **Reduce region size**: Use smaller bounding boxes or more specific country/state filters
- **Increase timeout**: Set `EXPANSION_TIMEOUT_MS` higher (e.g., 30000 for 30 seconds)
- **Increase max candidates**: Set `EXPANSION_MAX_TOTAL_CANDIDATES` higher to allow more evaluations
- **Check store density**: Very sparse areas may need larger grid cells (automatic)

### Low confidence suggestions
- **Add store performance data**: Populate `annualTurnover` field for existing stores
- **Add population data**: Populate `cityPopulationBand` field for existing stores
- **Adjust bias weights**: Emphasize factors with better data availability
- **Review data completeness**: Check `metadata.avgConfidence` and individual suggestion confidence scores

### Rate limit errors
- **Wait for reset**: Rate limit window is 15 minutes by default
- **Adjust limits**: Increase `EXPANSION_RATE_LIMIT_MAX` in environment
- **Optimize requests**: Save scenarios to avoid regenerating identical results

### Mapbox errors
- **Verify token**: Check `MAPBOX_ACCESS_TOKEN` is set correctly
- **Check quota**: Verify Mapbox account has available API calls
- **Graceful degradation**: System will continue without Mapbox if API fails
- **Review cache**: Check `metadata.cacheHitRate` - low rates indicate many new API calls

### OpenAI errors
- **Verify API key**: Check `OPENAI_API_KEY` is set correctly
- **Check credits**: Verify OpenAI account has available credits
- **Fallback behavior**: System will use template rationales if OpenAI fails
- **Optional feature**: AI rationales are opt-in, set `enableAIRationale: true` in request

## Development

### Running Tests
```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e
```

### Database Schema
```bash
# Generate Prisma client
pnpm -C packages/db prisma generate

# Create migration
pnpm -C packages/db prisma migrate dev --name your_migration_name

# Reset database
pnpm -C packages/db prisma migrate reset
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API logs for error details
3. Verify environment configuration
4. Contact the development team

## License

Proprietary - Subway Enterprise
