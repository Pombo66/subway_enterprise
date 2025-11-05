# Implementation Plan

- [x] 1. Create IndexedDB cache manager
  - Create new file `apps/admin/lib/cache/store-cache.ts`
  - Define CachedStore and CacheMetadata interfaces
  - Implement StoreCacheManager class with initialize(), getAll(), getByViewport(), set(), update(), delete(), invalidate() methods
  - Add IndexedDB database setup with stores and metadata object stores
  - Create indexes on latitude, longitude, and country fields
  - Implement cache age checking with MAX_AGE_MS constant
  - Add getStats() method for cache statistics
  - Handle IndexedDB errors gracefully with try-catch blocks
  - _Requirements: 3.1, 3.2, 3.4, 10.2_

- [x] 2. Create cache event system
  - Create new file `apps/admin/lib/events/cache-events.ts`
  - Define CacheEvent and CacheEventType interfaces
  - Implement CacheEventBus class with subscribe() and emit() methods
  - Add BroadcastChannel support for cross-tab communication
  - Export helper functions: invalidateStoreCache(), updateStoreInCache(), deleteStoreFromCache()
  - Handle cases where BroadcastChannel is unavailable
  - _Requirements: 5.3, 6.1_

- [x] 3. Create viewport API endpoint
  - Create new file `apps/admin/app/api/stores/viewport/route.ts`
  - Implement GET handler accepting north, south, east, west, zoom parameters
  - Validate viewport bounds parameters
  - Query stores within bounds using Prisma where clause on latitude/longitude
  - Return minimal store fields (id, name, latitude, longitude, country, region)
  - Limit results to 1000 stores for performance
  - Add error handling for invalid bounds and database errors
  - _Requirements: 2.1, 2.2, 8.1, 8.2, 8.3_

- [x] 4. Add database indexes for performance
  - Open `packages/db/prisma/schema.prisma`
  - Add @@index([latitude]) to Store model
  - Add @@index([longitude]) to Store model
  - Add @@index([latitude, longitude]) composite index to Store model
  - Add @@index([country]) to Store model
  - Generate Prisma migration: `pnpm -C packages/db prisma migrate dev --name add_store_indexes`
  - Run migration to apply indexes
  - _Requirements: 8.5_

- [x] 5. Enhance stores API with pagination
  - Open `apps/admin/app/api/stores/route.ts`
  - Add page and limit query parameters with defaults (page=1, limit=100)
  - Calculate skip value for pagination
  - Add total count query using prisma.store.count()
  - Return pagination metadata (page, limit, total, totalPages, hasMore)
  - Maintain backward compatibility with existing filters
  - _Requirements: 1.2, 8.2_

- [x] 6. Enhance useStores hook with caching
  - Open `apps/admin/app/stores/hooks/useStores.ts`
  - Add UseStoresOptions interface with enableCache, viewport, pagination options
  - Add cacheStatus state ('hit' | 'miss' | 'stale' | 'disabled')
  - Initialize StoreCacheManager in useMemo
  - Implement cache-first loading strategy in loadStores()
  - Check cache first, display immediately if found
  - Fetch from API in background if cache is stale
  - Add invalidateCache() function to clear cache
  - Add loadMore() function for pagination
  - Subscribe to cache invalidation events
  - _Requirements: 3.1, 3.2, 3.3, 6.1, 6.2_

- [x] 7. Implement viewport-based map loading
  - Open `apps/admin/app/stores/map/components/WorkingMapView.tsx`
  - Add viewport bounds calculation from map instance
  - Implement debounced viewport change handler (300ms)
  - Call /api/stores/viewport when map moves or zooms
  - Update stores state with viewport results
  - Merge new stores with existing stores to avoid duplicates
  - Add loading indicator during viewport queries
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 8. Add Mapbox clustering configuration
  - Open `apps/admin/app/stores/map/components/WorkingMapView.tsx`
  - Configure GeoJSON source with cluster: true, clusterMaxZoom: 14, clusterRadius: 50
  - Add clusters layer with circle paint style based on point_count
  - Add cluster-count layer with text labels
  - Add unclustered-point layer for individual markers
  - Implement cluster click handler to zoom into cluster
  - Ensure single map style load per session (reuse map instance)
  - _Requirements: 2.3, 4.1, 4.3, 7.1, 7.2, 7.3_

- [x] 9. Integrate cache invalidation on store import
  - Open `apps/admin/app/stores/upload/components/StoreUploadForm.tsx` (or similar)
  - Import invalidateStoreCache from cache-events
  - Call invalidateStoreCache('stores_imported') after successful import
  - Emit store-updated event for other components
  - _Requirements: 5.1, 5.2_

- [x] 10. Add cache invalidation on store mutations
  - Open store create/update/delete API routes
  - Import cache event functions
  - Call updateStoreInCache(storeId) after store update
  - Call deleteStoreFromCache(storeId) after store delete
  - Call invalidateStoreCache('store_created') after store create
  - _Requirements: 5.2_

