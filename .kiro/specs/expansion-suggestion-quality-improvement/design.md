# Design Document

## Overview

This design addresses critical quality and performance issues in the Expansion Suggestion Generation system. The improvements span five key areas: (1) UI marker visualization with teal color for AI suggestions, (2) geographic validation with land polygon and coastline buffering, (3) infrastructure snapping to roads and buildings, (4) mandatory OpenAI rationale generation with proper error handling, and (5) progressive batching with H3 tiling for better geographic distribution and performance.

The system currently generates suggestions using hexagonal grid scoring, Mapbox urban suitability filtering, and optional OpenAI rationale generation. The new design enhances this pipeline with stricter validation, better geographic distribution, and improved user experience through clearer visual indicators.

## Architecture

### High-Level Flow

```
User Request
    ↓
API Route (/api/expansion/generate)
    ↓
ExpansionGenerationService
    ↓
┌─────────────────────────────────────────────────────┐
│ 1. Load Stores & Compute Bounds                     │
│ 2. H3 Hexagonal Tiling (Resolution 6-7)            │
│ 3. Score Cells (Population, Proximity, Turnover)   │
│ 4. Progressive Batching (200→400→800→2000)         │
│    ├─ Land Polygon Validation                       │
│    ├─ Coastline Buffer Check (300m)                 │
│    ├─ Road/Building Snapping (1.5km)                │
│    └─ Yield Results to UI                           │
│ 5. OpenAI Rationale Generation (Mandatory)         │
│ 6. Apply NMS & Final Filtering                     │
└─────────────────────────────────────────────────────┘
    ↓
Return Suggestions with Metadata
    ↓
UI Renders Teal Markers (#06b6d4)
```

### Component Responsibilities

#### 1. ExpansionGenerationService
- Orchestrates the entire generation pipeline
- Implements H3 tiling for geographic distribution
- Manages progressive batching with early yield
- Coordinates validation and snapping services
- Enforces OpenAI rationale generation

#### 2. MapboxTilequeryService (Enhanced)
- Validates land polygon membership
- Checks coastline buffer (300m minimum)
- Performs road/building snapping within 1.5km
- Caches all Mapbox API responses (90 days)
- Tracks rejection reasons for debugging

#### 3. LandValidationService (New)
- Queries Mapbox land layer or Natural Earth dataset
- Determines if coordinates are on land vs water
- Calculates distance to nearest coastline
- Caches land validation results (90 days)

#### 4. SnappingService (New)
- Finds nearest road within 1.5km (tertiary+)
- Finds nearest building within 1.5km (any type)
- Snaps candidate to closest feature
- Rejects if no snap target found
- Logs snap distance and feature type

#### 5. OpenAIRationaleService (Enhanced)
- Mandatory rationale generation for all candidates
- Uses gpt-4o-mini with temperature 0.2
- Handles missing data with "unknown" flags
- Caches responses for 90 days
- Rejects candidates on API errors (no fallback)

#### 6. H3TilingService (New)
- Generates H3 hexagons at resolution 6-7
- Samples fixed count per tile for distribution
- Prevents clustering in single geographic stripe
- Adjusts resolution based on region size

