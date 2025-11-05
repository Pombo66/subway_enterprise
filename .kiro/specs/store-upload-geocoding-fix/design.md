# Design Document: Store Upload Geocoding Fix

## Overview

This design addresses the critical issue where uploading stores results in only 1 pin appearing on the living map instead of all uploaded stores. Through code analysis, we've identified that the system has all the necessary components (geocoding, database storage, map display), but there may be issues in the data flow or coordinate validation that prevent all stores from appearing on the map.

## Root Cause Analysis

### Current System Flow

1. **Upload Phase** (`/api/stores/upload`):
   - Parses CSV/Excel file
   - Stores all rows in memory cache with `uploadId`
   - Returns sample rows and suggested mapping

2. **Ingest Phase** (`/api/stores/ingest`):
   - Retrieves full dataset from memory cache using `uploadId`
   - Validates and normalizes all rows
   - Geocodes addresses that lack coordinates
   - Saves stores to database with coordinates
   - Emits `stores-imported` event

3. **Map Display** (`/stores/map`):
   - Fetches stores from `/api/stores` endpoint
   - Filters stores with valid `latitude` and `longitude`
   - Renders pins using MapLibre GL

### Potential Issues Identified

1. **Geocoding Service**: May be failing silently for some addresses
2. **Database Persistence**: Coordinates may not be saved correctly
3. **API Response**: `/api/stores` endpoint may not return all stores
4. **Coordinate Validation**: Overly strict validation may filter out valid stores
5. **Event System**: Map may not refresh after upload completes

## Architecture

### Component Interaction Diagram

```
┌─────────────────┐
│  File Upload    │
│  (Frontend)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /api/stores/    │
│    upload       │──────► Memory Cache (uploadId → rows)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ SmartImportModal│
│  (Preview)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /api/stores/    │
│    ingest       │
└────────┬────────┘
         │
         ├──► Validation Service
         │
         ├──► Geocoding Service ──► External APIs (Nominatim, Google, Mapbox)
         │
         ├──► Database (Prisma) ──► PostgreSQL/SQLite
         │
         └──► Event Emitter ──► stores-imported event
                                        │
                                        ▼
                                ┌───────────────┐
                                │  Map Component│
                                │  (useStores)  │
                                └───────┬───────┘
                                        │
                                        ▼
                                ┌───────────────┐
                                │ /api/stores   │
                                │  (GET)        │
                                └───────┬───────┘
                                        │
                                        ▼
                                ┌───────────────┐
                                │ WorkingMapView│
                                │  (MapLibre)   │
                                └───────────────┘
```

## Components and Interfaces

### 1. Geocoding Service Enhancement

**Current Implementation**: `apps/admin/lib/services/geocoding.ts`

**Issues**:
- May not be logging failures properly
- Retry logic may not be working
- Provider fallback may not be implemented

**Design Changes**:
```typescript
interface GeocodeResult {
  status: 'success' | 'failed' | 'pending';
  latitude?: number;
  longitude?: number;
  error?: string;
  provider?: string;
  retryCount?: number;
}

class GeocodingService {
  async batchGeocode(requests: GeocodeRequest[]): Promise<GeocodeResult[]> {
    // Process each request independently
    // Log each attempt with full details
    // Implement retry with exponential backoff
    // Return detailed results for each address
  }
}
```

### 2. Database Persistence Verification

**Current Implementation**: `apps/admin/app/api/stores/ingest/route.ts`

**Issues**:
- May not be validating coordinates before save
- Transaction may be rolling back on partial failures
- Logging may not show actual saved values

**Design Changes**:
```typescript
// Add coordinate validation before database save
function validateCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

// Log actual database values after save
await tx.store.create({
  data: storeData
});
console.log(`✅ Saved store to DB:`, {
  name: storeData.name,
  lat: storeData.latitude,
  lng: storeData.longitude
});
```

### 3. API Response Verification

**Current Implementation**: `apps/admin/app/api/stores/route.ts`

**Issues**:
- May be filtering out stores with null coordinates
- May not be returning all stores from BFF

**Design Changes**:
```typescript
// Add logging to verify all stores are returned
const bffData = await response.json();
console.log(`📊 BFF returned ${bffData.data.length} stores`);
console.log(`📊 Stores with coordinates: ${bffData.data.filter(s => s.latitude && s.longitude).length}`);
return NextResponse.json(bffData.data);
```

### 4. Map Component Filtering

**Current Implementation**: `apps/admin/app/stores/map/components/WorkingMapView.tsx`

**Issues**:
- Coordinate validation may be too strict
- May not be logging filtered stores

**Design Changes**:
```typescript
const validStores = stores.filter(store => {
  const isValid = (
    typeof store.latitude === 'number' && 
    typeof store.longitude === 'number' &&
    !isNaN(store.latitude) && 
    !isNaN(store.longitude) &&
    store.latitude >= -90 &&
    store.latitude <= 90 &&
    store.longitude >= -180 &&
    store.longitude <= 180
  );
  
  if (!isValid) {
    console.warn(`⚠️ Store filtered out:`, {
      name: store.name,
      lat: store.latitude,
      lng: store.longitude,
      latType: typeof store.latitude,
      lngType: typeof store.longitude
    });
  }
  
  return isValid;
});

console.log(`📍 Valid stores for map: ${validStores.length} out of ${stores.length}`);
```

