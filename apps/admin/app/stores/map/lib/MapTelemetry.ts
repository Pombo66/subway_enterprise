/**
 * MapTelemetry - Lightweight telemetry system for map performance monitoring
 * Uses sampling to minimize performance impact
 */

export interface MapTelemetryEvent {
  event: string;
  timestamp: number;
  data?: Record<string, any>;
}

export interface MapPerformanceMetrics {
  initTime?: number;
  renderTime?: number;
  storeCount?: number;
  activeStoreCount?: number;
  memoryUsage?: number;
  errorCount?: number;
}

/**
 * Lightweight telemetry collector with sampling
 */
export class MapTelemetry {
  private static instance: MapTelemetry | null = null;
  private sampleRate = 0.1; // Sample 10% of events
  private performanceSampleRate = 0.01; // Sample 1% of performance events
  private events: MapTelemetryEvent[] = [];
  private maxEvents = 100; // Keep only recent events in memory

  private constructor() {}

  static getInstance(): MapTelemetry {
    if (!MapTelemetry.instance) {
      MapTelemetry.instance = new MapTelemetry();
    }
    return MapTelemetry.instance;
  }

  /**
   * Track map readiness event
   */
  trackMapReady(storeCount: number, initTime: number): void {
    this.trackEvent('map_ready', {
      storeCount,
      initTime,
      userAgent: this.getTruncatedUserAgent(),
      viewport: this.getViewportInfo(),
      timestamp: Date.now()
    });
  }

  /**
   * Track marker click with sampling
   */
  trackMarkerClick(storeId: string): void {
    if (Math.random() < this.sampleRate) {
      this.trackEvent('marker_click', {
        storeId: this.hashStoreId(storeId), // Hash for privacy
        timestamp: Date.now()
      });
    }
  }

  /**
   * Track performance metrics with low sampling rate
   */
  trackPerformance(operation: string, duration: number, metrics?: MapPerformanceMetrics): void {
    // Only track slow operations or sample randomly
    const shouldTrack = duration > 16 || Math.random() < this.performanceSampleRate;
    
    if (shouldTrack) {
      this.trackEvent('map_performance', {
        operation,
        duration,
        ...metrics,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Track memory usage with very low sampling rate
   */
  trackMemoryUsage(): void {
    if (Math.random() < 0.001 && 'memory' in performance) { // 0.1% sample rate
      try {
        const memory = (performance as any).memory;
        this.trackEvent('map_memory', {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          heapSizeLimit: memory.heapSizeLimit,
          timestamp: Date.now()
        });
      } catch (error) {
        // Ignore memory tracking errors
      }
    }
  }

  /**
   * Track errors with context
   */
  trackError(error: Error, context: string, additionalData?: Record<string, any>): void {
    this.trackEvent('map_error', {
      error: error.message,
      context,
      stack: error.stack?.substring(0, 200), // Truncated for privacy
      ...additionalData,
      timestamp: Date.now()
    });
  }

  /**
   * Generic event tracking with automatic batching
   */
  private trackEvent(event: string, data?: Record<string, any>): void {
    const telemetryEvent: MapTelemetryEvent = {
      event,
      timestamp: Date.now(),
      data
    };

    // Add to local buffer
    this.events.push(telemetryEvent);

    // Keep buffer size manageable
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Send to external telemetry system if available
    this.sendToTelemetrySystem(telemetryEvent);
  }

  /**
   * Send event to external telemetry system
   */
  private sendToTelemetrySystem(event: MapTelemetryEvent): void {
    try {
      // Check if global telemetry system is available
      if (typeof window !== 'undefined' && (window as any).telemetry) {
        (window as any).telemetry.track(event.event, event.data);
      }
      
      // Also log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Map Telemetry [${event.event}]:`, event.data);
      }
    } catch (error) {
      // Silently ignore telemetry errors to avoid impacting user experience
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Telemetry error:', error);
      }
    }
  }

  /**
   * Get truncated user agent for debugging (privacy-safe)
   */
  private getTruncatedUserAgent(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    
    const ua = navigator.userAgent;
    // Extract browser and version info only
    const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/);
    return browserMatch ? browserMatch[0] : 'unknown';
  }

  /**
   * Get basic viewport information
   */
  private getViewportInfo(): { width: number; height: number } {
    if (typeof window === 'undefined') {
      return { width: 0, height: 0 };
    }
    
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  /**
   * Hash store ID for privacy
   */
  private hashStoreId(storeId: string): string {
    // Simple hash for privacy - not cryptographically secure
    let hash = 0;
    for (let i = 0; i < storeId.length; i++) {
      const char = storeId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }

  /**
   * Get recent events for debugging
   */
  getRecentEvents(limit = 10): MapTelemetryEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Clear event buffer
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalEvents: number;
    errorCount: number;
    performanceEvents: number;
    memoryEvents: number;
  } {
    const errorEvents = this.events.filter(e => e.event === 'map_error');
    const performanceEvents = this.events.filter(e => e.event === 'map_performance');
    const memoryEvents = this.events.filter(e => e.event === 'map_memory');

    return {
      totalEvents: this.events.length,
      errorCount: errorEvents.length,
      performanceEvents: performanceEvents.length,
      memoryEvents: memoryEvents.length
    };
  }
}

// Export singleton instance
export const mapTelemetry = MapTelemetry.getInstance();

/**
 * Performance measurement utility
 */
export class PerformanceMeasurement {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = performance.now();
  }

  /**
   * End measurement and track performance
   */
  end(additionalMetrics?: MapPerformanceMetrics): number {
    const duration = performance.now() - this.startTime;
    mapTelemetry.trackPerformance(this.operation, duration, additionalMetrics);
    return duration;
  }
}

/**
 * Utility function to measure performance of async operations
 */
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  additionalMetrics?: MapPerformanceMetrics
): Promise<T> {
  const measurement = new PerformanceMeasurement(operation);
  try {
    const result = await fn();
    measurement.end(additionalMetrics);
    return result;
  } catch (error) {
    measurement.end({ ...additionalMetrics, errorCount: 1 });
    throw error;
  }
}