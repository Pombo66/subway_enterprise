import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as turf from '@turf/turf';

export interface MapboxFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: {
    class?: string;
    type?: string;
    [key: string]: any;
  };
}

export interface SnapTarget {
  type: 'road' | 'building';
  feature: MapboxFeature;
  distanceM: number;
  snappedLat: number;
  snappedLng: number;
  roadClass?: string;
  buildingType?: string;
}

export interface SnappingResult {
  success: boolean;
  originalLat: number;
  originalLng: number;
  snappedLat?: number;
  snappedLng?: number;
  snapTarget?: SnapTarget;
  rejectionReason?: 'no_snap_target';
}

interface MapboxTilequeryResponse {
  type: string;
  features: MapboxFeature[];
}

export class SnappingService {
  private readonly MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  private readonly MAX_SNAP_DISTANCE_M = parseInt(
    process.env.EXPANSION_MAX_SNAP_DISTANCE_M || '1500'
  );
  private readonly CACHE_TTL_DAYS = 90;
  
  // Accept tertiary+ roads and residential
  private readonly ACCEPTED_ROAD_TYPES = [
    'motorway',
    'trunk',
    'primary',
    'secondary',
    'tertiary',
    'residential'
  ];
  
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(private readonly prisma: PrismaClient) {
    console.log('📍 SnappingService initialized with max snap distance:', this.MAX_SNAP_DISTANCE_M, 'm');
  }

  /**
   * Snap candidate to nearest road or building
   * Accepts tertiary+ roads and any building type
   * Rejects if no target within 1.5km
   */
  async snapToInfrastructure(lat: number, lng: number): Promise<SnappingResult> {
    const hash = this.hashCoordinate(lat, lng);
    const cached = await this.getFromCache(hash);
    
    if (cached) {
      this.cacheHits++;
      return cached;
    }

    this.cacheMisses++;
    
    try {
      // Find nearest road and building in parallel
      const [nearestRoad, nearestBuilding] = await Promise.all([
        this.findNearestRoad(lat, lng),
        this.findNearestBuilding(lat, lng)
      ]);
      
      // Choose closest target
      let snapTarget: SnapTarget | null = null;
      
      if (nearestRoad && nearestBuilding) {
        snapTarget = nearestRoad.distanceM <= nearestBuilding.distanceM ? nearestRoad : nearestBuilding;
      } else if (nearestRoad) {
        snapTarget = nearestRoad;
      } else if (nearestBuilding) {
        snapTarget = nearestBuilding;
      }
      
      // Reject if no target found
      if (!snapTarget) {
        const result: SnappingResult = {
          success: false,
          originalLat: lat,
          originalLng: lng,
          rejectionReason: 'no_snap_target'
        };
        await this.cacheResult(hash, lat, lng, result);
        return result;
      }
      
      // Success - return snapped coordinates
      const result: SnappingResult = {
        success: true,
        originalLat: lat,
        originalLng: lng,
        snappedLat: snapTarget.snappedLat,
        snappedLng: snapTarget.snappedLng,
        snapTarget
      };
      await this.cacheResult(hash, lat, lng, result);
      return result;
      
    } catch (error) {
      console.error(`Snapping error for ${lat}, ${lng}:`, error);
      // On error, return original coordinates (graceful degradation)
      return {
        success: true,
        originalLat: lat,
        originalLng: lng,
        snappedLat: lat,
        snappedLng: lng
      };
    }
  }

  /**
   * Find nearest road within max distance
   */
  private async findNearestRoad(lat: number, lng: number): Promise<SnapTarget | null> {
    if (!this.MAPBOX_TOKEN) {
      return null;
    }

    const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json`;
    const params = new URLSearchParams({
      radius: this.MAX_SNAP_DISTANCE_M.toString(),
      layers: 'road',
      limit: '50',
      access_token: this.MAPBOX_TOKEN
    });

    const response = await fetch(`${url}?${params.toString()}`);
    
    if (!response.ok) {
      console.error(`Mapbox road query error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: MapboxTilequeryResponse = await response.json();
    
    // Filter for accepted road types
    const acceptedRoads = data.features?.filter(f => 
      f.properties?.class === 'road' && 
      this.ACCEPTED_ROAD_TYPES.includes(f.properties?.type || '')
    ) || [];
    
    if (acceptedRoads.length === 0) {
      return null;
    }
    
    // Find nearest road
    const point = turf.point([lng, lat]);
    let nearestRoad: SnapTarget | null = null;
    let minDistance = Infinity;
    
    for (const road of acceptedRoads) {
      try {
        if (road.geometry.type !== 'LineString') {
          continue;
        }
        
        const line = turf.lineString(road.geometry.coordinates);
        const nearest = turf.nearestPointOnLine(line, point);
        const distance = turf.distance(point, nearest, { units: 'meters' });
        
        if (distance < minDistance && distance <= this.MAX_SNAP_DISTANCE_M) {
          minDistance = distance;
          nearestRoad = {
            type: 'road',
            feature: road,
            distanceM: Math.round(distance),
            snappedLat: nearest.geometry.coordinates[1],
            snappedLng: nearest.geometry.coordinates[0],
            roadClass: road.properties?.type
          };
        }
      } catch (error) {
        console.error('Error processing road feature:', error);
      }
    }
    
    return nearestRoad;
  }

