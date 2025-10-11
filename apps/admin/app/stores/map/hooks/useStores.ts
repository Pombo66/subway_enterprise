/**
 * Custom hook for managing store data fetching and activity computation
 * Implements polling, filtering, and fallback logic for the Living Map feature
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { bff, bffWithErrorHandling } from '../../../../lib/api';
import { z } from 'zod';
import { 
  StoreWithActivity, 
  FilterState, 
  FilterOptions, 
  UseStoresReturn,
  RecentOrdersResponse 
} from '../types';
import { MapTelemetryHelpers, safeTrackEvent, getCurrentUserId } from '../telemetry';
import { MapPerformanceHelpers } from '../performance';

// Zod schemas for API validation
const StoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string().nullable(),
  region: z.string().nullable(),
  city: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const StoresResponseSchema = z.array(StoreSchema);

const RecentOrdersSchema = z.object({
  orders: z.array(z.object({
    id: z.string(),
    storeId: z.string(),
    createdAt: z.string(),
    Store: z.object({
      id: z.string(),
      name: z.string(),
    }),
  })),
  pagination: z.object({
    total: z.number(),
  }),
});

// Constants
const POLLING_INTERVAL = 15000; // 15 seconds
const DEBOUNCE_DELAY = 500; // 500ms debounce for filter changes
const ACTIVITY_THRESHOLD = 60 * 60 * 1000; // 60 minutes in milliseconds
const MOCK_ACTIVITY_PERCENTAGE = 0.1; // 10% of stores get mock activity
const ACTIVITY_CACHE_TTL = 30000; // 30 seconds cache for activity data

// Activity cache interface
interface ActivityCache {
  data: Map<string, boolean>;
  timestamp: number;
  isMockData: boolean;
}

/**
 * Custom hook for managing store data with activity indicators
 */
