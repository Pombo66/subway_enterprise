import { Injectable, Logger } from '@nestjs/common';
import { EnhancedIntelligenceConfigService } from '../../../config/enhanced-intelligence.config';

export interface TelemetryEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  service: string;
  operation: string;
  duration?: number;
  success: boolean;
  metadata?: Record<string, any>;
  tags?: Record<string, string>;
  metrics?: Record<string, number>;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}

export interface TelemetryMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface TelemetryAlert {
  id: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  service: string;
  metric?: string;
  threshold?: number;
  actualValue?: number;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface ServiceHealthMetrics {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  requestCount: number;
  errorCount: number;
  errorRate: number;
  averageResponseTime: number;
  lastHealthCheck: Date;
  dependencies: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
  }>;
}

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  private events: TelemetryEvent[] = [];
  private metrics: TelemetryMetric[] = [];
  private alerts: TelemetryAlert[] = [];
  private serviceMetrics = new Map<string, ServiceHealthMetrics>();
  
  private readonly maxEvents = 50000;
  private readonly maxMetrics = 100000;
  private readonly maxAlerts = 10000;
  private readonly retentionDays = 7;

  constructor(
    private readonly configService: EnhancedIntelligenceConfigService
  ) {
    this.startMaintenanceTimer();
  }

  // Event tracking
  trackEvent(event: Omit<TelemetryEvent, 'id' | 'timestamp'>): string {
    if (!this.configService.isFeatureEnabled('enableTelemetry')) {
      return '';
    }

    const telemetryEvent: TelemetryEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event
    };

    this.events.push(telemetryEvent);
    this.maintainEventLimit();

    // Update service metrics
    this.updateServiceMetrics(telemetryEvent);

    // Check for alert conditions
    this.checkAlertConditions(telemetryEvent);

    this.logger.debug(`Telemetry event tracked: ${event.eventType}`, {
      service: event.service,
      operation: event.operation,
      success: event.success
    });

    return telemetryEvent.id;
  }

  // Metric recording
  recordMetric(metric: Omit<TelemetryMetric, 'timestamp'>): void {
    if (!this.configService.isFeatureEnabled('enableTelemetry')) {
      return;
    }

    const telemetryMetric: TelemetryMetric = {
      timestamp: new Date(),
      ...metric
    };

    this.metrics.push(telemetryMetric);
    this.maintainMetricLimit();

    this.logger.debug(`Metric recorded: ${metric.name} = ${metric.value} ${metric.unit}`);
  }

  // Batch metric recording
  recordMetrics(metrics: Array<Omit<TelemetryMetric, 'timestamp'>>): void {
    if (!this.configService.isFeatureEnabled('enableTelemetry')) {
      return;
    }

    const timestamp = new Date();
    const telemetryMetrics = metrics.map(metric => ({
      timestamp,
      ...metric
    }));

    this.metrics.push(...telemetryMetrics);
    this.maintainMetricLimit();

    this.logger.debug(`Batch metrics recorded: ${metrics.length} metrics`);
  }

  // Alert management
  createAlert(alert: Omit<TelemetryAlert, 'id' | 'timestamp' | 'resolved'>): string {
    const telemetryAlert: TelemetryAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      resolved: false,
      ...alert
    };

    this.alerts.push(telemetryAlert);
    this.maintainAlertLimit();

    this.logger.log(`Alert created: ${alert.severity} - ${alert.title}`, {
      service: alert.service,
      metric: alert.metric,
      threshold: alert.threshold,
      actualValue: alert.actualValue
    });

    return telemetryAlert.id;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.logger.log(`Alert resolved: ${alert.title}`);
      return true;
    }
    return false;
  }

  // Service health tracking
  updateServiceHealth(service: string, healthData: Partial<ServiceHealthMetrics>): void {
    const existing = this.serviceMetrics.get(service) || {
      service,
      status: 'healthy',
      uptime: 0,
      requestCount: 0,
      errorCount: 0,
      errorRate: 0,
      averageResponseTime: 0,
      lastHealthCheck: new Date(),
      dependencies: []
    };

    const updated: ServiceHealthMetrics = {
      ...existing,
      ...healthData,
      lastHealthCheck: new Date()
    };

    this.serviceMetrics.set(service, updated);

    // Record health metrics
    this.recordMetrics([
      { name: `${service}.request_count`, value: updated.requestCount, unit: 'count' },
      { name: `${service}.error_count`, value: updated.errorCount, unit: 'count' },
      { name: `${service}.error_rate`, value: updated.errorRate, unit: 'percentage' },
      { name: `${service}.response_time`, value: updated.averageResponseTime, unit: 'milliseconds' },
      { name: `${service}.uptime`, value: updated.uptime, unit: 'seconds' }
    ]);
  }

  // Intelligence-specific tracking methods
  trackDemographicAnalysis(
    lat: number, 
    lng: number, 
    duration: number, 
    success: boolean, 
    dataSource: string,
    confidence?: number,
    error?: string
  ): void {
    this.trackEvent({
      eventType: 'demographic_analysis',
      service: 'demographic_analysis',
      operation: 'analyze_demographics',
      duration,
      success,
      metadata: {
        location: { lat, lng },
        dataSource,
        confidence
      },
      error: error ? { message: error } : undefined
    });

    if (success && confidence !== undefined) {
      this.recordMetric({
        name: 'demographic_analysis.confidence',
        value: confidence,
        unit: 'score',
        tags: { data_source: dataSource }
      });
    }
  }

  trackViabilityAssessment(
    lat: number,
    lng: number,
    duration: number,
    success: boolean,
    overallScore?: number,
    error?: string
  ): void {
    this.trackEvent({
      eventType: 'viability_assessment',
      service: 'viability_assessment',
      operation: 'assess_viability',
      duration,
      success,
      metadata: {
        location: { lat, lng },
        overallScore
      },
      error: error ? { message: error } : undefined
    });

    if (success && overallScore !== undefined) {
      this.recordMetric({
        name: 'viability_assessment.score',
        value: overallScore,
        unit: 'score'
      });
    }
  }

  trackCompetitiveAnalysis(
    lat: number,
    lng: number,
    duration: number,
    success: boolean,
    competitorCount?: number,
    marketSaturation?: number,
    error?: string
  ): void {
    this.trackEvent({
      eventType: 'competitive_analysis',
      service: 'competitive_analysis',
      operation: 'analyze_competition',
      duration,
      success,
      metadata: {
        location: { lat, lng },
        competitorCount,
        marketSaturation
      },
      error: error ? { message: error } : undefined
    });

    if (success) {
      if (competitorCount !== undefined) {
        this.recordMetric({
          name: 'competitive_analysis.competitor_count',
          value: competitorCount,
          unit: 'count'
        });
      }
      if (marketSaturation !== undefined) {
        this.recordMetric({
          name: 'competitive_analysis.market_saturation',
          value: marketSaturation,
          unit: 'percentage'
        });
      }
    }
  }

  trackStrategicRationale(
    lat: number,
    lng: number,
    duration: number,
    success: boolean,
    rationaleLength?: number,
    aiModel?: string,
    error?: string
  ): void {
    this.trackEvent({
      eventType: 'strategic_rationale',
      service: 'strategic_rationale',
      operation: 'generate_rationale',
      duration,
      success,
      metadata: {
        location: { lat, lng },
        rationaleLength,
        aiModel
      },
      error: error ? { message: error } : undefined
    });

    if (success && rationaleLength !== undefined) {
      this.recordMetric({
        name: 'strategic_rationale.length',
        value: rationaleLength,
        unit: 'characters',
        tags: { ai_model: aiModel || 'unknown' }
      });
    }
  }

  trackPatternDetection(
    locationCount: number,
    duration: number,
    success: boolean,
    patternsDetected?: number,
    patternScore?: number,
    error?: string
  ): void {
    this.trackEvent({
      eventType: 'pattern_detection',
      service: 'pattern_detection',
      operation: 'analyze_patterns',
      duration,
      success,
      metadata: {
        locationCount,
        patternsDetected,
        patternScore
      },
      error: error ? { message: error } : undefined
    });

    if (success) {
      if (patternsDetected !== undefined) {
        this.recordMetric({
          name: 'pattern_detection.patterns_found',
          value: patternsDetected,
          unit: 'count'
        });
      }
      if (patternScore !== undefined) {
        this.recordMetric({
          name: 'pattern_detection.pattern_score',
          value: patternScore,
          unit: 'score'
        });
      }
    }
  }

  trackCacheOperation(
    operation: 'get' | 'set' | 'invalidate',
    cacheType: string,
    hit: boolean,
    duration: number,
    keyCount?: number
  ): void {
    this.trackEvent({
      eventType: 'cache_operation',
      service: 'cache_manager',
      operation: `cache_${operation}`,
      duration,
      success: true,
      metadata: {
        cacheType,
        hit,
        keyCount
      }
    });

    this.recordMetrics([
      {
        name: `cache.${operation}.duration`,
        value: duration,
        unit: 'milliseconds',
        tags: { cache_type: cacheType }
      },
      {
        name: `cache.${operation}.${hit ? 'hit' : 'miss'}`,
        value: 1,
        unit: 'count',
        tags: { cache_type: cacheType }
      }
    ]);
  }

  // Query methods
  getEvents(
    filters?: {
      service?: string;
      eventType?: string;
      success?: boolean;
      startTime?: Date;
      endTime?: Date;
    },
    limit: number = 1000
  ): TelemetryEvent[] {
    let filteredEvents = this.events;

    if (filters) {
      filteredEvents = this.events.filter(event => {
        if (filters.service && event.service !== filters.service) return false;
        if (filters.eventType && event.eventType !== filters.eventType) return false;
        if (filters.success !== undefined && event.success !== filters.success) return false;
        if (filters.startTime && event.timestamp < filters.startTime) return false;
        if (filters.endTime && event.timestamp > filters.endTime) return false;
        return true;
      });
    }

    return filteredEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getMetrics(
    metricName?: string,
    startTime?: Date,
    endTime?: Date,
    tags?: Record<string, string>
  ): TelemetryMetric[] {
    let filteredMetrics = this.metrics;

    if (metricName) {
      filteredMetrics = filteredMetrics.filter(m => m.name === metricName);
    }

    if (startTime) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= startTime);
    }

    if (endTime) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp <= endTime);
    }

    if (tags) {
      filteredMetrics = filteredMetrics.filter(m => {
        if (!m.tags) return false;
        return Object.entries(tags).every(([key, value]) => m.tags![key] === value);
      });
    }

    return filteredMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getAlerts(resolved?: boolean): TelemetryAlert[] {
    let filteredAlerts = this.alerts;

    if (resolved !== undefined) {
      filteredAlerts = filteredAlerts.filter(a => a.resolved === resolved);
    }

    return filteredAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getServiceHealth(service?: string): ServiceHealthMetrics[] {
    if (service) {
      const metrics = this.serviceMetrics.get(service);
      return metrics ? [metrics] : [];
    }

    return Array.from(this.serviceMetrics.values());
  }

  // Analytics methods
  getServiceStatistics(service: string, timeWindow: number = 3600000): {
    requestCount: number;
    errorCount: number;
    errorRate: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    throughput: number;
  } {
    const cutoffTime = new Date(Date.now() - timeWindow);
    const serviceEvents = this.events.filter(e => 
      e.service === service && e.timestamp >= cutoffTime
    );

    const requestCount = serviceEvents.length;
    const errorCount = serviceEvents.filter(e => !e.success).length;
    const errorRate = requestCount > 0 ? errorCount / requestCount : 0;

    const responseTimes = serviceEvents
      .filter(e => e.duration !== undefined)
      .map(e => e.duration!)
      .sort((a, b) => a - b);

    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p95ResponseTime = responseTimes.length > 0 ? responseTimes[p95Index] || 0 : 0;

    const throughput = requestCount / (timeWindow / 1000); // requests per second

    return {
      requestCount,
      errorCount,
      errorRate,
      averageResponseTime,
      p95ResponseTime,
      throughput
    };
  }

  getMetricAggregation(
    metricName: string,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count',
    timeWindow: number = 3600000
  ): number {
    const cutoffTime = new Date(Date.now() - timeWindow);
    const metrics = this.metrics.filter(m => 
      m.name === metricName && m.timestamp >= cutoffTime
    );

    if (metrics.length === 0) return 0;

    const values = metrics.map(m => m.value);

    switch (aggregation) {
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      default:
        return 0;
    }
  }

  // Private helper methods
  private updateServiceMetrics(event: TelemetryEvent): void {
    const existing = this.serviceMetrics.get(event.service) || {
      service: event.service,
      status: 'healthy',
      uptime: 0,
      requestCount: 0,
      errorCount: 0,
      errorRate: 0,
      averageResponseTime: 0,
      lastHealthCheck: new Date(),
      dependencies: []
    };

    existing.requestCount++;
    if (!event.success) {
      existing.errorCount++;
    }
    existing.errorRate = existing.requestCount > 0 ? existing.errorCount / existing.requestCount : 0;

    if (event.duration !== undefined) {
      existing.averageResponseTime = (
        (existing.averageResponseTime * (existing.requestCount - 1)) + event.duration
      ) / existing.requestCount;
    }

    // Update status based on error rate
    if (existing.errorRate > 0.1) {
      existing.status = 'unhealthy';
    } else if (existing.errorRate > 0.05) {
      existing.status = 'degraded';
    } else {
      existing.status = 'healthy';
    }

    this.serviceMetrics.set(event.service, existing);
  }

  private checkAlertConditions(event: TelemetryEvent): void {
    const config = this.configService.getMonitoringConfig();
    if (!config.enableAlerts) return;

    const thresholds = config.alertThresholds;

    // Check error rate
    const serviceMetrics = this.serviceMetrics.get(event.service);
    if (serviceMetrics && serviceMetrics.errorRate > thresholds.errorRate) {
      this.createAlert({
        severity: 'error',
        title: `High error rate in ${event.service}`,
        description: `Error rate (${(serviceMetrics.errorRate * 100).toFixed(2)}%) exceeds threshold (${(thresholds.errorRate * 100).toFixed(2)}%)`,
        service: event.service,
        metric: 'error_rate',
        threshold: thresholds.errorRate,
        actualValue: serviceMetrics.errorRate
      });
    }

    // Check response time
    if (event.duration && event.duration > thresholds.responseTime) {
      this.createAlert({
        severity: 'warning',
        title: `Slow response time in ${event.service}`,
        description: `Response time (${event.duration}ms) exceeds threshold (${thresholds.responseTime}ms)`,
        service: event.service,
        metric: 'response_time',
        threshold: thresholds.responseTime,
        actualValue: event.duration
      });
    }
  }

  private maintainEventLimit(): void {
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  private maintainMetricLimit(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  private maintainAlertLimit(): void {
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }
  }

  private startMaintenanceTimer(): void {
    setInterval(() => {
      this.performMaintenance();
    }, 60 * 60 * 1000); // Run every hour
  }

  private performMaintenance(): void {
    const cutoffTime = new Date(Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000));

    // Clean old events
    const eventsBefore = this.events.length;
    this.events = this.events.filter(e => e.timestamp >= cutoffTime);

    // Clean old metrics
    const metricsBefore = this.metrics.length;
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    // Clean old alerts (keep resolved alerts for 24 hours)
    const alertCutoff = new Date(Date.now() - (24 * 60 * 60 * 1000));
    const alertsBefore = this.alerts.length;
    this.alerts = this.alerts.filter(a => 
      !a.resolved || (a.resolvedAt && a.resolvedAt >= alertCutoff)
    );

    if (eventsBefore > this.events.length || metricsBefore > this.metrics.length || alertsBefore > this.alerts.length) {
      this.logger.debug('Telemetry maintenance completed', {
        eventsRemoved: eventsBefore - this.events.length,
        metricsRemoved: metricsBefore - this.metrics.length,
        alertsRemoved: alertsBefore - this.alerts.length
      });
    }
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Health check
  healthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    eventCount: number;
    metricCount: number;
    alertCount: number;
    activeAlerts: number;
    services: number;
  } {
    const activeAlerts = this.alerts.filter(a => !a.resolved).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (activeAlerts > 10) {
      status = 'unhealthy';
    } else if (activeAlerts > 5) {
      status = 'degraded';
    }

    return {
      status,
      eventCount: this.events.length,
      metricCount: this.metrics.length,
      alertCount: this.alerts.length,
      activeAlerts,
      services: this.serviceMetrics.size
    };
  }
}