- [x] 11. Add loading states and indicators
  - Open `apps/admin/app/stores/map/components/ExpansionIntegratedMapPage.tsx`
  - Display "Loading from cache..." when cacheStatus is 'hit' and loading
  - Display "Fetching stores..." when cacheStatus is 'miss' and loading
  - Display subtle refresh indicator when background refresh is happening
  - Show "Loaded X stores" count in UI
  - Add error message display with retry button
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 12. Add manual refresh button
  - Open `apps/admin/app/stores/map/components/ExpansionIntegratedMapPage.tsx`
  - Add "Refresh" button in header or toolbar
  - Call invalidateCache() from useStores hook on click
  - Show loading state during refresh
  - Display last updated timestamp
  - _Requirements: 5.4, 5.5_

- [x] 13. Implement list view pagination
  - Open `apps/admin/app/stores/list/components/StoreList.tsx` (or create if needed)
  - Add pagination controls (Previous, Next, Page numbers)
  - Update useStores hook call with pagination options
  - Implement loadMore() for infinite scroll (optional)
  - Display current page and total pages
  - Maintain scroll position when navigating pages
  - _Requirements: 1.1, 1.2, 1.3_

- [x]* 14. Add virtualized list rendering
  - Install react-window or react-virtuoso: `pnpm add react-window`
  - Open store list component
  - Wrap store list with FixedSizeList or VariableSizeList
  - Configure item height and container height
  - Implement item renderer function
  - Test with 1,400+ stores for smooth scrolling
  - _Requirements: 1.5_

- [x] 15. Add cache statistics endpoint
  - Create new file `apps/admin/app/api/stores/cache/stats/route.ts`
  - Implement GET handler that returns cache statistics
  - Include cache hit rate, size, store count, last update timestamp
  - Add to health check endpoint as optional cache metrics
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 16. Add cache monitoring and logging
  - Open `apps/admin/lib/cache/store-cache.ts`
  - Add console.log statements for cache operations in development mode
  - Log cache hits, misses, invalidations with timestamps
  - Track cache statistics (hits, misses, size)
  - Add performance.now() timing for cache operations
  - _Requirements: 10.3, 10.4_

- [x] 17. Implement fallback for IndexedDB unavailable
  - Open `apps/admin/lib/cache/store-cache.ts`
  - Wrap IndexedDB operations in try-catch blocks
  - Set enableCache to false if IndexedDB initialization fails
  - Log warning message when falling back to API-only mode
  - Ensure all features work without cache
  - _Requirements: 6.5, 6.6_

- [x] 18. Test with large dataset
  - Create database seed script for 10,000+ stores
  - Run seed script: `pnpm -C packages/db prisma:seed:large`
  - Test list view pagination with 10,000 stores
  - Test map viewport loading with 10,000 stores
  - Test clustering performance at various zoom levels
  - Verify cache hit rate after initial load
  - Measure API response times and map render times
  - _Requirements: 1.1, 2.4, 7.5_

- [x] 19. Test cache invalidation scenarios
  - Test cache invalidation on store import
  - Test cache update on store edit
  - Test cache delete on store removal
  - Test cross-tab cache invalidation with BroadcastChannel
  - Test manual refresh button
  - Verify cache rebuilds correctly after invalidation
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 20. Test offline and error scenarios
  - Test with network offline (should use cached data)
  - Test with API returning 500 errors (should use cached data with stale indicator)
  - Test with IndexedDB unavailable (should fall back to API-only)
  - Test with cache quota exceeded (should handle gracefully)
  - Test with corrupted cache (should clear and rebuild)
  - _Requirements: 6.5, 6.6_

- [x] 21. Optimize API response size
  - Open `apps/admin/app/api/stores/route.ts`
  - Add field selection support via query parameter (?fields=id,name,latitude,longitude)
  - Return only requested fields when specified
  - Enable gzip compression in Next.js config
  - Measure response size reduction
  - _Requirements: 8.3, 8.4_

- [x] 22. Add performance monitoring
  - Add performance.mark() and performance.measure() for key operations
  - Measure cache read time, API fetch time, map render time
  - Log performance metrics in development mode
  - Add performance metrics to cache stats endpoint
  - Set up alerts for performance degradation (optional)
  - _Requirements: 10.1, 10.4_

- [x] 23. Update documentation
  - Update README.md with caching architecture explanation
  - Document EXPANSION_MAX_CANDIDATES and other new environment variables
  - Add troubleshooting section for cache issues
  - Document viewport API endpoint usage
  - Add performance tuning guide
  - _Requirements: 6.1_

- [x] 24. Create migration guide
  - Document breaking changes (if any)
  - Provide upgrade instructions for existing deployments
  - Document database migration steps
  - Add rollback procedure if needed
  - Test migration on staging environment
  - _Requirements: 6.2, 6.3_

