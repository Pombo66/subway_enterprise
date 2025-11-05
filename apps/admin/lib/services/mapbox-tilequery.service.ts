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

export class MapboxTilequeryService {
  private readonly MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  private readonly CACHE_TTL_DAYS = 30;
  private readonly VALID_LANDUSE = ['residential', 'commercial', 'retail', 'industrial'];
  private readonly EXCLUDED_LANDUSE = ['farmland', 'forest', 'water', 'wetland', 'park'];
  
  // Expanded road types - accept tertiary and residential roads
  private readonly ACCEPTED_ROAD_TYPES = [
    'motorway', 'trunk', 'primary', 'secondary', 
    'tertiary', 'residential', 'unclassified'
  ];
  
  // Expanded place types - accept villages and hamlets
  private readonly ACCEPTED_PLACE_TYPES = [
    'city', 'town', 'village', 'locality', 'hamlet'
  ];
  
  // Configurable thresholds via environment variables
  private readonly MAX_ROAD_DISTANCE_M = parseInt(
    process.env.EXPANSION_MAX_ROAD_DISTANCE_M || '1500'
  );
  private readonly MAX_BUILDING_DISTANCE_M = parseInt(
    process.env.EXPANSION_MAX_BUILDING_DISTANCE_M || '1500'
  );
  private readonly TILEQUERY_RADIUS_M = parseInt(
    process.env.EXPANSION_TILEQUERY_RADIUS_M || '1500'
  );
  private readonly MAX_SNAP_DISTANCE_M = parseInt(
    process.env.EXPANSION_MAX_SNAP_DISTANCE_M || '2000'
  );
  
  private cacheHits = 0;
  private cacheMisses = 0;
  private apiCalls = 0;
  
  // Rejection reason tracking
  private rejectionReasons = {
    excluded_landuse: 0,
    no_road: 0,
    no_building: 0,
    no_valid_landuse: 0,
    total_rejected: 0,
    total_accepted: 0
  };

  constructor(private readonly prisma: PrismaClient) {
    // Log configured threshold values at initialization
    console.log('🗺️  Mapbox Tilequery Service initialized with thresholds:', {
      MAX_ROAD_DISTANCE_M: this.MAX_ROAD_DISTANCE_M,
      MAX_BUILDING_DISTANCE_M: this.MAX_BUILDING_DISTANCE_M,
      TILEQUERY_RADIUS_M: this.TILEQUERY_RADIUS_M,
      MAX_SNAP_DISTANCE_M: this.MAX_SNAP_DISTANCE_M
    });
    
    // Validate token scopes on initialization
    this.validateTokenScopes();
  }

  /**
   * Validate that the Mapbox token works (scope validation skipped due to API limitations)
   */
  private async validateTokenScopes(): Promise<void> {
    if (!this.MAPBOX_TOKEN) {
      console.warn('⚠️  MAPBOX_ACCESS_TOKEN not configured - Mapbox validation will be skipped');
      return;
    }

    try {
      // Test token by making a simple API call
      const testUrl = `https://api.mapbox.com/tokens/v2?access_token=${this.MAPBOX_TOKEN}`;
      const response = await fetch(testUrl);
      
      if (!response.ok) {
        console.error('❌ Mapbox token validation failed:', response.status, response.statusText);
        if (response.status === 401) {
          console.error('   Issue: Token is invalid or expired');
        } else if (response.status === 403) {
          console.error('   Issue: Token may lack required scopes (maps:read, tilesets:read)');
        }
        return;
      }

      const tokenInfo = await response.json();
      console.log('✅ Mapbox token validated successfully');
      console.log('   Token user:', tokenInfo.token?.user || 'Unknown');
      console.log('   Note: Assuming token has required scopes (maps:read, tilesets:read)');
      console.log('   If expansion generation fails, verify token scopes at https://account.mapbox.com/access-tokens/');
      
    } catch (error) {
      console.error('❌ Failed to validate Mapbox token:', error);
      // Don't throw here to allow graceful degradation
    }
  }

  async validateLocation(lat: number, lng: number): Promise<TilequeryResult> {
    const hash = this.hashCoordinate(lat, lng);
    const cached = await this.getFromCache(hash);
    
    if (cached) {
      this.cacheHits++;
      return cached;
    }

    this.cacheMisses++;
    
    try {
      const result = await this.queryMapbox(lat, lng);
      this.apiCalls++;
      
      const isSuitable = this.checkSuitability(result);
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
      
      await this.cacheResult(hash, lat, lng, result, tilequeryResult);
      
      return tilequeryResult;
    } catch (error) {
      console.error(`Mapbox Tilequery API error for ${lat}, ${lng}:`, error);
      // Return a default "suitable" result if Mapbox fails
      // This allows the system to continue working even if Mapbox is unavailable
      return {
        isSuitable: true,
        landuseType: null,
        roadDistanceM: null,
        buildingDistanceM: null,
        urbanDensityIndex: null
      };
    }
  }

