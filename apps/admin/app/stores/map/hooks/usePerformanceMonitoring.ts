'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface PerformanceMetrics {
  webWorkerCalculationTime: number;
  mainThreadFallbackTime: number;
  memoryUsage: number;
  renderTime: number;
  apiResponseTime: number;
  totalSuggestions: number;
  visibleSuggestions: number;
  cacheHitRate: number;
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
  metrics?: Partial<PerformanceMetrics>;
}

interface UsePerformanceMonitoringProps {
  onPerformanceAlert?: (alert: PerformanceAlert) => void;
  thresholds?: {
    calculationTimeMs?: number;
    memoryUsageMB?: number;
    renderTimeMs?: number;
    apiResponseTimeMs?: number;
  };
}

export const usePerformanceMonitoring = ({
  onPerformanceAlert,
  thresholds = {
    calculationTimeMs: 5000, // 5 seconds
    memoryUsageMB: 100, // 100 MB
    renderTimeMs: 1000, // 1 second
    apiResponseTimeMs: 10000 // 10 seconds
  }
}: UsePerformanceMonitoringProps = {}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    webWorkerCalculationTime: 0,
    mainThreadFallbackTime: 0,
    memoryUsage: 0,
    renderTime: 0,
    apiResponseTime: 0,
    totalSuggestions: 0,
    visibleSuggestions: 0,
    cacheHitRate: 0
  });

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const metricsHistory = useRef<PerformanceMetrics[]>([]);
  const alertIdCounter = useRef(0);

  // Memory monitoring
  const measureMemoryUsage = useCallback((): number => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      return Math.round(memInfo.usedJSHeapSize / 1024 / 1024); // Convert to MB
    }
    return 0;
  }, []);

  // Create performance alert
  const createAlert = useCallback((
    type: PerformanceAlert['type'],
    message: string,
    relatedMetrics?: Partial<PerformanceMetrics>
  ) => {
    const alert: PerformanceAlert = {
      id: `alert_${++alertIdCounter.current}`,
      type,
      message,
      timestamp: new Date(),
      metrics: relatedMetrics
    };

    setAlerts(prev => [...prev.slice(-9), alert]); // Keep last 10 alerts
    onPerformanceAlert?.(alert);

    return alert;
  }, [onPerformanceAlert]);

  // Check thresholds and create alerts
  const checkThresholds = useCallback((newMetrics: PerformanceMetrics) => {
    if (newMetrics.webWorkerCalculationTime > thresholds.calculationTimeMs!) {
      createAlert(
        'warning',
        `Web Worker calculation took ${newMetrics.webWorkerCalculationTime}ms (threshold: ${thresholds.calculationTimeMs}ms)`,
        { webWorkerCalculationTime: newMetrics.webWorkerCalculationTime }
      );
    }

    if (newMetrics.memoryUsage > thresholds.memoryUsageMB!) {
      createAlert(
        'warning',
        `Memory usage is ${newMetrics.memoryUsage}MB (threshold: ${thresholds.memoryUsageMB}MB)`,
        { memoryUsage: newMetrics.memoryUsage }
      );
    }

    if (newMetrics.renderTime > thresholds.renderTimeMs!) {
      createAlert(
        'warning',
        `Render time was ${newMetrics.renderTime}ms (threshold: ${thresholds.renderTimeMs}ms)`,
        { renderTime: newMetrics.renderTime }
      );
    }

    if (newMetrics.apiResponseTime > thresholds.apiResponseTimeMs!) {
      createAlert(
        'warning',
        `API response took ${newMetrics.apiResponseTime}ms (threshold: ${thresholds.apiResponseTimeMs}ms)`,
        { apiResponseTime: newMetrics.apiResponseTime }
      );
    }

    // Check for performance degradation
    if (metricsHistory.current.length > 5) {
      const recentAvg = metricsHistory.current.slice(-5).reduce((sum, m) => sum + m.webWorkerCalculationTime, 0) / 5;
      if (newMetrics.webWorkerCalculationTime > recentAvg * 2) {
        createAlert(
          'warning',
          `Calculation time spike detected: ${newMetrics.webWorkerCalculationTime}ms (recent avg: ${Math.round(recentAvg)}ms)`
        );
      }
    }
  }, [thresholds, createAlert]);

  // Update metrics
  const updateMetrics = useCallback((updates: Partial<PerformanceMetrics>) => {
    setMetrics(prev => {
      const newMetrics = { ...prev, ...updates };
      
      // Add to history
      metricsHistory.current.push(newMetrics);
      if (metricsHistory.current.length > 50) {
        metricsHistory.current = metricsHistory.current.slice(-50); // Keep last 50 entries
      }

      // Check thresholds
      if (isMonitoring) {
        checkThresholds(newMetrics);
      }

      return newMetrics;
    });
  }, [isMonitoring, checkThresholds]);

  // Measure Web Worker performance
  const measureWebWorkerPerformance = useCallback((
    startTime: number,
    endTime: number,
    totalCandidates: number,
    filteredCandidates: number
  ) => {
    const calculationTime = endTime - startTime;
    const memoryUsage = measureMemoryUsage();

    updateMetrics({
      webWorkerCalculationTime: calculationTime,
      memoryUsage,
      totalSuggestions: totalCandidates,
      visibleSuggestions: Math.min(filteredCandidates, 300)
    });

    // Log performance info
    console.info('📊 Web Worker Performance:', {
      calculationTime,
      memoryUsage,
      totalCandidates,
      filteredCandidates,
      efficiency: totalCandidates > 0 ? Math.round(calculationTime / totalCandidates * 1000) / 1000 : 0
    });
  }, [updateMetrics, measureMemoryUsage]);

  // Measure main thread fallback performance
  const measureMainThreadPerformance = useCallback((
    startTime: number,
    endTime: number,
    reason: string
  ) => {
    const calculationTime = endTime - startTime;
    const memoryUsage = measureMemoryUsage();

    updateMetrics({
      mainThreadFallbackTime: calculationTime,
      memoryUsage
    });

    createAlert(
      'info',
      `Fallback to main thread: ${reason} (took ${calculationTime}ms)`,
      { mainThreadFallbackTime: calculationTime }
    );
  }, [updateMetrics, measureMemoryUsage, createAlert]);

  // Measure render performance
  const measureRenderPerformance = useCallback((renderTime: number) => {
    updateMetrics({ renderTime });
  }, [updateMetrics]);

  // Measure API performance
  const measureAPIPerformance = useCallback((
    responseTime: number,
    cacheHit: boolean,
    endpoint: string
  ) => {
    updateMetrics({
      apiResponseTime: responseTime,
      cacheHitRate: cacheHit ? 1 : 0
    });

    if (responseTime > thresholds.apiResponseTimeMs! * 0.8) {
      createAlert(
        'info',
        `Slow API response from ${endpoint}: ${responseTime}ms (cache ${cacheHit ? 'hit' : 'miss'})`
      );
    }
  }, [updateMetrics, thresholds.apiResponseTimeMs, createAlert]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    createAlert('info', 'Performance monitoring started');
  }, [createAlert]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    createAlert('info', 'Performance monitoring stopped');
  }, [createAlert]);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    const history = metricsHistory.current;
    if (history.length === 0) {
      return null;
    }

    const recent = history.slice(-10);
    const avgCalculationTime = recent.reduce((sum, m) => sum + m.webWorkerCalculationTime, 0) / recent.length;
    const avgMemoryUsage = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
    const avgRenderTime = recent.reduce((sum, m) => sum + m.renderTime, 0) / recent.length;
    const avgApiResponseTime = recent.reduce((sum, m) => sum + m.apiResponseTime, 0) / recent.length;

    return {
      averages: {
        calculationTime: Math.round(avgCalculationTime),
        memoryUsage: Math.round(avgMemoryUsage),
        renderTime: Math.round(avgRenderTime),
        apiResponseTime: Math.round(avgApiResponseTime)
      },
      current: metrics,
      alertCount: alerts.length,
      samplesCount: history.length
    };
  }, [metrics, alerts.length]);

  // Monitor frame rate
  const [frameRate, setFrameRate] = useState(60);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());

  useEffect(() => {
    if (!isMonitoring) return;

    let animationId: number;

    const measureFrameRate = () => {
      const now = performance.now();
      frameCountRef.current++;

      if (now - lastFrameTimeRef.current >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / (now - lastFrameTimeRef.current));
        setFrameRate(fps);
        
        if (fps < 30) {
          createAlert('warning', `Low frame rate detected: ${fps} FPS`);
        }

        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }

      animationId = requestAnimationFrame(measureFrameRate);
    };

    animationId = requestAnimationFrame(measureFrameRate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isMonitoring, createAlert]);

  // Periodic memory monitoring
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      const memoryUsage = measureMemoryUsage();
      if (memoryUsage > 0) {
        updateMetrics({ memoryUsage });
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [isMonitoring, measureMemoryUsage, updateMetrics]);

  return {
    // Current metrics
    metrics,
    alerts,
    frameRate,
    isMonitoring,
    
    // Measurement functions
    measureWebWorkerPerformance,
    measureMainThreadPerformance,
    measureRenderPerformance,
    measureAPIPerformance,
    
    // Control functions
    startMonitoring,
    stopMonitoring,
    clearAlerts,
    
    // Analysis functions
    getPerformanceSummary,
    
    // Computed values
    hasPerformanceIssues: alerts.some(alert => alert.type === 'warning' || alert.type === 'error'),
    averageCalculationTime: metricsHistory.current.length > 0 
      ? Math.round(metricsHistory.current.reduce((sum, m) => sum + m.webWorkerCalculationTime, 0) / metricsHistory.current.length)
      : 0
  };
};

export default usePerformanceMonitoring;