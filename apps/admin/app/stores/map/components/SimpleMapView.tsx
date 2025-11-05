'use client';

import { useEffect, useRef, useState } from 'react';
import { MapViewProps } from '../types';

/**
 * Ultra-simple MapView that works without MapLibre for testing
 */
export default function SimpleMapView({ 
  stores, 
  onStoreSelect, 
  viewport, 
  onViewportChange,
  loading = false 
}: MapViewProps) {
  const [mounted, setMounted] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // Only run on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize map after component mounts
  useEffect(() => {
    if (!mounted || !mapRef.current) return;

    console.log('🗺️ Initializing simple map view...');
    
    // Simulate map loading
    const timer = setTimeout(() => {
      setMapLoaded(true);
      console.log('✅ Simple map loaded');
    }, 1000);

    return () => clearTimeout(timer);
  }, [mounted]);

  if (!mounted) {
    return (
      <div style={{ 
        width: '100%', 
        height: '600px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--s-panel)',
        borderRadius: '8px',
        border: '1px solid var(--s-border)'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (loading || !mapLoaded) {
    return (
      <div style={{ 
        width: '100%', 
        height: '600px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--s-panel)',
        borderRadius: '8px',
        border: '1px solid var(--s-border)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--s-text)', marginBottom: '8px' }}>
            {loading ? 'Loading stores...' : 'Initializing map...'}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--s-muted)' }}>
            {stores.length > 0 && `${stores.length} stores ready`}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '600px', 
      borderRadius: '8px', 
      overflow: 'hidden',
      border: '1px solid var(--s-border)',
      background: '#f0f8ff'
    }}>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: 'white'
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🗺️</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
          Living Map Active
        </div>
        <div style={{ fontSize: '16px', marginBottom: '20px' }}>
          {stores.length} stores • {stores.filter(s => s.recentActivity).length} active
        </div>
        
        {/* Store grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '10px',
          maxWidth: '400px'
        }}>
          {stores.slice(0, 8).map(store => (
            <div 
              key={store.id}
              onClick={() => onStoreSelect(store)}
              style={{
                padding: '8px',
                background: store.recentActivity ? '#22c55e' : '#3b82f6',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'transform 0.2s',
                border: '2px solid rgba(255,255,255,0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {store.name.split(' ')[0]}
              <br />
              <small>{store.country}</small>
            </div>
          ))}
        </div>
        
        {stores.length > 8 && (
          <div style={{ marginTop: '10px', fontSize: '14px', opacity: 0.8 }}>
            +{stores.length - 8} more stores
          </div>
        )}
      </div>
      
      {/* Store count overlay */}
      <div style={{ 
        position: 'absolute', 
        top: '16px', 
        left: '16px', 
        pointerEvents: 'none' 
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          color: 'var(--s-text)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <span style={{ fontWeight: '600', color: 'var(--s-primary)' }}>{stores.length}</span>
          <span> stores</span>
          {stores.filter(s => s.recentActivity).length > 0 && (
            <>
              <span style={{ margin: '0 8px', color: 'var(--s-muted)' }}>•</span>
              <span style={{ color: '#22c55e', fontWeight: '500' }}>
                {stores.filter(s => s.recentActivity).length} active
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}