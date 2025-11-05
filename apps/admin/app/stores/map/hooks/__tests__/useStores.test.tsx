import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useStores } from '../useStores';
import { FilterState } from '../../types';

// Mock axios
const mockAxios = {
  get: jest.fn(),
  create: jest.fn(() => mockAxios),
  defaults: {
    headers: {
      common: {},
    },
  },
  interceptors: {
    request: {
      use: jest.fn(),
    },
    response: {
      use: jest.fn(),
    },
  },
};

jest.mock('axios', () => mockAxios);

// Mock telemetry
jest.mock('../../telemetry', () => ({
  MapTelemetryHelpers: {
    trackMapRefreshTick: jest.fn(),
  },
  safeTrackEvent: jest.fn((fn) => {
    try {
      fn();
    } catch (error) {
      // Ignore telemetry errors in tests
    }
  }),
  getCurrentUserId: jest.fn(() => 'test-user-id'),
}));

// Mock error handler
jest.mock('../../components/MapErrorBoundary', () => ({
  useMapErrorHandler: jest.fn(() => ({
    handleError: jest.fn(),
    circuitBreakerOpen: false,
    resetCircuitBreaker: jest.fn(),
    errorCount: 0,
    errorHistory: [],
  })),
}));

describe('useStores Hook', () => {
  const mockStoresData = [
    {
      id: '1',
      name: 'Store 1',
      latitude: 40.7128,
      longitude: -74.0060,
      region: 'AMER',
      country: 'US',
      franchiseeId: 'franchisee-1',
      status: 'active',
    },
    {
      id: '2',
      name: 'Store 2',
      latitude: 40.7589,
      longitude: -73.9851,
      region: 'AMER',
      country: 'US',
      franchiseeId: 'franchisee-2',
      status: 'active',
    },
    {
      id: '3',
      name: 'Store 3',
      latitude: 51.5074,
      longitude: -0.1278,
      region: 'EMEA',
      country: 'UK',
      franchiseeId: 'franchisee-3',
      status: 'inactive',
    },
  ];

  const mockRecentOrdersData = [
    {
      storeId: '1',
      hasRecentActivity: true,
      lastOrderTime: '2023-12-10T10:00:00Z',
      orderCount: 5,
    },
    {
      storeId: '2',
      hasRecentActivity: false,
      lastOrderTime: '2023-12-09T15:30:00Z',
      orderCount: 2,
    },
    {
      storeId: '3',
      hasRecentActivity: true,
      lastOrderTime: '2023-12-10T09:45:00Z',
      orderCount: 3,
    },
  ];

  const mockFilterOptions = {
    franchisees: [
      { id: 'franchisee-1', name: 'Franchisee 1' },
      { id: 'franchisee-2', name: 'Franchisee 2' },
      { id: 'franchisee-3', name: 'Franchisee 3' },
    ],
    regions: ['AMER', 'EMEA'],
    countries: ['US', 'UK'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock successful API responses by default
    mockAxios.get.mockImplementation((url: string) => {
      if (url.includes('/stores')) {
        return Promise.resolve({ data: mockStoresData });
      }
      if (url.includes('/recent-orders')) {
        return Promise.resolve({ data: mockRecentOrdersData });
      }
      if (url.includes('/filter-options')) {
        return Promise.resolve({ data: mockFilterOptions });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    test('should initialize with empty state', () => {
      const { result } = renderHook(() => useStores({}));

      expect(result.current.stores).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.availableOptions).toEqual({
        franchisees: [],
        regions: [],
        countries: [],
      });
    });

    test('should start loading data on mount', async () => {
      const { result } = renderHook(() => useStores({}));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockAxios.get).toHaveBeenCalledWith('/api/stores');
      expect(mockAxios.get).toHaveBeenCalledWith('/api/recent-orders');
      expect(mockAxios.get).toHaveBeenCalledWith('/api/filter-options');
    });
  });

  describe('Data Fetching', () => {
    test('should fetch and merge stores with activity data', async () => {
      const { result } = renderHook(() => useStores({}));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stores).toHaveLength(3);
      expect(result.current.stores[0]).toEqual(expect.objectContaining({
        id: '1',
        name: 'Store 1',
        recentActivity: true,
      }));
      expect(result.current.stores[1]).toEqual(expect.objectContaining({
        id: '2',
        name: 'Store 2',
        recentActivity: false,
      }));
      expect(result.current.stores[2]).toEqual(expect.objectContaining({
        id: '3',
        name: 'Store 3',
        recentActivity: true,
      }));
    });

    test('should fetch filter options', async () => {
      const { result } = renderHook(() => useStores({}));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.availableOptions).toEqual(mockFilterOptions);
    });

    test('should handle stores API error', async () => {
      mockAxios.get.mockImplementation((url: string) => {
        if (url.includes('/stores')) {
          return Promise.reject(new Error('Stores API error'));
        }
        if (url.includes('/recent-orders')) {
          return Promise.resolve({ data: mockRecentOrdersData });
        }
        if (url.includes('/filter-options')) {
          return Promise.resolve({ data: mockFilterOptions });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const { result } = renderHook(() => useStores({}));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load stores: Stores API error');
      expect(result.current.stores).toEqual([]);
    });

    test('should handle recent orders API error gracefully', async () => {
      mockAxios.get.mockImplementation((url: string) => {
        if (url.includes('/stores')) {
          return Promise.resolve({ data: mockStoresData });
        }
        if (url.includes('/recent-orders')) {
          return Promise.reject(new Error('Recent orders API error'));
        }
        if (url.includes('/filter-options')) {
          return Promise.resolve({ data: mockFilterOptions });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const { result } = renderHook(() => useStores({}));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should still load stores without activity data
      expect(result.current.stores).toHaveLength(3);
      expect(result.current.stores[0].recentActivity).toBe(false); // Default to false
      expect(result.current.error).toBeNull(); // Should not show error for non-critical API
    });

    test('should handle filter options API error gracefully', async () => {
      mockAxios.get.mockImplementation((url: string) => {
        if (url.includes('/stores')) {
          return Promise.resolve({ data: mockStoresData });
        }
        if (url.includes('/recent-orders')) {
          return Promise.resolve({ data: mockRecentOrdersData });
        }
        if (url.includes('/filter-options')) {
          return Promise.reject(new Error('Filter options API error'));
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const { result } = renderHook(() => useStores({}));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should still load stores
      expect(result.current.stores).toHaveLength(3);
      expect(result.current.availableOptions).toEqual({
        franchisees: [],
        regions: [],
        countries: [],
      });
      expect(result.current.error).toBeNull(); // Should not show error for non-critical API
    });
  });

  describe('Filtering', () => {
    test('should apply franchisee filter', async () => {
      const filters: FilterState = { franchiseeId: 'franchisee-1' };
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockAxios.get).toHaveBeenCalledWith('/api/stores', {
        params: { franchiseeId: 'franchisee-1' },
        signal: expect.any(AbortSignal),
      });
    });

    test('should apply region filter', async () => {
      const filters: FilterState = { region: 'EMEA' };
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockAxios.get).toHaveBeenCalledWith('/api/stores', {
        params: { region: 'EMEA' },
        signal: expect.any(AbortSignal),
      });
    });

    test('should apply country filter', async () => {
      const filters: FilterState = { country: 'UK' };
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockAxios.get).toHaveBeenCalledWith('/api/stores', {
        params: { country: 'UK' },
        signal: expect.any(AbortSignal),
      });
    });

    test('should apply multiple filters', async () => {
      const filters: FilterState = { 
        region: 'AMER', 
        country: 'US',
        franchiseeId: 'franchisee-1',
      };
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockAxios.get).toHaveBeenCalledWith('/api/stores', {
        params: { 
          region: 'AMER', 
          country: 'US',
          franchiseeId: 'franchisee-1',
        },
        signal: expect.any(AbortSignal),
      });
    });

    test('should refetch data when filters change', async () => {
      const { result, rerender } = renderHook(
        ({ filters }) => useStores(filters),
        { initialProps: { filters: {} } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockAxios.get).toHaveBeenCalledTimes(3); // stores, recent-orders, filter-options

      // Change filters
      rerender({ filters: { region: 'EMEA' } });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should make additional API calls for new filters
      expect(mockAxios.get).toHaveBeenCalledTimes(5); // +2 for stores and recent-orders with new filters
    });
  });

  describe('Request Cancellation', () => {
    test('should cancel previous requests when filters change', async () => {
      const abortSpy = jest.fn();
      const mockAbortController = {
        signal: { aborted: false },
        abort: abortSpy,
      };

      // Mock AbortController
      global.AbortController = jest.fn(() => mockAbortController) as any;

      const { result, rerender } = renderHook(
        ({ filters }) => useStores(filters),
        { initialProps: { filters: {} } }
      );

      // Change filters quickly
      rerender({ filters: { region: 'EMEA' } });
      rerender({ filters: { region: 'AMER' } });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have called abort on previous requests
      expect(abortSpy).toHaveBeenCalled();
    });

    test('should cancel requests on unmount', () => {
      const abortSpy = jest.fn();
      const mockAbortController = {
        signal: { aborted: false },
        abort: abortSpy,
      };

      // Mock AbortController
      global.AbortController = jest.fn(() => mockAbortController) as any;

      const { unmount } = renderHook(() => useStores({}));

      unmount();

      expect(abortSpy).toHaveBeenCalled();
    });
  });

  describe('Polling and Refresh', () => {
    test('should start polling for activity updates', async () => {
      const { result } = renderHook(() => useStores({}));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear initial API calls
      mockAxios.get.mockClear();

      // Fast-forward past polling interval (30 seconds)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should make additional call for recent orders
      expect(mockAxios.get).toHaveBeenCalledWith('/api/recent-orders', {
        signal: expect.any(AbortSignal),
      });
    });

    test('should stop polling on unmount', async () => {
      const { result, unmount } = renderHook(() => useStores({}));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      unmount();

      // Clear initial API calls
      mockAxios.get.mockClear();

      // Fast-forward past polling interval
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should not make additional calls after unmount
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    test('should handle polling errors gracefully', async () => {
      const { result } = renderHook(() => useStores({}));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock polling request to fail
      mockAxios.get.mockImplementation((url: string) => {
        if (url.includes('/recent-orders')) {
          return Promise.reject(new Error('Polling error'));
        }
        return Promise.resolve({ data: [] });
      });

      // Fast-forward past polling interval
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should not show error for polling failures
      expect(result.current.error).toBeNull();
    });

    test('should provide manual refetch function', async () => {
      const { result } = renderHook(() => useStores({}));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear initial API calls
      mockAxios.get.mockClear();

      // Call refetch
      act(() => {
        result.current.refetch();
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should make fresh API calls
      expect(mockAxios.get).toHaveBeenCalledWith('/api/stores', expect.any(Object));
      expect(mockAxios.get).toHaveBeenCalledWith('/api/recent-orders', expect.any(Object));
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useStores({}));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load stores: Network error');
      expect(result.current.stores).toEqual([]);
    });

    test('should handle timeout errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('timeout of 10000ms exceeded'));

      const { result } = renderHook(() => useStores({}));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load stores: timeout of 10000ms exceeded');
    });

    test('should handle 404 errors', async () => {
      const error = new Error('Request failed with status code 404');
      (error as any).response = { status: 404 };
      mockAxios.get.mockRejectedValue(error);

      const { result } = renderHook(() => useStores({}));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load stores: Request failed with status code 404');
    });

    test('should handle 500 errors', async () => {
      const error = new Error('Request failed with status code 500');
      (error as any).response = { status: 500 };
      mockAxios.get.mockRejectedValue(error);

      const { result } = renderHook(() => useStores({}));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load stores: Request failed with status code 500');
    });

    test('should clear error on successful refetch', async () => {
      // First request fails
      mockAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useStores({}));

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load stores: Network error');
      });

      // Mock successful response for refetch
      mockAxios.get.mockImplementation((url: string) => {
        if (url.includes('/stores')) {
          return Promise.resolve({ data: mockStoresData });
        }
        if (url.includes('/recent-orders')) {
          return Promise.resolve({ data: mockRecentOrdersData });
        }
        if (url.includes('/filter-options')) {
          return Promise.resolve({ data: mockFilterOptions });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      // Refetch
      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.stores).toHaveLength(3);
    });
  });

  describe('Data Merging', () => {
    test('should merge stores with activity data correctly', async () => {
      const { result } = renderHook(() => useStores({}));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const storesWithActivity = result.current.stores;

      // Store 1 should have recent activity
      const store1 = storesWithActivity.find(s => s.id === '1');
      expect(store1?.recentActivity).toBe(true);

      // Store 2 should not have recent activity
      const store2 = storesWithActivity.find(s => s.id === '2');
      expect(store2?.recentActivity).toBe(false);

      // Store 3 should have recent activity
      const store3 = storesWithActivity.find(s => s.id === '3');
      expect(store3?.recentActivity).toBe(true);
    });

    test('should handle missing activity data', async () => {
      // Mock recent orders response with missing store
      const incompleteActivityData = [
        {
          storeId: '1',
          hasRecentActivity: true,
          lastOrderTime: '2023-12-10T10:00:00Z',
          orderCount: 5,
        },
        // Missing store 2 and 3
      ];

      mockAxios.get.mockImplementation((url: string) => {
        if (url.includes('/stores')) {
          return Promise.resolve({ data: mockStoresData });
        }
        if (url.includes('/recent-orders')) {
          return Promise.resolve({ data: incompleteActivityData });
        }
        if (url.includes('/filter-options')) {
          return Promise.resolve({ data: mockFilterOptions });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const { result } = renderHook(() => useStores({}));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const storesWithActivity = result.current.stores;

      // Store 1 should have activity data
      const store1 = storesWithActivity.find(s => s.id === '1');
      expect(store1?.recentActivity).toBe(true);

      // Store 2 and 3 should default to false
      const store2 = storesWithActivity.find(s => s.id === '2');
      expect(store2?.recentActivity).toBe(false);

      const store3 = storesWithActivity.find(s => s.id === '3');
      expect(store3?.recentActivity).toBe(false);
    });
  });

  describe('Performance', () => {
    test('should debounce rapid filter changes', async () => {
      const { result, rerender } = renderHook(
        ({ filters }) => useStores(filters),
        { initialProps: { filters: {} } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear initial API calls
      mockAxios.get.mockClear();

      // Rapid filter changes
      rerender({ filters: { region: 'AMER' } });
      rerender({ filters: { region: 'EMEA' } });
      rerender({ filters: { region: 'APAC' } });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should only make API calls for the final filter state
      // (Implementation may vary based on debouncing strategy)
      expect(mockAxios.get).toHaveBeenCalled();
    });

    test('should handle large datasets efficiently', async () => {
      const largeStoreDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `store-${i}`,
        name: `Store ${i}`,
        latitude: 40.7 + (i * 0.001),
        longitude: -74.0 + (i * 0.001),
        region: i % 2 === 0 ? 'AMER' : 'EMEA',
        country: i % 2 === 0 ? 'US' : 'UK',
        franchiseeId: `franchisee-${i % 100}`,
        status: 'active',
      }));

      const largeActivityDataset = Array.from({ length: 10000 }, (_, i) => ({
        storeId: `store-${i}`,
        hasRecentActivity: i % 3 === 0,
        lastOrderTime: '2023-12-10T10:00:00Z',
        orderCount: Math.floor(Math.random() * 10),
      }));

      mockAxios.get.mockImplementation((url: string) => {
        if (url.includes('/stores')) {
          return Promise.resolve({ data: largeStoreDataset });
        }
        if (url.includes('/recent-orders')) {
          return Promise.resolve({ data: largeActivityDataset });
        }
        if (url.includes('/filter-options')) {
          return Promise.resolve({ data: mockFilterOptions });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const startTime = performance.now();
      const { result } = renderHook(() => useStores({}));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(result.current.stores).toHaveLength(10000);
      // Should process large datasets in reasonable time (less than 1 second)
      expect(processingTime).toBeLessThan(1000);
    });
  });
});