export function useStores(filters: FilterState): UseStoresReturn {
  const [stores, setStores] = useState<StoreWithActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [availableOptions, setAvailableOptions] = useState<FilterOptions>({
    franchisees: [],
    regions: [],
    countries: [],
  });

  const maxRetries = 3;

  // Refs for managing polling and debouncing
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFiltersRef = useRef<FilterState>(filters);
  const activityCacheRef = useRef<ActivityCache | null>(null);

  /**
   * Fetches stores from the BFF API with current filters and retry logic
   */
  const fetchStores = useCallback(async (currentFilters: FilterState, attempt: number = 0): Promise<any[]> => {
    // Build query parameters
    const params = new URLSearchParams();
    if (currentFilters.region) {
      params.append('region', currentFilters.region);
    }
    if (currentFilters.country) {
      params.append('country', currentFilters.country);
    }
    // Note: franchiseeId is not supported by current BFF API
    // This will be handled gracefully by ignoring the filter

    const queryString = params.toString();
    const endpoint = `/stores${queryString ? `?${queryString}` : ''}`;

    console.log('🔍 Fetching stores:', {
      endpoint,
      queryString,
      filters: currentFilters,
      attempt: attempt + 1,
      bffBaseUrl: typeof window !== 'undefined' ? 'client-side' : 'server-side'
    });

    try {

      // Wrap API call with performance monitoring
      const result = await MapPerformanceHelpers.wrapAPICall(
        endpoint,
        'GET',
        () => bffWithErrorHandling(endpoint, StoresResponseSchema)
      );
      
      console.log('📊 API Result:', {
        success: result.success,
        dataLength: result.success ? result.data?.length : 0,
        error: result.success ? null : result.error
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Reset retry count on successful fetch
      setRetryCount(0);
      return result.data;
    } catch (err) {
      console.error(`Error fetching stores (attempt ${attempt + 1}):`, err);
      console.error('Full error details:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        endpoint,
        filters: currentFilters,
        attempt: attempt + 1,
        maxRetries
      });
      
      // Track API failure with retry information
      const monitor = MapPerformanceHelpers.getMonitor();
      monitor.trackAPICall({
        endpoint: `/stores`,
        method: 'GET',
        responseTime: 0, // Unknown for failed calls
        success: false,
        errorMessage: err instanceof Error ? err.message : String(err),
        retryCount: attempt,
      });
      
      // Retry logic with exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchStores(currentFilters, attempt + 1);
      }
      
      throw err;
    }
  }, [maxRetries]);

  /**
   * Checks if activity cache is still valid
   */
  const isActivityCacheValid = useCallback((): boolean => {
    if (!activityCacheRef.current) return false;
    
    const now = Date.now();
    const cacheAge = now - activityCacheRef.current.timestamp;
    return cacheAge < ACTIVITY_CACHE_TTL;
  }, []);

  /**
   * Attempts to fetch recent orders for activity computation
   * Falls back to mock data if the endpoint is unavailable
   * Implements caching to reduce API calls
   */
  const fetchRecentActivity = useCallback(async (storeIds: string[]): Promise<{ activityMap: Map<string, boolean>; isMockData: boolean }> => {
    // Check cache first
    if (isActivityCacheValid()) {
      const cached = activityCacheRef.current!;
      return { 
        activityMap: new Map(cached.data), 
        isMockData: cached.isMockData 
      };
    }

    const activityMap = new Map<string, boolean>();
    let isMockData = false;

    try {
      // Try to fetch recent orders from the last hour
      const params = new URLSearchParams({
        dateRange: 'hour',
        limit: '1000', // Get a large number to capture all recent activity
      });

      const result = await bffWithErrorHandling(`/orders/recent?${params}`, RecentOrdersSchema);
      
      if (result.success) {
        // Process orders to determine which stores have recent activity
        const now = Date.now();
        const recentStoreIds = new Set<string>();

        result.data.orders.forEach(order => {
          const orderTime = new Date(order.createdAt).getTime();
          if (now - orderTime <= ACTIVITY_THRESHOLD) {
            recentStoreIds.add(order.Store.id);
          }
        });

        // Set activity for stores with recent orders
        recentStoreIds.forEach(storeId => {
          activityMap.set(storeId, true);
        });

        // Cache the real activity data
        activityCacheRef.current = {
          data: new Map(activityMap),
          timestamp: Date.now(),
          isMockData: false,
        };

        console.log(`Found ${recentStoreIds.size} stores with recent activity from API`);
        return { activityMap, isMockData: false };
      }
    } catch (err) {
      console.warn('Failed to fetch recent orders, falling back to mock activity:', err);
    }

    // Fallback to mock activity data
    const mockActivityMap = generateMockActivity(storeIds);
    
    // Cache the mock activity data
    activityCacheRef.current = {
      data: new Map(mockActivityMap),
      timestamp: Date.now(),
      isMockData: true,
    };

    return { activityMap: mockActivityMap, isMockData: true };
  }, [isActivityCacheValid]);

  /**
   * Generates mock activity for approximately 10% of stores
   * Uses deterministic approach for consistency across renders
   */
  const generateMockActivity = useCallback((storeIds: string[]): Map<string, boolean> => {
    const activityMap = new Map<string, boolean>();
    const isDebugMode = process.env.NEXT_PUBLIC_DEBUG === 'true';

    // Use a deterministic approach based on store ID to ensure consistency
    storeIds.forEach(storeId => {
      // Simple hash function to get consistent pseudo-random behavior
      const hash = storeId.split('').reduce((acc, char) => {
        return ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff;
      }, 0);
      
      const shouldHaveActivity = Math.abs(hash) % 100 < (MOCK_ACTIVITY_PERCENTAGE * 100);
      
      if (shouldHaveActivity) {
        activityMap.set(storeId, true);
      }
    });

    if (isDebugMode) {
      console.log(`Generated mock activity for ${activityMap.size} out of ${storeIds.length} stores (MOCK DATA)`);
    }

    return activityMap;
  }, []);

  /**
   * Combines store data with activity indicators
   * Implements fallback logic and debug flag support
   */
  const combineStoresWithActivity = useCallback(async (rawStores: any[]): Promise<StoreWithActivity[]> => {
    const storeIds = rawStores.map(store => store.id);
    
    // Get activity data with fallback logic
    const { activityMap, isMockData } = await fetchRecentActivity(storeIds);

    // Transform stores and add activity indicators
    const storesWithActivity: StoreWithActivity[] = rawStores.map(store => {
      const hasActivity = activityMap.has(store.id);
      const isDebugMode = process.env.NEXT_PUBLIC_DEBUG === 'true';
      
      // Generate consistent coordinates based on store ID for demo purposes
      // In a real implementation, these would come from the database
      const hash = store.id.split('').reduce((acc: number, char: string) => {
        return ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff;
      }, 0);
      
      const latOffset = (Math.abs(hash) % 2000 - 1000) / 100; // -10 to +10 degrees
      const lngOffset = (Math.abs(hash * 2) % 4000 - 2000) / 100; // -20 to +20 degrees
      
      return {
        id: store.id,
        name: store.name,
        latitude: 40.7128 + latOffset, // Spread around NYC
        longitude: -74.0060 + lngOffset,
        region: store.region || 'Unknown',
        country: store.country || 'Unknown',
        franchiseeId: undefined, // Not available in current schema
        status: 'active' as const,
        recentActivity: hasActivity,
        __mockActivity: isDebugMode && isMockData && hasActivity,
      };
    });

    // Log activity summary in debug mode
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      const activeCount = storesWithActivity.filter(s => s.recentActivity).length;
      const mockCount = storesWithActivity.filter(s => s.__mockActivity).length;
      console.log(`Activity Summary: ${activeCount}/${storesWithActivity.length} stores active, ${mockCount} using mock data`);
    }

    return storesWithActivity;
  }, [fetchRecentActivity]);

  /**
   * Main function to fetch and process store data
   */
  const fetchStoresWithActivity = useCallback(async (currentFilters: FilterState) => {
    try {
      setError(null);
      
      const rawStores = await fetchStores(currentFilters);
      const storesWithActivity = await combineStoresWithActivity(rawStores);
      
      setStores(storesWithActivity);
      
      // Update available filter options based on current data
      const regions = Array.from(new Set(storesWithActivity.map(s => s.region).filter(Boolean)));
      const countries = Array.from(new Set(storesWithActivity.map(s => s.country).filter(Boolean)));
      
      setAvailableOptions({
        franchisees: [], // Not available in current schema
        regions: regions.sort(),
        countries: countries.sort(),
      });
      
      // Track refresh tick telemetry
      const activeStoreCount = storesWithActivity.filter(s => s.recentActivity).length;
      safeTrackEvent(() => {
        MapTelemetryHelpers.trackMapRefreshTick(
          storesWithActivity.length, // visibleStoreCount (same as total after filtering)
          storesWithActivity.length, // totalStoreCount (after filtering)
          activeStoreCount,
          currentFilters,
          getCurrentUserId(),
          {
            hasError: false,
            dataSource: 'api',
          }
        );
      }, 'map_refresh_tick');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stores';
      setError(errorMessage);
      console.error('Error in fetchStoresWithActivity:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchStores, combineStoresWithActivity]);

  /**
   * Debounced version of fetchStoresWithActivity
   */
  const debouncedFetch = useCallback((currentFilters: FilterState) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchStoresWithActivity(currentFilters);
    }, DEBOUNCE_DELAY);
  }, [fetchStoresWithActivity]);

  /**
   * Manual refetch function with cache invalidation and retry reset
   */
  const refetch = useCallback(() => {
    // Clear activity cache to force fresh data
    activityCacheRef.current = null;
    setRetryCount(0);
    setError(null);
    setLoading(true);
    fetchStoresWithActivity(filters);
  }, [fetchStoresWithActivity, filters]);

  /**
   * Set up polling and handle filter changes
   */
  useEffect(() => {
    // Clear existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Check if filters have changed
    const filtersChanged = JSON.stringify(lastFiltersRef.current) !== JSON.stringify(filters);
    lastFiltersRef.current = filters;

    if (filtersChanged) {
      // Filters changed, use debounced fetch
      debouncedFetch(filters);
    } else {
      // Initial load or polling, fetch immediately
      fetchStoresWithActivity(filters);
    }

    // Set up polling interval
    pollingIntervalRef.current = setInterval(() => {
      fetchStoresWithActivity(filters);
    }, POLLING_INTERVAL);

    // Cleanup function
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [filters, fetchStoresWithActivity, debouncedFetch]);

  return {
    stores,
    loading,
    error,
    refetch,
    availableOptions,
  };
}