'use client';

import { StoreWithActivity } from '../types';

interface MapFallbackViewProps {
  stores: StoreWithActivity[];
  loading?: boolean;
  error?: string;
  onStoreSelect?: (store: StoreWithActivity) => void;
  onRetryMap?: () => void;
}

/**
 * Simple fallback view when map fails to load
 * Shows a basic list of stores as an alternative
 */
export default function MapFallbackView({
  stores,
  loading = false,
  error,
  onStoreSelect,
  onRetryMap
}: MapFallbackViewProps) {
  return (
    <div style={{
      height: '100%',
      backgroundColor: 'var(--s-bg-secondary)',
      borderRadius: '8px',
      border: '1px solid var(--s-border)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--s-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h3 style={{ 
            margin: 0, 
            fontSize: '16px', 
            fontWeight: '600',
            color: 'var(--s-text)'
          }}>
            Store Locations
          </h3>
          {error && (
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '12px', 
              color: 'var(--s-muted)' 
            }}>
              Map unavailable - showing list view
            </p>
          )}
        </div>
        
        {onRetryMap && (
          <button
            onClick={onRetryMap}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              backgroundColor: 'var(--s-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Try Map Again
          </button>
        )}
      </div>

      {/* Store List */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '8px',
      }}>
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: 'var(--s-muted)',
          }}>
            Loading stores...
          </div>
        ) : stores.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: 'var(--s-muted)',
          }}>
            No stores found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {stores.map((store) => (
              <div
                key={store.id}
                onClick={() => onStoreSelect?.(store)}
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--s-bg-primary)',
                  border: '1px solid var(--s-border)',
                  borderRadius: '6px',
                  cursor: onStoreSelect ? 'pointer' : 'default',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (onStoreSelect) {
                    e.currentTarget.style.backgroundColor = 'var(--s-bg-tertiary)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--s-bg-primary)';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{
                      fontWeight: '500',
                      fontSize: '14px',
                      color: 'var(--s-text)',
                      marginBottom: '2px',
                    }}>
                      {store.name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--s-muted)',
                    }}>
                      {store.region} • {store.country}
                    </div>
                  </div>
                  
                  {store.recentActivity && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#22c55e',
                      borderRadius: '50%',
                      animation: 'pulse 2s infinite',
                    }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--s-border)',
        fontSize: '12px',
        color: 'var(--s-muted)',
        textAlign: 'center',
      }}>
        Showing {stores.length} store{stores.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}