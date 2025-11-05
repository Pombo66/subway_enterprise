/**
 * Comprehensive data flow logging system
 * Tracks data movement from API to map rendering
 */

export interface APICallLog {
  timestamp: string;
  endpoint: string;
  success: boolean;
  dataLength: number;
  error: string | null;
  duration?: number;
  responseSize?: number;
}

export interface ProcessingLog {
  timestamp: string;
  stage: string;
  inputCount: number;
  outputCount: number;
  errors: number;
  warnings: number;
  duration?: number;
  details?: Record<string, any>;
}

export interface RenderingLog {
  timestamp: string;
  stage: string;
  markersCreated: number;
  markersAdded: number;
  errors: number;
  duration?: number;
  details?: Record<string, any>;
}

export interface MapStateLog {
  timestamp: string;
  center: { lat: number; lng: number };
  zoom: number;
  loaded: boolean;
  style: string;
  markerCount: number;
}

export interface DataFlowSession {
  sessionId: string;
  startTime: string;
  apiCalls: APICallLog[];
  processing: ProcessingLog[];
  rendering: RenderingLog[];
  mapStates: MapStateLog[];
  errors: Array<{ timestamp: string; error: string; context: string }>;
}

export class DataFlowLogger {
  private session: DataFlowSession;
  private debugMode: boolean;
  private startTimes: Map<string, number> = new Map();

  constructor(debugMode: boolean = process.env.NODE_ENV === 'development') {
    this.debugMode = debugMode;
    this.session = this.createNewSession();
  }

  private createNewSession(): DataFlowSession {
    return {
      sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date().toISOString(),
      apiCalls: [],
      processing: [],
      rendering: [],
      mapStates: [],
      errors: []
    };
  }

  /**
   * Start timing an operation
   */
  startTiming(operationId: string): void {
    this.startTimes.set(operationId, performance.now());
  }

