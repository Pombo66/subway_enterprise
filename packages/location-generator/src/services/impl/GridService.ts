import { GeoJSON } from 'geojson';
import { cellToBoundary, latLngToCell, cellToLatLng, polygonToCells, getResolution, gridDisk, gridDistance } from 'h3-js';
import * as turf from '@turf/turf';
import { IGridService } from '../IGridService';
import { H3Cell, GridWindow, SpatialIndex } from '../../types/geospatial';

/**
 * Simple spatial index implementation using grid-based approach
 */
class SimpleSpatialIndex implements SpatialIndex {
  private points: Map<string, { lat: number; lng: number; id: string }> = new Map();
  private gridSize = 0.01; // Approximately 1km at equator

  insert(point: { lat: number; lng: number; id: string }): void {
    const key = this.getGridKey(point.lat, point.lng);
    this.points.set(point.id, point);
  }

  search(bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }): string[] {
    const results: string[] = [];
    for (const [id, point] of this.points) {
      if (point.lat >= bounds.minLat && point.lat <= bounds.maxLat &&
          point.lng >= bounds.minLng && point.lng <= bounds.maxLng) {
        results.push(id);
      }
    }
    return results;
  }

  nearest(point: { lat: number; lng: number }, count: number): string[] {
    const distances: Array<{ id: string; distance: number }> = [];
    
    for (const [id, p] of this.points) {
      const distance = this.haversineDistance(point.lat, point.lng, p.lat, p.lng);
      distances.push({ id, distance });
    }
    
    distances.sort((a, b) => a.distance - b.distance);
    return distances.slice(0, count).map(d => d.id);
  }

  private getGridKey(lat: number, lng: number): string {
    const gridLat = Math.floor(lat / this.gridSize);
    const gridLng = Math.floor(lng / this.gridSize);
    return `${gridLat},${gridLng}`;
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

/**
 * Implementation of H3 grid generation and spatial operations
 */
export class GridService implements IGridService {
  private spatialIndex: SpatialIndex = new SimpleSpatialIndex();
  
  /**
   * Generate H3 grid cells covering the specified boundary
   */
  generateCountryGrid(boundary: GeoJSON.Polygon, resolution: number): H3Cell[] {
    try {
      // Handle empty polygon
      if (!boundary.coordinates || !boundary.coordinates[0] || boundary.coordinates[0].length === 0) {
        return [];
      }

      // Convert GeoJSON polygon to H3 polyfill format
      const coordinates = boundary.coordinates[0].map(coord => [coord[1], coord[0]]); // H3 expects [lat, lng]
      
      // Use H3 polygonToCells to get all cells within the boundary
      const h3Indexes = polygonToCells(coordinates, resolution, true);
      
      // Convert H3 indexes to H3Cell objects
      const cells: H3Cell[] = h3Indexes.map((index: string) => {
        const [lat, lng] = cellToLatLng(index);
        return {
          index,
          lat,
          lng,
          resolution: getResolution(index)
        };
      });

      return cells;
    } catch (error) {
      throw new Error(`Failed to generate country grid: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get neighboring cells within specified radius using H3's gridDisk
   */
  getNeighbors(cell: H3Cell, radius: number): H3Cell[] {
    try {
      // Calculate H3 ring distance based on radius and resolution
      const ringDistance = this.calculateH3RingDistance(radius, cell.resolution);
      
      // Use H3's gridDisk to get all cells within the ring distance
      const neighborIndexes = gridDisk(cell.index, ringDistance);
      
      // Convert to H3Cell objects, excluding the center cell
      const neighbors: H3Cell[] = neighborIndexes
        .filter(index => index !== cell.index)
        .map(index => {
          const [lat, lng] = cellToLatLng(index);
          return {
            index,
            lat,
            lng,
            resolution: getResolution(index)
          };
        });
      
      // Filter by actual distance to ensure accuracy
      return neighbors.filter(neighbor => {
        const distance = this.haversineDistance(cell.lat, cell.lng, neighbor.lat, neighbor.lng);
        return distance <= radius;
      });
      
    } catch (error) {
      throw new Error(`Failed to get neighbors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Partition country into processing windows with buffers
   */
  createWindows(cells: H3Cell[], windowSizeKm: number, bufferKm: number): GridWindow[] {
    try {
      if (cells.length === 0) {
        return [];
      }

      // Find bounding box of all cells
      const bounds = this.calculateBounds(cells);
      
      // Calculate window dimensions in degrees
      const windowSizeDegrees = this.kmToDegrees(windowSizeKm);
      const bufferDegrees = this.kmToDegrees(bufferKm);
      
      const windows: GridWindow[] = [];
      let windowId = 0;
      
      // Create grid of windows
      for (let lat = bounds.minLat; lat < bounds.maxLat; lat += windowSizeDegrees) {
        for (let lng = bounds.minLng; lng < bounds.maxLng; lng += windowSizeDegrees) {
          const windowBounds = {
            minLat: lat - bufferDegrees,
            maxLat: Math.min(lat + windowSizeDegrees + bufferDegrees, bounds.maxLat),
            minLng: lng - bufferDegrees,
            maxLng: Math.min(lng + windowSizeDegrees + bufferDegrees, bounds.maxLng)
          };
          
          // Find cells within this window
          const windowCells = cells.filter(cell => 
            cell.lat >= windowBounds.minLat && cell.lat <= windowBounds.maxLat &&
            cell.lng >= windowBounds.minLng && cell.lng <= windowBounds.maxLng
          );
          
          if (windowCells.length > 0) {
            windows.push({
              id: `window_${windowId++}`,
              boundary: windowBounds,
              bufferKm,
              cells: windowCells
            });
          }
        }
      }
      
      return windows;
    } catch (error) {
      throw new Error(`Failed to create windows: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate grid coverage and resolution
   */
  validateGrid(cells: H3Cell[], boundary: GeoJSON.Polygon): {
    coverage: number;
    gaps: H3Cell[];
    overlaps: H3Cell[];
  } {
    try {
      // Calculate total area of boundary
      const boundaryArea = turf.area(boundary);
      
      // Calculate total area covered by cells (approximate)
      const cellArea = this.estimateCellArea(cells[0]?.resolution || 8);
      const coveredArea = cells.length * cellArea;
      
      const coverage = Math.min(coveredArea / boundaryArea, 1.0);
      
      // For now, return empty gaps and overlaps
      // In a full implementation, this would detect actual gaps and overlaps
      return {
        coverage,
        gaps: [],
        overlaps: []
      };
    } catch (error) {
      throw new Error(`Failed to validate grid: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert H3 index to lat/lng coordinates
   */
  h3ToLatLng(h3Index: string): { lat: number; lng: number } {
    const [lat, lng] = cellToLatLng(h3Index);
    return { lat, lng };
  }

  /**
   * Convert lat/lng to H3 index
   */
  latLngToH3(lat: number, lng: number, resolution: number): string {
    return latLngToCell(lat, lng, resolution);
  }

  /**
   * Get cells within a geographic boundary
   */
  getCellsInBoundary(boundary: GeoJSON.Polygon, resolution: number): H3Cell[] {
    return this.generateCountryGrid(boundary, resolution);
  }

  /**
   * Create spatial index for efficient lookups
   */
  createSpatialIndex(cells: H3Cell[]): SpatialIndex {
    const index = new SimpleSpatialIndex();
    cells.forEach(cell => {
      index.insert({ lat: cell.lat, lng: cell.lng, id: cell.index });
    });
    return index;
  }

  /**
   * Find cells within radius of a point
   */
  findCellsWithinRadius(centerLat: number, centerLng: number, radiusKm: number, cells: H3Cell[]): H3Cell[] {
    return cells.filter(cell => {
      const distance = this.haversineDistance(centerLat, centerLng, cell.lat, cell.lng);
      return distance <= radiusKm;
    });
  }

  /**
   * Calculate distance between two H3 cells
   */
  calculateCellDistance(cell1: H3Cell, cell2: H3Cell): number {
    return this.haversineDistance(cell1.lat, cell1.lng, cell2.lat, cell2.lng);
  }

  /**
   * Get H3 grid distance between two cells
   */
  getH3Distance(cell1: H3Cell, cell2: H3Cell): number {
    try {
      return gridDistance(cell1.index, cell2.index);
    } catch (error) {
      // Fallback to geographic distance if H3 distance fails
      return Math.round(this.haversineDistance(cell1.lat, cell1.lng, cell2.lat, cell2.lng));
    }
  }

  // Helper methods
  private calculateBounds(cells: H3Cell[]): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
    const lats = cells.map(c => c.lat);
    const lngs = cells.map(c => c.lng);
    
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs)
    };
  }

  private kmToDegrees(km: number): number {
    // Approximate conversion: 1 degree ≈ 111 km
    return km / 111;
  }

  private calculateH3RingDistance(radiusKm: number, resolution: number): number {
    // Calculate H3 ring distance based on radius and resolution
    // This is an approximation based on average H3 cell edge length
    const edgeLengths = {
      0: 1107.712591, 1: 418.6760055, 2: 158.2446558, 3: 59.81085794,
      4: 22.6063794, 5: 8.544408276, 6: 3.229953718, 7: 1.220629759,
      8: 0.461354684, 9: 0.174375668, 10: 0.065907807, 11: 0.024910561,
      12: 0.009415526, 13: 0.003559893, 14: 0.001348575, 15: 0.000509713
    };
    
    const edgeLength = edgeLengths[resolution as keyof typeof edgeLengths] || edgeLengths[8];
    return Math.ceil(radiusKm / edgeLength);
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private estimateCellArea(resolution: number): number {
    // Approximate H3 cell areas in square meters by resolution
    const areas = {
      0: 4250546.848,
      1: 607220.9782,
      2: 86745.85403,
      3: 12392.26486,
      4: 1770.323552,
      5: 252.9033645,
      6: 36.1290521,
      7: 5.1612932,
      8: 0.7373276,
      9: 0.1053325
    };
    
    return areas[resolution as keyof typeof areas] || areas[8];
  }
}