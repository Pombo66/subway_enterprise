import * as turf from '@turf/turf';
import { PrismaClient } from '@prisma/client';

export interface LandMaskResult {
  isOnLand: boolean;
  isInCountry: boolean;
  distanceToCoastKm?: number;
  countryCode?: string;
}

export class GermanyLandMaskService {
  private germanyPolygon: any = null;
  private coastlineBuffer: any = null;
  private readonly COASTLINE_BUFFER_M = parseInt(
    process.env.EXPANSION_COASTLINE_BUFFER_M || '300'
  );

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Initialize Germany land polygon from GeoJSON data
   * In production, this would load from a proper geodata source
   */
  async initialize(): Promise<void> {
    if (this.germanyPolygon) return;

    try {
      // For now, create a simplified Germany bounding polygon
      // In production, you'd load actual admin-0 boundary data
      const germanyBounds = {
        north: 55.0584,
        south: 47.2701,
        east: 15.0419,
        west: 5.8663
      };

      // Create a rough polygon for Germany (simplified)
      // This should be replaced with actual Natural Earth or OSM admin boundaries
      this.germanyPolygon = turf.polygon([[
        [germanyBounds.west, germanyBounds.south],
        [germanyBounds.east, germanyBounds.south],
        [germanyBounds.east, germanyBounds.north],
        [germanyBounds.west, germanyBounds.north],
        [germanyBounds.west, germanyBounds.south]
      ]]);

      // Create coastline buffer (300m inland)
      this.coastlineBuffer = turf.buffer(this.germanyPolygon, -this.COASTLINE_BUFFER_M / 1000, {
        units: 'kilometers'
      });

      console.log('🗺️  Germany land mask initialized with coastline buffer:', this.COASTLINE_BUFFER_M, 'm');
    } catch (error) {
      console.error('Failed to initialize Germany land mask:', error);
      // Fallback to bounding box if polygon loading fails
      this.germanyPolygon = null;
    }
  }

  /**
   * Check if a point is on German land and away from coastline
   */
  async validatePoint(lat: number, lng: number): Promise<LandMaskResult> {
    await this.initialize();

    const point = turf.point([lng, lat]);

    if (!this.germanyPolygon) {
      // Fallback to simple bounding box check
      const inBounds = lng >= 5.8663 && lng <= 15.0419 && lat >= 47.2701 && lat <= 55.0584;
      return {
        isOnLand: inBounds,
        isInCountry: inBounds,
        countryCode: inBounds ? 'DE' : undefined
      };
    }

    // Check if point is within Germany polygon
    const isInCountry = turf.booleanPointInPolygon(point, this.germanyPolygon);
    
    if (!isInCountry) {
      return {
        isOnLand: false,
        isInCountry: false
      };
    }

    // Check coastline buffer (ensure point is inland enough)
    const isAwayFromCoast = this.coastlineBuffer ? 
      turf.booleanPointInPolygon(point, this.coastlineBuffer) : true;

    return {
      isOnLand: isAwayFromCoast,
      isInCountry: true,
      countryCode: 'DE',
      distanceToCoastKm: isAwayFromCoast ? undefined : this.COASTLINE_BUFFER_M / 1000
    };
  }

  /**
   * Filter H3 cells to only include those on German land
   */
  async filterH3CellsToLand(cells: Array<{ id: string; center: [number, number] }>): Promise<Array<{ id: string; center: [number, number] }>> {
    await this.initialize();

    const landCells = [];
    let waterCount = 0;
    let coastCount = 0;

    for (const cell of cells) {
      const result = await this.validatePoint(cell.center[1], cell.center[0]);
      
      if (result.isOnLand && result.isInCountry) {
        landCells.push(cell);
      } else if (result.isInCountry && !result.isOnLand) {
        coastCount++;
      } else {
        waterCount++;
      }
    }

    console.log(`🏝️  Land mask filtering: ${landCells.length} land cells, ${coastCount} too close to coast, ${waterCount} outside Germany`);
    
    return landCells;
  }

  /**
   * Get Germany polygon bounds for H3 grid generation
   */
  async getGermanyBounds(): Promise<{ north: number; south: number; east: number; west: number }> {
    await this.initialize();

    if (this.germanyPolygon) {
      const bbox = turf.bbox(this.germanyPolygon);
      return {
        west: bbox[0],
        south: bbox[1], 
        east: bbox[2],
        north: bbox[3]
      };
    }

    // Fallback bounds
    return {
      north: 55.0584,
      south: 47.2701,
      east: 15.0419,
      west: 5.8663
    };
  }

  /**
   * Validate that a snapped point is still within Germany
   */
  async validateSnappedPoint(originalLat: number, originalLng: number, snappedLat: number, snappedLng: number): Promise<boolean> {
    const result = await this.validatePoint(snappedLat, snappedLng);
    
    if (!result.isInCountry) {
      console.log(`⚠️  Snapped point moved outside Germany: ${originalLat.toFixed(6)}, ${originalLng.toFixed(6)} → ${snappedLat.toFixed(6)}, ${snappedLng.toFixed(6)}`);
      return false;
    }

    return true;
  }
}