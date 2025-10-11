import { bff } from './api';
import { ErrorHandler } from './error-handler';

// Define specific event property types for better type safety
export interface BaseEventProperties {
  timestamp: string;
  sessionId?: string;
  userId?: string;
}

export interface PageViewProperties extends BaseEventProperties {
  page: string;
  referrer?: string;
  userAgent?: string;
  loadTime?: number;
  [key: string]: unknown;
}

export interface UserActionProperties extends BaseEventProperties {
  action: string;
  component?: string;
  value?: string | number;
  metadata?: Record<string, string | number | boolean>;
  [key: string]: unknown;
}

export interface ErrorEventProperties extends BaseEventProperties {
  error: string;
  stack?: string;
  context?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceEventProperties extends BaseEventProperties {
  metric_name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  context?: string;
}

export interface FeatureUsageProperties extends BaseEventProperties {
  feature: string;
  metadata?: Record<string, string | number | boolean>;
}

// Use discriminated unions for better type safety
export type TelemetryEventData = 
  | { eventType: 'page_view'; properties: PageViewProperties }
  | { eventType: 'user_action'; properties: UserActionProperties }
  | { eventType: 'error'; properties: ErrorEventProperties }
  | { eventType: 'performance'; properties: PerformanceEventProperties }
  | { eventType: 'feature_usage'; properties: FeatureUsageProperties }
  | { eventType: string; properties?: Record<string, unknown> }; // Fallback for custom events

export interface TelemetryEvent {
  eventType: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, unknown>;
}

// Specific event type interfaces for better type checking
export interface PageViewEvent extends TelemetryEvent {
  eventType: typeof TelemetryEventTypes.PAGE_VIEW;
  properties: PageViewProperties;
}

export interface UserActionEvent extends TelemetryEvent {
  eventType: typeof TelemetryEventTypes.USER_ACTION;
  properties: UserActionProperties;
}

export interface TelemetryResponse {
  success: boolean;
  error?: string;
}

// Add Result type for better error handling
export type TelemetryResult<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string };

// Add validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Submit a telemetry event with graceful error handling.
 * This function will never throw errors to avoid breaking the user experience.
 * 
 * @param event - The telemetry event to submit
 * @returns Promise<boolean> - true if successful, false if failed
 */
export async function submitTelemetryEvent(event: TelemetryEvent): Promise<boolean> {
  return await ErrorHandler.withErrorHandling(
    async () => {
      // Validate required fields
      if (!event.eventType || typeof event.eventType !== 'string') {
        console.warn('Telemetry: Invalid event type provided');
        return false;
      }

      // Submit the event
      const response = await bff<TelemetryResponse>('/telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (response.success) {
        return true;
      } else {
        console.warn('Telemetry submission failed:', response.error);
        return false;
      }
    },
    'Telemetry event submission',
    false
  ) ?? false;
}

/**
 * Submit a telemetry event and ignore the result.
 * Use this for fire-and-forget telemetry where you don't need to know if it succeeded.
 * 
 * @param event - The telemetry event to submit
 */
export function trackEvent(event: TelemetryEvent): void {
  // Fire and forget - don't await the result
  submitTelemetryEvent(event).catch(() => {
    // Silently handle any errors
  });
}

/**
 * Create a session ID for telemetry tracking.
 * This generates a unique identifier for the current user session.
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Common telemetry event types for consistency across the application.
 */
export const TelemetryEventTypes = {
  PAGE_VIEW: 'page_view',
  USER_ACTION: 'user_action',
  ERROR: 'error',
  FEATURE_USAGE: 'feature_usage',
  PERFORMANCE: 'performance',
} as const;

/**
 * Helper functions for common telemetry events
 */
export const TelemetryHelpers = {
  /**
   * Track a page view
   */
  trackPageView: (page: string, userId?: string, additionalProperties?: Record<string, any>) => {
    trackEvent({
      eventType: TelemetryEventTypes.PAGE_VIEW,
      userId,
      sessionId: generateSessionId(),
      properties: {
        page,
        timestamp: new Date().toISOString(),
        ...additionalProperties,
      },
    });
  },

  /**
   * Track a user action
   */
  trackUserAction: (action: string, component?: string, userId?: string, additionalProperties?: Record<string, any>) => {
    trackEvent({
      eventType: TelemetryEventTypes.USER_ACTION,
      userId,
      sessionId: generateSessionId(),
      properties: {
        action,
        component,
        timestamp: new Date().toISOString(),
        ...additionalProperties,
      },
    });
  },

  /**
   * Track an error
   */
  trackError: (error: string | Error, context?: string, userId?: string, additionalProperties?: Record<string, any>) => {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    trackEvent({
      eventType: TelemetryEventTypes.ERROR,
      userId,
      sessionId: generateSessionId(),
      properties: {
        error: errorMessage,
        stack: errorStack,
        context,
        timestamp: new Date().toISOString(),
        ...additionalProperties,
      },
    });
  },

  /**
   * Track feature usage
   */
  trackFeatureUsage: (feature: string, userId?: string, additionalProperties?: Record<string, any>) => {
    trackEvent({
      eventType: TelemetryEventTypes.FEATURE_USAGE,
      userId,
      sessionId: generateSessionId(),
      properties: {
        feature,
        timestamp: new Date().toISOString(),
        ...additionalProperties,
      },
    });
  },
};