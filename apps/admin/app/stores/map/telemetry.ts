/**
 * Map-specific telemetry events and utilities
 * Implements telemetry tracking for the Living Map feature
 * 
 * This module provides a complete telemetry integration for the Living Map feature,
 * including:
 * 
 * - Integration with existing TelemetryHelpers for consistent event submission
 * - Comprehensive error handling that prevents telemetry failures from breaking UX
 * - Rich context data including session IDs, timestamps, and browser information
 * - Safe event tracking that gracefully handles failures
 * - User ID resolution from multiple sources (localStorage, sessionStorage)
 * 
 * All telemetry events are tracked through the existing infrastructure to ensure
 * consistency across the application while providing map-specific context and metadata.
 * 
 * Usage:
 * - Use safeTrackEvent() wrapper for all telemetry calls to ensure error safety
 * - MapTelemetryHelpers provides pre-configured tracking functions for common events
 * - All events include comprehensive context data for better analytics
 * 
 * Events tracked:
 * - map_view_opened: When the map page is initially loaded
 * - map_filter_changed: When users change any filter settings
 * - map_store_opened: When users click on store markers
 * - map_refresh_tick: During periodic data refresh cycles
 */

import { TelemetryHelpers, generateSessionId } from '../../../lib/telemetry';
import { FilterState, StoreWithActivity } from './types';

/**
 * Map-specific telemetry event types
 */
export const MapTelemetryEvents = {
  MAP_VIEW_OPENED: 'map_view_opened',
  MAP_FILTER_CHANGED: 'map_filter_changed', 
  MAP_STORE_OPENED: 'map_store_opened',
  MAP_REFRESH_TICK: 'map_refresh_tick',
  MAP_PERFORMANCE_METRIC: 'map_performance_metric',
  MAP_API_PERFORMANCE: 'map_api_performance',
  MAP_COMPONENT_ERROR: 'map_component_error',
  MAP_OPERATION_PERFORMANCE: 'map_operation_performance',
  MAP_MEMORY_USAGE: 'map_memory_usage',
} as const;

/**
 * Map telemetry helper functions
 */
export const MapTelemetryHelpers = {
  /**
   * Track when the map view is initially opened
   */
  trackMapViewOpened: (userId?: string, additionalProperties?: Record<string, any>) => {
    TelemetryHelpers.trackFeatureUsage(
      MapTelemetryEvents.MAP_VIEW_OPENED,
      userId || getCurrentUserId(),
      {
        ...getMapTelemetryContext(),
        page: '/stores/map',
        eventType: 'initial_load',
        ...additionalProperties,
      }
    );
  },

  /**
   * Track when map filters are changed
   */
  trackMapFilterChanged: (
    changedFilters: Partial<FilterState>,
    allFilters: FilterState,
    userId?: string,
    additionalProperties?: Record<string, any>
  ) => {
    const changedKeys = Object.keys(changedFilters);
    
    TelemetryHelpers.trackUserAction(
      MapTelemetryEvents.MAP_FILTER_CHANGED,
      'map_filters',
      userId || getCurrentUserId(),
      {
        ...getMapTelemetryContext(),
        changedKeys,
        changedFilters,
        allFilters,
        filterCount: Object.keys(allFilters).filter(key => allFilters[key as keyof FilterState]).length,
        eventType: 'filter_change',
        ...additionalProperties,
      }
    );
  },

  /**
   * Track when a store marker is clicked and drawer opened
   */
  trackMapStoreOpened: (
    store: StoreWithActivity,
    userId?: string,
    additionalProperties?: Record<string, any>
  ) => {
    TelemetryHelpers.trackUserAction(
      MapTelemetryEvents.MAP_STORE_OPENED,
      'store_marker',
      userId || getCurrentUserId(),
      {
        ...getMapTelemetryContext(),
        storeId: store.id,
        storeName: store.name,
        storeRegion: store.region,
        storeCountry: store.country,
        hasRecentActivity: store.recentActivity,
        isMockActivity: store.__mockActivity || false,
        eventType: 'marker_click',
        ...additionalProperties,
      }
    );
  },

  /**
   * Track periodic data refresh cycles
   */
  trackMapRefreshTick: (
    visibleStoreCount: number,
    totalStoreCount: number,
    activeStoreCount: number,
    filters: FilterState,
    userId?: string,
    additionalProperties?: Record<string, any>
  ) => {
    TelemetryHelpers.trackFeatureUsage(
      MapTelemetryEvents.MAP_REFRESH_TICK,
      userId || getCurrentUserId(),
      {
        ...getMapTelemetryContext(),
        visibleStoreCount,
        totalStoreCount,
        activeStoreCount,
        hasFilters: Object.keys(filters).length > 0,
        filterCount: Object.keys(filters).filter(key => filters[key as keyof FilterState]).length,
        appliedFilters: filters,
        eventType: 'data_refresh',
        ...additionalProperties,
      }
    );
  },

  /**
   * Track retry attempts when map fails to load
   */
  trackMapRetry: (
    retryCount: number,
    userId?: string,
    additionalProperties?: Record<string, any>
  ) => {
    TelemetryHelpers.trackUserAction(
      'map_retry',
      'error_recovery',
      userId || getCurrentUserId(),
      {
        ...getMapTelemetryContext(),
        retryCount,
        eventType: 'retry_attempt',
        ...additionalProperties,
      }
    );
  },

  /**
   * Track fallback to list view when map fails
   */
  trackMapFallback: (
    userId?: string,
    additionalProperties?: Record<string, any>
  ) => {
    TelemetryHelpers.trackUserAction(
      'map_fallback',
      'error_recovery',
      userId || getCurrentUserId(),
      {
        ...getMapTelemetryContext(),
        eventType: 'fallback_navigation',
        fallbackTarget: 'stores_list',
        ...additionalProperties,
      }
    );
  },

  /**
   * Track map errors for debugging and monitoring
   */
  trackMapError: (
    error: Error,
    userId?: string,
    additionalProperties?: Record<string, any>
  ) => {
    TelemetryHelpers.trackError(
      error,
      'map_error',
      userId || getCurrentUserId(),
      {
        ...getMapTelemetryContext(),
        errorMessage: error.message,
        errorStack: error.stack,
        eventType: 'error',
        ...additionalProperties,
      }
    );
  },
};