  /**
   * Find nearest building within max distance
   */
  private async findNearestBuilding(lat: number, lng: number): Promise<SnapTarget | null> {
    if (!this.MAPBOX_TOKEN) {
      return null;
    }

    const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json`;
    const params = new URLSearchParams({
      radius: this.MAX_SNAP_DISTANCE_M.toString(),
      layers: 'building',
      limit: '50',
      access_token: this.MAPBOX_TOKEN
    });

    const response = await fetch(`${url}?${params.toString()}`);
    
    if (!response.ok) {
      console.error(`Mapbox building query error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: MapboxTilequeryResponse = await response.json();
    
    // Accept any building type
    const buildings = data.features?.filter(f => 
      f.properties?.class === 'building'
    ) || [];
    
    if (buildings.length === 0) {
      return null;
    }
    
    // Find nearest building
    const point = turf.point([lng, lat]);
    let nearestBuilding: SnapTarget | null = null;
    let minDistance = Infinity;
    
    for (const building of buildings) {
      try {
        // Calculate centroid of building
        let centroid: turf.Feature<turf.Point>;
        
        if (building.geometry.type === 'Point') {
          centroid = turf.point(building.geometry.coordinates);
        } else if (building.geometry.type === 'Polygon') {
          centroid = turf.centroid(turf.polygon(building.geometry.coordinates));
        } else {
          continue;
        }
        
        const distance = turf.distance(point, centroid, { units: 'meters' });
        
        if (distance < minDistance && distance <= this.MAX_SNAP_DISTANCE_M) {
          minDistance = distance;
          nearestBuilding = {
            type: 'building',
            feature: building,
            distanceM: Math.round(distance),
            snappedLat: centroid.geometry.coordinates[1],
            snappedLng: centroid.geometry.coordinates[0],
            buildingType: building.properties?.type || 'unknown'
          };
        }
      } catch (error) {
        console.error('Error processing building feature:', error);
      }
    }
    
    return nearestBuilding;
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
  private async getFromCache(hash: string): Promise<SnappingResult | null> {
    try {
      const cached = await this.prisma.snappingCache.findUnique({
        where: { coordinateHash: hash }
      });

      if (!cached) {
        return null;
      }

      if (cached.expiresAt < new Date()) {
        await this.prisma.snappingCache.delete({
          where: { id: cached.id }
        });
        return null;
      }

      const success = cached.snappedLat !== null && cached.snappedLng !== null;
      
      return {
        success,
        originalLat: cached.originalLat,
        originalLng: cached.originalLng,
        snappedLat: cached.snappedLat || undefined,
        snappedLng: cached.snappedLng || undefined,
        snapTarget: success ? {
          type: cached.snapTargetType as 'road' | 'building',
          feature: JSON.parse(cached.rawResponse),
          distanceM: cached.snapDistanceM || 0,
          snappedLat: cached.snappedLat!,
          snappedLng: cached.snappedLng!,
          roadClass: cached.roadClass || undefined,
          buildingType: cached.buildingType || undefined
        } : undefined,
        rejectionReason: success ? undefined : 'no_snap_target'
      };
    } catch (error) {
      console.error('Snapping cache lookup error:', error);
      return null;
    }
  }

  /**
   * Cache snapping result
   */
  private async cacheResult(
    hash: string,
    lat: number,
    lng: number,
    result: SnappingResult
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.CACHE_TTL_DAYS);

      await this.prisma.snappingCache.create({
        data: {
          coordinateHash: hash,
          originalLat: lat,
          originalLng: lng,
          snappedLat: result.snappedLat || null,
          snappedLng: result.snappedLng || null,
          snapTargetType: result.snapTarget?.type || null,
          snapDistanceM: result.snapTarget?.distanceM || null,
          roadClass: result.snapTarget?.roadClass || null,
          buildingType: result.snapTarget?.buildingType || null,
          rawResponse: JSON.stringify(result.snapTarget?.feature || {}),
          expiresAt
        }
      });
    } catch (error) {
      console.error('Snapping cache write error:', error);
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
