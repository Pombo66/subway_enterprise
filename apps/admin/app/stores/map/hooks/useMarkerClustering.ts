import { useMemo } from 'react';
import Supercluster from 'supercluster';

interface Store {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
}

interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export function useMarkerClustering(stores: Store[], viewport: MapViewport) {
  // Create supercluster index
  const cluster = useMemo(() => {
    const index = new Supercluster({
      radius: 40,
      maxZoom: 16,
      minZoom: 0
    });

    const points = stores
      .filter(store => store.latitude && store.longitude)
      .map(store => ({
        type: 'Feature' as const,
        properties: { store },
        geometry: {
          type: 'Point' as const,
          coordinates: [store.longitude, store.latitude]
        }
      }));

    index.load(points);
    return index;
  }, [stores]);

  // Get clusters for current viewport
  const clusters = useMemo(() => {
    if (!viewport.bounds) {
      return [];
    }

    return cluster.getClusters(
      [viewport.bounds.west, viewport.bounds.south, viewport.bounds.east, viewport.bounds.north],
      Math.floor(viewport.zoom)
    );
  }, [cluster, viewport]);

  return clusters;
}
