# Design Document

## Overview

The Subway Expansion Predictor is an intelligent system that generates AI-driven store expansion recommendations by analyzing spatial density, store performance, and population data. The system provides a seamless user experience by integrating expansion mode into the existing Living Map interface without page reloads, while maintaining cost efficiency through server-side processing and deterministic, reproducible results.

### Key Design Principles

1. **No Map Reloads**: Toggle expansion mode and generate suggestions without triggering additional Mapbox tile loads
2. **Deterministic Results**: Identical inputs produce identical outputs through seed-based generation
3. **Transparency**: Every recommendation includes detailed rationale with factor breakdowns
4. **Performance**: Handle 30k+ stores with clustering, lazy loading, and efficient spatial algorithms
5. **Cost Control**: Minimize Mapbox API usage through server-side processing
6. **Reproducibility**: Save and restore scenarios with complete parameter and result history

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Stores Map Page (/stores/map)                         │ │
│  │  - Base map with current stores                        │ │
│  │  - Expansion mode toggle (no reload)                   │ │
│  │  - Expansion controls sidebar                          │ │
│  │  - Suggestion markers with color coding                │ │
│  │  - "Why here?" info cards                              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
                    API Routes (Next.js)
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                  Backend Services (Node/TS)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Expansion Generation Service                          │ │
│  │  - Hex grid spatial analysis                           │ │
│  │  - Multi-factor scoring                                │ │
│  │  - OpenAI integration for rationale                    │ │
│  │  - NMS for spacing enforcement                         │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Scenario Management Service                           │ │
│  │  - Save/load scenarios                                 │ │
│  │  - Refresh with current data                           │ │
│  │  - Status tracking                                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│              Database (PostgreSQL via Prisma)                │
│  - stores (existing)                                         │
│  - expansion_scenarios (new)                                 │
│  - expansion_suggestions (new)                               │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  - Mapbox (tiles, geocoding)                                 │
│  - OpenAI (rationale generation)                             │
└─────────────────────────────────────────────────────────────┘
```


## Components and Interfaces

### Frontend Components

#### 1. ExpansionMapPage Component
**Location**: `apps/admin/app/stores/map/components/ExpansionMapPage.tsx`

**Responsibilities**:
- Render Mapbox map with current stores
- Toggle expansion mode without page reload
- Display expansion controls sidebar
- Render suggestion markers with color coding
- Show "Why here?" info cards on marker click
- Manage map state (viewport, zoom, filters)

**Key State**:
```typescript
interface ExpansionMapState {
  expansionMode: boolean;
  viewport: MapViewport;
  stores: Store[];
  suggestions: ExpansionSuggestion[];
  selectedSuggestion: ExpansionSuggestion | null;
  currentScenario: ExpansionScenario | null;
  loading: boolean;
}
```

**Props**: None (page component)

#### 2. ExpansionControls Component
**Location**: `apps/admin/app/stores/map/components/ExpansionControls.tsx`

**Responsibilities**:
- Render region filter (country/state/bounding box)
- Render aggression slider (0-100)
- Render bias sliders (population, proximity, turnover)
- Render minimum distance input
- Handle generate button click
- Handle save/load scenario buttons

**Props**:
```typescript
interface ExpansionControlsProps {
  onGenerate: (params: GenerationParams) => Promise<void>;
  onSaveScenario: (label: string) => Promise<void>;
  onLoadScenario: (scenarioId: string) => Promise<void>;
  loading: boolean;
  scenarios: ExpansionScenario[];
}
```

#### 3. SuggestionMarker Component
**Location**: `apps/admin/app/stores/map/components/SuggestionMarker.tsx`

**Responsibilities**:
- Render marker with color based on confidence band
- Handle click to show info card
- Display confidence indicator

**Props**:
```typescript
interface SuggestionMarkerProps {
  suggestion: ExpansionSuggestion;
  onClick: () => void;
  selected: boolean;
}
```

#### 4. SuggestionInfoCard Component
**Location**: `apps/admin/app/stores/map/components/SuggestionInfoCard.tsx`

**Responsibilities**:
- Display confidence score
- Show distance to nearest store
- Display population density band
- Show turnover gap summary
- Render factor breakdowns
- Display rationale text
- Provide Approve/Reject/Review buttons

**Props**:
```typescript
interface SuggestionInfoCardProps {
  suggestion: ExpansionSuggestion;
  onClose: () => void;
  onStatusChange: (status: SuggestionStatus) => Promise<void>;
}
```

#### 5. MapLegend Component
**Location**: `apps/admin/app/stores/map/components/MapLegend.tsx`

**Responsibilities**:
- Display color coding explanation
- Show confidence band definitions
- Render AI attribution tooltip

**Props**: None (static display)


### Backend Services

#### 1. ExpansionGenerationService
**Location**: `apps/admin/lib/services/expansion-generation.service.ts`

**Responsibilities**:
- Load stores for target region
- Create hexagonal grid overlay
- Score each grid cell using multi-factor algorithm
- Apply Non-Maximum Suppression
- Select top-N suggestions based on aggression
- Compute confidence scores
- Generate rationales using OpenAI
- Ensure deterministic results via seed

**Key Methods**:
```typescript
class ExpansionGenerationService {
  async generate(params: GenerationParams): Promise<GenerationResult>;
  private createHexGrid(bounds: BoundingBox, cellSize: number): HexCell[];
  private scoreCell(cell: HexCell, stores: Store[], params: GenerationParams): CellScore;
  private applyNMS(scoredCells: ScoredCell[], minDistance: number): ScoredCell[];
  private computeConfidence(score: CellScore, dataCompleteness: number): number;
  private async generateRationale(cell: ScoredCell, stores: Store[]): Promise<Rationale>;
}
```

**Dependencies**:
- Prisma Client (database access)
- OpenAI SDK (rationale generation)
- Turf.js (spatial operations)

#### 2. ScenarioManagementService
**Location**: `apps/admin/lib/services/scenario-management.service.ts`

**Responsibilities**:
- Save scenarios with parameters and results
- Load saved scenarios
- Refresh scenarios with current data
- Update suggestion statuses
- List scenarios with pagination

**Key Methods**:
```typescript
class ScenarioManagementService {
  async saveScenario(params: SaveScenarioParams): Promise<ExpansionScenario>;
  async loadScenario(scenarioId: string): Promise<ScenarioWithSuggestions>;
  async refreshScenario(scenarioId: string): Promise<ScenarioWithSuggestions>;
  async updateSuggestionStatus(suggestionId: string, status: SuggestionStatus): Promise<void>;
  async listScenarios(filters: ScenarioFilters, pagination: Pagination): Promise<PaginatedScenarios>;
}
```

**Dependencies**:
- Prisma Client (database access)
- ExpansionGenerationService (for refresh)

#### 3. OpenAIRationaleService
**Location**: `apps/admin/lib/services/openai-rationale.service.ts`

**Responsibilities**:
- Generate human-readable rationale text
- Explain factor contributions
- Provide context about location characteristics
- Cache rationales to minimize API calls

**Key Methods**:
```typescript
class OpenAIRationaleService {
  async generateRationale(context: RationaleContext): Promise<string>;
  private buildPrompt(context: RationaleContext): string;
  private async callOpenAI(prompt: string): Promise<string>;
}
```

**Dependencies**:
- OpenAI SDK


### API Routes

#### 1. POST /api/expansion/generate
**Purpose**: Generate expansion suggestions based on parameters

**Request Body**:
```typescript
interface GenerateRequest {
  region: {
    country?: string;
    state?: string;
    boundingBox?: BoundingBox;
  };
  aggression: number; // 0-100
  populationBias: number; // 0-1, default 0.5
  proximityBias: number; // 0-1, default 0.3
  turnoverBias: number; // 0-1, default 0.2
  minDistanceM: number; // default 800
  seed: number; // for determinism
}
```

**Response**:
```typescript
interface GenerateResponse {
  suggestions: ExpansionSuggestion[];
  metadata: {
    totalCellsScored: number;
    avgConfidence: number;
    generationTimeMs: number;
    dataVersion: string;
  };
}
```

#### 2. POST /api/expansion/scenarios
**Purpose**: Save a new expansion scenario

**Request Body**:
```typescript
interface SaveScenarioRequest {
  label: string;
  regionFilter: object;
  aggression: number;
  populationBias: number;
  proximityBias: number;
  turnoverBias: number;
  minDistanceM: number;
  seed: number;
  suggestions: ExpansionSuggestion[];
}
```

**Response**:
```typescript
interface SaveScenarioResponse {
  scenarioId: string;
  createdAt: string;
}
```

#### 3. GET /api/expansion/scenarios/:id
**Purpose**: Load a saved scenario with suggestions

**Response**:
```typescript
interface LoadScenarioResponse {
  scenario: ExpansionScenario;
  suggestions: ExpansionSuggestion[];
}
```

#### 4. POST /api/expansion/scenarios/:id/refresh
**Purpose**: Refresh scenario with current store data

**Response**:
```typescript
interface RefreshScenarioResponse {
  scenario: ExpansionScenario;
  suggestions: ExpansionSuggestion[];
  changes: {
    added: number;
    removed: number;
    modified: number;
  };
}
```

#### 5. PATCH /api/expansion/suggestions/:id/status
**Purpose**: Update suggestion status

**Request Body**:
```typescript
interface UpdateStatusRequest {
  status: 'APPROVED' | 'REJECTED' | 'REVIEWED';
}
```

**Response**:
```typescript
interface UpdateStatusResponse {
  success: boolean;
  suggestion: ExpansionSuggestion;
}
```

#### 6. GET /api/expansion/scenarios
**Purpose**: List saved scenarios with pagination

**Query Parameters**:
- `page`: number (default 1)
- `limit`: number (default 50)
- `region`: string (optional filter)

**Response**:
```typescript
interface ListScenariosResponse {
  scenarios: ExpansionScenario[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```


## Data Models

### Database Schema Extensions

#### expansion_scenarios Table
```prisma
model ExpansionScenario {
  id                  String   @id @default(uuid())
  label               String
  regionFilter        Json     // { country?: string, state?: string, boundingBox?: {...} }
  aggressionLevel     Int      // 0-100
  populationBias      Float    // 0-1
  proximityBias       Float    // 0-1
  turnoverBias        Float    // 0-1
  minDistanceM        Int      // meters
  seed                Int      // for determinism
  sourceDataVersion   String   // timestamp of store data
  createdBy           String   // user identifier
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  suggestions         ExpansionSuggestion[]
  
  @@index([createdBy, createdAt])
  @@index([regionFilter])
}
```

#### expansion_suggestions Table
```prisma
model ExpansionSuggestion {
  id              String   @id @default(uuid())
  scenarioId      String
  lat             Float
  lng             Float
  confidence      Float    // 0-1
  rationale       Json     // { population: 0.72, proximityGap: 0.61, turnoverGap: 0.55, notes: "..." }
  rationaleText   String   // cached human-readable explanation
  band            String   // HIGH, MEDIUM, LOW, INSUFFICIENT_DATA
  status          String   @default("NEW") // NEW, REVIEWED, APPROVED, REJECTED
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  scenario        ExpansionScenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  
  @@index([scenarioId, band])
  @@index([status])
  @@index([confidence])
}
```

#### Store Table Extensions
```prisma
model Store {
  // ... existing fields ...
  annualTurnover      Float?   // for performance scoring
  openedAt            DateTime? // for maturity analysis
  cityPopulationBand  String?  // small, medium, large
  lastUpdatedAt       DateTime @updatedAt
  
  // ... existing relations ...
}
```

### TypeScript Interfaces

#### Core Types
```typescript
interface ExpansionScenario {
  id: string;
  label: string;
  regionFilter: RegionFilter;
  aggressionLevel: number;
  populationBias: number;
  proximityBias: number;
  turnoverBias: number;
  minDistanceM: number;
  seed: number;
  sourceDataVersion: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ExpansionSuggestion {
  id: string;
  scenarioId: string;
  lat: number;
  lng: number;
  confidence: number;
  rationale: Rationale;
  rationaleText: string;
  band: ConfidenceBand;
  status: SuggestionStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface Rationale {
  population: number;
  proximityGap: number;
  turnoverGap: number;
  notes: string;
}

type ConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
type SuggestionStatus = 'NEW' | 'REVIEWED' | 'APPROVED' | 'REJECTED';

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

#### Generation Types
```typescript
interface GenerationParams {
  region: RegionFilter;
  aggression: number;
  populationBias: number;
  proximityBias: number;
  turnoverBias: number;
  minDistanceM: number;
  seed: number;
}

interface HexCell {
  id: string;
  center: [number, number]; // [lng, lat]
  bounds: GeoJSON.Polygon;
}

interface CellScore {
  cellId: string;
  populationScore: number;
  proximityScore: number;
  turnoverScore: number;
  totalScore: number;
  dataCompleteness: number; // 0-1
}

interface ScoredCell extends HexCell {
  score: CellScore;
  confidence: number;
  nearestStoreDistance: number;
}

interface GenerationResult {
  suggestions: ExpansionSuggestion[];
  metadata: GenerationMetadata;
}

interface GenerationMetadata {
  totalCellsScored: number;
  avgConfidence: number;
  generationTimeMs: number;
  dataVersion: string;
}
```


## Algorithms and Logic

### Spatial Analysis Algorithm

#### 1. Hex Grid Generation
```typescript
function createHexGrid(bounds: BoundingBox, cellSizeM: number): HexCell[] {
  // Use Turf.js hexGrid to create hexagonal tessellation
  // Cell size ~500m provides good balance of granularity and performance
  const hexGrid = turf.hexGrid([
    bounds.west, bounds.south, bounds.east, bounds.north
  ], cellSizeM / 1000, { units: 'kilometers' });
  
  return hexGrid.features.map((feature, index) => ({
    id: `hex_${index}`,
    center: turf.center(feature).geometry.coordinates,
    bounds: feature.geometry
  }));
}
```

#### 2. Multi-Factor Scoring
```typescript
function scoreCell(
  cell: HexCell,
  stores: Store[],
  params: GenerationParams
): CellScore {
  // 1. Population Score (0-1)
  const populationScore = computePopulationScore(cell);
  
  // 2. Proximity Score (0-1) - higher when far from existing stores
  const proximityScore = computeProximityScore(cell, stores);
  
  // 3. Turnover Score (0-1) - higher in areas with high-performing stores
  const turnoverScore = computeTurnoverScore(cell, stores);
  
  // 4. Weighted combination
  const totalScore = 
    params.populationBias * populationScore +
    params.proximityBias * proximityScore +
    params.turnoverBias * turnoverScore;
  
  // 5. Data completeness (affects confidence)
  const dataCompleteness = computeDataCompleteness(cell, stores);
  
  return {
    cellId: cell.id,
    populationScore,
    proximityScore,
    turnoverScore,
    totalScore,
    dataCompleteness
  };
}
```

#### 3. Population Scoring
```typescript
function computePopulationScore(cell: HexCell): number {
  // Use city population band from nearest store or external data
  // Normalize to 0-1 scale
  const nearestCity = findNearestCity(cell.center);
  
  const bandScores = {
    'large': 1.0,   // >500k population
    'medium': 0.6,  // 100k-500k
    'small': 0.3    // <100k
  };
  
  return bandScores[nearestCity?.populationBand] || 0.5;
}
```

#### 4. Proximity Scoring
```typescript
function computeProximityScore(cell: HexCell, stores: Store[]): number {
  // Find distance to nearest existing store
  const distances = stores
    .filter(s => s.latitude && s.longitude)
    .map(s => turf.distance(
      cell.center,
      [s.longitude, s.latitude],
      { units: 'meters' }
    ));
  
  const minDistance = Math.min(...distances);
  
  // Normalize: 0m = 0.0, 5000m+ = 1.0
  // Sigmoid curve for smooth transition
  return 1 / (1 + Math.exp(-(minDistance - 2500) / 500));
}
```

#### 5. Turnover Scoring
```typescript
function computeTurnoverScore(cell: HexCell, stores: Store[]): number {
  // Find nearby stores (within 10km) with turnover data
  const nearbyStores = stores.filter(s => {
    if (!s.latitude || !s.longitude || !s.annualTurnover) return false;
    const distance = turf.distance(
      cell.center,
      [s.longitude, s.latitude],
      { units: 'kilometers' }
    );
    return distance <= 10;
  });
  
  if (nearbyStores.length === 0) return 0.5; // neutral
  
  // Compute average turnover, normalize to 0-1
  const avgTurnover = nearbyStores.reduce((sum, s) => 
    sum + (s.annualTurnover || 0), 0
  ) / nearbyStores.length;
  
  // Normalize: assume $500k = 0.5, $1M+ = 1.0
  return Math.min(avgTurnover / 1000000, 1.0);
}
```

#### 6. Non-Maximum Suppression
```typescript
function applyNMS(
  scoredCells: ScoredCell[],
  minDistanceM: number
): ScoredCell[] {
  // Sort by score descending
  const sorted = [...scoredCells].sort((a, b) => 
    b.score.totalScore - a.score.totalScore
  );
  
  const selected: ScoredCell[] = [];
  const suppressed = new Set<string>();
  
  for (const cell of sorted) {
    if (suppressed.has(cell.id)) continue;
    
    selected.push(cell);
    
    // Suppress nearby cells
    for (const other of sorted) {
      if (other.id === cell.id || suppressed.has(other.id)) continue;
      
      const distance = turf.distance(
        cell.center,
        other.center,
        { units: 'meters' }
      );
      
      if (distance < minDistanceM) {
        suppressed.add(other.id);
      }
    }
  }
  
  return selected;
}
```

#### 7. Confidence Computation
```typescript
function computeConfidence(
  score: CellScore,
  dataCompleteness: number
): number {
  // Confidence = score strength × data completeness
  const scoreStrength = score.totalScore;
  return scoreStrength * dataCompleteness;
}

function assignBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.7) return 'HIGH';
  if (confidence >= 0.5) return 'MEDIUM';
  if (confidence >= 0.3) return 'LOW';
  return 'INSUFFICIENT_DATA';
}
```


### OpenAI Rationale Generation

#### Prompt Engineering
```typescript
function buildRationalePrompt(context: RationaleContext): string {
  return `You are an expert in retail site selection for Subway restaurants. 
Generate a concise, professional explanation (2-3 sentences) for why this location 
is recommended for a new Subway store.

Location: ${context.lat.toFixed(4)}, ${context.lng.toFixed(4)}
Nearest existing store: ${context.nearestStoreDistance}m away
Population density: ${context.populationBand}
Average nearby store turnover: $${context.avgNearbyTurnover}k/year

Factor scores:
- Population score: ${(context.scores.population * 100).toFixed(0)}%
- Proximity gap: ${(context.scores.proximityGap * 100).toFixed(0)}%
- Turnover potential: ${(context.scores.turnoverGap * 100).toFixed(0)}%

Provide a clear, data-driven explanation focusing on the strongest factors.`;
}
```

#### OpenAI Integration
```typescript
class OpenAIRationaleService {
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  async generateRationale(context: RationaleContext): Promise<string> {
    const prompt = this.buildPrompt(context);
    
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini', // Cost-effective for short text
        messages: [
          {
            role: 'system',
            content: 'You are a retail site selection expert for Subway restaurants.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      });
      
      return response.choices[0]?.message?.content || 
        'Location shows potential based on spatial analysis.';
    } catch (error) {
      console.error('OpenAI rationale generation failed:', error);
      // Fallback to template-based rationale
      return this.generateFallbackRationale(context);
    }
  }
  
  private generateFallbackRationale(context: RationaleContext): string {
    const topFactor = this.identifyTopFactor(context.scores);
    return `This location shows ${context.confidence > 0.7 ? 'strong' : 'moderate'} 
potential primarily due to ${topFactor}. The nearest store is ${context.nearestStoreDistance}m 
away, suggesting room for expansion in this ${context.populationBand} population area.`;
  }
}
```

### Determinism Strategy

#### Seed-Based Random Sampling
```typescript
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    // Linear congruential generator
    this.seed = (this.seed * 1664525 + 1013904223) % 2**32;
    return this.seed / 2**32;
  }
  
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
```

#### Deterministic Generation Flow
```typescript
async function generateDeterministic(params: GenerationParams): Promise<GenerationResult> {
  // 1. Initialize seeded random
  const rng = new SeededRandom(params.seed);
  
  // 2. Load stores (sorted by ID for consistency)
  const stores = await loadStores(params.region);
  stores.sort((a, b) => a.id.localeCompare(b.id));
  
  // 3. Create hex grid (deterministic based on bounds)
  const hexGrid = createHexGrid(computeBounds(stores), 500);
  
  // 4. Score all cells (deterministic computation)
  const scoredCells = hexGrid.map(cell => ({
    ...cell,
    score: scoreCell(cell, stores, params),
    confidence: computeConfidence(cell.score, cell.dataCompleteness)
  }));
  
  // 5. Apply NMS (deterministic based on sort order)
  const filtered = applyNMS(scoredCells, params.minDistanceM);
  
  // 6. Select top-N based on aggression (deterministic)
  const count = Math.ceil(filtered.length * (params.aggression / 100));
  const selected = filtered.slice(0, count);
  
  // 7. Generate rationales (cached by location hash)
  const suggestions = await Promise.all(
    selected.map(cell => this.createSuggestion(cell, stores))
  );
  
  return { suggestions, metadata: computeMetadata(suggestions) };
}
```


## Error Handling

### Frontend Error Handling

#### Network Errors
```typescript
async function handleGenerateClick() {
  try {
    setLoading(true);
    setError(null);
    
    const response = await fetch('/api/expansion/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Generation failed');
    }
    
    const result = await response.json();
    setSuggestions(result.suggestions);
  } catch (error) {
    setError(error.message);
    showToast({
      type: 'error',
      message: 'Failed to generate suggestions. Please try again.'
    });
  } finally {
    setLoading(false);
  }
}
```

#### Validation Errors
```typescript
function validateGenerationParams(params: GenerationParams): ValidationResult {
  const errors: string[] = [];
  
  if (params.aggression < 0 || params.aggression > 100) {
    errors.push('Aggression must be between 0 and 100');
  }
  
  if (params.populationBias < 0 || params.populationBias > 1) {
    errors.push('Population bias must be between 0 and 1');
  }
  
  if (params.minDistanceM < 100) {
    errors.push('Minimum distance must be at least 100 meters');
  }
  
  if (!params.region.country && !params.region.boundingBox) {
    errors.push('Region filter is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Backend Error Handling

#### Service Layer Errors
```typescript
class ExpansionGenerationService {
  async generate(params: GenerationParams): Promise<GenerationResult> {
    try {
      // Validate parameters
      this.validateParams(params);
      
      // Load stores
      const stores = await this.loadStores(params.region);
      if (stores.length === 0) {
        throw new BusinessError('No stores found in region', 'NO_STORES');
      }
      
      // Generate suggestions
      const suggestions = await this.generateSuggestions(stores, params);
      
      return { suggestions, metadata: this.computeMetadata(suggestions) };
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      
      console.error('Generation failed:', error);
      throw new SystemError('Failed to generate suggestions', error);
    }
  }
}
```

#### API Route Error Handling
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request
    const validation = validateGenerationParams(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }
    
    // Generate suggestions
    const service = new ExpansionGenerationService();
    const result = await service.generate(body);
    
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BusinessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }
    
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### OpenAI Fallback
```typescript
async function generateRationaleWithFallback(
  context: RationaleContext
): Promise<string> {
  try {
    // Try OpenAI first
    return await this.openAIService.generateRationale(context);
  } catch (error) {
    console.warn('OpenAI failed, using fallback:', error);
    
    // Use template-based fallback
    return this.generateTemplateRationale(context);
  }
}

function generateTemplateRationale(context: RationaleContext): string {
  const factors = [];
  
  if (context.scores.population > 0.6) {
    factors.push('strong population density');
  }
  if (context.scores.proximityGap > 0.6) {
    factors.push('underserved area');
  }
  if (context.scores.turnoverGap > 0.6) {
    factors.push('high-performing nearby stores');
  }
  
  const factorText = factors.length > 0 
    ? factors.join(', ') 
    : 'balanced market conditions';
  
  return `This location shows ${context.confidence > 0.7 ? 'strong' : 'moderate'} 
potential based on ${factorText}. The nearest existing store is 
${context.nearestStoreDistance}m away.`;
}
```


## Testing Strategy

### Unit Tests

#### 1. Spatial Algorithm Tests
**Location**: `apps/admin/lib/services/__tests__/expansion-generation.test.ts`

**Test Cases**:
- Hex grid generation produces correct cell count and coverage
- Cell scoring computes correct population, proximity, and turnover scores
- NMS correctly enforces minimum distance constraints
- Confidence computation produces values in 0-1 range
- Band assignment matches confidence thresholds
- Deterministic generation produces identical results with same seed

#### 2. Service Layer Tests
**Location**: `apps/admin/lib/services/__tests__/scenario-management.test.ts`

**Test Cases**:
- Save scenario persists all parameters correctly
- Load scenario retrieves complete data
- Refresh scenario updates source_data_version
- Update suggestion status modifies database correctly
- List scenarios returns paginated results

#### 3. OpenAI Integration Tests
**Location**: `apps/admin/lib/services/__tests__/openai-rationale.test.ts`

**Test Cases**:
- Rationale generation returns valid text
- Fallback works when OpenAI fails
- Template rationale includes correct factors
- Prompt building includes all context

### Integration Tests

#### 1. API Route Tests
**Location**: `apps/admin/__tests__/api/expansion/generate.test.ts`

**Test Cases**:
- POST /api/expansion/generate returns suggestions
- Invalid parameters return 400 error
- Empty region returns appropriate error
- Response includes metadata
- Identical requests produce identical results

#### 2. End-to-End Generation Tests
**Location**: `apps/admin/__tests__/integration/expansion-flow.test.ts`

**Test Cases**:
- Complete generation flow from request to database
- Scenario save and load round-trip
- Refresh updates suggestions correctly
- Status updates persist

### Component Tests

#### 1. ExpansionControls Tests
**Location**: `apps/admin/app/stores/map/components/__tests__/ExpansionControls.test.tsx`

**Test Cases**:
- Sliders update state correctly
- Generate button triggers callback
- Validation prevents invalid submissions
- Loading state disables controls

#### 2. SuggestionInfoCard Tests
**Location**: `apps/admin/app/stores/map/components/__tests__/SuggestionInfoCard.test.tsx`

**Test Cases**:
- Displays all suggestion data
- Status buttons trigger callbacks
- Close button works
- Factor breakdowns render correctly

### Performance Tests

#### 1. Large Dataset Tests
**Test Cases**:
- Generation completes within 10s for 5,000 stores
- Map renders 30,000 stores with clustering
- NMS handles 10,000 cells efficiently
- Database queries use indexes

#### 2. Determinism Tests
**Test Cases**:
- Same seed produces identical results across 10 runs
- Different seeds produce different results
- Refresh maintains determinism with same seed

### Manual Testing Checklist

#### UI/UX Tests
- [ ] Toggle expansion mode without map reload
- [ ] Generate suggestions displays markers
- [ ] Click marker shows info card
- [ ] Color coding matches confidence bands
- [ ] Legend displays correctly
- [ ] Save scenario prompts for label
- [ ] Load scenario restores state
- [ ] Status buttons update immediately

#### Data Quality Tests
- [ ] Germany test with aggression=60 produces reasonable suggestions
- [ ] Minimum distance is respected
- [ ] High-confidence suggestions are in logical locations
- [ ] Rationales are coherent and relevant
- [ ] Factor scores align with location characteristics

#### Performance Tests
- [ ] No extra Mapbox loads on toggle/generate
- [ ] Map remains responsive with 30k stores
- [ ] Generation completes in <10s
- [ ] No memory leaks during extended use


## Performance Optimization

### Frontend Optimizations

#### 1. Map State Management
```typescript
// Use React.memo to prevent unnecessary re-renders
const SuggestionMarker = React.memo(({ suggestion, onClick, selected }: Props) => {
  return (
    <Marker
      latitude={suggestion.lat}
      longitude={suggestion.lng}
      onClick={onClick}
    >
      <MarkerIcon band={suggestion.band} selected={selected} />
    </Marker>
  );
}, (prev, next) => 
  prev.suggestion.id === next.suggestion.id &&
  prev.selected === next.selected
);
```

#### 2. Marker Clustering
```typescript
// Use supercluster for efficient marker clustering
import Supercluster from 'supercluster';

function useMarkerClustering(stores: Store[], viewport: MapViewport) {
  const cluster = useMemo(() => {
    const index = new Supercluster({
      radius: 40,
      maxZoom: 16
    });
    
    const points = stores.map(store => ({
      type: 'Feature',
      properties: { store },
      geometry: {
        type: 'Point',
        coordinates: [store.longitude, store.latitude]
      }
    }));
    
    index.load(points);
    return index;
  }, [stores]);
  
  const clusters = useMemo(() => {
    return cluster.getClusters(
      [viewport.bounds.west, viewport.bounds.south, 
       viewport.bounds.east, viewport.bounds.north],
      Math.floor(viewport.zoom)
    );
  }, [cluster, viewport]);
  
  return clusters;
}
```

#### 3. Lazy Loading
```typescript
// Load stores only for visible region
async function loadVisibleStores(bounds: BoundingBox): Promise<Store[]> {
  const response = await fetch('/api/stores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bounds })
  });
  
  return response.json();
}

// Debounce viewport changes
const debouncedLoadStores = useMemo(
  () => debounce(loadVisibleStores, 300),
  []
);
```

### Backend Optimizations

#### 1. Database Indexing
```prisma
model Store {
  // ... fields ...
  
  @@index([latitude, longitude]) // Spatial queries
  @@index([country, region])     // Region filtering
  @@index([annualTurnover])      // Performance queries
}

model ExpansionSuggestion {
  // ... fields ...
  
  @@index([scenarioId, band])    // Scenario queries
  @@index([confidence])          // Sorting
  @@index([status])              // Status filtering
}
```

#### 2. Query Optimization
```typescript
// Use Prisma select to fetch only needed fields
async function loadStoresForGeneration(region: RegionFilter): Promise<Store[]> {
  return prisma.store.findMany({
    where: {
      country: region.country,
      latitude: { not: null },
      longitude: { not: null }
    },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      annualTurnover: true,
      cityPopulationBand: true
    },
    orderBy: { id: 'asc' } // For determinism
  });
}
```

#### 3. Caching Strategy
```typescript
// Cache rationales by location hash
class RationaleCache {
  private cache = new Map<string, string>();
  
  private getKey(lat: number, lng: number): string {
    return `${lat.toFixed(4)}_${lng.toFixed(4)}`;
  }
  
  get(lat: number, lng: number): string | undefined {
    return this.cache.get(this.getKey(lat, lng));
  }
  
  set(lat: number, lng: number, rationale: string): void {
    this.cache.set(this.getKey(lat, lng), rationale);
  }
}

// Use in service
async function generateRationale(context: RationaleContext): Promise<string> {
  const cached = this.rationaleCache.get(context.lat, context.lng);
  if (cached) return cached;
  
  const rationale = await this.openAIService.generateRationale(context);
  this.rationaleCache.set(context.lat, context.lng, rationale);
  
  return rationale;
}
```

#### 4. Parallel Processing
```typescript
// Generate rationales in parallel with concurrency limit
async function generateRationalesParallel(
  cells: ScoredCell[],
  concurrency: number = 5
): Promise<ExpansionSuggestion[]> {
  const results: ExpansionSuggestion[] = [];
  
  for (let i = 0; i < cells.length; i += concurrency) {
    const batch = cells.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(cell => this.createSuggestion(cell))
    );
    results.push(...batchResults);
  }
  
  return results;
}
```

### Mapbox Cost Optimization

#### 1. Single Map Instance
```typescript
// Reuse map instance, never reload
function ExpansionMapPage() {
  const mapRef = useRef<MapRef>(null);
  const [expansionMode, setExpansionMode] = useState(false);
  
  // Toggle mode without remounting map
  const toggleExpansionMode = useCallback(() => {
    setExpansionMode(prev => !prev);
    // Map instance persists, no reload
  }, []);
  
  return (
    <Map ref={mapRef} {...viewport}>
      {/* Render different markers based on mode */}
      {expansionMode ? (
        <ExpansionMarkers suggestions={suggestions} />
      ) : (
        <StoreMarkers stores={stores} />
      )}
    </Map>
  );
}
```

#### 2. Server-Side Processing
```typescript
// All heavy computation on server
// Client only receives final coordinates
export async function POST(request: Request) {
  const params = await request.json();
  
  // Server does all the work
  const suggestions = await expansionService.generate(params);
  
  // Client receives only coordinates + metadata
  return NextResponse.json({
    suggestions: suggestions.map(s => ({
      id: s.id,
      lat: s.lat,
      lng: s.lng,
      confidence: s.confidence,
      band: s.band,
      rationale: s.rationale
    }))
  });
}
```

#### 3. Geocoding Optimization
```typescript
// Only geocode when absolutely necessary
// Use existing store coordinates for proximity
// Cache geocoding results
class GeocodingService {
  private cache = new Map<string, [number, number]>();
  
