/**
 * Geospatial and H3 grid related types
 */

export interface H3Cell {
  index: string;
  lat: number;
  lng: number;
  resolution: number;
}

export interface GridWindow {
  id: string;
  boundary: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  bufferKm: number;
  cells: H3Cell[];
}

export interface SpatialIndex {
  insert(point: { lat: number; lng: number; id: string }): void;
  search(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }): string[];
  nearest(point: { lat: number; lng: number }, count: number): string[];
}

export interface DistanceCalculation {
  haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number;
  withinRadius(center: { lat: number; lng: number }, points: { lat: number; lng: number }[], radiusKm: number): { lat: number; lng: number }[];
}

export interface TravelTimeResult {
  durationMinutes: number;
  distanceKm: number;
  isEstimated: boolean;
}

export interface Catchment {
  center: { lat: number; lng: number };
  radiusKm?: number;
  travelTimeMinutes?: number;
  population: number;
  isEstimated: boolean;
}