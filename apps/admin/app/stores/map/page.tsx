'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMapState } from './hooks/useMapState';
import { useStores } from './hooks/useStores';
import MapFilters from './components/MapFilters';
import StoreDrawer from './components/StoreDrawer';
import TabNavigation from '../components/TabNavigation';
import { SimpleErrorBoundary } from './components/SimpleErrorBoundary';
import { MapLoadingSkeleton, FilterLoadingSkeleton, ErrorStateWithRetry } from './components/LoadingSkeletons';
import { MapTelemetryHelpers, safeTrackEvent, getCurrentUserId, resetMapSessionId } from './telemetry';
import WorkingMapView from './components/WorkingMapView';
import StorePerformanceTable from './components/StorePerformanceTable';
import ExpansionIntegratedMapPage from './components/ExpansionIntegratedMapPage';
import { FeatureFlags } from '../../../lib/featureFlags';
import { onStoresImported } from '../../../lib/events/store-events';



// Remove the old MapLoadingSkeleton function since we're importing it from LoadingSkeletons

function MapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize map state and store data hooks
  const { viewport, filters, selectedStoreId, setViewport, setFilters, setSelectedStoreId } = useMapState();
  
  // Debug the filters being passed to useStores
  console.log('🔍 MapPage: Calling useStores with filters:', filters);
  
  const { stores, loading, error, availableOptions, refetch } = useStores(filters);
  
  // Debug the results from useStores
  console.log('🔍 MapPage: useStores results:', {
    storesCount: stores.length,
    loading,
    error,
    availableOptionsCount: Object.keys(availableOptions).length
  });
  
  // Track initial map view opened event
  useEffect(() => {
    safeTrackEvent(() => {
      MapTelemetryHelpers.trackMapViewOpened(getCurrentUserId(), {
        initialFilters: filters,
        initialViewport: viewport,
        referrer: document.referrer || 'direct',
        userAgent: navigator.userAgent,
      });
    }, 'map_view_opened');
    
    // Cleanup function to reset session
    return () => {
      resetMapSessionId();
    };
  }, []); // Only run once on mount

  // Listen for store import events and refresh map data
  useEffect(() => {
    console.log('🗺️ Map page: Setting up stores-imported event listener');
    const unsubscribe = onStoresImported((event) => {
      console.log('🗺️ Map page: Received stores-imported event:', {
        timestamp: event.timestamp,
        data: event.data
      });
      console.log('🔄 Map page: Triggering full refetch...');
      refetch();
    });

    // Listen for single store updates (more efficient than full refetch)
    const handleStoreUpdate = (event: CustomEvent) => {
      console.log('🗺️ Map page: Received store-updated event:', event.detail);
      console.log('🔄 Map page: Triggering refetch for updated store...');
      refetch(); // This is still efficient because the API call is fast
    };

    window.addEventListener('store-updated', handleStoreUpdate as EventListener);

    return () => {
      console.log('🗺️ Map page: Cleaning up event listeners');
      unsubscribe();
      window.removeEventListener('store-updated', handleStoreUpdate as EventListener);
    };
  }, [refetch]);

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

  // Check if expansion predictor feature is enabled
  const isExpansionFeatureEnabled = FeatureFlags.isExpansionPredictorEnabled();
  
  // If expansion feature is enabled, use the integrated map page
  if (isExpansionFeatureEnabled) {
    return <ExpansionIntegratedMapPage />;
  }

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
            <SimpleErrorBoundary
              onError={(error, errorInfo) => {
                console.error('Map error caught by boundary:', error, errorInfo);
              }}
            >
              <WorkingMapView
                key="main-map"
                stores={stores}
                onStoreSelect={handleStoreSelect}
                viewport={viewport}
                onViewportChange={setViewport}
                loading={loading}
              />
            </SimpleErrorBoundary>
          </div>
        </div>
      </div>

      {/* Store Performance Table */}
      <StorePerformanceTable
        stores={stores}
        onStoreSelect={handleStoreSelect}
      />

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
      


      {/* Add CSS for loading states */}
      <style jsx global>{`
        .loading-spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid var(--s-border);
          border-top: 2px solid var(--s-accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .skeleton-text {
          background: linear-gradient(90deg, var(--s-panel) 25%, var(--s-border) 50%, var(--s-panel) 75%);
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