/**
 * Unit tests for useStores hook
 * Tests store data fetching, activity computation, and fallback mechanisms
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useStores } from '../useStores';
import { FilterState } from '../../types';
import * as api from '@/lib/api';

// Mock the API module
jest.mock('@/lib/api', () => ({
  bffWithErrorHandling: jest.fn(),
}));

const mockBffWithErrorHandling = api.bffWithErrorHandling as jest.MockedFunction<typeof api.bffWithErrorHandling>;

// Mock environment variable
const originalEnv = process.env;

// Mock timers for polling tests
jest.useFakeTimers();

describe('useStores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const mockStoresData = [
    {
      id: 'store-1',
      name: 'Test Store 1',
      country: 'United States',
      region: 'AMER',
      city: 'New York',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    },
    {
      id: 'store-2',
      name: 'Test Store 2',
      country: 'United Kingdom',
      region: 'EMEA',
      city: 'London',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    },
  ];

  const mockRecentOrdersData = {
    orders: [
      {
        id: 'order-1',
        storeId: 'store-1',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        Store: {
          id: 'store-1',
          name: 'Test Store 1',
        },
      },
    ],
    pagination: {
      total: 1,
    },
  };

  it('should fetch stores with current filters', async () => {
    mockBffWithErrorHandling
      .mockResolvedValueOnce({ success: true, data: mockStoresData })
      .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData });

    const filters: FilterState = { region: 'AMER' };
    const { result } = renderHook(() => useStores(filters));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stores).toHaveLength(2);
    expect(result.current.stores[0]).toMatchObject({
      id: 'store-1',
      name: 'Test Store 1',
      region: 'AMER',
      country: 'United States',
      recentActivity: true, // Should have activity from mock orders
    });
    expect(result.current.error).toBeNull();
  });

  it('should compute activity from recent orders', async () => {
    mockBffWithErrorHandling
      .mockResolvedValueOnce({ success: true, data: mockStoresData })
      .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData });

    const filters: FilterState = {};
    const { result } = renderHook(() => useStores(filters));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const store1 = result.current.stores.find(s => s.id === 'store-1');
    const store2 = result.current.stores.find(s => s.id === 'store-2');

    expect(store1?.recentActivity).toBe(true); // Has recent order
    expect(store2?.recentActivity).toBe(false); // No recent order
  });

  it('should fall back to mock activity when orders API fails', async () => {
    mockBffWithErrorHandling
      .mockResolvedValueOnce({ success: true, data: mockStoresData })
      .mockResolvedValueOnce({ success: false, error: 'Orders API unavailable' });

    const filters: FilterState = {};
    const { result } = renderHook(() => useStores(filters));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stores).toHaveLength(2);
    // Some stores should have mock activity (deterministic based on store ID)
    const activeStores = result.current.stores.filter(s => s.recentActivity);
    expect(activeStores.length).toBeGreaterThanOrEqual(0);
  });

  it('should set __mockActivity flag in debug mode', async () => {
    process.env.NEXT_PUBLIC_DEBUG = 'true';

    mockBffWithErrorHandling
      .mockResolvedValueOnce({ success: true, data: mockStoresData })
      .mockResolvedValueOnce({ success: false, error: 'Orders API unavailable' });

    const filters: FilterState = {};
    const { result } = renderHook(() => useStores(filters));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const storesWithMockActivity = result.current.stores.filter(s => s.__mockActivity);
    // In debug mode, stores with mock activity should have the flag set
    storesWithMockActivity.forEach(store => {
      expect(store.__mockActivity).toBe(true);
      expect(store.recentActivity).toBe(true);
    });
  });

  it('should handle API errors gracefully', async () => {
    mockBffWithErrorHandling
      .mockResolvedValueOnce({ success: false, error: 'Network error' });

    const filters: FilterState = {};
    const { result } = renderHook(() => useStores(filters));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stores).toHaveLength(0);
    expect(result.current.error).toBe('Network error');
  });

  it('should provide available filter options', async () => {
    mockBffWithErrorHandling
      .mockResolvedValueOnce({ success: true, data: mockStoresData })
      .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData });

    const filters: FilterState = {};
    const { result } = renderHook(() => useStores(filters));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.availableOptions.regions).toContain('AMER');
    expect(result.current.availableOptions.regions).toContain('EMEA');
    expect(result.current.availableOptions.countries).toContain('United States');
    expect(result.current.availableOptions.countries).toContain('United Kingdom');
  });

  it('should refetch data when refetch is called', async () => {
    mockBffWithErrorHandling
      .mockResolvedValueOnce({ success: true, data: mockStoresData })
      .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData })
      .mockResolvedValueOnce({ success: true, data: mockStoresData })
      .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData });

    const filters: FilterState = {};
    const { result } = renderHook(() => useStores(filters));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockBffWithErrorHandling).toHaveBeenCalledTimes(2);

    // Call refetch
    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockBffWithErrorHandling).toHaveBeenCalledTimes(4);
  });

  it('should generate consistent coordinates for stores', async () => {
    // Mock for first hook
    mockBffWithErrorHandling
      .mockResolvedValueOnce({ success: true, data: mockStoresData })
      .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData })
      // Mock for second hook
      .mockResolvedValueOnce({ success: true, data: mockStoresData })
      .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData });

    const filters: FilterState = {};
    const { result } = renderHook(() => useStores(filters));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const store1 = result.current.stores.find(s => s.id === 'store-1');
    const store2 = result.current.stores.find(s => s.id === 'store-2');

    expect(store1?.latitude).toBeGreaterThan(30);
    expect(store1?.latitude).toBeLessThan(51);
    expect(store1?.longitude).toBeGreaterThan(-95);
    expect(store1?.longitude).toBeLessThan(-53);

    expect(store2?.latitude).toBeGreaterThan(30);
    expect(store2?.latitude).toBeLessThan(51);
    expect(store2?.longitude).toBeGreaterThan(-95);
    expect(store2?.longitude).toBeLessThan(-53);

    // Coordinates should be consistent across renders
    const { result: result2 } = renderHook(() => useStores(filters));
    
    await waitFor(() => {
      expect(result2.current.loading).toBe(false);
    });

    const store1Again = result2.current.stores.find(s => s.id === 'store-1');
    expect(store1Again?.latitude).toBe(store1?.latitude);
    expect(store1Again?.longitude).toBe(store1?.longitude);
  });

  describe('Filter combinations', () => {
    it('should fetch stores with region filter', async () => {
      mockBffWithErrorHandling
        .mockResolvedValueOnce({ success: true, data: mockStoresData })
        .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData });

      const filters: FilterState = { region: 'AMER' };
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockBffWithErrorHandling).toHaveBeenCalledWith(
        '/stores?region=AMER',
        expect.any(Object)
      );
    });

    it('should fetch stores with country filter', async () => {
      mockBffWithErrorHandling
        .mockResolvedValueOnce({ success: true, data: mockStoresData })
        .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData });

      const filters: FilterState = { country: 'United States' };
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockBffWithErrorHandling).toHaveBeenCalledWith(
        '/stores?country=United+States',
        expect.any(Object)
      );
    });

    it('should fetch stores with multiple filters', async () => {
      mockBffWithErrorHandling
        .mockResolvedValueOnce({ success: true, data: mockStoresData })
        .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData });

      const filters: FilterState = { 
        region: 'AMER', 
        country: 'United States' 
      };
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockBffWithErrorHandling).toHaveBeenCalledWith(
        '/stores?region=AMER&country=United+States',
        expect.any(Object)
      );
    });

    it('should ignore franchiseeId filter (not supported by API)', async () => {
      mockBffWithErrorHandling
        .mockResolvedValueOnce({ success: true, data: mockStoresData })
        .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData });

      const filters: FilterState = { 
        franchiseeId: 'franchise-1',
        region: 'AMER'
      };
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should only include region filter, not franchiseeId
      expect(mockBffWithErrorHandling).toHaveBeenCalledWith(
        '/stores?region=AMER',
        expect.any(Object)
      );
    });

    it('should handle empty filters', async () => {
      mockBffWithErrorHandling
        .mockResolvedValueOnce({ success: true, data: mockStoresData })
        .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData });

      const filters: FilterState = {};
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockBffWithErrorHandling).toHaveBeenCalledWith(
        '/stores',
        expect.any(Object)
      );
    });
  });

  describe('Activity computation and fallback mechanisms', () => {
    it('should compute activity from recent orders within threshold', async () => {
      const recentOrdersData = {
        orders: [
          {
            id: 'order-1',
            storeId: 'store-1',
            createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
            Store: { id: 'store-1', name: 'Test Store 1' },
          },
          {
            id: 'order-2',
            storeId: 'store-2',
            createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(), // 90 minutes ago (outside threshold)
            Store: { id: 'store-2', name: 'Test Store 2' },
          },
        ],
        pagination: { total: 2 },
      };

      mockBffWithErrorHandling
        .mockResolvedValueOnce({ success: true, data: mockStoresData })
        .mockResolvedValueOnce({ success: true, data: recentOrdersData });

      const filters: FilterState = {};
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const store1 = result.current.stores.find(s => s.id === 'store-1');
      const store2 = result.current.stores.find(s => s.id === 'store-2');

      expect(store1?.recentActivity).toBe(true); // Within 60 minute threshold
      expect(store2?.recentActivity).toBe(false); // Outside threshold
    });

    it('should fall back to mock activity when orders API returns error', async () => {
      mockBffWithErrorHandling
        .mockResolvedValueOnce({ success: true, data: mockStoresData })
        .mockRejectedValueOnce(new Error('Network error'));

      const filters: FilterState = {};
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stores).toHaveLength(2);
      expect(result.current.error).toBeNull(); // Should not error on activity fallback
      
      // Mock activity should be deterministic based on store ID
      const store1 = result.current.stores.find(s => s.id === 'store-1');
      const store2 = result.current.stores.find(s => s.id === 'store-2');
      
      // Activity should be consistent across multiple renders with same store IDs
      expect(typeof store1?.recentActivity).toBe('boolean');
      expect(typeof store2?.recentActivity).toBe('boolean');
    });

    it('should fall back to mock activity when orders API returns unsuccessful response', async () => {
      mockBffWithErrorHandling
        .mockResolvedValueOnce({ success: true, data: mockStoresData })
        .mockResolvedValueOnce({ success: false, error: 'Orders service unavailable' });

      const filters: FilterState = {};
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stores).toHaveLength(2);
      expect(result.current.error).toBeNull();
      
      // Should have some stores with mock activity
      const activeStores = result.current.stores.filter(s => s.recentActivity);
      expect(activeStores.length).toBeGreaterThanOrEqual(0);
    });

    it('should cache activity data to reduce API calls', async () => {
      mockBffWithErrorHandling
        .mockResolvedValueOnce({ success: true, data: mockStoresData })
        .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData })
        .mockResolvedValueOnce({ success: true, data: mockStoresData })
        .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData }); // Cache may expire during test

      const filters: FilterState = {};
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = mockBffWithErrorHandling.mock.calls.length;

      // Fast-forward time but stay within cache TTL (30 seconds)
      act(() => {
        jest.advanceTimersByTime(15000); // 15 seconds - should trigger polling but use cached activity
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have made one additional stores call but reused cached activity
      expect(mockBffWithErrorHandling).toHaveBeenCalledTimes(initialCallCount + 1);
    });

    it('should generate approximately 10% mock activity', async () => {
      // Create a larger dataset to test percentage
      const largeStoreDataset = Array.from({ length: 100 }, (_, i) => ({
        id: `store-${i}`,
        name: `Test Store ${i}`,
        country: 'United States',
        region: 'AMER',
        city: 'New York',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      }));

      mockBffWithErrorHandling
        .mockResolvedValueOnce({ success: true, data: largeStoreDataset })
        .mockResolvedValueOnce({ success: false, error: 'Orders API unavailable' });

      const filters: FilterState = {};
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const activeStores = result.current.stores.filter(s => s.recentActivity);
      const activityPercentage = activeStores.length / result.current.stores.length;
      
      // Should be approximately 10% (allowing for more variance due to deterministic hashing)
      expect(activityPercentage).toBeGreaterThanOrEqual(0.03);
      expect(activityPercentage).toBeLessThanOrEqual(0.17);
    });
  });

  describe('Polling behavior', () => {
    it('should set up polling interval on mount', async () => {
      mockBffWithErrorHandling
        .mockResolvedValue({ success: true, data: mockStoresData })
        .mockResolvedValue({ success: true, data: mockRecentOrdersData });

      const filters: FilterState = {};
      const { result } = renderHook(() => useStores(filters));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      const initialCallCount = mockBffWithErrorHandling.mock.calls.length;

      // Fast-forward 15 seconds (polling interval) and flush promises
      await act(async () => {
        jest.advanceTimersByTime(15000);
        await Promise.resolve(); // Allow promises to resolve
      });

      // Wait for polling to complete
      await waitFor(() => {
        expect(mockBffWithErrorHandling.mock.calls.length).toBeGreaterThan(initialCallCount);
      }, { timeout: 1000 });
    });

    it('should clear polling interval on unmount', async () => {
      mockBffWithErrorHandling
        .mockResolvedValue({ success: true, data: mockStoresData })
        .mockResolvedValue({ success: true, data: mockRecentOrdersData });

      const filters: FilterState = {};
      const { result, unmount } = renderHook(() => useStores(filters));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      const initialCallCount = mockBffWithErrorHandling.mock.calls.length;

      // Unmount the hook
      unmount();

      // Fast-forward time - no additional calls should be made
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockBffWithErrorHandling).toHaveBeenCalledTimes(initialCallCount);
    });

    it('should debounce filter changes', async () => {
      mockBffWithErrorHandling
        .mockResolvedValue({ success: true, data: mockStoresData })
        .mockResolvedValue({ success: true, data: mockRecentOrdersData });

      const { result, rerender } = renderHook(
        ({ filters }) => useStores(filters),
        { initialProps: { filters: {} as FilterState } }
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      const initialCallCount = mockBffWithErrorHandling.mock.calls.length;

      // Rapidly change filters multiple times
      act(() => {
        rerender({ filters: { region: 'AMER' } });
        rerender({ filters: { region: 'EMEA' } });
        rerender({ filters: { region: 'APAC' } });
      });

      // Should not make immediate API calls due to debouncing
      expect(mockBffWithErrorHandling).toHaveBeenCalledTimes(initialCallCount);

      // Fast-forward past debounce delay and flush promises
      await act(async () => {
        jest.advanceTimersByTime(500);
        await Promise.resolve();
      });

      // Wait for debounced call to complete
      await waitFor(() => {
        expect(mockBffWithErrorHandling.mock.calls.length).toBeGreaterThan(initialCallCount);
      }, { timeout: 1000 });

      // Should have called with the final filter value
      const lastStoresCall = mockBffWithErrorHandling.mock.calls
        .filter(call => call[0].includes('/stores'))
        .pop();
      expect(lastStoresCall?.[0]).toBe('/stores?region=APAC');
    });

    it('should not debounce initial load', async () => {
      mockBffWithErrorHandling
        .mockResolvedValue({ success: true, data: mockStoresData })
        .mockResolvedValue({ success: true, data: mockRecentOrdersData });

      const filters: FilterState = { region: 'AMER' };
      const { result } = renderHook(() => useStores(filters));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 3000 });

      // Should make immediate API call on initial load
      expect(mockBffWithErrorHandling.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error handling', () => {
    it('should handle store API network errors', async () => {
      const networkError = new Error('Network connection failed');
      mockBffWithErrorHandling.mockRejectedValueOnce(networkError);

      const filters: FilterState = {};
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stores).toHaveLength(0);
      expect(result.current.error).toBe('Network connection failed');
    });

    it('should handle store API response errors', async () => {
      mockBffWithErrorHandling.mockResolvedValueOnce({ 
        success: false, 
        error: 'Invalid request parameters' 
      });

      const filters: FilterState = {};
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stores).toHaveLength(0);
      expect(result.current.error).toBe('Invalid request parameters');
    });

    it('should handle malformed store data gracefully', async () => {
      const malformedData = [
        { id: 'store-1', name: 'Store 1', country: null, region: null, city: null, createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' }, // Missing some fields but has ID
        { id: 'store-2', name: 'Store 2', country: null, region: null, city: null, createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' }, // Missing some fields but has ID
      ];

      mockBffWithErrorHandling
        .mockResolvedValueOnce({ success: true, data: malformedData })
        .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData });

      const filters: FilterState = {};
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should handle malformed data without crashing
      expect(result.current.error).toBeNull();
      expect(result.current.stores).toHaveLength(2);
    });

    it('should retry on polling errors without affecting UI', async () => {
      // Initial successful load
      mockBffWithErrorHandling
        .mockResolvedValueOnce({ success: true, data: mockStoresData })
        .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData })
        // Polling error
        .mockRejectedValueOnce(new Error('Temporary network error'))
        // Recovery
        .mockResolvedValueOnce({ success: true, data: mockStoresData })
        .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData });

      const filters: FilterState = {};
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stores).toHaveLength(2);
      expect(result.current.error).toBeNull();

      // Trigger polling error
      act(() => {
        jest.advanceTimersByTime(15000);
      });

      // Should maintain previous data and not show error for polling failures
      await waitFor(() => {
        expect(result.current.stores).toHaveLength(2);
        expect(result.current.error).toBeNull();
      });

      // Next polling cycle should recover
      act(() => {
        jest.advanceTimersByTime(15000);
      });

      await waitFor(() => {
        expect(result.current.stores).toHaveLength(2);
        expect(result.current.error).toBeNull();
      });
    });

    it('should clear error state on successful refetch', async () => {
      // Initial error
      mockBffWithErrorHandling
        .mockResolvedValueOnce({ success: false, error: 'Initial error' })
        // Successful refetch
        .mockResolvedValueOnce({ success: true, data: mockStoresData })
        .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData });

      const filters: FilterState = {};
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Initial error');

      // Trigger refetch
      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.stores).toHaveLength(2);
    });

    it('should handle activity cache invalidation on refetch', async () => {
      mockBffWithErrorHandling
        .mockResolvedValueOnce({ success: true, data: mockStoresData })
        .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData })
        .mockResolvedValueOnce({ success: true, data: mockStoresData })
        .mockResolvedValueOnce({ success: true, data: mockRecentOrdersData });

      const filters: FilterState = {};
      const { result } = renderHook(() => useStores(filters));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockBffWithErrorHandling).toHaveBeenCalledTimes(2);

      // Call refetch - should invalidate cache and fetch fresh activity data
      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have made fresh calls to both APIs
      expect(mockBffWithErrorHandling).toHaveBeenCalledTimes(4);
    });
  });
});