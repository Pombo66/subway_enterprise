/**
 * MarkerRenderer - Optimized marker rendering with batch operations and viewport culling
 * Handles efficient marker creation, updates, and cleanup with performance optimizations
 */

import { Map as MapLibreMap, Marker } from 'maplibre-gl';
import Supercluster from 'supercluster';
import { StoreWithActivity } from '../types';

export interface MarkerRenderOptions {
  maxVisibleMarkers: number;
  viewportBuffer: number;
  batchSize: number;
  clusterRadius: number;
  clusterMaxZoom: number;
  clusterMinPoints: number;
}

export interface RenderStats {
  totalStores: number;
  visibleStores: number;
  renderedMarkers: number;
  clusteredMarkers: number;
  renderTime: number;
  batchCount: number;
}

interface MarkerBatch {
  stores: StoreWithActivity[];
  clusters: any[];
  timestamp: number;
}

interface PendingRender {
  batch: MarkerBatch;
  timeoutId: NodeJS.Timeout;
  abortController: AbortController;
}

/**
 * Optimized marker renderer with batch operations and viewport culling
 */
export class MarkerRenderer {
  private map: MapLibreMap;
  private markers: Map<string, Marker> = new Map();
  private clusterMarkers: Map<string, Marker> = new Map();
  private supercluster: Supercluster | null = null;
  private pendingRender: PendingRender | null = null;
  private isRendering: boolean = false;
  private renderQueue: MarkerBatch[] = [];
  private abortController: AbortController = new AbortController();
  
  // Configuration
  private options: MarkerRenderOptions;
  
  // Performance tracking
  private renderStats: RenderStats = {
    totalStores: 0,
    visibleStores: 0,
    renderedMarkers: 0,
    clusteredMarkers: 0,
    renderTime: 0,
    batchCount: 0,
  };

  // Callbacks
  private onStoreSelect: ((store: StoreWithActivity) => void) | null = null;
  private onRenderComplete: ((stats: RenderStats) => void) | null = null;

  constructor(
    map: MapLibreMap,
    options: Partial<MarkerRenderOptions> = {}
  ) {
    this.map = map;
    this.options = {
      maxVisibleMarkers: options.maxVisibleMarkers ?? 500,
      viewportBuffer: options.viewportBuffer ?? 0.1,
      batchSize: options.batchSize ?? 50,
      clusterRadius: options.clusterRadius ?? 50,
      clusterMaxZoom: options.clusterMaxZoom ?? 16,
      clusterMinPoints: options.clusterMinPoints ?? 2,
      ...options,
    };
  }

  /**
   * Set callback for store selection
   */
  setOnStoreSelect(callback: (store: StoreWithActivity) => void): void {
    this.onStoreSelect = callback;
  }

  /**
   * Set callback for render completion
   */
  setOnRenderComplete(callback: (stats: RenderStats) => void): void {
    this.onRenderComplete = callback;
  }

  /**
   * Render stores with optimized batching and clustering
   */
  async renderStores(stores: StoreWithActivity[]): Promise<void> {
    if (this.abortController.signal.aborted) {
      return;
    }

    const startTime = performance.now();

    try {
      // Cancel any pending render
      this.cancelPendingRender();

      // Prepare clustering
      await this.initializeClustering(stores);

      // Get current viewport bounds
      const bounds = this.map.getBounds();
      const zoom = this.map.getZoom();

      // Get clusters and points for current viewport
      const { clusters, points } = this.getViewportClusters(bounds, zoom);

      // Create render batch
      const batch: MarkerBatch = {
        stores: points.map(p => p.properties.store),
        clusters,
        timestamp: Date.now(),
      };

      // Queue the render batch
      this.queueRenderBatch(batch);

      // Update stats
      this.renderStats = {
        totalStores: stores.length,
        visibleStores: points.length,
        renderedMarkers: 0, // Will be updated during render
        clusteredMarkers: clusters.length,
        renderTime: performance.now() - startTime,
        batchCount: Math.ceil((points.length + clusters.length) / this.options.batchSize),
      };

    } catch (error) {
      console.error('Error in renderStores:', error);
      throw error;
    }
  }

  /**
   * Clear all markers
   */
  clearMarkers(): void {
    // Clear store markers
    this.markers.forEach(marker => {
      try {
        marker.remove();
      } catch (error) {
        console.warn('Error removing marker:', error);
      }
    });
    this.markers.clear();

    // Clear cluster markers
    this.clusterMarkers.forEach(marker => {
      try {
        marker.remove();
      } catch (error) {
        console.warn('Error removing cluster marker:', error);
      }
    });
    this.clusterMarkers.clear();
  }

