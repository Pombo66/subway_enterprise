/**
 * Clustering utilities for global store distribution
 * Uses Supercluster for efficient marker clustering at different zoom levels
 */

import Supercluster from 'supercluster';
import { StoreWithActivity } from '../types';

// Cluster configuration optimized for global distribution
export const CLUSTER_CONFIG = {
  radius: 60, // Cluster radius in pixels
  maxZoom: 14, // Max zoom level for clustering (clusters disappear at higher zoom)
  minZoom: 0, // Min zoom level
  minPoints: 2, // Minimum points to form a cluster
  extent: 512, // Tile extent (radius is calculated relative to this)
  nodeSize: 64, // Size of the KD-tree leaf node (affects performance)
};

// GeoJSON feature type for stores
export interface StoreFeature {
  type: 'Feature';
  properties: {
    cluster: false;
    storeId: string;
    store: StoreWithActivity;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

// GeoJSON feature type for clusters
export interface ClusterFeature {
  type: 'Feature';
  properties: {
    cluster: true;
    cluster_id: number;
    point_count: number;
    point_count_abbreviated?: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export type MapFeature = StoreFeature | ClusterFeature;

/**
 * Enhanced clustering manager for global store distribution
 */
export class GlobalClusterManager {
  private supercluster: Supercluster;
  private stores: StoreWithActivity[] = [];
  private features: StoreFeature[] = [];

  constructor(config: Partial<typeof CLUSTER_CONFIG> = {}) {
    const finalConfig = { ...CLUSTER_CONFIG, ...config };
    
    this.supercluster = new Supercluster({
      radius: finalConfig.radius,
      maxZoom: finalConfig.maxZoom,
      minZoom: finalConfig.minZoom,
      minPoints: finalConfig.minPoints,
      extent: finalConfig.extent,
      nodeSize: finalConfig.nodeSize,
    });
  }

  /**
   * Load stores into the clustering system
   */
  loadStores(stores: StoreWithActivity[]): void {
    this.stores = stores;
    this.features = this.convertStoresToFeatures(stores);
    this.supercluster.load(this.features);
  }

  /**
   * Get clusters and individual stores for the current viewport
   */
  getClusters(
    bounds: [number, number, number, number], // [west, south, east, north]
    zoom: number
  ): MapFeature[] {
    try {
      const rawFeatures = this.supercluster.getClusters(bounds, Math.floor(zoom));
      
      // Convert Supercluster features to our MapFeature types
      return rawFeatures.map(feature => {
        if (feature.properties?.cluster) {
          // This is a cluster feature
          return {
            type: 'Feature' as const,
            properties: {
              cluster: true as const,
              cluster_id: feature.properties.cluster_id,
              point_count: feature.properties.point_count,
              point_count_abbreviated: feature.properties.point_count_abbreviated,
            },
            geometry: {
              type: 'Point' as const,
              coordinates: feature.geometry.coordinates as [number, number],
            },
          } as ClusterFeature;
        } else {
          // This should be one of our store features
          const storeFeature = feature as any;
          return {
            type: 'Feature' as const,
            properties: {
              cluster: false as const,
              storeId: storeFeature.properties.storeId,
              store: storeFeature.properties.store,
            },
            geometry: {
              type: 'Point' as const,
              coordinates: feature.geometry.coordinates as [number, number],
            },
          } as StoreFeature;
        }
      });
    } catch (error) {
      console.warn('Error getting clusters:', error);
      // Fallback: return individual store features
      return this.features.filter(feature => 
        this.isFeatureInBounds(feature, bounds)
      );
    }
  }

  /**
   * Get the zoom level at which a cluster expands
   */
  getClusterExpansionZoom(clusterId: number): number {
    try {
      return this.supercluster.getClusterExpansionZoom(clusterId);
    } catch (error) {
      console.warn('Error getting cluster expansion zoom:', error);
      return 10; // Default expansion zoom
    }
  }

  /**
   * Get all stores within a cluster
   */
  getClusterLeaves(
    clusterId: number,
    limit: number = 100,
    offset: number = 0
  ): StoreFeature[] {
    try {
      return this.supercluster.getLeaves(clusterId, limit, offset) as StoreFeature[];
    } catch (error) {
      console.warn('Error getting cluster leaves:', error);
      return [];
    }
  }

  /**
   * Get cluster statistics for debugging
   */
  getClusterStats(bounds: [number, number, number, number], zoom: number): {
    totalFeatures: number;
    clusters: number;
    individualStores: number;
    activeStores: number;
  } {
    const features = this.getClusters(bounds, zoom);
    const clusters = features.filter(f => f.properties.cluster).length;
    const individualStores = features.filter(f => !f.properties.cluster).length;
    const activeStores = features.filter(f => 
      !f.properties.cluster && (f as StoreFeature).properties.store.recentActivity
    ).length;

    return {
      totalFeatures: features.length,
      clusters,
      individualStores,
      activeStores,
    };
  }

  /**
   * Convert stores to GeoJSON features
   */
  private convertStoresToFeatures(stores: StoreWithActivity[]): StoreFeature[] {
    return stores.map(store => ({
      type: 'Feature' as const,
      properties: {
        cluster: false as const,
        storeId: store.id,
        store,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [store.longitude, store.latitude],
      },
    }));
  }

  /**
   * Check if a feature is within the given bounds
   */
  private isFeatureInBounds(
    feature: StoreFeature,
    bounds: [number, number, number, number]
  ): boolean {
    const [lng, lat] = feature.geometry.coordinates;
    const [west, south, east, north] = bounds;
    
    return lng >= west && lng <= east && lat >= south && lat <= north;
  }
}

/**
 * Create bounds array from map bounds for Supercluster
 */
export function createBoundsArray(mapBounds: any): [number, number, number, number] {
  try {
    return [
      mapBounds.getWest(),  // west
      mapBounds.getSouth(), // south
      mapBounds.getEast(),  // east
      mapBounds.getNorth(), // north
    ];
  } catch (error) {
    console.warn('Error creating bounds array:', error);
    // Return global bounds as fallback
    return [-180, -85, 180, 85];
  }
}

/**
 * Format cluster point count for display
 */
export function formatClusterCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  } else if (count < 10000) {
    return `${Math.floor(count / 100) / 10}k`;
  } else {
    return `${Math.floor(count / 1000)}k`;
  }
}

/**
 * Get cluster color based on point count
 */
export function getClusterColor(pointCount: number): string {
  if (pointCount < 10) {
    return '#3b82f6'; // Blue for small clusters
  } else if (pointCount < 50) {
    return '#f59e0b'; // Orange for medium clusters
  } else {
    return '#ef4444'; // Red for large clusters
  }
}

/**
 * Get cluster size based on point count
 */
export function getClusterSize(pointCount: number): number {
  const baseSize = 30;
  const maxSize = 60;
  const scaleFactor = Math.min(pointCount / 100, 1);
  return baseSize + (maxSize - baseSize) * scaleFactor;
}