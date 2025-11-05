// Performance monitoring and metrics collection for upload feature

export interface UploadMetrics {
  uploadId: string;
  fileName: string;
  fileSize: number;
  totalRows: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  phases: {
    parse?: PhaseMetrics;
    validate?: PhaseMetrics;
    geocode?: PhaseMetrics;
    upsert?: PhaseMetrics;
  };
  geocodingStats?: GeocodingStats;
  databaseStats?: DatabaseStats;
  memoryUsage?: MemoryUsage;
  errors?: ErrorMetrics[];
}

export interface PhaseMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  itemsProcessed: number;
  itemsPerSecond: number;
  memoryBefore?: number;
  memoryAfter?: number;
}

export interface GeocodingStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  providerUsage: {
    mapbox: number;
    google: number;
    nominatim: number;
  };
  averageResponseTime: number;
  rateLimitHits: number;
}

export interface DatabaseStats {
  totalOperations: number;
  insertOperations: number;
  updateOperations: number;
  averageQueryTime: number;
  connectionPoolUsage?: number;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export interface ErrorMetrics {
  phase: string;
  errorType: string;
  errorMessage: string;
  timestamp: number;
  stackTrace?: string;
}

class UploadMetricsCollector {
  private metrics: Map<string, UploadMetrics> = new Map();
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_UPLOAD_METRICS === 'true';
  }

  startUpload(uploadId: string, fileName: string, fileSize: number): void {
    if (!this.isEnabled) return;

    const metrics: UploadMetrics = {
      uploadId,
      fileName,
      fileSize,
      totalRows: 0,
      startTime: Date.now(),
      phases: {},
      memoryUsage: this.getMemoryUsage()
    };

    this.metrics.set(uploadId, metrics);
    console.log(`📊 Started tracking metrics for upload [${uploadId}]`);
  }

  startPhase(uploadId: string, phase: keyof UploadMetrics['phases'], itemCount: number = 0): void {
    if (!this.isEnabled) return;

    const metrics = this.metrics.get(uploadId);
    if (!metrics) return;

    metrics.phases[phase] = {
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      itemsProcessed: itemCount,
      itemsPerSecond: 0,
      memoryBefore: this.getMemoryUsage().heapUsed
    };
  }

  endPhase(uploadId: string, phase: keyof UploadMetrics['phases'], itemsProcessed?: number): void {
    if (!this.isEnabled) return;

    const metrics = this.metrics.get(uploadId);
    if (!metrics || !metrics.phases[phase]) return;

    const phaseMetrics = metrics.phases[phase]!;
    phaseMetrics.endTime = Date.now();
    phaseMetrics.duration = phaseMetrics.endTime - phaseMetrics.startTime;
    
    if (itemsProcessed !== undefined) {
      phaseMetrics.itemsProcessed = itemsProcessed;
    }
    
    if (phaseMetrics.duration > 0) {
      phaseMetrics.itemsPerSecond = (phaseMetrics.itemsProcessed / phaseMetrics.duration) * 1000;
    }
    
    phaseMetrics.memoryAfter = this.getMemoryUsage().heapUsed;

    console.log(`⏱️ Phase ${phase} completed [${uploadId}]: ${phaseMetrics.duration}ms, ${phaseMetrics.itemsProcessed} items, ${phaseMetrics.itemsPerSecond.toFixed(2)} items/sec`);
  }

