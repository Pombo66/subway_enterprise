import { Quadrant } from '../components/QuadrantSelector';

export interface CountryCenter {
  lat: number;
  lng: number;
}

// Country centers for quadrant calculation
export const COUNTRY_CENTERS: Record<string, CountryCenter> = {
  Germany: { lat: 51.1657, lng: 10.4515 },
  Belgium: { lat: 50.5039, lng: 4.4699 },
  France: { lat: 46.2276, lng: 2.2137 },
  Netherlands: { lat: 52.1326, lng: 5.2913 },
};

/**
 * Get the center point for a country
 */
export function getCountryCenter(country?: string): CountryCenter {
  if (!country) return COUNTRY_CENTERS.Germany;
  return COUNTRY_CENTERS[country] || COUNTRY_CENTERS.Germany;
}

/**
 * Check if a point is in a specific quadrant
 */
export function isInQuadrant(
  lat: number,
  lng: number,
  quadrant: Quadrant,
  center: CountryCenter
): boolean {
  if (quadrant === 'ALL') return true;

  const isNorth = lat >= center.lat;
  const isEast = lng >= center.lng;

  switch (quadrant) {
    case 'NW':
      return isNorth && !isEast;
    case 'NE':
      return isNorth && isEast;
    case 'SW':
      return !isNorth && !isEast;
    case 'SE':
      return !isNorth && isEast;
    default:
      return true;
  }
}

/**
 * Filter stores by quadrant
 */
export function filterStoresByQuadrant<T extends { latitude: number; longitude: number }>(
  stores: T[],
  quadrant: Quadrant,
  country?: string
): T[] {
  if (quadrant === 'ALL') return stores;

  const center = getCountryCenter(country);
  return stores.filter((store) =>
    isInQuadrant(store.latitude, store.longitude, quadrant, center)
  );
}

/**
 * Count stores in each quadrant
 */
export function countStoresByQuadrant<T extends { latitude: number; longitude: number }>(
  stores: T[],
  country?: string
): Record<Quadrant, number> {
  const center = getCountryCenter(country);

  return {
    ALL: stores.length,
    NW: stores.filter((s) => isInQuadrant(s.latitude, s.longitude, 'NW', center)).length,
    NE: stores.filter((s) => isInQuadrant(s.latitude, s.longitude, 'NE', center)).length,
    SW: stores.filter((s) => isInQuadrant(s.latitude, s.longitude, 'SW', center)).length,
    SE: stores.filter((s) => isInQuadrant(s.latitude, s.longitude, 'SE', center)).length,
  };
}

/**
 * Get bounds for a quadrant
 */
export function getQuadrantBounds(
  quadrant: Quadrant,
  country?: string
): { north: number; south: number; east: number; west: number } | null {
  if (quadrant === 'ALL') return null;

  const center = getCountryCenter(country);
  
  // Approximate bounds (adjust based on country size)
  const latSpan = 5; // degrees
  const lngSpan = 8; // degrees

  switch (quadrant) {
    case 'NW':
      return {
        north: center.lat + latSpan,
        south: center.lat,
        east: center.lng,
        west: center.lng - lngSpan,
      };
    case 'NE':
      return {
        north: center.lat + latSpan,
        south: center.lat,
        east: center.lng + lngSpan,
        west: center.lng,
      };
    case 'SW':
      return {
        north: center.lat,
        south: center.lat - latSpan,
        east: center.lng,
        west: center.lng - lngSpan,
      };
    case 'SE':
      return {
        north: center.lat,
        south: center.lat - latSpan,
        east: center.lng + lngSpan,
        west: center.lng,
      };
    default:
      return null;
  }
}
