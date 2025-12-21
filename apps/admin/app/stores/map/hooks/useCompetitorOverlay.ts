import { useEffect, useRef, useCallback } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';

/**
 * Competitor result from the API
 */
export interface CompetitorResult {
  brand: string;
  lat: number;
  lng: number;
  distanceM: number;
  placeName?: string;
}

/**
 * Options for the competitor overlay hook
 */
export interface UseCompetitorOverlayOptions {
  map: MapboxMap | null;
  competitors: CompetitorResult[];
  center: { lat: number; lng: number } | null;
  radiusKm: number;
  visible: boolean;
}

/**
 * Layer and source IDs for competitor overlay
 */
const COMPETITOR_OVERLAY_CONFIG = {
  sourceId: 'competitor-overlay',
  radiusSourceId: 'competitor-radius',
  layerIds: {
    icons: 'competitor-icons',
    labels: 'competitor-labels',
    radiusRing: 'competitor-radius-ring',
    radiusFill: 'competitor-radius-fill'
  },
  brandColors: {
    "McDonald's": '#FFC72C',
    "Burger King": '#D62300',
    "KFC": '#F40027',
    "Domino's": '#006491',
    "Starbucks": '#00704A'
  } as Record<string, string>
};

/**
 * Generate a circle polygon for the radius ring
 */
function generateCirclePolygon(
  centerLng: number, 
  centerLat: number, 
  radiusKm: number, 
  points: number = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const radiusInDegrees = radiusKm / 111.32; // Approximate conversion

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const lng = centerLng + radiusInDegrees * Math.cos(angle) / Math.cos(centerLat * Math.PI / 180);
    const lat = centerLat + radiusInDegrees * Math.sin(angle);
    coords.push([lng, lat]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    }
  };
}

/**
 * Hook to manage competitor overlay on Mapbox map
 * 
 * Features:
 * - Renders competitor markers with brand-specific colors
 * - Shows 5km radius ring around center point
 * - Automatically cleans up layers on unmount or visibility change
 * - Prevents layer/source leaks
 */
