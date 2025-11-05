/**
 * SingletonMapManager - Ensures single map instance per page lifecycle
 * Prevents memory leaks and performance issues from multiple map instances
 */

import { Map as MapLibreMap, NavigationControl, GeoJSONSource } from 'maplibre-gl';
import { StoreWithActivity } from '../types';

export interface MapInstanceManager {
  initializeMap(container: HTMLElement): Promise<MapLibreMap>;
  getMapInstance(): MapLibreMap | null;
  updateDataSource(stores: StoreWithActivity[]): void;
  toggleClustering(enabled: boolean): void;
  cleanup(): void;
  isInitialized(): boolean;
}

export class SingletonMapManager implements MapInstanceManager {
  private mapInstance: MapLibreMap | null = null;
  private isMapInitialized = false;
  private initializationPromise: Promise<MapLibreMap> | null = null;
  private clusteringEnabled = true;

  async initializeMap(container: HTMLElement): Promise<MapLibreMap> {
    // Return existing instance if already initialized
    if (this.mapInstance && this.isMapInitialized) {
      console.log('🗺️ Reusing existing map instance');
      return this.mapInstance;
    }

    // Return existing initialization promise if in progress
    if (this.initializationPromise) {
      console.log('🗺️ Map initialization in progress, waiting...');
      return this.initializationPromise;
    }

    // Start new initialization with performance tracking
    console.log('🗺️ Initializing new map instance');
    const startTime = performance.now();
    
    this.initializationPromise = this.createMapInstance(container);

    try {
      this.mapInstance = await this.initializationPromise;
      this.isMapInitialized = true;
      
      const initTime = performance.now() - startTime;
      console.log('✅ Map initialization complete in', initTime.toFixed(2), 'ms');
      
      // Track performance
      const { mapTelemetry } = await import('../lib/MapTelemetry');
      mapTelemetry.trackPerformance('map_initialization', initTime);
      
      return this.mapInstance;
    } catch (error) {
      console.error('❌ Map initialization failed:', error);
      
      // Track error
      const { mapTelemetry } = await import('../lib/MapTelemetry');
      mapTelemetry.trackError(
        error instanceof Error ? error : new Error('Map initialization failed'),
        'map_initialization'
      );
      
      this.cleanup();
      throw error;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async createMapInstance(container: HTMLElement): Promise<MapLibreMap> {
    const map = new MapLibreMap({
      container,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [0, 20], // Global center
      zoom: 2, // Global zoom level
      attributionControl: false,
      // Performance optimizations
      preserveDrawingBuffer: false,
      antialias: false,
      maxZoom: 18,
      minZoom: 1
    });

    // Wait for map to load with timeout
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Map load timeout after 10 seconds'));
      }, 10000);

      map.on('load', () => {
        clearTimeout(timeout);
        resolve();
      });

      map.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    // Add navigation controls
    map.addControl(new NavigationControl(), 'top-right');

    // Initialize data sources and layers
    this.initializeDataSources(map);

    return map;
  }

