/**
 * Debug monitoring system for living map data flow
 * Provides comprehensive monitoring and troubleshooting capabilities
 */

import { dataFlowLogger, DataFlowSession } from './dataFlowLogger';
import { storeValidator, StoreValidationResults } from './storeDataValidator';
import { StoreWithActivity } from '../types';

export interface DebugMetrics {
  dataFlow: {
    apiCallsTotal: number;
    apiCallsSuccessful: number;
    apiCallsFailure: number;
    lastAPICallSuccess: boolean;
    lastAPIDataLength: number;
  };
  validation: {
    totalStores: number;
    validStores: number;
    invalidStores: number;
    successRate: number;
    coordinateIssues: number;
    dataIssues: number;
  };
  rendering: {
    markersCreated: number;
    markersAdded: number;
    renderingErrors: number;
    renderingSuccessRate: number;
  };
  mapState: {
    loaded: boolean;
    markerCount: number;
    center: { lat: number; lng: number };
    zoom: number;
  };
  performance: {
    sessionDuration: number;
    averageAPICallTime: number;
    averageProcessingTime: number;
    averageRenderingTime: number;
  };
  issues: Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: string;
  }>;
}

export interface DebugSnapshot {
  timestamp: string;
  sessionId: string;
  metrics: DebugMetrics;
  rawSession: DataFlowSession;
  recommendations: string[];
}

export class DebugMonitor {
  private debugMode: boolean;
  private snapshots: DebugSnapshot[] = [];
  private maxSnapshots: number = 10;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastValidationResults: StoreValidationResults | null = null;