  async geocode(address: string): Promise<[number, number]> {
    const cached = this.cache.get(address);
    if (cached) return cached;
    
    // Use Mapbox geocoding API (server-side only)
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${process.env.MAPBOX_SECRET_TOKEN}`
    );
    
    const data = await response.json();
    const coords = data.features[0]?.center || [0, 0];
    
    this.cache.set(address, coords);
    return coords;
  }
}
```


## Security Considerations

### Authentication and Authorization

#### 1. API Route Protection
```typescript
// Middleware to verify user authentication
import { getServerSession } from 'next-auth';

export async function POST(request: Request) {
  const session = await getServerSession();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Check user role for expansion feature access
  if (!hasExpansionAccess(session.user.role)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }
  
  // Proceed with request
  const result = await expansionService.generate(params);
  return NextResponse.json(result);
}
```

#### 2. Scenario Ownership
```typescript
// Ensure users can only access their own scenarios
async function loadScenario(scenarioId: string, userId: string): Promise<Scenario> {
  const scenario = await prisma.expansionScenario.findUnique({
    where: { id: scenarioId }
  });
  
  if (!scenario) {
    throw new NotFoundError('Scenario not found');
  }
  
  if (scenario.createdBy !== userId) {
    throw new ForbiddenError('Access denied');
  }
  
  return scenario;
}
```

### Input Validation

#### 1. Parameter Sanitization
```typescript
function sanitizeGenerationParams(params: any): GenerationParams {
  return {
    region: {
      country: sanitizeString(params.region?.country),
      state: sanitizeString(params.region?.state),
      boundingBox: params.region?.boundingBox ? {
        north: clamp(params.region.boundingBox.north, -90, 90),
        south: clamp(params.region.boundingBox.south, -90, 90),
        east: clamp(params.region.boundingBox.east, -180, 180),
        west: clamp(params.region.boundingBox.west, -180, 180)
      } : undefined
    },
    aggression: clamp(parseInt(params.aggression), 0, 100),
    populationBias: clamp(parseFloat(params.populationBias), 0, 1),
    proximityBias: clamp(parseFloat(params.proximityBias), 0, 1),
    turnoverBias: clamp(parseFloat(params.turnoverBias), 0, 1),
    minDistanceM: Math.max(100, parseInt(params.minDistanceM)),
    seed: parseInt(params.seed) || Date.now()
  };
}
```

#### 2. SQL Injection Prevention
```typescript
// Use Prisma parameterized queries (automatic protection)
async function loadStores(region: RegionFilter): Promise<Store[]> {
  return prisma.store.findMany({
    where: {
      // Prisma automatically sanitizes these values
      country: region.country,
      latitude: { not: null },
      longitude: { not: null }
    }
  });
}
```

### API Key Security

#### 1. Environment Variables
```bash
# .env.local
MAPBOX_PUBLIC_TOKEN=pk.xxx  # Public token for client-side tiles
MAPBOX_SECRET_TOKEN=sk.xxx  # Secret token for server-side API calls
OPENAI_API_KEY=sk-xxx       # OpenAI API key
```

#### 2. Token Scoping
```typescript
// Use public token for map tiles (client-side)
<Map
  mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
  {...viewport}
/>

// Use secret token for geocoding (server-side only)
async function geocode(address: string): Promise<Coordinates> {
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${address}.json`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.MAPBOX_SECRET_TOKEN}`
      }
    }
  );
  return response.json();
}
```

### Rate Limiting

#### 1. API Rate Limits
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many generation requests, please try again later'
});

