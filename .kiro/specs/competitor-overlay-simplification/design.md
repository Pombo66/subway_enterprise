# Design Document: Competitor Overlay Simplification

## Overview

This design replaces the existing always-on competitor discovery system with a simple on-demand competitor overlay. The new system fetches competitor data from Google Places API only when explicitly requested by the user for a specific location, renders it as a temporary overlay, and does not persist data to the database.

The refactoring also separates the Stores map (simple store visualization) from the Intelligence Map (full AI-powered analysis features).

## Architecture

```mermaid
graph TB
    subgraph Frontend
        IM[Intelligence Map Page]
        SM[Stores Map Page]
        CP[Competitor Panel]
        MV[Map View Component]
        CO[Competitor Overlay Layer]
    end
    
    subgraph Backend
        API[/api/competitors/nearby]
        GPS[Google Places Service]
        Cache[In-Memory Cache]
    end
    
    subgraph External
        GP[Google Places API]
    end
    
    IM --> CP
    IM --> MV
    SM --> MV
    CP -->|Show Competitors| API
    API --> Cache
    Cache -->|Cache Miss| GPS
    GPS --> GP
    API -->|Results| CP
    CP -->|Render| CO
    CO --> MV
```

### Data Flow

1. User selects a store or expansion suggestion on Intelligence Map
2. User clicks "Show competitors (5km)" button in detail panel
3. Frontend calls `POST /api/competitors/nearby` with location
4. Backend checks in-memory cache for existing results
5. On cache miss, backend queries Google Places API for each brand
6. Results are deduplicated, limited, and cached
7. Response returned to frontend with results and summary
8. Frontend renders temporary competitor overlay on Mapbox map
9. On panel close or selection change, overlay is removed

## Components and Interfaces

### Backend Components

#### GooglePlacesNearbyService

New service that replaces `MapboxCompetitorsService` for competitor discovery.

```typescript
interface NearbyCompetitorsRequest {
  lat: number;
  lng: number;
  radiusKm: number;
  brands?: string[];
}

interface CompetitorResult {
  brand: string;
  lat: number;
  lng: number;
  distanceM: number;
  placeName?: string; // Optional, for tooltip only
}

interface NearbyCompetitorsResponse {
  center: { lat: number; lng: number };
  radiusKm: number;
  brands: string[];
  results: CompetitorResult[];
  summary: {
    total: number;
    byBrand: Record<string, { count: number; nearestM: number | null }>;
  };
  source: 'google_places';
  cached: boolean;
}

class GooglePlacesNearbyService {
  private cache: LRUCache<string, NearbyCompetitorsResponse>;
  private readonly DEFAULT_BRANDS = [
    "McDonald's", "Burger King", "KFC", "Domino's", "Starbucks"
  ];
  private readonly MAX_PER_BRAND = 50;
  private readonly MAX_TOTAL = 250;
  private readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
  private readonly CACHE_MAX_SIZE = 100;
  private readonly REQUEST_TIMEOUT_MS = 10000;
  
  async getNearbyCompetitors(request: NearbyCompetitorsRequest): Promise<NearbyCompetitorsResponse>;
  private async searchBrand(brand: string, lat: number, lng: number, radiusM: number): Promise<CompetitorResult[]>;
  private deduplicateResults(results: CompetitorResult[]): CompetitorResult[];
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number;
  private generateCacheKey(request: NearbyCompetitorsRequest): string;
  private buildSummary(results: CompetitorResult[], brands: string[]): NearbyCompetitorsResponse['summary'];
}
```

#### CompetitorsNearbyController

New controller endpoint for on-demand competitor fetching.

```typescript
@Controller('competitors')
class CompetitorsNearbyController {
  @Post('nearby')
  @RateLimit({ limit: 10, windowMs: 60000 })
  async getNearbyCompetitors(@Body() request: NearbyCompetitorsRequest): Promise<NearbyCompetitorsResponse>;
}
```

### Frontend Components

#### CompetitorPanel

New component for the detail panel that controls competitor overlay.

```typescript
interface CompetitorPanelProps {
  selectedLocation: { lat: number; lng: number } | null;
  onCompetitorsLoaded: (results: CompetitorResult[]) => void;
  onCompetitorsCleared: () => void;
}

interface CompetitorPanelState {
  loading: boolean;
  error: string | null;
  competitors: CompetitorResult[] | null;
  summary: NearbyCompetitorsResponse['summary'] | null;
  showCompetitors: boolean;
}
```