  recordGeocodingStats(uploadId: string, stats: Partial<GeocodingStats>): void {
    if (!this.isEnabled) return;

    const metrics = this.metrics.get(uploadId);
    if (!metrics) return;

    metrics.geocodingStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      providerUsage: { mapbox: 0, google: 0, nominatim: 0 },
      averageResponseTime: 0,
      rateLimitHits: 0,
      ...metrics.geocodingStats,
      ...stats
    };
  }

  recordDatabaseStats(uploadId: string, stats: Partial<DatabaseStats>): void {
    if (!this.isEnabled) return;

    const metrics = this.metrics.get(uploadId);
    if (!metrics) return;

    metrics.databaseStats = {
      totalOperations: 0,
      insertOperations: 0,
      updateOperations: 0,
      averageQueryTime: 0,
      ...metrics.databaseStats,
      ...stats
    };
  }

  recordError(uploadId: string, phase: string, error: Error): void {
    if (!this.isEnabled) return;

    const metrics = this.metrics.get(uploadId);
    if (!metrics) return;

    if (!metrics.errors) {
      metrics.errors = [];
    }

    metrics.errors.push({
      phase,
      errorType: error.constructor.name,
      errorMessage: error.message,
      timestamp: Date.now(),
      stackTrace: error.stack
    });
  }

  endUpload(uploadId: string, totalRows: number): UploadMetrics | null {
    if (!this.isEnabled) return null;

    const metrics = this.metrics.get(uploadId);
    if (!metrics) return null;

    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.totalRows = totalRows;

    // Calculate overall performance metrics
    const summary = this.generateSummary(metrics);
    console.log(`🎯 Upload completed [${uploadId}]:`, summary);

    // Store metrics for potential analysis
    this.storeMetrics(metrics);

    // Clean up to prevent memory leaks
    this.metrics.delete(uploadId);

    return metrics;
  }

  private getMemoryUsage(): MemoryUsage {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss
      };
    }
    
    return {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0
    };
  }

  private generateSummary(metrics: UploadMetrics): any {
    const summary: any = {
      uploadId: metrics.uploadId,
      fileName: metrics.fileName,
      fileSize: `${(metrics.fileSize / 1024 / 1024).toFixed(2)}MB`,
      totalRows: metrics.totalRows,
      totalDuration: `${metrics.duration}ms`,
      phases: {}
    };

    // Add phase summaries
    Object.entries(metrics.phases).forEach(([phase, phaseMetrics]) => {
      if (phaseMetrics) {
        summary.phases[phase] = {
          duration: `${phaseMetrics.duration}ms`,
          itemsPerSecond: phaseMetrics.itemsPerSecond.toFixed(2),
          memoryDelta: phaseMetrics.memoryAfter && phaseMetrics.memoryBefore 
            ? `${((phaseMetrics.memoryAfter - phaseMetrics.memoryBefore) / 1024 / 1024).toFixed(2)}MB`
            : 'N/A'
        };
      }
    });

    // Add geocoding summary
    if (metrics.geocodingStats) {
      const stats = metrics.geocodingStats;
      summary.geocoding = {
        successRate: `${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%`,
        averageResponseTime: `${stats.averageResponseTime}ms`,
        providerUsage: stats.providerUsage
      };
    }

    // Add database summary
    if (metrics.databaseStats) {
      const stats = metrics.databaseStats;
      summary.database = {
        totalOperations: stats.totalOperations,
        insertOperations: stats.insertOperations,
        updateOperations: stats.updateOperations,
        averageQueryTime: `${stats.averageQueryTime}ms`
      };
    }

    // Add error summary
    if (metrics.errors && metrics.errors.length > 0) {
      summary.errors = {
        count: metrics.errors.length,
        types: [...new Set(metrics.errors.map(e => e.errorType))]
      };
    }

    return summary;
  }

  private storeMetrics(metrics: UploadMetrics): void {
    // In a production environment, you might want to:
    // - Send metrics to a monitoring service (DataDog, New Relic, etc.)
    // - Store in a database for analysis
    // - Write to log files
    
    // For now, just log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📈 Detailed metrics:', JSON.stringify(metrics, null, 2));
    }
  }

  // Get current metrics for a specific upload (useful for real-time monitoring)
  getMetrics(uploadId: string): UploadMetrics | null {
    return this.metrics.get(uploadId) || null;
  }

  // Get all active uploads (useful for monitoring dashboard)
  getActiveUploads(): string[] {
    return Array.from(this.metrics.keys());
  }

  // Performance analysis utilities
  analyzePerformance(metrics: UploadMetrics): PerformanceAnalysis {
    const analysis: PerformanceAnalysis = {
      overallRating: 'good',
      bottlenecks: [],
      recommendations: [],
      benchmarks: {}
    };

    // Analyze file processing speed
    if (metrics.duration && metrics.fileSize) {
      const mbPerSecond = (metrics.fileSize / 1024 / 1024) / (metrics.duration / 1000);
      analysis.benchmarks.fileProcessingSpeed = `${mbPerSecond.toFixed(2)} MB/s`;
      
      if (mbPerSecond < 1) {
        analysis.bottlenecks.push('Slow file processing');
        analysis.recommendations.push('Consider optimizing file parsing logic');
      }
    }

    // Analyze row processing speed
    if (metrics.duration && metrics.totalRows) {
      const rowsPerSecond = metrics.totalRows / (metrics.duration / 1000);
      analysis.benchmarks.rowProcessingSpeed = `${rowsPerSecond.toFixed(2)} rows/s`;
      
      if (rowsPerSecond < 10) {
        analysis.bottlenecks.push('Slow row processing');
        analysis.recommendations.push('Consider batch processing optimizations');
      }
    }

    // Analyze geocoding performance
    if (metrics.geocodingStats) {
      const stats = metrics.geocodingStats;
      const successRate = (stats.successfulRequests / stats.totalRequests) * 100;
      analysis.benchmarks.geocodingSuccessRate = `${successRate.toFixed(1)}%`;
      
      if (successRate < 80) {
        analysis.bottlenecks.push('Low geocoding success rate');
        analysis.recommendations.push('Review address data quality or geocoding providers');
      }
      
      if (stats.averageResponseTime > 1000) {
        analysis.bottlenecks.push('Slow geocoding responses');
        analysis.recommendations.push('Consider caching or alternative geocoding providers');
      }
    }

    // Determine overall rating
    if (analysis.bottlenecks.length === 0) {
      analysis.overallRating = 'excellent';
    } else if (analysis.bottlenecks.length <= 2) {
      analysis.overallRating = 'good';
    } else {
      analysis.overallRating = 'needs_improvement';
    }

    return analysis;
  }
}

export interface PerformanceAnalysis {
  overallRating: 'excellent' | 'good' | 'needs_improvement';
  bottlenecks: string[];
  recommendations: string[];
  benchmarks: Record<string, string>;
}

// Global metrics collector instance
export const uploadMetrics = new UploadMetricsCollector();

// Convenience functions
export function startUploadTracking(uploadId: string, fileName: string, fileSize: number): void {
  uploadMetrics.startUpload(uploadId, fileName, fileSize);
}

export function trackPhase<T>(
  uploadId: string, 
  phase: keyof UploadMetrics['phases'], 
  operation: () => Promise<T>,
  itemCount?: number
): Promise<T> {
  uploadMetrics.startPhase(uploadId, phase, itemCount);
  
  return operation()
    .then(result => {
      uploadMetrics.endPhase(uploadId, phase);
      return result;
    })
    .catch(error => {
      uploadMetrics.recordError(uploadId, phase, error);
      uploadMetrics.endPhase(uploadId, phase);
      throw error;
    });
}

export function endUploadTracking(uploadId: string, totalRows: number): UploadMetrics | null {
  return uploadMetrics.endUpload(uploadId, totalRows);
}