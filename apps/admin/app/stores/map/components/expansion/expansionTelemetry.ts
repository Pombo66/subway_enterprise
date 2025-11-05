/**
 * Telemetry helpers for expansion predictor events
 */

import { ExpansionTelemetryEvents } from './types';

// Get current user ID (this would typically come from auth context)
const getCurrentUserId = (): string | null => {
  // In a real implementation, this would get the user ID from auth context
  // For now, return a placeholder
  return 'user-placeholder';
};

// Generate session ID for tracking user sessions
let expansionSessionId: string | null = null;

const getExpansionSessionId = (): string => {
  if (!expansionSessionId) {
    expansionSessionId = `expansion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  return expansionSessionId;
};

// Reset session ID (call when user navigates away from expansion)
export const resetExpansionSessionId = (): void => {
  expansionSessionId = null;
};

// Safe event tracking with error handling
const safeTrackEvent = async (eventType: string, properties: any): Promise<void> => {
  try {
    console.info('📊 Expansion telemetry event:', eventType, properties);
    
    // Send to telemetry API
    await fetch('/api/telemetry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType,
        userId: getCurrentUserId(),
        sessionId: getExpansionSessionId(),
        properties: JSON.stringify(properties),
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    // Never let telemetry errors break the user experience
    console.warn('⚠️ Failed to track expansion event:', error);
  }
};

// Expansion telemetry event emitters
export const ExpansionTelemetryHelpers = {
  // Track when expansion mode is toggled
  trackExpansionModeToggled: async (
    enabled: boolean,
    currentFilters: any,
    visibleStoreCount: number
  ): Promise<void> => {
    const event: ExpansionTelemetryEvents['expansion_mode_toggled'] = {
      timestamp: new Date().toISOString(),
      enabled,
      currentFilters,
      visibleStoreCount,
    };
    
    await safeTrackEvent('expansion.mode_toggled', event);
  },

  // Track when region slider is changed
  trackSliderChanged: async (
    region: string,
    previousTarget: number,
    newTarget: number,
    currentMode: 'live' | 'model'
  ): Promise<void> => {
    const event: ExpansionTelemetryEvents['expansion_slider_changed'] = {
      timestamp: new Date().toISOString(),
      region,
      previousTarget,
      newTarget,
      currentMode,
    };
    
    await safeTrackEvent('expansion.slider_changed', event);
  },

  // Track when expansion marker is clicked
  trackMarkerClicked: async (
    recommendationId: string,
    region: string,
    confidence: number,
    finalScore: number,
    isLive: boolean
  ): Promise<void> => {
    const event: ExpansionTelemetryEvents['expansion_marker_clicked'] = {
      timestamp: new Date().toISOString(),
      recommendationId,
      region,
      confidence,
      finalScore,
      isLive,
    };
    
    await safeTrackEvent('expansion.marker_clicked', event);
  },

  // Track when data mode is changed (live vs model)
  trackModeChanged: async (
    previousMode: 'live' | 'model',
    newMode: 'live' | 'model',
    affectedRegions: string[]
  ): Promise<void> => {
    const event: ExpansionTelemetryEvents['expansion_mode_changed'] = {
      timestamp: new Date().toISOString(),
      previousMode,
      newMode,
      affectedRegions,
    };
    
    await safeTrackEvent('expansion.mode_changed', event);
  },

  // Track AI query events
  trackAiQuery: async (
    region: string,
    reasons: string[],
    responseLatency: number
  ): Promise<void> => {
    const event: ExpansionTelemetryEvents['expansion_ai_query'] = {
      timestamp: new Date().toISOString(),
      region,
      reasons,
      responseLatency,
    };
    
    await safeTrackEvent('expansion.ai_query', event);
  },

  // Get telemetry context for other components
  getExpansionTelemetryContext: () => ({
    sessionId: getExpansionSessionId(),
    userId: getCurrentUserId(),
    component: 'expansion_predictor',
    timestamp: new Date().toISOString(),
  }),
};

// Debounced event tracking for high-frequency events
class DebouncedTracker {
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly debounceMs: number;

  constructor(debounceMs: number = 1000) {
    this.debounceMs = debounceMs;
  }

  track(key: string, eventFn: () => Promise<void>): void {
    // Clear existing timeout for this key
    const existingTimeout = this.timeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      try {
        await eventFn();
      } catch (error) {
        console.warn('⚠️ Debounced telemetry event failed:', error);
      } finally {
        this.timeouts.delete(key);
      }
    }, this.debounceMs);

    this.timeouts.set(key, timeout);
  }

  cleanup(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
  }
}

// Export debounced tracker instance
export const debouncedExpansionTracker = new DebouncedTracker(1000);

// Cleanup function for component unmount
export const cleanupExpansionTelemetry = (): void => {
  debouncedExpansionTracker.cleanup();
  resetExpansionSessionId();
};