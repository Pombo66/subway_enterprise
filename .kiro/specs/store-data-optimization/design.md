# Design Document

## Overview

This design implements a scalable, cache-first architecture for handling large store datasets (1,400+ currently, 30k+ future) with minimal Mapbox API usage and optimal performance. The solution uses IndexedDB for local caching, viewport-based queries for map loading, and efficient pagination for list views.

### Key Design Principles

1. **Cache-First Strategy**: Load from cache immediately, refresh in background
2. **Viewport-Based Loading**: Only fetch stores visible on the map
3. **Minimal Mapbox Usage**: Single map style load per session, no additional hits for markers
4. **Progressive Enhancement**: Caching is optional, system works without it
5. **Backward Compatibility**: Existing features continue to work unchanged

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                              │
│  ┌──────────────┐         ┌─────────────────┐              │
│  │  List View   │         │    Map View     │              │
│  │              │         │                 │              │
│  │  - Pagination│         │  - Viewport     │              │
│  │  - Infinite  │         │  - Clustering   │              │
│  │    Scroll    │         │  - Markers      │              │
│  └──────┬───────┘         └────────┬────────┘              │
│         │                          │                        │
│         └──────────┬───────────────┘                        │
│                    │                                        │
│         ┌──────────▼──────────┐                            │
│         │   useStores Hook    │                            │
│         │  (Enhanced)         │                            │
│         │                     │                            │
│         │  - Cache Manager    │                            │
│         │  - Viewport Query   │                            │
│         │  - Pagination       │                            │
│         └──────────┬──────────┘                            │
│                    │                                        │
│         ┌──────────▼──────────┐                            │
│         │   IndexedDB Cache   │                            │
│         │                     │                            │
│         │  - Store Data       │                            │
│         │  - Metadata         │                            │
│         │  - Timestamps       │                            │
│         └──────────┬──────────┘                            │
│                    │                                        │
└────────────────────┼────────────────────────────────────────┘
                     │
                     │ HTTP
                     │
┌────────────────────▼────────────────────────────────────────┐
│                     Server                                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  GET /api/stores                                      │  │
│  │  - Pagination (page, limit)                          │  │
│  │  - Filters (country, region, status)                 │  │
│  │  - Returns: { stores, total, page, hasMore }        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  GET /api/stores/viewport                            │  │
│  │  - Bounds (north, south, east, west)                │  │
│  │  - Zoom level                                        │  │
│  │  - Returns: { stores: [id, lat, lng, name] }        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  GET /api/stores/:id                                 │  │
│  │  - Full store details                                │  │
│  │  - Returns: { store: {...} }                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Database (SQLite/PostgreSQL)                        │  │
│  │  - Indexed on (latitude, longitude)                  │  │
│  │  - Indexed on (country, region)                      │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Initial Load (Cache Miss)
```
1. User opens stores page
2. useStores checks IndexedDB cache
3. Cache miss → Fetch from API
4. Display loading state
5. API returns stores
6. Store in IndexedDB
7. Render stores
8. Background: Check for updates
```

#### Subsequent Load (Cache Hit)
```
1. User opens stores page
2. useStores checks IndexedDB cache
3. Cache hit → Load from cache (instant)
4. Render cached stores immediately
5. Background: Fetch updates from API
6. If updates found → Update cache + re-render
7. If no updates → Continue with cached data
```

#### Viewport-Based Map Loading
```
1. Map initializes with viewport bounds
2. Calculate north, south, east, west
3. Check cache for viewport stores
4. If cached → Render immediately
5. Fetch from /api/stores/viewport
6. Render new stores
7. Apply clustering
8. User pans/zooms → Repeat for new viewport
```

## Components and Interfaces

### 1. IndexedDB Cache Manager

**Location**: `apps/admin/lib/cache/store-cache.ts` (new file)