export async function POST(request: Request) {
  // Apply rate limiting
  await limiter(request);
  
  // Process request
  const result = await expansionService.generate(params);
  return NextResponse.json(result);
}
```

#### 2. OpenAI Cost Control
```typescript
class OpenAIRationaleService {
  private requestCount = 0;
  private readonly maxRequestsPerHour = 100;
  
  async generateRationale(context: RationaleContext): Promise<string> {
    if (this.requestCount >= this.maxRequestsPerHour) {
      console.warn('OpenAI rate limit reached, using fallback');
      return this.generateFallbackRationale(context);
    }
    
    this.requestCount++;
    return this.callOpenAI(context);
  }
}
```


## Deployment and Configuration

### Environment Setup

#### Required Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/subway_enterprise"

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN="pk.xxx"  # Public token for map tiles
MAPBOX_SECRET_TOKEN="sk.xxx"       # Secret token for server API calls

# OpenAI
OPENAI_API_KEY="sk-xxx"            # API key for rationale generation

# Feature Flags
NEXT_PUBLIC_ENABLE_EXPANSION_PREDICTOR="true"

# Optional: Rate Limiting
EXPANSION_RATE_LIMIT_WINDOW_MS="900000"  # 15 minutes
EXPANSION_RATE_LIMIT_MAX="10"            # 10 requests per window
```

