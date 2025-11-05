import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as turf from '@turf/turf';

export interface LandValidationResult {
  isOnLand: boolean;
  distanceToCoastM: number | null;
  landPolygonId: string | null;
  rejectionReason?: 'in_water' | 'too_close_to_coast';
}

interface MapboxFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: {
    [key: string]: any;
  };
}

interface MapboxTilequeryResponse {
  type: string;
  features: MapboxFeature[];
}

export class LandValidationService {
  private readonly MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  private readonly COASTLINE_BUFFER_M = parseInt(
    process.env.EXPANSION_COASTLINE_BUFFER_M || '300'
  );
  private readonly CACHE_TTL_DAYS = 90;
  private readonly TILEQUERY_RADIUS_M = 500; // Search radius for coastline features
  
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(private readonly prisma: PrismaClient) {
    console.log('🌍 LandValidationService initialized with coastline buffer:', this.COASTLINE_BUFFER_M, 'm');
  }

  /**
   * Validate that coordinates are on land and away from coast
   * Uses Mapbox land layer or Natural Earth dataset
   */
  async validateLand(lat: number, lng: number): Promise<LandValidationResult> {
    const hash = this.hashCoordinate(lat, lng);
    const cached = await this.getFromCache(hash);
    
    if (cached) {
      this.cacheHits++;
      return cached;
    }

    this.cacheMisses++;
    
    try {
      // Step 1: Check if on land using Mapbox landcover layer
      const isOnLand = await this.queryLandPolygon(lat, lng);
      
      if (!isOnLand) {
        const result: LandValidationResult = {
          isOnLand: false,
          distanceToCoastM: null,
          landPolygonId: null,
          rejectionReason: 'in_water'
        };
        await this.cacheResult(hash, lat, lng, result);
        return result;
      }
      
      // Step 2: Calculate distance to nearest coastline
      const distanceToCoastM = await this.calculateCoastlineDistance(lat, lng);
      
      // Step 3: Check coastline buffer
      if (distanceToCoastM !== null && distanceToCoastM < this.COASTLINE_BUFFER_M) {
        const result: LandValidationResult = {
          isOnLand: true,
          distanceToCoastM,
          landPolygonId: null,
          rejectionReason: 'too_close_to_coast'
        };
        await this.cacheResult(hash, lat, lng, result);
        return result;
      }
      
      // Passed all checks
      const result: LandValidationResult = {
        isOnLand: true,
        distanceToCoastM,
        landPolygonId: null
      };
      await this.cacheResult(hash, lat, lng, result);
      return result;
      
    } catch (error) {
      console.error(`Land validation error for ${lat}, ${lng}:`, error);
      // On error, assume location is valid (graceful degradation)
      return {
        isOnLand: true,
        distanceToCoastM: null,
        landPolygonId: null
      };
    }
  }

  /**
   * Query Mapbox land layer for polygon membership
   * Returns true if land, false if water/ocean
   */
  private async queryLandPolygon(lat: number, lng: number): Promise<boolean> {
    if (!this.MAPBOX_TOKEN) {
      console.warn('MAPBOX_ACCESS_TOKEN not configured - skipping land validation');
      return true; // Assume on land if no token
    }

    const url = `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${lng},${lat}.json`;
    const params = new URLSearchParams({
      radius: '10', // Very small radius - just checking the point
      layers: 'landcover',
      limit: '5',
      access_token: this.MAPBOX_TOKEN
    });

    const response = await fetch(`${url}?${params.toString()}`);
    
    if (!response.ok) {
      console.error(`Mapbox land query error: ${response.status} ${response.statusText}`);
      return true; // Assume on land on error
    }

    const data: MapboxTilequeryResponse = await response.json();
    
    // Check if any features indicate water
    const hasWater = data.features?.some(f => {
      const landcover = f.properties?.class;
      return landcover === 'water' || landcover === 'ice';
    });
    
    // If we found water features, it's in water
    // If no features or only land features, it's on land
    return !hasWater;
  }

