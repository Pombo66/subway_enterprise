'use client';

import { useCallback } from 'react';
import { ScopeSelection, ExpansionSuggestion } from '../components/expansion/types';

// Telemetry event interfaces
interface ScopeChangedEvent {
  timestamp: string;
  scopeType: string;
  scopeValue: string;
  scopeArea?: number;
  previousScope?: {
    type: string;
    value: string;
  };
}

interface IntensityAdjustedEvent {
  timestamp: string;
  intensity: number;
  previousIntensity: number;
  scopeType: string;
  scopeValue: string;
  targetSuggestions: number;
}

interface DataModeToggledEvent {
  timestamp: string;
  dataMode: 'live' | 'modelled';
  previousMode: 'live' | 'modelled';
  scopeType: string;
  scopeValue: string;
  modelVersion: string;
}

interface SuggestionsLockedEvent {
  timestamp: string;
  isLocked: boolean;
  suggestionCount: number;
  scopeType: string;
  scopeValue: string;
  intensity: number;
}

interface SuggestionInteractionEvent {
  timestamp: string;
  eventType: 'hovered' | 'clicked';
  suggestionId: string;
  suggestionScore: number;
  suggestionConfidence: number;
  dataMode: string;
  scopeType: string;
  scopeValue: string;
}

interface PipelineSentEvent {
  timestamp: string;
  suggestionId: string;
  suggestionScore: number;
  suggestionConfidence: number;
  dataMode: string;
  scopeType: string;
  scopeValue: string;
  pipelineSize: number;
}

interface AIAnalysisEvent {
  timestamp: string;
  suggestionId: string;
  scopeType: string;
  scopeValue: string;
  hasCustomReasons: boolean;
  responseLatency?: number;
}