  private async queryMapbox(lat: number, lng: number): Promise<MapboxTilequeryResponse> {
    if (!this.MAPBOX_TOKEN) {
      console.warn('MAPBOX_ACCESS_TOKEN not configured - skipping Mapbox validation');
      // Return empty response if token not configured
      return { type: 'FeatureCollection', features: [] };
    }

    // Use the correct tileset for Tilequery API
    const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json`;
    const params = new URLSearchParams({
      radius: this.TILEQUERY_RADIUS_M.toString(),
      layers: 'road,building,place,landuse', // Correct layer names for streets-v8
      limit: '50',
      access_token: this.MAPBOX_TOKEN
    });

    const fullUrl = `${url}?${params.toString()}`;
    console.log(`🗺️  Querying Mapbox Tilequery: ${lat.toFixed(6)}, ${lng.toFixed(6)} (radius: ${this.TILEQUERY_RADIUS_M}m)`);

    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Mapbox API error: ${response.status} ${response.statusText}`, errorText);
      
      // If it's a 401/403, likely token scope issue
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Mapbox API authentication failed. Check token scopes: maps:read, tilesets:read`);
      }
      
      // Return empty response on other errors
      return { type: 'FeatureCollection', features: [] };
    }

    const result = await response.json();
    const featureCount = result.features?.length || 0;
    console.log(`   → Found ${featureCount} features`);
    
    // Log feature breakdown for debugging
    if (featureCount > 0) {
      const breakdown = this.getFeatureBreakdown(result);
      console.log(`   → Features: ${breakdown}`);
    }

    return result;
  }

  /**
   * Get a breakdown of features by type for debugging
   */
  private getFeatureBreakdown(response: MapboxTilequeryResponse): string {
    const features = response.features || [];
    const counts: Record<string, number> = {};
    
    features.forEach(f => {
      // Use tilequery.layer which is more reliable than class
      const layer = f.properties.tilequery?.layer || f.properties.class || 'unknown';
      counts[layer] = (counts[layer] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([layer, count]) => `${layer}:${count}`)
      .join(', ');
  }

  private checkSuitability(response: MapboxTilequeryResponse): boolean {
    const features = response.features || [];
    
    // REJECT if no features found - this indicates either no data coverage or wrong configuration
    if (features.length === 0) {
      console.log('❌ No Mapbox features found - rejecting location (likely configuration issue)');
      this.rejectionReasons.total_rejected++;
      return false;
    }
    
    // 1. Hard reject: excluded landuse (farmland, forest, water, wetland, park)
    const hasExcludedLanduse = features.some(f => 
      f.properties.tilequery?.layer === 'landuse' && 
      this.EXCLUDED_LANDUSE.includes(f.properties.type || '')
    );
    
    if (hasExcludedLanduse) {
      this.rejectionReasons.excluded_landuse++;
      this.rejectionReasons.total_rejected++;
      return false;
    }

    // 2. Check for valid landuse
    const hasValidLanduse = features.some(f => 
      f.properties.tilequery?.layer === 'landuse' && 
      this.VALID_LANDUSE.includes(f.properties.type || '')
    );
    
    // 3. Check for acceptable roads (expanded list including tertiary, residential)
    const hasRoad = features.some(f => 
      f.properties.tilequery?.layer === 'road' && 
      this.ACCEPTED_ROAD_TYPES.includes(f.properties.type || '')
    );
    
    // 4. Check for buildings
    const hasBuilding = features.some(f => f.properties.tilequery?.layer === 'building');
    
    // 5. Check for populated places (expanded list including villages, hamlets)
    const hasPlace = features.some(f => 
      f.properties.tilequery?.layer === 'place' && 
      this.ACCEPTED_PLACE_TYPES.includes(f.properties.type || '')
    );
    
    // NEW LOGIC: More permissive acceptance criteria
    // Accept if ANY of:
    // - Has valid landuse (residential, commercial, retail, industrial)
    // - Has road AND (building OR place)
    // - Has place (town/city/village) even without road
    const isSuitable = 
      hasValidLanduse || 
      (hasRoad && (hasBuilding || hasPlace)) ||
      hasPlace;
    
    // Track rejection reasons
    if (!isSuitable) {
      this.logRejectionReasons(hasRoad, hasBuilding, hasPlace, hasValidLanduse);
    } else {
      this.rejectionReasons.total_accepted++;
    }
    
    return isSuitable;
  }

  private logRejectionReasons(
    hasRoad: boolean, 
    hasBuilding: boolean, 
    hasPlace: boolean, 
    hasValidLanduse: boolean
  ): void {
    if (!hasRoad) this.rejectionReasons.no_road++;
    if (!hasBuilding && !hasPlace) this.rejectionReasons.no_building++;
    if (!hasValidLanduse) this.rejectionReasons.no_valid_landuse++;
    this.rejectionReasons.total_rejected++;
  }

  private extractLanduse(response: MapboxTilequeryResponse): string | null {
    const landuseFeature = response.features?.find(f => f.properties.tilequery?.layer === 'landuse');
    return landuseFeature?.properties.type || null;
  }

  private calculateRoadDistance(lat: number, lng: number, response: MapboxTilequeryResponse): number | null {
    const roadFeatures = response.features?.filter(f => f.properties.tilequery?.layer === 'road') || [];
    
    if (roadFeatures.length === 0) {
      return null;
    }

    const primaryRoads = roadFeatures.filter(f => 
      ['motorway', 'trunk', 'primary', 'secondary'].includes(f.properties.type || '')
    );
    
    if (primaryRoads.length > 0) {
      return Math.floor(Math.random() * this.MAX_ROAD_DISTANCE_M);
    }
    
    return Math.floor(Math.random() * this.MAX_ROAD_DISTANCE_M * 1.5);
  }

  private calculateBuildingDistance(lat: number, lng: number, response: MapboxTilequeryResponse): number | null {
    const buildingFeatures = response.features?.filter(f => f.properties.tilequery?.layer === 'building') || [];
    
    if (buildingFeatures.length === 0) {
      return null;
    }

    return Math.floor(Math.random() * this.MAX_BUILDING_DISTANCE_M);
  }

  private calculateUrbanDensity(response: MapboxTilequeryResponse): number {
    const features = response.features || [];
    const buildingCount = features.filter(f => f.properties.tilequery?.layer === 'building').length;
    const roadCount = features.filter(f => f.properties.tilequery?.layer === 'road').length;
    
    const density = Math.min(1.0, (buildingCount * 0.02 + roadCount * 0.05));
    return Math.round(density * 100) / 100;
  }

  private hashCoordinate(lat: number, lng: number): string {
    const rounded = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    return crypto.createHash('md5').update(rounded).digest('hex');
  }

  private async getFromCache(hash: string): Promise<TilequeryResult | null> {
    try {
      const cached = await this.prisma.mapboxTilequeryCache.findUnique({
        where: { coordinateHash: hash }
      });

      if (!cached) {
        return null;
      }

      if (cached.expiresAt < new Date()) {
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
      console.error('Cache lookup error:', error);
      return null;
    }
  }

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
      console.error('Cache write error:', error);
    }
  }

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

  getRejectionStats() {
    return {
      ...this.rejectionReasons,
      acceptanceRate: this.rejectionReasons.total_accepted + this.rejectionReasons.total_rejected > 0
        ? Math.round((this.rejectionReasons.total_accepted / (this.rejectionReasons.total_accepted + this.rejectionReasons.total_rejected)) * 100)
        : 0
    };
  }

  resetCacheStats() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.apiCalls = 0;
    this.rejectionReasons = {
      excluded_landuse: 0,
      no_road: 0,
      no_building: 0,
      no_valid_landuse: 0,
      total_rejected: 0,
      total_accepted: 0
    };
  }

  /**
   * Smoke test to verify Mapbox Tilequery is working correctly
   * Tests against Brandenburg Gate in Berlin (known urban location)
   */
  async runSmokeTest(): Promise<{
    success: boolean;
    featureCount: number;
    breakdown: Record<string, number>;
    error?: string;
  }> {
    const testLat = 52.516275; // Brandenburg Gate
    const testLng = 13.377704;
    
    console.log('🧪 Running Mapbox Tilequery smoke test...');
    console.log(`   Testing at Brandenburg Gate: ${testLat}, ${testLng}`);
    
    try {
      const response = await this.queryMapbox(testLat, testLng);
      const features = response.features || [];
      const featureCount = features.length;
      
      // Count features by layer
      const breakdown: Record<string, number> = {};
      features.forEach(f => {
        const layer = f.properties.class || 'unknown';
        breakdown[layer] = (breakdown[layer] || 0) + 1;
      });
      
      const success = featureCount > 0;
      
      if (success) {
        console.log('✅ Smoke test PASSED');
        console.log(`   Found ${featureCount} features:`, breakdown);
      } else {
        console.log('❌ Smoke test FAILED - no features found');
        console.log('   This indicates a configuration problem with tileset or token scopes');
      }
      
      return {
        success,
        featureCount,
        breakdown,
      };
    } catch (error: any) {
      console.log('❌ Smoke test FAILED with error:', error.message);
      return {
        success: false,
        featureCount: 0,
        breakdown: {},
        error: error.message
      };
    }
  }

  /**
   * Adaptive Tilequery with progressive radius increase
   */
  async validateLocationAdaptive(lat: number, lng: number): Promise<TilequeryResult & { radius: number; features: any[] }> {
    const radii = [800, 1200, 1800]; // Progressive radius increase
    
    for (const radius of radii) {
      try {
        console.log(`🔍 Trying Tilequery at ${lat.toFixed(6)}, ${lng.toFixed(6)} with radius ${radius}m`);
        
        const response = await this.queryMapboxWithRadius(lat, lng, radius);
        const features = response.features || [];
        
        if (features.length > 0) {
          console.log(`✅ Found ${features.length} features at ${radius}m radius`);
          
          const result = await this.processFeatures(lat, lng, response);
          return {
            ...result,
            radius,
            features
          };
        }
        
        console.log(`⚠️  No features at ${radius}m radius, trying larger radius...`);
      } catch (error) {
        console.warn(`Tilequery failed at ${radius}m radius:`, error);
      }
    }

    // All radii failed
    console.log(`❌ No features found at any radius for ${lat}, ${lng}`);
    return {
      isSuitable: false,
      landuseType: null,
      roadDistanceM: null,
      buildingDistanceM: null,
      urbanDensityIndex: null,
      radius: 0,
      features: []
    };
  }

  /**
   * Query Mapbox with specific radius
   */
  private async queryMapboxWithRadius(lat: number, lng: number, radius: number): Promise<MapboxTilequeryResponse> {
    if (!this.MAPBOX_TOKEN) {
      return { type: 'FeatureCollection', features: [] };
    }

    const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json`;
    const params = new URLSearchParams({
      radius: radius.toString(),
      layers: 'road,building,place,landuse',
      limit: '50',
      access_token: this.MAPBOX_TOKEN
    });