  /**
   * Calculate distance to nearest coastline
   * Uses Mapbox coastline features
   */
  private async calculateCoastlineDistance(lat: number, lng: number): Promise<number | null> {
    if (!this.MAPBOX_TOKEN) {
      return null;
    }

    const url = `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${lng},${lat}.json`;
    const params = new URLSearchParams({
      radius: this.TILEQUERY_RADIUS_M.toString(),
      layers: 'landcover',
      limit: '50',
      access_token: this.MAPBOX_TOKEN
    });

    const response = await fetch(`${url}?${params.toString()}`);
    
    if (!response.ok) {
      console.error(`Mapbox coastline query error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: MapboxTilequeryResponse = await response.json();
    
    // Find water features (coastline indicators)
    const waterFeatures = data.features?.filter(f => {
      const landcover = f.properties?.class;
      return landcover === 'water' || landcover === 'ice';
    }) || [];
    
    if (waterFeatures.length === 0) {
      // No water features found within search radius
      return null;
    }
    
    // Calculate distance to nearest water feature
    const point = turf.point([lng, lat]);
    let minDistance = Infinity;
    
    for (const feature of waterFeatures) {
      try {
        let distance: number;
        
        if (feature.geometry.type === 'Point') {
          const waterPoint = turf.point(feature.geometry.coordinates);
          distance = turf.distance(point, waterPoint, { units: 'meters' });
        } else if (feature.geometry.type === 'LineString') {
          const line = turf.lineString(feature.geometry.coordinates);
          const nearest = turf.nearestPointOnLine(line, point);
          distance = turf.distance(point, nearest, { units: 'meters' });
        } else if (feature.geometry.type === 'Polygon') {
          const polygon = turf.polygon(feature.geometry.coordinates);
          // Calculate distance to polygon edge
          const nearest = turf.nearestPointOnLine(
            turf.polygonToLine(polygon),
            point
          );
          distance = turf.distance(point, nearest, { units: 'meters' });
        } else {
          continue;
        }
        
        minDistance = Math.min(minDistance, distance);
      } catch (error) {
        console.error('Error calculating distance to water feature:', error);
      }
    }
    
    return minDistance === Infinity ? null : Math.round(minDistance);
  }

  /**
   * Hash coordinate for cache key
   */
  private hashCoordinate(lat: number, lng: number): string {
    const rounded = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    return crypto.createHash('md5').update(rounded).digest('hex');
  }

  /**
   * Get cached result
   */
  private async getFromCache(hash: string): Promise<LandValidationResult | null> {
    try {
      const cached = await this.prisma.landValidationCache.findUnique({
        where: { coordinateHash: hash }
      });

      if (!cached) {
        return null;
      }

      if (cached.expiresAt < new Date()) {
        await this.prisma.landValidationCache.delete({
          where: { id: cached.id }
        });
        return null;
      }

      return {
        isOnLand: cached.isOnLand,
        distanceToCoastM: cached.distanceToCoastM,
        landPolygonId: cached.landPolygonId,
        rejectionReason: cached.isOnLand 
          ? (cached.distanceToCoastM !== null && cached.distanceToCoastM < this.COASTLINE_BUFFER_M 
              ? 'too_close_to_coast' 
              : undefined)
          : 'in_water'
      };
    } catch (error) {
      console.error('Land validation cache lookup error:', error);
      return null;
    }
  }

  /**
   * Cache validation result
   */
  private async cacheResult(
    hash: string,
    lat: number,
    lng: number,
    result: LandValidationResult
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.CACHE_TTL_DAYS);

      await this.prisma.landValidationCache.create({
        data: {
          coordinateHash: hash,
          lat,
          lng,
          isOnLand: result.isOnLand,
          distanceToCoastM: result.distanceToCoastM,
          landPolygonId: result.landPolygonId,
          rawResponse: JSON.stringify(result),
          expiresAt
        }
      });
    } catch (error) {
      console.error('Land validation cache write error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
    
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Reset cache statistics
   */
  resetCacheStats() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}
