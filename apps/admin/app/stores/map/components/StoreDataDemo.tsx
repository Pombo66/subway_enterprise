/**
 * Demo component showing integration of useStores and useMapState hooks
 * This demonstrates the complete data flow for the Living Map feature
 */

'use client';

import { useStores } from '../hooks/useStores';
import { useMapState } from '../hooks/useMapState';

export default function StoreDataDemo() {
  const { viewport, filters, selectedStoreId, setFilters, setSelectedStoreId } = useMapState();
  const { stores, loading, error, refetch, availableOptions } = useStores(filters);

  if (loading) {
    return (
      <div className="s-panel">
        <div className="s-panelCard">
          <div className="s-panelHeader">
            <p className="s-panelT">Loading Store Data...</p>
          </div>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div className="loading-spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="s-panel">
        <div className="s-panelCard">
          <div className="s-panelHeader">
            <p className="s-panelT">Error Loading Stores</p>
          </div>
          <div style={{ padding: '20px' }}>
            <p style={{ color: 'var(--s-error)', marginBottom: '16px' }}>{error}</p>
            <button onClick={refetch} className="s-btn btn-primary">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeStores = stores.filter(s => s.recentActivity);
  const mockActivityStores = stores.filter(s => s.__mockActivity);

  return (
    <div className="s-panel">
      <div className="s-panelCard">
        <div className="s-panelHeader">
          <p className="s-panelT">Store Data Integration Demo</p>
          <button onClick={refetch} className="s-btn btn-secondary">
            Refresh Data
          </button>
        </div>
        
        <div style={{ padding: '20px' }}>
          {/* Summary Stats */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div className="s-card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--s-primary)' }}>
                {stores.length}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--s-muted)' }}>Total Stores</div>
            </div>
            
            <div className="s-card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--s-success)' }}>
                {activeStores.length}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--s-muted)' }}>Active Stores</div>
            </div>
            
            {process.env.NEXT_PUBLIC_DEBUG === 'true' && (
              <div className="s-card" style={{ padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--s-warning)' }}>
                  {mockActivityStores.length}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--s-muted)' }}>Mock Activity</div>
              </div>
            )}
          </div>

          {/* Filter Controls */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Filters</h3>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                  Region
                </label>
                <select 
                  value={filters.region || ''} 
                  onChange={(e) => setFilters({ ...filters, region: e.target.value || undefined })}
                  className="s-input"
                  style={{ minWidth: '150px' }}
                >
                  <option value="">All Regions</option>
                  {availableOptions.regions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                  Country
                </label>
                <select 
                  value={filters.country || ''} 
                  onChange={(e) => setFilters({ ...filters, country: e.target.value || undefined })}
                  className="s-input"
                  style={{ minWidth: '150px' }}
                >
                  <option value="">All Countries</option>
                  {availableOptions.countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'end' }}>
                <button 
                  onClick={() => setFilters({})}
                  className="s-btn btn-secondary"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Current State Display */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Current State</h3>
            <div className="s-card" style={{ padding: '16px', backgroundColor: 'var(--s-bg-secondary)' }}>
              <pre style={{ fontSize: '12px', margin: 0, overflow: 'auto' }}>
                {JSON.stringify({
                  viewport,
                  filters,
                  selectedStoreId,
                  storeCount: stores.length,
                  activeStoreCount: activeStores.length,
                }, null, 2)}
              </pre>
            </div>
          </div>

          {/* Store List */}
          <div>
            <h3 style={{ marginBottom: '16px' }}>Stores</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {stores.map(store => (
                <div 
                  key={store.id}
                  className="s-card"
                  style={{ 
                    padding: '12px', 
                    marginBottom: '8px',
                    cursor: 'pointer',
                    border: selectedStoreId === store.id ? '2px solid var(--s-primary)' : undefined,
                    backgroundColor: store.recentActivity ? 'var(--s-success-bg)' : undefined
                  }}
                  onClick={() => setSelectedStoreId(selectedStoreId === store.id ? null : store.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{store.name}</div>
                      <div style={{ fontSize: '14px', color: 'var(--s-muted)' }}>
                        {store.region} • {store.country}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--s-muted)' }}>
                        {store.latitude.toFixed(4)}, {store.longitude.toFixed(4)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {store.recentActivity && (
                        <div style={{ 
                          display: 'inline-block',
                          padding: '4px 8px',
                          backgroundColor: 'var(--s-success)',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '12px',
                          marginBottom: '4px'
                        }}>
                          Active
                        </div>
                      )}
                      {store.__mockActivity && (
                        <div style={{ 
                          display: 'block',
                          fontSize: '10px',
                          color: 'var(--s-warning)',
                          fontStyle: 'italic'
                        }}>
                          Mock Data
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}