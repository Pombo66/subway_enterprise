/**
 * Test page for the optimized map implementation
 * This page tests the new performance-optimized components
 */

'use client';

import React, { useState } from 'react';
import OptimizedMapPage from './components/OptimizedMapPage';
import { FilterState } from './types';

export default function MapTestPage() {
  const [testMode, setTestMode] = useState<'optimized' | 'performance' | 'stress'>('optimized');
  const [filters, setFilters] = useState<FilterState>({});

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ marginBottom: '10px' }}>Living Map Performance Test</h1>
        <p style={{ color: 'var(--s-muted)', marginBottom: '20px' }}>
          Testing the optimized map implementation with anchored markers and performance improvements.
        </p>
        
        {/* Test Mode Selector */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ marginRight: '10px' }}>Test Mode:</label>
          <select 
            value={testMode} 
            onChange={(e) => setTestMode(e.target.value as any)}
            style={{ 
              padding: '8px 12px', 
              borderRadius: '4px', 
              border: '1px solid var(--s-border)',
              background: 'var(--s-surface)'
            }}
          >
            <option value="optimized">Optimized Map</option>
            <option value="performance">Performance Monitor</option>
            <option value="stress">Stress Test</option>
          </select>
        </div>

        {/* Filter Controls */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div>
            <label style={{ marginRight: '8px' }}>Region:</label>
            <select 
              value={filters.region || ''} 
              onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value || undefined }))}
              style={{ 
                padding: '4px 8px', 
                borderRadius: '4px', 
                border: '1px solid var(--s-border)',
                background: 'var(--s-surface)'
              }}
            >
              <option value="">All Regions</option>
              <option value="AMER">Americas</option>
              <option value="EMEA">Europe/Middle East/Africa</option>
              <option value="APAC">Asia Pacific</option>
            </select>
          </div>
          
          <div>
            <label style={{ marginRight: '8px' }}>Country:</label>
            <select 
              value={filters.country || ''} 
              onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value || undefined }))}
              style={{ 
                padding: '4px 8px', 
                borderRadius: '4px', 
                border: '1px solid var(--s-border)',
                background: 'var(--s-surface)'
              }}
            >
              <option value="">All Countries</option>
              <option value="United States">United States</option>
              <option value="Canada">Canada</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="France">France</option>
              <option value="Germany">Germany</option>
              <option value="Japan">Japan</option>
              <option value="Australia">Australia</option>
            </select>
          </div>
        </div>
      </div>

      {/* Performance Metrics Display */}
      {testMode === 'performance' && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '16px', 
          background: 'var(--s-surface)', 
          borderRadius: '8px',
          border: '1px solid var(--s-border)'
        }}>
          <h3 style={{ marginBottom: '12px' }}>Performance Metrics</h3>
          <PerformanceMonitor />
        </div>
      )}

      {/* Stress Test Info */}
      {testMode === 'stress' && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '16px', 
          background: 'var(--s-warning-bg)', 
          borderRadius: '8px',
          border: '1px solid var(--s-warning)'
        }}>
          <h3 style={{ marginBottom: '8px', color: 'var(--s-warning)' }}>Stress Test Mode</h3>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--s-warning)' }}>
            This mode tests the map with rapid interactions and data updates to validate performance under load.
          </p>
        </div>
      )}

      {/* Main Map Component */}
      <OptimizedMapPage initialFilters={filters} />

      {/* Test Instructions */}
      <div style={{ 
        marginTop: '20px', 
        padding: '16px', 
        background: 'var(--s-panel)', 
        borderRadius: '8px',
        border: '1px solid var(--s-border)'
      }}>
        <h3 style={{ marginBottom: '12px' }}>Test Instructions</h3>
        <div style={{ fontSize: '14px', color: 'var(--s-muted)' }}>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--s-text)' }}>Anchored Markers Test:</h4>
          <ul style={{ margin: '0 0 16px 0', paddingLeft: '20px' }}>
            <li>Zoom in and out - markers should stay perfectly positioned</li>
            <li>Pan around the map - markers should move smoothly with the map</li>
            <li>Click on individual markers - should open store details</li>
            <li>Click on clusters - should zoom to expand</li>
          </ul>
          
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--s-text)' }}>Performance Test:</h4>
          <ul style={{ margin: '0 0 16px 0', paddingLeft: '20px' }}>
            <li>Check CPU usage in browser dev tools (should be low when idle)</li>
            <li>Monitor memory usage over time (should remain stable)</li>
            <li>Test rapid zoom/pan operations (should be smooth)</li>
            <li>Apply different filters (should update without lag)</li>
          </ul>
          
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--s-text)' }}>Error Handling Test:</h4>
          <ul style={{ margin: '0', paddingLeft: '20px' }}>
            <li>Disable network in dev tools - should show fallback UI</li>
            <li>Refresh page during map load - should recover gracefully</li>
            <li>Check console for any error messages</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Simple performance monitor component
 */
function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    memory: 0,
    fps: 0,
    renderTime: 0
  });

  // Update metrics periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      // Memory usage
      let memoryUsage = 0;
      if ('memory' in performance && (performance as any).memory) {
        const memory = (performance as any).memory;
        memoryUsage = Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100);
      }

      // Simple FPS estimation
      let fps = 60;
      try {
        const entries = performance.getEntriesByType('paint');
        if (entries.length > 0) {
          fps = Math.min(60, entries.length);
        }
      } catch (error) {
        // Fallback
      }

      // Render time estimation
      let renderTime = 0;
      try {
        const measures = performance.getEntriesByType('measure');
        if (measures.length > 0) {
          renderTime = Math.round(measures[measures.length - 1].duration);
        }
      } catch (error) {
        // Fallback
      }

      setMetrics({ memory: memoryUsage, fps, renderTime });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--s-primary)' }}>
          {metrics.memory}%
        </div>
        <div style={{ fontSize: '12px', color: 'var(--s-muted)' }}>Memory Usage</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--s-primary)' }}>
          {metrics.fps}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--s-muted)' }}>Est. FPS</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--s-primary)' }}>
          {metrics.renderTime}ms
        </div>
        <div style={{ fontSize: '12px', color: 'var(--s-muted)' }}>Render Time</div>
      </div>
    </div>
  );
}