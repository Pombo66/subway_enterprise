/**
 * Unit tests for map telemetry functionality
 */

import { 
  MapTelemetryHelpers, 
  MapTelemetryEvents, 
  safeTrackEvent, 
  getMapSessionId, 
  resetMapSessionId,
  getMapTelemetryContext 
} from '../telemetry';
import { TelemetryHelpers } from '../../../../lib/telemetry';
import { StoreWithActivity, FilterState } from '../types';

// Mock the TelemetryHelpers
jest.mock('../../../../lib/telemetry', () => ({
  TelemetryHelpers: {
    trackFeatureUsage: jest.fn(),
    trackUserAction: jest.fn(),
    trackError: jest.fn(),
  },
  generateSessionId: jest.fn(() => 'test-session-id'),
}));

describe('Map Telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMapSessionId();
  });

  describe('MapTelemetryEvents', () => {
    it('should have correct event type constants', () => {
      expect(MapTelemetryEvents.MAP_VIEW_OPENED).toBe('map_view_opened');
      expect(MapTelemetryEvents.MAP_FILTER_CHANGED).toBe('map_filter_changed');
      expect(MapTelemetryEvents.MAP_STORE_OPENED).toBe('map_store_opened');
      expect(MapTelemetryEvents.MAP_REFRESH_TICK).toBe('map_refresh_tick');
    });
  });

  describe('Session Management', () => {
    it('should generate and maintain session ID', () => {
      const sessionId1 = getMapSessionId();
      const sessionId2 = getMapSessionId();
      
      expect(sessionId1).toBe(sessionId2);
      expect(sessionId1).toBe('test-session-id');
    });

    it('should reset session ID', () => {
      const sessionId1 = getMapSessionId();
      resetMapSessionId();
      const sessionId2 = getMapSessionId();
      
      expect(sessionId1).toBe(sessionId2); // Both should be 'test-session-id' due to mock
    });
  });

  describe('Context Generation', () => {
    it('should generate proper telemetry context', () => {
      const context = getMapTelemetryContext();
      
      expect(context).toMatchObject({
        sessionId: 'test-session-id',
        component: 'living_map',
        feature: 'stores_map',
        timestamp: expect.any(String),
      });
      
      expect(new Date(context.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('MapTelemetryHelpers', () => {
    describe('trackMapViewOpened', () => {
      it('should track map view opened event', () => {
        MapTelemetryHelpers.trackMapViewOpened('user123', { test: 'data' });
        
        expect(TelemetryHelpers.trackFeatureUsage).toHaveBeenCalledWith(
          'map_view_opened',
          'user123',
          expect.objectContaining({
            sessionId: 'test-session-id',
            component: 'living_map',
            feature: 'stores_map',
            page: '/stores/map',
            eventType: 'initial_load',
            test: 'data',
          })
        );
      });
    });

    describe('trackMapFilterChanged', () => {
      it('should track filter changes', () => {
        const changedFilters = { country: 'US' };
        const allFilters: FilterState = { country: 'US', region: 'West' };
        
        MapTelemetryHelpers.trackMapFilterChanged(
          changedFilters,
          allFilters,
          'user123',
          { test: 'data' }
        );
        
        expect(TelemetryHelpers.trackUserAction).toHaveBeenCalledWith(
          'map_filter_changed',
          'map_filters',
          'user123',
          expect.objectContaining({
            sessionId: 'test-session-id',
            component: 'living_map',
            changedKeys: ['country'],
            changedFilters,
            allFilters,
            filterCount: 2,
            eventType: 'filter_change',
            test: 'data',
          })
        );
      });
    });

    describe('trackMapStoreOpened', () => {
      it('should track store marker clicks', () => {
        const store: StoreWithActivity = {
          id: 'store-123',
          name: 'Test Store',
          latitude: 40.7128,
          longitude: -74.0060,
          region: 'Northeast',
          country: 'US',
          status: 'active',
          recentActivity: true,
          __mockActivity: false,
        };
        
        MapTelemetryHelpers.trackMapStoreOpened(store, 'user123', { test: 'data' });
        
        expect(TelemetryHelpers.trackUserAction).toHaveBeenCalledWith(
          'map_store_opened',
          'store_marker',
          'user123',
          expect.objectContaining({
            sessionId: 'test-session-id',
            component: 'living_map',
            storeId: 'store-123',
            storeName: 'Test Store',
            storeRegion: 'Northeast',
            storeCountry: 'US',
            hasRecentActivity: true,
            isMockActivity: false,
            eventType: 'marker_click',
            test: 'data',
          })
        );
      });
    });

    describe('trackMapRefreshTick', () => {
      it('should track data refresh events', () => {
        const filters: FilterState = { country: 'US' };
        
        MapTelemetryHelpers.trackMapRefreshTick(
          50, // visibleStoreCount
          100, // totalStoreCount
          10, // activeStoreCount
          filters,
          'user123',
          { test: 'data' }
        );
        
        expect(TelemetryHelpers.trackFeatureUsage).toHaveBeenCalledWith(
          'map_refresh_tick',
          'user123',
          expect.objectContaining({
            sessionId: 'test-session-id',
            component: 'living_map',
            visibleStoreCount: 50,
            totalStoreCount: 100,
            activeStoreCount: 10,
            hasFilters: true,
            filterCount: 1,
            appliedFilters: filters,
            eventType: 'data_refresh',
            test: 'data',
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle telemetry errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorTrackingSpy = jest.spyOn(TelemetryHelpers, 'trackError');
      
      const throwingFunction = () => {
        throw new Error('Test error');
      };
      
      // Should not throw
      expect(() => {
        safeTrackEvent(throwingFunction, 'test_event');
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to track test_event telemetry event:',
        expect.any(Error)
      );
      
      expect(errorTrackingSpy).toHaveBeenCalledWith(
        expect.any(Error),
        'telemetry_failure_test_event',
        undefined,
        expect.objectContaining({
          originalEvent: 'test_event',
          component: 'living_map',
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle double telemetry failures', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock TelemetryHelpers.trackError to also throw
      jest.spyOn(TelemetryHelpers, 'trackError').mockImplementation(() => {
        throw new Error('Secondary error');
      });
      
      const throwingFunction = () => {
        throw new Error('Primary error');
      };
      
      // Should still not throw
      expect(() => {
        safeTrackEvent(throwingFunction, 'test_event');
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to track telemetry error:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});