### Database Migration

#### Migration Script
```bash
# Generate migration
pnpm -C packages/db prisma migrate dev --name add_expansion_tables

# Apply migration to production
pnpm -C packages/db prisma migrate deploy
```

#### Migration SQL
```sql
-- Create expansion_scenarios table
CREATE TABLE "ExpansionScenario" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "label" TEXT NOT NULL,
  "regionFilter" JSONB NOT NULL,
  "aggressionLevel" INTEGER NOT NULL,
  "populationBias" DOUBLE PRECISION NOT NULL,
  "proximityBias" DOUBLE PRECISION NOT NULL,
  "turnoverBias" DOUBLE PRECISION NOT NULL,
  "minDistanceM" INTEGER NOT NULL,
  "seed" INTEGER NOT NULL,
  "sourceDataVersion" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create expansion_suggestions table
CREATE TABLE "ExpansionSuggestion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "scenarioId" TEXT NOT NULL,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "rationale" JSONB NOT NULL,
  "rationaleText" TEXT NOT NULL,
  "band" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExpansionSuggestion_scenarioId_fkey" 
    FOREIGN KEY ("scenarioId") 
    REFERENCES "ExpansionScenario"("id") 
    ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX "ExpansionScenario_createdBy_createdAt_idx" 
  ON "ExpansionScenario"("createdBy", "createdAt");
CREATE INDEX "ExpansionScenario_regionFilter_idx" 
  ON "ExpansionScenario" USING GIN ("regionFilter");
CREATE INDEX "ExpansionSuggestion_scenarioId_band_idx" 
  ON "ExpansionSuggestion"("scenarioId", "band");
CREATE INDEX "ExpansionSuggestion_status_idx" 
  ON "ExpansionSuggestion"("status");
CREATE INDEX "ExpansionSuggestion_confidence_idx" 
  ON "ExpansionSuggestion"("confidence");

-- Add optional fields to Store table
ALTER TABLE "Store" 
  ADD COLUMN "annualTurnover" DOUBLE PRECISION,
  ADD COLUMN "openedAt" TIMESTAMP(3),
  ADD COLUMN "cityPopulationBand" TEXT;

CREATE INDEX "Store_annualTurnover_idx" ON "Store"("annualTurnover");
```