  private initializeDataSources(map: MapLibreMap): void {
    console.log('🗺️ Initializing map data sources and layers');

    // Add GeoJSON source for stores with clustering
    map.addSource('stores', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      },
      cluster: this.clusteringEnabled,
      clusterMaxZoom: 14, // Max zoom to cluster points on
      clusterRadius: 50 // Radius of each cluster when clustering points
    });

    // Add cluster circles layer
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'stores',
      filter: ['has', 'point_count'],
      paint: {
        // Use step expressions to implement three types of circles:
        // * Blue, 20px circles when point count is less than 100
        // * Yellow, 30px circles when point count is between 100 and 750
        // * Pink, 40px circles when point count is greater than or equal to 750
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#3b82f6', // Blue for small clusters
          100,
          '#f59e0b', // Amber for medium clusters
          750,
          '#ef4444'  // Red for large clusters
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20, // Small clusters
          100,
          30, // Medium clusters
          750,
          40  // Large clusters
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

    // Add individual store points (unclustered)
    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'stores',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'case',
          ['get', 'active'],
          '#22c55e', // Green for active stores
          '#3b82f6'  // Blue for inactive stores
        ],
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    // Add activity pulse layer for active stores only
    map.addLayer({
      id: 'activity-pulse',
      type: 'circle',
      source: 'stores',
      filter: ['all', ['!', ['has', 'point_count']], ['get', 'active']],
      paint: {
        'circle-color': '#22c55e',
        'circle-opacity': 0.6,
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          1, 15,
          15, 25
        ]
      }
    });

    console.log('✅ Map layers initialized');
  }

  getMapInstance(): MapLibreMap | null {
    return this.mapInstance;
  }

  updateDataSource(stores: StoreWithActivity[]): void {
    if (!this.mapInstance || !this.isMapInitialized) {
      console.warn('⚠️ Cannot update data source: map not initialized');
      return;
    }

    const startTime = performance.now();
    const geojsonData = this.generateGeoJSON(stores);
    const source = this.mapInstance.getSource('stores') as GeoJSONSource;

    if (source) {
      source.setData(geojsonData);
      const updateTime = performance.now() - startTime;
      
      console.log('✅ Updated map data source with', stores.length, 'stores in', updateTime.toFixed(2), 'ms');
      
      // Track performance for slow updates
      if (updateTime > 16) {
        import('../lib/MapTelemetry').then(({ mapTelemetry }) => {
          mapTelemetry.trackPerformance('data_source_update', updateTime, {
            storeCount: stores.length,
            activeStoreCount: stores.filter(s => s.recentActivity).length
          });
        });
      }
      
      // Track memory usage occasionally
      import('../lib/MapTelemetry').then(({ mapTelemetry }) => {
        mapTelemetry.trackMemoryUsage();
      });
      
    } else {
      console.error('❌ Could not find stores data source');
    }
  }

  private generateGeoJSON(stores: StoreWithActivity[]): GeoJSON.FeatureCollection {
    const validStores = stores.filter(store => {
      const hasValidCoords = 
        typeof store.latitude === 'number' && 
        typeof store.longitude === 'number' &&
        !isNaN(store.latitude) && 
        !isNaN(store.longitude) &&
        store.latitude >= -90 && store.latitude <= 90 &&
        store.longitude >= -180 && store.longitude <= 180;

      if (!hasValidCoords) {
        console.warn('❌ Invalid coordinates for store:', store.name, store.latitude, store.longitude);
      }

      return hasValidCoords;
    });

    return {
      type: 'FeatureCollection',
      features: validStores.map(store => ({
        type: 'Feature',
        properties: {
          id: store.id,
          name: store.name,
          region: store.region,
          country: store.country,
          active: store.recentActivity || false,
          franchiseeId: store.franchiseeId
        },
        geometry: {
          type: 'Point',
          coordinates: [store.longitude, store.latitude] // GeoJSON uses [lng, lat]
        }
      }))
    };
  }

  toggleClustering(enabled: boolean): void {
    if (!this.mapInstance || !this.isMapInitialized) {
      console.warn('⚠️ Cannot toggle clustering: map not initialized');
      return;
    }

    if (this.clusteringEnabled === enabled) {
      console.log('🔄 Clustering already', enabled ? 'enabled' : 'disabled');
      return;
    }

    console.log('🔄 Toggling clustering:', enabled ? 'enabled' : 'disabled');
    this.clusteringEnabled = enabled;

    try {
      // Update source clustering configuration
      const source = this.mapInstance.getSource('stores') as GeoJSONSource;
      if (source) {
        // Remove existing source and layers
        this.mapInstance.removeLayer('activity-pulse');
        this.mapInstance.removeLayer('unclustered-point');
        this.mapInstance.removeLayer('cluster-count');
        this.mapInstance.removeLayer('clusters');
        this.mapInstance.removeSource('stores');

        // Re-add source with new clustering configuration
        this.mapInstance.addSource('stores', {
          type: 'geojson',
          data: source._data || {
            type: 'FeatureCollection',
            features: []
          },
          cluster: enabled,
          clusterMaxZoom: 14,
          clusterRadius: 50
        });

        // Re-initialize layers
        this.initializeDataSources(this.mapInstance);

        console.log('✅ Clustering toggled successfully');
      }
    } catch (error) {
      console.error('❌ Failed to toggle clustering:', error);
      
      // Track error
      import('../lib/MapTelemetry').then(({ mapTelemetry }) => {
        mapTelemetry.trackError(
          error instanceof Error ? error : new Error('Clustering toggle failed'),
          'clustering_toggle'
        );
      });
    }
  }

  isInitialized(): boolean {
    return this.isMapInitialized && this.mapInstance !== null;
  }

  cleanup(): void {
    console.log('🧹 Cleaning up map instance');
    
    if (this.mapInstance) {
      try {
        // Remove all event listeners first
        // Note: We'll let the event handlers hook handle specific listener cleanup
        // this.mapInstance.off() requires specific event types
        
        // Remove all layers
        const style = this.mapInstance.getStyle();
        if (style && style.layers) {
          style.layers.forEach(layer => {
            try {
              if (this.mapInstance!.getLayer(layer.id)) {
                this.mapInstance!.removeLayer(layer.id);
              }
            } catch (error) {
              console.warn('⚠️ Error removing layer:', layer.id, error);
            }
          });
        }
        
        // Remove all sources
        if (style && style.sources) {
          Object.keys(style.sources).forEach(sourceId => {
            try {
              if (this.mapInstance!.getSource(sourceId)) {
                this.mapInstance!.removeSource(sourceId);
              }
            } catch (error) {
              console.warn('⚠️ Error removing source:', sourceId, error);
            }
          });
        }
        
        // Remove controls
        try {
          const controls = (this.mapInstance as any)._controls;
          if (controls) {
            controls.forEach((control: any) => {
              try {
                this.mapInstance!.removeControl(control);
              } catch (error) {
                console.warn('⚠️ Error removing control:', error);
              }
            });
          }
        } catch (error) {
          console.warn('⚠️ Error removing controls:', error);
        }
        
        // Clear any pending animations
        this.mapInstance.stop();
        
        // Remove the map instance
        this.mapInstance.remove();
      } catch (error) {
        console.warn('⚠️ Error during map cleanup:', error);
      }
      
      this.mapInstance = null;
    }
    
    this.isMapInitialized = false;
    this.initializationPromise = null;
    
    // Force garbage collection hint (if available)
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
      } catch (error) {
        // Ignore - gc() is not always available
      }
    }
    
    console.log('✅ Map cleanup complete');
  }
}

// Export singleton instance
export const mapManager = new SingletonMapManager();