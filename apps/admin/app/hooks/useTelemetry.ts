'use client';

import { useCallback, useRef, useMemo, useEffect } from 'react';
import { submitTelemetryEvent, trackEvent, TelemetryEvent, TelemetryHelpers, generateSessionId } from '@/lib/telemetry';

/**
 * Hook for telemetry functionality in React components
 * Fixed to prevent stale closures and improve performance
 */
export function useTelemetry(userId?: string) {
  const sessionIdRef = useRef<string>();
  const userIdRef = useRef(userId);

  // Update userId ref when it changes
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // Generate session ID once per component instance
  const sessionId = useMemo(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = generateSessionId();
    }
    return sessionIdRef.current;
  }, []);

  // Use useCallback for individual methods to prevent stale closures
  const submitEvent = useCallback(async (event: Omit<TelemetryEvent, 'sessionId'>): Promise<boolean> => {
    return submitTelemetryEvent({
      ...event,
      userId: event.userId || userIdRef.current,
      sessionId,
    });
  }, [sessionId]);

  const trackEventCallback = useCallback((event: Omit<TelemetryEvent, 'sessionId'>): void => {
    trackEvent({
      ...event,
      userId: event.userId || userIdRef.current,
      sessionId,
    });
  }, [sessionId]);

  const trackPageView = useCallback((page: string, additionalProperties?: Record<string, any>) => {
    TelemetryHelpers.trackPageView(page, userIdRef.current, {
      sessionId,
      ...additionalProperties,
    });
  }, [sessionId]);

  const trackUserAction = useCallback((action: string, component?: string, additionalProperties?: Record<string, any>) => {
    TelemetryHelpers.trackUserAction(action, component, userIdRef.current, {
      sessionId,
      ...additionalProperties,
    });
  }, [sessionId]);

  const trackError = useCallback((error: string | Error, context?: string, additionalProperties?: Record<string, any>) => {
    TelemetryHelpers.trackError(error, context, userIdRef.current, {
      sessionId,
      ...additionalProperties,
    });
  }, [sessionId]);

  const trackFeatureUsage = useCallback((feature: string, additionalProperties?: Record<string, any>) => {
    TelemetryHelpers.trackFeatureUsage(feature, userIdRef.current, {
      sessionId,
      ...additionalProperties,
    });
  }, [sessionId]);

  // Return stable object with memoized methods
  return useMemo(() => ({
    submitEvent,
    trackEvent: trackEventCallback,
    trackPageView,
    trackUserAction,
    trackError,
    trackFeatureUsage,
    sessionId,
  }), [submitEvent, trackEventCallback, trackPageView, trackUserAction, trackError, trackFeatureUsage, sessionId]);
}