  /**
   * Get current render statistics
   */
  getStats(): RenderStats {
    return { ...this.renderStats };
  }

  /**
   * Cancel any pending renders
   */
  cancelPendingRender(): void {
    if (this.pendingRender) {
      clearTimeout(this.pendingRender.timeoutId);
      this.pendingRender.abortController.abort();
      this.pendingRender = null;
    }

    // Clear render queue
    this.renderQueue = [];
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Abort all operations
    this.abortController.abort();

    // Cancel pending renders
    this.cancelPendingRender();

    // Clear all markers
    this.clearMarkers();

    // Clear clustering
    this.supercluster = null;

    // Reset state
    this.isRendering = false;
    this.renderQueue = [];
    this.onStoreSelect = null;
    this.onRenderComplete = null;
  }

  /**
   * Initialize clustering with optimized settings
   */
  private async initializeClustering(stores: StoreWithActivity[]): Promise<void> {
    if (stores.length === 0) {
      this.supercluster = null;
      return;
    }

    // Dynamic clustering parameters based on store count and zoom
    const zoom = this.map.getZoom();
    const dynamicRadius = Math.max(
      30,
      Math.min(this.options.clusterRadius, stores.length / 10)
    );
    const dynamicMinPoints = Math.max(
      2,
      Math.min(this.options.clusterMinPoints, Math.floor(stores.length / 100))
    );

    this.supercluster = new Supercluster({
      radius: dynamicRadius,
      maxZoom: this.options.clusterMaxZoom,
      minZoom: 0,
      minPoints: dynamicMinPoints,
      extent: 512,
      nodeSize: 64,
    });

    // Convert stores to GeoJSON features
    const points = stores.map(store => ({
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

    // Load points into clustering
    this.supercluster.load(points);
  }

  /**
   * Get clusters and points for current viewport
   */
  private getViewportClusters(bounds: any, zoom: number): { clusters: any[]; points: any[] } {
    if (!this.supercluster) {
      return { clusters: [], points: [] };
    }

    try {
      // Get clusters for current viewport
      const bbox = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ] as [number, number, number, number];

      const clusters = this.supercluster.getClusters(bbox, Math.floor(zoom));
      
      // Separate clusters and individual points
      const clusterFeatures = clusters.filter(f => f.properties.cluster);
      const pointFeatures = clusters.filter(f => !f.properties.cluster);

      // Limit visible markers if needed
      const limitedPoints = this.limitVisibleMarkers(pointFeatures);

      return {
        clusters: clusterFeatures,
        points: limitedPoints,
      };
    } catch (error) {
      console.error('Error getting viewport clusters:', error);
      return { clusters: [], points: [] };
    }
  }

  /**
   * Limit visible markers using spatial sampling
   */
  private limitVisibleMarkers(points: any[]): any[] {
    if (points.length <= this.options.maxVisibleMarkers) {
      return points;
    }

    // Prioritize stores with recent activity
    const activePoints = points.filter(p => p.properties.store.recentActivity);
    const inactivePoints = points.filter(p => !p.properties.store.recentActivity);

    // Always include active stores
    const maxInactive = Math.max(0, this.options.maxVisibleMarkers - activePoints.length);
    const selectedInactive = this.spatialSample(inactivePoints, maxInactive);

    return [...activePoints, ...selectedInactive];
  }

  /**
   * Spatial sampling to distribute markers evenly
   */
  private spatialSample(points: any[], maxCount: number): any[] {
    if (points.length <= maxCount) return points;

    // Simple grid-based sampling
    const gridSize = Math.ceil(Math.sqrt(maxCount));
    const result: any[] = [];

    // Find bounds
    const lngs = points.map(p => p.geometry.coordinates[0]);
    const lats = points.map(p => p.geometry.coordinates[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    const lngStep = (maxLng - minLng) / gridSize;
    const latStep = (maxLat - minLat) / gridSize;

    // Sample from grid cells
    for (let i = 0; i < gridSize && result.length < maxCount; i++) {
      for (let j = 0; j < gridSize && result.length < maxCount; j++) {
        const cellMinLng = minLng + i * lngStep;
        const cellMaxLng = minLng + (i + 1) * lngStep;
        const cellMinLat = minLat + j * latStep;
        const cellMaxLat = minLat + (j + 1) * latStep;

        const cellPoints = points.filter(p => {
          const [lng, lat] = p.geometry.coordinates;
          return lng >= cellMinLng && lng < cellMaxLng &&
                 lat >= cellMinLat && lat < cellMaxLat;
        });

        if (cellPoints.length > 0) {
          result.push(cellPoints[0]);
        }
      }
    }

    return result;
  }

  /**
   * Queue a render batch for processing
   */
  private queueRenderBatch(batch: MarkerBatch): void {
    this.renderQueue.push(batch);
    this.processRenderQueue();
  }

  /**
   * Process the render queue with batching
   */
  private async processRenderQueue(): Promise<void> {
    if (this.isRendering || this.renderQueue.length === 0) {
      return;
    }

    this.isRendering = true;

    try {
      const batch = this.renderQueue.shift()!;
      await this.processBatch(batch);
    } finally {
      this.isRendering = false;

      // Process next batch if available
      if (this.renderQueue.length > 0) {
        // Use setTimeout to prevent stack overflow
        setTimeout(() => this.processRenderQueue(), 0);
      }
    }
  }

  /**
   * Process a single render batch
   */
  private async processBatch(batch: MarkerBatch): Promise<void> {
    if (this.abortController.signal.aborted) {
      return;
    }

    const startTime = performance.now();

    try {
      // Clear existing markers
      this.clearMarkers();

      // Render stores in batches
      await this.renderStoresBatch(batch.stores);

      // Render clusters in batches
      await this.renderClustersBatch(batch.clusters);

      // Update render stats
      this.renderStats.renderedMarkers = this.markers.size;
      this.renderStats.renderTime = performance.now() - startTime;

      // Notify completion
      if (this.onRenderComplete) {
        this.onRenderComplete(this.renderStats);
      }

    } catch (error) {
      console.error('Error processing render batch:', error);
      throw error;
    }
  }

  /**
   * Render stores in batches to prevent UI blocking
   */
  private async renderStoresBatch(stores: StoreWithActivity[]): Promise<void> {
    const batchSize = this.options.batchSize;
    
    for (let i = 0; i < stores.length; i += batchSize) {
      if (this.abortController.signal.aborted) {
        return;
      }

      const batch = stores.slice(i, i + batchSize);
      
      // Render batch
      batch.forEach(store => {
        try {
          const marker = this.createStoreMarker(store);
          this.markers.set(store.id, marker);
        } catch (error) {
          console.warn('Error creating store marker:', error);
        }
      });

      // Yield control to prevent UI blocking
      if (i + batchSize < stores.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }

  /**
   * Render clusters in batches
   */
  private async renderClustersBatch(clusters: any[]): Promise<void> {
    const batchSize = this.options.batchSize;
    
    for (let i = 0; i < clusters.length; i += batchSize) {
      if (this.abortController.signal.aborted) {
        return;
      }

      const batch = clusters.slice(i, i + batchSize);
      
      // Render batch
      batch.forEach(cluster => {
        try {
          const marker = this.createClusterMarker(cluster);
          this.clusterMarkers.set(`cluster-${cluster.id}`, marker);
        } catch (error) {
          console.warn('Error creating cluster marker:', error);
        }
      });

      // Yield control to prevent UI blocking
      if (i + batchSize < clusters.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }

  /**
   * Create a store marker
   */
  private createStoreMarker(store: StoreWithActivity): Marker {
    const el = this.createStoreMarkerElement(store);
    
    const marker = new Marker(el)
      .setLngLat([store.longitude, store.latitude])
      .addTo(this.map);

    return marker;
  }

  /**
   * Create a cluster marker
   */
  private createClusterMarker(cluster: any): Marker {
    const el = this.createClusterMarkerElement(cluster);
    
    const marker = new Marker(el)
      .setLngLat(cluster.geometry.coordinates)
      .addTo(this.map);

    return marker;
  }

  /**
   * Create store marker DOM element
   */
  private createStoreMarkerElement(store: StoreWithActivity): HTMLElement {
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

    // Add activity indicator
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

    // Add click handler
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onStoreSelect) {
        this.onStoreSelect(store);
      }
    });

    // Add accessibility
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `${store.name} store`);

    return el;
  }

  /**
   * Create cluster marker DOM element
   */
  private createClusterMarkerElement(cluster: any): HTMLElement {
    const count = cluster.properties.point_count;
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
    
    el.textContent = count.toString();

    // Add click handler for cluster expansion
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.supercluster) {
        const expansionZoom = this.supercluster.getClusterExpansionZoom(cluster.id);
        this.map.easeTo({
          center: cluster.geometry.coordinates,
          zoom: Math.min(expansionZoom, this.options.clusterMaxZoom),
          duration: 500,
        });
      }
    });

    // Add accessibility
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `Cluster of ${count} stores`);

    return el;
  }

  /**
   * Get cluster marker size based on point count
   */
  private getClusterSize(count: number): number {
    if (count < 10) return 30;
    if (count < 50) return 40;
    if (count < 100) return 50;
    return 60;
  }
}