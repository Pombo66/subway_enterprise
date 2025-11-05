'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapTelemetryHelpers, safeTrackEvent, getCurrentUserId } from '../telemetry';

interface PerformanceGuardProps {
  children: React.ReactNode;
  onPerformanceDegraded?: (reason: string, metrics: PerformanceMetrics) => void;
  onPerformanceRecovered?: (metrics: PerformanceMetrics) => void;
  enableFallback?: boolean;
  fallbackComponent?: React.ReactNode;
}

interface PerformanceMetrics {
  memoryUsage: number;
  renderTime: number;
  frameRate: number;
  errorRate: number;
  timestamp: number;
}

const PERFORMANCE_THRESHOLDS = {
  memoryUsage: 80, // 80% of available memory
  renderTime: 100, // 100ms render time
  frameRate: 30, // 30 FPS minimum
  errorRate: 0.1, // 10% error rate
};

const MONITORING_INTERVAL = 5000; // 5 seconds
const DEGRADATION_WINDOW = 30000; // 30 seconds window for degradation detection
const RECOVERY_WINDOW = 15000; // 15 seconds window for recovery detection

/**
 * Performance guard component that monitors performance metrics
 * and triggers fallback mode when performance degrades
 */
export default function PerformanceGuard({
  children,
  onPerformanceDegraded,
  onPerformanceRecovered,
  enableFallback = false,
  fallbackComponent,
}: PerformanceGuardProps) {
  const [isDegraded, setIsDegraded] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [degradationReason, setDegradationReason] = useState<string>('');

  const metricsHistoryRef = useRef<PerformanceMetrics[]>([]);
  const errorCountRef = useRef(0);
  const totalOperationsRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Collect current performance metrics
   */
  const collectMetrics = useCallback((): PerformanceMetrics => {
    const now = performance.now();
    
    // Memory usage (if available)
    let memoryUsage = 0;
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      memoryUsage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
    }

    // Frame rate estimation (passive approach)
    // Instead of continuous tracking, estimate based on performance entries
    let frameRate = 60; // Default assumption
    try {
      const paintEntries = performance.getEntriesByType('paint');
      if (paintEntries.length > 0) {
        const recentPaints = paintEntries.filter(entry => now - entry.startTime < 1000);
        frameRate = recentPaints.length > 0 ? Math.min(60, recentPaints.length) : 60;
      }
    } catch (error) {
      // Fallback to default frame rate
      frameRate = 60;
    }

    // Error rate calculation
    const errorRate = totalOperationsRef.current > 0 
      ? errorCountRef.current / totalOperationsRef.current 
      : 0;

    // Render time (approximate based on recent performance entries)
    let renderTime = 0;
    try {
      const entries = performance.getEntriesByType('measure');
      const recentEntries = entries
        .filter(entry => now - entry.startTime < 5000)
        .slice(-10);
      
      if (recentEntries.length > 0) {
        renderTime = recentEntries.reduce((sum, entry) => sum + entry.duration, 0) / recentEntries.length;
      }
    } catch (error) {
      console.warn('Error collecting render time metrics:', error);
    }

    return {
      memoryUsage,
      renderTime,
      frameRate,
      errorRate,
      timestamp: now,
    };
  }, []);

  /**
   * Analyze metrics to detect performance degradation
   */
  const analyzePerformance = useCallback((metrics: PerformanceMetrics): { isDegraded: boolean; reason: string } => {
    const reasons: string[] = [];

    if (metrics.memoryUsage > PERFORMANCE_THRESHOLDS.memoryUsage) {
      reasons.push(`High memory usage: ${metrics.memoryUsage.toFixed(1)}%`);
    }

    if (metrics.renderTime > PERFORMANCE_THRESHOLDS.renderTime) {
      reasons.push(`Slow rendering: ${metrics.renderTime.toFixed(1)}ms`);
    }

    if (metrics.frameRate < PERFORMANCE_THRESHOLDS.frameRate) {
      reasons.push(`Low frame rate: ${metrics.frameRate.toFixed(1)} FPS`);
    }

    if (metrics.errorRate > PERFORMANCE_THRESHOLDS.errorRate) {
      reasons.push(`High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
    }

    return {
      isDegraded: reasons.length > 0,
      reason: reasons.join(', '),
    };
  }, []);

  /**
   * Check for sustained performance issues
   */
  const checkSustainedDegradation = useCallback((history: PerformanceMetrics[]): boolean => {
    const now = performance.now();
    const recentMetrics = history.filter(m => now - m.timestamp < DEGRADATION_WINDOW);
    
    if (recentMetrics.length < 3) return false; // Need at least 3 samples

    const degradedCount = recentMetrics.filter(metrics => {
      const analysis = analyzePerformance(metrics);
      return analysis.isDegraded;
    }).length;

    // Consider degraded if more than 60% of recent samples show degradation
    return degradedCount / recentMetrics.length > 0.6;
  }, [analyzePerformance]);

  /**
   * Check for performance recovery
   */
  const checkRecovery = useCallback((history: PerformanceMetrics[]): boolean => {
    const now = performance.now();
    const recentMetrics = history.filter(m => now - m.timestamp < RECOVERY_WINDOW);
    
    if (recentMetrics.length < 2) return false; // Need at least 2 samples

    const healthyCount = recentMetrics.filter(metrics => {
      const analysis = analyzePerformance(metrics);
      return !analysis.isDegraded;
    }).length;

    // Consider recovered if more than 80% of recent samples are healthy
    return healthyCount / recentMetrics.length > 0.8;
  }, [analyzePerformance]);

  /**
   * Monitor performance metrics
   */
  const monitorPerformance = useCallback(() => {
    try {
      const metrics = collectMetrics();
      setCurrentMetrics(metrics);

      // Add to history
      metricsHistoryRef.current.push(metrics);
      
      // Keep only recent history (last 2 minutes)
      const cutoff = performance.now() - 120000;
      metricsHistoryRef.current = metricsHistoryRef.current.filter(m => m.timestamp > cutoff);

      const analysis = analyzePerformance(metrics);

      if (!isDegraded && checkSustainedDegradation(metricsHistoryRef.current)) {
        console.warn('Performance degradation detected:', analysis.reason);
        setIsDegraded(true);
        setDegradationReason(analysis.reason);

        // Track performance degradation
        safeTrackEvent(() => {
          MapTelemetryHelpers.trackMapError(
            new Error(`Performance degradation: ${analysis.reason}`),
            getCurrentUserId(),
            {
              context: 'performance_guard',
              metrics,
              thresholds: PERFORMANCE_THRESHOLDS,
            }
          );
        }, 'performance_degradation');

        if (onPerformanceDegraded) {
          onPerformanceDegraded(analysis.reason, metrics);
        }
      } else if (isDegraded && checkRecovery(metricsHistoryRef.current)) {
        console.log('Performance recovered:', metrics);
        setIsDegraded(false);
        setDegradationReason('');

        // Track performance recovery
        safeTrackEvent(() => {
          MapTelemetryHelpers.trackMapRetry(0, getCurrentUserId(), {
            performanceRecovery: true,
            metrics,
          });
        }, 'performance_recovery');

        if (onPerformanceRecovered) {
          onPerformanceRecovered(metrics);
        }
      }
    } catch (error) {
      console.warn('Error monitoring performance:', error);
      errorCountRef.current++;
    }
    
    totalOperationsRef.current++;
  }, [isDegraded, collectMetrics, analyzePerformance, checkSustainedDegradation, checkRecovery, onPerformanceDegraded, onPerformanceRecovered]);

  /**
   * Track frame rendering for FPS calculation (passive approach)
   */
  const trackFrame = useCallback(() => {
    frameCountRef.current++;
    // Don't use continuous requestAnimationFrame to avoid performance impact
    // Instead, we'll sample frame rate periodically in monitorPerformance
  }, []);

  /**
   * Track operation errors
   */
  const trackError = useCallback(() => {
    errorCountRef.current++;
    totalOperationsRef.current++;
  }, []);

  // Start monitoring on mount
  useEffect(() => {
    // Start performance monitoring (no continuous animation frames)
    monitoringIntervalRef.current = setInterval(monitorPerformance, MONITORING_INTERVAL);

    // Initial metrics collection
    monitorPerformance();

    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
        monitoringIntervalRef.current = null;
      }
    };
  }, [monitorPerformance]);

  // Provide error tracking to children
  useEffect(() => {
    const handleError = () => trackError();
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, [trackError]);

  // Show fallback if performance is degraded and fallback is enabled
  if (isDegraded && enableFallback && fallbackComponent) {
    return (
      <div className="performance-guard-fallback">
        <div className="performance-warning">
          <div className="warning-icon">⚡</div>
          <div className="warning-message">
            <h4>Performance Mode</h4>
            <p>Switched to optimized view due to: {degradationReason}</p>
          </div>
          {currentMetrics && (
            <div className="performance-metrics">
              <small>
                Memory: {currentMetrics.memoryUsage.toFixed(1)}% | 
                FPS: {currentMetrics.frameRate.toFixed(0)} | 
                Render: {currentMetrics.renderTime.toFixed(1)}ms
              </small>
            </div>
          )}
        </div>
        {fallbackComponent}
        
        <style jsx>{`
          .performance-guard-fallback {
            height: 100%;
            display: flex;
            flex-direction: column;
          }

          .performance-warning {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: var(--s-warning-bg);
            border: 1px solid var(--s-warning);
            border-radius: 8px;
            margin-bottom: 16px;
          }

          .warning-icon {
            font-size: 20px;
            color: var(--s-warning);
          }

          .warning-message h4 {
            margin: 0 0 4px 0;
            font-size: 14px;
            font-weight: 600;
            color: var(--s-warning);
          }

          .warning-message p {
            margin: 0;
            font-size: 12px;
            color: var(--s-warning);
          }

          .performance-metrics {
            margin-left: auto;
            font-size: 11px;
            color: var(--s-warning);
            opacity: 0.8;
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}