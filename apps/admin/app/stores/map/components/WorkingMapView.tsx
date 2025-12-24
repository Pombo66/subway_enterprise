'use client';

import { useEffect, useRef, useState } from 'react';
import { MapViewProps } from '../types';
import { useMapEventHandlers } from '../hooks/useMapEventHandlers';
import 'mapbox-gl/dist/mapbox-gl.css';

/**
 * Beautiful MapView using Mapbox GL JS with proper font and store configuration
 */
export default function WorkingMapView({
  stores,
  onStoreSelect,
  viewport,
  onViewportChange,
  loading = false,
  expansionSuggestions = [],
  onSuggestionSelect,
  storeAnalyses = [],
  competitors = [],
  onCompetitorSelect,
  onDemandCompetitors = [],
  onDemandCompetitorCenter = null,
  showOnDemandCompetitors = false,
  onMapBackgroundClick
}: MapViewProps) {
  console.log('🎨 WorkingMapView component rendering with props:', {
    storesLength: stores?.length,
    loading,
    expansionSuggestionsLength: expansionSuggestions?.length,
    onDemandCompetitorsLength: onDemandCompetitors?.length,
    showOnDemandCompetitors
  });

  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const hasAutoFittedRef = useRef(false);
  const storesRef = useRef<typeof stores>([]);
  const initializingRef = useRef(false);
  
  // Map event handlers for viewport updates
  const { attachEventHandlers, detachEventHandlers } = useMapEventHandlers();

  // Keep stores ref updated
  storesRef.current = stores;

  // Helper function to add expansion suggestions as teardrop markers
  const addExpansionLayer = (map: any, suggestions: any[], onSelect?: (suggestion: any) => void) => {
    // Remove existing HTML markers and event handlers
    const markersKey = '__expansionSuggestionMarkers';
    const visibilityHandlerKey = '__expansionVisibilityHandler';
    
    if ((map as any)[markersKey]) {
      (map as any)[markersKey].forEach((m: any) => {
        const marker = m.marker || m;
        marker.remove();
      });
    }
    (map as any)[markersKey] = [];
    
    // Remove existing visibility handler
    if ((map as any)[visibilityHandlerKey]) {
      map.off('move', (map as any)[visibilityHandlerKey]);
      map.off('zoom', (map as any)[visibilityHandlerKey]);
    }

    // Remove existing layers if they exist (legacy cleanup)
    if (map.getLayer('expansion-suggestions-sparkle')) {
      map.removeLayer('expansion-suggestions-sparkle');
    }
    if (map.getLayer('expansion-suggestions-ai-glow')) {
      map.removeLayer('expansion-suggestions-ai-glow');
    }
    if (map.getLayer('expansion-suggestions')) {
      map.removeLayer('expansion-suggestions');
    }
    if (map.getSource('expansion-suggestions')) {
      map.removeSource('expansion-suggestions');
    }

    console.log(`🗺️ Map: Adding ${suggestions.length} expansion suggestion teardrop markers`);

    // Function to update visibility of all expansion markers based on map bounds
    const updateAllMarkerVisibility = () => {
      const markers = (map as any)[markersKey] || [];
      const canvas = map.getCanvas();
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      
      markers.forEach((markerData: { marker: any; lngLat: [number, number] }) => {
        if (!markerData.marker || !markerData.lngLat) return;
        const point = map.project(markerData.lngLat);
        const isVisible = point.x >= -50 && point.x <= width + 50 &&
                         point.y >= -50 && point.y <= height + 50;
        const el = markerData.marker.getElement();
        if (el) {
          el.style.display = isVisible ? 'block' : 'none';
        }
      });
    };
    
    // Store the handler reference for cleanup
    (map as any)[visibilityHandlerKey] = updateAllMarkerVisibility;
    
    // Attach visibility update to map move/zoom events
    map.on('move', updateAllMarkerVisibility);
    map.on('zoom', updateAllMarkerVisibility);

    // Create HTML teardrop markers for each expansion suggestion
    suggestions.forEach((suggestion, index) => {
      // Determine teardrop color based on status
      const status = suggestion.status || 'NEW';
      let teardropColor = '#af52de'; // Default purple for expansion suggestions
      let statusRingColor = '';
      
      if (status === 'APPROVED') {
        statusRingColor = '#30d158'; // Green ring for approved
      } else if (status === 'HOLD') {
        statusRingColor = '#ff9500'; // Orange ring for on hold
      }
      
      // Check for high confidence (>75%)
      const isHighConfidence = suggestion.confidence > 0.75;
      
      // Create teardrop marker element
      const el = document.createElement('div');
      el.className = 'expansion-teardrop-marker';
      el.dataset.suggestionId = suggestion.id;
      
      // Build the SVG with optional status ring and confidence dot
      const statusRingSvg = statusRingColor ? `
        <circle cx="18" cy="18" r="16" fill="none" stroke="${statusRingColor}" stroke-width="3" opacity="0.9"/>
      ` : '';
      
      const confidenceDotSvg = isHighConfidence ? `
        <circle cx="18" cy="8" r="4" fill="#f59e0b" stroke="white" stroke-width="1"/>
      ` : '';
      
      el.innerHTML = `
        <div style="
          position: relative;
          width: 36px;
          height: 48px;
          cursor: pointer;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        ">
          <svg width="36" height="48" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.059 27.941 0 18 0z" fill="${teardropColor}"/>
            <circle cx="18" cy="18" r="14" fill="white"/>
            ${statusRingSvg}
            ${confidenceDotSvg}
          </svg>
          <img 
            src="/logos/subway.png" 
            alt="Subway"
            style="
              position: absolute;
              top: 6px;
              left: 6px;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              object-fit: cover;
              background: white;
            "
            onerror="this.style.display='none'"
          />
        </div>
      `;

      // Add click handler
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelect) {
          console.log('🔍 Selected expansion suggestion:', suggestion);
          onSelect(suggestion);
        }
      });

      // Add tooltip on hover
      el.addEventListener('mouseenter', (e) => {
        let tooltip = document.getElementById('expansion-tooltip');
        if (!tooltip) {
          tooltip = document.createElement('div');
          tooltip.id = 'expansion-tooltip';
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
            max-width: 280px;
            font-family: system-ui, -apple-system, sans-serif;
          `;
          document.body.appendChild(tooltip);
        }

        const confidencePercent = Math.round((suggestion.confidence || 0) * 100);
        const statusLabel = status === 'APPROVED' ? '✓ Approved' : 
                           status === 'HOLD' ? '⏸ On Hold' : 
                           status === 'REJECTED' ? '✗ Rejected' : '● New';
        const statusColor = status === 'APPROVED' ? '#30d158' : 
                           status === 'HOLD' ? '#ff9500' : 
                           status === 'REJECTED' ? '#ff3b30' : '#af52de';

        tooltip.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${teardropColor};"></span>
            Expansion Suggestion
          </div>
          ${suggestion.locationName ? `<div style="font-size: 12px; color: #d1d5db; margin-bottom: 4px;">${suggestion.locationName}</div>` : ''}
          <div style="font-size: 12px; margin-bottom: 4px;">
            <span style="color: ${statusColor};">${statusLabel}</span>
            ${isHighConfidence ? ' • <span style="color: #f59e0b;">★ High Confidence</span>' : ''}
          </div>
          <div style="font-size: 12px; color: #60a5fa;">${confidencePercent}% confidence</div>
          <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Click for details</div>
        `;

        const rect = el.getBoundingClientRect();
        tooltip.style.left = `${rect.right + 10}px`;
        tooltip.style.top = `${rect.top}px`;
        tooltip.style.display = 'block';
      });

      el.addEventListener('mouseleave', () => {
        const tooltip = document.getElementById('expansion-tooltip');
        if (tooltip) {
          tooltip.style.display = 'none';
        }
      });

      // Create Mapbox marker using dynamic import
      import('mapbox-gl').then((mapboxgl) => {
        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([suggestion.lng, suggestion.lat])
          .addTo(map);

        const lngLat: [number, number] = [suggestion.lng, suggestion.lat];
        (map as any)[markersKey].push({ marker, lngLat });
        
        // Update visibility after adding marker
        updateAllMarkerVisibility();
      }).catch(err => {
        console.error('Failed to create expansion marker:', err);
      });
    });

    console.log(`✅ Added ${suggestions.length} expansion teardrop markers`);
  };

  // Helper function to clear expansion suggestion markers
  const clearExpansionLayer = (map: any) => {
    const markersKey = '__expansionSuggestionMarkers';
    const visibilityHandlerKey = '__expansionVisibilityHandler';
    
    if ((map as any)[markersKey]) {
      (map as any)[markersKey].forEach((m: any) => {
        const marker = m.marker || m;
        marker.remove();
      });
      (map as any)[markersKey] = [];
    }
    
    // Remove visibility event handlers
    if ((map as any)[visibilityHandlerKey]) {
      map.off('move', (map as any)[visibilityHandlerKey]);
      map.off('zoom', (map as any)[visibilityHandlerKey]);
      (map as any)[visibilityHandlerKey] = null;
    }

    // Remove tooltip if it exists
    const tooltip = document.getElementById('expansion-tooltip');
    if (tooltip) {
      tooltip.remove();
    }

    // Legacy cleanup
    if (map.getLayer('expansion-suggestions-sparkle')) {
      map.removeLayer('expansion-suggestions-sparkle');
    }
    if (map.getLayer('expansion-suggestions-ai-glow')) {
      map.removeLayer('expansion-suggestions-ai-glow');
    }
    if (map.getLayer('expansion-suggestions')) {
      map.removeLayer('expansion-suggestions');
    }
    if (map.getSource('expansion-suggestions')) {
      map.removeSource('expansion-suggestions');
    }
  };

  // Helper function to add competitors layer
  const addCompetitorsLayer = (map: any, competitors: any[], onSelect?: (competitor: any) => void) => {
    // Remove existing layers if they exist
    if (map.getLayer('competitors')) {
      map.removeLayer('competitors');
    }
    if (map.getSource('competitors')) {
      map.removeSource('competitors');
    }

    if (competitors.length === 0) return;

    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: competitors.map(competitor => ({
        type: 'Feature' as const,
        properties: {
          id: competitor.id,
          brand: competitor.brand,
          name: competitor.name,
          category: competitor.category,
          threatLevel: competitor.threatLevel
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [competitor.longitude, competitor.latitude]
        }
      }))
    };

    console.log(`🏢 Adding ${competitors.length} competitors to map`);

    map.addSource('competitors', {
      type: 'geojson',
      data: geojsonData
    });

    // Add competitors layer with Apple Maps-inspired styling
    map.addLayer({
      id: 'competitors',
      type: 'circle',
      source: 'competitors',
      paint: {
        'circle-color': [
          'match',
          ['get', 'category'],
          'qsr', '#ff3b30',        // Apple red for QSR
          'pizza', '#ff9500',      // Apple orange for pizza
          'coffee', '#af52de',     // Apple purple for coffee
          'sandwich', '#007aff',   // Apple blue for sandwich
          '#8e8e93'                // Apple gray as default
        ],
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 6,   // Larger at low zoom (was 3)
          12, 10, // Larger at city zoom (was 6)
          16, 14  // Larger at street zoom (was 9)
        ],
        'circle-stroke-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 1,   // Thin stroke at low zoom
          12, 1.5, // Medium stroke at city zoom
          16, 2   // Thick stroke at street zoom
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.9,
        'circle-opacity': 0.85
      }
    });

    // Add click handler for competitors
    if (onSelect) {
      const handleCompetitorClick = (e: any) => {
        const feature = e.features?.[0];
        if (!feature) return;
        
        const competitorId = feature.properties.id;
        const competitor = competitors.find(c => c.id === competitorId);
        if (competitor) {
          console.log('🏢 Selected competitor:', competitor);
          onSelect(competitor);
        }
      };

      map.on('click', 'competitors', handleCompetitorClick);

      // Add hover effects with brand information tooltip
      map.on('mouseenter', 'competitors', (e: any) => {
        map.getCanvas().style.cursor = 'pointer';
        
        const feature = e.features?.[0];
        if (!feature) return;
        
        const properties = feature.properties as any;
        if (!properties) return;
        
        const { brand, name, category, threatLevel } = properties;

        // Create simple DOM tooltip for competitors
        let tooltip = document.getElementById('map-tooltip');
        if (!tooltip) {
          tooltip = document.createElement('div');
          tooltip.id = 'map-tooltip';
          tooltip.style.cssText = `
            position: fixed;
            background: #1f2937;
            color: white;
            border: 1px solid #374151;
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 14px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            z-index: 999999;
            pointer-events: none;
            max-width: 280px;
            font-family: system-ui, -apple-system, sans-serif;
          `;
          document.body.appendChild(tooltip);
        }

        // Get category color for the tooltip
        const categoryColors: Record<string, string> = {
          'qsr': '#ef4444',        // Red for QSR
          'pizza': '#f97316',      // Orange for pizza
          'coffee': '#8b5cf6',     // Purple for coffee
          'sandwich': '#3b82f6',   // Blue for sandwich
        };
        const categoryColor = categoryColors[category] || '#6b7280';
        const categoryLabel = category?.toUpperCase() || 'COMPETITOR';

        tooltip.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 6px; color: white;">${brand}</div>
          ${name && name !== brand ? `<div style="font-size: 12px; color: #d1d5db; margin-bottom: 4px;">${name}</div>` : ''}
          <div style="font-size: 12px; margin-bottom: 4px;">
            <span style="color: ${categoryColor};">
              ● ${categoryLabel}
            </span>
            ${threatLevel ? ` • ${threatLevel} threat` : ''}
          </div>
          <div style="font-size: 11px; color: #9ca3af;">
            Click for details
          </div>
        `;

        tooltip.style.display = 'block';
        console.log('🏢 Competitor tooltip shown for:', brand);
      });

      map.on('mouseleave', 'competitors', () => {
        map.getCanvas().style.cursor = '';
        
        // Hide competitor tooltip
        const tooltip = document.getElementById('map-tooltip');
        if (tooltip) {
          tooltip.style.display = 'none';
        }
      });
    }
  };

  // Helper function to add on-demand competitor overlay (new Google Places system)
  const addOnDemandCompetitorLayer = (
    map: any, 
    competitors: Array<{ brand: string; lat: number; lng: number; distanceM: number; placeName?: string }>,
    center: { lat: number; lng: number },
    radiusKm: number = 5
  ) => {
    // Remove existing on-demand layers if they exist
    const layerIds = [
      'on-demand-radius-ring', 
      'on-demand-radius-fill',
      'on-demand-center-highlight-pulse',
      'on-demand-center-highlight'
    ];
    const sourceIds = ['on-demand-radius', 'on-demand-center'];
    
    for (const layerId of layerIds) {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    }
    for (const sourceId of sourceIds) {
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    }

    if (competitors.length === 0) return;

    // Brand colors and logo paths (mixed png/jpeg)
    const brandConfig: Record<string, { color: string; logo: string }> = {
      "McDonald's": { color: '#FFC72C', logo: '/logos/mcdonalds.jpeg' },
      "Burger King": { color: '#D62300', logo: '/logos/burgerking.png' },
      "KFC": { color: '#F40027', logo: '/logos/kfc.png' },
      "Domino's": { color: '#006491', logo: '/logos/dominos.png' },
      "Starbucks": { color: '#00704A', logo: '/logos/starbucks.jpeg' }
    };

    // Store HTML markers for cleanup
    const markersKey = '__onDemandCompetitorMarkers';
    const visibilityHandlerKey = '__onDemandVisibilityHandler';
    
    // Remove existing markers and event handlers
    if ((map as any)[markersKey]) {
      (map as any)[markersKey].forEach((m: any) => m.remove());
    }
    (map as any)[markersKey] = [];
    
    // Remove existing visibility handler
    if ((map as any)[visibilityHandlerKey]) {
      map.off('move', (map as any)[visibilityHandlerKey]);
      map.off('zoom', (map as any)[visibilityHandlerKey]);
    }

    // Function to update visibility of all competitor markers based on map bounds
    const updateAllMarkerVisibility = () => {
      const markers = (map as any)[markersKey] || [];
      const canvas = map.getCanvas();
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      
      markers.forEach((markerData: { marker: any; lngLat: [number, number] }) => {
        const point = map.project(markerData.lngLat);
        // Add padding to prevent markers from disappearing too early at edges
        const isVisible = point.x >= -50 && point.x <= width + 50 &&
                         point.y >= -50 && point.y <= height + 50;
        const el = markerData.marker.getElement();
        if (el) {
          el.style.display = isVisible ? 'block' : 'none';
        }
      });
    };
    
    // Store the handler reference for cleanup
    (map as any)[visibilityHandlerKey] = updateAllMarkerVisibility;
    
    // Attach visibility update to map move/zoom events
    map.on('move', updateAllMarkerVisibility);
    map.on('zoom', updateAllMarkerVisibility);

    // Create HTML teardrop markers for each competitor
    competitors.forEach((c, index) => {
      const config = brandConfig[c.brand] || { color: '#6B7280', logo: '' };
      const lngLat: [number, number] = [c.lng, c.lat];
      
      // Create teardrop marker element
      const el = document.createElement('div');
      el.className = 'competitor-teardrop-marker';
      el.innerHTML = `
        <div style="
          position: relative;
          width: 36px;
          height: 48px;
          cursor: pointer;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        ">
          <svg width="36" height="48" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.059 27.941 0 18 0z" fill="${config.color}"/>
            <circle cx="18" cy="18" r="14" fill="white"/>
          </svg>
          <img 
            src="${config.logo}" 
            alt="${c.brand}"
            style="
              position: absolute;
              top: 6px;
              left: 6px;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              object-fit: cover;
              background: white;
            "
            onerror="this.style.display='none'"
          />
        </div>
      `;

      // Add tooltip on hover
      el.addEventListener('mouseenter', (e) => {
        let tooltip = document.getElementById('on-demand-competitor-tooltip');
        if (!tooltip) {
          tooltip = document.createElement('div');
          tooltip.id = 'on-demand-competitor-tooltip';
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

        const distanceText = c.distanceM < 1000 
          ? `${Math.round(c.distanceM)}m away`
          : `${(c.distanceM / 1000).toFixed(1)}km away`;

        tooltip.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${config.color};"></span>
            ${c.brand}
          </div>
          ${c.placeName && c.placeName !== c.brand ? `<div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">${c.placeName}</div>` : ''}
          <div style="font-size: 12px; color: #60a5fa;">${distanceText}</div>
        `;

        const rect = el.getBoundingClientRect();
        tooltip.style.left = `${rect.right + 10}px`;
        tooltip.style.top = `${rect.top}px`;
        tooltip.style.display = 'block';
      });

      el.addEventListener('mouseleave', () => {
        const tooltip = document.getElementById('on-demand-competitor-tooltip');
        if (tooltip) {
          tooltip.style.display = 'none';
        }
      });

      // Add click handler to hide tooltip and log
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const tooltip = document.getElementById('on-demand-competitor-tooltip');
        if (tooltip) {
          tooltip.style.display = 'none';
        }
        console.log('🏢 Competitor marker clicked:', c.brand, c.placeName);
      });

      // Create Mapbox marker using dynamic import
      import('mapbox-gl').then((mapboxgl) => {
        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([c.lng, c.lat])
          .addTo(map);

        // Store marker with its coordinates for visibility checking
        (map as any)[markersKey].push({ marker, lngLat: [c.lng, c.lat] as [number, number] });
        
        // Initial visibility check
        updateAllMarkerVisibility();
      }).catch(err => {
        console.error('Failed to create marker:', err);
      });
    });

    // Generate circle polygon for radius ring
    const generateCirclePolygon = (centerLng: number, centerLat: number, radiusKm: number, points: number = 64) => {
      const coords: [number, number][] = [];
      const radiusInDegrees = radiusKm / 111.32;

      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * 2 * Math.PI;
        const lng = centerLng + radiusInDegrees * Math.cos(angle) / Math.cos(centerLat * Math.PI / 180);
        const lat = centerLat + radiusInDegrees * Math.sin(angle);
        coords.push([lng, lat]);
      }

      return {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'Polygon' as const,
          coordinates: [coords]
        }
      };
    };

    // Add radius ring source
    const radiusPolygon = generateCirclePolygon(center.lng, center.lat, radiusKm);
    map.addSource('on-demand-radius', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [radiusPolygon]
      }
    });

    // Add center point source for highlight
    map.addSource('on-demand-center', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: [center.lng, center.lat]
          }
        }]
      }
    });

    // Add pulsing highlight ring around the center store/suggestion
    map.addLayer({
      id: 'on-demand-center-highlight-pulse',
      type: 'circle',
      source: 'on-demand-center',
      paint: {
        'circle-radius': 25,
        'circle-color': '#3B82F6',
        'circle-opacity': 0.3,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#3B82F6',
        'circle-stroke-opacity': 0.6
      }
    });

    // Add solid highlight ring
    map.addLayer({
      id: 'on-demand-center-highlight',
      type: 'circle',
      source: 'on-demand-center',
      paint: {
        'circle-radius': 18,
        'circle-color': 'transparent',
        'circle-stroke-width': 3,
        'circle-stroke-color': '#2563EB',
        'circle-stroke-opacity': 1
      }
    });

    // Add radius fill layer (very faint)
    map.addLayer({
      id: 'on-demand-radius-fill',
      type: 'fill',
      source: 'on-demand-radius',
      paint: {
        'fill-color': '#3B82F6',
        'fill-opacity': 0.05
      }
    });

    // Add radius ring layer
    map.addLayer({
      id: 'on-demand-radius-ring',
      type: 'line',
      source: 'on-demand-radius',
      paint: {
        'line-color': '#3B82F6',
        'line-width': 2,
        'line-opacity': 0.6,
        'line-dasharray': [2, 2]
      }
    });

    console.log(`🏢 On-demand competitor overlay rendered: ${competitors.length} teardrop markers, ${radiusKm}km radius`);
  };

  // Helper function to clear on-demand competitor overlay
  const clearOnDemandCompetitorLayer = (map: any) => {
    // Remove HTML markers
    const markersKey = '__onDemandCompetitorMarkers';
    const visibilityHandlerKey = '__onDemandVisibilityHandler';
    
    if ((map as any)[markersKey]) {
      (map as any)[markersKey].forEach((m: any) => {
        // Handle both old format (just marker) and new format ({ marker, lngLat })
        const marker = m.marker || m;
        marker.remove();
      });
      (map as any)[markersKey] = [];
    }
    
    // Remove visibility event handlers
    if ((map as any)[visibilityHandlerKey]) {
      map.off('move', (map as any)[visibilityHandlerKey]);
      map.off('zoom', (map as any)[visibilityHandlerKey]);
      (map as any)[visibilityHandlerKey] = null;
    }

    const layerIds = [
      'on-demand-radius-ring', 
      'on-demand-radius-fill',
      'on-demand-center-highlight-pulse',
      'on-demand-center-highlight'
    ];
    const sourceIds = ['on-demand-radius', 'on-demand-center'];
    
    for (const layerId of layerIds) {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    }
    for (const sourceId of sourceIds) {
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    }

    // Remove tooltip if it exists
    const tooltip = document.getElementById('on-demand-competitor-tooltip');
    if (tooltip) {
      tooltip.remove();
    }

    console.log('🏢 On-demand competitor overlay cleared');
  };

  // Debounce helper
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to create store teardrop markers (replaces unclustered-point circle layer)
  const updateStoreTeardropMarkers = (map: any, storesData: typeof stores, onSelect: typeof onStoreSelect) => {
    const markersKey = '__storeTeardropMarkers';
    const markerMapKey = '__storeMarkerMap'; // Track markers by store ID to avoid duplicates
    
    // Initialize marker tracking if needed
    if (!(map as any)[markersKey]) {
      (map as any)[markersKey] = [];
    }
    if (!(map as any)[markerMapKey]) {
      (map as any)[markerMapKey] = new Map();
    }

    const existingMarkerMap = (map as any)[markerMapKey] as Map<string, { marker: any; lngLat: [number, number] }>;

    // Query for unclustered points currently RENDERED (visible on screen)
    const features = map.queryRenderedFeatures({ layers: ['stores-invisible'] });
    
    // Get set of currently visible store IDs
    const visibleStoreIds = new Set(features.map((f: any) => f.properties.id));

    // Remove markers that are no longer visible
    existingMarkerMap.forEach((markerData, storeId) => {
      if (!visibleStoreIds.has(storeId)) {
        markerData.marker.remove();
        existingMarkerMap.delete(storeId);
      }
    });

    // Get canvas dimensions for visibility check
    const canvas = map.getCanvas();
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    // Add markers for newly visible stores
    features.forEach((feature: any) => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;
      
      // Skip if marker already exists for this store
      if (existingMarkerMap.has(props.id)) {
        // Update visibility of existing marker
        const markerData = existingMarkerMap.get(props.id)!;
        const point = map.project(markerData.lngLat);
        const isVisible = point.x >= -50 && point.x <= width + 50 &&
                         point.y >= -50 && point.y <= height + 50;
        const el = markerData.marker.getElement();
        if (el) {
          el.style.display = isVisible ? 'block' : 'none';
        }
        return;
      }
      
      // Determine teardrop color based on status
      const status = props.status || 'Unknown';
      let teardropColor = '#007aff'; // Default blue
      
      if (status === 'Open') {
        teardropColor = '#30d158'; // Green
      } else if (status === 'Closed') {
        teardropColor = '#8e8e93'; // Gray
      } else if (status === 'Planned') {
        teardropColor = '#af52de'; // Purple
      }

      // Create teardrop marker element
      const el = document.createElement('div');
      el.className = 'store-teardrop-marker';
      el.dataset.storeId = props.id;
      
      el.innerHTML = `
        <div style="
          position: relative;
          width: 36px;
          height: 48px;
          cursor: pointer;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        ">
          <svg width="36" height="48" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.059 27.941 0 18 0z" fill="${teardropColor}"/>
            <circle cx="18" cy="18" r="14" fill="white"/>
          </svg>
          <img 
            src="/logos/subway.png" 
            alt="Subway"
            style="
              position: absolute;
              top: 6px;
              left: 6px;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              object-fit: cover;
              background: white;
            "
            onerror="this.style.display='none'"
          />
        </div>
      `;

      // Add click handler
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const store = storesRef.current.find(s => s.id === props.id);
        if (store) {
          console.log('🏪 Store teardrop clicked:', store.name);
          // Hide tooltip
          const tooltip = document.getElementById('store-tooltip');
          if (tooltip) tooltip.style.display = 'none';
          onSelect(store);
        }
      });

      // Add tooltip on hover
      el.addEventListener('mouseenter', () => {
        let tooltip = document.getElementById('store-tooltip');
        if (!tooltip) {
          tooltip = document.createElement('div');
          tooltip.id = 'store-tooltip';
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
            max-width: 280px;
            font-family: system-ui, -apple-system, sans-serif;
          `;
          document.body.appendChild(tooltip);
        }

        const statusColor = status === 'Open' ? '#30d158' : 
                           status === 'Closed' ? '#8e8e93' : 
                           status === 'Planned' ? '#af52de' : '#007aff';

        tooltip.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${teardropColor};"></span>
            ${props.name}
          </div>
          ${props.city ? `<div style="font-size: 12px; color: #d1d5db; margin-bottom: 2px;">${props.city}</div>` : ''}
          <div style="font-size: 12px; color: #d1d5db; margin-bottom: 4px;">${props.country}${props.region ? `, ${props.region}` : ''}</div>
          <div style="font-size: 12px;">
            <span style="color: ${statusColor};">● ${status}</span>
          </div>
          <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Click for details</div>
        `;

        const rect = el.getBoundingClientRect();
        tooltip.style.left = `${rect.right + 10}px`;
        tooltip.style.top = `${rect.top}px`;
        tooltip.style.display = 'block';
      });

      el.addEventListener('mouseleave', () => {
        const tooltip = document.getElementById('store-tooltip');
        if (tooltip) tooltip.style.display = 'none';
      });

      // Create Mapbox marker and track it
      import('mapbox-gl').then((mapboxgl) => {
        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat(coords)
          .addTo(map);
        const lngLat: [number, number] = [coords[0], coords[1]];
        (map as any)[markersKey].push({ marker, lngLat });
        existingMarkerMap.set(props.id, { marker, lngLat });
        
        // Initial visibility check for this marker
        const point = map.project(lngLat);
        const canvas = map.getCanvas();
        const w = canvas.width / (window.devicePixelRatio || 1);
        const h = canvas.height / (window.devicePixelRatio || 1);
        const isVisible = point.x >= -50 && point.x <= w + 50 &&
                         point.y >= -50 && point.y <= h + 50;
        el.style.display = isVisible ? 'block' : 'none';
      });
    });
  };

  // Helper function to clear store teardrop markers
  const clearStoreTeardropMarkers = (map: any) => {
    const markersKey = '__storeTeardropMarkers';
    const markerMapKey = '__storeMarkerMap';
    if ((map as any)[markersKey]) {
      (map as any)[markersKey].forEach((m: any) => {
        // Handle both old format (just marker) and new format ({ marker, lngLat })
        const marker = m.marker || m;
        marker.remove();
      });
      (map as any)[markersKey] = [];
    }
    if ((map as any)[markerMapKey]) {
      (map as any)[markerMapKey].clear();
    }
    const tooltip = document.getElementById('store-tooltip');
    if (tooltip) tooltip.remove();
  };

  console.log('🗺️ WorkingMapView render:', {
    mapLoaded,
    error,
    storesCount: stores.length,
    loading,
    storesSample: stores.slice(0, 2).map(s => ({ name: s.name, lat: s.latitude, lng: s.longitude }))
  });

  // Set up background click handler on window for map to call
  useEffect(() => {
    if (onMapBackgroundClick) {
      (window as any).__mapBackgroundClickHandler = onMapBackgroundClick;
    }
    return () => {
      delete (window as any).__mapBackgroundClickHandler;
    };
  }, [onMapBackgroundClick]);

  // Initialize map once on mount
  useEffect(() => {
    console.log('🗺️ Map initialization effect triggered!');
    console.log('🗺️ MapLibre initialization effect:', {
      hasMapRef: !!mapRef.current,
      hasMapInstance: !!mapInstanceRef.current,
      initializing: initializingRef.current,
      mapRefElement: mapRef.current
    });

    // Prevent multiple map instances
    if (mapInstanceRef.current || initializingRef.current) {
      console.log('🗺️ Map already exists or initializing, skipping');
      return;
    }

    console.log('🗺️ Starting Mapbox GL initialization...');

    const initializeMap = async () => {
      initializingRef.current = true;
      try {
        console.log('🔄 Starting Mapbox GL import...');

        // Dynamic import of Mapbox GL to ensure it only runs client-side
        const mapboxModule = await import('mapbox-gl');
        const { Map: MapboxMap, NavigationControl } = mapboxModule;

        console.log('📦 Mapbox GL modules loaded successfully');
        console.log('📍 Container ref:', mapRef.current);

        if (!mapRef.current) {
          throw new Error('Map container not found');
        }

        console.log('🗺️ Creating Mapbox GL instance...');

        // Get Mapbox token from environment
        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        
        console.log('🔑 Mapbox token check:', {
          hasToken: !!mapboxToken,
          tokenLength: mapboxToken?.length,
          tokenPrefix: mapboxToken?.substring(0, 10),
          allEnvVars: Object.keys(process.env).filter(k => k.includes('MAPBOX'))
        });
        
        if (!mapboxToken) {
          throw new Error('NEXT_PUBLIC_MAPBOX_TOKEN is required for Mapbox GL JS. Found env vars: ' + Object.keys(process.env).filter(k => k.includes('MAPBOX')).join(', '));
        }
        
        if (!mapboxToken.startsWith('pk.')) {
          throw new Error('Invalid Mapbox token format. Token must start with "pk." for public access.');
        }
        
        // Set Mapbox access token
        mapboxModule.default.accessToken = mapboxToken;
        
        console.log('🔧 Map configuration:', {
          hasMapboxToken: !!mapboxToken,
          tokenType: mapboxToken.startsWith('pk.') ? 'public' : 'invalid',
          tokenValid: mapboxToken.length > 50,
          usingMapboxStreets: true,
          styleType: 'Mapbox Streets v11 (with font fix)'
        });
        
        const map = new MapboxMap({
          container: mapRef.current,
          // Use modern streets v12 - Mapbox's newest and most polished style
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [0, 20],
          zoom: 2,
          // Fix font loading issues
          localIdeographFontFamily: 'sans-serif'
        });

        console.log('✅ Mapbox GL instance created successfully');

        // Add timeout to detect if map never loads
        const loadTimeout = setTimeout(() => {
          if (!mapLoaded) {
            console.error('⏱️ Map load timeout - map did not fire load event within 10 seconds');
            setError('Map loading timeout. Please check your internet connection and Mapbox token.');
            initializingRef.current = false;
          }
        }, 10000);

        map.on('load', () => {
          clearTimeout(loadTimeout);
          console.log('✅ Map loaded successfully');
          console.log('🎨 Modern Mapbox Streets v12 style loaded:', {
            style: 'mapbox://styles/mapbox/streets-v12',
            sources: Object.keys(map.getStyle().sources || {}),
            layers: (map.getStyle().layers || []).length
          });
          console.log('📍 Creating GeoJSON source for', stores.length, 'stores');

          // Add navigation controls
          map.addControl(new NavigationControl(), 'top-right');

          // Create GeoJSON data from stores with detailed validation
          const validStores = stores.filter(store => {
            const isValid = (
              typeof store.latitude === 'number' &&
              typeof store.longitude === 'number' &&
              !isNaN(store.latitude) &&
              !isNaN(store.longitude) &&
              store.latitude >= -90 &&
              store.latitude <= 90 &&
              store.longitude >= -180 &&
              store.longitude <= 180
            );

            if (!isValid) {
              console.warn('⚠️ Store filtered out from map:', {
                name: store.name,
                lat: store.latitude,
                lng: store.longitude,
                latType: typeof store.latitude,
                lngType: typeof store.longitude,
                latIsNaN: isNaN(store.latitude as any),
                lngIsNaN: isNaN(store.longitude as any),
                reason: !store.latitude || !store.longitude ? 'missing coordinates' :
                  typeof store.latitude !== 'number' || typeof store.longitude !== 'number' ? 'wrong type' :
                    isNaN(store.latitude) || isNaN(store.longitude) ? 'NaN value' :
                      store.latitude < -90 || store.latitude > 90 ? 'latitude out of range' :
                        store.longitude < -180 || store.longitude > 180 ? 'longitude out of range' : 'unknown'
              });
            }

            return isValid;
          });

          console.log('📍 Valid stores for map:', validStores.length, 'out of', stores.length);

          if (validStores.length < stores.length) {
            console.warn(`⚠️ ${stores.length - validStores.length} stores filtered out due to invalid coordinates`);
            
            // Log the filtered out stores for debugging
            const filteredOut = stores.filter(store => {
              return !(
                typeof store.latitude === 'number' &&
                typeof store.longitude === 'number' &&
                !isNaN(store.latitude) &&
                !isNaN(store.longitude) &&
                store.latitude >= -90 &&
                store.latitude <= 90 &&
                store.longitude >= -180 &&
                store.longitude <= 180
              );
            });
            
            console.warn('⚠️ Filtered out stores:', filteredOut.map(s => ({
              name: s.name,
              lat: s.latitude,
              lng: s.longitude,
              latType: typeof s.latitude,
              lngType: typeof s.longitude
            })));
          }

          if (validStores.length > 0) {
            console.log('📍 Sample valid stores:', validStores.slice(0, 3).map(s => ({
              name: s.name,
              lat: s.latitude,
              lng: s.longitude,
              status: s.status
            })));
            
            // Check for duplicate coordinates
            const coordMap = new Map();
            validStores.forEach(store => {
              const coordKey = `${store.latitude.toFixed(6)},${store.longitude.toFixed(6)}`;
              if (!coordMap.has(coordKey)) {
                coordMap.set(coordKey, []);
              }
              coordMap.get(coordKey).push(store.name);
            });
            
            const duplicates = Array.from(coordMap.entries()).filter(([_, stores]) => stores.length > 1);
            if (duplicates.length > 0) {
              console.warn('⚠️ Stores with duplicate coordinates:', duplicates.map(([coord, stores]) => ({
                coordinates: coord,
                stores: stores,
                count: stores.length
              })));
            }
          }

          const geojsonData = {
            type: 'FeatureCollection' as const,
            features: validStores.map(store => {
              const status = store.status || 'Unknown';
              console.log(`📍 Store "${store.name}" status:`, { 
                raw: store.status, 
                final: status,
                type: typeof store.status 
              });
              return {
                type: 'Feature' as const,
                properties: {
                  id: store.id,
                  name: store.name,
                  recentActivity: store.recentActivity,
                  status: status,
                  region: store.region,
                  country: store.country,
                  city: store.city || '',
                  latitude: store.latitude,
                  longitude: store.longitude
                },
                geometry: {
                  type: 'Point' as const,
                  coordinates: [store.longitude, store.latitude]
                }
              };
            })
          };

          console.log('📍 Generated GeoJSON with', geojsonData.features.length, 'features');
          console.log('📍 Sample feature properties:', geojsonData.features[0]?.properties);

          // Add GeoJSON source
          map.addSource('stores', {
            type: 'geojson',
            data: geojsonData,
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
          });

          // Add cluster circles layer with Apple Maps-inspired styling
          map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'stores',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'step',
                ['get', 'point_count'],
                '#007aff',  // Apple blue for small clusters
                10,
                '#ff9500',  // Apple orange for medium clusters
                30,
                '#ff3b30'   // Apple red for large clusters
              ],
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                8, [
                  'step',
                  ['get', 'point_count'],
                  12,  // Small clusters at low zoom
                  10, 16,  // Medium clusters
                  30, 20   // Large clusters
                ],
                16, [
                  'step',
                  ['get', 'point_count'],
                  18,  // Small clusters at high zoom
                  10, 24,  // Medium clusters
                  30, 30   // Large clusters
                ]
              ],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-opacity': 0.9,
              'circle-opacity': 0.9
            }
          });

          // Add cluster count labels with Mapbox font
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

          // Add invisible layer for unclustered stores (used for queryRenderedFeatures)
          map.addLayer({
            id: 'stores-invisible',
            type: 'circle',
            source: 'stores',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-radius': 1,
              'circle-opacity': 0
            }
          });

          // Individual stores will use HTML teardrop markers instead of circle layer
          // Debounced update function to prevent excessive marker recreation
          const debouncedUpdateMarkers = () => {
            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
              updateStoreTeardropMarkers(map, storesRef.current, onStoreSelect);
            }, 100);
          };

          // Real-time visibility update for store markers during drag/pan
          const updateStoreMarkerVisibility = () => {
            const markersKey = '__storeTeardropMarkers';
            const markers = (map as any)[markersKey] || [];
            if (markers.length === 0) return;
            
            const canvas = map.getCanvas();
            const width = canvas.width / (window.devicePixelRatio || 1);
            const height = canvas.height / (window.devicePixelRatio || 1);
            
            markers.forEach((markerData: { marker: any; lngLat: [number, number] }) => {
              if (!markerData.marker || !markerData.lngLat) return;
              const point = map.project(markerData.lngLat);
              const isVisible = point.x >= -50 && point.x <= width + 50 &&
                               point.y >= -50 && point.y <= height + 50;
              const el = markerData.marker.getElement();
              if (el) {
                el.style.display = isVisible ? 'block' : 'none';
              }
            });
          };

          // Initial render of store teardrop markers (after a short delay to let map settle)
          setTimeout(() => {
            updateStoreTeardropMarkers(map, storesRef.current, onStoreSelect);
          }, 200);

          // Update marker visibility continuously during drag/pan
          map.on('move', updateStoreMarkerVisibility);
          
          // Update teardrop markers when map stops moving (debounced) - adds new markers
          map.on('moveend', debouncedUpdateMarkers);
          map.on('zoomend', debouncedUpdateMarkers);

          // Also update when source data changes
          map.on('data', (e: any) => {
            if (e.sourceId === 'stores' && e.isSourceLoaded) {
              debouncedUpdateMarkers();
            }
          });

          console.log('✅ All map layers added:', map.getStyle().layers.map(l => l.id));

          // Add click handlers
          map.on('click', 'clusters', (e) => {
            const features = map.queryRenderedFeatures(e.point, {
              layers: ['clusters']
            });
            const clusterId = features[0]?.properties?.cluster_id;
            const pointCount = features[0]?.properties?.point_count;
            
            console.log('🔍 Cluster clicked:', {
              clusterId,
              pointCount,
              coordinates: (features[0]?.geometry as GeoJSON.Point)?.coordinates
            });
            
            if (!clusterId) return;
            const source = map.getSource('stores') as any;
            
            // Get the actual stores in this cluster for debugging
            source?.getClusterLeaves(clusterId, pointCount, 0, (err: any, leaves: any) => {
              if (!err && leaves) {
                console.log('🔍 Stores in cluster:', leaves.map((leaf: any) => ({
                  id: leaf.properties.id,
                  name: leaf.properties.name,
                  status: leaf.properties.status,
                  coordinates: leaf.geometry.coordinates
                })));
              }
            });
            
            source?.getClusterExpansionZoom(clusterId, (err: any, zoom: any) => {
              if (err) return;
              const geometry = features[0].geometry as GeoJSON.Point;
              map.easeTo({
                center: geometry.coordinates as [number, number],
                zoom: zoom
              });
            });
          });

          // Note: Store click handling is now done via HTML teardrop marker click events

          // Hover state management
          let hoverTimeout: NodeJS.Timeout | null = null;
          let isHovering = false;

          // Change cursor and show popup on hover
          map.on('mouseenter', 'clusters', (e) => {
            console.log('🖱️ Cluster hover enter');
            isHovering = true;
            if (hoverTimeout) {
              clearTimeout(hoverTimeout);
              hoverTimeout = null;
            }

            map.getCanvas().style.cursor = 'pointer';
            const feature = e.features?.[0];
            if (!feature) return;
            const geometry = feature.geometry as GeoJSON.Point;
            const coordinates = geometry.coordinates.slice();
            const pointCount = feature.properties?.point_count;
            if (!pointCount) return;

            // Create simple DOM tooltip
            let tooltip = document.getElementById('map-tooltip');
            if (!tooltip) {
              tooltip = document.createElement('div');
              tooltip.id = 'map-tooltip';
              tooltip.style.cssText = `
                position: fixed;
                background: #1f2937;
                color: white;
                border: 1px solid #374151;
                border-radius: 8px;
                padding: 12px 16px;
                font-size: 14px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.4);
                z-index: 999999;
                pointer-events: none;
                max-width: 220px;
                font-family: system-ui, -apple-system, sans-serif;
              `;
              document.body.appendChild(tooltip);
            }

            tooltip.innerHTML = `<div style="background: #3b82f6; color: white; padding: 12px; font-weight: bold; border-radius: 6px;">${pointCount} stores<br><span style="font-size: 12px; opacity: 0.9;">Click to expand</span></div>`;
            tooltip.style.display = 'block';

            console.log('📍 Cluster popup shown at:', coordinates);
          });

          map.on('mouseleave', 'clusters', () => {
            console.log('🖱️ Cluster hover leave');
            isHovering = false;
            map.getCanvas().style.cursor = '';

            // Delay hiding the popup to prevent flicker
            hoverTimeout = setTimeout(() => {
              if (!isHovering) {
                const tooltip = document.getElementById('map-tooltip');
                if (tooltip) {
                  tooltip.style.display = 'none';
                }
                console.log('📍 Popup removed after delay');
              }
            }, 100);
          });

          // Note: Store hover handling is now done via HTML teardrop marker events

          // Update tooltip position on mouse move (for cluster tooltips)
          map.on('mousemove', (e) => {
            const tooltip = document.getElementById('map-tooltip');
            if (tooltip && tooltip.style.display === 'block' && mapRef.current) {
              // Get map container position relative to page
              const mapRect = mapRef.current.getBoundingClientRect();
              const pageX = mapRect.left + e.point.x;
              const pageY = mapRect.top + e.point.y;

              // Position tooltip close to cursor
              tooltip.style.left = (pageX + 15) + 'px';
              tooltip.style.top = (pageY - 60) + 'px';
            }
          });

          // Handle clicks on empty map space (background)
          // This fires for ALL clicks, so we check if it hit any interactive layer
          map.on('click', (e) => {
            // Check if click was on any interactive layer (note: unclustered-point removed, using HTML markers)
            const interactiveLayers = [
              'clusters', 
              'expansion-suggestions', 
              'expansion-suggestions-ai-glow',
              'competitors',
              'on-demand-competitor-icons'
            ];
            
            const features = map.queryRenderedFeatures(e.point, {
              layers: interactiveLayers.filter(layer => map.getLayer(layer))
            });
            
            // If no features were clicked, this is a background click
            if (features.length === 0) {
              console.log('🗺️ Map background clicked (no features)');
              // Call the background click handler if provided
              if (typeof (window as any).__mapBackgroundClickHandler === 'function') {
                (window as any).__mapBackgroundClickHandler();
              }
            }
          });

          // Auto-fit to show all markers if we have any (only on initial load)
          if (validStores.length > 0 && !hasAutoFittedRef.current) {
            console.log('🎯 Auto-fitting map to show all stores (initial load only)');
            const { LngLatBounds } = mapboxModule;
            const bounds = new LngLatBounds();
            validStores.forEach(store => {
              bounds.extend([store.longitude, store.latitude]);
            });
            console.log('📍 Final bounds:', bounds.toArray());
            map.fitBounds(bounds, { padding: 50 });
            hasAutoFittedRef.current = true;
            console.log('✅ Map fitted to bounds - will not auto-fit again');
          }

          setMapLoaded(true);
          setError(null);
        });

        map.on('error', (e) => {
          console.error('❌ Map error:', e);
          console.error('❌ Map error details:', {
            error: e.error,
            message: e.error?.message,
            stack: e.error?.stack,
            type: e.type,
            target: e.target
          });
          
          // Check for common errors
          let errorMessage = e.error?.message || 'Unknown error';
          if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            errorMessage = 'Invalid Mapbox token. Please check NEXT_PUBLIC_MAPBOX_TOKEN in .env.local';
          } else if (errorMessage.includes('style')) {
            errorMessage = 'Failed to load map style. Check your internet connection.';
          }
          
          setError(`Map error: ${errorMessage}`);
          initializingRef.current = false;
        });

        mapInstanceRef.current = map;

        // Attach viewport change event handlers
        attachEventHandlers(map, {
          onViewportChange: onViewportChange
        });

      } catch (err) {
        console.error('❌ Failed to initialize Mapbox GL:', err);
        console.error('❌ Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
          name: err instanceof Error ? err.name : undefined
        });
        setError(err instanceof Error ? err.message : 'Failed to load map');
      }
    };

    // Call initializeMap immediately - no timeout needed
    if (mapRef.current) {
      console.log('✅ Map container found, calling initializeMap');
      initializeMap().catch(err => {
        console.error('❌ initializeMap promise rejected:', err);
        setError(err instanceof Error ? err.message : 'Map initialization failed');
        initializingRef.current = false;
      });
    } else {
      console.error('🗺️ Map container not available');
      setError('Map container not found');
      initializingRef.current = false;
    }

    return () => {
      if (mapInstanceRef.current) {
        console.log('🧹 Cleaning up map');
        detachEventHandlers(mapInstanceRef.current);
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      initializingRef.current = false;
    };
  }, []); // Run once on mount

  // Separate effect to update store data when filters change
  useEffect(() => {
    if (mapInstanceRef.current && mapLoaded) {
      console.log('🔄 Updating map data due to store changes');
      console.log(`📊 Total stores received: ${stores.length}`);

      // Create updated GeoJSON data with same validation as initial load
      const validStores = stores.filter(store => {
        const isValid = (
          typeof store.latitude === 'number' &&
          typeof store.longitude === 'number' &&
          !isNaN(store.latitude) &&
          !isNaN(store.longitude) &&
          store.latitude >= -90 &&
          store.latitude <= 90 &&
          store.longitude >= -180 &&
          store.longitude <= 180
        );

        if (!isValid && store.latitude !== null && store.latitude !== undefined) {
          console.warn('⚠️ Store filtered during update:', {
            name: store.name,
            lat: store.latitude,
            lng: store.longitude
          });
        }

        return isValid;
      });

      console.log(`📊 Valid stores for update: ${validStores.length}/${stores.length}`);

      // Create analysis lookup map
      const analysisMap = new Map(storeAnalyses.map(a => [a.storeId, a]));

      const geojsonData = {
        type: 'FeatureCollection' as const,
        features: validStores.map(store => {
          const status = store.status || 'Unknown';
          const analysis = analysisMap.get(store.id);
          
          console.log(`📍 UPDATE: Store "${store.name}" status:`, { 
            raw: store.status, 
            final: status,
            type: typeof store.status,
            hasAnalysis: !!analysis
          });
          
          return {
            type: 'Feature' as const,
            properties: {
              id: store.id,
              name: store.name,
              recentActivity: store.recentActivity,
              status: status,
              region: store.region,
              country: store.country,
              city: store.city || '',
              latitude: store.latitude,
              longitude: store.longitude,
              // Analysis data
              hasAnalysis: !!analysis,
              locationQuality: analysis?.locationQualityScore || 0,
              performanceGap: analysis?.performanceGapPercent || 0,
              priority: analysis?.recommendationPriority || 'NONE'
            },
            geometry: {
              type: 'Point' as const,
              coordinates: [store.longitude, store.latitude]
            }
          };
        })
      };

      // Update the existing source data
      const source = mapInstanceRef.current.getSource('stores');
      if (source && source.setData) {
        source.setData(geojsonData);
        console.log('✅ Map data updated with', validStores.length, 'stores');
      }
    }
  }, [stores, mapLoaded]); // Update when stores or map loaded state changes

  // Separate effect to update expansion suggestions when they change
  useEffect(() => {
    console.log('🔄 WorkingMapView expansion suggestions effect:', {
      mapLoaded,
      hasMapInstance: !!mapInstanceRef.current,
      expansionSuggestionsLength: expansionSuggestions?.length || 0,
      expansionSuggestions: expansionSuggestions?.slice(0, 2)
    });
    
    if (mapInstanceRef.current && mapLoaded && expansionSuggestions) {
      console.log('🔄 Updating expansion suggestions:', expansionSuggestions.length);
      
      if (expansionSuggestions.length > 0) {
        console.log('✅ Adding expansion teardrop markers:', expansionSuggestions.length);
        addExpansionLayer(mapInstanceRef.current, expansionSuggestions, onSuggestionSelect);
      } else {
        console.log('🗑️ Removing expansion markers (no suggestions)');
        clearExpansionLayer(mapInstanceRef.current);
      }
    }
  }, [expansionSuggestions, mapLoaded, onSuggestionSelect]);

  // Separate effect to update competitors when they change
  useEffect(() => {
    console.log('🔄 WorkingMapView competitors effect:', {
      mapLoaded,
      hasMapInstance: !!mapInstanceRef.current,
      competitorsLength: competitors?.length || 0,
      competitors: competitors?.slice(0, 2)
    });
    
    if (mapInstanceRef.current && mapLoaded) {
      const map = mapInstanceRef.current;
      
      if (competitors && competitors.length > 0) {
        console.log('🔄 Updating competitors:', competitors.length);
        
        // Check if source already exists - update data instead of recreating
        const existingSource = map.getSource('competitors');
        
        if (existingSource) {
          // Update existing source data (no flicker!)
          const geojsonData = {
            type: 'FeatureCollection' as const,
            features: competitors.map(competitor => ({
              type: 'Feature' as const,
              properties: {
                id: competitor.id,
                brand: competitor.brand,
                name: competitor.name,
                category: competitor.category,
                threatLevel: competitor.threatLevel
              },
              geometry: {
                type: 'Point' as const,
                coordinates: [competitor.longitude, competitor.latitude]
              }
            }))
          };
          
          (existingSource as any).setData(geojsonData);
          console.log('✅ Updated competitors source data (no flicker):', competitors.length);
        } else {
          // First time - add the layer
          console.log('✅ Adding competitors layer for first time:', competitors);
          addCompetitorsLayer(map, competitors, onCompetitorSelect);
        }
      } else {
        console.log('🗑️ Removing competitors layer (no competitors)');
        // Remove layer if no competitors
        if (map.getLayer('competitors')) {
          map.removeLayer('competitors');
        }
        if (map.getSource('competitors')) {
          map.removeSource('competitors');
        }
      }
    }
  }, [competitors, mapLoaded, onCompetitorSelect]);

  // Effect to manage on-demand competitor overlay (new Google Places system)
  useEffect(() => {
    console.log('🔄 WorkingMapView competitors effect:', {
      hasMap: !!mapInstanceRef.current,
      mapLoaded,
      showOnDemandCompetitors,
      onDemandCompetitorsLength: onDemandCompetitors?.length,
      hasCenter: !!onDemandCompetitorCenter
    });
    
    if (!mapInstanceRef.current || !mapLoaded) return;
    
    const map = mapInstanceRef.current;
    
    if (showOnDemandCompetitors && onDemandCompetitors && onDemandCompetitors.length > 0 && onDemandCompetitorCenter) {
      console.log('🏢 Rendering on-demand competitors:', onDemandCompetitors.length);
      addOnDemandCompetitorLayer(map, onDemandCompetitors, onDemandCompetitorCenter, 5);
    } else {
      // Clear overlay when not showing
      console.log('🗑️ Removing competitors layer (no competitors)');
      clearOnDemandCompetitorLayer(map);
    }
  }, [showOnDemandCompetitors, onDemandCompetitors, onDemandCompetitorCenter, mapLoaded]);

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
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--s-text)' }}>Map Error</h4>
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

  const showLoading = loading || !mapLoaded;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid var(--s-border)'
    }}>
      {/* Always render map container */}
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Loading overlay */}
      {showLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--s-panel)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px', padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--s-text)', marginBottom: '8px' }}>
              {loading ? 'Loading stores...' : 'Initializing map...'}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--s-muted)', marginBottom: '16px' }}>
              {stores.length > 0 ? `${stores.length} stores ready` : 'Map will load without store data'}
            </div>
            {!mapLoaded && !loading && (
              <div style={{ 
                fontSize: '12px', 
                color: 'var(--s-muted)', 
                marginTop: '16px',
                padding: '12px',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                💡 If the map doesn&apos;t load, check the browser console (F12) for errors or try refreshing the page.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Store count overlay */}
      {!showLoading && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          pointerEvents: 'none'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#1f2937',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(0, 0, 0, 0.1)'
          }}>
            <span style={{ fontWeight: '600', color: '#0070f3' }}>{stores.length}</span>
            <span style={{ color: '#1f2937' }}> stores</span>
            {stores.filter(s => s.recentActivity).length > 0 && (
              <>
                <span style={{ margin: '0 8px', color: '#6b7280' }}>•</span>
                <span style={{ color: '#22c55e', fontWeight: '500' }}>
                  {stores.filter(s => s.recentActivity).length} active
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hide Mapbox attribution and clip marker overflow */}
      <style jsx global>{`
        .mapboxgl-ctrl-attrib,
        .mapboxgl-ctrl-logo {
          display: none !important;
        }
        
        /* Ensure markers are clipped to map container */
        .mapboxgl-canvas-container,
        .mapboxgl-marker {
          overflow: visible;
        }
        
        /* The map container clips all content including markers */
        .mapboxgl-map {
          overflow: hidden !important;
        }
      `}</style>
    </div>
  );
}