/**
 * Utility function to safely track telemetry events with error handling
 * Ensures telemetry failures don't break the user experience
 * Integrates with existing telemetry infrastructure for consistent error reporting
 */
export function safeTrackEvent(trackingFunction: () => void, eventName: string): void {
  try {
    trackingFunction();
  } catch (error) {
    console.warn(`Failed to track ${eventName} telemetry event:`, error);
    
    // Track the telemetry failure itself using the base TelemetryHelpers
    // This ensures consistent error reporting across the application
    try {
      TelemetryHelpers.trackError(
        error instanceof Error ? error : new Error(String(error)),
        `telemetry_failure_${eventName}`,
        getCurrentUserId(),
        {
          originalEvent: eventName,
          component: 'living_map',
          feature: 'stores_map',
          sessionId: getMapSessionId(),
          timestamp: new Date().toISOString(),
          userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        }
      );
    } catch (secondaryError) {
      // If even error tracking fails, just log it
      // This prevents infinite error loops while still providing debugging info
      console.error('Failed to track telemetry error:', secondaryError);
    }
    
    // Don't re-throw - telemetry failures should not break functionality
  }
}

// Session ID for the current map session
let mapSessionId: string | null = null;

/**
 * Get or create a session ID for the current map session
 * Uses the same session ID generation as the main telemetry system
 */
export function getMapSessionId(): string {
  if (!mapSessionId) {
    mapSessionId = generateSessionId();
  }
  return mapSessionId;
}

/**
 * Reset the map session ID (useful for testing or when user navigates away and back)
 */
export function resetMapSessionId(): void {
  mapSessionId = null;
}

/**
 * Helper to get user ID from context
 * Attempts to get user ID from various sources in the browser environment
 */
export function getCurrentUserId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    // Try to get user ID from localStorage (common auth pattern)
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user?.id) {
        return user.id;
      }
    }

    // Try to get from sessionStorage as fallback
    const sessionUserStr = sessionStorage.getItem('user');
    if (sessionUserStr) {
      const user = JSON.parse(sessionUserStr);
      if (user?.id) {
        return user.id;
      }
    }

    // Could also check for auth cookies or other auth mechanisms here
    // For now, return undefined and let TelemetryHelpers handle it
    return undefined;
  } catch (error) {
    // If there's any error parsing user data, just return undefined
    console.debug('Could not retrieve user ID for telemetry:', error);
    return undefined;
  }
}

/**
 * Get common context data for all map telemetry events
 * Includes comprehensive context information for better analytics
 */
export function getMapTelemetryContext(): Record<string, any> {
  const context: Record<string, any> = {
    sessionId: getMapSessionId(),
    component: 'living_map',
    feature: 'stores_map',
    timestamp: new Date().toISOString(),
  };

  // Add browser-specific context data when available
  if (typeof window !== 'undefined') {
    context.userAgent = navigator.userAgent;
    context.url = window.location.href;
    context.referrer = document.referrer || 'direct';
    context.viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    
    // Add performance timing if available
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      context.pageLoadTime = timing.loadEventEnd - timing.navigationStart;
    }

    // Add connection information if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        context.connectionType = connection.effectiveType;
        context.connectionDownlink = connection.downlink;
      }
    }

    // Add timezone information
    context.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    context.language = navigator.language;
  }

  return context;
}