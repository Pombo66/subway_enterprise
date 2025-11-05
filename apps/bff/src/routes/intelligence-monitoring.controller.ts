import { Controller, Get, Post, Param, Query, Body, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { MonitoringDashboardService, DashboardMetrics, ServiceDashboard, AlertDashboard, PerformanceDashboard } from '../services/intelligence/monitoring/monitoring-dashboard.service';
import { TelemetryService, TelemetryEvent, TelemetryMetric, TelemetryAlert } from '../services/intelligence/telemetry/telemetry.service';

interface EventQueryParams {
  service?: string;
  eventType?: string;
  success?: boolean;
  startTime?: string;
  endTime?: string;
  limit?: number;
}

interface MetricQueryParams {
  metricName?: string;
  startTime?: string;
  endTime?: string;
  tags?: string; // JSON string of tags
}

interface AlertQueryParams {
  resolved?: boolean;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  service?: string;
}

@Controller('intelligence/monitoring')
export class IntelligenceMonitoringController {
  private readonly logger = new Logger(IntelligenceMonitoringController.name);

  constructor(
    private readonly dashboardService: MonitoringDashboardService,
    private readonly telemetryService: TelemetryService
  ) {}

  // Dashboard endpoints
  @Get('dashboard')
  async getDashboard(): Promise<DashboardMetrics> {
    try {
      return await this.dashboardService.getDashboardMetrics();
    } catch (error) {
      this.logger.error('Failed to get dashboard metrics:', error);
      throw new HttpException('Failed to retrieve dashboard metrics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/service/:serviceName')
  async getServiceDashboard(@Param('serviceName') serviceName: string): Promise<ServiceDashboard> {
    try {
      return await this.dashboardService.getServiceDashboard(serviceName);
    } catch (error) {
      this.logger.error(`Failed to get service dashboard for ${serviceName}:`, error);
      throw new HttpException('Failed to retrieve service dashboard', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/alerts')
  async getAlertDashboard(): Promise<AlertDashboard> {
    try {
      return await this.dashboardService.getAlertDashboard();
    } catch (error) {
      this.logger.error('Failed to get alert dashboard:', error);
      throw new HttpException('Failed to retrieve alert dashboard', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('dashboard/performance')
  async getPerformanceDashboard(): Promise<PerformanceDashboard> {
    try {
      return await this.dashboardService.getPerformanceDashboard();
    } catch (error) {
      this.logger.error('Failed to get performance dashboard:', error);
      throw new HttpException('Failed to retrieve performance dashboard', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Health endpoints
  @Get('health')
  async getSystemHealth(): Promise<any> {
    try {
      return await this.dashboardService.getSystemHealth();
    } catch (error) {
      this.logger.error('Failed to get system health:', error);
      throw new HttpException('Failed to retrieve system health', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('health/telemetry')
  async getTelemetryHealth(): Promise<any> {
    try {
      return this.telemetryService.healthCheck();
    } catch (error) {
      this.logger.error('Failed to get telemetry health:', error);
      throw new HttpException('Failed to retrieve telemetry health', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Telemetry data endpoints
  @Get('events')
  async getEvents(@Query() query: EventQueryParams): Promise<TelemetryEvent[]> {
    try {
      const filters: any = {};
      
      if (query.service) filters.service = query.service;
      if (query.eventType) filters.eventType = query.eventType;
      if (query.success !== undefined) filters.success = query.success;
      if (query.startTime) filters.startTime = new Date(query.startTime);
      if (query.endTime) filters.endTime = new Date(query.endTime);

      const limit = query.limit ? Math.min(query.limit, 10000) : 1000;

      return this.telemetryService.getEvents(filters, limit);
    } catch (error) {
      this.logger.error('Failed to get events:', error);
      throw new HttpException('Failed to retrieve events', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('metrics')
  async getMetrics(@Query() query: MetricQueryParams): Promise<TelemetryMetric[]> {
    try {
      const startTime = query.startTime ? new Date(query.startTime) : undefined;
      const endTime = query.endTime ? new Date(query.endTime) : undefined;
      const tags = query.tags ? JSON.parse(query.tags) : undefined;

      return this.telemetryService.getMetrics(
        query.metricName,
        startTime,
        endTime,
        tags
      );
    } catch (error) {
      this.logger.error('Failed to get metrics:', error);
      throw new HttpException('Failed to retrieve metrics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('alerts')
  async getAlerts(@Query() query: AlertQueryParams): Promise<TelemetryAlert[]> {
    try {
      let alerts = this.telemetryService.getAlerts(query.resolved);

      // Apply additional filters
      if (query.severity) {
        alerts = alerts.filter(a => a.severity === query.severity);
      }
      
      if (query.service) {
        alerts = alerts.filter(a => a.service === query.service);
      }

      return alerts;
    } catch (error) {
      this.logger.error('Failed to get alerts:', error);
      throw new HttpException('Failed to retrieve alerts', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Service-specific endpoints
  @Get('services')
  async getServices(): Promise<Array<{ name: string; status: string; metrics: any }>> {
    try {
      const services = this.telemetryService.getServiceHealth();
      return services.map(service => ({
        name: service.service,
        status: service.status,
        metrics: {
          requestCount: service.requestCount,
          errorCount: service.errorCount,
          errorRate: service.errorRate,
          averageResponseTime: service.averageResponseTime,
          uptime: service.uptime,
          lastHealthCheck: service.lastHealthCheck
        }
      }));
    } catch (error) {
      this.logger.error('Failed to get services:', error);
      throw new HttpException('Failed to retrieve services', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('services/:serviceName/statistics')
  async getServiceStatistics(
    @Param('serviceName') serviceName: string,
    @Query('timeWindow') timeWindow?: number
  ): Promise<any> {
    try {
      const window = timeWindow ? Math.min(timeWindow, 24 * 60 * 60 * 1000) : 60 * 60 * 1000; // Max 24 hours
      return this.telemetryService.getServiceStatistics(serviceName, window);
    } catch (error) {
      this.logger.error(`Failed to get statistics for service ${serviceName}:`, error);
      throw new HttpException('Failed to retrieve service statistics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Metric aggregation endpoints
  @Get('metrics/:metricName/aggregation')
  async getMetricAggregation(
    @Param('metricName') metricName: string,
    @Query('aggregation') aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' = 'avg',
    @Query('timeWindow') timeWindow?: number
  ): Promise<{ metric: string; aggregation: string; value: number; timeWindow: number }> {
    try {
      const window = timeWindow ? Math.min(timeWindow, 24 * 60 * 60 * 1000) : 60 * 60 * 1000;
      const value = this.telemetryService.getMetricAggregation(metricName, aggregation, window);
      
      return {
        metric: metricName,
        aggregation,
        value,
        timeWindow: window
      };
    } catch (error) {
      this.logger.error(`Failed to get metric aggregation for ${metricName}:`, error);
      throw new HttpException('Failed to retrieve metric aggregation', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Alert management endpoints
  @Post('alerts/:alertId/resolve')
  async resolveAlert(@Param('alertId') alertId: string): Promise<{ message: string; resolved: boolean }> {
    try {
      const resolved = this.telemetryService.resolveAlert(alertId);
      
      if (resolved) {
        return { message: `Alert ${alertId} resolved successfully`, resolved: true };
      } else {
        throw new HttpException('Alert not found or already resolved', HttpStatus.NOT_FOUND);
      }
    } catch (error) {
      this.logger.error(`Failed to resolve alert ${alertId}:`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to resolve alert', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('alerts/create')
  async createAlert(@Body() alertData: {
    severity: 'info' | 'warning' | 'error' | 'critical';
    title: string;
    description: string;
    service: string;
    metric?: string;
    threshold?: number;
    actualValue?: number;
  }): Promise<{ alertId: string; message: string }> {
    try {
      const alertId = this.telemetryService.createAlert(alertData);
      return {
        alertId,
        message: 'Alert created successfully'
      };
    } catch (error) {
      this.logger.error('Failed to create alert:', error);
      throw new HttpException('Failed to create alert', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Intelligence-specific monitoring endpoints
  @Get('intelligence/demographics/metrics')
  async getDemographicMetrics(@Query('timeWindow') timeWindow?: number): Promise<any> {
    try {
      const window = timeWindow ? Math.min(timeWindow, 24 * 60 * 60 * 1000) : 60 * 60 * 1000;
      const cutoffTime = new Date(Date.now() - window);
      
      const events = this.telemetryService.getEvents({
        eventType: 'demographic_analysis',
        startTime: cutoffTime
      });

      const totalAnalyses = events.length;
      const successfulAnalyses = events.filter(e => e.success).length;
      const averageConfidence = events
        .filter(e => e.metadata?.confidence !== undefined)
        .reduce((sum, e, _, arr) => sum + (e.metadata?.confidence || 0) / arr.length, 0);

      const averageDuration = events
        .filter(e => e.duration !== undefined)
        .reduce((sum, e, _, arr) => sum + e.duration! / arr.length, 0);

      return {
        totalAnalyses,
        successfulAnalyses,
        successRate: totalAnalyses > 0 ? successfulAnalyses / totalAnalyses : 0,
        averageConfidence,
        averageDuration,
        timeWindow: window
      };
    } catch (error) {
      this.logger.error('Failed to get demographic metrics:', error);
      throw new HttpException('Failed to retrieve demographic metrics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('intelligence/viability/metrics')
  async getViabilityMetrics(@Query('timeWindow') timeWindow?: number): Promise<any> {
    try {
      const window = timeWindow ? Math.min(timeWindow, 24 * 60 * 60 * 1000) : 60 * 60 * 1000;
      const cutoffTime = new Date(Date.now() - window);
      
      const events = this.telemetryService.getEvents({
        eventType: 'viability_assessment',
        startTime: cutoffTime
      });

      const totalAssessments = events.length;
      const successfulAssessments = events.filter(e => e.success).length;
      const averageScore = events
        .filter(e => e.metadata?.overallScore !== undefined)
        .reduce((sum, e, _, arr) => sum + (e.metadata?.overallScore || 0) / arr.length, 0);

      const averageDuration = events
        .filter(e => e.duration !== undefined)
        .reduce((sum, e, _, arr) => sum + e.duration! / arr.length, 0);

      return {
        totalAssessments,
        successfulAssessments,
        successRate: totalAssessments > 0 ? successfulAssessments / totalAssessments : 0,
        averageScore,
        averageDuration,
        timeWindow: window
      };
    } catch (error) {
      this.logger.error('Failed to get viability metrics:', error);
      throw new HttpException('Failed to retrieve viability metrics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('intelligence/competitive/metrics')
  async getCompetitiveMetrics(@Query('timeWindow') timeWindow?: number): Promise<any> {
    try {
      const window = timeWindow ? Math.min(timeWindow, 24 * 60 * 60 * 1000) : 60 * 60 * 1000;
      const cutoffTime = new Date(Date.now() - window);
      
      const events = this.telemetryService.getEvents({
        eventType: 'competitive_analysis',
        startTime: cutoffTime
      });

      const totalAnalyses = events.length;
      const successfulAnalyses = events.filter(e => e.success).length;
      const averageCompetitorCount = events
        .filter(e => e.metadata?.competitorCount !== undefined)
        .reduce((sum, e, _, arr) => sum + (e.metadata?.competitorCount || 0) / arr.length, 0);

      const averageMarketSaturation = events
        .filter(e => e.metadata?.marketSaturation !== undefined)
        .reduce((sum, e, _, arr) => sum + (e.metadata?.marketSaturation || 0) / arr.length, 0);

      const averageDuration = events
        .filter(e => e.duration !== undefined)
        .reduce((sum, e, _, arr) => sum + e.duration! / arr.length, 0);

      return {
        totalAnalyses,
        successfulAnalyses,
        successRate: totalAnalyses > 0 ? successfulAnalyses / totalAnalyses : 0,
        averageCompetitorCount,
        averageMarketSaturation,
        averageDuration,
        timeWindow: window
      };
    } catch (error) {
      this.logger.error('Failed to get competitive metrics:', error);
      throw new HttpException('Failed to retrieve competitive metrics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('intelligence/rationale/metrics')
  async getRationaleMetrics(@Query('timeWindow') timeWindow?: number): Promise<any> {
    try {
      const window = timeWindow ? Math.min(timeWindow, 24 * 60 * 60 * 1000) : 60 * 60 * 1000;
      const cutoffTime = new Date(Date.now() - window);
      
      const events = this.telemetryService.getEvents({
        eventType: 'strategic_rationale',
        startTime: cutoffTime
      });

      const totalGenerations = events.length;
      const successfulGenerations = events.filter(e => e.success).length;
      const averageLength = events
        .filter(e => e.metadata?.rationaleLength !== undefined)
        .reduce((sum, e, _, arr) => sum + (e.metadata?.rationaleLength || 0) / arr.length, 0);

      const averageDuration = events
        .filter(e => e.duration !== undefined)
        .reduce((sum, e, _, arr) => sum + e.duration! / arr.length, 0);

      // Group by AI model
      const modelUsage = new Map<string, number>();
      events.forEach(e => {
        const model = e.metadata?.aiModel || 'unknown';
        modelUsage.set(model, (modelUsage.get(model) || 0) + 1);
      });

      return {
        totalGenerations,
        successfulGenerations,
        successRate: totalGenerations > 0 ? successfulGenerations / totalGenerations : 0,
        averageLength,
        averageDuration,
        modelUsage: Object.fromEntries(modelUsage),
        timeWindow: window
      };
    } catch (error) {
      this.logger.error('Failed to get rationale metrics:', error);
      throw new HttpException('Failed to retrieve rationale metrics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('intelligence/pattern/metrics')
  async getPatternMetrics(@Query('timeWindow') timeWindow?: number): Promise<any> {
    try {
      const window = timeWindow ? Math.min(timeWindow, 24 * 60 * 60 * 1000) : 60 * 60 * 1000;
      const cutoffTime = new Date(Date.now() - window);
      
      const events = this.telemetryService.getEvents({
        eventType: 'pattern_detection',
        startTime: cutoffTime
      });

      const totalDetections = events.length;
      const successfulDetections = events.filter(e => e.success).length;
      const averagePatternsFound = events
        .filter(e => e.metadata?.patternsDetected !== undefined)
        .reduce((sum, e, _, arr) => sum + (e.metadata?.patternsDetected || 0) / arr.length, 0);

      const averagePatternScore = events
        .filter(e => e.metadata?.patternScore !== undefined)
        .reduce((sum, e, _, arr) => sum + (e.metadata?.patternScore || 0) / arr.length, 0);

      const averageDuration = events
        .filter(e => e.duration !== undefined)
        .reduce((sum, e, _, arr) => sum + e.duration! / arr.length, 0);

      return {
        totalDetections,
        successfulDetections,
        successRate: totalDetections > 0 ? successfulDetections / totalDetections : 0,
        averagePatternsFound,
        averagePatternScore,
        averageDuration,
        timeWindow: window
      };
    } catch (error) {
      this.logger.error('Failed to get pattern metrics:', error);
      throw new HttpException('Failed to retrieve pattern metrics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Cache management endpoints
  @Post('cache/clear')
  async clearDashboardCache(): Promise<{ message: string }> {
    try {
      this.dashboardService.clearCache();
      return { message: 'Dashboard cache cleared successfully' };
    } catch (error) {
      this.logger.error('Failed to clear dashboard cache:', error);
      throw new HttpException('Failed to clear cache', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Export endpoints
  @Get('export/events')
  async exportEvents(@Query() query: EventQueryParams): Promise<{ events: TelemetryEvent[]; exportedAt: Date }> {
    try {
      const filters: any = {};
      
      if (query.service) filters.service = query.service;
      if (query.eventType) filters.eventType = query.eventType;
      if (query.success !== undefined) filters.success = query.success;
      if (query.startTime) filters.startTime = new Date(query.startTime);
      if (query.endTime) filters.endTime = new Date(query.endTime);

      const limit = query.limit ? Math.min(query.limit, 50000) : 10000; // Higher limit for export

      const events = this.telemetryService.getEvents(filters, limit);

      return {
        events,
        exportedAt: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to export events:', error);
      throw new HttpException('Failed to export events', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('export/metrics')
  async exportMetrics(@Query() query: MetricQueryParams): Promise<{ metrics: TelemetryMetric[]; exportedAt: Date }> {
    try {
      const startTime = query.startTime ? new Date(query.startTime) : undefined;
      const endTime = query.endTime ? new Date(query.endTime) : undefined;
      const tags = query.tags ? JSON.parse(query.tags) : undefined;

      const metrics = this.telemetryService.getMetrics(
        query.metricName,
        startTime,
        endTime,
        tags
      );

      return {
        metrics,
        exportedAt: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to export metrics:', error);
      throw new HttpException('Failed to export metrics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}