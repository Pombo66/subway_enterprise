/**
 * Enhanced error tracking and context collection for MapView
 * Provides comprehensive error logging with component state information
 */

export interface MapErrorContext {
  // Component state
  component: string;
  operation: string;
  timestamp: number;
  
  // Map state
  mapState?: {
    isReady: boolean;
    center: { lat: number; lng: number };
    zoom: number;
    bounds?: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
  
  // Store data context
  storeContext?: {
    totalStores: number;
    visibleStores: number;
    clusteredStores: number;
    selectedStore?: string;
  };
  
  // Performance context
  performanceContext?: {
    memoryUsage: number;
    fps: number;
    renderTime: number;
    apiResponseTime: number;
  };
  
  // Browser context
  browserContext?: {
    userAgent: string;
    viewport: { width: number; height: number };
    pixelRatio: number;
    online: boolean;
    cookiesEnabled: boolean;
  };
  
  // Error details
  error: {
    name: string;
    message: string;
    stack?: string;
    cause?: any;
  };
  
  // Recovery information
  recovery?: {
    attempted: boolean;
    successful: boolean;
    method: string;
    retryCount: number;
  };
  
  // User interaction context
  userContext?: {
    lastInteraction: string;
    interactionTime: number;
    sessionDuration: number;
  };
}

export interface ErrorRecoveryStrategy {
  name: string;
  condition: (error: Error, context: MapErrorContext) => boolean;
  execute: (error: Error, context: MapErrorContext) => Promise<boolean>;
  priority: number;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByComponent: Record<string, number>;
  recoverySuccessRate: number;
  averageRecoveryTime: number;
  criticalErrors: number;
  recentErrors: MapErrorContext[];
}

export class MapErrorTracker {
  private errors: MapErrorContext[] = [];
  private recoveryStrategies: ErrorRecoveryStrategy[] = [];
  private errorCallbacks: ((error: MapErrorContext) => void)[] = [];
  private sessionStartTime = Date.now();
  private lastUserInteraction = { type: 'init', time: Date.now() };
  private maxErrors = 1000;
  private maxRecentErrors = 50;

  constructor() {
    this.setupDefaultRecoveryStrategies();
    this.setupGlobalErrorHandlers();
  }

