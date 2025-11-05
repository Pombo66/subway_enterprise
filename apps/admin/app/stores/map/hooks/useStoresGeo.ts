import { useMemo } from 'react';
import { StoreWithActivity } from '../types';

export interface StoreFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    id: string;
    name: string;
    country: string;
    active: boolean;
    region?: string;
    franchiseeId?: string;
  };
}

export interface StoreFeatureCollection {
  type: 'FeatureCollection';
  features: StoreFeature[];
}

export interface StoreGeoData {
  featureCollection: StoreFeatureCollection;
  counts: {
    total: number;
    active: number;
    rendered: number;
  };
}

/**
 * Hook that converts store data to GeoJSON FeatureCollection
 * Heavily memoized to prevent unnecessary map source updates and render loops
 */
export function useStoresGeo(stores: StoreWithActivity[]): StoreGeoData {
  // Create a stable hash of the stores array to prevent unnecessary recalculations
  const storesHash = useMemo(() => {
    return stores.map(store => 
      `${store.id}-${store.latitude}-${store.longitude}-${store.recentActivity}`
    ).join('|');
  }, [stores]);

  const geoData = useMemo(() => {
    console.log('🗺️ Converting', stores.length, 'stores to GeoJSON');

    const validStores: StoreWithActivity[] = [];
    const invalidStores: StoreWithActivity[] = [];

    // Separate valid and invalid stores for better performance
    stores.forEach(store => {
      const hasValidCoords = 
        typeof store.latitude === 'number' && 
        typeof store.longitude === 'number' &&
        !isNaN(store.latitude) && 
        !isNaN(store.longitude) &&
        store.latitude >= -90 && store.latitude <= 90 &&
        store.longitude >= -180 && store.longitude <= 180;

      if (hasValidCoords) {
        validStores.push(store);
      } else {
        invalidStores.push(store);
      }
    });

    // Log invalid coordinates only in development
    if (invalidStores.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn('❌ Stores with invalid coordinates:', 
        invalidStores.map(s => ({ name: s.name, lat: s.latitude, lng: s.longitude }))
      );
    }

    // Convert valid stores to GeoJSON features
    const features: StoreFeature[] = validStores.map(store => ({
      type: 'Feature' as const,
      id: store.id,
      geometry: {
        type: 'Point' as const,
        coordinates: [store.longitude, store.latitude] // GeoJSON uses [lng, lat]
      },
      properties: {
        id: store.id,
        name: store.name,
        country: store.country,
        active: store.recentActivity || false,
        region: store.region,
        franchiseeId: store.franchiseeId
      }
    }));

    const featureCollection: StoreFeatureCollection = {
      type: 'FeatureCollection',
      features
    };

    const counts = {
      total: stores.length,
      active: validStores.filter(s => s.recentActivity).length,
      rendered: features.length
    };

    console.log('✅ GeoJSON conversion complete:', counts);

    return { featureCollection, counts };
  }, [storesHash]); // Only recalculate when the hash changes

  return geoData;
}