#### 7. UI Components (Enhanced)
- ExpansionControls: Updated legend with teal color
- Map markers: Render AI suggestions in teal (#06b6d4)
- SuggestionPopover: Display validation metadata

## Components and Interfaces

### 1. H3TilingService

```typescript
export interface H3TileConfig {
  resolution: number; // 6 or 7
  samplesPerTile: number; // Fixed count per tile
  bounds: BoundingBox;
}

export interface H3Tile {
  h3Index: string;
  center: [number, number];
  bounds: GeoJSON.Polygon;
}

export class H3TilingService {
  /**
   * Generate H3 tiles for a region
   * Resolution 6: ~36 km² per hex
   * Resolution 7: ~5 km² per hex
   */
  generateTiles(config: H3TileConfig): H3Tile[];
  
  /**
   * Sample candidates evenly across tiles
   * Prevents clustering in one area
   */
  sampleCandidatesPerTile(
    tiles: H3Tile[],
    candidates: ScoredCell[],
    samplesPerTile: number
  ): ScoredCell[];
  
  /**
   * Determine optimal resolution based on region size
   * Larger regions use lower resolution for broader coverage
   */
  determineResolution(areaKm2: number, storeCount: number): number;
}
```

### 2. LandValidationService

```typescript
export interface LandValidationResult {
  isOnLand: boolean;
  distanceToCoastM: number | null;
  landPolygonId: string | null;
  rejectionReason?: 'in_water' | 'too_close_to_coast';
}

export class LandValidationService {
  private readonly COASTLINE_BUFFER_M = 300;
  private readonly CACHE_TTL_DAYS = 90;
  
  /**
   * Validate that coordinates are on land and away from coast
   * Uses Mapbox land layer or Natural Earth dataset
   */
  async validateLand(lat: number, lng: number): Promise<LandValidationResult>;
  
  /**
   * Query Mapbox land layer for polygon membership
   */
  private async queryLandPolygon(lat: number, lng: number): Promise<boolean>;
  
  /**
   * Calculate distance to nearest coastline
   * Uses Mapbox coastline features
   */
  private async calculateCoastlineDistance(
    lat: number,
    lng: number
  ): Promise<number | null>;
  
  /**
   * Cache land validation results
   */
  private async cacheResult(
    hash: string,
    result: LandValidationResult
  ): Promise<void>;
}
```

### 3. SnappingService

```typescript
export interface SnapTarget {
  type: 'road' | 'building';
  feature: MapboxFeature;
  distanceM: number;
  snappedLat: number;
  snappedLng: number;
  roadClass?: string; // For roads: motorway, trunk, primary, etc.
  buildingType?: string; // For buildings: residential, commercial, etc.
}

export interface SnappingResult {
  success: boolean;
  originalLat: number;
  originalLng: number;
  snappedLat?: number;
  snappedLng?: number;
  snapTarget?: SnapTarget;
  rejectionReason?: 'no_snap_target';
}

export class SnappingService {
  private readonly MAX_SNAP_DISTANCE_M = 1500;
  private readonly ACCEPTED_ROAD_TYPES = [
    'motorway', 'trunk', 'primary', 'secondary',
    'tertiary', 'residential'
  ];
  
  /**
   * Snap candidate to nearest road or building
   * Accepts tertiary+ roads and any building type
   * Rejects if no target within 1.5km
   */
  async snapToInfrastructure(
    lat: number,
    lng: number
  ): Promise<SnappingResult>;
  
  /**
   * Find nearest road within max distance
   */
  private async findNearestRoad(
    lat: number,
    lng: number
  ): Promise<SnapTarget | null>;
  
  /**
   * Find nearest building within max distance
   */
  private async findNearestBuilding(
    lat: number,
    lng: number
  ): Promise<SnapTarget | null>;
  
  /**
   * Calculate snap point on road centerline or building centroid
   */
  private calculateSnapPoint(
    lat: number,
    lng: number,
    feature: MapboxFeature
  ): [number, number];
}
```

### 4. Enhanced OpenAIRationaleService

```typescript
export interface RationaleInput {
  lat: number;
  lng: number;
  populationScore: number;
  proximityScore: number;
  turnoverScore: number;
  nearestStoreKm: number | 'unknown';
  tradeAreaPopulation: number | 'unknown';
  proximityGapPercentile: number | 'unknown';
  turnoverPercentile: number | 'unknown';
  urbanDensity?: number | null;
  roadDistance?: number | null;
  buildingDistance?: number | null;
  snapTarget?: SnapTarget;
}

export interface RationaleOutput {
  text: string;
  factors: {
    population: string;
    proximity: string;
    turnover: string;
  };
  confidence: number;
  dataCompleteness: number;
}

export class OpenAIRationaleService {
  private readonly MODEL = 'gpt-4o-mini';
  private readonly TEMPERATURE = 0.2;
  private readonly CACHE_TTL_DAYS = 90;
  
  /**
   * Generate rationale for expansion suggestion
   * MANDATORY - no fallback on error
   * Uses "unknown" flags for missing data instead of skipping
   */
  async generateRationale(input: RationaleInput): Promise<RationaleOutput>;
  
  /**
   * Build prompt with factor-based analysis
   * Includes "unknown" flags for missing data
   */
  private buildPrompt(input: RationaleInput): string;
  
  /**
   * Parse OpenAI response into structured output
   */
  private parseResponse(response: string): RationaleOutput;
  
  /**
   * Cache rationale based on input parameter hash
   */
  private async cacheRationale(
    hash: string,
    output: RationaleOutput
  ): Promise<void>;
}
```

### 5. Enhanced ExpansionGenerationService

```typescript
export interface ProgressiveBatchConfig {
  batchSizes: number[]; // [200, 400, 800, 2000]
  targetMin: number; // 50
  targetMax: number; // 150
  timeoutMs: number; // 15000
  nmsMinDistanceM: number; // 800-1200
}

export interface BatchYieldResult {
  suggestions: ExpansionSuggestionData[];
  batchNumber: number;
  totalEvaluated: number;
  totalAccepted: number;
  isComplete: boolean;
}

export class ExpansionGenerationService {
  private h3Service: H3TilingService;
  private landService: LandValidationService;
  private snappingService: SnappingService;
  private mapboxService: MapboxTilequeryService;
  private openaiService: OpenAIRationaleService;
  
  /**
   * Generate expansion suggestions with progressive batching
   * Yields results after each batch for UI responsiveness
   */
  async *generateProgressive(
    params: GenerationParams
  ): AsyncGenerator<BatchYieldResult>;
  
  /**
   * Process single batch with full validation pipeline
   */
  private async processBatch(
    candidates: ScoredCell[],
    batchSize: number
  ): Promise<{
    accepted: ScoredCell[];
    rejected: ScoredCell[];
    rejectionReasons: Map<string, number>;
  }>;
  
  /**
   * Validate candidate through full pipeline
   * 1. Land polygon check
   * 2. Coastline buffer check
   * 3. Road/building snapping
   * 4. OpenAI rationale generation
   */
  private async validateCandidate(
    candidate: ScoredCell
  ): Promise<{
    valid: boolean;
    enhanced?: ScoredCell;
    rejectionReason?: string;
  }>;
  
  /**
   * Generate H3 tiles and sample candidates
   */
  private generateH3Candidates(
    stores: Store[],
    bounds: BoundingBox,
    params: GenerationParams
  ): ScoredCell[];
}
```

## Data Models

### Enhanced ExpansionSuggestionData

```typescript
export interface ExpansionSuggestionData {
  // Existing fields
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
  band: ConfidenceBand;
  
  // Enhanced validation metadata
  validation: {
    isOnLand: boolean;
    distanceToCoastM: number | null;
    snapTarget: SnapTarget | null;
    originalLat: number;
    originalLng: number;
  };
  
  // Mapbox data
  urbanDensityIndex?: number | null;
  roadDistanceM?: number | null;
  buildingDistanceM?: number | null;
  landuseType?: string | null;
  mapboxValidated: boolean;
  
  // OpenAI data
  aiRationale: {
    text: string;
    factors: {
      population: string;
      proximity: string;
      turnover: string;
    };
    dataCompleteness: number;
  };
}
```

### Database Schema Updates

```prisma
// New table for land validation cache
model LandValidationCache {
  id              String   @id @default(cuid())
  coordinateHash  String   @unique
  lat             Float
  lng             Float
  isOnLand        Boolean
  distanceToCoastM Float?
  landPolygonId   String?
  rawResponse     Json
  expiresAt       DateTime
  createdAt       DateTime @default(now())
  
  @@index([coordinateHash])
  @@index([expiresAt])
}

// New table for snapping cache
model SnappingCache {
  id              String   @id @default(cuid())
  coordinateHash  String   @unique
  originalLat     Float
  originalLng     Float
  snappedLat      Float?
  snappedLng      Float?
  snapTargetType  String?  // 'road' or 'building'
  snapDistanceM   Float?
  roadClass       String?
  buildingType    String?
  rawResponse     Json
  expiresAt       DateTime
  createdAt       DateTime @default(now())
  
  @@index([coordinateHash])
  @@index([expiresAt])
}

// Enhanced OpenAI rationale cache
model OpenAIRationaleCache {
  id              String   @id @default(cuid())
  inputHash       String   @unique
  lat             Float
  lng             Float
  rationaleText   String
  factors         Json     // { population, proximity, turnover }
  confidence      Float
  dataCompleteness Float
  model           String   // 'gpt-4o-mini'
  temperature     Float    // 0.2
  expiresAt       DateTime
  createdAt       DateTime @default(now())
  
  @@index([inputHash])
  @@index([expiresAt])
}
```

## Error Handling

### Validation Pipeline Errors

```typescript
export enum ValidationErrorCode {
  IN_WATER = 'in_water',
  TOO_CLOSE_TO_COAST = 'too_close_to_coast',
  NO_SNAP_TARGET = 'no_snap_target',
  OPENAI_ERROR = 'openai_error',
  MAPBOX_ERROR = 'mapbox_error',
  LAND_VALIDATION_ERROR = 'land_validation_error'
}

export class ValidationError extends Error {
  constructor(
    public code: ValidationErrorCode,
    public lat: number,
    public lng: number,
    message: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### Error Handling Strategy

1. **Land Validation Errors**: Reject candidate, log reason
2. **Coastline Buffer Errors**: Reject candidate, log reason
3. **Snapping Errors**: Reject candidate, log reason
4. **OpenAI Errors**: Reject candidate (no fallback), log error
5. **Mapbox Errors**: Graceful degradation with warning
6. **Timeout Errors**: Return partial results with metadata

### Logging Strategy

```typescript
export class ExpansionLogger {
  // Existing methods...
  
  static logLandValidationRejection(
    lat: number,
    lng: number,
    reason: 'in_water' | 'too_close_to_coast',
    distanceToCoastM?: number
  ): void;
  
  static logSnappingRejection(
    lat: number,
    lng: number,
    nearestRoadM: number | null,
    nearestBuildingM: number | null
  ): void;
  
  static logOpenAIRejection(
    lat: number,
    lng: number,
    error: Error
  ): void;
  
  static logProgressiveBatchComplete(
    batchNumber: number,
    batchSize: number,
    accepted: number,
    rejected: number,
    elapsedMs: number
  ): void;
  
  static logH3TilingStats(
    resolution: number,
    tileCount: number,
    samplesPerTile: number,
    totalCandidates: number
  ): void;
}
```

## Testing Strategy

### Unit Tests

1. **H3TilingService**
   - Test resolution selection based on area
   - Test even sampling across tiles
   - Test tile generation for various regions

2. **LandValidationService**
   - Test land vs water detection
   - Test coastline buffer calculation
   - Test cache hit/miss scenarios

3. **SnappingService**
   - Test road snapping with various road types
   - Test building snapping with various building types
   - Test rejection when no target found
   - Test snap distance calculations

4. **OpenAIRationaleService**
   - Test prompt generation with complete data
   - Test prompt generation with "unknown" flags
   - Test error handling (no fallback)
   - Test cache behavior

5. **ExpansionGenerationService**
   - Test progressive batching logic
   - Test early yield behavior
   - Test timeout handling
   - Test NMS with various distances

### Integration Tests

1. **Full Pipeline Test**
   - Generate suggestions for test region
   - Verify all validation steps executed
   - Verify OpenAI rationale generated
   - Verify teal markers rendered

2. **Progressive Batching Test**
   - Verify batches yield incrementally
   - Verify UI receives partial results
   - Verify final count within target range

3. **Cache Performance Test**
   - Verify cache hit rates > 80% on repeat runs
   - Verify cache expiration after 90 days
   - Verify cache key uniqueness

4. **Error Handling Test**
   - Test OpenAI API failure (reject candidate)
   - Test Mapbox API failure (graceful degradation)
   - Test timeout scenario (return partial results)

### E2E Tests

1. **User Workflow Test**
   - User generates expansion plan
   - Verify teal markers appear on map
   - User clicks marker, sees validation metadata
   - User sends suggestion to pipeline

2. **Performance Test**
   - Generate 150 suggestions for Germany
   - Verify completion within 15 seconds
   - Verify progressive yield to UI
   - Verify cache hit rate logged

## UI Changes

### 1. Marker Color Update

**File**: `apps/admin/app/stores/map/components/MapView.tsx`

```typescript
// Update marker rendering logic
const getMarkerColor = (suggestion: ExpansionSuggestionData): string => {
  // AI suggestions always use teal
  return '#06b6d4'; // Teal color
};

// Update marker component
<Marker
  latitude={suggestion.lat}
  longitude={suggestion.lng}
  color={getMarkerColor(suggestion)}
  onClick={() => handleMarkerClick(suggestion)}
/>
```

### 2. Legend Update

**File**: `apps/admin/app/stores/map/components/ExpansionControls.tsx`

```typescript
// Update legend in ExpansionControls
<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
  <div style={{
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    background: '#06b6d4', // Teal
    border: '2px solid white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    flexShrink: 0
  }} />
  <span style={{ fontSize: '13px', lineHeight: '1.3' }}>
    AI suggestion (NEW)
  </span>
</div>
```

### 3. Popover Enhancement

**File**: `apps/admin/app/stores/map/components/expansion/SuggestionPopover.tsx`

```typescript
// Add validation metadata section
{suggestion.validation && (
  <div className="mb-4 p-2 bg-gray-50 rounded-md">
    <h4 className="text-xs font-medium text-gray-700 mb-2">
      Validation Details
    </h4>
    <div className="space-y-1 text-xs text-gray-600">
      <div>✅ On land: {suggestion.validation.isOnLand ? 'Yes' : 'No'}</div>
      {suggestion.validation.distanceToCoastM && (
        <div>🌊 Coast distance: {suggestion.validation.distanceToCoastM}m</div>
      )}
      {suggestion.validation.snapTarget && (
        <div>
          📍 Snapped to: {suggestion.validation.snapTarget.type}
          {' '}({suggestion.validation.snapTarget.distanceM}m away)
        </div>
      )}
    </div>
  </div>
)}
```

## Performance Considerations

### 1. Progressive Batching

- **Batch sizes**: 200 → 400 → 800 → 2000
- **Early yield**: Return results after each batch
- **Timeout**: 15 seconds maximum
- **Target**: 50-150 accepted suggestions

### 2. Caching Strategy

- **Land validation**: 90-day cache
- **Snapping results**: 90-day cache
- **Mapbox tilequery**: 90-day cache (existing)
- **OpenAI rationale**: 90-day cache (existing)
- **Expected hit rate**: > 80% on repeat runs

### 3. API Call Limits

- **Mapbox**: Max 2000 calls per generation
- **OpenAI**: Max 150 calls per generation (one per accepted suggestion)
- **Land validation**: Cached, minimal new calls
- **Snapping**: Cached, minimal new calls

### 4. H3 Tiling Optimization

- **Resolution 6**: ~36 km² per hex (large regions)
- **Resolution 7**: ~5 km² per hex (medium regions)
- **Samples per tile**: Fixed count (e.g., 10-20)
- **Total candidates**: Capped at 2000

## Deployment Considerations

### Environment Variables

```bash
# Existing
MAPBOX_ACCESS_TOKEN=pk.xxx
OPENAI_API_KEY=sk-xxx

# New
EXPANSION_COASTLINE_BUFFER_M=300
EXPANSION_MAX_SNAP_DISTANCE_M=1500
EXPANSION_H3_RESOLUTION=7
EXPANSION_SAMPLES_PER_TILE=15
EXPANSION_BATCH_SIZES=200,400,800,2000
EXPANSION_TARGET_MIN=50
EXPANSION_TARGET_MAX=150
EXPANSION_NMS_MIN_DISTANCE_M=800
EXPANSION_NMS_MAX_DISTANCE_M=1200
```

### Database Migrations

```bash
# Create new cache tables
pnpm -C packages/db prisma migrate dev --name add-land-validation-cache
pnpm -C packages/db prisma migrate dev --name add-snapping-cache
pnpm -C packages/db prisma migrate dev --name enhance-openai-cache

# Generate Prisma client
pnpm -C packages/db prisma generate
```

### Feature Flags

```typescript
export interface ExpansionFeatureFlags {
  landValidation: boolean; // default: true
  coastlineBuffer: boolean; // default: true
  infrastructureSnapping: boolean; // default: true
  mandatoryOpenAI: boolean; // default: true
  h3Tiling: boolean; // default: true
  progressiveBatching: boolean; // default: true
}
```

## Rollout Plan

### Phase 1: Infrastructure (Week 1)
- Implement H3TilingService
- Implement LandValidationService
- Implement SnappingService
- Add database migrations
- Add unit tests

### Phase 2: Integration (Week 2)
- Enhance ExpansionGenerationService with progressive batching
- Integrate land validation and snapping
- Enhance OpenAIRationaleService with mandatory generation
- Add integration tests

### Phase 3: UI Updates (Week 3)
- Update marker colors to teal (#06b6d4)
- Update legend with "AI suggestion (NEW)"
- Enhance popover with validation metadata
- Add E2E tests

### Phase 4: Testing & Optimization (Week 4)
- Performance testing with large regions
- Cache hit rate optimization
- Error handling validation
- Documentation updates

### Phase 5: Deployment (Week 5)
- Deploy to staging environment
- User acceptance testing
- Monitor performance metrics
- Deploy to production with feature flags

## Success Metrics

1. **Generation Performance**
   - 50-150 suggestions generated per request
   - < 15 seconds total generation time
   - Progressive yield shows results within 3 seconds

2. **Validation Quality**
   - 0% suggestions in water
   - 0% suggestions within 300m of coastline
   - 100% suggestions snapped to infrastructure
   - 100% suggestions have OpenAI rationale

3. **Cache Performance**
   - > 80% cache hit rate on repeat runs
   - < 100ms average cache lookup time

4. **User Experience**
   - Teal markers clearly distinguish AI suggestions
   - Validation metadata visible in popover
   - Progressive loading improves perceived performance

5. **Geographic Distribution**
   - Suggestions spread across entire region
   - No clustering in single geographic stripe
   - Even coverage using H3 tiling
