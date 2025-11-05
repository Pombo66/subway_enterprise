/**
 * Enhanced performance monitoring specifically for MapView component
 * Provides detailed metrics collection, memory tracking, and alerting
 */

import { performanceMonitor, PerformanceMetric } from './performance';

export interface MapPerformanceMetrics {
  // Rendering metrics
  markerRenderTime: number;
  clusterRenderTime: number;
  viewportCullingTime: number;
  totalRenderTime: number;
  
  // Memory metrics
  memoryUsage: {
    used: number;
    total: number;
    limit: number;
    percentage: number;
  };
  
  // Marker metrics
  totalMarkers: number;
  visibleMarkers: number;
  clusteredMarkers: number;
  markerPoolSize: number;
  markerCacheSize: number;
  
  // API metrics
  apiResponseTime: number;
  apiErrorCount: number;
  apiSuccessRate: number;
  
  // Viewport metrics
  viewportChanges: number;
  zoomLevel: number;
  boundsArea: number;
  
  // Performance indicators
  fps: number;
  frameDrops: number;
  longTasks: number;
  
  timestamp: number;
}

export interface MapPerformanceAlert {
  type: 'memory' | 'performance' | 'error' | 'api';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metrics: Partial<MapPerformanceMetrics>;
  timestamp: number;
  component: string;
}

export interface MapPerformanceThresholds {
  memory: {
    warning: number; // percentage
    critical: number; // percentage
  };
  rendering: {
    maxRenderTime: number; // ms
    maxMarkers: number;
    targetFPS: number;
  };
  api: {
    maxResponseTime: number; // ms
    minSuccessRate: number; // percentage
  };
}

