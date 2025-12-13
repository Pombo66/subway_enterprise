'use client';

import { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Store {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  annualTurnover?: number;
  status?: string;
}

interface Competitor {
  id: string;
  brand: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  threatLevel?: string;
}

interface ExpansionSuggestion {
  id: string;
  lat: number;
  lng: number;
  confidence: number;
  band: string;
  rationaleText: string;
}

export default function IntelligenceMapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [expansionSuggestions, setExpansionSuggestions] = useState<ExpansionSuggestion[]>([]);
  
  // Layer visibility toggles
  const [showStores, setShowStores] = useState(true);
  const [showCompetitors, setShowCompetitors] = useState(true);
  const [showExpansion, setShowExpansion] = useState(false);
  const [showCompetitionZones, setShowCompetitionZones] = useState(false);

  // Filters
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initializeMap = async () => {
      try {
        console.log('🗺️ Starting Mapbox GL initialization...');

        // Dynamic import of Mapbox GL to ensure it only runs client-side
        const mapboxModule = await import('mapbox-gl');
        const { Map: MapboxMap, NavigationControl } = mapboxModule;

        console.log('📦 Mapbox GL modules loaded successfully');

        if (!mapContainer.current) {
          throw new Error('Map container not found');
        }

        // Get Mapbox token from environment
        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        
        console.log('🔑 Mapbox token check:', {
          hasToken: !!mapboxToken,
          tokenLength: mapboxToken?.length,
          tokenPrefix: mapboxToken?.substring(0, 10)
        });
        
        if (!mapboxToken) {
          throw new Error('NEXT_PUBLIC_MAPBOX_TOKEN is required for Mapbox GL JS.');
        }
        
        if (!mapboxToken.startsWith('pk.')) {
          throw new Error('Invalid Mapbox token format. Token must start with "pk." for public access.');
        }
        
        // Set Mapbox access token
        mapboxModule.default.accessToken = mapboxToken;
        
        console.log('🔧 Creating Mapbox GL instance...');
        
        map.current = new MapboxMap({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [-0.1276, 51.5074], // London default
          zoom: 6,
          localIdeographFontFamily: 'sans-serif'
        });

        console.log('✅ Mapbox GL instance created successfully');

        // Add timeout to detect if map never loads
        const loadTimeout = setTimeout(() => {
          console.error('⏱️ Map load timeout - map did not fire load event within 10 seconds');
          setError('Map loading timeout. Please check your internet connection and Mapbox token.');
          setLoading(false);
        }, 10000);

        map.current.on('load', () => {
          clearTimeout(loadTimeout);
          console.log('✅ Map loaded successfully');
          
          // Debug container dimensions
          if (mapContainer.current) {
            const rect = mapContainer.current.getBoundingClientRect();
            console.log('📐 Map container dimensions:', {
              width: rect.width,
              height: rect.height,
              top: rect.top,
              left: rect.left
            });
          }
          
          // Add navigation controls
          map.current!.addControl(new NavigationControl(), 'top-right');
          
          // Force map resize to ensure it fills container
          setTimeout(() => {
            if (map.current) {
              console.log('🔄 Forcing map resize...');
              map.current.resize();
            }
          }, 100);
          
          setLoading(false);
          loadData();
        });

        map.current.on('error', (e) => {
          clearTimeout(loadTimeout);
          console.error('❌ Map error:', e);
          
          let errorMessage = e.error?.message || 'Unknown error';
          if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            errorMessage = 'Invalid Mapbox token. Please check NEXT_PUBLIC_MAPBOX_TOKEN.';
          } else if (errorMessage.includes('style')) {
            errorMessage = 'Failed to load map style. Check your internet connection.';
          }
          
          setError(`Map error: ${errorMessage}`);
          setLoading(false);
        });

      } catch (err) {
        console.error('❌ Failed to initialize Mapbox GL:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map');
        setLoading(false);
      }
    };

    initializeMap();

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || loading) return;
    updateMapLayers();
  }, [showStores, showCompetitors, showExpansion, showCompetitionZones, stores, competitors, expansionSuggestions, selectedBrand, selectedCategory]);

  const loadData = async () => {
    try {
      // Load stores
      const storesRes = await fetch('/api/stores');
      const storesData = await storesRes.json();
      setStores(storesData.stores || []);

      // Load competitors
      const competitorsRes = await fetch('/api/competitors');
      const competitorsData = await competitorsRes.json();
      const allCompetitors = competitorsData.competitors || [];
      setCompetitors(allCompetitors);

      // Extract unique brands and categories
      const uniqueBrands = [...new Set(allCompetitors.map((c: Competitor) => c.brand))];
      const uniqueCategories = [...new Set(allCompetitors.map((c: Competitor) => c.category))];
      setBrands(uniqueBrands);
      setCategories(uniqueCategories);

      // Center map on data
      if (storesData.stores?.length > 0) {
        const firstStore = storesData.stores[0];
        map.current?.flyTo({
          center: [firstStore.longitude, firstStore.latitude],
          zoom: 8,
        });
      }
    } catch (error) {
      console.error('Error loading map data:', error);
    }
  };

  const updateMapLayers = () => {
    if (!map.current) return;

    // Remove existing layers and sources
    ['stores-layer', 'competitors-layer', 'expansion-layer', 'competition-zones-layer'].forEach(layerId => {
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
    });

    ['stores-source', 'competitors-source', 'expansion-source', 'competition-zones-source'].forEach(sourceId => {
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }
    });

    // Add stores layer
    if (showStores && stores.length > 0) {
      const storesGeoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: stores
          .filter(s => s.latitude && s.longitude)
          .map(store => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [store.longitude, store.latitude],
            },
            properties: {
              id: store.id,
              name: store.name,
              turnover: store.annualTurnover,
              status: store.status,
            },
          })),
      };

      map.current.addSource('stores-source', {
        type: 'geojson',
        data: storesGeoJSON,
      });

      map.current.addLayer({
        id: 'stores-layer',
        type: 'circle',
        source: 'stores-source',
        paint: {
          'circle-radius': 8,
          'circle-color': '#10b981',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Add click handler for stores
      map.current.on('click', 'stores-layer', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = feature.properties;

        new mapboxgl.Popup()
          .setLngLat((feature.geometry as any).coordinates)
          .setHTML(`
            <div style="padding: 12px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #111827; font-size: 14px;">Store: ${props?.name}</h3>
              <p style="margin: 4px 0; color: #374151; font-size: 13px;"><strong>Status:</strong> ${props?.status || 'N/A'}</p>
              <p style="margin: 4px 0; color: #374151; font-size: 13px;"><strong>Turnover:</strong> ${props?.turnover ? `£${(props.turnover / 1000).toFixed(0)}k` : 'N/A'}</p>
            </div>
          `)
          .addTo(map.current!);
      });

      map.current.on('mouseenter', 'stores-layer', () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'stores-layer', () => {
        map.current!.getCanvas().style.cursor = '';
      });
    }

    // Add competitors layer
    if (showCompetitors && competitors.length > 0) {
      const filteredCompetitors = competitors.filter(c => {
        if (selectedBrand !== 'all' && c.brand !== selectedBrand) return false;
        if (selectedCategory !== 'all' && c.category !== selectedCategory) return false;
        return true;
      });

      const competitorsGeoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: filteredCompetitors.map(comp => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [comp.longitude, comp.latitude],
          },
          properties: {
            id: comp.id,
            brand: comp.brand,
            name: comp.name,
            category: comp.category,
            threatLevel: comp.threatLevel,
          },
        })),
      };

      map.current.addSource('competitors-source', {
        type: 'geojson',
        data: competitorsGeoJSON,
      });

      map.current.addLayer({
        id: 'competitors-layer',
        type: 'circle',
        source: 'competitors-source',
        paint: {
          'circle-radius': 6,
          'circle-color': [
            'match',
            ['get', 'category'],
            'qsr', '#ef4444',
            'pizza', '#f97316',
            'coffee', '#8b5cf6',
            'sandwich', '#3b82f6',
            '#6b7280'
          ],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.8,
        },
      });

      // Add click handler for competitors
      map.current.on('click', 'competitors-layer', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = feature.properties;

        new mapboxgl.Popup()
          .setLngLat((feature.geometry as any).coordinates)
          .setHTML(`
            <div style="padding: 12px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #111827; font-size: 14px;">${props?.brand}</h3>
              <p style="margin: 4px 0; color: #374151; font-size: 13px;"><strong>Location:</strong> ${props?.name}</p>
              <p style="margin: 4px 0; color: #374151; font-size: 13px;"><strong>Category:</strong> ${props?.category}</p>
              ${props?.threatLevel ? `<p style="margin: 4px 0; color: #374151; font-size: 13px;"><strong>Threat:</strong> ${props.threatLevel}</p>` : ''}
            </div>
          `)
          .addTo(map.current!);
      });

      map.current.on('mouseenter', 'competitors-layer', () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'competitors-layer', () => {
        map.current!.getCanvas().style.cursor = '';
      });
    }

    // Add expansion suggestions layer
    if (showExpansion && expansionSuggestions.length > 0) {
      const expansionGeoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: expansionSuggestions.map(exp => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [exp.lng, exp.lat],
          },
          properties: {
            id: exp.id,
            confidence: exp.confidence,
            band: exp.band,
            rationale: exp.rationaleText,
          },
        })),
      };

      map.current.addSource('expansion-source', {
        type: 'geojson',
        data: expansionGeoJSON,
      });

      map.current.addLayer({
        id: 'expansion-layer',
        type: 'circle',
        source: 'expansion-source',
        paint: {
          'circle-radius': 10,
          'circle-color': [
            'match',
            ['get', 'band'],
            'GOLD', '#fbbf24',
            'SILVER', '#94a3b8',
            'BRONZE', '#d97706',
            '#8b5cf6'
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.7,
        },
      });
    }
  };

  const loadExpansionSuggestions = async () => {
    try {
      // This would call your expansion API
      // For now, we'll leave it empty until user triggers it
      setShowExpansion(true);
    } catch (error) {
      console.error('Error loading expansion suggestions:', error);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900">Unified Intelligence Map</h1>
        <p className="text-sm text-gray-700 mt-1">
          Comprehensive view of stores, competitors, expansion opportunities, and competitive zones
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white border-b px-6 py-3 flex items-center gap-6 flex-wrap">
        {/* Layer toggles */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showStores}
              onChange={(e) => setShowStores(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium text-gray-900">Stores</span>
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCompetitors}
              onChange={(e) => setShowCompetitors(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium text-gray-900">Competitors</span>
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showExpansion}
              onChange={(e) => setShowExpansion(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium text-gray-900">Expansion</span>
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCompetitionZones}
              onChange={(e) => setShowCompetitionZones(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium text-gray-900">Competition Zones</span>
          </label>
        </div>

        {/* Filters */}
        {showCompetitors && (
          <>
            <div className="h-6 w-px bg-gray-300"></div>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="text-sm border border-gray-300 rounded px-3 py-1 bg-white text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Brands</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-sm border border-gray-300 rounded px-3 py-1 bg-white text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </>
        )}

        {/* Stats */}
        <div className="ml-auto flex items-center gap-4 text-sm font-medium text-gray-900">
          <span>Stores: {stores.length}</span>
          <span>Competitors: {competitors.length}</span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div 
          ref={mapContainer} 
          className="absolute inset-0 w-full h-full"
          style={{ minHeight: '400px' }}
        />
        
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-800 font-medium">Loading intelligence map...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-white flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Configuration Error</h3>
              <p className="text-gray-700 mb-4">{error}</p>
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <p className="text-sm text-gray-800 font-medium mb-2">To fix this:</p>
                <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                  <li>Get a Mapbox token from <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">mapbox.com</a></li>
                  <li>Add it to your Railway environment variables as <code className="bg-gray-200 px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code></li>
                  <li>Redeploy your application</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-lg p-4 max-w-xs border border-gray-200">
          <h3 className="font-semibold text-sm mb-3 text-gray-900">Legend</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-gray-800">Your Stores</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-gray-800">QSR Competitors</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span className="text-gray-800">Pizza Competitors</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              <span className="text-gray-800">Coffee Competitors</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span className="text-gray-800">Sandwich Competitors</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span className="text-gray-800">Expansion Opportunities</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
