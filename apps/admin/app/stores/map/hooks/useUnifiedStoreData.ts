/**
 * useUnifiedStoreData - Single source of truth for all store data
 * Ensures consistent counts across map and list components
 */

import { useMemo } from 'react';
import { StoreWithActivity, FilterState } from '../types';
import { useStores } from './useStores';

export interface UnifiedStoreData {
  // Raw data
  allStores: StoreWithActivity[];
  
  // Filtered data
  filteredStores: StoreWithActivity[];
  
  // Map-ready data (valid coordinates only)
  mapStores: StoreWithActivity[];
  
  // Counts (single source of truth)
  counts: {
    total: number;
    filtered: number;
    mapVisible: number;
    active: number;
    activeFiltered: number;
    activeMapVisible: number;
    invalidCoordinates: number;
  };
  
  // Loading and error states
  loading: boolean;
  error: string | null;
  
  // Actions
  refetch: () => void;
  
  // Available filter options
  availableOptions: {
    franchisees: Array<{ id: string; name: string }>;
    regions: string[];
    countries: string[];
  };
}

/**
 * Hook that provides unified store data with consistent counts
 * All UI components should use this hook to ensure data consistency
 */
export function useUnifiedStoreData(filters: FilterState): UnifiedStoreData {
  const { stores: allStores, loading, error, refetch, availableOptions } = useStores(filters);

  // Memoize all data processing to prevent unnecessary recalculations
  const processedData = useMemo(() => {
    console.log('🔄 Processing unified store data with', allStores.length, 'stores');

    // Step 1: Apply filters to all stores
    const filteredStores = allStores.filter(store => {
      if (filters.region && store.region !== filters.region) return false;
      if (filters.country && store.country !== filters.country) return false;
      if (filters.franchiseeId && store.franchiseeId !== filters.franchiseeId) return false;
      return true;
    });

    // Step 2: Filter for valid coordinates (map-ready stores)
    const validStores: StoreWithActivity[] = [];
    const invalidStores: StoreWithActivity[] = [];

    filteredStores.forEach(store => {
      const hasValidCoords = 
        typeof store.latitude === 'number' && 
        typeof store.longitude === 'number' &&
        !isNaN(store.latitude) && 
        !isNaN(store.longitude) &&
        store.latitude >= -90 && store.latitude <= 90 &&
        store.longitude >= -180 && store.longitude <= 180;

      if (hasValidCoords) {
        validStores.push(store);
      } else {
        invalidStores.push(store);
        
        // Log warning for invalid coordinates in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('❌ Invalid coordinates for store:', {
            name: store.name,
            id: store.id,
            lat: store.latitude,
            lng: store.longitude
          });
        }
      }
    });

    // Step 3: Calculate all counts atomically
    const counts = {
      total: allStores.length,
      filtered: filteredStores.length,
      mapVisible: validStores.length,
      active: allStores.filter(s => s.recentActivity).length,
      activeFiltered: filteredStores.filter(s => s.recentActivity).length,
      activeMapVisible: validStores.filter(s => s.recentActivity).length,
      invalidCoordinates: invalidStores.length
    };

    console.log('✅ Unified data processing complete:', counts);

    return {
      allStores,
      filteredStores,
      mapStores: validStores,
      counts
    };
  }, [allStores, filters.region, filters.country, filters.franchiseeId]);

  return {
    ...processedData,
    loading,
    error,
    refetch,
    availableOptions
  };
}

/**
 * Hook for components that only need count information
 * Optimized to prevent unnecessary re-renders
 */
export function useStoreCounts(filters: FilterState) {
  const { counts, loading } = useUnifiedStoreData(filters);
  
  return useMemo(() => ({
    counts,
    loading
  }), [counts, loading]);
}

/**
 * Hook for map components that only need map-ready stores
 * Optimized to prevent unnecessary re-renders
 */
export function useMapStores(filters: FilterState) {
  const { mapStores, counts, loading, error } = useUnifiedStoreData(filters);
  
  return useMemo(() => ({
    stores: mapStores,
    counts: {
      visible: counts.mapVisible,
      active: counts.activeMapVisible,
      total: counts.filtered
    },
    loading,
    error
  }), [mapStores, counts.mapVisible, counts.activeMapVisible, counts.filtered, loading, error]);
}

/**
 * Hook for list components that need all filtered stores
 * Optimized to prevent unnecessary re-renders
 */
export function useListStores(filters: FilterState) {
  const { filteredStores, counts, loading, error } = useUnifiedStoreData(filters);
  
  return useMemo(() => ({
    stores: filteredStores,
    counts: {
      visible: counts.filtered,
      active: counts.activeFiltered,
      total: counts.total,
      invalidCoordinates: counts.invalidCoordinates
    },
    loading,
    error
  }), [filteredStores, counts.filtered, counts.activeFiltered, counts.total, counts.invalidCoordinates, loading, error]);
}