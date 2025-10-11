'use client';

import React from 'react';

/**
 * Loading skeleton for the map component
 * Provides visual feedback while the map is initializing
 */
export function MapLoadingSkeleton() {
  return (
    <div className="s-wrap">
      <div className="menu-header-section">
        <div>
          <h1 className="s-h1">Store Map</h1>
          <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
            Interactive map view of all store locations
          </p>
        </div>
        <div className="skeleton-button" style={{ width: '120px', height: '36px' }} />
      </div>
      
      {/* Filter skeleton */}
      <div className="s-panel" style={{ marginBottom: '16px' }}>
        <div className="s-panelCard">
          <div className="s-panelHeader">
            <div className="skeleton-text" style={{ width: '100px', height: '16px' }} />
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div className="skeleton-select" style={{ width: '200px', height: '36px' }} />
            <div className="skeleton-select" style={{ width: '150px', height: '36px' }} />
            <div className="skeleton-select" style={{ width: '150px', height: '36px' }} />
          </div>
        </div>
      </div>

      {/* Map skeleton */}
      <div className="s-panel">
        <div className="s-panelCard">
          <div className="s-panelHeader">
            <div className="skeleton-text" style={{ width: '150px', height: '18px' }} />
            <div className="skeleton-text" style={{ width: '200px', height: '14px' }} />
          </div>
          
          <div style={{ 
            height: '600px', 
            backgroundColor: 'var(--s-bg-secondary)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Animated loading indicator */}
            <div style={{ textAlign: 'center', color: 'var(--s-muted)' }}>
              <div style={{ 
                fontSize: '48px', 
                marginBottom: '16px',
                animation: 'pulse 2s infinite'
              }}>
                🗺️
              </div>
              <div style={{ marginBottom: '16px', fontSize: '16px' }}>Loading map...</div>
              <div className="loading-spinner" />
            </div>

            {/* Skeleton map elements */}
            <div className="skeleton-map-overlay" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for the store drawer
 * Shows while store details and KPIs are being fetched
 */
export function DrawerLoadingSkeleton() {
  return (
    <div style={{ padding: '24px' }}>
      {/* Store header skeleton */}
      <div style={{ marginBottom: '24px' }}>
        <div className="skeleton-text" style={{ width: '200px', height: '24px', marginBottom: '8px' }} />
        <div className="skeleton-text" style={{ width: '150px', height: '16px', marginBottom: '4px' }} />
        <div className="skeleton-text" style={{ width: '120px', height: '16px' }} />
      </div>

      {/* KPI skeletons */}
      <div style={{ marginBottom: '24px' }}>
        <div className="skeleton-text" style={{ width: '80px', height: '16px', marginBottom: '16px' }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Orders today */}
          <div style={{ 
            padding: '16px', 
            backgroundColor: 'var(--s-bg-secondary)', 
            borderRadius: '8px',
            border: '1px solid var(--s-border)'
          }}>
            <div className="skeleton-text" style={{ width: '100px', height: '14px', marginBottom: '8px' }} />
            <div className="skeleton-text" style={{ width: '60px', height: '20px' }} />
          </div>

          {/* Revenue today */}
          <div style={{ 
            padding: '16px', 
            backgroundColor: 'var(--s-bg-secondary)', 
            borderRadius: '8px',
            border: '1px solid var(--s-border)'
          }}>
            <div className="skeleton-text" style={{ width: '100px', height: '14px', marginBottom: '8px' }} />
            <div className="skeleton-text" style={{ width: '80px', height: '20px' }} />
          </div>

          {/* Last order */}
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

      {/* Action button skeleton */}
      <div className="skeleton-button" style={{ width: '100%', height: '40px' }} />
    </div>
  );
}

/**
 * Inline loading indicator for data updates
 * Used when refreshing data without blocking the entire interface
 */
export function InlineLoadingIndicator({ message = 'Loading...' }: { message?: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: 'var(--s-bg)',
      border: '1px solid var(--s-border)',
      borderRadius: '4px',
      fontSize: '14px',
      color: 'var(--s-muted)',
    }}>
      <div className="loading-spinner-small" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Progressive loading indicator for map markers
 * Shows loading state while markers are being rendered
 */
export function MarkerLoadingOverlay({ count }: { count: number }) {
  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '16px',
      padding: '8px 12px',
      backgroundColor: 'var(--s-bg)',
      border: '1px solid var(--s-border)',
      borderRadius: '4px',
      fontSize: '14px',
      color: 'var(--s-muted)',
      zIndex: 1000,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className="loading-spinner-small" />
        <span>Loading {count} stores...</span>
      </div>
    </div>
  );
}

/**
 * Filter loading skeleton
 * Shows while filter options are being loaded
 */
export function FilterLoadingSkeleton() {
  return (
    <div className="s-panel" style={{ marginBottom: '16px' }}>
      <div className="s-panelCard">
        <div className="s-panelHeader">
          <div className="skeleton-text" style={{ width: '100px', height: '16px' }} />
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div className="skeleton-select" style={{ width: '200px', height: '36px' }} />
          <div className="skeleton-select" style={{ width: '150px', height: '36px' }} />
          <div className="skeleton-select" style={{ width: '150px', height: '36px' }} />
        </div>
      </div>
    </div>
  );
}

/**
 * Error state with retry option
 * Used for recoverable errors in data loading
 */
export function ErrorStateWithRetry({ 
  message, 
  onRetry, 
  retryLabel = 'Try Again' 
}: { 
  message: string; 
  onRetry: () => void; 
  retryLabel?: string; 
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      textAlign: 'center',
      gap: '16px',
    }}>
      <div style={{ 
        fontSize: '32px', 
        color: 'var(--s-error)', 
        marginBottom: '8px' 
      }}>
        ⚠️
      </div>
      
      <div>
        <div style={{ 
          color: 'var(--s-error)', 
          fontSize: '16px', 
          fontWeight: '600',
          marginBottom: '8px' 
        }}>
          Something went wrong
        </div>
        <div style={{ 
          color: 'var(--s-muted)', 
          fontSize: '14px',
          marginBottom: '16px',
          maxWidth: '400px',
          lineHeight: '1.4'
        }}>
          {message}
        </div>
      </div>

      <button 
        onClick={onRetry}
        className="s-btn btn-primary"
      >
        {retryLabel}
      </button>
    </div>
  );
}