### Feature Flag Configuration

#### Feature Flag Setup
```typescript
// apps/admin/lib/featureFlags.ts
export class FeatureFlags {
  static isExpansionPredictorEnabled(): boolean {
    return process.env.NEXT_PUBLIC_ENABLE_EXPANSION_PREDICTOR === 'true';
  }
}

// Usage in components
function MapPage() {
  const isExpansionEnabled = FeatureFlags.isExpansionPredictorEnabled();
  
  if (!isExpansionEnabled) {
    return <StandardMapView />;
  }
  
  return <ExpansionIntegratedMapView />;
}
```

### Monitoring and Logging

#### Telemetry Events
```typescript
// Track expansion feature usage
interface ExpansionTelemetry {
  event_type: 'expansion_generated' | 'scenario_saved' | 'suggestion_approved';
  user_id: string;
  session_id: string;
  metadata: {
    region?: string;
    aggression?: number;
    suggestion_count?: number;
    generation_time_ms?: number;
  };
}

function trackExpansionEvent(event: ExpansionTelemetry): void {
  fetch('/api/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  });
}
```

#### Error Logging
```typescript
// Structured error logging
function logExpansionError(error: Error, context: any): void {
  console.error('Expansion error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
  
  // Send to monitoring service (e.g., Sentry)
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}
```