export const useScopeExpansionTelemetry = () => {
  // Emit telemetry event to backend
  const emitTelemetryEvent = useCallback(async (eventType: string, properties: any) => {
    try {
      // In a real implementation, this would send to your analytics service
      // For now, we'll log to console and could send to your backend
      console.info(`📊 Telemetry: ${eventType}`, properties);
      
      // Optional: Send to backend telemetry endpoint
      if (typeof window !== 'undefined') {
        fetch('/api/telemetry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventType,
            properties,
            timestamp: new Date().toISOString(),
            sessionId: sessionStorage.getItem('sessionId') || 'unknown',
            userId: localStorage.getItem('userId') || 'anonymous'
          })
        }).catch(error => {
          console.warn('Failed to send telemetry:', error);
        });
      }
    } catch (error) {
      console.warn('Telemetry emission failed:', error);
    }
  }, []);

  // Scope changed event
  const trackScopeChanged = useCallback((
    newScope: ScopeSelection,
    previousScope?: ScopeSelection
  ) => {
    const event: ScopeChangedEvent = {
      timestamp: new Date().toISOString(),
      scopeType: newScope.type,
      scopeValue: newScope.value,
      scopeArea: newScope.area,
      previousScope: previousScope ? {
        type: previousScope.type,
        value: previousScope.value
      } : undefined
    };

    emitTelemetryEvent('expansion.scope_changed', event);
  }, [emitTelemetryEvent]);

  // Intensity adjusted event
  const trackIntensityAdjusted = useCallback((
    intensity: number,
    previousIntensity: number,
    scope: ScopeSelection,
    targetSuggestions: number
  ) => {
    const event: IntensityAdjustedEvent = {
      timestamp: new Date().toISOString(),
      intensity,
      previousIntensity,
      scopeType: scope.type,
      scopeValue: scope.value,
      targetSuggestions
    };

    emitTelemetryEvent('expansion.intensity_adjusted', event);
  }, [emitTelemetryEvent]);

  // Data mode toggled event
  const trackDataModeToggled = useCallback((
    dataMode: 'live' | 'modelled',
    previousMode: 'live' | 'modelled',
    scope: ScopeSelection,
    modelVersion: string
  ) => {
    const event: DataModeToggledEvent = {
      timestamp: new Date().toISOString(),
      dataMode,
      previousMode,
      scopeType: scope.type,
      scopeValue: scope.value,
      modelVersion
    };

    emitTelemetryEvent('expansion.data_mode_toggled', event);
  }, [emitTelemetryEvent]);

  // Suggestions locked event
  const trackSuggestionsLocked = useCallback((
    isLocked: boolean,
    suggestionCount: number,
    scope: ScopeSelection,
    intensity: number
  ) => {
    const event: SuggestionsLockedEvent = {
      timestamp: new Date().toISOString(),
      isLocked,
      suggestionCount,
      scopeType: scope.type,
      scopeValue: scope.value,
      intensity
    };

    emitTelemetryEvent('expansion.suggestions_locked', event);
  }, [emitTelemetryEvent]);

  // Suggestion interaction events
  const trackSuggestionHovered = useCallback((
    suggestion: ExpansionSuggestion,
    scope: ScopeSelection
  ) => {
    const event: SuggestionInteractionEvent = {
      timestamp: new Date().toISOString(),
      eventType: 'hovered',
      suggestionId: suggestion.id,
      suggestionScore: suggestion.finalScore,
      suggestionConfidence: suggestion.confidence,
      dataMode: suggestion.dataMode,
      scopeType: scope.type,
      scopeValue: scope.value
    };

    emitTelemetryEvent('expansion.suggestion_hovered', event);
  }, [emitTelemetryEvent]);

  const trackSuggestionClicked = useCallback((
    suggestion: ExpansionSuggestion,
    scope: ScopeSelection
  ) => {
    const event: SuggestionInteractionEvent = {
      timestamp: new Date().toISOString(),
      eventType: 'clicked',
      suggestionId: suggestion.id,
      suggestionScore: suggestion.finalScore,
      suggestionConfidence: suggestion.confidence,
      dataMode: suggestion.dataMode,
      scopeType: scope.type,
      scopeValue: scope.value
    };

    emitTelemetryEvent('expansion.suggestion_clicked', event);
  }, [emitTelemetryEvent]);

  // Pipeline sent event
  const trackPipelineSent = useCallback((
    suggestion: ExpansionSuggestion,
    scope: ScopeSelection,
    pipelineSize: number
  ) => {
    const event: PipelineSentEvent = {
      timestamp: new Date().toISOString(),
      suggestionId: suggestion.id,
      suggestionScore: suggestion.finalScore,
      suggestionConfidence: suggestion.confidence,
      dataMode: suggestion.dataMode,
      scopeType: scope.type,
      scopeValue: scope.value,
      pipelineSize
    };

    emitTelemetryEvent('expansion.pipeline_sent', event);
  }, [emitTelemetryEvent]);

  // AI analysis event
  const trackAIAnalysis = useCallback((
    suggestion: ExpansionSuggestion,
    scope: ScopeSelection,
    hasCustomReasons: boolean,
    responseLatency?: number
  ) => {
    const event: AIAnalysisEvent = {
      timestamp: new Date().toISOString(),
      suggestionId: suggestion.id,
      scopeType: scope.type,
      scopeValue: scope.value,
      hasCustomReasons,
      responseLatency
    };

    emitTelemetryEvent('expansion.ai_analysis_requested', event);
  }, [emitTelemetryEvent]);

  // Custom area drawing events
  const trackCustomAreaDrawn = useCallback((
    polygon: GeoJSON.Polygon,
    area: number
  ) => {
    emitTelemetryEvent('expansion.custom_area_drawn', {
      timestamp: new Date().toISOString(),
      area,
      vertexCount: polygon.coordinates[0].length - 1, // Exclude closing point
      boundingBox: {
        minLat: Math.min(...polygon.coordinates[0].map(coord => coord[1])),
        maxLat: Math.max(...polygon.coordinates[0].map(coord => coord[1])),
        minLng: Math.min(...polygon.coordinates[0].map(coord => coord[0])),
        maxLng: Math.max(...polygon.coordinates[0].map(coord => coord[0]))
      }
    });
  }, [emitTelemetryEvent]);

  const trackCustomAreaCleared = useCallback(() => {
    emitTelemetryEvent('expansion.custom_area_cleared', {
      timestamp: new Date().toISOString()
    });
  }, [emitTelemetryEvent]);

  // Anti-cannibalization controls
  const trackAntiCannibalizationChanged = useCallback((
    minDistance: number,
    maxPerCity?: number,
    scope?: ScopeSelection
  ) => {
    emitTelemetryEvent('expansion.anti_cannibalization_changed', {
      timestamp: new Date().toISOString(),
      minDistance,
      maxPerCity,
      scopeType: scope?.type,
      scopeValue: scope?.value
    });
  }, [emitTelemetryEvent]);

  // Performance and error tracking
  const trackPerformanceMetric = useCallback((
    metric: string,
    value: number,
    context?: any
  ) => {
    emitTelemetryEvent('expansion.performance_metric', {
      timestamp: new Date().toISOString(),
      metric,
      value,
      context
    });
  }, [emitTelemetryEvent]);

  const trackError = useCallback((
    error: string,
    context?: any
  ) => {
    emitTelemetryEvent('expansion.error', {
      timestamp: new Date().toISOString(),
      error,
      context
    });
  }, [emitTelemetryEvent]);

  // Session tracking
  const trackSessionStart = useCallback((
    scope?: ScopeSelection
  ) => {
    emitTelemetryEvent('expansion.session_started', {
      timestamp: new Date().toISOString(),
      initialScope: scope ? {
        type: scope.type,
        value: scope.value,
        area: scope.area
      } : null,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight
      } : null
    });
  }, [emitTelemetryEvent]);

  const trackSessionEnd = useCallback((
    duration: number,
    interactionCount: number
  ) => {
    emitTelemetryEvent('expansion.session_ended', {
      timestamp: new Date().toISOString(),
      duration,
      interactionCount
    });
  }, [emitTelemetryEvent]);

  return {
    // Core tracking functions
    trackScopeChanged,
    trackIntensityAdjusted,
    trackDataModeToggled,
    trackSuggestionsLocked,
    trackSuggestionHovered,
    trackSuggestionClicked,
    trackPipelineSent,
    trackAIAnalysis,
    
    // Custom area tracking
    trackCustomAreaDrawn,
    trackCustomAreaCleared,
    
    // Controls tracking
    trackAntiCannibalizationChanged,
    
    // Performance and error tracking
    trackPerformanceMetric,
    trackError,
    
    // Session tracking
    trackSessionStart,
    trackSessionEnd,
    
    // Raw telemetry emission
    emitTelemetryEvent
  };
};

export default useScopeExpansionTelemetry;