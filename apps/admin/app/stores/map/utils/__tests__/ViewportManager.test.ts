import { ViewportManager, Viewport, Bounds, ViewportChangeEvent } from '../ViewportManager';

describe('ViewportManager', () => {
  let viewportManager: ViewportManager;
  
  const mockViewport: Viewport = {
    latitude: 40.7128,
    longitude: -74.0060,
    zoom: 10,
  };

  const mockBounds: Bounds = {
    north: 40.8,
    south: 40.6,
    east: -73.9,
    west: -74.1,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    viewportManager = new ViewportManager({
      debounceDelay: 300,
      maxDebounceDelay: 1000,
      immediateThreshold: 50,
    });
  });

  afterEach(() => {
    viewportManager.cleanup();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    test('should initialize with default options', () => {
      const defaultManager = new ViewportManager();
      expect(defaultManager).toBeInstanceOf(ViewportManager);
      defaultManager.cleanup();
    });

    test('should initialize with custom options', () => {
      const customManager = new ViewportManager({
        debounceDelay: 500,
        maxDebounceDelay: 2000,
        immediateThreshold: 100,
      });
      expect(customManager).toBeInstanceOf(ViewportManager);
      customManager.cleanup();
    });

    test('should start with null viewport and bounds', () => {
      expect(viewportManager.getCurrentViewport()).toBeNull();
      expect(viewportManager.getCurrentBounds()).toBeNull();
    });
  });

  describe('Viewport Updates', () => {
    test('should update viewport immediately for first update', () => {
      const mockCallback = jest.fn();
      viewportManager.onViewportChange(mockCallback);

      viewportManager.updateViewport(mockViewport, mockBounds, 'user');

      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        viewport: mockViewport,
        bounds: mockBounds,
        source: 'user',
        timestamp: expect.any(Number),
      }));
    });

    test('should update viewport immediately for programmatic updates', () => {
      const mockCallback = jest.fn();
      viewportManager.onViewportChange(mockCallback);

      // Set initial viewport
      viewportManager.updateViewport(mockViewport, mockBounds, 'user');
      mockCallback.mockClear();

      // Programmatic update should be immediate
      const newViewport = { ...mockViewport, zoom: 12 };
      viewportManager.updateViewport(newViewport, mockBounds, 'programmatic');

      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        viewport: newViewport,
        source: 'programmatic',
      }));
    });

    test('should debounce user viewport updates', () => {
      const mockCallback = jest.fn();
      viewportManager.onViewportChange(mockCallback);

      // Set initial viewport
      viewportManager.updateViewport(mockViewport, mockBounds, 'user');
      mockCallback.mockClear();

      // Rapid user updates should be debounced
      const newViewport1 = { ...mockViewport, latitude: 40.8 };
      const newViewport2 = { ...mockViewport, latitude: 40.9 };
      
      viewportManager.updateViewport(newViewport1, mockBounds, 'user');
      viewportManager.updateViewport(newViewport2, mockBounds, 'user');

      // Should not call callback immediately
      expect(mockCallback).not.toHaveBeenCalled();

      // Fast-forward past debounce delay
      jest.advanceTimersByTime(300);

      // Should call callback with latest viewport
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        viewport: newViewport2,
      }));
    });

    test('should force immediate update after max debounce delay', () => {
      const mockCallback = jest.fn();
      viewportManager.onViewportChange(mockCallback);

      // Set initial viewport
      viewportManager.updateViewport(mockViewport, mockBounds, 'user');
      mockCallback.mockClear();

      // Update that would normally be debounced
      const newViewport = { ...mockViewport, latitude: 40.8 };
      
      // Fast-forward past max debounce delay
      jest.advanceTimersByTime(1100);
      
      viewportManager.updateViewport(newViewport, mockBounds, 'user');

      // Should be immediate due to max delay
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        viewport: newViewport,
      }));
    });

    test('should handle rapid updates as immediate', () => {
      const mockCallback = jest.fn();
      viewportManager.onViewportChange(mockCallback);

      // Set initial viewport
      viewportManager.updateViewport(mockViewport, mockBounds, 'user');
      mockCallback.mockClear();

      // Very rapid update (within immediate threshold)
      const newViewport = { ...mockViewport, latitude: 40.8 };
      
      // Advance time by less than immediate threshold
      jest.advanceTimersByTime(30);
      
      viewportManager.updateViewport(newViewport, mockBounds, 'user');

      // Should be immediate due to rapid timing
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        viewport: newViewport,
      }));
    });

    test('should handle significant zoom changes as immediate', () => {
      const mockCallback = jest.fn();
      viewportManager.onViewportChange(mockCallback);

      // Set initial viewport
      viewportManager.updateViewport(mockViewport, mockBounds, 'user');
      mockCallback.mockClear();

      // Significant zoom change
      const newViewport = { ...mockViewport, zoom: 15 }; // +5 zoom levels
      
      viewportManager.updateViewport(newViewport, mockBounds, 'user');

      // Should be immediate due to significant zoom change
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        viewport: newViewport,
      }));
    });

    test('should handle significant position changes as immediate', () => {
      const mockCallback = jest.fn();
      viewportManager.onViewportChange(mockCallback);

      // Set initial viewport
      viewportManager.updateViewport(mockViewport, mockBounds, 'user');
      mockCallback.mockClear();

      // Significant position change
      const newViewport = { 
        ...mockViewport, 
        latitude: 42.0, // +1.3 degrees
        longitude: -72.0, // +2.0 degrees
      };
      
      viewportManager.updateViewport(newViewport, mockBounds, 'user');

      // Should be immediate due to significant position change
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        viewport: newViewport,
      }));
    });
  });

  describe('Force Update', () => {
    test('should force immediate update bypassing debouncing', () => {
      const mockCallback = jest.fn();
      viewportManager.onViewportChange(mockCallback);

      // Set initial viewport
      viewportManager.updateViewport(mockViewport, mockBounds, 'user');
      mockCallback.mockClear();

      // Schedule a debounced update
      const debouncedViewport = { ...mockViewport, latitude: 40.8 };
      viewportManager.updateViewport(debouncedViewport, mockBounds, 'user');

      // Force update should cancel debounced update and execute immediately
      const forcedViewport = { ...mockViewport, latitude: 40.9 };
      viewportManager.forceUpdate(forcedViewport, mockBounds, 'programmatic');

      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        viewport: forcedViewport,
        source: 'programmatic',
      }));
    });

    test('should cancel pending debounced updates when forcing', () => {
      const mockCallback = jest.fn();
      viewportManager.onViewportChange(mockCallback);

      // Set initial viewport
      viewportManager.updateViewport(mockViewport, mockBounds, 'user');
      mockCallback.mockClear();

      // Schedule a debounced update
      const debouncedViewport = { ...mockViewport, latitude: 40.8 };
      viewportManager.updateViewport(debouncedViewport, mockBounds, 'user');

      // Force update
      const forcedViewport = { ...mockViewport, latitude: 40.9 };
      viewportManager.forceUpdate(forcedViewport, mockBounds, 'programmatic');

      // Clear the callback calls from force update
      mockCallback.mockClear();

      // Fast-forward past debounce delay
      jest.advanceTimersByTime(300);

      // Should not call callback again (debounced update was cancelled)
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Viewport State Management', () => {
    test('should return current viewport', () => {
      viewportManager.updateViewport(mockViewport, mockBounds, 'user');

      const currentViewport = viewportManager.getCurrentViewport();
      expect(currentViewport).toEqual(mockViewport);
      expect(currentViewport).not.toBe(mockViewport); // Should be a copy
    });

    test('should return current bounds', () => {
      viewportManager.updateViewport(mockViewport, mockBounds, 'user');

      const currentBounds = viewportManager.getCurrentBounds();
      expect(currentBounds).toEqual(mockBounds);
      expect(currentBounds).not.toBe(mockBounds); // Should be a copy
    });

    test('should check if point is in viewport', () => {
      viewportManager.updateViewport(mockViewport, mockBounds, 'user');

      // Point inside viewport
      expect(viewportManager.isInViewport(40.7, -74.0)).toBe(true);

      // Point outside viewport
      expect(viewportManager.isInViewport(41.0, -73.0)).toBe(false);

      // Point inside viewport with buffer
      expect(viewportManager.isInViewport(40.85, -73.85, 0.1)).toBe(true);
    });

    test('should return false for isInViewport when no bounds set', () => {
      expect(viewportManager.isInViewport(40.7, -74.0)).toBe(false);
    });
  });

  describe('Callback Management', () => {
    test('should subscribe to viewport changes', () => {
      const mockCallback = jest.fn();
      const unsubscribe = viewportManager.onViewportChange(mockCallback);

      viewportManager.updateViewport(mockViewport, mockBounds, 'user');

      expect(mockCallback).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    test('should unsubscribe from viewport changes', () => {
      const mockCallback = jest.fn();
      const unsubscribe = viewportManager.onViewportChange(mockCallback);

      viewportManager.updateViewport(mockViewport, mockBounds, 'user');
      expect(mockCallback).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();
      mockCallback.mockClear();

      // Update again
      const newViewport = { ...mockViewport, zoom: 12 };
      viewportManager.forceUpdate(newViewport, mockBounds, 'programmatic');

      expect(mockCallback).not.toHaveBeenCalled();
    });

    test('should handle multiple callbacks', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      viewportManager.onViewportChange(mockCallback1);
      viewportManager.onViewportChange(mockCallback2);

      viewportManager.updateViewport(mockViewport, mockBounds, 'user');

      expect(mockCallback1).toHaveBeenCalled();
      expect(mockCallback2).toHaveBeenCalled();
    });

    test('should handle callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = jest.fn();

      // Spy on console.warn to check error handling
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      viewportManager.onViewportChange(errorCallback);
      viewportManager.onViewportChange(normalCallback);

      viewportManager.updateViewport(mockViewport, mockBounds, 'user');

      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Error in viewport change callback:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Pending Updates Management', () => {
    test('should cancel pending updates', () => {
      const mockCallback = jest.fn();
      viewportManager.onViewportChange(mockCallback);

      // Set initial viewport
      viewportManager.updateViewport(mockViewport, mockBounds, 'user');
      mockCallback.mockClear();

      // Schedule a debounced update
      const debouncedViewport = { ...mockViewport, latitude: 40.8 };
      viewportManager.updateViewport(debouncedViewport, mockBounds, 'user');

      // Cancel pending updates
      viewportManager.cancelPendingUpdates();

      // Fast-forward past debounce delay
      jest.advanceTimersByTime(300);

      // Should not call callback (update was cancelled)
      expect(mockCallback).not.toHaveBeenCalled();
    });

    test('should replace pending update with new one', () => {
      const mockCallback = jest.fn();
      viewportManager.onViewportChange(mockCallback);

      // Set initial viewport
      viewportManager.updateViewport(mockViewport, mockBounds, 'user');
      mockCallback.mockClear();

      // Schedule first debounced update
      const firstViewport = { ...mockViewport, latitude: 40.8 };
      viewportManager.updateViewport(firstViewport, mockBounds, 'user');

      // Schedule second debounced update (should replace first)
      const secondViewport = { ...mockViewport, latitude: 40.9 };
      viewportManager.updateViewport(secondViewport, mockBounds, 'user');

      // Fast-forward past debounce delay
      jest.advanceTimersByTime(300);

      // Should call callback with second viewport only
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
        viewport: secondViewport,
      }));
    });
  });

  describe('Statistics', () => {
    test('should return initial statistics', () => {
      const stats = viewportManager.getStats();

      expect(stats).toEqual({
        updateCount: 0,
        lastUpdateTime: 0,
        isUpdating: false,
        hasPendingUpdate: false,
        callbackCount: 0,
      });
    });

    test('should update statistics after viewport updates', () => {
      const mockCallback = jest.fn();
      viewportManager.onViewportChange(mockCallback);

      viewportManager.updateViewport(mockViewport, mockBounds, 'user');

      const stats = viewportManager.getStats();

      expect(stats.updateCount).toBe(1);
      expect(stats.lastUpdateTime).toBeGreaterThan(0);
      expect(stats.isUpdating).toBe(false);
      expect(stats.hasPendingUpdate).toBe(false);
      expect(stats.callbackCount).toBe(1);
    });

    test('should show pending update in statistics', () => {
      const mockCallback = jest.fn();
      viewportManager.onViewportChange(mockCallback);

      // Set initial viewport
      viewportManager.updateViewport(mockViewport, mockBounds, 'user');

      // Schedule debounced update
      const newViewport = { ...mockViewport, latitude: 40.8 };
      viewportManager.updateViewport(newViewport, mockBounds, 'user');

      const stats = viewportManager.getStats();
      expect(stats.hasPendingUpdate).toBe(true);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup all resources', () => {
      const mockCallback = jest.fn();
      viewportManager.onViewportChange(mockCallback);

      // Set viewport and schedule update
      viewportManager.updateViewport(mockViewport, mockBounds, 'user');
      const newViewport = { ...mockViewport, latitude: 40.8 };
      viewportManager.updateViewport(newViewport, mockBounds, 'user');

      // Cleanup
      viewportManager.cleanup();

      // Should clear all state
      expect(viewportManager.getCurrentViewport()).toBeNull();
      expect(viewportManager.getCurrentBounds()).toBeNull();

      const stats = viewportManager.getStats();
      expect(stats.updateCount).toBe(0);
      expect(stats.callbackCount).toBe(0);
      expect(stats.hasPendingUpdate).toBe(false);

      // Fast-forward past debounce delay
      jest.advanceTimersByTime(300);

      // Should not call callback after cleanup
      expect(mockCallback).toHaveBeenCalledTimes(1); // Only the initial call
    });

    test('should handle operations after cleanup gracefully', () => {
      viewportManager.cleanup();

      // Should not throw errors
      expect(() => {
        viewportManager.updateViewport(mockViewport, mockBounds, 'user');
        viewportManager.forceUpdate(mockViewport, mockBounds, 'programmatic');
        viewportManager.cancelPendingUpdates();
      }).not.toThrow();
    });

    test('should handle multiple cleanup calls', () => {
      viewportManager.cleanup();
      
      // Should not throw error when cleaning up again
      expect(() => viewportManager.cleanup()).not.toThrow();
    });
  });

  describe('Concurrent Updates', () => {
    test('should prevent concurrent updates', () => {
      const mockCallback = jest.fn();
      viewportManager.onViewportChange(mockCallback);

      // Mock isUpdating to simulate concurrent update attempt
      const originalExecuteUpdate = (viewportManager as any).executeUpdate;
      let isFirstCall = true;
      
      (viewportManager as any).executeUpdate = function(...args: any[]) {
        if (isFirstCall) {
          isFirstCall = false;
          // Simulate concurrent call during first update
          (this as any).isUpdating = true;
          originalExecuteUpdate.call(this, ...args);
          
          // Try to execute another update while first is running
          originalExecuteUpdate.call(this, ...args);
        } else {
          originalExecuteUpdate.call(this, ...args);
        }
      };

      viewportManager.updateViewport(mockViewport, mockBounds, 'user');

      // Should only call callback once despite concurrent attempt
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    test('should handle viewport updates with same values', () => {
      const mockCallback = jest.fn();
      viewportManager.onViewportChange(mockCallback);

      // Set initial viewport
      viewportManager.updateViewport(mockViewport, mockBounds, 'user');
      mockCallback.mockClear();

      // Update with same values
      viewportManager.updateViewport(mockViewport, mockBounds, 'user');

      // Should still trigger update (no deduplication by design)
      jest.advanceTimersByTime(300);
      expect(mockCallback).toHaveBeenCalled();
    });

    test('should handle invalid viewport values gracefully', () => {
      const mockCallback = jest.fn();
      viewportManager.onViewportChange(mockCallback);

      const invalidViewport = {
        latitude: NaN,
        longitude: Infinity,
        zoom: -1,
      };

      // Should not throw error
      expect(() => {
        viewportManager.updateViewport(invalidViewport, mockBounds, 'user');
      }).not.toThrow();
    });

    test('should handle viewport updates during cleanup', () => {
      const mockCallback = jest.fn();
      viewportManager.onViewportChange(mockCallback);

      // Start cleanup
      viewportManager.cleanup();

      // Try to update after cleanup
      viewportManager.updateViewport(mockViewport, mockBounds, 'user');

      // Should not call callback
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});