# Design Document

## Overview

This design implements smart scenario caching, deterministic generation, progressive expansion, and Mapbox-based urban suitability filtering for the Expansion Predictor. The system uses Mapbox Tilequery API for spatial validation and OpenAI for rationale generation, with aggressive caching to minimize costs. All processing happens server-side with only final validated suggestions sent to the client.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
├─────────────────────────────────────────────────────────────┤
│  ExpansionControls → Generate/Save/Expand/Load              │
│  Map View → Render suggestions with status colors           │
│  SuggestionInfoCard → Display rationale + review buttons    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Backend API (NestJS/Next.js)                    │
├─────────────────────────────────────────────────────────────┤
│  POST /api/expansion/generate                                │
│  POST /api/expansion/scenarios (save)                        │
│  GET  /api/expansion/scenarios/:id (load)                    │
│  PATCH /api/expansion/suggestions/:id/status                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           Expansion Generation Service                       │
├─────────────────────────────────────────────────────────────┤
│  1. Generate hex grid (deterministic with seed)              │
│  2. Score cells (population, proximity, turnover)            │
│  3. Apply NMS (non-maximum suppression)                      │
│  4. Select top N candidates                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│         Mapbox Urban Suitability Filter                      │
├─────────────────────────────────────────────────────────────┤
│  For each candidate:                                         │
│    - Check cache (coordinate hash)                           │
│    - If miss: Call Mapbox Tilequery API                      │
│    - Validate: landuse, road distance, building distance    │
│    - Cache result (30 day TTL)                               │
│    - Reject if fails criteria                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│            OpenAI Rationale Generator                        │
├─────────────────────────────────────────────────────────────┤
│  For each validated candidate:                               │
│    - Check cache (coordinate + context hash)                 │
│    - If miss: Call OpenAI API                                │
│    - Generate 2-3 sentence rationale                         │
│    - Cache result (90 day TTL)                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Database (PostgreSQL)                           │
├─────────────────────────────────────────────────────────────┤
│  ExpansionScenario → Store scenarios                         │
│  ExpansionSuggestion → Store suggestions with status         │
│  MapboxTilequeryCache → Cache Tilequery responses            │
│  OpenAIRationaleCache → Cache rationale responses            │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### New Tables

```prisma
model MapboxTilequeryCache {
  id              String   @id @default(cuid())
  coordinate_hash String   @unique // hash of lat/lng rounded to 5 decimals
  lat             Float
  lng             Float
  landuse_type    String?
  road_distance_m Int?
  building_distance_m Int?
  urban_density_index Float?
  is_suitable     Boolean
  raw_response    String   // JSON string of full Tilequery response
  created_at      DateTime @default(now())
  expires_at      DateTime // 30 days from creation
  
  @@index([coordinate_hash])
  @@index([expires_at])
}

model OpenAIRationaleCache {
  id              String   @id @default(cuid())
  context_hash    String   @unique // hash of coordinate + context
  lat             Float
  lng             Float
  rationale_text  String
  tokens_used     Int
  created_at      DateTime @default(now())
  expires_at      DateTime // 90 days from creation
  
  @@index([context_hash])
  @@index([expires_at])
}

// Update existing ExpansionSuggestion model
model ExpansionSuggestion {
  // ... existing fields ...
  
  // Add new fields
  urban_density_index Float?
  road_distance_m     Int?
  building_distance_m Int?
  landuse_type        String?
  mapbox_validated    Boolean @default(false)
  ai_rationale_cached Boolean @default(false)
}
```

## Components and Interfaces

### 1. Mapbox Tilequery Service

**Location**: `apps/bff/src/services/mapbox-tilequery.service.ts`

