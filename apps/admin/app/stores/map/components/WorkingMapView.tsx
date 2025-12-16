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
  onCompetitorSelect
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
  
  // Map event handlers for viewport updates
  const { attachEventHandlers, detachEventHandlers } = useMapEventHandlers();

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

    // Add main suggestion circles with Apple Maps-inspired styling
    map.addLayer({
      id: 'expansion-suggestions',
      type: 'circle',
      source: 'expansion-suggestions',
      paint: {
        'circle-color': [
          'match',
          ['get', 'status'],
          'APPROVED', '#30d158',  // Apple green for approved
          'HOLD', '#ff9500',      // Apple orange for on hold
          // Default to purple for all other statuses (NEW, PENDING, REJECTED, etc.)
          '#af52de'  // Apple purple default for all expansion suggestions
        ],
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, [
            'case',
            ['get', 'hasAIAnalysis'],
            6,   // AI-enhanced at low zoom
            5    // Standard at low zoom
          ],
          12, [
            'case',
            ['get', 'hasAIAnalysis'],
            10,  // AI-enhanced at city zoom
            8    // Standard at city zoom
          ],
          16, [
            'case',
            ['get', 'hasAIAnalysis'],
            14,  // AI-enhanced at street zoom
            12   // Standard at street zoom
          ]
        ],
        'circle-stroke-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, [
            'case',
            ['get', 'hasAIAnalysis'],
            2,   // AI-enhanced stroke at low zoom
            1.5  // Standard stroke at low zoom
          ],
          16, [
            'case',
            ['get', 'hasAIAnalysis'],
            3,   // AI-enhanced stroke at high zoom
            2    // Standard stroke at high zoom
          ]
        ],
        'circle-stroke-color': [
          'case',
          ['get', 'hasAIAnalysis'],
          '#ffcc02',  // Apple gold stroke for AI-enhanced suggestions
          '#ffffff'   // White stroke for deterministic suggestions
        ],
        'circle-stroke-opacity': 0.9,
        'circle-opacity': 0.85
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
      map.on('mouseenter', 'competitors', (e) => {
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

          // Add individual store points layer with Apple Maps-inspired styling
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
                  '#ff3b30',  // Apple red - critical issues
                  ['>', ['get', 'performanceGap'], 10],
                  '#30d158',  // Apple green - overperforming
                  ['>', ['get', 'performanceGap'], -10],
                  '#ff9500',  // Apple orange - on target
                  '#ff6b35'   // Apple orange-red - underperforming
                ],
                // Default status colors with Apple-inspired palette
                [
                  'match',
                  ['get', 'status'],
                  'Open', '#30d158',    // Apple green for Open
                  'Closed', '#8e8e93',  // Apple gray for Closed
                  'Planned', '#af52de', // Apple purple for Planned
                  '#007aff'             // Apple blue as default
                ]
              ],
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                8, 8,   // Larger at low zoom (was 4)
                12, 12, // Larger at city zoom (was 8)
                16, 16  // Larger at street zoom (was 12)
              ],
              'circle-stroke-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                8, 2,   // Thicker stroke at low zoom (was 1)
                12, 3,  // Thicker stroke at city zoom (was 2)
                16, 4   // Thicker stroke at street zoom (was 3)
              ],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-opacity': 0.8,
              'circle-opacity': 0.9
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
              coordinates: features[0]?.geometry?.coordinates
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

  // Separate effect to update competitors when they change
  useEffect(() => {
    console.log('🔄 WorkingMapView competitors effect:', {
      mapLoaded,
      hasMapInstance: !!mapInstanceRef.current,
      competitorsLength: competitors?.length || 0,
      competitors: competitors?.slice(0, 2)
    });
    
    if (mapInstanceRef.current && mapLoaded && competitors) {
      console.log('🔄 Updating competitors:', competitors.length);
      
      if (competitors.length > 0) {
        console.log('✅ Adding competitors layer:', competitors);
        addCompetitorsLayer(mapInstanceRef.current, competitors, onCompetitorSelect);
      } else {
        console.log('🗑️ Removing competitors layer (no competitors)');
        // Remove layer if no competitors
        if (mapInstanceRef.current.getLayer('competitors')) {
          mapInstanceRef.current.removeLayer('competitors');
        }
        if (mapInstanceRef.current.getSource('competitors')) {
          mapInstanceRef.current.removeSource('competitors');
        }
      }
    }
  }, [competitors, mapLoaded, onCompetitorSelect]);

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