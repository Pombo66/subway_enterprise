/**
 * Development performance dashboard for MapView
 * Shows real-time performance metrics, memory usage, and alerts
 */

'use client';

import { useState, useEffect } from 'react';
import { MapPerformanceMetrics, MapPerformanceAlert } from '../../../../lib/monitoring/MapPerformanceMonitor';
import { useMapPerformanceMonitoring } from '../../../../lib/monitoring/useMapPerformanceMonitoring';

interface MapPerformanceDashboardProps {
  isVisible?: boolean;
  onToggle?: () => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function MapPerformanceDashboard({
  isVisible = false,
  onToggle,
  position = 'top-right',
}: MapPerformanceDashboardProps) {
  const {
    currentMetrics,
    alerts,
    isHighMemoryUsage,
    isSlowPerformance,
    hasRecentErrors,
    clearAlerts,
    exportMetrics,
    getMetricsSummary,
  } = useMapPerformanceMonitoring({
    metricsCollectionInterval: 1000, // 1 second for dashboard
    enableAlerts: true,
    trackOperations: true,
    trackMemory: true,
    trackAPI: true,
  });

  const [selectedTab, setSelectedTab] = useState<'overview' | 'memory' | 'performance' | 'alerts'>('overview');
  const [isMinimized, setIsMinimized] = useState(false);

  // Only render in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className={`fixed z-50 bg-blue-600 text-white p-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors ${getPositionClasses(position)}`}
        title="Show Performance Dashboard"
      >
        📊
      </button>
    );
  }

  const positionClasses = getPositionClasses(position);

  return (
    <div className={`fixed z-50 bg-white border border-gray-300 rounded-lg shadow-xl ${positionClasses}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-gray-700">Map Performance</span>
          <div className="flex space-x-1">
            {isHighMemoryUsage && (
              <div className="w-2 h-2 bg-orange-500 rounded-full" title="High memory usage" />
            )}
            {isSlowPerformance && (
              <div className="w-2 h-2 bg-red-500 rounded-full" title="Slow performance" />
            )}
            {hasRecentErrors && (
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" title="Recent errors" />
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? '⬆️' : '⬇️'}
          </button>
          <button
            onClick={onToggle}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title="Close Dashboard"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {(['overview', 'memory', 'performance', 'alerts'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                  selectedTab === tab
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tab}
                {tab === 'alerts' && alerts.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {alerts.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-3 max-h-96 overflow-y-auto">
            {selectedTab === 'overview' && (
              <OverviewTab metrics={currentMetrics} />
            )}
            {selectedTab === 'memory' && (
              <MemoryTab metrics={currentMetrics} />
            )}
            {selectedTab === 'performance' && (
              <PerformanceTab metrics={currentMetrics} />
            )}
            {selectedTab === 'alerts' && (
              <AlertsTab alerts={alerts} onClearAlerts={clearAlerts} />
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center p-2 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="text-xs text-gray-500">
              {currentMetrics ? 'Live data' : 'No data'}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  const data = exportMetrics();
                  navigator.clipboard.writeText(data);
                }}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                title="Copy metrics to clipboard"
              >
                Copy
              </button>
              <button
                onClick={() => {
                  const summary = getMetricsSummary();
                  console.log('Map Performance Summary:', summary);
                }}
                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                title="Log summary to console"
              >
                Log
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OverviewTab({ metrics }: { metrics: MapPerformanceMetrics | null }) {
  if (!metrics) {
    return <div className="text-sm text-gray-500">No metrics available</div>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="FPS"
          value={metrics.fps.toFixed(0)}
          status={metrics.fps >= 30 ? 'good' : metrics.fps >= 20 ? 'warning' : 'error'}
        />
        <MetricCard
          label="Memory"
          value={`${metrics.memoryUsage.percentage.toFixed(1)}%`}
          status={metrics.memoryUsage.percentage < 75 ? 'good' : metrics.memoryUsage.percentage < 85 ? 'warning' : 'error'}
        />
        <MetricCard
          label="Markers"
          value={`${metrics.visibleMarkers}/${metrics.totalMarkers}`}
          status="neutral"
        />
        <MetricCard
          label="API Time"
          value={`${metrics.apiResponseTime.toFixed(0)}ms`}
          status={metrics.apiResponseTime < 1000 ? 'good' : metrics.apiResponseTime < 2000 ? 'warning' : 'error'}
        />
      </div>
      
      <div className="text-xs text-gray-600 space-y-1">
        <div>Render Time: {metrics.totalRenderTime.toFixed(1)}ms</div>
        <div>Frame Drops: {metrics.frameDrops}</div>
        <div>Long Tasks: {metrics.longTasks}</div>
        <div>Zoom Level: {metrics.zoomLevel.toFixed(1)}</div>
      </div>
    </div>
  );
}

function MemoryTab({ metrics }: { metrics: MapPerformanceMetrics | null }) {
  if (!metrics) {
    return <div className="text-sm text-gray-500">No memory data available</div>;
  }

  const { memoryUsage } = metrics;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span>Heap Usage</span>
          <span>{memoryUsage.percentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              memoryUsage.percentage < 75 ? 'bg-green-500' :
              memoryUsage.percentage < 85 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(memoryUsage.percentage, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs">
        <div className="flex justify-between">
          <span>Used:</span>
          <span>{(memoryUsage.used / 1024 / 1024).toFixed(1)} MB</span>
        </div>
        <div className="flex justify-between">
          <span>Total:</span>
          <span>{(memoryUsage.total / 1024 / 1024).toFixed(1)} MB</span>
        </div>
        <div className="flex justify-between">
          <span>Limit:</span>
          <span>{(memoryUsage.limit / 1024 / 1024).toFixed(1)} MB</span>
        </div>
      </div>

      <div className="border-t pt-2 space-y-1 text-xs text-gray-600">
        <div>Marker Pool: {metrics.markerPoolSize}</div>
        <div>Marker Cache: {metrics.markerCacheSize}</div>
      </div>
    </div>
  );
}

function PerformanceTab({ metrics }: { metrics: MapPerformanceMetrics | null }) {
  if (!metrics) {
    return <div className="text-sm text-gray-500">No performance data available</div>;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-700">Rendering</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span>Markers:</span>
            <span>{metrics.markerRenderTime.toFixed(1)}ms</span>
          </div>
          <div className="flex justify-between">
            <span>Clusters:</span>
            <span>{metrics.clusterRenderTime.toFixed(1)}ms</span>
          </div>
          <div className="flex justify-between">
            <span>Culling:</span>
            <span>{metrics.viewportCullingTime.toFixed(1)}ms</span>
          </div>
          <div className="flex justify-between">
            <span>Total:</span>
            <span>{metrics.totalRenderTime.toFixed(1)}ms</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-700">Frame Rate</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span>Current FPS:</span>
            <span className={metrics.fps >= 30 ? 'text-green-600' : metrics.fps >= 20 ? 'text-yellow-600' : 'text-red-600'}>
              {metrics.fps.toFixed(0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Frame Drops:</span>
            <span>{metrics.frameDrops}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-700">API Performance</h4>
        <div className="grid grid-cols-1 gap-1 text-xs">
          <div className="flex justify-between">
            <span>Response Time:</span>
            <span>{metrics.apiResponseTime.toFixed(0)}ms</span>
          </div>
          <div className="flex justify-between">
            <span>Success Rate:</span>
            <span>{metrics.apiSuccessRate.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Errors:</span>
            <span>{metrics.apiErrorCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertsTab({ 
  alerts, 
  onClearAlerts 
}: { 
  alerts: MapPerformanceAlert[]; 
  onClearAlerts: () => void; 
}) {
  if (alerts.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        No performance alerts
      </div>
    );
  }

  const recentAlerts = alerts.slice(-10).reverse(); // Show last 10 alerts

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-gray-700">
          Recent Alerts ({alerts.length})
        </span>
        <button
          onClick={onClearAlerts}
          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {recentAlerts.map((alert, index) => (
          <div
            key={`${alert.timestamp}-${index}`}
            className={`p-2 rounded text-xs border-l-2 ${getSeverityClasses(alert.severity)}`}
          >
            <div className="flex justify-between items-start">
              <span className="font-medium capitalize">{alert.type}</span>
              <span className="text-xs text-gray-500">
                Recent
              </span>
            </div>
            <div className="mt-1 text-gray-700">{alert.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  status 
}: { 
  label: string; 
  value: string; 
  status: 'good' | 'warning' | 'error' | 'neutral'; 
}) {
  const statusClasses = {
    good: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    neutral: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  return (
    <div className={`p-2 rounded border ${statusClasses[status]}`}>
      <div className="text-xs font-medium">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}

function getSeverityClasses(severity: MapPerformanceAlert['severity']): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-50 border-red-500 text-red-800';
    case 'high':
      return 'bg-orange-50 border-orange-500 text-orange-800';
    case 'medium':
      return 'bg-yellow-50 border-yellow-500 text-yellow-800';
    case 'low':
      return 'bg-blue-50 border-blue-500 text-blue-800';
    default:
      return 'bg-gray-50 border-gray-500 text-gray-800';
  }
}

function getPositionClasses(position: MapPerformanceDashboardProps['position']): string {
  switch (position) {
    case 'top-left':
      return 'top-4 left-4';
    case 'top-right':
      return 'top-4 right-4';
    case 'bottom-left':
      return 'bottom-4 left-4';
    case 'bottom-right':
      return 'bottom-4 right-4';
    default:
      return 'top-4 right-4';
  }
}