```typescript
interface TilequeryResult {
  isSuitable: boolean;
  landuseType: string | null;
  roadDistanceM: number | null;
  buildingDistanceM: number | null;
  urbanDensityIndex: number | null;
}

@Injectable()
export class MapboxTilequeryService {
  private readonly MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
  private readonly CACHE_TTL_DAYS = 30;
  
  async validateLocation(lat: number, lng: number): Promise<TilequeryResult> {
    // 1. Check cache
    const hash = this.hashCoordinate(lat, lng);
    const cached = await this.getFromCache(hash);
    if (cached) return cached;
    
    // 2. Call Mapbox Tilequery
    const result = await this.queryMapbox(lat, lng);
    
    // 3. Validate criteria
    const isSuitable = this.checkSuitability(result);
    
    // 4. Cache result
    await this.cacheResult(hash, lat, lng, result, isSuitable);
    
    return {
      isSuitable,
      landuseType: result.landuse,
      roadDistanceM: result.roadDistance,
      buildingDistanceM: result.buildingDistance,
      urbanDensityIndex: result.urbanDensity
    };
  }
  
  private async queryMapbox(lat: number, lng: number): Promise<any> {
    // Query Mapbox Tilequery for landuse, roads, buildings
    const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json`;
    const params = {
      radius: 150,
      layers: 'landuse,road,building',
      access_token: this.MAPBOX_TOKEN
    };
    
    const response = await fetch(`${url}?${new URLSearchParams(params)}`);
    return response.json();
  }
  
  private checkSuitability(result: any): boolean {
    // Check landuse whitelist
    const validLanduse = ['residential', 'commercial', 'retail', 'industrial'];
    const excludedLanduse = ['farmland', 'forest', 'water', 'wetland', 'park'];
    
    // Check road proximity (≤ 150m)
    // Check building proximity (≤ 80m)
    
    return true; // Implement full logic
  }
  
  private hashCoordinate(lat: number, lng: number): string {
    const rounded = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    return crypto.createHash('md5').update(rounded).digest('hex');
  }
}
```

### 2. OpenAI Rationale Service

**Location**: `apps/bff/src/services/openai-rationale.service.ts`

```typescript
interface RationaleContext {
  lat: number;
  lng: number;
  populationScore: number;
  proximityScore: number;
  turnoverScore: number;
  urbanDensity: number;
  roadDistance: number;
  buildingDistance: number;
}

@Injectable()
export class OpenAIRationaleService {
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly CACHE_TTL_DAYS = 90;
  
  async generateRationale(context: RationaleContext): Promise<string> {
    // 1. Check cache
    const hash = this.hashContext(context);
    const cached = await this.getFromCache(hash);
    if (cached) return cached;
    
    // 2. Call OpenAI
    const rationale = await this.callOpenAI(context);
    
    // 3. Cache result
    await this.cacheRationale(hash, context, rationale);
    
    return rationale;
  }
  
