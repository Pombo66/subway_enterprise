'use client';

import { useEffect, useRef, useState } from 'react';
import { MapViewProps } from '../types';
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
  storeAnalyses = []
}: MapViewProps) {
  console.log('🎨 WorkingMapView component rendering with props:', {
    storesLength: stores?.length,
    loading,
    expansionSuggestionsLength: expansionSuggestions?.length
  });

  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const hasAutoFittedRef = useRef(false);
  const storesRef = useRef<typeof stores>([]);
  const initializingRef = useRef(false);

  // Keep stores ref updated
  storesRef.current = stores;

  // Helper function to add expansion suggestions layer
  const addExpansionLayer = (map: any, suggestions: any[], onSelect?: (suggestion: any) => void) => {
    // Remove existing layers if they exist
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

    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: suggestions.map(suggestion => ({
        type: 'Feature' as const,
        properties: {
          id: suggestion.id,
          band: suggestion.band,
          confidence: suggestion.confidence,
          status: suggestion.status || 'NEW',
          hasAIAnalysis: suggestion.hasAIAnalysis || false,
          aiProcessingRank: suggestion.aiProcessingRank || null
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [suggestion.lng, suggestion.lat]
        }
      }))
    };

    // Debug AI features and confidence
    const aiFeatures = geojsonData.features.filter(f => f.properties.hasAIAnalysis === true);
    const highConfidenceFeatures = geojsonData.features.filter(f => f.properties.confidence > 0.70);
    
    console.log(`🗺️ Map: Adding ${suggestions.length} suggestions, ${aiFeatures.length} with AI analysis`);
    console.log(`✨ High confidence (>70%): ${highConfidenceFeatures.length} suggestions`);
    console.log(`🔍 Confidence value types:`, suggestions.slice(0, 3).map(s => ({
      id: s.id,
      confidence: s.confidence,
      confidenceType: typeof s.confidence,
      isNumber: typeof s.confidence === 'number',
      greaterThan75: s.confidence > 0.75
    })));
    
    if (highConfidenceFeatures.length > 0) {
      console.log(`✨ High confidence samples:`, highConfidenceFeatures.slice(0, 3).map(f => ({
        id: f.properties.id,
        confidence: f.properties.confidence,
        band: f.properties.band
      })));
    }
    
    if (aiFeatures.length > 0) {
      console.log(`🤖 AI features sample:`, aiFeatures.slice(0, 2).map(f => ({
        id: f.properties.id,
        hasAIAnalysis: f.properties.hasAIAnalysis,
        aiProcessingRank: f.properties.aiProcessingRank
      })));
    }

    map.addSource('expansion-suggestions', {
      type: 'geojson',
      data: geojsonData
    });

    // Add AI enhancement glow effect FIRST (behind main circles)
    map.addLayer({
      id: 'expansion-suggestions-ai-glow',
      type: 'circle',
      source: 'expansion-suggestions',
      filter: ['all', ['has', 'hasAIAnalysis'], ['==', ['get', 'hasAIAnalysis'], true]],
      paint: {
        'circle-color': '#FFD700',  // Gold glow
        'circle-radius': 20,        // Even larger for visibility
        'circle-opacity': 0.4,      // More visible
        'circle-blur': 1            // Subtle blur for glow effect
      }
    });
    
    console.log(`🟡 AI glow layer added with ${aiFeatures.length} potential AI features`);

    // Add main suggestion circles SECOND (on top of glow)
    map.addLayer({
      id: 'expansion-suggestions',
      type: 'circle',
      source: 'expansion-suggestions',
      paint: {
        'circle-color': [
          'match',
          ['get', 'status'],
          'APPROVED', '#10b981',  // Green for approved
          'HOLD', '#f59e0b',      // Yellow/Orange for on hold
          // Default to purple for all other statuses (NEW, PENDING, REJECTED, etc.)
          '#8b5cf6'  // Purple default for all expansion suggestions
        ],
        'circle-radius': [
          'case',
          ['get', 'hasAIAnalysis'],
          12,  // Larger radius for AI-enhanced suggestions
          10   // Standard radius for deterministic suggestions
        ],
        'circle-stroke-width': [
          'case',
          ['get', 'hasAIAnalysis'],
          3,   // Thicker stroke for AI-enhanced suggestions
          2    // Standard stroke for deterministic suggestions
        ],
        'circle-stroke-color': [
          'case',
          ['get', 'hasAIAnalysis'],
          '#FFD700',  // Gold stroke for AI-enhanced suggestions
          '#ffffff'   // White stroke for deterministic suggestions
        ],
        'circle-opacity': 0.9       // Slightly more opaque for better visibility
      }
    });

    // Add centered yellow dot for high confidence suggestions (>75%)
    // Centered dot matching the legend design
    map.addLayer({
      id: 'expansion-suggestions-sparkle',
      type: 'circle',
      source: 'expansion-suggestions',
      filter: ['>', ['get', 'confidence'], 0.75],
      paint: {
        'circle-radius': 3, // Small centered dot
        'circle-color': '#f59e0b', // Orange/gold
        'circle-stroke-width': 0.5,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 1
        // No translate - centered on the marker
      }
    });
    
    const highConfCount = geojsonData.features.filter(f => f.properties.confidence > 0.75).length;
    console.log(`✨ Yellow dot layer added for ${highConfCount} high confidence suggestions (>75%)`);
    console.log(`✨ Yellow dot layer config:`, {
      layerId: 'expansion-suggestions-sparkle',
      filter: ['>', ['get', 'confidence'], 0.75],
      expectedCount: highConfCount,
      layerExists: map.getLayer('expansion-suggestions-sparkle') !== undefined
    });

    // Add click handler for suggestions (both layers)
    if (onSelect) {
      const handleSuggestionClick = (e: any) => {
        const feature = e.features?.[0];
        if (!feature) return;
        
        const suggestionId = feature.properties.id;
        const suggestion = suggestions.find(s => s.id === suggestionId);
        if (suggestion) {
          console.log('🔍 Selected suggestion data:', suggestion);
          console.log('🔍 Has AI Analysis:', !!suggestion.hasAIAnalysis);
          console.log('🔍 AI Processing Rank:', suggestion.aiProcessingRank);
          console.log('🔍 Has locationContext:', !!suggestion.locationContext);
          console.log('🔍 Has aiInsights:', !!suggestion.aiInsights);
          console.log('🔍 Has intensityMetadata:', !!suggestion.intensityMetadata);
          onSelect(suggestion);
        }
      };

      map.on('click', 'expansion-suggestions', handleSuggestionClick);
      map.on('click', 'expansion-suggestions-ai-glow', handleSuggestionClick);

      const handleMouseEnter = () => {
        map.getCanvas().style.cursor = 'pointer';
      };

      const handleMouseLeave = () => {
        map.getCanvas().style.cursor = '';
      };

      // Add mouse handlers for both layers
      map.on('mouseenter', 'expansion-suggestions', handleMouseEnter);
      map.on('mouseenter', 'expansion-suggestions-ai-glow', handleMouseEnter);
      map.on('mouseleave', 'expansion-suggestions', handleMouseLeave);
      map.on('mouseleave', 'expansion-suggestions-ai-glow', handleMouseLeave);
    }
  };

  console.log('🗺️ WorkingMapView render:', {
    mapLoaded,
    error,
    storesCount: stores.length,
    loading,
    storesSample: stores.slice(0, 2).map(s => ({ name: s.name, lat: s.latitude, lng: s.longitude }))
  });

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
          // Use Streets v11 instead of v12 to avoid font issues
          style: 'mapbox://styles/mapbox/streets-v11',
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
          console.log('🎨 Beautiful Mapbox style loaded:', {
            style: 'mapbox://styles/mapbox/streets-v11',
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
          }

          if (validStores.length > 0) {
            console.log('📍 Sample valid stores:', validStores.slice(0, 3).map(s => ({
              name: s.name,
              lat: s.latitude,
              lng: s.longitude
            })));
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

          // Add cluster circles layer
          map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'stores',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'step',
                ['get', 'point_count'],
                '#3b82f6',  // Blue for small clusters
                10,
                '#f59e0b',  // Orange for medium clusters
                30,
                '#ef4444'   // Red for large clusters
              ],
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                15,  // Small clusters
                10,
                20,  // Medium clusters
                30,
                25   // Large clusters
              ],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
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

          // Add individual store points layer
          map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'stores',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': [
                'case',
                // Analysis mode colors (performance-based)
                ['get', 'hasAnalysis'],
                [
                  'case',
                  ['==', ['get', 'priority'], 'HIGH'],
                  '#ef4444',  // Red - critical issues
                  ['>', ['get', 'performanceGap'], 10],
                  '#10b981',  // Green - overperforming
                  ['>', ['get', 'performanceGap'], -10],
                  '#f59e0b',  // Yellow - on target
                  '#f97316'   // Orange - underperforming
                ],
                // Default status colors
                [
                  'match',
                  ['get', 'status'],
                  'Open', '#22c55e',    // Green for Open
                  'Closed', '#6b7280',  // Grey for Closed
                  'Planned', '#a855f7', // Purple for Planned
                  '#3b82f6'             // Blue as default fallback
                ]
              ],
              'circle-radius': [
                'case',
                ['get', 'hasAnalysis'],
                14,  // Larger for analyzed stores
                12   // Default size
              ],
              'circle-stroke-width': [
                'case',
                ['get', 'hasAnalysis'],
                3,  // Thicker stroke for analyzed stores
                ['==', ['get', 'isAISuggested'], true],
                3,  // Thicker stroke for AI-suggested planned stores
                2   // Default stroke
              ],
              'circle-stroke-color': [
                'case',
                // Purple ring for AI-suggested planned stores
                ['all', ['==', ['get', 'status'], 'Planned'], ['==', ['get', 'isAISuggested'], true]],
                '#a78bfa',  // Light purple ring
                '#ffffff'   // White ring for all others
              ]
            }
          });

          console.log('✅ All map layers added:', map.getStyle().layers.map(l => l.id));

          // Add click handlers
          map.on('click', 'clusters', (e) => {
            const features = map.queryRenderedFeatures(e.point, {
              layers: ['clusters']
            });
            const clusterId = features[0]?.properties?.cluster_id;
            if (!clusterId) return;
            const source = map.getSource('stores') as any;
            source?.getClusterExpansionZoom(clusterId, (err: any, zoom: any) => {
              if (err) return;
              const geometry = features[0].geometry as GeoJSON.Point;
              map.easeTo({
                center: geometry.coordinates as [number, number],
                zoom: zoom
              });
            });
          });

          // Store click handler - uses ref to access current stores
          const handleStoreClick = (e: any) => {
            console.log('🖱️ Pin clicked, features:', e.features?.length);
            const feature = e.features?.[0];
            if (!feature) {
              console.warn('⚠️ No feature found in click event');
              return;
            }
            const storeId = feature.properties.id;
            console.log('🔍 Looking for store with ID:', storeId);
            
            // Access current stores from ref
            const currentStores = storesRef.current;
            console.log('📊 Available stores in ref:', currentStores.length);
            
            const store = currentStores.find(s => s.id === storeId);
            
            if (store) {
              console.log('🏪 Store clicked:', store.name);

              // Hide tooltip on click
              const tooltip = document.getElementById('map-tooltip');
              if (tooltip) {
                tooltip.style.display = 'none';
              }

              onStoreSelect(store);
            } else {
              console.error('❌ Store not found in stores array. ID:', storeId);
              console.error('Available store IDs:', currentStores.map(s => s.id));
            }
          };
          
          map.on('click', 'unclustered-point', handleStoreClick);

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

          map.on('mouseenter', 'unclustered-point', (e) => {
            console.log('🖱️ Store hover enter');
            isHovering = true;
            if (hoverTimeout) {
              clearTimeout(hoverTimeout);
              hoverTimeout = null;
            }

            map.getCanvas().style.cursor = 'pointer';
            const feature = e.features?.[0];
            if (!feature) return;
            const properties = feature.properties as any;
            if (!properties) return;
            const { name, recentActivity, region, country, city, latitude, longitude } = properties;

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
                max-width: 280px;
                font-family: system-ui, -apple-system, sans-serif;
              `;
              document.body.appendChild(tooltip);
            }

            const statusColor = properties.status === 'Open' ? '#22c55e' : 
                                properties.status === 'Closed' ? '#6b7280' : 
                                properties.status === 'Planned' ? '#a855f7' : '#3b82f6';
            const statusLabel = properties.status || 'Unknown';

            tooltip.innerHTML = `
              <div style="font-weight: 600; margin-bottom: 6px; color: white;">${name}</div>
              ${city ? `<div style="font-size: 12px; color: #d1d5db; margin-bottom: 2px;">${city}</div>` : ''}
              <div style="font-size: 12px; color: #d1d5db; margin-bottom: 4px;">${country}${region ? `, ${region}` : ''}</div>
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px; font-family: monospace;">
                ${latitude.toFixed(4)}, ${longitude.toFixed(4)}
              </div>
              <div style="font-size: 12px;">
                <span style="color: ${statusColor};">
                  ● ${statusLabel}
                </span>
              </div>
            `;

            tooltip.style.display = 'block';

            console.log('📍 DOM tooltip shown for:', name);
          });

          map.on('mouseleave', 'unclustered-point', () => {
            console.log('🖱️ Store hover leave');
            isHovering = false;
            map.getCanvas().style.cursor = '';

            // Hide DOM tooltip
            const tooltip = document.getElementById('map-tooltip');
            if (tooltip) {
              tooltip.style.display = 'none';
            }

            console.log('📍 DOM tooltip hidden');
          });

          // Update tooltip position on mouse move
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
        console.log('✅ Adding expansion layer with suggestions:', expansionSuggestions);
        addExpansionLayer(mapInstanceRef.current, expansionSuggestions, onSuggestionSelect);
      } else {
        console.log('🗑️ Removing expansion layer (no suggestions)');
        // Remove layer if no suggestions
        if (mapInstanceRef.current.getLayer('expansion-suggestions-sparkle')) {
          mapInstanceRef.current.removeLayer('expansion-suggestions-sparkle');
        }
        if (mapInstanceRef.current.getLayer('expansion-suggestions-ai-glow')) {
          mapInstanceRef.current.removeLayer('expansion-suggestions-ai-glow');
        }
        if (mapInstanceRef.current.getLayer('expansion-suggestions')) {
          mapInstanceRef.current.removeLayer('expansion-suggestions');
        }
        if (mapInstanceRef.current.getSource('expansion-suggestions')) {
          mapInstanceRef.current.removeSource('expansion-suggestions');
        }
      }
    }
  }, [expansionSuggestions, mapLoaded, onSuggestionSelect]);

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
      overflow: 'visible',
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

      {/* Hide Mapbox attribution */}
      <style jsx global>{`
        .mapboxgl-ctrl-attrib,
        .mapboxgl-ctrl-logo {
          display: none !important;
        }
      `}</style>
    </div>
  );
}