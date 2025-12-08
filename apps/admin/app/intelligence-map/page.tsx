'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

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
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
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
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-0.1276, 51.5074], // London default
      zoom: 6,
    });

    map.current.on('load', () => {
      setLoading(false);
      loadData();
    });

    return () => {
      map.current?.remove();
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
            <div style="padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-weight: 600;">Store: ${props?.name}</h3>
              <p style="margin: 4px 0;">Status: ${props?.status || 'N/A'}</p>
              <p style="margin: 4px 0;">Turnover: ${props?.turnover ? `$${(props.turnover / 1000).toFixed(0)}k` : 'N/A'}</p>
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
            <div style="padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-weight: 600;">${props?.brand}</h3>
              <p style="margin: 4px 0;">${props?.name}</p>
              <p style="margin: 4px 0;">Category: ${props?.category}</p>
              ${props?.threatLevel ? `<p style="margin: 4px 0;">Threat: ${props.threatLevel}</p>` : ''}
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
        <p className="text-sm text-gray-600 mt-1">
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
            <span className="text-sm">Stores</span>
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCompetitors}
              onChange={(e) => setShowCompetitors(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Competitors</span>
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showExpansion}
              onChange={(e) => setShowExpansion(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Expansion</span>
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCompetitionZones}
              onChange={(e) => setShowCompetitionZones(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Competition Zones</span>
          </label>
        </div>

        {/* Filters */}
        {showCompetitors && (
          <>
            <div className="h-6 w-px bg-gray-300"></div>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="all">All Brands</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </>
        )}

        {/* Stats */}
        <div className="ml-auto flex items-center gap-4 text-sm text-gray-600">
          <span>Stores: {stores.length}</span>
          <span>Competitors: {competitors.length}</span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" />
        
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading intelligence map...</p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <h3 className="font-semibold text-sm mb-3">Legend</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span>Your Stores</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span>QSR Competitors</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span>Pizza Competitors</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              <span>Coffee Competitors</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span>Sandwich Competitors</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span>Expansion Opportunities</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