  private async callOpenAI(context: RationaleContext): Promise<string> {
    const prompt = `Generate a concise 2-3 sentence rationale for why this location is suitable for a Subway restaurant:
    
Location: ${context.lat.toFixed(4)}, ${context.lng.toFixed(4)}
Population Score: ${(context.populationScore * 100).toFixed(0)}%
Proximity Gap: ${(context.proximityScore * 100).toFixed(0)}%
Sales Potential: ${(context.turnoverScore * 100).toFixed(0)}%
Urban Density: ${context.urbanDensity.toFixed(2)}
Road Access: ${context.roadDistance}m from major road
Building Density: ${context.buildingDistance}m from buildings

Focus on business value and location advantages.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  private hashContext(context: RationaleContext): string {
    const key = `${context.lat.toFixed(5)},${context.lng.toFixed(5)},${context.populationScore},${context.proximityScore}`;
    return crypto.createHash('md5').update(key).digest('hex');
  }
}
```

### 3. Enhanced Expansion Generation Service

**Updates to**: `apps/admin/lib/services/expansion-generation.service.ts`

```typescript
export interface GenerationParams {
  // ... existing fields ...
  
  // New fields
  seed?: number;
  targetCount?: number; // 10, 30, 50, 100, 200
  scenarioId?: string; // For progressive expansion
  enableMapboxFiltering?: boolean; // default true
  enableAIRationale?: boolean; // default true
}

export class ExpansionGenerationService {
  constructor(
    private prisma: PrismaClient,
    private mapboxService: MapboxTilequeryService,
    private openaiService: OpenAIRationaleService
  ) {}
  
  async generate(params: GenerationParams): Promise<GenerationResult> {
    // 1. Generate candidates (existing logic with seed)
    const candidates = await this.generateCandidates(params);
    
    // 2. Apply Mapbox urban suitability filtering
    const validated = await this.applyMapboxFiltering(candidates, params);
    
    // 3. Generate OpenAI rationales
    const withRationales = await this.generateRationales(validated, params);
    
    // 4. Return suggestions
    return {
      suggestions: withRationales,
      metadata: {
        totalGenerated: candidates.length,
        mapboxFiltered: validated.length,
        finalCount: withRationales.length,
        seed: params.seed,
        cacheHitRate: this.calculateCacheHitRate()
      }
    };
  }
  
  private async applyMapboxFiltering(
    candidates: ScoredCell[], 
    params: GenerationParams
  ): Promise<ScoredCell[]> {
    if (params.enableMapboxFiltering === false) {
      return candidates;
    }
    
    const validated = [];
    
    for (const candidate of candidates) {
      const result = await this.mapboxService.validateLocation(
        candidate.center[1], 
        candidate.center[0]
      );
      
      if (result.isSuitable) {
        candidate.mapboxData = result;
        validated.push(candidate);
      }
    }
    
    console.log(`Mapbox filtering: ${candidates.length} → ${validated.length}`);
    return validated;
  }
  
  private async generateRationales(
    candidates: ScoredCell[],
    params: GenerationParams
  ): Promise<ExpansionSuggestionData[]> {
    if (params.enableAIRationale === false) {
      return candidates.map(c => this.createSuggestionWithoutAI(c));
    }
    
    const suggestions = [];
    
    for (const candidate of candidates) {
      const rationale = await this.openaiService.generateRationale({
        lat: candidate.center[1],
        lng: candidate.center[0],
        populationScore: candidate.score.populationScore,
        proximityScore: candidate.score.proximityScore,
        turnoverScore: candidate.score.turnoverScore,
        urbanDensity: candidate.mapboxData.urbanDensityIndex,
        roadDistance: candidate.mapboxData.roadDistanceM,
        buildingDistance: candidate.mapboxData.buildingDistanceM
      });
      
      suggestions.push({
        ...this.createSuggestion(candidate),
        rationaleText: rationale,
        urban_density_index: candidate.mapboxData.urbanDensityIndex,
        road_distance_m: candidate.mapboxData.roadDistanceM,
        building_distance_m: candidate.mapboxData.buildingDistanceM,
        landuse_type: candidate.mapboxData.landuseType
      });
    }
    
    return suggestions;
  }
}
```

### 4. Scenario Management API

**Location**: `apps/admin/app/api/expansion/scenarios/route.ts`

```typescript
// POST /api/expansion/scenarios - Save scenario
export async function POST(request: Request) {
  const body = await request.json();
  
  const scenario = await prisma.expansionScenario.create({
    data: {
      label: body.label,
      regionFilter: JSON.stringify(body.regionFilter),
      aggressionLevel: body.aggressionLevel,
      populationBias: body.populationBias,
      proximityBias: body.proximityBias,
      turnoverBias: body.turnoverBias,
      minDistanceM: body.minDistanceM,
      seed: body.seed,
      sourceDataVersion: 'v1.0',
      createdBy: 'user', // TODO: Get from auth
      suggestions: {
        create: body.suggestions.map(s => ({
          lat: s.lat,
          lng: s.lng,
          confidence: s.confidence,
          rationale: JSON.stringify(s.rationale),
          rationaleText: s.rationaleText,
          band: s.band,
          status: 'NEW'
        }))
      }
    },
    include: { suggestions: true }
  });
  
  return Response.json({ scenario });
}

// GET /api/expansion/scenarios/:id - Load scenario
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const scenario = await prisma.expansionScenario.findUnique({
    where: { id: params.id },
    include: { suggestions: true }
  });
  
  return Response.json({ scenario });
}

// POST /api/expansion/scenarios/:id/expand - Progressive expansion
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const scenario = await prisma.expansionScenario.findUnique({
    where: { id: params.id },
    include: { suggestions: true }
  });
  
  const currentCount = scenario.suggestions.length;
  const targetCount = request.body.targetCount || currentCount + 20;
  
  // Generate additional suggestions using same seed
  const newSuggestions = await expansionService.generate({
    ...JSON.parse(scenario.regionFilter),
    seed: scenario.seed,
    targetCount,
    scenarioId: scenario.id
  });
  
  // Add to scenario
  await prisma.expansionSuggestion.createMany({
    data: newSuggestions.map(s => ({
      scenarioId: scenario.id,
      ...s
    }))
  });
  
  return Response.json({ added: newSuggestions.length });
}
```

### 5. UI Updates

**ExpansionControls Component**

Add scenario controls section:

```typescript
// State
const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
const [targetCount, setTargetCount] = useState(10);

// Scenario Controls Section
<div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
    📊 Scenario Controls
  </div>
  
  {currentScenario && (
    <div style={{ marginBottom: '12px', padding: '8px', background: '#f9fafb', borderRadius: '4px', fontSize: '12px' }}>
      <div>Seed: {currentScenario.seed}</div>
      <div>Suggestions: {currentScenario.suggestions.length}</div>
      <div>✅ {approvedCount} | ⚠️ {holdCount} | ❌ {rejectedCount}</div>
    </div>
  )}
  
  <div style={{ marginBottom: '8px' }}>
    <label style={{ fontSize: '13px', fontWeight: 500 }}>
      Target Count:
      <select 
        value={targetCount} 
        onChange={(e) => setTargetCount(parseInt(e.target.value))}
        style={{ marginLeft: '8px', padding: '4px', borderRadius: '4px' }}
      >
        <option value={10}>10 sites</option>
        <option value={30}>30 sites</option>
        <option value={50}>50 sites</option>
        <option value={100}>100 sites</option>
        <option value={200}>200 sites</option>
      </select>
    </label>
  </div>
  
  <button
    onClick={handleExpand}
    disabled={!currentScenario || loading}
    style={{
      width: '100%',
      padding: '10px',
      background: currentScenario ? '#10b981' : '#ccc',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 500,
      cursor: currentScenario ? 'pointer' : 'not-allowed',
      marginBottom: '8px'
    }}
  >
    Expand Model
  </button>
</div>
```

**Status-based marker colors**:

```typescript
const getMarkerColor = (suggestion: ExpansionSuggestion) => {
  switch (suggestion.status) {
    case 'APPROVED': return '#10b981'; // Green
    case 'REJECTED': return '#6b7280'; // Gray
    case 'HOLD': return '#f59e0b'; // Yellow
    default: return '#a855f7'; // Purple (NEW/PENDING)
  }
};
```

## Data Flow

### Generation Flow

```
1. User clicks "Generate Expansion Plan"
2. Frontend sends params + targetCount to /api/expansion/generate
3. Backend:
   a. Generate seed (if not provided)
   b. Create hex grid (deterministic with seed)
   c. Score cells
   d. Apply NMS
   e. Select top N candidates
   f. For each candidate:
      - Check Mapbox cache
      - If miss: Call Tilequery API
      - Validate urban suitability
      - If pass: Check OpenAI cache
      - If miss: Generate rationale
      - Add to results
4. Return validated suggestions to frontend
5. Frontend renders markers on map
```

### Progressive Expansion Flow

```
1. User clicks "Expand Model"
2. Frontend sends scenarioId + new targetCount
3. Backend:
   a. Load scenario (get seed, params, existing suggestions)
   b. Generate with same seed but higher targetCount
   c. Filter out existing coordinates
   d. Apply Mapbox + OpenAI to new candidates only
   e. Add new suggestions to scenario
4. Return new suggestions
5. Frontend adds markers without clearing existing
```

### Save/Load Flow

```
Save:
1. User clicks "Save Scenario"
2. Frontend sends all suggestions + params
3. Backend creates ExpansionScenario + ExpansionSuggestion rows
4. Returns scenario ID

Load:
1. User selects scenario from dropdown
2. Frontend calls GET /api/expansion/scenarios/:id
3. Backend returns scenario with all suggestions
4. Frontend renders all markers with correct status colors
```

## Caching Strategy

### Mapbox Tilequery Cache

- **Key**: MD5 hash of `lat.toFixed(5),lng.toFixed(5)`
- **TTL**: 30 days
- **Storage**: Database table `MapboxTilequeryCache`
- **Expected hit rate**: 80%+ after initial runs

### OpenAI Rationale Cache

- **Key**: MD5 hash of `lat,lng,popScore,proxScore,turnScore`
- **TTL**: 90 days
- **Storage**: Database table `OpenAIRationaleCache`
- **Expected hit rate**: 70%+ after initial runs

### Cache Cleanup

- Cron job runs daily to delete expired cache entries
- `DELETE FROM MapboxTilequeryCache WHERE expires_at < NOW()`
- `DELETE FROM OpenAIRationaleCache WHERE expires_at < NOW()`

## Performance Targets

- **Generation (50 suggestions)**: < 30 seconds
- **Mapbox Tilequery**: < 500ms per call, 80% cache hit rate
- **OpenAI rationale**: < 2s per call, 70% cache hit rate
- **Progressive expansion**: < 10 seconds to add 20 suggestions
- **Scenario save**: < 1 second
- **Scenario load**: < 2 seconds

## Error Handling

### Mapbox API Errors

- Retry up to 3 times with exponential backoff
- If all retries fail, mark suggestion as "unvalidated" and skip
- Log error for monitoring
- Continue processing remaining candidates

### OpenAI API Errors

- Retry up to 2 times
- If fails, use generic rationale template
- Log error for monitoring
- Don't block suggestion from being returned

### Rate Limiting

- Implement request queuing for Mapbox (max 600/min)
- Implement request queuing for OpenAI (max 3500/min)
- Add delays between batches if approaching limits

## Testing Strategy

### Unit Tests

- Test coordinate hashing (same coords = same hash)
- Test seed determinism (same seed = same results)
- Test Mapbox suitability logic
- Test cache hit/miss logic

### Integration Tests

- Test full generation flow with Mapbox + OpenAI
- Test progressive expansion maintains continuity
- Test scenario save/load roundtrip
- Test status update workflow

### Performance Tests

- Benchmark 50 suggestions with cold cache
- Benchmark 50 suggestions with warm cache
- Verify cache hit rates meet targets
- Monitor API costs per generation

## Deployment Considerations

### Environment Variables

```env
MAPBOX_ACCESS_TOKEN=pk.xxx
OPENAI_API_KEY=sk-xxx
ENABLE_MAPBOX_FILTERING=true
ENABLE_AI_RATIONALE=true
MAX_SUGGESTIONS_PER_RUN=50
```

### Database Migration

- Add MapboxTilequeryCache table
- Add OpenAIRationaleCache table
- Add new fields to ExpansionSuggestion
- Create indexes on cache tables

### Monitoring

- Track Mapbox API usage and costs
- Track OpenAI API usage and token costs
- Track cache hit rates
- Alert if cache hit rate < 50%
- Alert if API costs exceed budget
