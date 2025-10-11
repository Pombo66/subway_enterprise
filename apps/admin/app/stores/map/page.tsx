'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMapState } from './hooks/useMapState';
import { useStores } from './hooks/useStores';
import MapFilters from './components/MapFilters';
import StoreDrawer from './components/StoreDrawer';
import TabNavigation from '../components/TabNavigation';
import { MapErrorBoundary } from './components/MapErrorBoundary';
import { MapLoadingSkeleton, FilterLoadingSkeleton, ErrorStateWithRetry } from './components/LoadingSkeletons';
import { MapTelemetryHelpers, safeTrackEvent, getCurrentUserId, resetMapSessionId } from './telemetry';
import { MapPerformanceHelpers } from './performance';

// Dynamically import MapLibre CSS only on this page to avoid global bloat
const MapView = dynamic(() => import('./components/MapView'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      height: '600px', 
      backgroundColor: 'var(--s-bg-secondary)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ textAlign: 'center', color: 'var(--s-muted)' }}>
        <div style={{ 
          fontSize: '48px', 
          marginBottom: '16px',
          animation: 'pulse 2s infinite'
        }}>
          🗺️
        </div>
        <div style={{ marginBottom: '16px' }}>Loading map...</div>
        <div className="loading-spinner" />
      </div>
    </div>
  )
});

// Import the demo component to show data integration
const StoreDataDemo = dynamic(() => import('./components/StoreDataDemo'), {
  ssr: false,
});

// Remove the old MapLoadingSkeleton function since we're importing it from LoadingSkeletons

function MapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize map state and store data hooks
  const { viewport, filters, selectedStoreId, setViewport, setFilters, setSelectedStoreId } = useMapState();
  const { stores, loading, error, availableOptions } = useStores(filters);
  
  // Track initial map view opened event and initialize performance monitoring
  useEffect(() => {
    try {
      // Initialize performance monitoring
      const performanceMonitor = MapPerformanceHelpers.getMonitor();
      
      // Track page load performance
      if (typeof window !== 'undefined' && window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
        
        if (pageLoadTime > 0) { // Only track if we have a valid load time
          performanceMonitor.trackPerformanceMetric({
            name: 'map_page_load_time',
            value: pageLoadTime,
            unit: 'ms',
            context: 'page_initialization',
            metadata: {
              referrer: document.referrer || 'direct',
              userAgent: navigator.userAgent,
            },
          });
        }
      }
    } catch (error) {
      console.warn('Error initializing performance monitoring:', error);
    }
    
    safeTrackEvent(() => {
      MapTelemetryHelpers.trackMapViewOpened(getCurrentUserId(), {
        initialFilters: filters,
        initialViewport: viewport,
        referrer: document.referrer || 'direct',
        userAgent: navigator.userAgent,
      });
    }, 'map_view_opened');
    
    // Cleanup function to reset session and cleanup performance monitoring
    return () => {
      resetMapSessionId();
      MapPerformanceHelpers.cleanup();
    };
  }, []); // Only run once on mount

  // Handle redirect from ?view=map parameter on /stores
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'map' && typeof window !== 'undefined' && window.location.pathname === '/stores') {
      router.replace('/stores/map');
    }
  }, [router, searchParams]);

  const handleStoreSelect = (store: any) => {
    setSelectedStoreId(store.id);
  };

  const handleBackToStores = () => {
    router.push('/stores');
  };

  const handleNavigateToStoreDetails = (storeId: string) => {
    router.push(`/stores/${storeId}`);
  };

  const handleCloseDrawer = () => {
    setSelectedStoreId(null);
  };

  const handleNavigateToDetails = (storeId: string) => {
    handleNavigateToStoreDetails(storeId);
  };

  // Find the selected store
  const selectedStore = selectedStoreId ? stores.find(s => s.id === selectedStoreId) || null : null;

  if (error) {
    return (
      <div className="s-wrap">
        <div className="menu-header-section">
          <div>
            <h1 className="s-h1">Store Management</h1>
            <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
              Interactive map view of all store locations
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <TabNavigation activeTab="map" />

        <div className="s-panel">
          <div className="s-panelCard">
            <ErrorStateWithRetry
              message={`Failed to load store data: ${error}`}
              onRetry={() => window.location.reload()}
              retryLabel="Reload Page"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="s-wrap">
      <div className="menu-header-section">
        <div>
          <h1 className="s-h1">Store Management</h1>
          <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
            Interactive map view of all store locations
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation activeTab="map" />

      {/* Filters */}
      {loading && stores.length === 0 ? (
        <FilterLoadingSkeleton />
      ) : (
        <MapFilters
          filters={filters}
          onFiltersChange={setFilters}
          availableOptions={availableOptions}
          loading={loading}
        />
      )}

      <div className="s-panel">
        <div className="s-panelCard">
          <div className="s-panelHeader">
            <div className="s-panelT">
              {loading && stores.length === 0 ? (
                <span>
                  Store Locations 
                  <span style={{ marginLeft: '8px' }}>
                    <span className="loading-spinner-small" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                  </span>
                </span>
              ) : (
                <>
                  Store Locations ({stores.length})
                  {loading && <span style={{ color: 'var(--s-muted)', fontWeight: 'normal' }}> • Updating...</span>}
                </>
              )}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--s-muted)' }}>
              {loading && stores.length === 0 ? (
                <div className="skeleton-text" style={{ width: '200px', height: '14px' }} />
              ) : (
                <>
                  Map view • Clustering enabled
                  {stores.some(s => s.recentActivity) && (
                    <span> • {stores.filter(s => s.recentActivity).length} active</span>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div style={{ height: '600px' }}>
            <MapErrorBoundary>
              <MapView
                stores={stores}
                onStoreSelect={handleStoreSelect}
                viewport={viewport}
                onViewportChange={setViewport}
                loading={loading}
              />
            </MapErrorBoundary>
          </div>
        </div>
      </div>

      {/* Store Details Drawer */}
      <StoreDrawer
        store={selectedStore}
        isOpen={!!selectedStoreId}
        onClose={handleCloseDrawer}
        onNavigateToDetails={handleNavigateToDetails}
      />
    </div>
  );
}



export default function MapPage() {
  return (
    <main>
      <Suspense fallback={<MapLoadingSkeleton />}>
        <MapPageContent />
      </Suspense>
      
      {/* Demo component showing useStores integration */}
      <Suspense fallback={<div>Loading store data...</div>}>
        <StoreDataDemo />
      </Suspense>

      {/* Add CSS for loading states */}
      <style jsx global>{`
        .loading-spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid var(--s-border);
          border-top: 2px solid var(--s-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .skeleton-text {
          background: linear-gradient(90deg, var(--s-bg-secondary) 25%, var(--s-border) 50%, var(--s-bg-secondary) 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s infinite;
          border-radius: 4px;
          display: inline-block;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes skeleton-loading {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .loading-spinner-small {
            animation: none;
            border-top-color: var(--s-border);
          }
          .skeleton-text {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}