#### useCompetitorOverlay Hook

Custom hook to manage competitor overlay lifecycle on the map.

```typescript
interface UseCompetitorOverlayOptions {
  map: mapboxgl.Map | null;
  competitors: CompetitorResult[];
  center: { lat: number; lng: number } | null;
  radiusKm: number;
  visible: boolean;
}

function useCompetitorOverlay(options: UseCompetitorOverlayOptions): {
  isRendered: boolean;
  clear: () => void;
};
```

### API Contracts

#### POST /api/competitors/nearby

Request:
```json
{
  "lat": 51.5074,
  "lng": -0.1278,
  "radiusKm": 5,
  "brands": ["McDonald's", "Burger King", "KFC", "Domino's", "Starbucks"]
}
```

Response:
```json
{
  "center": { "lat": 51.5074, "lng": -0.1278 },
  "radiusKm": 5,
  "brands": ["McDonald's", "Burger King", "KFC", "Domino's", "Starbucks"],
  "results": [
    { "brand": "McDonald's", "lat": 51.5080, "lng": -0.1290, "distanceM": 120 },
    { "brand": "KFC", "lat": 51.5060, "lng": -0.1250, "distanceM": 250 }
  ],
  "summary": {
    "total": 2,
    "byBrand": {
      "McDonald's": { "count": 1, "nearestM": 120 },
      "Burger King": { "count": 0, "nearestM": null },
      "KFC": { "count": 1, "nearestM": 250 },
      "Domino's": { "count": 0, "nearestM": null },
      "Starbucks": { "count": 0, "nearestM": null }
    }
  },
  "source": "google_places",
  "cached": false
}
```

## Data Models

### In-Memory Cache Entry

```typescript
interface CacheEntry {
  response: NearbyCompetitorsResponse;
  timestamp: number;
  key: string;
}
```

### Mapbox Layer Configuration

