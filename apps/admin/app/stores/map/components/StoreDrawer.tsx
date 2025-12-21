'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, ExternalLink, MapPin, Building, Globe, TrendingUp, Clock, DollarSign, RefreshCw } from 'lucide-react';
import { StoreDrawerProps } from '../types';
import { useStoreKPIs } from '../hooks/useStoreKPIs';
import { DrawerLoadingSkeleton, ErrorStateWithRetry } from './LoadingSkeletons';
import ClientTimeDisplay from './ClientTimeDisplay';
import CompetitorPanel, { CompetitorResult, NearbyCompetitorsResponse } from './CompetitorPanel';
import styles from './StoreDrawer.module.css';

/**
 * StoreDrawer component displays detailed store information in a slide-out drawer
 * Includes store metadata, KPIs, and navigation to detailed store view
 */
export default function StoreDrawer({ 
  store, 
  isOpen, 
  onClose, 
  onNavigateToDetails,
  onCompetitorsLoaded,
  onCompetitorsCleared,
  showCompetitorPanel = false
}: StoreDrawerProps) {
  const router = useRouter();
  const drawerRef = useRef<HTMLDivElement>(null);
  
  // Fetch KPIs for the selected store
  const { kpis, loading: loadingKpis, error: kpisError, refetch } = useStoreKPIs(store?.id || null);

  // Handle competitor data loaded
  const handleCompetitorsLoaded = useCallback((results: CompetitorResult[], response: NearbyCompetitorsResponse) => {
    if (onCompetitorsLoaded && store) {
      onCompetitorsLoaded(results, { lat: store.latitude, lng: store.longitude });
    }
  }, [onCompetitorsLoaded, store]);

  // Handle competitors cleared
  const handleCompetitorsCleared = useCallback(() => {
    if (onCompetitorsCleared) {
      onCompetitorsCleared();
    }
  }, [onCompetitorsCleared]);

  // Handle keyboard navigation and focus management
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
      
      // Handle Tab key to trap focus within drawer
      if (event.key === 'Tab' && isOpen) {
        const drawer = drawerRef.current;
        if (!drawer) return;
        
        const focusableElements = drawer.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      
      // Focus the close button initially for better UX
      setTimeout(() => {
        const closeButton = drawerRef.current?.querySelector('[aria-label="Close store details"]') as HTMLElement;
        closeButton?.focus();
      }, 100);
      
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle click outside to close
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle navigation to store details
  const handleNavigateToDetails = useCallback(() => {
    if (store) {
      onNavigateToDetails(store.id);
      router.push(`/stores/${store.id}`);
    }
  }, [store, onNavigateToDetails, router]);

  // Handle KPI refresh
  const handleRefreshKPIs = useCallback(() => {
    refetch();
  }, [refetch]);

  if (!isOpen || !store) {
    return null;
  }

  return (
    <div 
      className={styles['store-drawer-backdrop']}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-drawer-title"
      aria-describedby="store-drawer-description"
    >
      <div 
        ref={drawerRef}
        className={styles['store-drawer']}
        tabIndex={-1}
        role="document"
        aria-label={`Store details for ${store.name}`}
      >
        {/* Header */}
        <div className={styles['store-drawer-header']}>
          <div className={styles['store-drawer-title-section']}>
            <h2 id="store-drawer-title" className={styles['store-drawer-title']}>
              {store.name}
            </h2>
            <div 
              id="store-drawer-description"
              className={styles['store-drawer-subtitle']}
            >
              <MapPin size={14} aria-hidden="true" />
              <span>{store.region} • {store.country}</span>
              {store.recentActivity && (
                <div 
                  className={styles['store-activity-badge']}
                  role="status"
                  aria-label="Store has recent activity"
                >
                  <div className={styles['activity-pulse']} aria-hidden="true" />
                  Active
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className={styles['store-drawer-close']}
            aria-label="Close store details"
            title="Close store details (Escape key)"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Store Metadata */}
        <div className={styles['store-drawer-content']}>
          <div className={styles['store-metadata-section']}>
            <h3 className={styles['section-title']}>Store Information</h3>
            <div 
              className={styles['metadata-grid']}
              role="list"
              aria-label="Store information details"
            >
              <div className={styles['metadata-item']} role="listitem">
                <Building size={16} aria-hidden="true" />
                <div>
                  <div className={styles['metadata-label']}>Store ID</div>
                  <div className={styles['metadata-value']} aria-label={`Store ID: ${store.id}`}>
                    {store.id}
                  </div>
                </div>
              </div>
              <div className={styles['metadata-item']} role="listitem">
                <Globe size={16} aria-hidden="true" />
                <div>
                  <div className={styles['metadata-label']}>Location</div>
                  <div className={styles['metadata-value']} aria-label={`Location: ${store.region}, ${store.country}`}>
                    {store.region}, {store.country}
                  </div>
                </div>
              </div>           
              <div className={styles['metadata-item']} role="listitem">
                <Building size={16} aria-hidden="true" />
                <div>
                  <div className={styles['metadata-label']}>Franchisee</div>
                  <div className={styles['metadata-value']} aria-label={`Franchisee: ${store.ownerName || 'Not available'}`}>
                    {store.ownerName || '-'}
                  </div>
                </div>
              </div>
              <div className={styles['metadata-item']} role="listitem">
                <MapPin size={16} aria-hidden="true" />
                <div>
                  <div className={styles['metadata-label']}>Coordinates</div>
                  <div 
                    className={styles['metadata-value']} 
                    aria-label={`Coordinates: Latitude ${store.latitude.toFixed(4)}, Longitude ${store.longitude.toFixed(4)}`}
                  >
                    {store.latitude.toFixed(4)}, {store.longitude.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KPIs Section */}
          <div className={styles['store-kpis-section']}>
            <div className={styles['section-header']}>
              <h3 className={styles['section-title']}>Performance Today</h3>
              {kpisError && (
                <button
                  onClick={handleRefreshKPIs}
                  className={styles['refresh-button']}
                  title="Retry loading KPIs"
                  aria-label="Retry loading performance data"
                >
                  Retry
                </button>
              )}
            </div>
            
            {loadingKpis ? (
              <div className={styles['kpis-loading']}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Orders today skeleton */}
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: 'var(--s-bg-secondary)', 
                    borderRadius: '8px',
                    border: '1px solid var(--s-border)'
                  }}>
                    <div className="skeleton-text" style={{ width: '100px', height: '14px', marginBottom: '8px' }} />
                    <div className="skeleton-text" style={{ width: '60px', height: '20px' }} />
                  </div>

                  {/* Revenue today skeleton */}
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: 'var(--s-bg-secondary)', 
                    borderRadius: '8px',
                    border: '1px solid var(--s-border)'
                  }}>
                    <div className="skeleton-text" style={{ width: '100px', height: '14px', marginBottom: '8px' }} />
                    <div className="skeleton-text" style={{ width: '80px', height: '20px' }} />
                  </div>

                  {/* Last order skeleton */}
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: 'var(--s-bg-secondary)', 
                    borderRadius: '8px',
                    border: '1px solid var(--s-border)'
                  }}>
                    <div className="skeleton-text" style={{ width: '80px', height: '14px', marginBottom: '8px' }} />
                    <div className="skeleton-text" style={{ width: '120px', height: '20px' }} />
                  </div>
                </div>
              </div>
            ) : kpisError ? (
              <div className={styles['kpis-error']}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '24px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: 'var(--s-error)', fontSize: '24px' }}>⚠️</div>
                  <div style={{ color: 'var(--s-error)', fontSize: '14px', fontWeight: '600' }}>
                    Failed to load performance data
                  </div>
                  <div style={{ color: 'var(--s-muted)', fontSize: '12px' }}>
                    Unable to fetch KPIs for this store
                  </div>
                  <button
                    onClick={handleRefreshKPIs}
                    className="s-btn btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    <RefreshCw size={12} style={{ marginRight: '4px' }} />
                    Try Again
                  </button>
                </div>
              </div>
            ) : kpis ? (
              <div 
                className={styles['kpis-grid']}
                role="list"
                aria-label="Store performance metrics for today"
              >
                <div className={styles['kpi-card']} role="listitem">
                  <div className={styles['kpi-icon']} aria-hidden="true" style={{ color: '#f97316' }}>
                    <TrendingUp size={20} />
                  </div>
                  <div className={styles['kpi-content']}>
                    <div 
                      className={styles['kpi-value']}
                      aria-label={`${kpis.ordersToday} orders today`}
                    >
                      {kpis.ordersToday}
                    </div>
                    <div className={styles['kpi-label']}>Orders Today</div>
                  </div>
                </div>  
                <div className={styles['kpi-card']} role="listitem">
                  <div className={styles['kpi-icon']} aria-hidden="true" style={{ color: '#10b981' }}>
                    <DollarSign size={20} />
                  </div>
                  <div className={styles['kpi-content']}>
                    <div 
                      className={styles['kpi-value']}
                      aria-label={`$${kpis.revenueToday.toFixed(2)} revenue today`}
                    >
                      ${kpis.revenueToday.toFixed(2)}
                    </div>
                    <div className={styles['kpi-label']}>Revenue Today</div>
                  </div>
                </div>
                <div className={styles['kpi-card']} role="listitem">
                  <div className={styles['kpi-icon']} aria-hidden="true" style={{ color: '#3b82f6' }}>
                    <Clock size={20} />
                  </div>
                  <div className={styles['kpi-content']}>
                    <ClientTimeDisplay fallback={
                      <div className={styles['kpi-value']}>
                        Loading...
                      </div>
                    }>
                      <div 
                        className={styles['kpi-value']}
                        aria-label={`Last order was ${kpis.lastOrderRelative}`}
                      >
                        {kpis.lastOrderRelative}
                      </div>
                    </ClientTimeDisplay>
                    <div className={styles['kpi-label']}>Last Order</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Competitor Analysis Panel - Only shown on Intelligence Map */}
          {showCompetitorPanel && store && (
            <div className={styles['store-competitor-section']} style={{
              marginTop: '16px',
              padding: '16px',
              background: '#1f2937',
              borderRadius: '8px',
              border: '1px solid #374151'
            }}>
              <CompetitorPanel
                selectedLocation={{ lat: store.latitude, lng: store.longitude }}
                onCompetitorsLoaded={handleCompetitorsLoaded}
                onCompetitorsCleared={handleCompetitorsCleared}
              />
            </div>
          )}

          {/* Actions */}
          <div className={styles['store-actions-section']}>
            <button
              onClick={handleNavigateToDetails}
              className={`${styles['store-action-button']} ${styles['primary']}`}
              aria-label={`Open detailed view for ${store.name} store`}
              title="Navigate to the full store details page"
            >
              <ExternalLink size={16} aria-hidden="true" />
              Open in Stores → Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}