## Data Models

### Store Model (Existing)

```prisma
model Store {
  id             String          @id @default(uuid())
  name           String
  country        String?
  region         String?
  city           String?
  latitude       Float?          // ← Critical field
  longitude      Float?          // ← Critical field
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  
  @@index([latitude, longitude])
}
```

### NormalizedStore Interface

```typescript
interface NormalizedStore {
  name: string;
  address: string;
  city: string;
  postcode?: string;
  country: string;
  region: string;
  latitude?: number;   // ← Must be saved to DB
  longitude?: number;  // ← Must be saved to DB
  externalId?: string;
  status?: string;
}
```

## Error Handling

### Geocoding Errors

```typescript
// Log detailed error information
if (result.status === 'failed') {
  console.error(`❌ Geocoding failed for store:`, {
    name: store.name,
    address: store.address,
    city: store.city,
    postcode: store.postcode,
    country: store.country,
    error: result.error,
    provider: result.provider,
    retryCount: result.retryCount
  });
}
```

### Database Errors

```typescript
try {
  await tx.store.create({ data: storeData });
  console.log(`✅ Created store: ${storeData.name} at (${storeData.latitude}, ${storeData.longitude})`);
} catch (error) {
  console.error(`❌ Failed to save store:`, {
    name: storeData.name,
    coordinates: { lat: storeData.latitude, lng: storeData.longitude },
    error: error.message
  });
  throw error;
}
```

## Testing Strategy

### Unit Tests

1. **Coordinate Validation**:
   - Test valid coordinates (within range)
   - Test invalid coordinates (out of range, NaN, null)
   - Test edge cases (0, 0), (90, 180), (-90, -180)

2. **Geocoding Service**:
   - Test successful geocoding
   - Test failed geocoding with retry
   - Test provider fallback
   - Test batch processing

3. **Database Operations**:
   - Test store creation with coordinates
   - Test store update with coordinates
   - Test coordinate persistence

### Integration Tests

1. **End-to-End Upload Flow**:
   - Upload CSV with 10 stores
   - Verify all 10 stores are geocoded
   - Verify all 10 stores are saved to database
   - Verify all 10 stores appear on map

2. **Map Display**:
   - Verify stores with coordinates are displayed
   - Verify stores without coordinates are not displayed
   - Verify map refreshes after upload

### Manual Testing Checklist

- [ ] Upload CSV with 10 stores containing addresses
- [ ] Verify geocoding progress shows 10/10 completed
- [ ] Check database to confirm all 10 stores have coordinates
- [ ] Navigate to map view
- [ ] Verify 10 pins appear on map
- [ ] Hover over each pin to verify correct store name and address
- [ ] Verify pins are at approximately correct geographic locations

## Debugging Approach

### Phase 1: Add Comprehensive Logging

1. **Ingest API**: Log every step of the process
   - Number of rows received
   - Number of rows validated
   - Number of rows requiring geocoding
   - Geocoding results for each store
   - Database save results for each store

2. **Stores API**: Log what's being returned
   - Total stores from BFF
   - Stores with coordinates
   - Stores without coordinates

3. **Map Component**: Log filtering logic
   - Total stores received
   - Stores filtered out (with reasons)
   - Valid stores for display

### Phase 2: Verify Data at Each Step

1. **After Upload**: Check memory cache
2. **After Geocoding**: Check geocoding results
3. **After Database Save**: Query database directly
4. **After API Fetch**: Check API response
5. **After Map Filter**: Check filtered stores

### Phase 3: Fix Identified Issues

Based on logging output, fix:
- Geocoding failures
- Database save issues
- API response problems
- Map filtering issues

## Performance Considerations

- **Batch Geocoding**: Process addresses in batches of 10-20
- **Rate Limiting**: Respect geocoding provider rate limits
- **Database Transactions**: Use transactions for data consistency
- **Map Rendering**: Use clustering for large numbers of stores
- **Event Debouncing**: Debounce map refresh events

## Security Considerations

- **Input Validation**: Validate all uploaded data
- **Coordinate Bounds**: Enforce valid coordinate ranges
- **SQL Injection**: Use Prisma parameterized queries
- **Rate Limiting**: Prevent abuse of geocoding services

## Deployment Strategy

1. **Add Logging**: Deploy enhanced logging first
2. **Monitor**: Collect logs from production uploads
3. **Identify Issues**: Analyze logs to find root cause
4. **Fix Issues**: Deploy targeted fixes
5. **Verify**: Test with real data to confirm fix

## Success Criteria

- [ ] All uploaded stores are geocoded successfully (or marked as failed with clear reason)
- [ ] All geocoded stores are saved to database with coordinates
- [ ] All stores with coordinates appear on the map
- [ ] Map displays correct number of pins matching uploaded stores
- [ ] Pins appear at approximately correct geographic locations based on addresses
- [ ] Comprehensive logging allows debugging of any failures
