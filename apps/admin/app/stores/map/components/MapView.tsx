'use client';

import { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, NavigationControl } from 'mapbox-gl';
import { MapViewProps } from '../types';
import { useStoresGeo } from '../hooks/useStoresGeo';

// Import MapLibre CSS only when this component is used
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * Simple working MapView that actually initializes and shows the map
 */
export default function MapView({ 
  stores, 
  onStoreSelect, 
  viewport, 
  onViewportChange,
  loading = false 
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Convert stores to GeoJSON
  const { featureCollection } = useStoresGeo(stores);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    console.log('🗺️ Initializing MapLibre map...');
    console.log('📍 Container element:', mapRef.current);
    console.log('📊 Feature collection:', featureCollection);

    let loadTimeout: NodeJS.Timeout | undefined;

    try {
      const map = new MapLibreMap({
        container: mapRef.current,
        style: {
          version: 8,
          sources: {
            'raster-tiles': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: {
                'background-color': '#f0f0f0'
              }
            },
            {
              id: 'simple-tiles',
              type: 'raster',
              source: 'raster-tiles',
              minzoom: 0,
              maxzoom: 22
            }
          ]
        },
        center: [0, 20],
        zoom: 2,
        attributionControl: false
      });

      // Add timeout for map load
      loadTimeout = setTimeout(() => {
        if (!isMapReady) {
          console.error('❌ Map load timeout');
          setError('Map load timeout - please refresh the page');
        }
      }, 10000);

      map.on('load', () => {
        console.log('✅ Map loaded successfully');
        
        clearTimeout(loadTimeout);
        
        // Add navigation controls
        map.addControl(new NavigationControl(), 'top-right');
        
        // Add stores source
        map.addSource('stores', {
          type: 'geojson',
          data: featureCollection,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50
        });

        // Add cluster layer
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'stores',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#3b82f6',
              100,
              '#f59e0b',
              750,
              '#ef4444'
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,
              100,
              30,
              750,
              40
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });

        // Add cluster count labels
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'stores',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-size': 12
          },
          paint: {
            'text-color': '#ffffff'
          }
        });

        // Add individual store points
        map.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'stores',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': [
              'case',
              ['get', 'active'],
              '#22c55e',
              '#3b82f6'
            ],
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });

        // Add click handlers
        map.on('click', 'clusters', (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['clusters']
          });
          
          if (features.length > 0) {
            const clusterId = features[0].properties?.cluster_id;
            const source = map.getSource('stores') as any;
            
            source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
              if (err) return;
              
              map.easeTo({
                center: (features[0].geometry as any).coordinates,
                zoom: zoom
              });
            });
          }
        });

        map.on('click', 'unclustered-point', (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['unclustered-point']
          });
          
          if (features.length > 0) {
            const storeId = features[0].properties?.id;
            const store = stores.find(s => s.id === storeId);
            if (store) {
              onStoreSelect(store);
            }
          }
        });

        setIsMapReady(true);
        setError(null);
      });

      map.on('error', (e) => {
        console.error('❌ Map error:', e);
        clearTimeout(loadTimeout);
        setError(`Failed to load map: ${e.error?.message || 'Unknown error'}`);
      });

      mapInstanceRef.current = map;

    } catch (err) {
      console.error('❌ Failed to initialize map:', err);
      clearTimeout(loadTimeout);
      setError(err instanceof Error ? err.message : 'Map initialization failed');
    }

    // Cleanup
    return () => {
      if (loadTimeout) clearTimeout(loadTimeout);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update stores data
  useEffect(() => {
    if (mapInstanceRef.current && isMapReady) {
      console.log('🗺️ Updating stores data:', stores.length, 'stores');
      const source = mapInstanceRef.current.getSource('stores') as any;
      if (source) {
        source.setData(featureCollection);
      }
    }
  }, [stores, featureCollection, isMapReady]);

  // Show error state
  if (error) {
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
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--s-text)' }}>Map Unavailable</h4>
          <p style={{ margin: '0 0 16px 0', color: 'var(--s-muted)' }}>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: 'var(--s-primary)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading || !isMapReady) {
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

  // Render map container
  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '600px', 
      borderRadius: '8px', 
      overflow: 'hidden',
      border: '1px solid var(--s-border)'
    }}>
      <div 
        ref={mapRef} 
        style={{ width: '100%', height: '100%' }}
      />
      
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