import { GeoJSON } from 'geojson';
import { H3Cell, GridWindow } from '../types/geospatial';

/**
 * Interface for H3 grid generation and spatial operations
 */
export interface IGridService {
  /**
   * Generate H3 grid cells covering the specified boundary
   */
  generateCountryGrid(boundary: GeoJSON.Polygon, resolution: number): H3Cell[];

  /**
   * Get neighboring cells within specified radius
   */
  getNeighbors(cell: H3Cell, radius: number): H3Cell[];

  /**
   * Partition country into processing windows with buffers
   */
  createWindows(cells: H3Cell[], windowSizeKm: number, bufferKm: number): GridWindow[];

  /**
   * Validate grid coverage and resolution
   */
  validateGrid(cells: H3Cell[], boundary: GeoJSON.Polygon): {
    coverage: number;
    gaps: H3Cell[];
    overlaps: H3Cell[];
  };

  /**
   * Convert between H3 index and lat/lng coordinates
   */
  h3ToLatLng(h3Index: string): { lat: number; lng: number };
  latLngToH3(lat: number, lng: number, resolution: number): string;

  /**
   * Get cells within a geographic boundary
   */
  getCellsInBoundary(boundary: GeoJSON.Polygon, resolution: number): H3Cell[];
}