  constructor(debugMode: boolean = process.env.NODE_ENV === 'development') {
    this.debugMode = debugMode;
    
    if (this.debugMode) {
      this.startMonitoring();
    }
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.captureSnapshot();
    }, intervalMs);

    if (this.debugMode) {
      console.log('🔍 Debug monitoring started with', intervalMs, 'ms interval');
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.debugMode) {
      console.log('🛑 Debug monitoring stopped');
    }
  }

  /**
   * Capture current state snapshot
   */
  captureSnapshot(): DebugSnapshot {
    const session = dataFlowLogger.exportSession();
    const metrics = this.calculateMetrics(session);
    const recommendations = this.generateRecommendations(metrics);

    const snapshot: DebugSnapshot = {
      timestamp: new Date().toISOString(),
      sessionId: session.sessionId,
      metrics,
      rawSession: session,
      recommendations
    };

    this.snapshots.push(snapshot);

    // Keep only the most recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    if (this.debugMode) {
      this.logSnapshot(snapshot);
    }

    return snapshot;
  }

  /**
   * Update validation results for monitoring
   */
  updateValidationResults(results: StoreValidationResults): void {
    this.lastValidationResults = results;
    
    if (this.debugMode) {
      console.log('📊 Validation results updated:', {
        valid: results.summary.validStores,
        invalid: results.summary.invalidStores,
        successRate: `${results.summary.totalStores > 0 ? Math.round(results.summary.validStores / results.summary.totalStores * 100) : 0}%`
      });
    }
  }

  /**
   * Calculate comprehensive metrics from session data
   */
  private calculateMetrics(session: DataFlowSession): DebugMetrics {
    // Data flow metrics
    const apiCallsTotal = session.apiCalls.length;
    const apiCallsSuccessful = session.apiCalls.filter(call => call.success).length;
    const apiCallsFailure = apiCallsTotal - apiCallsSuccessful;
    const lastAPICall = session.apiCalls[session.apiCalls.length - 1];

    // Validation metrics
    const validationMetrics = this.lastValidationResults ? {
      totalStores: this.lastValidationResults.summary.totalStores,
      validStores: this.lastValidationResults.summary.validStores,
      invalidStores: this.lastValidationResults.summary.invalidStores,
      successRate: this.lastValidationResults.summary.totalStores > 0 
        ? Math.round(this.lastValidationResults.summary.validStores / this.lastValidationResults.summary.totalStores * 100)
        : 0,
      coordinateIssues: this.lastValidationResults.summary.coordinateIssues,
      dataIssues: this.lastValidationResults.summary.dataIssues
    } : {
      totalStores: 0,
      validStores: 0,
      invalidStores: 0,
      successRate: 0,
      coordinateIssues: 0,
      dataIssues: 0
    };

    // Rendering metrics
    const totalMarkersCreated = session.rendering.reduce((sum, r) => sum + r.markersCreated, 0);
    const totalMarkersAdded = session.rendering.reduce((sum, r) => sum + r.markersAdded, 0);
    const totalRenderingErrors = session.rendering.reduce((sum, r) => sum + r.errors, 0);

    // Map state metrics
    const latestMapState = session.mapStates[session.mapStates.length - 1];
    const mapStateMetrics = latestMapState ? {
      loaded: latestMapState.loaded,
      markerCount: latestMapState.markerCount,
      center: latestMapState.center,
      zoom: latestMapState.zoom
    } : {
      loaded: false,
      markerCount: 0,
      center: { lat: 0, lng: 0 },
      zoom: 0
    };

    // Performance metrics
    const sessionDuration = Date.now() - new Date(session.startTime).getTime();
    const apiCallsWithDuration = session.apiCalls.filter(call => call.duration);
    const processingWithDuration = session.processing.filter(p => p.duration);
    const renderingWithDuration = session.rendering.filter(r => r.duration);

    const performanceMetrics = {
      sessionDuration,
      averageAPICallTime: apiCallsWithDuration.length > 0 
        ? Math.round(apiCallsWithDuration.reduce((sum, call) => sum + (call.duration || 0), 0) / apiCallsWithDuration.length * 100) / 100
        : 0,
      averageProcessingTime: processingWithDuration.length > 0
        ? Math.round(processingWithDuration.reduce((sum, p) => sum + (p.duration || 0), 0) / processingWithDuration.length * 100) / 100
        : 0,
      averageRenderingTime: renderingWithDuration.length > 0
        ? Math.round(renderingWithDuration.reduce((sum, r) => sum + (r.duration || 0), 0) / renderingWithDuration.length * 100) / 100
        : 0
    };

    // Issues analysis
    const issues = this.analyzeIssues(session, validationMetrics);

    return {
      dataFlow: {
        apiCallsTotal,
        apiCallsSuccessful,
        apiCallsFailure,
        lastAPICallSuccess: lastAPICall?.success || false,
        lastAPIDataLength: lastAPICall?.dataLength || 0
      },
      validation: validationMetrics,
      rendering: {
        markersCreated: totalMarkersCreated,
        markersAdded: totalMarkersAdded,
        renderingErrors: totalRenderingErrors,
        renderingSuccessRate: totalMarkersCreated > 0 
          ? Math.round(totalMarkersAdded / totalMarkersCreated * 100)
          : 0
      },
      mapState: mapStateMetrics,
      performance: performanceMetrics,
      issues
    };
  }

  /**
   * Analyze current state for issues
   */
  private analyzeIssues(session: DataFlowSession, validationMetrics: any): Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: string;
  }> {
    const issues: Array<{
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high';
      timestamp: string;
    }> = [];

    const now = new Date().toISOString();

    // API issues
    if (session.apiCalls.length === 0) {
      issues.push({
        type: 'no_api_calls',
        message: 'No API calls have been made yet',
        severity: 'medium',
        timestamp: now
      });
    } else {
      const failedCalls = session.apiCalls.filter(call => !call.success);
      if (failedCalls.length > 0) {
        issues.push({
          type: 'api_failures',
          message: `${failedCalls.length} API calls failed`,
          severity: 'high',
          timestamp: now
        });
      }
    }

    // Validation issues
    if (validationMetrics.totalStores > 0 && validationMetrics.validStores === 0) {
      issues.push({
        type: 'no_valid_stores',
        message: 'No stores passed validation',
        severity: 'high',
        timestamp: now
      });
    } else if (validationMetrics.successRate < 50) {
      issues.push({
        type: 'low_validation_success',
        message: `Only ${validationMetrics.successRate}% of stores are valid`,
        severity: 'medium',
        timestamp: now
      });
    }

    if (validationMetrics.coordinateIssues > 0) {
      issues.push({
        type: 'coordinate_issues',
        message: `${validationMetrics.coordinateIssues} stores have coordinate problems`,
        severity: 'medium',
        timestamp: now
      });
    }

    // Rendering issues
    const latestMapState = session.mapStates[session.mapStates.length - 1];
    if (latestMapState && latestMapState.markerCount === 0 && validationMetrics.validStores > 0) {
      issues.push({
        type: 'no_markers_rendered',
        message: 'Valid stores exist but no markers are displayed',
        severity: 'high',
        timestamp: now
      });
    }

    const renderingErrors = session.rendering.reduce((sum, r) => sum + r.errors, 0);
    if (renderingErrors > 0) {
      issues.push({
        type: 'rendering_errors',
        message: `${renderingErrors} marker rendering errors occurred`,
        severity: 'medium',
        timestamp: now
      });
    }

    // Map state issues
    if (latestMapState && !latestMapState.loaded) {
      issues.push({
        type: 'map_not_loaded',
        message: 'Map has not finished loading',
        severity: 'medium',
        timestamp: now
      });
    }

    // General errors
    if (session.errors.length > 0) {
      issues.push({
        type: 'general_errors',
        message: `${session.errors.length} general errors occurred`,
        severity: 'medium',
        timestamp: now
      });
    }

    return issues;
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(metrics: DebugMetrics): string[] {
    const recommendations: string[] = [];

    // API recommendations
    if (metrics.dataFlow.apiCallsFailure > 0) {
      recommendations.push('Check BFF API server status and connectivity');
      recommendations.push('Verify API endpoint URLs and authentication');
    }

    if (metrics.dataFlow.lastAPIDataLength === 0 && metrics.dataFlow.lastAPICallSuccess) {
      recommendations.push('API is returning empty data - check database seeding');
    }

    // Validation recommendations
    if (metrics.validation.successRate < 100 && metrics.validation.totalStores > 0) {
      recommendations.push('Review store data format and fix validation issues');
    }

    if (metrics.validation.coordinateIssues > 0) {
      recommendations.push('Check coordinate data quality in database');
      recommendations.push('Consider implementing coordinate fallback generation');
    }

    // Rendering recommendations
    if (metrics.rendering.renderingSuccessRate < 100 && metrics.rendering.markersCreated > 0) {
      recommendations.push('Check browser console for marker rendering errors');
      recommendations.push('Verify MapLibre GL JS library compatibility');
    }

    if (metrics.validation.validStores > 0 && metrics.mapState.markerCount === 0) {
      recommendations.push('Check if markers are being created but not added to map');
      recommendations.push('Review viewport culling and filtering logic');
      recommendations.push('Verify map initialization and marker addition process');
    }

    // Performance recommendations
    if (metrics.performance.averageAPICallTime > 2000) {
      recommendations.push('API calls are slow - consider optimizing queries or caching');
    }

    if (metrics.performance.averageRenderingTime > 1000) {
      recommendations.push('Marker rendering is slow - consider optimizing marker creation');
    }

    // Map state recommendations
    if (!metrics.mapState.loaded) {
      recommendations.push('Map is not loaded - check map initialization and style loading');
    }

    return Array.from(new Set(recommendations));
  }

  /**
   * Log snapshot to console in debug mode
   */
  private logSnapshot(snapshot: DebugSnapshot): void {
    if (!this.debugMode) return;

    console.group('🔍 Debug Monitor Snapshot');
    
    console.log('📊 Metrics Summary:', {
      session: snapshot.sessionId,
      apiCalls: `${snapshot.metrics.dataFlow.apiCallsSuccessful}/${snapshot.metrics.dataFlow.apiCallsTotal} successful`,
      validation: `${snapshot.metrics.validation.validStores}/${snapshot.metrics.validation.totalStores} valid (${snapshot.metrics.validation.successRate}%)`,
      rendering: `${snapshot.metrics.rendering.markersAdded}/${snapshot.metrics.rendering.markersCreated} rendered (${snapshot.metrics.rendering.renderingSuccessRate}%)`,
      mapMarkers: snapshot.metrics.mapState.markerCount,
      mapLoaded: snapshot.metrics.mapState.loaded
    });

    if (snapshot.metrics.issues.length > 0) {
      console.warn('⚠️ Issues Found:', snapshot.metrics.issues.map(issue => ({
        type: issue.type,
        severity: issue.severity,
        message: issue.message
      })));
    }

    if (snapshot.recommendations.length > 0) {
      console.log('💡 Recommendations:', snapshot.recommendations);
    }

    console.groupEnd();
  }

  /**
   * Get latest snapshot
   */
  getLatestSnapshot(): DebugSnapshot | null {
    return this.snapshots[this.snapshots.length - 1] || null;
  }

  /**
   * Get all snapshots
   */
  getAllSnapshots(): DebugSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get current health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    issues: number;
    recommendations: number;
  } {
    const latest = this.getLatestSnapshot();
    if (!latest) {
      return { status: 'warning', score: 0, issues: 0, recommendations: 0 };
    }

    const metrics = latest.metrics;
    let score = 100;

    // Deduct points for issues
    const criticalIssues = metrics.issues.filter(i => i.severity === 'high').length;
    const mediumIssues = metrics.issues.filter(i => i.severity === 'medium').length;
    const lowIssues = metrics.issues.filter(i => i.severity === 'low').length;

    score -= criticalIssues * 30;
    score -= mediumIssues * 15;
    score -= lowIssues * 5;

    // Deduct points for poor performance
    if (metrics.validation.successRate < 50) score -= 20;
    if (metrics.rendering.renderingSuccessRate < 50) score -= 20;
    if (metrics.dataFlow.apiCallsFailure > metrics.dataFlow.apiCallsSuccessful) score -= 25;

    score = Math.max(0, score);

    let status: 'healthy' | 'warning' | 'critical';
    if (score >= 80) status = 'healthy';
    else if (score >= 50) status = 'warning';
    else status = 'critical';

    return {
      status,
      score,
      issues: metrics.issues.length,
      recommendations: latest.recommendations.length
    };
  }

  /**
   * Export debug data for external analysis
   */
  exportDebugData(): {
    snapshots: DebugSnapshot[];
    healthStatus: ReturnType<DebugMonitor['getHealthStatus']>;
    summary: Record<string, any>;
  } {
    return {
      snapshots: this.getAllSnapshots(),
      healthStatus: this.getHealthStatus(),
      summary: {
        totalSnapshots: this.snapshots.length,
        monitoringActive: this.monitoringInterval !== null,
        debugMode: this.debugMode
      }
    };
  }

  /**
   * Clear all monitoring data
   */
  clearData(): void {
    this.snapshots = [];
    this.lastValidationResults = null;
    dataFlowLogger.resetSession();
    
    if (this.debugMode) {
      console.log('🧹 Debug monitoring data cleared');
    }
  }
}

// Export singleton instance
export const debugMonitor = new DebugMonitor();