  // Error tracking
  trackError(
    error: Error,
    component: string,
    operation: string,
    additionalContext?: Partial<MapErrorContext>
  ): MapErrorContext {
    const context: MapErrorContext = {
      component,
      operation,
      timestamp: Date.now(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: (error as any).cause,
      },
      browserContext: this.getBrowserContext(),
      userContext: {
        lastInteraction: this.lastUserInteraction.type,
        interactionTime: this.lastUserInteraction.time,
        sessionDuration: Date.now() - this.sessionStartTime,
      },
      ...additionalContext,
    };

    // Store error
    this.errors.push(context);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log error with context
    this.logError(context);

    // Notify callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(context);
      } catch (callbackError) {
        console.warn('Error in error callback:', callbackError);
      }
    });

    // Attempt recovery
    this.attemptRecovery(error, context);

    return context;
  }

  // Context collection methods
  setMapState(mapState: MapErrorContext['mapState']): void {
    this.currentMapState = mapState;
  }

  setStoreContext(storeContext: MapErrorContext['storeContext']): void {
    this.currentStoreContext = storeContext;
  }

  setPerformanceContext(performanceContext: MapErrorContext['performanceContext']): void {
    this.currentPerformanceContext = performanceContext;
  }

  trackUserInteraction(type: string): void {
    this.lastUserInteraction = { type, time: Date.now() };
  }

  // Recovery management
  addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    this.recoveryStrategies.sort((a, b) => b.priority - a.priority);
  }

  private async attemptRecovery(error: Error, context: MapErrorContext): Promise<void> {
    const applicableStrategies = this.recoveryStrategies.filter(strategy =>
      strategy.condition(error, context)
    );

    if (applicableStrategies.length === 0) {
      context.recovery = {
        attempted: false,
        successful: false,
        method: 'none',
        retryCount: 0,
      };
      return;
    }

    for (const strategy of applicableStrategies) {
      try {
        const startTime = Date.now();
        const successful = await strategy.execute(error, context);
        const recoveryTime = Date.now() - startTime;

        context.recovery = {
          attempted: true,
          successful,
          method: strategy.name,
          retryCount: (context.recovery?.retryCount || 0) + 1,
        };

        // Track recovery metrics
        this.trackRecoveryMetrics(strategy.name, successful, recoveryTime);

        if (successful) {
          console.log(`Error recovery successful using strategy: ${strategy.name}`);
          break;
        }
      } catch (recoveryError) {
        console.warn(`Recovery strategy ${strategy.name} failed:`, recoveryError);
      }
    }
  }

  // Error analysis and metrics
  getErrorMetrics(timeRange?: { start: number; end: number }): ErrorMetrics {
    let filteredErrors = this.errors;
    
    if (timeRange) {
      filteredErrors = this.errors.filter(e =>
        e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
      );
    }

    const errorsByType: Record<string, number> = {};
    const errorsByComponent: Record<string, number> = {};
    let totalRecoveryAttempts = 0;
    let successfulRecoveries = 0;
    let totalRecoveryTime = 0;
    let criticalErrors = 0;

    filteredErrors.forEach(error => {
      // Count by type
      errorsByType[error.error.name] = (errorsByType[error.error.name] || 0) + 1;
      
      // Count by component
      errorsByComponent[error.component] = (errorsByComponent[error.component] || 0) + 1;
      
      // Recovery metrics
      if (error.recovery?.attempted) {
        totalRecoveryAttempts++;
        if (error.recovery.successful) {
          successfulRecoveries++;
        }
      }
      
      // Critical errors (memory, crash, etc.)
      if (this.isCriticalError(error)) {
        criticalErrors++;
      }
    });

    return {
      totalErrors: filteredErrors.length,
      errorsByType,
      errorsByComponent,
      recoverySuccessRate: totalRecoveryAttempts > 0 ? (successfulRecoveries / totalRecoveryAttempts) * 100 : 0,
      averageRecoveryTime: totalRecoveryAttempts > 0 ? totalRecoveryTime / totalRecoveryAttempts : 0,
      criticalErrors,
      recentErrors: filteredErrors.slice(-this.maxRecentErrors),
    };
  }

  // Error pattern detection
  detectErrorPatterns(): {
    frequentErrors: Array<{ error: string; count: number; component: string }>;
    errorSpikes: Array<{ timestamp: number; count: number }>;
    recoveryFailures: Array<{ strategy: string; failureRate: number }>;
  } {
    const metrics = this.getErrorMetrics();
    
    // Frequent errors
    const frequentErrors = Object.entries(metrics.errorsByType)
      .map(([error, count]) => {
        const component = this.getMostFrequentComponent(error);
        return { error, count, component };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Error spikes (group by hour)
    const errorSpikes = this.detectErrorSpikes();

    // Recovery failures
    const recoveryFailures = this.analyzeRecoveryFailures();

    return {
      frequentErrors,
      errorSpikes,
      recoveryFailures,
    };
  }

  // Event listeners
  onError(callback: (error: MapErrorContext) => void): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  // Private methods
  private currentMapState: MapErrorContext['mapState'] | null = null;
  private currentStoreContext: MapErrorContext['storeContext'] | null = null;
  private currentPerformanceContext: MapErrorContext['performanceContext'] | null = null;
  private recoveryMetrics = new Map<string, { attempts: number; successes: number; totalTime: number }>();

  private getBrowserContext(): MapErrorContext['browserContext'] {
    return {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      pixelRatio: window.devicePixelRatio,
      online: navigator.onLine,
      cookiesEnabled: navigator.cookieEnabled,
    };
  }

  private logError(context: MapErrorContext): void {
    const severity = this.getErrorSeverity(context);
    const logMethod = severity === 'critical' ? console.error : 
                     severity === 'high' ? console.warn : console.log;

    logMethod(`[MapError] ${context.component}.${context.operation}:`, {
      error: context.error,
      context: {
        map: context.mapState,
        stores: context.storeContext,
        performance: context.performanceContext,
        user: context.userContext,
      },
      recovery: context.recovery,
    });

    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(context);
    }
  }

  private getErrorSeverity(context: MapErrorContext): 'low' | 'medium' | 'high' | 'critical' {
    const { error, performanceContext } = context;

    // Critical errors
    if (error.name === 'OutOfMemoryError' || 
        error.message.includes('memory') ||
        error.message.includes('crash')) {
      return 'critical';
    }

    // High severity
    if (error.name === 'TypeError' && error.message.includes('null') ||
        (performanceContext?.memoryUsage && performanceContext.memoryUsage > 85) ||
        (performanceContext?.fps && performanceContext.fps < 10)) {
      return 'high';
    }

    // Medium severity
    if (error.name === 'NetworkError' ||
        error.name === 'TimeoutError' ||
        (performanceContext?.renderTime && performanceContext.renderTime > 1000)) {
      return 'medium';
    }

    return 'low';
  }

  private isCriticalError(context: MapErrorContext): boolean {
    return this.getErrorSeverity(context) === 'critical';
  }

  private setupDefaultRecoveryStrategies(): void {
    // Memory cleanup strategy
    this.addRecoveryStrategy({
      name: 'memory-cleanup',
      priority: 100,
      condition: (error, context) => 
        error.message.includes('memory') || 
        (context.performanceContext?.memoryUsage || 0) > 80,
      execute: async (error, context) => {
        try {
          // Trigger garbage collection if available
          if ('gc' in window) {
            (window as any).gc();
          }
          
          // Clear caches
          if (context.component === 'MapView') {
            // Signal to clear marker cache
            window.dispatchEvent(new CustomEvent('map-cleanup-request'));
          }
          
          return true;
        } catch {
          return false;
        }
      },
    });

    // Map reinitialization strategy
    this.addRecoveryStrategy({
      name: 'map-reinit',
      priority: 80,
      condition: (error, context) =>
        context.component === 'MapView' && 
        (error.message.includes('map') || error.message.includes('render')),
      execute: async (error, context) => {
        try {
          // Signal map to reinitialize
          window.dispatchEvent(new CustomEvent('map-reinit-request'));
          
          // Wait for reinitialization
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          return true;
        } catch {
          return false;
        }
      },
    });

    // API retry strategy
    this.addRecoveryStrategy({
      name: 'api-retry',
      priority: 60,
      condition: (error, context) =>
        error.name === 'NetworkError' || 
        error.name === 'TimeoutError' ||
        context.operation.includes('api'),
      execute: async (error, context) => {
        try {
          const retryCount = context.recovery?.retryCount || 0;
          if (retryCount >= 3) return false;
          
          // Signal API retry
          window.dispatchEvent(new CustomEvent('api-retry-request', {
            detail: { operation: context.operation, retryCount }
          }));
          
          return true;
        } catch {
          return false;
        }
      },
    });
  }

  private setupGlobalErrorHandlers(): void {
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(
        new Error(event.reason?.message || 'Unhandled promise rejection'),
        'Global',
        'unhandled-rejection',
        {
          error: {
            name: 'UnhandledRejection',
            message: event.reason?.message || 'Unhandled promise rejection',
            stack: event.reason?.stack,
            cause: event.reason,
          }
        }
      );
    });

    // Global errors
    window.addEventListener('error', (event) => {
      this.trackError(
        event.error || new Error(event.message),
        'Global',
        'global-error',
        {
          error: {
            name: event.error?.name || 'GlobalError',
            message: event.message,
            stack: event.error?.stack,
          }
        }
      );
    });
  }

  private trackRecoveryMetrics(strategy: string, successful: boolean, time: number): void {
    const metrics = this.recoveryMetrics.get(strategy) || { attempts: 0, successes: 0, totalTime: 0 };
    metrics.attempts++;
    metrics.totalTime += time;
    if (successful) {
      metrics.successes++;
    }
    this.recoveryMetrics.set(strategy, metrics);
  }

  private getMostFrequentComponent(errorType: string): string {
    const componentsForError = this.errors
      .filter(e => e.error.name === errorType)
      .map(e => e.component);
    
    const componentCounts = componentsForError.reduce((acc, component) => {
      acc[component] = (acc[component] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(componentCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';
  }

  private detectErrorSpikes(): Array<{ timestamp: number; count: number }> {
    const hourlyErrors = new Map<number, number>();
    
    this.errors.forEach(error => {
      const hour = Math.floor(error.timestamp / (1000 * 60 * 60));
      hourlyErrors.set(hour, (hourlyErrors.get(hour) || 0) + 1);
    });

    const average = Array.from(hourlyErrors.values()).reduce((a, b) => a + b, 0) / hourlyErrors.size;
    const threshold = average * 2; // Spike is 2x average

    return Array.from(hourlyErrors.entries())
      .filter(([, count]) => count > threshold)
      .map(([hour, count]) => ({ timestamp: hour * 1000 * 60 * 60, count }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  private analyzeRecoveryFailures(): Array<{ strategy: string; failureRate: number }> {
    return Array.from(this.recoveryMetrics.entries())
      .map(([strategy, metrics]) => ({
        strategy,
        failureRate: metrics.attempts > 0 ? ((metrics.attempts - metrics.successes) / metrics.attempts) * 100 : 0,
      }))
      .filter(({ failureRate }) => failureRate > 20) // Only show strategies with >20% failure rate
      .sort((a, b) => b.failureRate - a.failureRate);
  }

  private async sendToLoggingService(context: MapErrorContext): Promise<void> {
    try {
      // In a real application, send to your logging service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(context),
      // });
    } catch (error) {
      console.warn('Failed to send error to logging service:', error);
    }
  }

  // Cleanup
  cleanup(): void {
    this.errors = [];
    this.recoveryStrategies = [];
    this.errorCallbacks = [];
    this.recoveryMetrics.clear();
  }
}

// Global instance
export const mapErrorTracker = new MapErrorTracker();