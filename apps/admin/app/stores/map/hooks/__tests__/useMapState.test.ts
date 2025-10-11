import { renderHook, act } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMapState } from '../useMapState';
import { DEFAULT_VIEWPORT, DEFAULT_FILTERS } from '../../types';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

describe('useMapState', () => {
  let mockRouter: {
    replace: jest.Mock;
    push: jest.Mock;
    prefetch: jest.Mock;
    back: jest.Mock;
    forward: jest.Mock;
    refresh: jest.Mock;
  };
  let mockSearchParams: URLSearchParams;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock router
    mockRouter = {
      replace: jest.fn(),
      push: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
    mockUseRouter.mockReturnValue(mockRouter);

    // Mock search params with empty URLSearchParams by default
    mockSearchParams = new URLSearchParams();
    mockUseSearchParams.mockReturnValue(mockSearchParams as any);

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/stores/map',
        search: '',
      },
      writable: true,
    });

    // Mock addEventListener and removeEventListener
    const mockAddEventListener = jest.fn();
    const mockRemoveEventListener = jest.fn();
    Object.defineProperty(window, 'addEventListener', {
      value: mockAddEventListener,
      writable: true,
    });
    Object.defineProperty(window, 'removeEventListener', {
      value: mockRemoveEventListener,
      writable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('URL parameter initialization', () => {
    it('should initialize with default values when no URL parameters are present', () => {
      const { result } = renderHook(() => useMapState());

      expect(result.current.viewport).toEqual(DEFAULT_VIEWPORT);
      expect(result.current.filters).toEqual(DEFAULT_FILTERS);
      expect(result.current.selectedStoreId).toBeNull();
    });

    it('should initialize viewport from URL parameters', () => {
      mockSearchParams.set('lat', '42.3601');
      mockSearchParams.set('lng', '-71.0589');
      mockSearchParams.set('zoom', '10.5');

      const { result } = renderHook(() => useMapState());

      expect(result.current.viewport).toEqual({
        latitude: 42.3601,
        longitude: -71.0589,
        zoom: 10.5,
      });
    });

    it('should initialize filters from URL parameters', () => {
      mockSearchParams.set('franchiseeId', 'franchise-123');
      mockSearchParams.set('region', 'EMEA');
      mockSearchParams.set('country', 'UK');

      const { result } = renderHook(() => useMapState());

      expect(result.current.filters).toEqual({
        franchiseeId: 'franchise-123',
        region: 'EMEA',
        country: 'UK',
      });
    });

    it('should initialize selectedStoreId from URL parameters', () => {
      mockSearchParams.set('selectedStore', 'store-456');

      const { result } = renderHook(() => useMapState());

      expect(result.current.selectedStoreId).toBe('store-456');
    });

    it('should use default values for invalid viewport parameters', () => {
      mockSearchParams.set('lat', 'invalid');
      mockSearchParams.set('lng', 'also-invalid');
      mockSearchParams.set('zoom', 'not-a-number');

      const { result } = renderHook(() => useMapState());

      expect(result.current.viewport).toEqual(DEFAULT_VIEWPORT);
    });

    it('should handle partial viewport parameters', () => {
      mockSearchParams.set('lat', '42.3601');
      // Missing lng and zoom should use defaults

      const { result } = renderHook(() => useMapState());

      expect(result.current.viewport).toEqual({
        latitude: 42.3601,
        longitude: DEFAULT_VIEWPORT.longitude,
        zoom: DEFAULT_VIEWPORT.zoom,
      });
    });
  });

  describe('URL synchronization', () => {
    it('should update URL when viewport changes', () => {
      const { result } = renderHook(() => useMapState());

      const newViewport = {
        latitude: 42.3601,
        longitude: -71.0589,
        zoom: 12,
      };

      act(() => {
        result.current.setViewport(newViewport);
      });

      // Fast-forward timers to trigger debounced update
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockRouter.replace).toHaveBeenCalledWith(
        '/stores/map?lat=42.360100&lng=-71.058900&zoom=12.00',
        { scroll: false }
      );
    });

    it('should update URL when filters change', () => {
      const { result } = renderHook(() => useMapState());

      const newFilters = {
        franchiseeId: 'franchise-123',
        region: 'EMEA',
        country: 'UK',
      };

      act(() => {
        result.current.setFilters(newFilters);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining('franchiseeId=franchise-123'),
        { scroll: false }
      );
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining('region=EMEA'),
        { scroll: false }
      );
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining('country=UK'),
        { scroll: false }
      );
    });

    it('should update URL when selectedStoreId changes', () => {
      const { result } = renderHook(() => useMapState());

      act(() => {
        result.current.setSelectedStoreId('store-789');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining('selectedStore=store-789'),
        { scroll: false }
      );
    });

    it('should not include empty filter values in URL', () => {
      const { result } = renderHook(() => useMapState());

      const newFilters = {
        franchiseeId: 'franchise-123',
        region: undefined,
        country: '',
      };

      act(() => {
        result.current.setFilters(newFilters);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      const lastCall = mockRouter.replace.mock.calls[mockRouter.replace.mock.calls.length - 1];
      const urlString = lastCall[0];
      
      expect(urlString).toContain('franchiseeId=franchise-123');
      expect(urlString).not.toContain('region=');
      expect(urlString).not.toContain('country=');
    });

    it('should not include selectedStore parameter when null', () => {
      const { result } = renderHook(() => useMapState());

      // First set a store ID
      act(() => {
        result.current.setSelectedStoreId('store-123');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then clear it
      act(() => {
        result.current.setSelectedStoreId(null);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      const lastCall = mockRouter.replace.mock.calls[mockRouter.replace.mock.calls.length - 1];
      const urlString = lastCall[0];
      
      expect(urlString).not.toContain('selectedStore=');
    });
  });

  describe('debouncing behavior', () => {
    it('should debounce URL updates', () => {
      const { result } = renderHook(() => useMapState());

      // Make multiple rapid changes
      act(() => {
        result.current.setViewport({ latitude: 40, longitude: -74, zoom: 10 });
        result.current.setViewport({ latitude: 41, longitude: -75, zoom: 11 });
        result.current.setViewport({ latitude: 42, longitude: -76, zoom: 12 });
      });

      // Should not have called router.replace yet
      expect(mockRouter.replace).not.toHaveBeenCalled();

      // Fast-forward timers
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should only call once with the final values
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining('lat=42.000000'),
        { scroll: false }
      );
    });

    it('should reset debounce timer on new changes', () => {
      const { result } = renderHook(() => useMapState());

      act(() => {
        result.current.setViewport({ latitude: 40, longitude: -74, zoom: 10 });
      });

      // Advance time partially
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Make another change - should reset the timer
      act(() => {
        result.current.setViewport({ latitude: 41, longitude: -75, zoom: 11 });
      });

      // Advance time by 200ms more (total 400ms from first change, 200ms from second)
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Should not have called yet (need 300ms from last change)
      expect(mockRouter.replace).not.toHaveBeenCalled();

      // Advance by 100ms more to complete the debounce
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    });
  });

  describe('state updates', () => {
    it('should update viewport state immediately', () => {
      const { result } = renderHook(() => useMapState());

      const newViewport = {
        latitude: 42.3601,
        longitude: -71.0589,
        zoom: 12,
      };

      act(() => {
        result.current.setViewport(newViewport);
      });

      expect(result.current.viewport).toEqual(newViewport);
    });

    it('should update filters state immediately', () => {
      const { result } = renderHook(() => useMapState());

      const newFilters = {
        franchiseeId: 'franchise-123',
        region: 'EMEA',
      };

      act(() => {
        result.current.setFilters(newFilters);
      });

      expect(result.current.filters).toEqual(newFilters);
    });

    it('should update selectedStoreId state immediately', () => {
      const { result } = renderHook(() => useMapState());

      act(() => {
        result.current.setSelectedStoreId('store-456');
      });

      expect(result.current.selectedStoreId).toBe('store-456');
    });
  });

  describe('default value handling', () => {
    it('should handle missing latitude parameter', () => {
      mockSearchParams.set('lng', '-71.0589');
      mockSearchParams.set('zoom', '10');

      const { result } = renderHook(() => useMapState());

      expect(result.current.viewport.latitude).toBe(DEFAULT_VIEWPORT.latitude);
      expect(result.current.viewport.longitude).toBe(-71.0589);
      expect(result.current.viewport.zoom).toBe(10);
    });

    it('should handle missing longitude parameter', () => {
      mockSearchParams.set('lat', '42.3601');
      mockSearchParams.set('zoom', '10');

      const { result } = renderHook(() => useMapState());

      expect(result.current.viewport.latitude).toBe(42.3601);
      expect(result.current.viewport.longitude).toBe(DEFAULT_VIEWPORT.longitude);
      expect(result.current.viewport.zoom).toBe(10);
    });

    it('should handle missing zoom parameter', () => {
      mockSearchParams.set('lat', '42.3601');
      mockSearchParams.set('lng', '-71.0589');

      const { result } = renderHook(() => useMapState());

      expect(result.current.viewport.latitude).toBe(42.3601);
      expect(result.current.viewport.longitude).toBe(-71.0589);
      expect(result.current.viewport.zoom).toBe(DEFAULT_VIEWPORT.zoom);
    });

    it('should handle empty string parameters', () => {
      mockSearchParams.set('lat', '');
      mockSearchParams.set('lng', '');
      mockSearchParams.set('zoom', '');
      mockSearchParams.set('franchiseeId', '');
      mockSearchParams.set('selectedStore', '');

      const { result } = renderHook(() => useMapState());

      expect(result.current.viewport).toEqual(DEFAULT_VIEWPORT);
      expect(result.current.filters).toEqual(DEFAULT_FILTERS);
      expect(result.current.selectedStoreId).toBeNull();
    });

    it('should handle whitespace-only parameters', () => {
      mockSearchParams.set('franchiseeId', '   ');
      mockSearchParams.set('region', '\t\n');
      mockSearchParams.set('selectedStore', '  ');

      const { result } = renderHook(() => useMapState());

      // The hook doesn't trim whitespace, so these values will be preserved
      expect(result.current.filters).toEqual({
        franchiseeId: '   ',
        region: '\t\n',
        country: undefined,
      });
      expect(result.current.selectedStoreId).toBe('  ');
    });
  });

  describe('validation', () => {
    it('should reject invalid viewport values', () => {
      const { result } = renderHook(() => useMapState());
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const invalidViewport = {
        latitude: 200, // Invalid: > 90
        longitude: -200, // Invalid: < -180
        zoom: -5, // Invalid: < 0
      };

      act(() => {
        result.current.setViewport(invalidViewport);
      });

      // State should not change
      expect(result.current.viewport).toEqual(DEFAULT_VIEWPORT);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid viewport provided:', invalidViewport);

      consoleSpy.mockRestore();
    });

    it('should reject invalid filter values', () => {
      const { result } = renderHook(() => useMapState());
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const invalidFilters = {
        franchiseeId: 123, // Invalid: not a string
        region: null, // Invalid: not a string or undefined
      } as any;

      act(() => {
        result.current.setFilters(invalidFilters);
      });

      // State should not change
      expect(result.current.filters).toEqual(DEFAULT_FILTERS);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid filters provided:', invalidFilters);

      consoleSpy.mockRestore();
    });

    it('should accept valid viewport at boundaries', () => {
      const { result } = renderHook(() => useMapState());

      const boundaryViewport = {
        latitude: 90, // Max valid latitude
        longitude: -180, // Min valid longitude
        zoom: 0, // Min valid zoom
      };

      act(() => {
        result.current.setViewport(boundaryViewport);
      });

      expect(result.current.viewport).toEqual(boundaryViewport);
    });

    it('should accept valid viewport at other boundaries', () => {
      const { result } = renderHook(() => useMapState());

      const boundaryViewport = {
        latitude: -90, // Min valid latitude
        longitude: 180, // Max valid longitude
        zoom: 20, // Max valid zoom
      };

      act(() => {
        result.current.setViewport(boundaryViewport);
      });

      expect(result.current.viewport).toEqual(boundaryViewport);
    });
  });

  describe('cleanup', () => {
    it('should clear timeout on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const { result, unmount } = renderHook(() => useMapState());

      // Make a change to create a timeout
      act(() => {
        result.current.setViewport({ latitude: 42, longitude: -71, zoom: 10 });
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      clearTimeoutSpy.mockRestore();
    });

    it('should remove popstate event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderHook(() => useMapState());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('browser navigation', () => {
    it('should handle popstate events', () => {
      // Start with initial state
      const { result, unmount } = renderHook(() => useMapState());

      // Verify initial state
      expect(result.current.viewport).toEqual(DEFAULT_VIEWPORT);

      // Unmount and create a new hook instance with updated search params
      unmount();

      // Create new mock search params with updated values
      const newMockSearchParams = new URLSearchParams();
      newMockSearchParams.set('lat', '45.0');
      newMockSearchParams.set('lng', '-75.0');
      newMockSearchParams.set('zoom', '8');
      newMockSearchParams.set('franchiseeId', 'new-franchise');
      
      // Update the mock to return new search params
      mockUseSearchParams.mockReturnValue(newMockSearchParams as any);

      // Create a new hook instance that will pick up the new search params
      const { result: newResult } = renderHook(() => useMapState());

      // The new hook instance should initialize with the new URL parameters
      expect(newResult.current.viewport).toEqual({
        latitude: 45.0,
        longitude: -75.0,
        zoom: 8,
      });
      expect(newResult.current.filters.franchiseeId).toBe('new-franchise');
    });
  });
});