### Rollout Strategy

#### Phase 1: Internal Testing (Week 1)
- Deploy to staging environment
- Enable feature flag for admin users only
- Test with Germany and Belgium data
- Validate determinism and performance
- Collect feedback on UX and rationale quality

#### Phase 2: Limited Rollout (Week 2-3)
- Deploy to production
- Enable for 10% of users
- Monitor Mapbox and OpenAI usage
- Track generation times and error rates
- Gather user feedback

#### Phase 3: Full Rollout (Week 4)
- Enable for all users
- Monitor system performance
- Optimize based on usage patterns
- Document best practices

### Rollback Plan

#### Quick Rollback
```bash
# Disable feature flag
export NEXT_PUBLIC_ENABLE_EXPANSION_PREDICTOR="false"

# Restart application
pm2 restart subway-admin
```

#### Database Rollback
```sql
-- If needed, remove expansion tables
DROP TABLE "ExpansionSuggestion";
DROP TABLE "ExpansionScenario";

-- Remove Store table additions
ALTER TABLE "Store" 
  DROP COLUMN "annualTurnover",
  DROP COLUMN "openedAt",
  DROP COLUMN "cityPopulationBand";
```


## Design Decisions and Rationale

### 1. Why Hexagonal Grid?

**Decision**: Use hexagonal tessellation for spatial analysis instead of square grid or point-based sampling.

