import * as turf from '@turf/turf';
import { PrismaClient } from '@prisma/client';

export interface SnappingResult {
  success: boolean;
  snappedLat: number;
  snappedLng: number;
  snapType: 'building' | 'road' | 'none';
  snapDistanceM: number;
  reason?: string;
}

export interface SnappingTarget {
  lat: number;
  lng: number;
  type: 'building' | 'road';
  distanceM: number;
  properties?: any;
}

export class EnhancedSnappingService {
  private readonly MAX_SNAP_DISTANCE_M = parseInt(
    process.env.EXPANSION_MAX_SNAP_DISTANCE_M || '1500'
  );

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Enhanced snapping with priority order: buildings first, then roads
   */
  async snapToNearestInfrastructure(
    lat: number, 
    lng: number, 
    tilequeryFeatures: any[]
  ): Promise<SnappingResult> {
    
    // Extract potential snap targets from Tilequery features
    const targets = this.extractSnapTargets(lat, lng, tilequeryFeatures);
    
    if (targets.length === 0) {
      return {
        success: false,
        snappedLat: lat,
        snappedLng: lng,
        snapType: 'none',
        snapDistanceM: 0,
        reason: 'No snap targets within range'
      };
    }

    // Priority 1: Try buildings first (≤1500m)
    const buildingTargets = targets
      .filter(t => t.type === 'building' && t.distanceM <= this.MAX_SNAP_DISTANCE_M)
      .sort((a, b) => a.distanceM - b.distanceM);

    if (buildingTargets.length > 0) {
      const target = buildingTargets[0];
      return {
        success: true,
        snappedLat: target.lat,
        snappedLng: target.lng,
        snapType: 'building',
        snapDistanceM: target.distanceM
      };
    }

    // Priority 2: Try roads if no buildings (≤1500m)
    const roadTargets = targets
      .filter(t => t.type === 'road' && t.distanceM <= this.MAX_SNAP_DISTANCE_M)
      .sort((a, b) => a.distanceM - b.distanceM);

    if (roadTargets.length > 0) {
      const target = roadTargets[0];
      return {
        success: true,
        snappedLat: target.lat,
        snappedLng: target.lng,
        snapType: 'road',
        snapDistanceM: target.distanceM
      };
    }

    return {
      success: false,
      snappedLat: lat,
      snappedLng: lng,
      snapType: 'none',
      snapDistanceM: 0,
      reason: `No infrastructure within ${this.MAX_SNAP_DISTANCE_M}m`
    };
  }

  /**
   * Extract snap targets from Tilequery features
   */
  private extractSnapTargets(centerLat: number, centerLng: number, features: any[]): SnappingTarget[] {
    const targets: SnappingTarget[] = [];
    const centerPoint = turf.point([centerLng, centerLat]);

    for (const feature of features) {
      const layer = feature.properties.tilequery?.layer;
      
      if (layer === 'building' || layer === 'road') {
        // Use feature coordinates or calculate centroid for polygons
        let targetPoint: any;
        
        if (feature.geometry.type === 'Point') {
          targetPoint = feature.geometry;
        } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'LineString') {
          targetPoint = turf.centroid(feature).geometry;
        } else {
          continue; // Skip unsupported geometry types
        }

        const distance = turf.distance(centerPoint, targetPoint, { units: 'meters' });
        
        targets.push({
          lat: targetPoint.coordinates[1],
          lng: targetPoint.coordinates[0],
          type: layer as 'building' | 'road',
          distanceM: distance,
          properties: feature.properties
        });
      }
    }

    return targets;
  }

  /**
   * Validate snapping result against acceptance criteria
   */
  validateSnappedLocation(
    snapResult: SnappingResult,
    tilequeryFeatures: any[]
  ): { isValid: boolean; reason?: string } {
    
    if (!snapResult.success) {
      return { 
        isValid: false, 
        reason: 'No infrastructure to snap to' 
      };
    }

    // Check for water/wetland exclusion
    const hasWaterLanduse = tilequeryFeatures.some(f => 
      f.properties.tilequery?.layer === 'landuse' && 
      ['water', 'wetland'].includes(f.properties.type || '')
    );

    if (hasWaterLanduse) {
      return { 
        isValid: false, 
        reason: 'Excluded landuse: water/wetland' 
      };
    }

    // Accept if we successfully snapped to building OR road within 1500m
    const withinRange = snapResult.snapDistanceM <= this.MAX_SNAP_DISTANCE_M;
    const hasInfrastructure = snapResult.snapType === 'building' || snapResult.snapType === 'road';

    if (withinRange && hasInfrastructure) {
      return { isValid: true };
    }

    return { 
      isValid: false, 
      reason: `${snapResult.snapType} at ${Math.round(snapResult.snapDistanceM)}m exceeds ${this.MAX_SNAP_DISTANCE_M}m limit` 
    };
  }
}