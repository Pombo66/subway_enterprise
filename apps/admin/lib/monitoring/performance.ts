/**
 * Performance monitoring and metrics collection
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface TimingMetric extends PerformanceMetric {
  startTime: number;
  endTime: number;
  duration: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor(private maxMetrics: number = 1000) {
    this.setupObservers();
  }

  // Timer methods
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  endTimer(name: string, tags?: Record<string, string>): TimingMetric | null {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer '${name}' was not started`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    const metric: TimingMetric = {
      name,
      value: duration,
      timestamp: Date.now(),
      startTime,
      endTime,
      duration,
      tags
    };

    this.addMetric(metric);
    this.timers.delete(name);
    
    return metric;
  }

  // Measure function execution time
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    this.startTimer(name);
    try {
      const result = await fn();
      this.endTimer(name, { ...tags, status: 'success' });
      return result;
    } catch (error) {
      this.endTimer(name, { ...tags, status: 'error' });
      throw error;
    }
  }

  measureSync<T>(
    name: string,
    fn: () => T,
    tags?: Record<string, string>
  ): T {
    this.startTimer(name);
    try {
      const result = fn();
      this.endTimer(name, { ...tags, status: 'success' });
      return result;
    } catch (error) {
      this.endTimer(name, { ...tags, status: 'error' });
      throw error;
    }
  }

  // Custom metrics
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags
    };
    this.addMetric(metric);
  }

  // Memory usage
  recordMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.recordMetric('memory.used', memory.usedJSHeapSize, { type: 'heap' });
      this.recordMetric('memory.total', memory.totalJSHeapSize, { type: 'heap' });
      this.recordMetric('memory.limit', memory.jsHeapSizeLimit, { type: 'heap' });
    }
  }

  // Network timing
  recordNetworkTiming(url: string, timing: PerformanceTiming): void {
    const metrics = [
      { name: 'network.dns', value: timing.domainLookupEnd - timing.domainLookupStart },
      { name: 'network.connect', value: timing.connectEnd - timing.connectStart },
      { name: 'network.request', value: timing.responseStart - timing.requestStart },
      { name: 'network.response', value: timing.responseEnd - timing.responseStart },
      { name: 'network.total', value: timing.responseEnd - timing.requestStart }
    ];

    metrics.forEach(metric => {
      this.recordMetric(metric.name, metric.value, { url });
    });
  }

  // Setup performance observers
  private setupObservers(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      // Navigation timing
      const navObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric('navigation.load', navEntry.loadEventEnd - navEntry.loadEventStart);
            this.recordMetric('navigation.dom', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart);
          }
        });
      });

      try {
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (e) {
        console.warn('Navigation timing observer not supported');
      }

      // Resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.recordMetric('resource.load', resourceEntry.responseEnd - resourceEntry.startTime, {
              name: resourceEntry.name,
              type: resourceEntry.initiatorType
            });
          }
        });
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (e) {
        console.warn('Resource timing observer not supported');
      }
    }
  }

  // Metric management
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // Data retrieval
  private metricsCache = new Map<string, { data: PerformanceMetric[]; timestamp: number }>();
  private readonly CACHE_TTL = 1000; // 1 second cache

  getMetrics(name?: string, since?: number): PerformanceMetric[] {
    const cacheKey = `${name || 'all'}-${since || 0}`;
    const cached = this.metricsCache.get(cacheKey);
    
    // Return cached result if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    
    let filtered = this.metrics;
    
    if (name) {
      filtered = filtered.filter(m => m.name === name);
    }
    
    if (since) {
      filtered = filtered.filter(m => m.timestamp >= since);
    }
    
    // Cache the result
    this.metricsCache.set(cacheKey, {
      data: filtered,
      timestamp: Date.now()
    });
    
    // Clean up old cache entries
    this.cleanupCache();
    
    return filtered;
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.metricsCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL * 2) {
        this.metricsCache.delete(key);
      }
    }
  }

  getAverageMetric(name: string, since?: number): number {
    const metrics = this.getMetrics(name, since);
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  getMetricSummary(name: string, since?: number): {
    count: number;
    min: number;
    max: number;
    avg: number;
    total: number;
  } {
    const metrics = this.getMetrics(name, since);
    
    if (metrics.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, total: 0 };
    }
    
    const values = metrics.map(m => m.value);
    const total = values.reduce((acc, v) => acc + v, 0);
    
    return {
      count: metrics.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: total / metrics.length,
      total
    };
  }

  // Export data
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['name', 'value', 'timestamp', 'tags'];
      const rows = this.metrics.map(m => [
        m.name,
        m.value.toString(),
        m.timestamp.toString(),
        JSON.stringify(m.tags || {})
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return JSON.stringify(this.metrics, null, 2);
  }

  // Cleanup
  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }

  destroy(): void {
    this.clear();
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Decorator for measuring method execution time
export function measurePerformance(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measureAsync(metricName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}