/**
 * Optimized useStores hook with caching, proper memoization and no render loops
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { StoreWithActivity, FilterState, UseStoresReturn } from '../types';
import { StoreCacheManager, ViewportBounds } from '../../../../lib/cache/store-cache';
import { cacheEventBus } from '../../../../lib/events/cache-events';

export interface UseStoresOptions {
  filters?: FilterState;
  viewport?: ViewportBounds;
  enableCache?: boolean; // Default: true
}

export type CacheStatus = 'hit' | 'miss' | 'stale' | 'disabled';

/**
 * Hook for fetching and managing store data with caching support
 * Prevents render loops through careful dependency management
 */
export function useStores(filters: FilterState, options?: { enableCache?: boolean; viewport?: ViewportBounds }): UseStoresReturn & { cacheStatus: CacheStatus; invalidateCache: () => Promise<void> } {
  const [rawStores, setRawStores] = useState<StoreWithActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>('miss');
  
  // Use ref to track if we've fetched data to prevent unnecessary refetches
  const hasFetchedRef = useRef(false);
  
  // Cache manager instance
  const cacheManager = useMemo(() => {
    if (options?.enableCache === false) {
      return null;
    }
    return new StoreCacheManager();
  }, [options?.enableCache]);
  
  // Memoize filtered stores to prevent unnecessary recalculations
  const filteredStores = useMemo(() => {
    console.log('🔄 Filtering stores with filters:', filters);
    
    return rawStores.filter(store => {
      // Filter out stores without valid coordinates for map display
      // This prevents stores with null, undefined, 0, or invalid coordinates from showing on the map
      const hasValidCoords = 
        typeof store.latitude === 'number' && 
        typeof store.longitude === 'number' &&
        !isNaN(store.latitude) && 
        !isNaN(store.longitude) &&
        store.latitude !== 0 &&
        store.longitude !== 0 &&
        store.latitude >= -90 && store.latitude <= 90 &&
        store.longitude >= -180 && store.longitude <= 180;
      
      if (!hasValidCoords) {
        console.log(`📍 Filtering out store without valid coordinates: ${store.name} (${store.latitude}, ${store.longitude})`);
        return false;
      }
      
      // Filter out stores in the Americas (seed data cleanup)
      // Americas roughly: longitude between -170 and -30
      // This filters out the seed stores from New York, Toronto, Los Angeles, etc.
      const isInAmericas = store.longitude < -30 && store.longitude > -170;
      if (isInAmericas) {
        console.log(`📍 Filtering out Americas store (seed data): ${store.name} (${store.latitude}, ${store.longitude})`);
        return false;
      }
      
      // Region/country/franchisee filters
      if (filters.region && store.region !== filters.region) return false;
      if (filters.country && store.country !== filters.country) return false;
      if (filters.franchiseeId && store.franchiseeId !== filters.franchiseeId) return false;
      
      // Legacy single status filter (for list view compatibility)
      if (filters.status && store.status !== filters.status) return false;
      
      // Multi-select status filters (for map view)
      if (filters.statusFilters) {
        const { showOpen, showClosed, showPlanned, showExpansions } = filters.statusFilters;
        
        // Check if only expansions are enabled (all store types are disabled)
        const onlyExpansionsEnabled = showOpen === false && showClosed === false && showPlanned === false && showExpansions !== false;
        if (onlyExpansionsEnabled) {
          // Hide all stores when only expansion suggestions should be visible
          return false;
        }
        
        // If all store types are undefined or true, show all stores
        const allStoreTypesEnabled = showOpen !== false && showClosed !== false && showPlanned !== false;
        if (allStoreTypesEnabled) return true;
        
        // Otherwise, check if this store's status is enabled
        const storeStatus = store.status || 'Open'; // Default to Open if no status
        if (storeStatus === 'Open' && showOpen === false) return false;
        if (storeStatus === 'Closed' && showClosed === false) return false;
        if (storeStatus === 'Planned' && showPlanned === false) return false;
      }
      
      return true;
    });
  }, [rawStores, filters.region, filters.country, filters.franchiseeId, filters.status, filters.statusFilters]); // Explicit dependencies

  // State for franchisee data
  const [franchisees, setFranchisees] = useState<Array<{id: string, name: string}>>([]);

  // Fetch franchisees data
  const loadFranchisees = useCallback(async () => {
    try {
      const response = await fetch('/api/franchisees');
      if (!response.ok) return;
      
      const data = await response.json();
      if (data.franchisees && Array.isArray(data.franchisees)) {
        const franchiseeOptions = data.franchisees.map((f: any) => ({
          id: f.id,
          name: f.name
        }));
        setFranchisees(franchiseeOptions);
      }
    } catch (error) {
      console.error('Failed to load franchisees:', error);
    }
  }, []);

  // Load franchisees on mount
  useEffect(() => {
    loadFranchisees();
  }, [loadFranchisees]);

  // Memoize available options to prevent unnecessary recalculations
  const availableOptions = useMemo(() => {
    const regions = Array.from(new Set(rawStores.map(store => store.region)));
    const countries = Array.from(new Set(rawStores.map(store => store.country)));
    
    return { franchisees, regions, countries };
  }, [rawStores, franchisees]); // Depends on rawStores and franchisees

  // Load stores from cache or API
  const loadStores = useCallback(async () => {
    if (!cacheManager) {
      // Cache disabled, fetch directly from API
      setCacheStatus('disabled');
      await fetchFromAPI();
      return;
    }

    try {
      // Initialize cache
      await cacheManager.initialize();

      // Try cache first
      const cached = await cacheManager.getAll();
      if (cached.length > 0) {
        console.log(`📦 Cache hit: ${cached.length} stores loaded from IndexedDB`);
        const stores = cached.map(store => ({
          ...store,
          franchiseeId: store.id, // Use id as franchiseeId
          recentActivity: false
        })) as StoreWithActivity[];
        
        setRawStores(stores);
        setCacheStatus('hit');
        setLoading(false);

        // Check if cache is stale and refresh in background
        const isStale = await cacheManager.isStale();
        if (isStale) {
          console.log('⏰ Cache is stale, refreshing in background...');
          setCacheStatus('stale');
          await refreshInBackground();
        }
      } else {
        // Cache miss
        console.log('📦 Cache miss: fetching from API');
        setCacheStatus('miss');
        await fetchFromAPI();
      }
    } catch (error) {
      console.error('Cache error, falling back to API:', error);
      setCacheStatus('disabled');
      await fetchFromAPI();
    }
  }, [cacheManager]);

  // Fetch from API and update cache
  const fetchFromAPI = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stores');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stores: ${response.status}`);
      }
      
      const storesData = await response.json();
      
      // Handle different response formats
      let stores: StoreWithActivity[] = [];
      if (Array.isArray(storesData)) {
        stores = storesData.map(store => ({
          ...store,
          franchiseeId: store.franchiseeId || 'unknown',
          status: store.status || 'active',
          recentActivity: Math.random() < 0.3
        }));
      } else if (storesData.stores && Array.isArray(storesData.stores)) {
        stores = storesData.stores.map(store => ({
          ...store,
          franchiseeId: store.franchiseeId || 'unknown',
          status: store.status || 'active',
          recentActivity: Math.random() < 0.3
        }));
      } else if (storesData.success && Array.isArray(storesData.data)) {
        stores = storesData.data.map(store => ({
          ...store,
          franchiseeId: store.franchiseeId || 'unknown',
          status: store.status || 'active',
          recentActivity: Math.random() < 0.3
        }));
      }
      
      setRawStores(stores);
      
      // Update cache
      if (cacheManager && stores.length > 0) {
        await cacheManager.set(stores.map(s => ({
          id: s.id,
          name: s.name,
          latitude: s.latitude || 0,
          longitude: s.longitude || 0,
          country: s.country || '',
          region: s.region || null,
          address: s.city || null,
          status: s.status || 'active',
          annualTurnover: s.annualTurnover || null,
          cityPopulationBand: s.cityPopulationBand || null,
          createdAt: s.createdAt || new Date().toISOString(),
          updatedAt: s.updatedAt || new Date().toISOString()
        })));
      }
      
      setLoading(false);
      console.log('✅ Store data fetched:', stores.length, 'stores');
    } catch (err) {
      console.error('❌ Failed to fetch stores:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stores');
      setRawStores([]);
      setLoading(false);
    }
  }, [cacheManager]);

  // Refresh in background without showing loading state
  const refreshInBackground = useCallback(async () => {
    try {
      const response = await fetch('/api/stores');
      if (!response.ok) return;
      
      const storesData = await response.json();
      let stores: StoreWithActivity[] = [];
      
      if (Array.isArray(storesData)) {
        stores = storesData.map(store => ({
          ...store,
          franchiseeId: store.franchiseeId || 'unknown',
          status: store.status || 'active',
          recentActivity: Math.random() < 0.3
        }));
      } else if (storesData.stores && Array.isArray(storesData.stores)) {
        stores = storesData.stores.map(store => ({
          ...store,
          franchiseeId: store.franchiseeId || 'unknown',
          status: store.status || 'active',
          recentActivity: Math.random() < 0.3
        }));
      }
      
      if (stores.length > 0) {
        setRawStores(stores);
        
        // Update cache
        if (cacheManager) {
          await cacheManager.set(stores.map(s => ({
            id: s.id,
            name: s.name,
            latitude: s.latitude || 0,
            longitude: s.longitude || 0,
            country: s.country || '',
            region: s.region || null,
            address: s.city || null,
            status: s.status || 'active',
            annualTurnover: s.annualTurnover || null,
            cityPopulationBand: s.cityPopulationBand || null,
            createdAt: s.createdAt || new Date().toISOString(),
            updatedAt: s.updatedAt || new Date().toISOString()
          })));
        }
        
        setCacheStatus('hit');
        console.log('✅ Background refresh complete');
      }
    } catch (error) {
      console.error('Background refresh failed:', error);
    }
  }, [cacheManager]);

  // Invalidate cache
  const invalidateCache = useCallback(async () => {
    if (cacheManager) {
      await cacheManager.invalidate();
      console.log('🗑️  Cache invalidated, refetching...');
      await loadStores();
    }
  }, [cacheManager, loadStores]);

  // Stable refetch function
  const refetch = useCallback(async () => {
    console.log('🔄 Refetching store data');
    await loadStores();
  }, [loadStores]);

  // Initial data fetch effect - only runs once
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      console.log('🎣 Initial store data fetch');
      loadStores();
    }
  }, [loadStores]);

  // Subscribe to cache invalidation events
  useEffect(() => {
    const unsubscribe = cacheEventBus.subscribe('invalidate', (event) => {
      console.log('📡 Cache invalidation event received:', event.reason);
      invalidateCache();
    });

    return () => {
      unsubscribe();
    };
  }, [invalidateCache]);

  return {
    stores: filteredStores,
    loading,
    error,
    refetch,
    availableOptions,
    cacheStatus,
    invalidateCache
  };
}