**Rationale**:
- Hexagons have uniform distance to all neighbors (no diagonal bias)
- Better approximation of circular service areas
- Industry standard for spatial analysis (Uber H3, etc.)
- Efficient coverage with minimal overlap
- ~500m cell size balances granularity and performance

**Alternatives Considered**:
- Square grid: Simpler but has diagonal distance bias
- Point sampling: Less systematic, harder to ensure coverage
- Voronoi diagrams: More complex, harder to implement deterministically

### 2. Why Server-Side Generation?

**Decision**: Perform all heavy computation on the server, send only final coordinates to client.

**Rationale**:
- Minimizes Mapbox API usage (no client-side tile loads during generation)
- Protects business logic and algorithms
- Enables caching and optimization
- Consistent results across clients
- Better error handling and logging

**Alternatives Considered**:
- Client-side generation: Would increase Mapbox costs and expose algorithms
- Hybrid approach: Added complexity without clear benefits

### 3. Why OpenAI for Rationales?

**Decision**: Use OpenAI GPT-4o-mini to generate human-readable explanations.

**Rationale**:
- Provides natural, contextual explanations
- Adapts language to specific location characteristics
- More credible than template-based text
- Cost-effective with gpt-4o-mini model
- Fallback to templates ensures reliability

**Alternatives Considered**:
- Template-based only: Less engaging, repetitive
- Rule-based NLG: Complex to maintain, less flexible
- No explanations: Reduces trust and transparency