export function useCompetitorOverlay(options: UseCompetitorOverlayOptions) {
  const { map, competitors, center, radiusKm, visible } = options;
  const isRenderedRef = useRef(false);
  const cleanupScheduledRef = useRef(false);

  /**
   * Remove all competitor overlay layers and sources
   */
  const clearOverlay = useCallback(() => {
    if (!map) return;

    try {
      // Remove layers first (must be done before removing sources)
      const layerIds = Object.values(COMPETITOR_OVERLAY_CONFIG.layerIds);
      for (const layerId of layerIds) {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
      }

      // Remove sources
      if (map.getSource(COMPETITOR_OVERLAY_CONFIG.sourceId)) {
        map.removeSource(COMPETITOR_OVERLAY_CONFIG.sourceId);
      }
      if (map.getSource(COMPETITOR_OVERLAY_CONFIG.radiusSourceId)) {
        map.removeSource(COMPETITOR_OVERLAY_CONFIG.radiusSourceId);
      }

      isRenderedRef.current = false;
      console.log('🏢 Competitor overlay cleared');
    } catch (error) {
      console.error('Error clearing competitor overlay:', error);
    }
  }, [map]);

  /**
   * Render the competitor overlay
   */
  const renderOverlay = useCallback(() => {
    if (!map || !center || competitors.length === 0) return;

    // Clear any existing overlay first
    clearOverlay();

    try {
      // Create GeoJSON for competitors
      const competitorFeatures: GeoJSON.Feature<GeoJSON.Point>[] = competitors.map((c, index) => ({
        type: 'Feature',
        properties: {
          id: `competitor-${index}`,
          brand: c.brand,
          placeName: c.placeName || c.brand,
          distanceM: c.distanceM,
          color: COMPETITOR_OVERLAY_CONFIG.brandColors[c.brand] || '#6B7280'
        },
        geometry: {
          type: 'Point',
          coordinates: [c.lng, c.lat]
        }
      }));

      // Add competitor source
      map.addSource(COMPETITOR_OVERLAY_CONFIG.sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: competitorFeatures
        }
      });

      // Add radius ring source
      const radiusPolygon = generateCirclePolygon(center.lng, center.lat, radiusKm);
      map.addSource(COMPETITOR_OVERLAY_CONFIG.radiusSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [radiusPolygon]
        }
      });

      // Add radius fill layer (very faint)
      map.addLayer({
        id: COMPETITOR_OVERLAY_CONFIG.layerIds.radiusFill,
        type: 'fill',
        source: COMPETITOR_OVERLAY_CONFIG.radiusSourceId,
        paint: {
          'fill-color': '#3B82F6',
          'fill-opacity': 0.05
        }
      });

      // Add radius ring layer
      map.addLayer({
        id: COMPETITOR_OVERLAY_CONFIG.layerIds.radiusRing,
        type: 'line',
        source: COMPETITOR_OVERLAY_CONFIG.radiusSourceId,
        paint: {
          'line-color': '#3B82F6',
          'line-width': 2,
          'line-opacity': 0.6,
          'line-dasharray': [2, 2]
        }
      });

      // Add competitor icons layer
      map.addLayer({
        id: COMPETITOR_OVERLAY_CONFIG.layerIds.icons,
        type: 'circle',
        source: COMPETITOR_OVERLAY_CONFIG.sourceId,
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 6,
            14, 10,
            18, 14
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.9,
          'circle-opacity': 0.85
        }
      });

      // Add competitor labels layer
      map.addLayer({
        id: COMPETITOR_OVERLAY_CONFIG.layerIds.labels,
        type: 'symbol',
        source: COMPETITOR_OVERLAY_CONFIG.sourceId,
        minzoom: 13,
        layout: {
          'text-field': ['get', 'brand'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-optional': true
        },
        paint: {
          'text-color': '#374151',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5
        }
      });

      // Add hover tooltip
      const handleMouseEnter = (e: any) => {
        map.getCanvas().style.cursor = 'pointer';
        
        const feature = e.features?.[0];
        if (!feature) return;

        const { brand, placeName, distanceM } = feature.properties;
        const color = COMPETITOR_OVERLAY_CONFIG.brandColors[brand] || '#6B7280';

        // Create or update tooltip
        let tooltip = document.getElementById('competitor-tooltip');
        if (!tooltip) {
          tooltip = document.createElement('div');
          tooltip.id = 'competitor-tooltip';
          tooltip.style.cssText = `
            position: fixed;
            background: #1f2937;
            color: white;
            border: 1px solid #374151;
            border-radius: 8px;
            padding: 10px 14px;
            font-size: 13px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 999999;
            pointer-events: none;
            max-width: 250px;
            font-family: system-ui, -apple-system, sans-serif;
          `;
          document.body.appendChild(tooltip);
        }

        const distanceText = distanceM < 1000 
          ? `${Math.round(distanceM)}m away`
          : `${(distanceM / 1000).toFixed(1)}km away`;

        tooltip.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${color};"></span>
            ${brand}
          </div>
          ${placeName !== brand ? `<div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">${placeName}</div>` : ''}
          <div style="font-size: 12px; color: #60a5fa;">${distanceText}</div>
        `;

        tooltip.style.display = 'block';
      };

      const handleMouseMove = (e: any) => {
        const tooltip = document.getElementById('competitor-tooltip');
        if (tooltip) {
          tooltip.style.left = `${e.originalEvent.clientX + 15}px`;
          tooltip.style.top = `${e.originalEvent.clientY + 15}px`;
        }
      };

      const handleMouseLeave = () => {
        map.getCanvas().style.cursor = '';
        const tooltip = document.getElementById('competitor-tooltip');
        if (tooltip) {
          tooltip.style.display = 'none';
        }
      };

      map.on('mouseenter', COMPETITOR_OVERLAY_CONFIG.layerIds.icons, handleMouseEnter);
      map.on('mousemove', COMPETITOR_OVERLAY_CONFIG.layerIds.icons, handleMouseMove);
      map.on('mouseleave', COMPETITOR_OVERLAY_CONFIG.layerIds.icons, handleMouseLeave);

      isRenderedRef.current = true;
      console.log(`🏢 Competitor overlay rendered: ${competitors.length} competitors, ${radiusKm}km radius`);

    } catch (error) {
      console.error('Error rendering competitor overlay:', error);
    }
  }, [map, competitors, center, radiusKm, clearOverlay]);

  // Effect to manage overlay visibility
  useEffect(() => {
    if (!map) return;

    // Wait for map to be loaded
    const handleMapLoad = () => {
      if (visible && center && competitors.length > 0) {
        renderOverlay();
      } else if (!visible && isRenderedRef.current) {
        clearOverlay();
      }
    };

    if (map.loaded()) {
      handleMapLoad();
    } else {
      map.on('load', handleMapLoad);
    }

    return () => {
      map.off('load', handleMapLoad);
    };
  }, [map, visible, center, competitors, renderOverlay, clearOverlay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (map && isRenderedRef.current && !cleanupScheduledRef.current) {
        cleanupScheduledRef.current = true;
        // Use setTimeout to avoid React state update warnings
        setTimeout(() => {
          clearOverlay();
          cleanupScheduledRef.current = false;
        }, 0);
      }
      
      // Remove tooltip if it exists
      const tooltip = document.getElementById('competitor-tooltip');
      if (tooltip) {
        tooltip.remove();
      }
    };
  }, [map, clearOverlay]);

  return {
    isRendered: isRenderedRef.current,
    clear: clearOverlay
  };
}

export default useCompetitorOverlay;