```typescript
export interface CachedStore {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  region: string;
  // ... other essential fields
}

export interface CacheMetadata {
  version: string;
  timestamp: number;
  storeCount: number;
  lastImportDate: string | null;
}

export class StoreCacheManager {
  private readonly DB_NAME = 'subway_stores';
  private readonly STORE_TABLE = 'stores';
  private readonly META_TABLE = 'metadata';
  private readonly CACHE_VERSION = 1;
  private readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  async initialize(): Promise<void> {
    // Open IndexedDB connection
    // Create object stores if needed
  }

  async getAll(): Promise<CachedStore[]> {
    // Retrieve all stores from cache
  }

  async getByViewport(bounds: ViewportBounds): Promise<CachedStore[]> {
    // Query stores within viewport bounds
    // Use IndexedDB index on lat/lng
  }

  async set(stores: CachedStore[]): Promise<void> {
    // Store all stores in cache
    // Update metadata
  }

  async update(store: CachedStore): Promise<void> {
    // Update single store
  }

  async delete(storeId: string): Promise<void> {
    // Remove store from cache
  }

  async invalidate(): Promise<void> {
    // Clear all cached data
    // Reset metadata
  }

  async getMetadata(): Promise<CacheMetadata | null> {
    // Retrieve cache metadata
  }

  async isStale(): Promise<boolean> {
    // Check if cache is older than MAX_AGE_MS
  }

  getStats(): CacheStats {
    // Return cache statistics
  }
}
```

### 2. Enhanced useStores Hook

**Location**: `apps/admin/app/stores/hooks/useStores.ts` (modify existing)

```typescript
export interface UseStoresOptions {
  filters?: StoreFilters;
  viewport?: ViewportBounds;
  pagination?: {
    page: number;
    limit: number;
  };
  enableCache?: boolean; // Default: true
}

export interface UseStoresResult {
  stores: Store[];
  loading: boolean;
  error: Error | null;
  total: number;
  hasMore: boolean;
  cacheStatus: 'hit' | 'miss' | 'stale' | 'disabled';
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  invalidateCache: () => Promise<void>;
}

export function useStores(options: UseStoresOptions): UseStoresResult {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [cacheStatus, setCacheStatus] = useState<'hit' | 'miss' | 'stale' | 'disabled'>('miss');
  
  const cacheManager = useMemo(() => new StoreCacheManager(), []);

  useEffect(() => {
    loadStores();
  }, [options.filters, options.viewport, options.pagination]);

  async function loadStores() {
    if (!options.enableCache) {
      // Bypass cache, fetch directly from API
      await fetchFromAPI();
      return;
    }

    // Try cache first
    const cached = await cacheManager.getAll();
    if (cached.length > 0) {
      setStores(cached);
      setCacheStatus('hit');
      setLoading(false);

      // Background refresh
      const isStale = await cacheManager.isStale();
      if (isStale) {
        await refreshInBackground();
      }
    } else {
      // Cache miss
      setCacheStatus('miss');
      await fetchFromAPI();
    }
  }

  async function fetchFromAPI() {
    // Fetch from /api/stores or /api/stores/viewport
    // Store in cache
    // Update state
  }

  async function refreshInBackground() {
    // Fetch updates without showing loading state
    // Update cache if changes detected
  }

  return {
    stores,
    loading,
    error,
    total,
    hasMore,
    cacheStatus,
    refetch: loadStores,
    loadMore,
    invalidateCache: () => cacheManager.invalidate()
  };
}
```

### 3. Viewport-Based API Endpoint

**Location**: `apps/admin/app/api/stores/viewport/route.ts` (new file)

```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const north = parseFloat(searchParams.get('north') || '');
  const south = parseFloat(searchParams.get('south') || '');
  const east = parseFloat(searchParams.get('east') || '');
  const west = parseFloat(searchParams.get('west') || '');
  const zoom = parseInt(searchParams.get('zoom') || '10');

  // Validate bounds
  if (isNaN(north) || isNaN(south) || isNaN(east) || isNaN(west)) {
    return NextResponse.json(
      { error: 'Invalid viewport bounds' },
      { status: 400 }
    );
  }

  try {
    // Query stores within bounds
    const stores = await prisma.store.findMany({
      where: {
        latitude: {
          gte: south,
          lte: north
        },
        longitude: {
          gte: west,
          lte: east
        }
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        country: true,
        region: true
      },
      take: 1000 // Limit for performance
    });

    return NextResponse.json({
      stores,
      count: stores.length,
      viewport: { north, south, east, west },
      zoom
    });
  } catch (error) {
    console.error('Viewport query error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}
```