### 4. Why Deterministic Generation?

**Decision**: Use seed-based random number generation to ensure reproducibility.

**Rationale**:
- Enables scenario comparison and auditing
- Builds trust through consistency
- Supports A/B testing of parameters
- Facilitates debugging and validation
- Required for regulatory compliance

**Alternatives Considered**:
- Non-deterministic: Simpler but loses reproducibility
- Snapshot-based: Storage overhead, harder to refresh

### 5. Why No Page Reload for Expansion Mode?

**Decision**: Toggle expansion mode without remounting map component.

**Rationale**:
- Preserves user viewport and zoom level
- Avoids Mapbox tile reload (cost savings)
- Smoother user experience
- Faster mode switching
- Maintains map state and interactions

**Alternatives Considered**:
- Separate page: Requires navigation, loses context
- Full reload: Poor UX, increased costs

### 6. Why Multi-Factor Scoring?

**Decision**: Combine population, proximity, and turnover scores with configurable weights.

**Rationale**:
- Captures multiple dimensions of opportunity
- Allows business strategy customization
- More robust than single-factor analysis
- Transparent and explainable
- Aligns with retail site selection best practices

**Alternatives Considered**:
- Single factor: Too simplistic, misses opportunities
- Machine learning: Black box, harder to explain
- Fixed weights: Less flexible for different strategies

### 7. Why Confidence Bands?

**Decision**: Classify suggestions into HIGH, MEDIUM, LOW, INSUFFICIENT_DATA bands.

**Rationale**:
- Easier to understand than raw scores
- Visual differentiation through color coding
- Guides prioritization decisions
- Communicates data quality issues
- Industry-standard approach

**Alternatives Considered**:
- Continuous scores: Harder to interpret visually
- Binary (good/bad): Loses nuance
- More bands: Diminishing returns, harder to distinguish

### 8. Why Scenario Management?

**Decision**: Save complete scenarios with parameters and results.

**Rationale**:
- Enables comparison of different strategies
- Supports collaborative decision-making
- Provides audit trail for compliance
- Allows refresh with updated data
- Facilitates iterative refinement

**Alternatives Considered**:
- Ephemeral results: Loses valuable analysis
- Export-only: Harder to share and compare
- Version control: Overkill for this use case

## Future Enhancements

### Phase 2 Features (Post-MVP)

#### 1. Advanced Filtering
- Custom polygon drawing for region selection
- Multi-country scenario generation
- Exclude zones (e.g., competitor territories)
- Include/exclude specific store types

#### 2. Enhanced Analytics
- Scenario comparison view (side-by-side)
- ROI estimation per suggestion
- Market saturation heatmaps
- Cannibalization risk analysis

#### 3. Data Enrichment
- Real-time population data integration
- Traffic pattern analysis
- Competitor location data
- Demographic segmentation

#### 4. Collaboration Features
- Share scenarios with team members
- Comment threads on suggestions
- Approval workflows
- Export to presentation formats

#### 5. Machine Learning Integration
- Learn from approved/rejected suggestions
- Predict store performance
- Optimize weight recommendations
- Anomaly detection

### Technical Debt and Improvements

#### 1. Performance
- Implement Web Workers for client-side processing
- Add Redis caching layer
- Optimize database queries with materialized views
- Implement progressive loading for large datasets

#### 2. Scalability
- Horizontal scaling for generation service
- Queue-based processing for large regions
- Distributed caching
- CDN for static assets

#### 3. Observability
- Detailed performance metrics
- User behavior analytics
- Cost tracking per feature
- A/B testing framework

#### 4. Developer Experience
- Comprehensive API documentation
- Interactive API playground
- Storybook for components
- E2E test coverage

