// Telemetry and monitoring for Smart Store Importer v1
import {
  TelemetryEvent,
  AutoMapTelemetry,
  CountryInferenceTelemetry,
  GeocodeStartTelemetry,
  GeocodeProgressTelemetry,
  GeocodeCompleteTelemetry,
  AutoMapResult,
  CountryInference,
  GeocodeProvider,
  ConfidenceLevel,
  InferenceMethod
} from './types';
import { ErrorHandler } from './errors';

/**
 * Telemetry service for tracking Smart Import operations
 */
export class SmartImportTelemetry {
  private events: TelemetryEvent[] = [];
  private sessionId: string;
  private startTime: number;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
  }

  /**
   * Emit auto-mapping completion event
   */
  emitAutoMapDone(result: AutoMapResult): void {
    const event: AutoMapTelemetry = {
      event: 'importer_automap_done',
      data: {
        confidenceCounts: result.confidenceSummary,
        totalFields: Object.keys(result.mappings).length,
        unmappedFields: result.unmappedColumns.length
      },
      timestamp: new Date()
    };

    this.recordEvent(event);
    this.sendToAnalytics(event);
  }

  /**
   * Emit country inference event
   */
  emitCountryInferred(inference: CountryInference): void {
    const event: CountryInferenceTelemetry = {
      event: 'importer_country_inferred',
      data: {
        method: inference.method,
        country: inference.country,
        confidence: inference.confidence
      },
      timestamp: new Date()
    };

    this.recordEvent(event);
    this.sendToAnalytics(event);
  }

  /**
   * Emit geocoding start event
   */
  emitGeocodeStarted(
    rowCount: number, 
    provider: GeocodeProvider, 
    batchSize: number
  ): void {
    const event: GeocodeStartTelemetry = {
      event: 'importer_geocode_started',
      data: {
        rows: rowCount,
        provider,
        batchSize
      },
      timestamp: new Date()
    };

    this.recordEvent(event);
    this.sendToAnalytics(event);
  }

  /**
   * Emit geocoding progress event
   */
  emitGeocodeProgress(
    done: number,
    total: number,
    currentBatch: number,
    totalBatches: number
  ): void {
    const event: GeocodeProgressTelemetry = {
      event: 'importer_geocode_progress',
      data: {
        done,
        total,
        currentBatch,
        totalBatches
      },
      timestamp: new Date()
    };

    this.recordEvent(event);
    // Don't send progress events to analytics to avoid spam
  }

  /**
   * Emit geocoding completion event
   */
  emitGeocodeComplete(
    successful: number,
    failed: number,
    total: number,
    provider: GeocodeProvider,
    startTime: number
  ): void {
    const event: GeocodeCompleteTelemetry = {
      event: 'importer_geocode_complete',
      data: {
        success: successful,
        failed,
        total,
        duration: Date.now() - startTime,
        provider
      },
      timestamp: new Date()
    };

    this.recordEvent(event);
    this.sendToAnalytics(event);
  }

  /**
   * Emit custom event
   */
  emitCustomEvent(eventName: string, data: Record<string, any>): void {
    const event: TelemetryEvent = {
      event: eventName,
      data,
      timestamp: new Date()
    };

    this.recordEvent(event);
    this.sendToAnalytics(event);
  }

  /**
   * Record event in local storage for debugging
   */
  private recordEvent(event: TelemetryEvent): void {
    this.events.push(event);

    // Keep only last 100 events to prevent memory issues
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[SmartImport Telemetry]', event.event, event.data);
    }
  }

  /**
   * Send event to analytics service
   */
  private sendToAnalytics(event: TelemetryEvent): void {
    try {
      // TODO: Implement actual analytics endpoint
      // For now, just log in development - no API calls
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[Telemetry]', event.event, {
          ...event.data,
          sessionId: this.sessionId,
          sessionDuration: Date.now() - this.startTime
        });
      }
      
      // Disabled API call until endpoint is implemented
      // const payload = {
      //   ...event,
      //   sessionId: this.sessionId,
      //   userAgent: navigator.userAgent,
      //   timestamp: event.timestamp.toISOString(),
      //   sessionDuration: Date.now() - this.startTime
      // };
      //
      // fetch('/api/telemetry/smart-import', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // }).catch(() => {});

    } catch (error) {
      // Silently fail - telemetry should never break the user experience
      ErrorHandler.logError(error, { context: 'SmartImportTelemetry.sendToAnalytics' });
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `smart-import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get session summary
   */
  getSessionSummary(): {
    sessionId: string;
    duration: number;
    eventCount: number;
    events: TelemetryEvent[];
  } {
    return {
      sessionId: this.sessionId,
      duration: Date.now() - this.startTime,
      eventCount: this.events.length,
      events: [...this.events]
    };
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    this.events = [];
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
  }
}

/**
 * Performance monitoring for Smart Import operations
 */
export class SmartImportPerformanceMonitor {
  private metrics: Map<string, {
    startTime: number;
    endTime?: number;
    duration?: number;
    metadata?: Record<string, any>;
  }> = new Map();

  /**
   * Start timing an operation
   */
  startTiming(operationId: string, metadata?: Record<string, any>): void {
    this.metrics.set(operationId, {
      startTime: performance.now(),
      metadata
    });
  }

  /**
   * End timing an operation
   */
  endTiming(operationId: string): number | null {
    const metric = this.metrics.get(operationId);
    if (!metric) {
      console.warn(`No timing started for operation: ${operationId}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    // Log performance in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${operationId}: ${duration.toFixed(2)}ms`, metric.metadata);
    }

    return duration;
  }

  /**
   * Get timing for an operation
   */
  getTiming(operationId: string): number | null {
    const metric = this.metrics.get(operationId);
    return metric?.duration || null;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, {
    duration?: number;
    metadata?: Record<string, any>;
  }> {
    const result: Record<string, any> = {};
    
    for (const [operationId, metric] of this.metrics) {
      result[operationId] = {
        duration: metric.duration,
        metadata: metric.metadata
      };
    }
    
    return result;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Monitor UI responsiveness during operations
   */
  monitorUIResponsiveness(operationName: string): () => void {
    let frameCount = 0;
    let totalFrameTime = 0;
    let maxFrameTime = 0;
    let isMonitoring = true;

    const measureFrame = () => {
      if (!isMonitoring) return;

      const frameStart = performance.now();
      
      requestAnimationFrame(() => {
        if (!isMonitoring) return;

        const frameTime = performance.now() - frameStart;
        frameCount++;
        totalFrameTime += frameTime;
        maxFrameTime = Math.max(maxFrameTime, frameTime);

        measureFrame();
      });
    };

    measureFrame();

    // Return stop function
    return () => {
      isMonitoring = false;
      
      const avgFrameTime = frameCount > 0 ? totalFrameTime / frameCount : 0;
      const fps = frameCount > 0 ? 1000 / avgFrameTime : 0;

      const responsiveness = {
        operation: operationName,
        frameCount,
        averageFrameTime: avgFrameTime,
        maxFrameTime,
        estimatedFPS: fps,
        isResponsive: avgFrameTime < 16.67 // 60 FPS threshold
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('[UI Responsiveness]', responsiveness);
      }

      // Send to telemetry
      telemetryService.emitCustomEvent('ui_responsiveness', responsiveness);
    };
  }
}

/**
 * Error tracking for Smart Import operations
 */
export class SmartImportErrorTracker {
  private errors: Array<{
    error: Error;
    context: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }> = [];

  /**
   * Track an error
   */
  trackError(
    error: Error, 
    context: string, 
    metadata?: Record<string, any>
  ): void {
    const errorRecord = {
      error,
      context,
      timestamp: new Date(),
      metadata
    };

    this.errors.push(errorRecord);

    // Keep only last 50 errors
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-50);
    }

    // Send to telemetry
    telemetryService.emitCustomEvent('smart_import_error', {
      errorMessage: error.message,
      errorName: error.name,
      context,
      stack: error.stack,
      metadata
    });

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[SmartImport Error]', context, error, metadata);
    }
  }

  /**
   * Get error summary
   */
  getErrorSummary(): {
    totalErrors: number;
    errorsByContext: Record<string, number>;
    recentErrors: Array<{
      message: string;
      context: string;
      timestamp: Date;
    }>;
  } {
    const errorsByContext: Record<string, number> = {};
    
    for (const errorRecord of this.errors) {
      errorsByContext[errorRecord.context] = (errorsByContext[errorRecord.context] || 0) + 1;
    }

    return {
      totalErrors: this.errors.length,
      errorsByContext,
      recentErrors: this.errors.slice(-10).map(e => ({
        message: e.error.message,
        context: e.context,
        timestamp: e.timestamp
      }))
    };
  }

  /**
   * Clear error history
   */
  clearErrors(): void {
    this.errors = [];
  }
}

// Export singleton instances
export const telemetryService = new SmartImportTelemetry();
export const performanceMonitor = new SmartImportPerformanceMonitor();
export const errorTracker = new SmartImportErrorTracker();