### 4. Enhanced Stores API with Pagination

**Location**: `apps/admin/app/api/stores/route.ts` (modify existing)

```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '100');
  const skip = (page - 1) * limit;

  // Filters
  const country = searchParams.get('country');
  const region = searchParams.get('region');
  const status = searchParams.get('status');

  try {
    const where: any = {};
    if (country) where.country = country;
    if (region) where.region = region;
    if (status) where.status = status;

    // Get total count
    const total = await prisma.store.count({ where });

    // Get paginated stores
    const stores = await prisma.store.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      stores,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + stores.length < total
      }
    });
  } catch (error) {
    console.error('Store query error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}
```

### 5. Cache Invalidation Event System

**Location**: `apps/admin/lib/events/cache-events.ts` (new file)

```typescript
export type CacheEventType = 'invalidate' | 'update' | 'delete';

export interface CacheEvent {
  type: CacheEventType;
  timestamp: number;
  storeId?: string;
  reason?: string;
}

class CacheEventBus {
  private listeners: Map<CacheEventType, Set<(event: CacheEvent) => void>> = new Map();

  subscribe(type: CacheEventType, callback: (event: CacheEvent) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  emit(event: CacheEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }

    // Broadcast to other tabs via BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('store_cache');
      channel.postMessage(event);
      channel.close();
    }
  }
}

export const cacheEventBus = new CacheEventBus();

// Helper functions
export function invalidateStoreCache(reason?: string) {
  cacheEventBus.emit({
    type: 'invalidate',
    timestamp: Date.now(),
    reason
  });
}

export function updateStoreInCache(storeId: string) {
  cacheEventBus.emit({
    type: 'update',
    timestamp: Date.now(),
    storeId
  });
}

export function deleteStoreFromCache(storeId: string) {
  cacheEventBus.emit({
    type: 'delete',
    timestamp: Date.now(),
    storeId
  });
}
```

### 6. Map Clustering Configuration

**Location**: `apps/admin/app/stores/map/components/WorkingMapView.tsx` (modify existing)

```typescript
// Mapbox clustering configuration
const clusterConfig = {
  cluster: true,
  clusterMaxZoom: 14, // Max zoom to cluster points
  clusterRadius: 50, // Radius of each cluster when clustering points
  clusterProperties: {
    // Count stores in cluster
    storeCount: ['+', 1]
  }
};

// GeoJSON source for stores
const storesGeoJSON = {
  type: 'FeatureCollection',
  features: stores.map(store => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [store.longitude, store.latitude]
    },
    properties: {
      id: store.id,
      name: store.name,
      country: store.country
    }
  }))
};

// Add source and layers
map.addSource('stores', {
  type: 'geojson',
  data: storesGeoJSON,
  ...clusterConfig
});

// Cluster layer
map.addLayer({
  id: 'clusters',
  type: 'circle',
  source: 'stores',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': [
      'step',
      ['get', 'point_count'],
      '#51bbd6', 100,
      '#f1f075', 500,
      '#f28cb1'
    ],
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      20, 100,
      30, 500,
      40
    ]
  }
});

// Cluster count layer
map.addLayer({
  id: 'cluster-count',
  type: 'symbol',
  source: 'stores',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 12
  }
});

// Unclustered point layer
map.addLayer({
  id: 'unclustered-point',
  type: 'circle',
  source: 'stores',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': '#11b4da',
    'circle-radius': 8,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#fff'
  }
});
```

## Data Models

### IndexedDB Schema

```typescript
// Database: subway_stores
// Version: 1

// Object Store: stores
interface StoreRecord {
  id: string; // Primary key
  name: string;
  latitude: number; // Indexed
  longitude: number; // Indexed
  country: string; // Indexed
  region: string;
  address: string;
  status: string;
  annualTurnover: number | null;
  cityPopulationBand: string | null;
  createdAt: string;
  updatedAt: string;
}

// Object Store: metadata
interface MetadataRecord {
  key: string; // Primary key (e.g., 'cache_info')
  version: string;
  timestamp: number;
  storeCount: number;
  lastImportDate: string | null;
}

// Indexes
// - stores.latitude
// - stores.longitude
// - stores.country
// - stores.id (primary)
```

