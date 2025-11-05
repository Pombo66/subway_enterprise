'use client';

import { useCallback, useEffect, useRef } from 'react';
import { 
  ExpansionTelemetryHelpers, 
  debouncedExpansionTracker, 
  cleanupExpansionTelemetry 
} from '../components/expansion/expansionTelemetry';
import { ExpansionRecommendation } from '../components/expansion/types';

export interface UseExpansionTelemetryReturn {
  trackModeToggled: (enabled: boolean, currentFilters: any, visibleStoreCount: number) => void;
  trackSliderChanged: (region: string, previousTarget: number, newTarget: number, currentMode: 'live' | 'model') => void;
  trackMarkerClicked: (recommendation: ExpansionRecommendation) => void;
  trackModeChanged: (previousMode: 'live' | 'model', newMode: 'live' | 'model', affectedRegions: string[]) => void;
  trackAiQuery: (region: string, reasons: string[], responseLatency: number) => void;
}

/**
 * Hook for tracking expansion predictor telemetry events
 */
export function useExpansionTelemetry(): UseExpansionTelemetryReturn {
  const previousModeRef = useRef<'live' | 'model' | null>(null);
  const sliderValuesRef = useRef<Record<string, number>>({});

  // Track expansion mode toggle
  const trackModeToggled = useCallback((
    enabled: boolean, 
    currentFilters: any, 
    visibleStoreCount: number
  ) => {
    ExpansionTelemetryHelpers.trackExpansionModeToggled(
      enabled, 
      currentFilters, 
      visibleStoreCount
    );
  }, []);

  // Track slider changes with debouncing
  const trackSliderChanged = useCallback((
    region: string, 
    previousTarget: number, 
    newTarget: number, 
    currentMode: 'live' | 'model'
  ) => {
    // Store current value for future reference
    sliderValuesRef.current[region] = newTarget;

    // Use debounced tracking to avoid excessive events
    debouncedExpansionTracker.track(
      `slider-${region}`,
      () => ExpansionTelemetryHelpers.trackSliderChanged(
        region, 
        previousTarget, 
        newTarget, 
        currentMode
      )
    );
  }, []);

  // Track marker clicks
  const trackMarkerClicked = useCallback((recommendation: ExpansionRecommendation) => {
    ExpansionTelemetryHelpers.trackMarkerClicked(
      recommendation.id,
      recommendation.region,
      recommendation.confidence,
      recommendation.finalScore,
      recommendation.isLive
    );
  }, []);

  // Track mode changes (live vs model)
  const trackModeChanged = useCallback((
    previousMode: 'live' | 'model', 
    newMode: 'live' | 'model', 
    affectedRegions: string[]
  ) => {
    // Only track if mode actually changed
    if (previousMode !== newMode) {
      ExpansionTelemetryHelpers.trackModeChanged(
        previousMode, 
        newMode, 
        affectedRegions
      );
      previousModeRef.current = newMode;
    }
  }, []);

  // Track AI queries
  const trackAiQuery = useCallback((
    region: string, 
    reasons: string[], 
    responseLatency: number
  ) => {
    ExpansionTelemetryHelpers.trackAiQuery(region, reasons, responseLatency);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupExpansionTelemetry();
    };
  }, []);

  return {
    trackModeToggled,
    trackSliderChanged,
    trackMarkerClicked,
    trackModeChanged,
    trackAiQuery
  };
}