```typescript
const COMPETITOR_OVERLAY_CONFIG = {
  sourceId: 'competitor-overlay',
  layerIds: {
    icons: 'competitor-icons',
    labels: 'competitor-labels',
    radiusRing: 'competitor-radius-ring'
  },
  brandColors: {
    "McDonald's": '#FFC72C',      // McDonald's yellow
    "Burger King": '#D62300',     // Burger King red
    "KFC": '#F40027',             // KFC red
    "Domino's": '#006491',        // Domino's blue
    "Starbucks": '#00704A'        // Starbucks green
  }
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Deduplication Correctness

*For any* set of competitor results returned from Google Places API queries, after deduplication, no two results should have coordinates within 50 meters of each other.

**Validates: Requirements 1.2**

### Property 2: Result Limits Enforcement

*For any* request to the nearby competitors endpoint, the response results array should contain at most 250 items total, and no more than 50 items for any single brand.

**Validates: Requirements 1.3**

### Property 3: Retry Behavior on Failure

*For any* Google Places API call that fails, the system should retry up to 3 times with exponential backoff before returning an error to the caller.

**Validates: Requirements 1.4**

### Property 4: Response Shape Validation

*For any* successful response from `/api/competitors/nearby`, the response should contain: center coordinates matching the request, radiusKm matching the request, brands array, results array where each item has only (brand, lat, lng, distanceM, optional placeName), and summary with total and byBrand counts with nearest distances.

**Validates: Requirements 1.6, 4.3, 4.4**

### Property 5: Overlay Cleanup on State Change

*For any* state transition that should remove the competitor overlay (panel close, different selection, hide button click), the Mapbox map should have no source named "competitor-overlay" and no layers with IDs starting with "competitor-".

**Validates: Requirements 2.3, 2.4, 2.5**

### Property 6: Summary Accuracy

*For any* competitor results array, the summary.total should equal results.length, and for each brand in summary.byBrand, the count should equal the number of results with that brand, and nearestM should equal the minimum distanceM among results with that brand (or null if count is 0).

**Validates: Requirements 3.3**

### Property 7: Default Brands Behavior

*For any* request to `/api/competitors/nearby` without a brands array, the response should include results searched for all 5 default brands: McDonald's, Burger King, KFC, Domino's, Starbucks.

**Validates: Requirements 4.2**

### Property 8: Rate Limiting Enforcement

*For any* session making more than 10 requests to `/api/competitors/nearby` within 60 seconds, the 11th and subsequent requests should be rejected with a 429 status code.

**Validates: Requirements 4.5**

### Property 9: No Auto-Loading on Viewport Change

*For any* viewport change event on the Intelligence Map, the system should NOT automatically fetch competitor data. Competitor data should only be fetched when the user explicitly clicks "Show competitors".

**Validates: Requirements 5.2**

### Property 10: Expansion and AI Features Preserved

*For any* expansion generation request after the competitor system refactoring, the system should successfully generate expansion suggestions with AI rationales, identical to behavior before the refactoring.

**Validates: Requirements 5.7**

### Property 11: Cache Round-Trip

*For any* request to `/api/competitors/nearby`, if an identical request (same lat, lng, radiusKm, brands) is made within 30 minutes, the second response should have `cached: true` and no Google Places API calls should be made. If made after 30 minutes, `cached` should be `false` and API calls should be made.

**Validates: Requirements 7.1, 7.2, 7.3**

### Property 12: Cache Size Limit

*For any* sequence of requests with unique cache keys, the cache should never contain more than 100 entries. When the 101st unique request is made, the oldest entry should be evicted.

**Validates: Requirements 7.4**

### Property 13: No Database Persistence

*For any* competitor fetch operation, no writes should be made to the CompetitorPlace table or any other database table. All competitor data should exist only in memory.

**Validates: Requirements 1.5, 7.5**

## Error Handling

### Google Places API Errors

| Error Type | Handling Strategy |
|------------|-------------------|
| Network timeout | Retry up to 3 times with exponential backoff (1s, 2s, 4s) |
| Rate limit (429) | Return error immediately, do not retry |
| Invalid API key | Return 500 with message "Competitor service unavailable" |
| Zero results | Return empty results array (not an error) |
| Partial failure | Return results from successful brand queries, log failures |

### Frontend Error States

| State | UI Display |
|-------|------------|
| Loading | Spinner with "Loading competitors..." text |
| Error | Red alert with "Failed to load competitors. Please try again." |
| No results | Info message "No competitors found within 5km" |
| Rate limited | Warning "Too many requests. Please wait a moment." |

## Testing Strategy

### Unit Tests

1. **GooglePlacesNearbyService**
   - Test deduplication algorithm with various input scenarios
   - Test cache key generation
   - Test summary calculation
   - Test distance calculation accuracy

2. **CompetitorPanel Component**
   - Test button state transitions
   - Test loading state display
   - Test error state display
   - Test summary rendering

3. **useCompetitorOverlay Hook**
   - Test layer creation
   - Test layer removal on cleanup
   - Test no layer leaks on rapid state changes

### Property-Based Tests

Property-based tests will use `fast-check` library for TypeScript. Each test will run minimum 100 iterations.

1. **Deduplication Property Test**
   - Generate random arrays of competitor results with some duplicates
   - Verify no two results within 50m after deduplication

2. **Limits Property Test**
   - Generate random large result sets
   - Verify limits are enforced

3. **Summary Accuracy Property Test**
   - Generate random result arrays
   - Verify summary matches actual counts and distances

4. **Cache Behavior Property Test**
   - Generate random request sequences
   - Verify cache hits and misses behave correctly

### Integration Tests

1. **End-to-End Flow**
   - Mock Google Places API responses
   - Test full flow from button click to overlay render

2. **Legacy System Disabled**
   - Verify old endpoints return 410
   - Verify no auto-loading on viewport change

3. **Map View Separation**
   - Verify Stores Map has no competitor button
   - Verify Intelligence Map has competitor button

## Migration Plan

### Phase 1: Add New System (Non-Breaking)

1. Create `GooglePlacesNearbyService` with Google Places API integration
2. Create `/api/competitors/nearby` endpoint
3. Add `CompetitorPanel` component to Intelligence Map
4. Add `useCompetitorOverlay` hook
5. Test new system in isolation

### Phase 2: Disable Legacy System

1. Remove auto-loading of competitors on viewport change
2. Remove "Refresh Competitors" button
3. Update old `/api/competitors/refresh` to return 410 Gone
4. Remove competitor state from `ExpansionIntegratedMapPage`

### Phase 3: Separate Map Views

1. Create simplified `StoresMapPage` component without intelligence features
2. Update `/stores/map` to use `StoresMapPage`
3. Keep `/intelligence-map` using `ExpansionIntegratedMapPage` with new competitor panel

### Phase 4: Cleanup

1. Remove `MapboxCompetitorsService` (or mark as deprecated)
2. Remove unused competitor-related code from `WorkingMapView`
3. Update environment variable documentation
4. Remove `MAPBOX_ACCESS_TOKEN` requirement for competitor features
