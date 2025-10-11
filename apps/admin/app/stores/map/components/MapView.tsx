'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Map as MapLibreMap, NavigationControl, Marker, LngLatLike } from 'maplibre-gl';
import Supercluster from 'supercluster';
import { MapViewProps, StoreWithActivity } from '../types';
import { MapTelemetryHelpers, safeTrackEvent, getCurrentUserId } from '../telemetry';
import { useMapErrorHandler } from './MapErrorBoundary';
import { MarkerLoadingOverlay, InlineLoadingIndicator, ErrorStateWithRetry } from './LoadingSkeletons';
import { usePerformanceTracking, MapPerformanceHelpers } from '../performance';

// Dynamically import MapLibre CSS only when this component loads
let mapLibreCSSLoaded = false;

function loadMapLibreCSS() {
  if (typeof window !== 'undefined' && !mapLibreCSSLoaded) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
    document.head.appendChild(link);
    mapLibreCSSLoaded = true;
  }
}

// Performance optimization constants
const VIEWPORT_CULLING_BUFFER = 0.1; // 10% buffer around viewport
const MAX_VISIBLE_MARKERS = 500; // Maximum markers to render at once
const CLUSTERING_UPDATE_DEBOUNCE = 100; // Debounce clustering updates
const MARKER_POOL_SIZE = 100; // Size of marker element pool for reuse

// Marker icon cache for performance
class MarkerIconCache {
  private cache = new Map<string, HTMLElement>();
  private pool: HTMLElement[] = [];

  getStoreMarker(store: StoreWithActivity): HTMLElement {
    const cacheKey = `store-${store.recentActivity ? 'active' : 'inactive'}`;
    
    // Try to get from pool first
    if (this.pool.length > 0) {
      const element = this.pool.pop()!;
      this.updateStoreMarkerElement(element, store);
      return element;
    }

    // Check cache for template
    let template = this.cache.get(cacheKey);
    if (!template) {
      template = this.createStoreMarkerTemplate(store);
      this.cache.set(cacheKey, template);
    }

    // Clone template and customize
    const element = template.cloneNode(true) as HTMLElement;
    this.updateStoreMarkerElement(element, store);
    return element;
  }

  getClusterMarker(count: number): HTMLElement {
    const cacheKey = `cluster-${this.getClusterSize(count)}`;
    
    // Try to get from pool first
    if (this.pool.length > 0) {
      const element = this.pool.pop()!;
      this.updateClusterMarkerElement(element, count);
      return element;
    }

    // Check cache for template
    let template = this.cache.get(cacheKey);
    if (!template) {
      template = this.createClusterMarkerTemplate(count);
      this.cache.set(cacheKey, template);
    }

    // Clone template and customize
    const element = template.cloneNode(true) as HTMLElement;
    this.updateClusterMarkerElement(element, count);
    return element;
  }

  returnToPool(element: HTMLElement) {
    if (this.pool.length < MARKER_POOL_SIZE) {
      // Clean up event listeners and reset element
      element.replaceWith(element.cloneNode(true));
      this.pool.push(element);
    }
  }

  private createStoreMarkerTemplate(store: StoreWithActivity): HTMLElement {
    const el = document.createElement('div');
    el.className = 'store-marker';
    el.style.cssText = `
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: var(--s-primary, #0066cc);
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      cursor: pointer;
      position: relative;
      transition: transform 0.2s ease;
    `;

    if (store.recentActivity) {
      const pulseRing = document.createElement('div');
      pulseRing.className = 'activity-pulse';
      pulseRing.style.cssText = `
        position: absolute;
        top: -4px;
        left: -4px;
        width: 32px;
        height: 32px;
        border: 2px solid var(--s-success, #22c55e);
        border-radius: 50%;
        animation: pulse 2s infinite;
        pointer-events: none;
      `;
      el.appendChild(pulseRing);
    }

    return el;
  }