  /**
   * End timing an operation and return duration
   */
  endTiming(operationId: string): number {
    const startTime = this.startTimes.get(operationId);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.startTimes.delete(operationId);
      return Math.round(duration * 100) / 100; // Round to 2 decimal places
    }
    return 0;
  }

  /**
   * Log API call with response details
   */
  logAPICall(endpoint: string, response: any, error?: Error): void {
    const log: APICallLog = {
      timestamp: new Date().toISOString(),
      endpoint,
      success: !error && (response?.success !== false),
      dataLength: this.getDataLength(response),
      error: error?.message || (response?.error) || null,
      duration: this.endTiming(`api-${endpoint}`),
      responseSize: this.estimateResponseSize(response)
    };

    this.session.apiCalls.push(log);

    if (this.debugMode) {
      const logLevel = log.success ? 'log' : 'error';
      console[logLevel]('📡 API Call:', {
        endpoint: log.endpoint,
        success: log.success,
        dataLength: log.dataLength,
        duration: log.duration ? `${log.duration}ms` : 'unknown',
        responseSize: log.responseSize ? `${log.responseSize} bytes` : 'unknown',
        error: log.error
      });

      // Log sample data for successful calls
      if (log.success && log.dataLength > 0 && response?.data) {
        const sampleData = Array.isArray(response.data) 
          ? response.data.slice(0, 2)
          : response.data;
        console.log('📄 Sample API Data:', sampleData);
      }
    }
  }

  /**
   * Log data processing stage
   */
  logProcessing(stage: string, input: any, output: any, errors: number = 0, warnings: number = 0, details?: Record<string, any>): void {
    const log: ProcessingLog = {
      timestamp: new Date().toISOString(),
      stage,
      inputCount: this.getDataLength(input),
      outputCount: this.getDataLength(output),
      errors,
      warnings,
      duration: this.endTiming(`processing-${stage}`),
      details
    };

    this.session.processing.push(log);

    if (this.debugMode) {
      const logLevel = errors > 0 ? 'warn' : 'log';
      console[logLevel](`🔄 Data Processing [${stage}]:`, {
        input: log.inputCount,
        output: log.outputCount,
        errors: log.errors,
        warnings: log.warnings,
        duration: log.duration ? `${log.duration}ms` : 'unknown',
        efficiency: log.inputCount > 0 ? `${Math.round(log.outputCount / log.inputCount * 100)}%` : 'N/A'
      });

      if (details) {
        console.log(`📋 Processing Details [${stage}]:`, details);
      }

      // Log sample output for successful processing
      if (log.outputCount > 0 && Array.isArray(output)) {
        console.log(`📤 Sample Output [${stage}]:`, output.slice(0, 2));
      }
    }
  }

  /**
   * Log marker rendering operations
   */
  logRendering(stage: string, markersCreated: number, markersAdded: number, errors: number = 0, details?: Record<string, any>): void {
    const log: RenderingLog = {
      timestamp: new Date().toISOString(),
      stage,
      markersCreated,
      markersAdded,
      errors,
      duration: this.endTiming(`rendering-${stage}`),
      details
    };

    this.session.rendering.push(log);

    if (this.debugMode) {
      const logLevel = errors > 0 ? 'warn' : 'log';
      console[logLevel](`🎯 Marker Rendering [${stage}]:`, {
        created: log.markersCreated,
        added: log.markersAdded,
        errors: log.errors,
        duration: log.duration ? `${log.duration}ms` : 'unknown',
        successRate: log.markersCreated > 0 ? `${Math.round(log.markersAdded / log.markersCreated * 100)}%` : 'N/A'
      });

      if (details) {
        console.log(`🎨 Rendering Details [${stage}]:`, details);
      }
    }
  }

  /**
   * Log map state changes
   */
  logMapState(map: any, markerCount: number): void {
    if (!map) return;

    try {
      const center = map.getCenter ? map.getCenter() : { lat: 0, lng: 0 };
      const zoom = map.getZoom ? map.getZoom() : 0;
      const loaded = map.loaded ? map.loaded() : false;
      const style = map.getStyle ? (map.getStyle()?.name || 'unknown') : 'unknown';

      const log: MapStateLog = {
        timestamp: new Date().toISOString(),
        center: { lat: center.lat || 0, lng: center.lng || 0 },
        zoom: zoom || 0,
        loaded,
        style,
        markerCount
      };

      this.session.mapStates.push(log);

      if (this.debugMode) {
        console.log('🗺️ Map State Update:', {
          center: `${log.center.lat.toFixed(4)}, ${log.center.lng.toFixed(4)}`,
          zoom: log.zoom.toFixed(2),
          loaded: log.loaded,
          markers: log.markerCount,
          style: log.style
        });
      }
    } catch (error) {
      this.logError('Failed to log map state', 'map-state', error);
    }
  }

  /**
   * Log errors with context
   */
  logError(message: string, context: string, error?: any): void {
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error || message),
      context
    };

    this.session.errors.push(errorLog);

    if (this.debugMode) {
      console.error(`❌ Error [${context}]:`, {
        message,
        error: errorLog.error,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  /**
   * Generate comprehensive debug report
   */
  generateDebugReport(): {
    session: DataFlowSession;
    summary: Record<string, any>;
    issues: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }>;
    recommendations: string[];
  } {
    const summary = this.generateSummary();
    const issues = this.analyzeIssues();
    const recommendations = this.generateRecommendations(issues);

    return {
      session: this.session,
      summary,
      issues,
      recommendations
    };
  }

  /**
   * Generate session summary statistics
   */
  private generateSummary(): Record<string, any> {
    const latestAPICall = this.session.apiCalls[this.session.apiCalls.length - 1];
    const latestProcessing = this.session.processing[this.session.processing.length - 1];
    const latestRendering = this.session.rendering[this.session.rendering.length - 1];
    const latestMapState = this.session.mapStates[this.session.mapStates.length - 1];

    return {
      sessionDuration: Date.now() - new Date(this.session.startTime).getTime(),
      totalAPICalls: this.session.apiCalls.length,
      successfulAPICalls: this.session.apiCalls.filter(call => call.success).length,
      totalProcessingStages: this.session.processing.length,
      totalRenderingOperations: this.session.rendering.length,
      totalErrors: this.session.errors.length,
      currentMarkerCount: latestMapState?.markerCount || 0,
      lastAPISuccess: latestAPICall?.success || false,
      lastAPIDataLength: latestAPICall?.dataLength || 0,
      lastProcessingOutput: latestProcessing?.outputCount || 0,
      lastRenderingSuccess: latestRendering ? (latestRendering.errors === 0) : false,
      mapLoaded: latestMapState?.loaded || false
    };
  }

  /**
   * Analyze session for issues
   */
  private analyzeIssues(): Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> {
    const issues: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> = [];

    // Check API issues
    const failedAPICalls = this.session.apiCalls.filter(call => !call.success);
    if (failedAPICalls.length > 0) {
      issues.push({
        type: 'api_failure',
        message: `${failedAPICalls.length} API calls failed`,
        severity: 'high'
      });
    }

    // Check processing issues
    const processingErrors = this.session.processing.reduce((sum, p) => sum + p.errors, 0);
    if (processingErrors > 0) {
      issues.push({
        type: 'processing_errors',
        message: `${processingErrors} data processing errors occurred`,
        severity: 'medium'
      });
    }

    // Check rendering issues
    const renderingErrors = this.session.rendering.reduce((sum, r) => sum + r.errors, 0);
    if (renderingErrors > 0) {
      issues.push({
        type: 'rendering_errors',
        message: `${renderingErrors} marker rendering errors occurred`,
        severity: 'medium'
      });
    }

    // Check for no markers displayed
    const latestMapState = this.session.mapStates[this.session.mapStates.length - 1];
    if (latestMapState && latestMapState.markerCount === 0) {
      issues.push({
        type: 'no_markers',
        message: 'No markers are currently displayed on the map',
        severity: 'high'
      });
    }

    // Check for general errors
    if (this.session.errors.length > 0) {
      issues.push({
        type: 'general_errors',
        message: `${this.session.errors.length} general errors occurred`,
        severity: 'medium'
      });
    }

    return issues;
  }

  /**
   * Generate recommendations based on issues
   */
  private generateRecommendations(issues: Array<{ type: string; message: string; severity: string }>): string[] {
    const recommendations: string[] = [];

    issues.forEach(issue => {
      switch (issue.type) {
        case 'api_failure':
          recommendations.push('Check BFF API connectivity and server status');
          recommendations.push('Verify API endpoint URLs and authentication');
          break;
        case 'processing_errors':
          recommendations.push('Review store data format and validation rules');
          recommendations.push('Check for missing or invalid coordinate data');
          break;
        case 'rendering_errors':
          recommendations.push('Check browser console for detailed marker creation errors');
          recommendations.push('Verify MapLibre GL JS library is loaded correctly');
          break;
        case 'no_markers':
          recommendations.push('Verify store data contains valid coordinates');
          recommendations.push('Check if markers are being created but not added to map');
          recommendations.push('Review viewport culling and filtering logic');
          break;
        case 'general_errors':
          recommendations.push('Review error logs for specific failure points');
          recommendations.push('Check for JavaScript runtime errors in browser console');
          break;
      }
    });

    // Remove duplicates
    return Array.from(new Set(recommendations));
  }

  /**
   * Helper to get data length from various data types
   */
  private getDataLength(data: any): number {
    if (Array.isArray(data)) {
      return data.length;
    }
    if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) {
      return data.data.length;
    }
    if (data && typeof data === 'object' && data.valid && Array.isArray(data.valid)) {
      return data.valid.length;
    }
    return data ? 1 : 0;
  }

  /**
   * Estimate response size in bytes
   */
  private estimateResponseSize(response: any): number {
    try {
      return new Blob([JSON.stringify(response)]).size;
    } catch {
      return 0;
    }
  }

  /**
   * Reset session for new data flow
   */
  resetSession(): void {
    this.session = this.createNewSession();
    this.startTimes.clear();
    
    if (this.debugMode) {
      console.log('🔄 Data flow session reset:', this.session.sessionId);
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.session.sessionId;
  }

  /**
   * Export session data for external analysis
   */
  exportSession(): DataFlowSession {
    return { ...this.session };
  }
}

// Export singleton instance
export const dataFlowLogger = new DataFlowLogger();