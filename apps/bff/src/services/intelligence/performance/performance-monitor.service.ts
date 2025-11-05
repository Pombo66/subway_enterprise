import { Injectable, Logger } from '@nestjs/common';

export interface PerformanceEvent {
  id: string;
  timestamp: number;
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
  error?: string;
}

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold: number;
}

export interface PerformanceThresholds {
  maxResponseTime: number;
  maxErrorRate: number;
  minCacheHitRate: number;
  maxMemoryUsage: number;
  maxConcurrentRequests: number;
}

export interface PerformanceSummary {
  timeWindow: string;
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  memoryUsage: number;
  concurrentRequests: number;
  alerts: PerformanceAlert[];
  topSlowOperations: Array<{ operation: string; averageTime: number; count: number }>;
}

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  
  private events: PerformanceEvent[] = [];
  private alerts: PerformanceAlert[] = [];
  private activeRequests = new Map<string, { operation: string; startTime: number }>();
  
  private readonly maxEventsToKeep = 10000;
  private readonly maxAlertsToKeep = 1000;
  
  private thresholds: PerformanceThresholds = {
    maxResponseTime: 5000,      // 5 seconds
    maxErrorRate: 0.05,         // 5%
    minCacheHitRate: 0.7,       // 70%
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    maxConcurrentRequests: 50
  };

  // Start tracking a performance event
  startTracking(operation: string, metadata?: Record<string, any>): string {
    const id = this.generateEventId();
    const startTime = Date.now();
    
    this.activeRequests.set(id, { operation, startTime });
    
    // Check concurrent request threshold
    if (this.activeRequests.size > this.thresholds.maxConcurrentRequests) {
      this.createAlert(
        'high',
        'High concurrent request count',
        'concurrentRequests',
        this.activeRequests.size,
        this.thresholds.maxConcurrentRequests
      );
    }
    
    this.logger.debug(`Started tracking ${operation} with ID ${id}`);
    return id;
  }

  // Stop tracking and record the event
  stopTracking(id: string, success: boolean = true, error?: string, metadata?: Record<string, any>): void {
    const activeRequest = this.activeRequests.get(id);
    
    if (!activeRequest) {
      this.logger.warn(`No active request found for ID ${id}`);
      return;
    }
    
    const duration = Date.now() - activeRequest.startTime;
    
    const event: PerformanceEvent = {
      id,
      timestamp: Date.now(),
      operation: activeRequest.operation,
      duration,
      success,
      metadata,
      error
    };
    
    this.recordEvent(event);
    this.activeRequests.delete(id);
    
    // Check performance thresholds
    this.checkThresholds(event);
    
    this.logger.debug(`Stopped tracking ${activeRequest.operation}: ${duration}ms, success: ${success}`);
  }

  // Record a performance event directly
  recordEvent(event: PerformanceEvent): void {
    this.events.push(event);
    
    // Maintain event history size
    if (this.events.length > this.maxEventsToKeep) {
      this.events = this.events.slice(-this.maxEventsToKeep);
    }
    
    // Log slow operations
    if (event.duration > this.thresholds.maxResponseTime) {
      this.logger.warn(`Slow operation detected: ${event.operation} took ${event.duration}ms`);
    }
    
    // Log errors
    if (!event.success && event.error) {
      this.logger.error(`Operation failed: ${event.operation} - ${event.error}`);
    }
  }

  // Create a performance alert
  createAlert(
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    metric: string,
    value: number,
    threshold: number
  ): void {
    const alert: PerformanceAlert = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      severity,
      message,
      metric,
      value,
      threshold
    };
    
    this.alerts.push(alert);
    
    // Maintain alert history size
    if (this.alerts.length > this.maxAlertsToKeep) {
      this.alerts = this.alerts.slice(-this.maxAlertsToKeep);
    }
    
    // Log alert based on severity
    switch (severity) {
      case 'critical':
        this.logger.error(`CRITICAL ALERT: ${message} (${metric}: ${value} > ${threshold})`);
        break;
      case 'high':
        this.logger.warn(`HIGH ALERT: ${message} (${metric}: ${value} > ${threshold})`);
        break;
      case 'medium':
        this.logger.warn(`MEDIUM ALERT: ${message} (${metric}: ${value} > ${threshold})`);
        break;
      case 'low':
        this.logger.log(`LOW ALERT: ${message} (${metric}: ${value} > ${threshold})`);
        break;
    }
  }

  // Get performance summary for a time window
  getPerformanceSummary(timeWindowMinutes: number = 60): PerformanceSummary {
    const now = Date.now();
    const windowStart = now - (timeWindowMinutes * 60 * 1000);
    
    // Filter events within time window
    const windowEvents = this.events.filter(event => event.timestamp >= windowStart);
    const windowAlerts = this.alerts.filter(alert => alert.timestamp >= windowStart);
    
    // Calculate metrics
    const totalRequests = windowEvents.length;
    const successfulRequests = windowEvents.filter(e => e.success).length;
    const errorRate = totalRequests > 0 ? (totalRequests - successfulRequests) / totalRequests : 0;
    
    const averageResponseTime = totalRequests > 0 
      ? windowEvents.reduce((sum, e) => sum + e.duration, 0) / totalRequests 
      : 0;
    
    // Calculate cache hit rate (if cache events are tracked)
    const cacheEvents = windowEvents.filter(e => e.operation.includes('cache'));
    const cacheHits = cacheEvents.filter(e => e.metadata?.cacheHit === true).length;
    const cacheHitRate = cacheEvents.length > 0 ? cacheHits / cacheEvents.length : 0;
    
    // Get current memory usage
    const memoryUsage = process.memoryUsage().heapUsed;
    
    // Get top slow operations
    const operationStats = new Map<string, { totalTime: number; count: number }>();
    
    windowEvents.forEach(event => {
      const existing = operationStats.get(event.operation) || { totalTime: 0, count: 0 };
      existing.totalTime += event.duration;
      existing.count += 1;
      operationStats.set(event.operation, existing);
    });
    
    const topSlowOperations = Array.from(operationStats.entries())
      .map(([operation, stats]) => ({
        operation,
        averageTime: stats.totalTime / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);
    
    return {
      timeWindow: `${timeWindowMinutes} minutes`,
      totalRequests,
      averageResponseTime: Number(averageResponseTime.toFixed(2)),
      errorRate: Number(errorRate.toFixed(3)),
      cacheHitRate: Number(cacheHitRate.toFixed(3)),
      memoryUsage,
      concurrentRequests: this.activeRequests.size,
      alerts: windowAlerts,
      topSlowOperations
    };
  }

  // Get recent alerts
  getRecentAlerts(count: number = 50): PerformanceAlert[] {
    return this.alerts.slice(-count).reverse();
  }

  // Get active requests
  getActiveRequests(): Array<{ id: string; operation: string; duration: number }> {
    const now = Date.now();
    return Array.from(this.activeRequests.entries()).map(([id, request]) => ({
      id,
      operation: request.operation,
      duration: now - request.startTime
    }));
  }

  // Update performance thresholds
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    this.logger.log('Performance thresholds updated:', this.thresholds);
  }

  // Get current thresholds
  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  // Clear old events and alerts
  cleanup(olderThanMinutes: number = 1440): void { // Default 24 hours
    const cutoffTime = Date.now() - (olderThanMinutes * 60 * 1000);
    
    const eventsBefore = this.events.length;
    const alertsBefore = this.alerts.length;
    
    this.events = this.events.filter(event => event.timestamp >= cutoffTime);
    this.alerts = this.alerts.filter(alert => alert.timestamp >= cutoffTime);
    
    const eventsRemoved = eventsBefore - this.events.length;
    const alertsRemoved = alertsBefore - this.alerts.length;
    
    if (eventsRemoved > 0 || alertsRemoved > 0) {
      this.logger.log(`Cleanup completed: removed ${eventsRemoved} events and ${alertsRemoved} alerts`);
    }
  }

  // Export performance data for analysis
  exportPerformanceData(timeWindowMinutes: number = 60): {
    events: PerformanceEvent[];
    alerts: PerformanceAlert[];
    summary: PerformanceSummary;
  } {
    const now = Date.now();
    const windowStart = now - (timeWindowMinutes * 60 * 1000);
    
    const events = this.events.filter(event => event.timestamp >= windowStart);
    const alerts = this.alerts.filter(alert => alert.timestamp >= windowStart);
    const summary = this.getPerformanceSummary(timeWindowMinutes);
    
    return { events, alerts, summary };
  }

  // Health check for monitoring service
  healthCheck(): { status: 'healthy' | 'degraded' | 'unhealthy'; details: any } {
    try {
      const summary = this.getPerformanceSummary(5); // Last 5 minutes
      const criticalAlerts = this.alerts.filter(a => 
        a.severity === 'critical' && 
        Date.now() - a.timestamp < 5 * 60 * 1000 // Last 5 minutes
      );
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (criticalAlerts.length > 0) {
        status = 'unhealthy';
      } else if (summary.errorRate > this.thresholds.maxErrorRate || 
                 summary.averageResponseTime > this.thresholds.maxResponseTime) {
        status = 'degraded';
      }
      
      return {
        status,
        details: {
          eventsTracked: this.events.length,
          alertsGenerated: this.alerts.length,
          activeRequests: this.activeRequests.size,
          criticalAlerts: criticalAlerts.length,
          recentSummary: summary
        }
      };
    } catch (error) {
      this.logger.error('Performance monitor health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  // Private helper methods
  private checkThresholds(event: PerformanceEvent): void {
    // Check response time threshold
    if (event.duration > this.thresholds.maxResponseTime) {
      this.createAlert(
        'medium',
        `Slow response time for ${event.operation}`,
        'responseTime',
        event.duration,
        this.thresholds.maxResponseTime
      );
    }
    
    // Check memory usage threshold
    const memoryUsage = process.memoryUsage().heapUsed;
    if (memoryUsage > this.thresholds.maxMemoryUsage) {
      this.createAlert(
        'high',
        'High memory usage detected',
        'memoryUsage',
        memoryUsage,
        this.thresholds.maxMemoryUsage
      );
    }
    
    // Check error rate (calculated over recent events)
    const recentEvents = this.events.slice(-100); // Last 100 events
    if (recentEvents.length >= 10) {
      const errorRate = recentEvents.filter(e => !e.success).length / recentEvents.length;
      if (errorRate > this.thresholds.maxErrorRate) {
        this.createAlert(
          'high',
          'High error rate detected',
          'errorRate',
          errorRate,
          this.thresholds.maxErrorRate
        );
      }
    }
  }

  private generateEventId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}