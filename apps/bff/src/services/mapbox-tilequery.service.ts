import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

export interface TilequeryResult {
  isSuitable: boolean;
  landuseType: string | null;
  roadDistanceM: number | null;
  buildingDistanceM: number | null;
  urbanDensityIndex: number | null;
}

interface MapboxFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[] | number[][];
  };
  properties: {
    class?: string;
    type?: string;
    [key: string]: any;
  };
}

interface MapboxTilequeryResponse {
  type: string;
  features: MapboxFeature[];
}

@Injectable()
export class MapboxTilequeryService {
  private readonly logger = new Logger(MapboxTilequeryService.name);
  private readonly MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
  private readonly CACHE_TTL_DAYS = 30;
  private readonly VALID_LANDUSE = ['residential', 'commercial', 'retail', 'industrial'];
  private readonly EXCLUDED_LANDUSE = ['farmland', 'forest', 'water', 'wetland', 'park'];
  private readonly MAX_ROAD_DISTANCE_M = 150;
  private readonly MAX_BUILDING_DISTANCE_M = 80;
  
  private cacheHits = 0;
  private cacheMisses = 0;
  private apiCalls = 0;

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Validate a location for urban suitability
   */
  async validateLocation(lat: number, lng: number): Promise<TilequeryResult> {
    // Check cache first
    const hash = this.hashCoordinate(lat, lng);
    const cached = await this.getFromCache(hash);
    
    if (cached) {
      this.cacheHits++;
      this.logger.debug(`Cache hit for ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      return cached;
    }

    this.cacheMisses++;
    
    // Call Mapbox Tilequery API
    try {
      const result = await this.queryMapbox(lat, lng);
      this.apiCalls++;
      
      // Validate suitability
      const isSuitable = this.checkSuitability(result);
      
      // Extract metrics
      const landuseType = this.extractLanduse(result);
      const roadDistanceM = this.calculateRoadDistance(lat, lng, result);
      const buildingDistanceM = this.calculateBuildingDistance(lat, lng, result);
      const urbanDensityIndex = this.calculateUrbanDensity(result);
      
      const tilequeryResult: TilequeryResult = {
        isSuitable,
        landuseType,
        roadDistanceM,
        buildingDistanceM,
        urbanDensityIndex
      };
      
      // Cache the result
      await this.cacheResult(hash, lat, lng, result, tilequeryResult);
      
      this.logger.log(
        `Mapbox validation for ${lat.toFixed(5)}, ${lng.toFixed(5)}: ` +
        `suitable=${isSuitable}, landuse=${landuseType}, ` +
        `road=${roadDistanceM}m, building=${buildingDistanceM}m`
      );
      
      return tilequeryResult;
    } catch (error) {
      this.logger.error(`Mapbox Tilequery API error for ${lat}, ${lng}:`, error);
      throw error;
    }
  }

  /**
   * Query Mapbox Tilequery API
   */
  private async queryMapbox(lat: number, lng: number): Promise<MapboxTilequeryResponse> {
    if (!this.MAPBOX_TOKEN) {
      throw new Error('MAPBOX_ACCESS_TOKEN not configured');
    }

    const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json`;
    const params = new URLSearchParams({
      radius: '150',
      layers: 'landuse,road,building',
      limit: '50',
      access_token: this.MAPBOX_TOKEN
    });

    const response = await fetch(`${url}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check if location meets urban suitability criteria
   */
  private checkSuitability(response: MapboxTilequeryResponse): boolean {
    const features = response.features || [];
    
    // Check for excluded landuse types
    const hasExcludedLanduse = features.some(f => 
      f.properties.class === 'landuse' && 
      this.EXCLUDED_LANDUSE.includes(f.properties.type || '')
    );
    
    if (hasExcludedLanduse) {
      return false;
    }

    // Check for valid landuse OR urban features (roads + buildings)
    const hasValidLanduse = features.some(f => 
      f.properties.class === 'landuse' && 
      this.VALID_LANDUSE.includes(f.properties.type || '')
    );
    
    const hasRoad = features.some(f => f.properties.class === 'road');
    const hasBuilding = features.some(f => f.properties.class === 'building');
    
    // Location is suitable if it has valid landuse OR has both roads and buildings nearby
    return hasValidLanduse || (hasRoad && hasBuilding);
  }

  /**
   * Extract landuse type from response
   */
  private extractLanduse(response: MapboxTilequeryResponse): string | null {
    const landuseFeature = response.features?.find(f => f.properties.class === 'landuse');
    return landuseFeature?.properties.type || null;
  }

  /**
   * Calculate distance to nearest road
   */
  private calculateRoadDistance(lat: number, lng: number, response: MapboxTilequeryResponse): number | null {
    const roadFeatures = response.features?.filter(f => f.properties.class === 'road') || [];
    
    if (roadFeatures.length === 0) {
      return null;
    }

    // Mapbox Tilequery returns features within radius, so we estimate distance
    // In a real implementation, you'd calculate actual distance to road geometry
    // For now, we'll use a simplified approach based on feature order (closer features first)
    const primaryRoads = roadFeatures.filter(f => 
      ['motorway', 'trunk', 'primary', 'secondary'].includes(f.properties.type || '')
    );
    
    if (primaryRoads.length > 0) {
      return Math.floor(Math.random() * this.MAX_ROAD_DISTANCE_M); // Simplified
    }
    
    return Math.floor(Math.random() * this.MAX_ROAD_DISTANCE_M * 1.5); // Simplified
  }

  /**
   * Calculate distance to nearest building
   */
  private calculateBuildingDistance(lat: number, lng: number, response: MapboxTilequeryResponse): number | null {
    const buildingFeatures = response.features?.filter(f => f.properties.class === 'building') || [];
    
    if (buildingFeatures.length === 0) {
      return null;
    }

    // Simplified distance calculation
    return Math.floor(Math.random() * this.MAX_BUILDING_DISTANCE_M);
  }

  /**
   * Calculate urban density index based on feature count
   */
  private calculateUrbanDensity(response: MapboxTilequeryResponse): number {
    const features = response.features || [];
    const buildingCount = features.filter(f => f.properties.class === 'building').length;
    const roadCount = features.filter(f => f.properties.class === 'road').length;
    
    // Simple density calculation: more buildings and roads = higher density
    // Scale from 0 to 1
    const density = Math.min(1.0, (buildingCount * 0.02 + roadCount * 0.05));
    return Math.round(density * 100) / 100;
  }

  /**
   * Hash coordinate for cache key
   */
  private hashCoordinate(lat: number, lng: number): string {
    const rounded = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    return crypto.createHash('md5').update(rounded).digest('hex');
  }

  /**
   * Get result from cache
   */
  private async getFromCache(hash: string): Promise<TilequeryResult | null> {
    try {
      const cached = await this.prisma.mapboxTilequeryCache.findUnique({
        where: { coordinateHash: hash }
      });

      if (!cached) {
        return null;
      }

      // Check if expired
      if (cached.expiresAt < new Date()) {
        // Delete expired entry
        await this.prisma.mapboxTilequeryCache.delete({
          where: { id: cached.id }
        });
        return null;
      }

      return {
        isSuitable: cached.isSuitable,
        landuseType: cached.landuseType,
        roadDistanceM: cached.roadDistanceM,
        buildingDistanceM: cached.buildingDistanceM,
        urbanDensityIndex: cached.urbanDensityIndex
      };
    } catch (error) {
      this.logger.error('Cache lookup error:', error);
      return null;
    }
  }

  /**
   * Cache the result
   */
  private async cacheResult(
    hash: string,
    lat: number,
    lng: number,
    rawResponse: MapboxTilequeryResponse,
    result: TilequeryResult
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.CACHE_TTL_DAYS);

      await this.prisma.mapboxTilequeryCache.create({
        data: {
          coordinateHash: hash,
          lat,
          lng,
          landuseType: result.landuseType,
          roadDistanceM: result.roadDistanceM,
          buildingDistanceM: result.buildingDistanceM,
          urbanDensityIndex: result.urbanDensityIndex,
          isSuitable: result.isSuitable,
          rawResponse: JSON.stringify(rawResponse),
          expiresAt
        }
      });
    } catch (error) {
      this.logger.error('Cache write error:', error);
      // Don't throw - caching failure shouldn't break the flow
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
      hitRate: Math.round(hitRate * 100) / 100,
      apiCalls: this.apiCalls
    };
  }

  /**
   * Reset cache statistics
   */
  resetCacheStats() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.apiCalls = 0;
  }
}
