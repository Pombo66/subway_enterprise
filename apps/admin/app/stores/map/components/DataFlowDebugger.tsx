'use client';

import { useEffect, useState } from 'react';
import { useStores } from '../hooks/useStores';
import { debugMonitor } from '../utils/debugMonitor';
import { dataFlowLogger } from '../utils/dataFlowLogger';

interface DataFlowDebuggerProps {
  filters: {
    region?: string;
    country?: string;
    franchiseeId?: string;
  };
}

export default function DataFlowDebugger({ filters }: DataFlowDebuggerProps) {
  const { stores, loading, error } = useStores(filters);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const snapshot = debugMonitor.getLatestSnapshot();
      const healthStatus = debugMonitor.getHealthStatus();
      setDebugInfo({ snapshot, healthStatus });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '400px',
      maxHeight: '80vh',
      overflow: 'auto',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 10000,
      border: '1px solid #333'
    }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#4ade80' }}>Data Flow Debug</h3>
      
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#60a5fa' }}>useStores Hook</h4>
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>Error: {error || 'None'}</div>
        <div>Stores: {stores.length}</div>
        <div>Active: {stores.filter(s => s.recentActivity).length}</div>
        {stores.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <div>Sample Store:</div>
            <div style={{ marginLeft: '16px', fontSize: '10px' }}>
              <div>ID: {stores[0].id}</div>
              <div>Name: {stores[0].name}</div>
              <div>Coords: {stores[0].latitude.toFixed(4)}, {stores[0].longitude.toFixed(4)}</div>
              <div>Country: {stores[0].country}</div>
              <div>Active: {stores[0].recentActivity ? 'Yes' : 'No'}</div>
            </div>
          </div>
        )}
      </div>

      {debugInfo && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#60a5fa' }}>Health Status</h4>
            <div>Status: <span style={{ color: debugInfo.healthStatus.status === 'healthy' ? '#4ade80' : debugInfo.healthStatus.status === 'warning' ? '#fbbf24' : '#ef4444' }}>
              {debugInfo.healthStatus.status}
            </span></div>
            <div>Score: {debugInfo.healthStatus.score}/100</div>
            <div>Issues: {debugInfo.healthStatus.issues}</div>
            <div>Recommendations: {debugInfo.healthStatus.recommendations}</div>
          </div>

          {debugInfo.snapshot && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#60a5fa' }}>Latest Metrics</h4>
              <div>API Calls: {debugInfo.snapshot.metrics.dataFlow.apiCallsSuccessful}/{debugInfo.snapshot.metrics.dataFlow.apiCallsTotal}</div>
              <div>Last API Success: {debugInfo.snapshot.metrics.dataFlow.lastAPICallSuccess ? 'Yes' : 'No'}</div>
              <div>Last API Data: {debugInfo.snapshot.metrics.dataFlow.lastAPIDataLength} items</div>
              <div>Valid Stores: {debugInfo.snapshot.metrics.validation.validStores}/{debugInfo.snapshot.metrics.validation.totalStores}</div>
              <div>Validation Rate: {debugInfo.snapshot.metrics.validation.successRate}%</div>
              <div>Markers Created: {debugInfo.snapshot.metrics.rendering.markersCreated}</div>
              <div>Markers Added: {debugInfo.snapshot.metrics.rendering.markersAdded}</div>
              <div>Map Loaded: {debugInfo.snapshot.metrics.mapState.loaded ? 'Yes' : 'No'}</div>
              <div>Map Markers: {debugInfo.snapshot.metrics.mapState.markerCount}</div>
            </div>
          )}

          {debugInfo.snapshot && debugInfo.snapshot.metrics.issues.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#ef4444' }}>Issues</h4>
              {debugInfo.snapshot.metrics.issues.slice(0, 3).map((issue: any, index: number) => (
                <div key={index} style={{ fontSize: '10px', marginBottom: '4px' }}>
                  <span style={{ color: issue.severity === 'high' ? '#ef4444' : issue.severity === 'medium' ? '#fbbf24' : '#94a3b8' }}>
                    [{issue.severity.toUpperCase()}]
                  </span> {issue.message}
                </div>
              ))}
            </div>
          )}

          {debugInfo.snapshot && debugInfo.snapshot.recommendations.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', color: '#fbbf24' }}>Recommendations</h4>
              {debugInfo.snapshot.recommendations.slice(0, 2).map((rec: string, index: number) => (
                <div key={index} style={{ fontSize: '10px', marginBottom: '4px' }}>
                  • {rec}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}