export class MapPerformanceMonitor {
  private metrics: MapPerformanceMetrics[] = [];
  private alerts: MapPerformanceAlert[] = [];
  private observers: PerformanceObserver[] = [];
  private timers = new Map<string, number>();
  private counters = new Map<string, number>();
  private frameCount = 0;
  private lastFrameTime = 0;
  private frameDrops = 0;
  private longTasks = 0;
  private apiMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    totalResponseTime: 0,
  };

  private readonly thresholds: MapPerformanceThresholds = {
    memory: {
      warning: 75,
      critical: 85,
    },
    rendering: {
      maxRenderTime: 100, // 100ms
      maxMarkers: 500,
      targetFPS: 30,
    },
    api: {
      maxResponseTime: 2000, // 2 seconds
      minSuccessRate: 95, // 95%
    },
  };

  private readonly maxMetrics = 1000;
  private readonly maxAlerts = 100;
  private alertCallbacks: ((alert: MapPerformanceAlert) => void)[] = [];

  constructor() {
    this.setupPerformanceObservers();
    this.startFPSMonitoring();
  }

  // Timer methods for measuring operations
  startTimer(operation: string): void {
    this.timers.set(operation, performance.now());
  }

  endTimer(operation: string, tags?: Record<string, any>): number {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      console.warn(`Timer '${operation}' was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(operation);

    // Record the metric
    performanceMonitor.recordMetric(`map.${operation}`, duration, {
      component: 'MapView',
      ...tags,
    });

    // Check for performance alerts
    this.checkPerformanceThresholds(operation, duration);

    return duration;
  }

  // Memory monitoring
  recordMemoryUsage(): MapPerformanceMetrics['memoryUsage'] | null {
    if (!('memory' in performance)) {
      return null;
    }

    const memory = (performance as any).memory;
    const memoryUsage = {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };

    // Record memory metrics
    performanceMonitor.recordMetric('map.memory.used', memoryUsage.used, {
      component: 'MapView',
      type: 'heap',
    });
    performanceMonitor.recordMetric('map.memory.percentage', memoryUsage.percentage, {
      component: 'MapView',
      type: 'heap',
    });

    // Check memory thresholds
    this.checkMemoryThresholds(memoryUsage);

    return memoryUsage;
  }

  // Marker performance tracking
  recordMarkerMetrics(metrics: {
    totalMarkers: number;
    visibleMarkers: number;
    clusteredMarkers: number;
    renderTime: number;
    poolSize?: number;
    cacheSize?: number;
  }): void {
    const { totalMarkers, visibleMarkers, clusteredMarkers, renderTime, poolSize = 0, cacheSize = 0 } = metrics;

    // Record individual metrics
    performanceMonitor.recordMetric('map.markers.total', totalMarkers, { component: 'MapView' });
    performanceMonitor.recordMetric('map.markers.visible', visibleMarkers, { component: 'MapView' });
    performanceMonitor.recordMetric('map.markers.clustered', clusteredMarkers, { component: 'MapView' });
    performanceMonitor.recordMetric('map.markers.renderTime', renderTime, { component: 'MapView' });
    performanceMonitor.recordMetric('map.markers.poolSize', poolSize, { component: 'MapView' });
    performanceMonitor.recordMetric('map.markers.cacheSize', cacheSize, { component: 'MapView' });

    // Check marker thresholds
    if (visibleMarkers > this.thresholds.rendering.maxMarkers) {
      this.createAlert('performance', 'medium', 
        `High marker count: ${visibleMarkers} visible markers (threshold: ${this.thresholds.rendering.maxMarkers})`,
        { totalMarkers, visibleMarkers, clusteredMarkers }
      );
    }

    if (renderTime > this.thresholds.rendering.maxRenderTime) {
      this.createAlert('performance', 'high',
        `Slow marker rendering: ${renderTime.toFixed(2)}ms (threshold: ${this.thresholds.rendering.maxRenderTime}ms)`,
        { totalMarkers, visibleMarkers, markerRenderTime: renderTime }
      );
    }
  }

  // API performance tracking
  recordAPIMetrics(operation: string, responseTime: number, success: boolean): void {
    this.apiMetrics.totalRequests++;
    this.apiMetrics.totalResponseTime += responseTime;
    
    if (success) {
      this.apiMetrics.successfulRequests++;
    }

    const successRate = (this.apiMetrics.successfulRequests / this.apiMetrics.totalRequests) * 100;
    const avgResponseTime = this.apiMetrics.totalResponseTime / this.apiMetrics.totalRequests;

    // Record metrics
    performanceMonitor.recordMetric(`map.api.${operation}.responseTime`, responseTime, {
      component: 'MapView',
      success: success.toString(),
    });
    performanceMonitor.recordMetric('map.api.successRate', successRate, { component: 'MapView' });
    performanceMonitor.recordMetric('map.api.avgResponseTime', avgResponseTime, { component: 'MapView' });

    // Check API thresholds
    if (responseTime > this.thresholds.api.maxResponseTime) {
      this.createAlert('api', 'medium',
        `Slow API response: ${operation} took ${responseTime.toFixed(2)}ms (threshold: ${this.thresholds.api.maxResponseTime}ms)`,
        { apiResponseTime: responseTime }
      );
    }

    if (successRate < this.thresholds.api.minSuccessRate) {
      this.createAlert('api', 'high',
        `Low API success rate: ${successRate.toFixed(1)}% (threshold: ${this.thresholds.api.minSuccessRate}%)`,
        { apiSuccessRate: successRate }
      );
    }
  }

  // Viewport performance tracking
  recordViewportMetrics(metrics: {
    zoomLevel: number;
    boundsArea: number;
    changeCount: number;
  }): void {
    const { zoomLevel, boundsArea, changeCount } = metrics;

    performanceMonitor.recordMetric('map.viewport.zoomLevel', zoomLevel, { component: 'MapView' });
    performanceMonitor.recordMetric('map.viewport.boundsArea', boundsArea, { component: 'MapView' });
    performanceMonitor.recordMetric('map.viewport.changes', changeCount, { component: 'MapView' });
  }

  // Comprehensive metrics collection
  collectMetrics(): MapPerformanceMetrics {
    const memoryUsage = this.recordMemoryUsage() || {
      used: 0,
      total: 0,
      limit: 0,
      percentage: 0,
    };

    const currentFPS = this.getCurrentFPS();
    const apiSuccessRate = this.apiMetrics.totalRequests > 0 
      ? (this.apiMetrics.successfulRequests / this.apiMetrics.totalRequests) * 100 
      : 100;
    const avgApiResponseTime = this.apiMetrics.totalRequests > 0
      ? this.apiMetrics.totalResponseTime / this.apiMetrics.totalRequests
      : 0;

    const metrics: MapPerformanceMetrics = {
      // Rendering metrics (get from recent performance metrics)
      markerRenderTime: this.getRecentMetricValue('map.markers.renderTime') || 0,
      clusterRenderTime: this.getRecentMetricValue('map.clustering.renderTime') || 0,
      viewportCullingTime: this.getRecentMetricValue('map.viewport_culling') || 0,
      totalRenderTime: this.getRecentMetricValue('map.totalRenderTime') || 0,
      
      memoryUsage,
      
      // Marker metrics
      totalMarkers: this.getRecentMetricValue('map.markers.total') || 0,
      visibleMarkers: this.getRecentMetricValue('map.markers.visible') || 0,
      clusteredMarkers: this.getRecentMetricValue('map.markers.clustered') || 0,
      markerPoolSize: this.getRecentMetricValue('map.markers.poolSize') || 0,
      markerCacheSize: this.getRecentMetricValue('map.markers.cacheSize') || 0,
      
      // API metrics
      apiResponseTime: avgApiResponseTime,
      apiErrorCount: this.apiMetrics.totalRequests - this.apiMetrics.successfulRequests,
      apiSuccessRate,
      
      // Viewport metrics
      viewportChanges: this.getRecentMetricValue('map.viewport.changes') || 0,
      zoomLevel: this.getRecentMetricValue('map.viewport.zoomLevel') || 0,
      boundsArea: this.getRecentMetricValue('map.viewport.boundsArea') || 0,
      
      // Performance indicators
      fps: currentFPS,
      frameDrops: this.frameDrops,
      longTasks: this.longTasks,
      
      timestamp: Date.now(),
    };

    // Store metrics
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    return metrics;
  }

  // Alert management
  onAlert(callback: (alert: MapPerformanceAlert) => void): () => void {
    this.alertCallbacks.push(callback);
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  private createAlert(
    type: MapPerformanceAlert['type'],
    severity: MapPerformanceAlert['severity'],
    message: string,
    metrics: Partial<MapPerformanceMetrics>
  ): void {
    const alert: MapPerformanceAlert = {
      type,
      severity,
      message,
      metrics,
      timestamp: Date.now(),
      component: 'MapView',
    };

    this.alerts.push(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    // Notify callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.warn('Error in alert callback:', error);
      }
    });

    // Log critical alerts
    if (severity === 'critical' || severity === 'high') {
      console.warn(`MapView Performance Alert [${severity.toUpperCase()}]:`, message, metrics);
    }
  }

  // Threshold checking
  private checkMemoryThresholds(memoryUsage: MapPerformanceMetrics['memoryUsage']): void {
    if (memoryUsage.percentage >= this.thresholds.memory.critical) {
      this.createAlert('memory', 'critical',
        `Critical memory usage: ${memoryUsage.percentage.toFixed(1)}% (${(memoryUsage.used / 1024 / 1024).toFixed(1)}MB)`,
        { memoryUsage }
      );
    } else if (memoryUsage.percentage >= this.thresholds.memory.warning) {
      this.createAlert('memory', 'medium',
        `High memory usage: ${memoryUsage.percentage.toFixed(1)}% (${(memoryUsage.used / 1024 / 1024).toFixed(1)}MB)`,
        { memoryUsage }
      );
    }
  }

  private checkPerformanceThresholds(operation: string, duration: number): void {
    if (operation.includes('render') && duration > this.thresholds.rendering.maxRenderTime) {
      this.createAlert('performance', 'medium',
        `Slow ${operation}: ${duration.toFixed(2)}ms (threshold: ${this.thresholds.rendering.maxRenderTime}ms)`,
        { [operation.replace('.', '')]: duration }
      );
    }
  }

  // FPS monitoring
  private startFPSMonitoring(): void {
    let lastTime = performance.now();
    let frameCount = 0;

    const measureFPS = (currentTime: number) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) { // Every second
        this.frameCount = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        // Check for frame drops
        if (this.frameCount < this.thresholds.rendering.targetFPS) {
          this.frameDrops++;
          
          if (this.frameCount < this.thresholds.rendering.targetFPS * 0.5) {
            this.createAlert('performance', 'high',
              `Low FPS detected: ${this.frameCount} fps (target: ${this.thresholds.rendering.targetFPS} fps)`,
              { fps: this.frameCount }
            );
          }
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  private getCurrentFPS(): number {
    return this.frameCount;
  }

  // Performance observers setup
  private setupPerformanceObservers(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    // Long task observer
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) { // Tasks longer than 50ms
            this.longTasks++;
            
            if (entry.duration > 100) {
              this.createAlert('performance', 'medium',
                `Long task detected: ${entry.duration.toFixed(2)}ms`,
                { longTasks: this.longTasks }
              );
            }
          }
        });
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    } catch (e) {
      console.warn('Long task observer not supported');
    }

    // Layout shift observer
    try {
      const layoutShiftObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const layoutShiftEntry = entry as any;
          if (layoutShiftEntry.value > 0.1) {
            this.createAlert('performance', 'low',
              `Layout shift detected: ${layoutShiftEntry.value.toFixed(3)}`,
              {}
            );
          }
        });
      });

      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(layoutShiftObserver);
    } catch (e) {
      console.warn('Layout shift observer not supported');
    }
  }

  // Utility methods
  private getRecentMetricValue(name: string): number | null {
    const recentMetrics = performanceMonitor.getMetrics(name, Date.now() - 5000); // Last 5 seconds
    if (recentMetrics.length === 0) return null;
    
    return recentMetrics[recentMetrics.length - 1].value;
  }

  // Data export and analysis
  getMetricsSummary(timeRange?: { start: number; end: number }): {
    performance: any;
    memory: any;
    api: any;
    alerts: MapPerformanceAlert[];
  } {
    let filteredMetrics = this.metrics;
    let filteredAlerts = this.alerts;

    if (timeRange) {
      filteredMetrics = this.metrics.filter(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
      filteredAlerts = this.alerts.filter(a => 
        a.timestamp >= timeRange.start && a.timestamp <= timeRange.end
      );
    }

    return {
      performance: {
        avgRenderTime: this.calculateAverage(filteredMetrics, 'totalRenderTime'),
        avgFPS: this.calculateAverage(filteredMetrics, 'fps'),
        totalFrameDrops: filteredMetrics.reduce((sum, m) => sum + m.frameDrops, 0),
        totalLongTasks: filteredMetrics.reduce((sum, m) => sum + m.longTasks, 0),
      },
      memory: {
        avgUsage: this.calculateAverage(filteredMetrics, m => m.memoryUsage.percentage),
        peakUsage: Math.max(...filteredMetrics.map(m => m.memoryUsage.percentage)),
        avgUsedMB: this.calculateAverage(filteredMetrics, m => m.memoryUsage.used / 1024 / 1024),
      },
      api: {
        avgResponseTime: this.calculateAverage(filteredMetrics, 'apiResponseTime'),
        avgSuccessRate: this.calculateAverage(filteredMetrics, 'apiSuccessRate'),
        totalErrors: filteredMetrics.reduce((sum, m) => sum + m.apiErrorCount, 0),
      },
      alerts: filteredAlerts,
    };
  }

  private calculateAverage(metrics: MapPerformanceMetrics[], key: string | ((m: MapPerformanceMetrics) => number)): number {
    if (metrics.length === 0) return 0;
    
    const values = metrics.map(m => typeof key === 'string' ? (m as any)[key] : key(m));
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  // Cleanup
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
    this.alerts = [];
    this.timers.clear();
    this.counters.clear();
    this.alertCallbacks = [];
  }
}

// Global instance for MapView
export const mapPerformanceMonitor = new MapPerformanceMonitor();