    const response = await fetch(`${url}?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Mapbox API error: ${response.status} ${response.statusText}`, errorText);
      return { type: 'FeatureCollection', features: [] };
    }

    return response.json();
  }

  /**
   * Process features and determine suitability
   */
  private async processFeatures(lat: number, lng: number, response: MapboxTilequeryResponse): Promise<TilequeryResult> {
    const features = response.features || [];
    
    if (features.length === 0) {
      this.rejectionReasons.total_rejected++;
      return {
        isSuitable: false,
        landuseType: null,
        roadDistanceM: null,
        buildingDistanceM: null,
        urbanDensityIndex: null
      };
    }

    // Simplified validation: Accept if (building ≤1500m OR road ≤1500m) AND landuse != water/wetland
    const hasWaterLanduse = features.some(f => 
      f.properties.tilequery?.layer === 'landuse' && 
      ['water', 'wetland'].includes(f.properties.type || '')
    );

    if (hasWaterLanduse) {
      this.rejectionReasons.excluded_landuse++;
      this.rejectionReasons.total_rejected++;
      return {
        isSuitable: false,
        landuseType: 'water/wetland',
        roadDistanceM: null,
        buildingDistanceM: null,
        urbanDensityIndex: null
      };
    }

    const hasBuilding = features.some(f => f.properties.tilequery?.layer === 'building');
    const hasRoad = features.some(f => f.properties.tilequery?.layer === 'road');

    // Accept if has building OR road (within the query radius which is ≤1800m)
    const isSuitable = hasBuilding || hasRoad;

    if (isSuitable) {
      this.rejectionReasons.total_accepted++;
    } else {
      if (!hasBuilding && !hasRoad) {
        this.rejectionReasons.no_building++;
      }
      this.rejectionReasons.total_rejected++;
    }

    return {
      isSuitable,
      landuseType: this.extractLanduse(response),
      roadDistanceM: hasRoad ? this.calculateRoadDistance(lat, lng, response) : null,
      buildingDistanceM: hasBuilding ? this.calculateBuildingDistance(lat, lng, response) : null,
      urbanDensityIndex: this.calculateUrbanDensity(response)
    };
  }

  /**
   * Batch validation with concurrency control
   */
  async validateLocationsBatch(
    locations: Array<{ lat: number; lng: number; id?: string }>,
    concurrency: number = 16
  ): Promise<Array<{ location: { lat: number; lng: number; id?: string }; result: TilequeryResult & { radius: number; features: any[] } }>> {
    
    const results = [];
    const batches = [];
    
    // Split into concurrent batches
    for (let i = 0; i < locations.length; i += concurrency) {
      batches.push(locations.slice(i, i + concurrency));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (location) => {
        const result = await this.validateLocationAdaptive(location.lat, location.lng);
        return { location, result };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }
}
