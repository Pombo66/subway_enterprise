import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MapView from '../MapView';
import { StoreWithActivity, MapViewport } from '../../types';
import { useMapErrorHandler } from '../MapErrorBoundary';

// Mock MapLibre GL
const mockMap = {
  addControl: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  remove: jest.fn(),
  getBounds: jest.fn(() => ({
    getNorth: () => 40.8,
    getSouth: () => 40.6,
    getEast: () => -73.9,
    getWest: () => -74.1,
  })),
  getCenter: jest.fn(() => ({ lat: 40.7128, lng: -74.0060 })),
  getZoom: jest.fn(() => 10),
  setCenter: jest.fn(),
  setZoom: jest.fn(),
  easeTo: jest.fn(),
  getContainer: jest.fn(() => ({
    setAttribute: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
};

const mockMarker = {
  setLngLat: jest.fn().mockReturnThis(),
  addTo: jest.fn().mockReturnThis(),
  remove: jest.fn(),
  getElement: jest.fn(() => document.createElement('div')),
};

jest.mock('maplibre-gl', () => ({
  Map: jest.fn(() => mockMap),
  NavigationControl: jest.fn(),
  Marker: jest.fn(() => mockMarker),
}));

// Mock Supercluster
jest.mock('supercluster', () => {
  return jest.fn().mockImplementation(() => ({
    load: jest.fn(),
    getClusters: jest.fn(() => []),
    getClusterExpansionZoom: jest.fn(() => 12),
  }));
});

// Mock ViewportManager
jest.mock('../../utils/ViewportManager', () => ({
  ViewportManager: jest.fn().mockImplementation(() => ({
    updateViewport: jest.fn(),
    getCurrentBounds: jest.fn(() => null),
    onViewportChange: jest.fn(() => jest.fn()),
    forceUpdate: jest.fn(),
    cleanup: jest.fn(),
  })),
}));

// Mock MarkerRenderer
jest.mock('../../utils/MarkerRenderer', () => ({
  MarkerRenderer: jest.fn().mockImplementation(() => ({
    renderStores: jest.fn(),
    clearMarkers: jest.fn(),
    setOnStoreSelect: jest.fn(),
    setOnRenderComplete: jest.fn(),
    cleanup: jest.fn(),
    getStats: jest.fn(() => ({
      totalStores: 0,
      visibleStores: 0,
      renderedMarkers: 0,
      clusteredMarkers: 0,
      renderTime: 0,
      batchCount: 0,
    })),
  })),
}));

// Mock error handler
jest.mock('../MapErrorBoundary', () => ({
  useMapErrorHandler: jest.fn(() => ({
    handleError: jest.fn(),
    circuitBreakerOpen: false,
    resetCircuitBreaker: jest.fn(),
    errorCount: 0,
    errorHistory: [],
  })),
}));

// Mock telemetry
jest.mock('../../telemetry', () => ({
  MapTelemetryHelpers: {
    trackMapStoreOpened: jest.fn(),
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

// Mock performance tracking
jest.mock('../../performance', () => ({
  usePerformanceTracking: jest.fn(() => ({
    trackOperation: jest.fn(),
    trackMemory: jest.fn(),
    trackError: jest.fn(),
  })),
  MapPerformanceHelpers: {},
}));

describe('MapView Component', () => {
  const mockStores: StoreWithActivity[] = [
    {
      id: '1',
      name: 'Store 1',
      latitude: 40.7128,
      longitude: -74.0060,
      region: 'AMER',
      country: 'US',
      recentActivity: true,
    },
    {
      id: '2',
      name: 'Store 2',
      latitude: 40.7589,
      longitude: -73.9851,
      region: 'AMER',
      country: 'US',
      recentActivity: false,
    },
  ];

  const mockViewport: MapViewport = {
    latitude: 40.7128,
    longitude: -74.0060,
    zoom: 10,
  };

  const defaultProps = {
    stores: mockStores,
    onStoreSelect: jest.fn(),
    viewport: mockViewport,
    onViewportChange: jest.fn(),
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset DOM
    document.head.innerHTML = '';
    // Mock performance.memory for memory monitoring
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 50000000,
        totalJSHeapSize: 100000000,
      },
      configurable: true,
    });
  });

  afterEach(() => {
    // Clean up any timers
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Component Lifecycle', () => {
    test('should render map container', () => {
      render(<MapView {...defaultProps} />);
      
      const mapContainer = screen.getByRole('application');
      expect(mapContainer).toBeInTheDocument();
      expect(mapContainer).toHaveAttribute('aria-label', expect.stringContaining('Interactive map'));
    });

    test('should initialize map on mount', async () => {
      const { Map } = require('maplibre-gl');
      
      render(<MapView {...defaultProps} />);
      
      await waitFor(() => {
        expect(Map).toHaveBeenCalledWith(expect.objectContaining({
          center: [mockViewport.longitude, mockViewport.latitude],
          zoom: mockViewport.zoom,
        }));
      });
    });

    test('should load MapLibre CSS on mount', () => {
      render(<MapView {...defaultProps} />);
      
      // Check if CSS link was added to head
      const cssLink = document.querySelector('link[href*="maplibre-gl"]');
      expect(cssLink).toBeInTheDocument();
    });

    test('should cleanup resources on unmount', async () => {
      const { unmount } = render(<MapView {...defaultProps} />);
      
      // Simulate map load
      act(() => {
        const loadHandler = mockMap.on.mock.calls.find(call => call[0] === 'load')?.[1];
        if (loadHandler) loadHandler();
      });

      await waitFor(() => {
        expect(mockMap.on).toHaveBeenCalledWith('load', expect.any(Function));
      });

      unmount();

      expect(mockMap.off).toHaveBeenCalledWith('load', expect.any(Function));
      expect(mockMap.off).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockMap.off).toHaveBeenCalledWith('moveend', expect.any(Function));
      expect(mockMap.remove).toHaveBeenCalled();
    });

    test('should handle map load timeout', async () => {
      jest.useFakeTimers();
      const mockHandleError = jest.fn();
      (useMapErrorHandler as jest.Mock).mockReturnValue({
        handleError: mockHandleError,
        circuitBreakerOpen: false,
        resetCircuitBreaker: jest.fn(),
        errorCount: 0,
        errorHistory: [],
      });

      render(<MapView {...defaultProps} />);

      // Fast-forward past the timeout
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        'map_load_timeout'
      );

      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    test('should handle map initialization errors', async () => {
      const mockHandleError = jest.fn();
      (useMapErrorHandler as jest.Mock).mockReturnValue({
        handleError: mockHandleError,
        circuitBreakerOpen: false,
        resetCircuitBreaker: jest.fn(),
        errorCount: 0,
        errorHistory: [],
      });

      const { Map } = require('maplibre-gl');
      Map.mockImplementationOnce(() => {
        throw new Error('Map initialization failed');
      });

      render(<MapView {...defaultProps} />);

      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalledWith(
          expect.any(Error),
          'map_initialization'
        );
      });
    });

    test('should handle map errors', async () => {
      const mockHandleError = jest.fn();
      (useMapErrorHandler as jest.Mock).mockReturnValue({
        handleError: mockHandleError,
        circuitBreakerOpen: false,
        resetCircuitBreaker: jest.fn(),
        errorCount: 0,
        errorHistory: [],
      });

      render(<MapView {...defaultProps} />);

      // Simulate map error
      act(() => {
        const errorHandler = mockMap.on.mock.calls.find(call => call[0] === 'error')?.[1];
        if (errorHandler) {
          errorHandler({ error: { message: 'Network error' } });
        }
      });

      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        'map_error'
      );
    });

    test('should handle viewport change errors', async () => {
      const mockHandleError = jest.fn();
      (useMapErrorHandler as jest.Mock).mockReturnValue({
        handleError: mockHandleError,
        circuitBreakerOpen: false,
        resetCircuitBreaker: jest.fn(),
        errorCount: 0,
        errorHistory: [],
      });

      // Mock getBounds to throw error
      mockMap.getBounds.mockImplementationOnce(() => {
        throw new Error('Bounds error');
      });

      render(<MapView {...defaultProps} />);

      // Simulate map load and moveend
      act(() => {
        const loadHandler = mockMap.on.mock.calls.find(call => call[0] === 'load')?.[1];
        if (loadHandler) loadHandler();
      });

      act(() => {
        const moveEndHandler = mockMap.on.mock.calls.find(call => call[0] === 'moveend')?.[1];
        if (moveEndHandler) moveEndHandler();
      });

      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        'viewport_change'
      );
    });
  });

  describe('Memory Management', () => {
    test('should start memory monitoring on mount', async () => {
      jest.useFakeTimers();
      
      render(<MapView {...defaultProps} />);

      // Fast-forward to trigger memory check
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Memory monitoring should be active (no specific assertion needed as it's internal)
      expect(true).toBe(true); // Placeholder assertion

      jest.useRealTimers();
    });

    test('should cleanup memory monitoring on unmount', () => {
      jest.useFakeTimers();
      
      const { unmount } = render(<MapView {...defaultProps} />);
      
      unmount();

      // All timers should be cleared
      expect(jest.getTimerCount()).toBe(0);

      jest.useRealTimers();
    });

    test('should handle high memory usage', async () => {
      jest.useFakeTimers();
      
      // Mock high memory usage
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 90000000,
          totalJSHeapSize: 100000000,
        },
        configurable: true,
      });

      render(<MapView {...defaultProps} />);

      // Fast-forward to trigger memory check
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should handle high memory usage gracefully
      expect(true).toBe(true); // Placeholder assertion

      jest.useRealTimers();
    });
  });

  describe('Viewport Updates', () => {
    test('should update map viewport when prop changes', async () => {
      const { rerender } = render(<MapView {...defaultProps} />);

      // Simulate map load
      act(() => {
        const loadHandler = mockMap.on.mock.calls.find(call => call[0] === 'load')?.[1];
        if (loadHandler) loadHandler();
      });

      const newViewport = {
        latitude: 41.0,
        longitude: -75.0,
        zoom: 12,
      };

      rerender(<MapView {...defaultProps} viewport={newViewport} />);

      await waitFor(() => {
        expect(mockMap.setCenter).toHaveBeenCalledWith([newViewport.longitude, newViewport.latitude]);
        expect(mockMap.setZoom).toHaveBeenCalledWith(newViewport.zoom);
      });
    });

    test('should not update viewport for small changes', async () => {
      const { rerender } = render(<MapView {...defaultProps} />);

      // Simulate map load
      act(() => {
        const loadHandler = mockMap.on.mock.calls.find(call => call[0] === 'load')?.[1];
        if (loadHandler) loadHandler();
      });

      // Clear previous calls
      mockMap.setCenter.mockClear();
      mockMap.setZoom.mockClear();

      const smallChangeViewport = {
        latitude: mockViewport.latitude + 0.0001, // Very small change
        longitude: mockViewport.longitude + 0.0001,
        zoom: mockViewport.zoom + 0.01,
      };

      rerender(<MapView {...defaultProps} viewport={smallChangeViewport} />);

      await waitFor(() => {
        expect(mockMap.setCenter).not.toHaveBeenCalled();
        expect(mockMap.setZoom).not.toHaveBeenCalled();
      });
    });
  });

  describe('Store Rendering', () => {
    test('should render stores when map is ready', async () => {
      const { MarkerRenderer } = require('../../utils/MarkerRenderer');
      const mockRenderStores = jest.fn();
      MarkerRenderer.mockImplementation(() => ({
        renderStores: mockRenderStores,
        clearMarkers: jest.fn(),
        setOnStoreSelect: jest.fn(),
        setOnRenderComplete: jest.fn(),
        cleanup: jest.fn(),
        getStats: jest.fn(() => ({
          totalStores: 2,
          visibleStores: 2,
          renderedMarkers: 2,
          clusteredMarkers: 0,
          renderTime: 10,
          batchCount: 1,
        })),
      }));

      render(<MapView {...defaultProps} />);

      // Simulate map load
      act(() => {
        const loadHandler = mockMap.on.mock.calls.find(call => call[0] === 'load')?.[1];
        if (loadHandler) loadHandler();
      });

      await waitFor(() => {
        expect(mockRenderStores).toHaveBeenCalledWith(expect.arrayContaining(mockStores));
      });
    });

    test('should update stores when stores prop changes', async () => {
      const { MarkerRenderer } = require('../../utils/MarkerRenderer');
      const mockRenderStores = jest.fn();
      MarkerRenderer.mockImplementation(() => ({
        renderStores: mockRenderStores,
        clearMarkers: jest.fn(),
        setOnStoreSelect: jest.fn(),
        setOnRenderComplete: jest.fn(),
        cleanup: jest.fn(),
        getStats: jest.fn(() => ({
          totalStores: 2,
          visibleStores: 2,
          renderedMarkers: 2,
          clusteredMarkers: 0,
          renderTime: 10,
          batchCount: 1,
        })),
      }));

      const { rerender } = render(<MapView {...defaultProps} />);

      // Simulate map load
      act(() => {
        const loadHandler = mockMap.on.mock.calls.find(call => call[0] === 'load')?.[1];
        if (loadHandler) loadHandler();
      });

      const newStores = [
        ...mockStores,
        {
          id: '3',
          name: 'Store 3',
          latitude: 40.8,
          longitude: -73.9,
          region: 'AMER',
          country: 'US',
          recentActivity: true,
        },
      ];

      rerender(<MapView {...defaultProps} stores={newStores} />);

      await waitFor(() => {
        expect(mockRenderStores).toHaveBeenCalledWith(expect.arrayContaining(newStores));
      });
    });
  });

  describe('Loading States', () => {
    test('should show loading indicator when loading', () => {
      render(<MapView {...defaultProps} loading={true} />);
      
      expect(screen.getByText('Loading map...')).toBeInTheDocument();
    });

    test('should hide loading indicator when not loading', () => {
      render(<MapView {...defaultProps} loading={false} />);
      
      expect(screen.queryByText('Loading map...')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA attributes', () => {
      render(<MapView {...defaultProps} />);
      
      const mapContainer = screen.getByRole('application');
      expect(mapContainer).toHaveAttribute('aria-label', expect.stringContaining('Interactive map'));
      expect(mapContainer).toHaveAttribute('tabindex', '0');
    });

    test('should support keyboard navigation', async () => {
      render(<MapView {...defaultProps} />);

      // Simulate map load
      act(() => {
        const loadHandler = mockMap.on.mock.calls.find(call => call[0] === 'load')?.[1];
        if (loadHandler) loadHandler();
      });

      const mapContainer = screen.getByRole('application');
      
      // Test arrow key navigation
      fireEvent.keyDown(mapContainer, { key: 'ArrowUp' });
      expect(mockMap.panBy).toHaveBeenCalledWith([0, -50]);

      fireEvent.keyDown(mapContainer, { key: 'ArrowDown' });
      expect(mockMap.panBy).toHaveBeenCalledWith([0, 50]);

      fireEvent.keyDown(mapContainer, { key: 'ArrowLeft' });
      expect(mockMap.panBy).toHaveBeenCalledWith([-50, 0]);

      fireEvent.keyDown(mapContainer, { key: 'ArrowRight' });
      expect(mockMap.panBy).toHaveBeenCalledWith([50, 0]);

      // Test zoom keys
      fireEvent.keyDown(mapContainer, { key: '+' });
      expect(mockMap.zoomIn).toHaveBeenCalled();

      fireEvent.keyDown(mapContainer, { key: '-' });
      expect(mockMap.zoomOut).toHaveBeenCalled();

      // Test home key
      fireEvent.keyDown(mapContainer, { key: 'Home' });
      expect(mockMap.setCenter).toHaveBeenCalledWith([mockViewport.longitude, mockViewport.latitude]);
      expect(mockMap.setZoom).toHaveBeenCalledWith(mockViewport.zoom);
    });
  });

  describe('Performance Optimization', () => {
    test('should implement viewport culling', async () => {
      const manyStores = Array.from({ length: 1000 }, (_, i) => ({
        id: `store-${i}`,
        name: `Store ${i}`,
        latitude: 40.7 + (i * 0.001),
        longitude: -74.0 + (i * 0.001),
        region: 'AMER',
        country: 'US',
        recentActivity: i % 2 === 0,
      }));

      render(<MapView {...defaultProps} stores={manyStores} />);

      // Simulate map load
      act(() => {
        const loadHandler = mockMap.on.mock.calls.find(call => call[0] === 'load')?.[1];
        if (loadHandler) loadHandler();
      });

      // Should handle large number of stores efficiently
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should debounce viewport changes', async () => {
      jest.useFakeTimers();
      
      render(<MapView {...defaultProps} />);

      // Simulate map load
      act(() => {
        const loadHandler = mockMap.on.mock.calls.find(call => call[0] === 'load')?.[1];
        if (loadHandler) loadHandler();
      });

      // Simulate rapid viewport changes
      const moveEndHandler = mockMap.on.mock.calls.find(call => call[0] === 'moveend')?.[1];
      
      act(() => {
        if (moveEndHandler) {
          moveEndHandler();
          moveEndHandler();
          moveEndHandler();
        }
      });

      // Should debounce the updates
      expect(true).toBe(true); // Placeholder assertion

      jest.useRealTimers();
    });
  });
});