  private createClusterMarkerTemplate(count: number): HTMLElement {
    const size = this.getClusterSize(count);
    const el = document.createElement('div');
    el.className = 'cluster-marker';
    el.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background-color: var(--s-primary, #0066cc);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: ${Math.max(12, size / 3)}px;
      transition: transform 0.2s ease;
    `;
    return el;
  }

  private updateStoreMarkerElement(element: HTMLElement, store: StoreWithActivity) {
    // Update any store-specific properties if needed
    element.setAttribute('data-store-id', store.id);
  }

  private updateClusterMarkerElement(element: HTMLElement, count: number) {
    element.textContent = count.toString();
    const size = this.getClusterSize(count);
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;
    element.style.fontSize = `${Math.max(12, size / 3)}px`;
  }

  private getClusterSize(count: number): number {
    if (count < 10) return 30;
    if (count < 50) return 40;
    if (count < 100) return 50;
    return 60;
  }
}

// Viewport-based culling utility
class ViewportCuller {
  static isInViewport(
    lat: number, 
    lng: number, 
    bounds: { north: number; south: number; east: number; west: number },
    buffer: number = VIEWPORT_CULLING_BUFFER
  ): boolean {
    const latBuffer = (bounds.north - bounds.south) * buffer;
    const lngBuffer = (bounds.east - bounds.west) * buffer;
    
    return (
      lat >= bounds.south - latBuffer &&
      lat <= bounds.north + latBuffer &&
      lng >= bounds.west - lngBuffer &&
      lng <= bounds.east + lngBuffer
    );
  }

  static cullStores(stores: StoreWithActivity[], bounds: any): StoreWithActivity[] {
    const viewportBounds = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    };

    const visibleStores = stores.filter(store => 
      this.isInViewport(store.latitude, store.longitude, viewportBounds)
    );

    // If still too many markers, prioritize active stores and apply distance-based culling
    if (visibleStores.length > MAX_VISIBLE_MARKERS) {
      const activeStores = visibleStores.filter(store => store.recentActivity);
      const inactiveStores = visibleStores.filter(store => !store.recentActivity);
      
      // Always include active stores, then fill remaining slots with inactive stores
      const maxInactive = Math.max(0, MAX_VISIBLE_MARKERS - activeStores.length);
      const selectedInactive = this.spatialSample(inactiveStores, maxInactive);
      
      return [...activeStores, ...selectedInactive];
    }

    return visibleStores;
  }

  private static spatialSample(stores: StoreWithActivity[], maxCount: number): StoreWithActivity[] {
    if (stores.length <= maxCount) return stores;

    // Simple spatial sampling - divide into grid and take one from each cell
    const gridSize = Math.ceil(Math.sqrt(maxCount));
    const result: StoreWithActivity[] = [];
    
    // Find bounds
    const lats = stores.map(s => s.latitude);
    const lngs = stores.map(s => s.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const latStep = (maxLat - minLat) / gridSize;
    const lngStep = (maxLng - minLng) / gridSize;
    
    // Create grid and sample
    for (let i = 0; i < gridSize && result.length < maxCount; i++) {
      for (let j = 0; j < gridSize && result.length < maxCount; j++) {
        const cellMinLat = minLat + i * latStep;
        const cellMaxLat = minLat + (i + 1) * latStep;
        const cellMinLng = minLng + j * lngStep;
        const cellMaxLng = minLng + (j + 1) * lngStep;
        
        const cellStores = stores.filter(store => 
          store.latitude >= cellMinLat && store.latitude < cellMaxLat &&
          store.longitude >= cellMinLng && store.longitude < cellMaxLng
        );
        
        if (cellStores.length > 0) {
          result.push(cellStores[0]); // Take first store from cell
        }
      }
    }
    
    return result;
  }
}

/**
 * MapView component with MapLibre GL integration
 * Handles store marker rendering, clustering, and user interactions
 * Optimized for performance with viewport culling and marker caching
 */
export default function MapView({ 
  stores, 
  onStoreSelect, 
  viewport, 
  onViewportChange,
  loading = false 
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const clusterMarkersRef = useRef<Map<string, Marker>>(new Map());
  const superclusterRef = useRef<Supercluster | null>(null);
  const markerCacheRef = useRef<MarkerIconCache>(new MarkerIconCache());
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [visibleStoreCount, setVisibleStoreCount] = useState(0);
  const { handleError } = useMapErrorHandler();
  
  // Performance tracking for this component
  const performanceTracker = usePerformanceTracking('MapView');
  
  const maxRetries = 3;

  // Memoize culled stores for performance
  const culledStores = useMemo(() => {
    if (!mapRef.current || !isMapReady || stores.length === 0) return stores;
    
    try {
      const bounds = mapRef.current.getBounds();
      const result = ViewportCuller.cullStores(stores, bounds);
      
      setVisibleStoreCount(result.length);
      
      // Track performance metrics safely
      try {
        performanceTracker.trackOperation('viewport_culling', () => result, {
          totalStores: stores.length,
          zoomLevel: mapRef.current.getZoom(),
        });
        performanceTracker.trackMemory('viewport_culling');
      } catch (perfError) {
        console.warn('Performance tracking error:', perfError);
      }
      
      return result;
    } catch (error) {
      console.warn('Error culling stores:', error);
      try {
        performanceTracker.trackError(error as Error, 'viewport_culling', true);
      } catch (perfError) {
        console.warn('Performance error tracking failed:', perfError);
      }
      return stores;
    }
  }, [stores, viewport, isMapReady]);

  // Initialize map instance with error handling
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initializeMap = async () => {
      try {
        setMapError(null);
        
        // Load MapLibre CSS
        loadMapLibreCSS();

        // Initialize map with error handling
        const map = new MapLibreMap({
          container: mapContainerRef.current!,
          style: 'https://demotiles.maplibre.org/style.json', // Free demo tiles
          center: [viewport.longitude, viewport.latitude],
          zoom: viewport.zoom,
          attributionControl: {
            compact: false,
          },
        });

        // Add navigation controls
        map.addControl(new NavigationControl(), 'top-right');

        // Handle map load with timeout
        const loadTimeout = setTimeout(() => {
          const error = new Error('Map failed to load within timeout');
          handleError(error, 'map_load_timeout');
          setMapError('Map is taking too long to load. Please try again.');
        }, 10000); // 10 second timeout

        // Handle map load
        map.on('load', () => {
          clearTimeout(loadTimeout);
          setIsMapReady(true);
          setMapError(null);
        });

        // Handle map errors
        map.on('error', (e) => {
          clearTimeout(loadTimeout);
          const error = new Error(`Map error: ${e.error?.message || 'Unknown error'}`);
          handleError(error, 'map_error');
          setMapError('Failed to load map. Please check your connection and try again.');
        });

        // Handle viewport changes
        map.on('moveend', () => {
          try {
            const center = map.getCenter();
            const zoom = map.getZoom();
            
            onViewportChange({
              latitude: center.lat,
              longitude: center.lng,
              zoom: zoom,
            });
          } catch (error) {
            handleError(error as Error, 'viewport_change');
          }
        });

        // Add keyboard navigation support
        map.getContainer().setAttribute('tabindex', '0');
        map.getContainer().setAttribute('role', 'application');
        map.getContainer().setAttribute('aria-label', 'Interactive map showing store locations. Use arrow keys to pan, plus and minus keys to zoom.');
        
        map.getContainer().addEventListener('keydown', (e) => {
          const step = 0.01; // Pan step size
          const zoomStep = 1; // Zoom step size
          
          switch (e.key) {
            case 'ArrowUp':
              e.preventDefault();
              map.panBy([0, -50]);
              break;
            case 'ArrowDown':
              e.preventDefault();
              map.panBy([0, 50]);
              break;
            case 'ArrowLeft':
              e.preventDefault();
              map.panBy([-50, 0]);
              break;
            case 'ArrowRight':
              e.preventDefault();
              map.panBy([50, 0]);
              break;
            case '+':
            case '=':
              e.preventDefault();
              map.zoomIn();
              break;
            case '-':
            case '_':
              e.preventDefault();
              map.zoomOut();
              break;
            case 'Home':
              e.preventDefault();
              map.setCenter([viewport.longitude, viewport.latitude]);
              map.setZoom(viewport.zoom);
              break;
            case 'Escape':
              e.preventDefault();
              // Clear any selected store
              onStoreSelect(null as any);
              break;
          }
        });

        mapRef.current = map;

      } catch (error) {
        handleError(error as Error, 'map_initialization');
        setMapError('Failed to initialize map. Please try again.');
      }
    };

    initializeMap();

    // Cleanup function
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (error) {
          console.warn('Error cleaning up map:', error);
        }
        mapRef.current = null;
      }
      setIsMapReady(false);
      setMapError(null);
    };
  }, [retryCount]); // Include retryCount to trigger re-initialization on retry

  // Update map viewport when viewport prop changes
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    const map = mapRef.current;
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    // Only update if there's a significant difference to avoid infinite loops
    const latDiff = Math.abs(currentCenter.lat - viewport.latitude);
    const lngDiff = Math.abs(currentCenter.lng - viewport.longitude);
    const zoomDiff = Math.abs(currentZoom - viewport.zoom);

    if (latDiff > 0.001 || lngDiff > 0.001 || zoomDiff > 0.1) {
      map.setCenter([viewport.longitude, viewport.latitude]);
      map.setZoom(viewport.zoom);
    }
  }, [viewport, isMapReady]);

  // Initialize Supercluster with optimized settings
  useEffect(() => {
    if (!culledStores.length) return;

    try {
      const cluster = new Supercluster({
        radius: Math.min(60, Math.max(30, culledStores.length / 10)), // Dynamic radius based on store count
        maxZoom: 16, // Max zoom to cluster points on
        minZoom: 0, // Min zoom to cluster points on
        minPoints: Math.max(2, Math.min(5, Math.floor(culledStores.length / 100))), // Dynamic min points
        extent: 512, // Tile extent for better performance
        nodeSize: 64, // KD-tree node size for faster queries
      });

      // Convert culled stores to GeoJSON features
      const points = culledStores.map(store => ({
        type: 'Feature' as const,
        properties: {
          cluster: false,
          storeId: store.id,
          store: store,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [store.longitude, store.latitude],
        },
      }));

      cluster.load(points);
      superclusterRef.current = cluster;

      // Track performance metrics safely
      try {
        performanceTracker.trackOperation('clustering_initialization', () => cluster, {
          storeCount: culledStores.length,
        });
        performanceTracker.trackMemory('clustering_complete');
      } catch (perfError) {
        console.warn('Performance tracking error in clustering:', perfError);
      }
    } catch (error) {
      console.error('Error initializing clustering:', error);
      try {
        performanceTracker.trackError(error as Error, 'clustering_initialization', true);
      } catch (perfError) {
        console.warn('Performance error tracking failed:', perfError);
      }
    }
  }, [culledStores]);

  // Create store marker element using cache
  const createStoreMarkerElement = useCallback((store: StoreWithActivity): HTMLElement => {
    const el = markerCacheRef.current.getStoreMarker(store);

    // Add accessibility attributes
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', 
      `${store.name} store in ${store.region}, ${store.country}${store.recentActivity ? ' - has recent activity' : ''}`
    );
    el.setAttribute('title', 
      `${store.name}\n${store.region}, ${store.country}${store.recentActivity ? '\n🟢 Recent activity' : ''}`
    );

    const handleActivation = (e: Event) => {
      e.stopPropagation();
      
      // Track store marker click telemetry
      safeTrackEvent(() => {
        MapTelemetryHelpers.trackMapStoreOpened(store, getCurrentUserId());
      }, 'map_store_opened');
      
      onStoreSelect(store);
    };

    // Add hover effect
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.2)';
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)';
    });

    el.addEventListener('focus', () => {
      el.style.transform = 'scale(1.2)';
      el.style.outline = '2px solid var(--s-primary)';
      el.style.outlineOffset = '2px';
    });

    el.addEventListener('blur', () => {
      el.style.transform = 'scale(1)';
      el.style.outline = 'none';
    });

    // Add click and keyboard handlers
    el.addEventListener('click', handleActivation);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleActivation(e);
      }
    });

    return el;
  }, [onStoreSelect]);

  // Create cluster marker element using cache
  const createClusterMarkerElement = useCallback((count: number, clusterId: number): HTMLElement => {
    const el = markerCacheRef.current.getClusterMarker(count);

    // Add accessibility attributes
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `Cluster of ${count} stores. Click or press Enter to zoom in and expand.`);
    el.setAttribute('title', `${count} stores clustered together\nClick to zoom in and expand`);

    const handleExpansion = (e: Event) => {
      e.stopPropagation();
      if (mapRef.current && superclusterRef.current) {
        const expansionZoom = superclusterRef.current.getClusterExpansionZoom(clusterId);
        // Get cluster leaves to find center point
        const leaves = superclusterRef.current.getLeaves(clusterId, Infinity);
        if (leaves.length > 0 && 'geometry' in leaves[0]) {
          const [lng, lat] = leaves[0].geometry.coordinates;
          mapRef.current.easeTo({
            center: [lng, lat],
            zoom: Math.min(expansionZoom, 16),
            duration: 500,
          });
        }
      }
    };

    // Add hover effect
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.1)';
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)';
    });

    el.addEventListener('focus', () => {
      el.style.transform = 'scale(1.1)';
      el.style.outline = '2px solid var(--s-primary)';
      el.style.outlineOffset = '2px';
    });

    el.addEventListener('blur', () => {
      el.style.transform = 'scale(1)';
      el.style.outline = 'none';
    });

    // Add click and keyboard handlers
    el.addEventListener('click', handleExpansion);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleExpansion(e);
      }
    });

    return el;
  }, []);

  // Update markers based on current viewport and clustering with error handling and debouncing
  const updateMarkers = useCallback(async () => {
    if (!mapRef.current || !superclusterRef.current || !isMapReady) return;

    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Debounce updates for smooth interactions
    updateTimeoutRef.current = setTimeout(async () => {
      try {
        setIsLoadingMarkers(true);
        
        const map = mapRef.current!;
        const cluster = superclusterRef.current!;
        const bounds = map.getBounds();
        const zoom = map.getZoom();

        const startTime = performance.now();

        // Return marker elements to pool before clearing
        markersRef.current.forEach(marker => {
          try {
            const element = marker.getElement();
            markerCacheRef.current.returnToPool(element);
            marker.remove();
          } catch (error) {
            console.warn('Error removing marker:', error);
          }
        });
        clusterMarkersRef.current.forEach(marker => {
          try {
            const element = marker.getElement();
            markerCacheRef.current.returnToPool(element);
            marker.remove();
          } catch (error) {
            console.warn('Error removing cluster marker:', error);
          }
        });
        markersRef.current.clear();
        clusterMarkersRef.current.clear();

        // Get clusters for current viewport with expanded bounds for smoother panning
        const expandedBounds: [number, number, number, number] = [
          bounds.getWest() - (bounds.getEast() - bounds.getWest()) * 0.1,
          bounds.getSouth() - (bounds.getNorth() - bounds.getSouth()) * 0.1,
          bounds.getEast() + (bounds.getEast() - bounds.getWest()) * 0.1,
          bounds.getNorth() + (bounds.getNorth() - bounds.getSouth()) * 0.1
        ];

        const clusters = cluster.getClusters(expandedBounds, Math.floor(zoom));

        // Limit clusters for performance
        const limitedClusters = clusters.slice(0, MAX_VISIBLE_MARKERS);

        // Batch marker creation for better performance
        const markerBatch: Array<{ marker: Marker; key: string; isCluster: boolean }> = [];

        limitedClusters.forEach((feature) => {
          try {
            const [lng, lat] = feature.geometry.coordinates;
            const lngLat: LngLatLike = [lng, lat];

            if (feature.properties?.cluster) {
              // Create cluster marker
              const count = feature.properties.point_count;
              const clusterId = feature.properties.cluster_id;
              const el = createClusterMarkerElement(count, clusterId);
              
              const marker = new Marker({ element: el }).setLngLat(lngLat);
              markerBatch.push({ 
                marker, 
                key: `cluster-${clusterId}`, 
                isCluster: true 
              });
            } else {
              // Create individual store marker
              const store = feature.properties?.store as StoreWithActivity;
              if (store) {
                const el = createStoreMarkerElement(store);
                
                const marker = new Marker({ element: el }).setLngLat(lngLat);
                markerBatch.push({ 
                  marker, 
                  key: store.id, 
                  isCluster: false 
                });
              }
            }
          } catch (error) {
            console.warn('Error creating marker:', error);
            handleError(error as Error, 'marker_creation');
          }
        });

        // Add markers to map in batches to prevent blocking
        const batchSize = 50;
        for (let i = 0; i < markerBatch.length; i += batchSize) {
          const batch = markerBatch.slice(i, i + batchSize);
          
          batch.forEach(({ marker, key, isCluster }) => {
            marker.addTo(map);
            if (isCluster) {
              clusterMarkersRef.current.set(key, marker);
            } else {
              markersRef.current.set(key, marker);
            }
          });

          // Yield control to prevent blocking UI
          if (i + batchSize < markerBatch.length) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }
        
        // Track performance after marker update
        const duration = performance.now() - startTime;
        try {
          performanceTracker.trackOperation('marker_update_complete', () => {}, {
            markerCount: markerBatch.length,
            clusterCount: markerBatch.filter((m: any) => m.isCluster).length,
            zoomLevel: zoom,
            duration,
            viewportBounds: {
              north: bounds.getNorth(),
              south: bounds.getSouth(),
              east: bounds.getEast(),
              west: bounds.getWest(),
            },
          });
        } catch (perfError) {
          console.warn('Performance tracking error:', perfError);
        }
        
      } catch (error) {
        handleError(error as Error, 'marker_update');
        performanceTracker.trackError(error as Error, 'marker_update', true);
      } finally {
        setIsLoadingMarkers(false);
        // Track memory usage after marker update
        performanceTracker.trackMemory('marker_update_complete');
      }
    }, CLUSTERING_UPDATE_DEBOUNCE);
  }, [createStoreMarkerElement, createClusterMarkerElement, isMapReady, handleError]);

  // Update markers when culled stores, viewport, or map readiness changes
  useEffect(() => {
    if (isMapReady && culledStores.length > 0) {
      updateMarkers();
    }
  }, [culledStores, isMapReady, updateMarkers]);

  // Add map event listeners for marker updates
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    const map = mapRef.current;
    
    const handleMapUpdate = () => {
      updateMarkers();
    };

    map.on('zoom', handleMapUpdate);
    map.on('move', handleMapUpdate);

    return () => {
      map.off('zoom', handleMapUpdate);
      map.off('move', handleMapUpdate);
    };
  }, [isMapReady, updateMarkers]);

  // Add CSS for pulse animation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.2);
          opacity: 0.7;
        }
        100% {
          transform: scale(1.4);
          opacity: 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .activity-pulse {
          animation: none !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Retry function for map initialization
  const handleRetry = useCallback(() => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setMapError(null);
      setIsMapReady(false);
    }
  }, [retryCount, maxRetries]);

  // Show error state if map failed to load
  if (mapError) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <ErrorStateWithRetry
          message={mapError}
          onRetry={handleRetry}
          retryLabel={retryCount < maxRetries ? `Try Again (${maxRetries - retryCount} attempts left)` : 'Switch to List View'}
        />
      </div>
    );
  }

  return (
    <div 
      ref={mapContainerRef}
      role="application"
      aria-label="Interactive map showing store locations"
      style={{ 
        width: '100%', 
        height: '100%',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {!isMapReady && !mapError && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--s-bg-secondary)',
            zIndex: 1000,
          }}
        >
          <div style={{ textAlign: 'center', color: 'var(--s-muted)' }}>
            <div style={{ 
              fontSize: '48px', 
              marginBottom: '16px',
              animation: 'pulse 2s infinite'
            }}>
              🗺️
            </div>
            <div style={{ marginBottom: '16px' }}>Initializing map...</div>
            <div className="loading-spinner" />
            {retryCount > 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                Attempt {retryCount + 1} of {maxRetries + 1}
              </div>
            )}
          </div>
        </div>
      )}
      
      {loading && isMapReady && (
        <div 
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 1000,
          }}
        >
          <InlineLoadingIndicator message="Updating stores..." />
        </div>
      )}

      {isLoadingMarkers && isMapReady && culledStores.length > 0 && (
        <MarkerLoadingOverlay count={visibleStoreCount} />
      )}

      {/* Performance info overlay for debugging */}
      {process.env.NODE_ENV === 'development' && isMapReady && (
        <div 
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            zIndex: 1000,
          }}
        >
          <div>Total: {stores.length} stores</div>
          <div>Visible: {visibleStoreCount} stores</div>
          <div>Markers: {markersRef.current.size + clusterMarkersRef.current.size}</div>
        </div>
      )}
    </div>
  );
}