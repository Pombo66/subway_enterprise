/**
 * OptimizedMapPage - Main page component with performance optimizations
 * Integrates all the performance improvements and anchored markers
 */

'use client';

import { useState, useCallback } from 'react';
import { StoreWithActivity, FilterState, DEFAULT_VIEWPORT } from '../types';
import { useUnifiedStoreData } from '../hooks/useUnifiedStoreData';
import MapView from './MapView';
import MapErrorBoundary from './MapErrorBoundary';

interface OptimizedMapPageProps {
  initialFilters?: FilterState;
}

/**
 * Main map page component with all performance optimizations
 */
export default function OptimizedMapPage({ 
  initialFilters = {} 
}: OptimizedMapPageProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);
  const [selectedStore, setSelectedStore] = useState<StoreWithActivity | null>(null);

  // Use unified data source for consistent counts
  const { mapStores, counts, loading, error } = useUnifiedStoreData(filters);

  // Stable callback for store selection
  const handleStoreSelect = useCallback((store: StoreWithActivity) => {
    console.log('🏪 Store selected:', store.name);
    setSelectedStore(store);
  }, []);

  // Stable callback for viewport changes
  const handleViewportChange = useCallback((newViewport: typeof viewport) => {
    setViewport(newViewport);
  }, []);

  // Error handler for map errors
  const handleMapError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.error('🚨 Map page error:', error, errorInfo);
    
    // Track error in telemetry
    import('../lib/MapTelemetry').then(({ mapTelemetry }) => {
      mapTelemetry.trackError(error, 'map_page', {
        componentStack: errorInfo.componentStack?.substring(0, 200)
      });
    });
  }, []);

  // Fallback component for error boundary
  const fallbackComponent = (
    <div className="map-fallback">
      <div className="fallback-header">
        <h3>Map View Unavailable</h3>
        <p>The interactive map is temporarily unavailable. You can still view store information below.</p>
      </div>
      
      <div className="store-summary">
        <div className="summary-card">
          <div className="summary-number">{counts.mapVisible}</div>
          <div className="summary-label">Stores Available</div>
        </div>
        <div className="summary-card">
          <div className="summary-number">{counts.activeMapVisible}</div>
          <div className="summary-label">Currently Active</div>
        </div>
      </div>
      
      <style jsx>{`
        .map-fallback {
          width: 100%;
          height: 600px;
          background: var(--s-panel);
          border: 1px solid var(--s-border);
          border-radius: 8px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        
        .fallback-header h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: var(--s-text);
        }
        
        .fallback-header p {
          margin: 0 0 32px 0;
          color: var(--s-muted);
          font-size: 14px;
        }
        
        .store-summary {
          display: flex;
          gap: 24px;
        }
        
        .summary-card {
          background: var(--s-surface);
          border: 1px solid var(--s-border);
          border-radius: 8px;
          padding: 24px;
          text-align: center;
        }
        
        .summary-number {
          font-size: 32px;
          font-weight: 700;
          color: var(--s-primary);
          margin-bottom: 8px;
        }
        
        .summary-label {
          font-size: 14px;
          color: var(--s-muted);
          font-weight: 500;
        }
      `}</style>
    </div>
  );

  return (
    <div className="optimized-map-page">
      {/* Performance info panel */}
      <div className="performance-info">
        <div className="info-item">
          <span className="info-label">Stores:</span>
          <span className="info-value">{counts.mapVisible}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Active:</span>
          <span className="info-value active">{counts.activeMapVisible}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Total:</span>
          <span className="info-value">{counts.total}</span>
        </div>
        {loading && (
          <div className="info-item">
            <span className="info-label">Status:</span>
            <span className="info-value loading">Loading...</span>
          </div>
        )}
      </div>

      {/* Map with error boundary */}
      <MapErrorBoundary
        onError={handleMapError}
        fallbackComponent={fallbackComponent}
        stores={mapStores}
      >
        <MapView
          stores={mapStores}
          onStoreSelect={handleStoreSelect}
          viewport={viewport}
          onViewportChange={handleViewportChange}
          loading={loading}
        />
      </MapErrorBoundary>

      {/* Store details panel */}
      {selectedStore && (
        <div className="store-details">
          <div className="details-header">
            <h4>{selectedStore.name}</h4>
            <button 
              onClick={() => setSelectedStore(null)}
              className="close-button"
              aria-label="Close store details"
            >
              ×
            </button>
          </div>
          <div className="details-content">
            <div className="detail-item">
              <span className="detail-label">Location:</span>
              <span className="detail-value">{selectedStore.country}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Region:</span>
              <span className="detail-value">{selectedStore.region}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status:</span>
              <span className={`detail-value ${selectedStore.recentActivity ? 'active' : 'inactive'}`}>
                {selectedStore.recentActivity ? '🟢 Active' : '⚪ Inactive'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Coordinates:</span>
              <span className="detail-value coordinates">
                {selectedStore.latitude.toFixed(4)}, {selectedStore.longitude.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .optimized-map-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 100%;
        }
        
        .performance-info {
          display: flex;
          gap: 24px;
          padding: 16px;
          background: var(--s-surface);
          border: 1px solid var(--s-border);
          border-radius: 8px;
          align-items: center;
        }
        
        .info-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .info-label {
          font-size: 14px;
          color: var(--s-muted);
          font-weight: 500;
        }
        
        .info-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--s-text);
        }
        
        .info-value.active {
          color: #22c55e;
        }
        
        .info-value.loading {
          color: var(--s-primary);
        }
        
        .store-details {
          background: var(--s-surface);
          border: 1px solid var(--s-border);
          border-radius: 8px;
          padding: 0;
          overflow: hidden;
        }
        
        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: var(--s-panel);
          border-bottom: 1px solid var(--s-border);
        }
        
        .details-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--s-text);
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 20px;
          color: var(--s-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          line-height: 1;
        }
        
        .close-button:hover {
          background: var(--s-hover);
          color: var(--s-text);
        }
        
        .details-content {
          padding: 16px;
        }
        
        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--s-border);
        }
        
        .detail-item:last-child {
          border-bottom: none;
        }
        
        .detail-label {
          font-size: 14px;
          color: var(--s-muted);
          font-weight: 500;
        }
        
        .detail-value {
          font-size: 14px;
          color: var(--s-text);
          font-weight: 500;
        }
        
        .detail-value.active {
          color: #22c55e;
        }
        
        .detail-value.inactive {
          color: var(--s-muted);
        }
        
        .detail-value.coordinates {
          font-family: monospace;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}