/**
 * useMapEventHandlers - Manages map event listeners with proper cleanup
 * Uses refs and throttling to prevent performance issues
 */

import { useRef, useEffect, useCallback } from 'react';
import { Map as MapLibreMap, MapMouseEvent, GeoJSONSource } from 'maplibre-gl';
import { StoreWithActivity, MapViewport } from '../types';

// Throttle utility function
function throttle<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  
  return (...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

export interface MapEventHandlers {
  onClick?: (storeId: string) => void;
  onViewportChange?: (viewport: MapViewport) => void;
}

export interface UseMapEventHandlersReturn {
  attachEventHandlers: (map: MapLibreMap, handlers: MapEventHandlers) => void;
  detachEventHandlers: (map: MapLibreMap) => void;
}

/**
 * Hook for managing map event handlers with throttling and proper cleanup
 */
export function useMapEventHandlers(): UseMapEventHandlersReturn {
  const eventHandlersRef = useRef<{
    click?: (e: MapMouseEvent) => void;
    moveend?: () => void;
    zoomend?: () => void;
  }>({});

  const attachEventHandlers = useCallback((map: MapLibreMap, handlers: MapEventHandlers) => {
    // Remove existing handlers first
    detachEventHandlers(map);

    // Create throttled click handler
    const throttledClick = throttle((e: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['unclustered-point', 'clusters']
      });

      if (features.length > 0) {
        const feature = features[0];

        if (feature.properties?.point_count) {
          // Handle cluster click - zoom to expand
          const clusterId = feature.properties.cluster_id;
          const source = map.getSource('stores') as GeoJSONSource;

          if (source && source.getClusterExpansionZoom) {
            source.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err) {
                console.warn('⚠️ Error getting cluster expansion zoom:', err);
                return;
              }

              const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
              map.easeTo({
                center: coordinates,
                zoom: zoom || map.getZoom() + 1,
                duration: 500
              });
            });
          }
        } else {
          // Handle individual store click
          const storeId = feature.properties?.id;
          if (storeId && handlers.onClick) {
            // Emit telemetry
            if (typeof window !== 'undefined') {
              import('../lib/MapTelemetry').then(({ mapTelemetry }) => {
                mapTelemetry.trackMarkerClick(storeId);
              });
            }

            handlers.onClick(storeId);
          }
        }
      }
    }, 100); // Throttle to prevent excessive clicks

    // Create throttled viewport change handler
    const throttledViewportChange = throttle(() => {
      if (handlers.onViewportChange) {
        const center = map.getCenter();
        const zoom = map.getZoom();

        handlers.onViewportChange({
          latitude: center.lat,
          longitude: center.lng,
          zoom
        });
      }
    }, 250); // Throttle viewport updates

    // Store handlers in ref for cleanup
    eventHandlersRef.current = {
      click: throttledClick,
      moveend: throttledViewportChange,
      zoomend: throttledViewportChange
    };

    // Add event listeners
    map.on('click', throttledClick);
    map.on('moveend', throttledViewportChange);
    map.on('zoomend', throttledViewportChange);

    console.log('✅ Map event handlers attached');
  }, []);

  const detachEventHandlers = useCallback((map: MapLibreMap) => {
    const handlers = eventHandlersRef.current;

    if (handlers.click) {
      map.off('click', handlers.click);
    }
    if (handlers.moveend) {
      map.off('moveend', handlers.moveend);
    }
    if (handlers.zoomend) {
      map.off('zoomend', handlers.zoomend);
    }

    // Clear handlers ref
    eventHandlersRef.current = {};

    console.log('✅ Map event handlers detached');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any remaining handler references
      eventHandlersRef.current = {};
      console.log('🧹 useMapEventHandlers cleanup');
    };
  }, []);

  return {
    attachEventHandlers,
    detachEventHandlers
  };
}