### API Response Types

```typescript
// GET /api/stores
interface StoresResponse {
  stores: Store[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// GET /api/stores/viewport
interface ViewportResponse {
  stores: MinimalStore[];
  count: number;
  viewport: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoom: number;
}

interface MinimalStore {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  region: string;
}
```

## Error Handling

### Cache Errors
- **IndexedDB unavailable**: Fall back to API-only mode
- **Cache corruption**: Clear cache and rebuild
- **Quota exceeded**: Implement LRU eviction or clear old data

### API Errors
- **Network failure**: Use cached data with stale indicator
- **Timeout**: Retry with exponential backoff
- **500 errors**: Show error message with retry button

### Map Errors
- **Mapbox load failure**: Show error state with fallback
- **Clustering failure**: Disable clustering, show all markers
- **Viewport query failure**: Fall back to full dataset

## Performance Optimizations

### 1. Database Indexing

```sql
-- SQLite/PostgreSQL indexes
CREATE INDEX idx_stores_latitude ON stores(latitude);
CREATE INDEX idx_stores_longitude ON stores(longitude);
CREATE INDEX idx_stores_country ON stores(country);
CREATE INDEX idx_stores_region ON stores(region);
CREATE INDEX idx_stores_lat_lng ON stores(latitude, longitude);
```

### 2. API Response Optimization

- Return only essential fields for map markers
- Use pagination for list views
- Implement field selection (`?fields=id,name,latitude,longitude`)
- Enable gzip compression

### 3. Frontend Optimization

- Virtualize list rendering (react-window or react-virtuoso)
- Debounce viewport queries (300ms)
- Memoize expensive computations
- Use Web Workers for cache operations

### 4. Caching Strategy

- **Stale-While-Revalidate**: Show cached data, fetch updates in background
- **Cache-First**: Always try cache before API
- **Network-First for Mutations**: Always hit API for create/update/delete

## Testing Strategy

### Unit Tests
- StoreCacheManager methods
- useStores hook logic
- Cache invalidation events
- Viewport bounds calculations

### Integration Tests
- Cache + API interaction
- Pagination flow
- Viewport loading
- Cache invalidation on import

### Performance Tests
- Load 10,000 stores in list
- Render 1,000 markers on map
- Cache read/write speed
- Viewport query performance

### Manual Testing
- Test with 1,400 stores
- Test with 10,000+ stores (seed data)
- Test cache invalidation
- Test offline behavior
- Test multiple tabs

## Migration Plan

### Phase 1: Infrastructure (Week 1)
1. Create StoreCacheManager
2. Add IndexedDB setup
3. Create cache event system
4. Add viewport API endpoint

### Phase 2: Integration (Week 2)
1. Enhance useStores hook
2. Update WorkingMapView with clustering
3. Add pagination to list view
4. Implement cache invalidation

### Phase 3: Optimization (Week 3)
1. Add database indexes
2. Optimize API responses
3. Implement virtualized list
4. Add monitoring and stats

### Phase 4: Testing & Polish (Week 4)
1. Performance testing
2. Bug fixes
3. Documentation
4. Rollout to production

## Monitoring and Metrics

### Key Metrics
- Cache hit rate (target: >80%)
- API response time (target: <200ms)
- Map render time (target: <1s)
- Mapbox API calls per session (target: 1-2)
- Cache size (monitor for quota issues)

### Logging
```typescript
console.log('📊 Store Cache Stats:', {
  hitRate: '85%',
  cacheSize: '2.3 MB',
  storeCount: 1432,
  lastUpdate: '2025-10-31T10:00:00Z',
  mapboxCalls: 1
});
```

## Backward Compatibility

- Cache can be disabled via `enableCache: false`
- Existing API endpoints remain unchanged
- New viewport endpoint is additive
- Fallback to non-cached mode if IndexedDB unavailable
- All existing features continue to work

## Security Considerations

- Cache only non-sensitive store data
- Validate viewport bounds to prevent abuse
- Rate limit viewport API endpoint
- Clear cache on logout
- Sanitize cached data before rendering

