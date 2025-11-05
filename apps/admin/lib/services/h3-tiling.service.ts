import { latLngToCell, cellToBoundary, cellToLatLng, gridDisk } from 'h3-js';
import * as turf from '@turf/turf';

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface H3TileConfig {
  resolution: number; // 6, 7, or 8
  samplesPerTile: number; // Fixed count per tile
  bounds: BoundingBox;
  settlementAware?: boolean; // Enable settlement-aware gap detection
  adaptiveResolution?: boolean; // Enable adaptive resolution based on settlement density
  settlements?: Array<{ lat: number; lng: number; name: string; type: string }>; // Settlement data for gap detection and adaptive resolution
}

export interface H3Tile {
  h3Index: string;
  center: [number, number]; // [lng, lat]
  bounds: any; // GeoJSON Feature<Polygon>
}

export interface ScoredCell {
  id: string;
  center: [number, number];
  bounds: any;
  score?: any;
  confidence?: number;
  nearestStoreDistance?: number;
}

export class H3TilingService {
  private readonly DEFAULT_RESOLUTION = parseInt(
    process.env.EXPANSION_H3_RESOLUTION || '8'
  );
  private readonly DEFAULT_SAMPLES_PER_TILE = parseInt(
    process.env.EXPANSION_SAMPLES_PER_TILE || '25'
  );
  
  // Settlement-aware H3 parameters
  private readonly SETTLEMENT_AWARE = process.env.EXPANSION_H3_SETTLEMENT_AWARE !== 'false';
  private readonly GAP_FOCUS_RADIUS_M = parseInt(process.env.EXPANSION_H3_GAP_FOCUS_RADIUS_M || '10000');

  constructor() {
    console.log('🔷 H3TilingService initialized:', {
      resolution: this.DEFAULT_RESOLUTION,
      samplesPerTile: this.DEFAULT_SAMPLES_PER_TILE,
      settlementAware: this.SETTLEMENT_AWARE,
      gapFocusRadius: this.GAP_FOCUS_RADIUS_M
    });
  }

  /**
   * Identify gaps between settlements for H3 sampling
   * Returns H3 cells that are far from existing settlements
   */
  generateSettlementAwareH3Tiles(
    config: H3TileConfig,
    settlements: Array<{ lat: number; lng: number; name: string; type: string }>
  ): H3Tile[] {
    if (!this.SETTLEMENT_AWARE || settlements.length === 0) {
      // Fall back to regular geometric H3 generation
      return this.generateTiles(config);
    }
    
    console.log(`🔷 Generating settlement-aware H3 tiles with ${settlements.length} settlements`);
    
    // Generate base H3 grid
    const allTiles = this.generateTiles(config);
    
    // Filter tiles to focus on gaps between settlements
    const gapTiles = allTiles.filter(tile => {
      const tilePoint = turf.point(tile.center);
      
      // Find distance to nearest settlement
      const nearestSettlementDistance = settlements.reduce((minDist, settlement) => {
        const settlementPoint = turf.point([settlement.lng, settlement.lat]);
        const distance = turf.distance(tilePoint, settlementPoint, { units: 'meters' });
        return Math.min(minDist, distance);
      }, Infinity);
      
      // Keep tiles that are in the "gap zone" - not too close, not too far
      const minGapDistance = this.GAP_FOCUS_RADIUS_M * 0.3; // 30% of gap radius
      const maxGapDistance = this.GAP_FOCUS_RADIUS_M; // Full gap radius
      
      return nearestSettlementDistance >= minGapDistance && nearestSettlementDistance <= maxGapDistance;
    });
    
    // If we don't have enough gap tiles, supplement with tiles near smaller settlements
    if (gapTiles.length < config.samplesPerTile) {
      const supplementTiles = allTiles.filter(tile => {
        if (gapTiles.some(gapTile => gapTile.h3Index === tile.h3Index)) {
          return false; // Already included
        }
        
        const tilePoint = turf.point(tile.center);
        
        // Find nearest settlement and its type
        let nearestDistance = Infinity;
        let nearestType = '';
        
        settlements.forEach(settlement => {
          const settlementPoint = turf.point([settlement.lng, settlement.lat]);
          const distance = turf.distance(tilePoint, settlementPoint, { units: 'meters' });
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestType = settlement.type;
          }
        });
        
        // Prefer tiles near smaller settlements (towns, villages) for expansion opportunities
        const isNearSmallSettlement = nearestType === 'town' || nearestType === 'village';
        const isWithinReasonableDistance = nearestDistance <= this.GAP_FOCUS_RADIUS_M * 1.5;
        
        return isNearSmallSettlement && isWithinReasonableDistance;
      });
      
      // Add supplement tiles up to the target
      const needed = Math.min(config.samplesPerTile - gapTiles.length, supplementTiles.length);
      gapTiles.push(...supplementTiles.slice(0, needed));
    }
    
    console.log(`   Generated ${gapTiles.length} settlement-aware H3 tiles (${allTiles.length} total tiles)`);
    console.log(`   Gap focus radius: ${this.GAP_FOCUS_RADIUS_M}m`);
    
    return gapTiles;
  }

  /**
   * Analyze settlement proximity to identify underserved areas
   * Returns analysis of settlement coverage and gaps
   */
  analyzeSettlementProximity(
    bounds: BoundingBox,
    settlements: Array<{ lat: number; lng: number; name: string; type: string }>
  ): {
    coverageMap: Array<{ lat: number; lng: number; nearestDistance: number; coverage: 'dense' | 'moderate' | 'sparse' | 'gap' }>;
    gapAreas: Array<{ lat: number; lng: number; gapSize: number }>;
    stats: { totalArea: number; denseArea: number; gapArea: number; averageDistance: number };
  } {
    const gridResolution = 0.01; // ~1km grid for analysis
    const coverageMap: Array<{ lat: number; lng: number; nearestDistance: number; coverage: 'dense' | 'moderate' | 'sparse' | 'gap' }> = [];
    const gapAreas: Array<{ lat: number; lng: number; gapSize: number }> = [];
    
    let totalPoints = 0;
    let densePoints = 0;
    let gapPoints = 0;
    let totalDistance = 0;
    
    // Create analysis grid
    for (let lat = bounds.south; lat <= bounds.north; lat += gridResolution) {
      for (let lng = bounds.west; lng <= bounds.east; lng += gridResolution) {
        const point = turf.point([lng, lat]);
        
        // Find distance to nearest settlement
        const nearestDistance = settlements.reduce((minDist, settlement) => {
          const settlementPoint = turf.point([settlement.lng, settlement.lat]);
          const distance = turf.distance(point, settlementPoint, { units: 'meters' });
          return Math.min(minDist, distance);
        }, Infinity);
        
        // Classify coverage
        let coverage: 'dense' | 'moderate' | 'sparse' | 'gap';
        if (nearestDistance < 2000) coverage = 'dense';
        else if (nearestDistance < 5000) coverage = 'moderate';
        else if (nearestDistance < 10000) coverage = 'sparse';
        else coverage = 'gap';
        
        coverageMap.push({ lat, lng, nearestDistance, coverage });
        
        // Track statistics
        totalPoints++;
        totalDistance += nearestDistance;
        if (coverage === 'dense') densePoints++;
        if (coverage === 'gap') {
          gapPoints++;
          gapAreas.push({ lat, lng, gapSize: nearestDistance });
        }
      }
    }
    
    const stats = {
      totalArea: totalPoints,
      denseArea: densePoints,
      gapArea: gapPoints,
      averageDistance: totalDistance / totalPoints
    };
    
    console.log(`🔍 Settlement proximity analysis: ${Math.round(stats.averageDistance)}m avg distance, ${Math.round(gapPoints/totalPoints*100)}% gap areas`);
    
    return { coverageMap, gapAreas, stats };
  }

  /**
   * Calculate optimal H3 resolution based on settlement density
   * Higher resolution for sparse areas, lower for dense areas
   */
  calculateAdaptiveResolution(
    bounds: BoundingBox,
    settlements: Array<{ lat: number; lng: number; name: string; type: string }>
  ): number {
    if (settlements.length === 0) {
      return this.DEFAULT_RESOLUTION;
    }
    
    // Calculate area in km²
    const latDiff = bounds.north - bounds.south;
    const lngDiff = bounds.east - bounds.west;
    const avgLat = (bounds.north + bounds.south) / 2;
    const kmPerDegreeLat = 111; // Approximate
    const kmPerDegreeLng = 111 * Math.cos(avgLat * Math.PI / 180);
    const areaKm2 = (latDiff * kmPerDegreeLat) * (lngDiff * kmPerDegreeLng);
    
    // Calculate settlement density (settlements per km²)
    const settlementDensity = settlements.length / areaKm2;
    
    // Calculate average distance between settlements
    let totalDistance = 0;
    let pairCount = 0;
    
    for (let i = 0; i < settlements.length; i++) {
      for (let j = i + 1; j < Math.min(settlements.length, i + 10); j++) { // Sample max 10 pairs per settlement
        const distance = turf.distance(
          turf.point([settlements[i].lng, settlements[i].lat]),
          turf.point([settlements[j].lng, settlements[j].lat]),
          { units: 'kilometers' }
        );
        totalDistance += distance;
        pairCount++;
      }
    }
    
    const avgDistanceKm = pairCount > 0 ? totalDistance / pairCount : 50; // Default 50km if no pairs
    
    // Determine resolution based on density and distance
    let resolution: number;
    
    if (settlementDensity > 0.5 || avgDistanceKm < 10) {
      // Dense areas: use lower resolution (larger hexes)
      resolution = 6; // ~36 km² per hex
    } else if (settlementDensity > 0.1 || avgDistanceKm < 25) {
      // Moderate density: use medium resolution
      resolution = 7; // ~5 km² per hex
    } else {
      // Sparse areas: use higher resolution (smaller hexes for better coverage)
      resolution = 8; // ~0.7 km² per hex
    }
    
    console.log(`🔷 Adaptive resolution analysis:`);
    console.log(`   Area: ${Math.round(areaKm2)} km², Settlements: ${settlements.length}`);
    console.log(`   Density: ${settlementDensity.toFixed(4)} settlements/km²`);
    console.log(`   Avg distance: ${avgDistanceKm.toFixed(1)} km`);
    console.log(`   Selected resolution: ${resolution} (${this.calculateTileArea(resolution)} km² per hex)`);
    
    return resolution;
  }

  /**
   * Calculate settlement density per H3 tile
   * Returns density map for adaptive sampling
   */
  calculateSettlementDensityPerTile(
    tiles: H3Tile[],
    settlements: Array<{ lat: number; lng: number; name: string; type: string }>
  ): Map<string, { density: number; nearestSettlements: Array<{ name: string; distance: number; type: string }> }> {
    const densityMap = new Map<string, { density: number; nearestSettlements: Array<{ name: string; distance: number; type: string }> }>();
    
    tiles.forEach(tile => {
      const tilePoint = turf.point(tile.center);
      const tileAreaKm2 = this.calculateTileArea(this.DEFAULT_RESOLUTION);
      const searchRadiusKm = Math.sqrt(tileAreaKm2) * 2; // 2x tile radius for search
      
      // Find settlements within search radius
      const nearbySettlements = settlements
        .map(settlement => {
          const settlementPoint = turf.point([settlement.lng, settlement.lat]);
          const distance = turf.distance(tilePoint, settlementPoint, { units: 'kilometers' });
          return { ...settlement, distance };
        })
        .filter(s => s.distance <= searchRadiusKm)
        .sort((a, b) => a.distance - b.distance);
      
      // Calculate density (settlements per km² within search radius)
      const searchAreaKm2 = Math.PI * Math.pow(searchRadiusKm, 2);
      const density = nearbySettlements.length / searchAreaKm2;
      
      // Keep top 5 nearest settlements for context
      const nearestSettlements = nearbySettlements.slice(0, 5).map(s => ({
        name: s.name,
        distance: Math.round(s.distance * 100) / 100,
        type: s.type
      }));
      
      densityMap.set(tile.h3Index, { density, nearestSettlements });
    });
    
    return densityMap;
  }

  /**
   * Generate H3 tiles for a region
   * Resolution 6: ~36 km² per hex
   * Resolution 7: ~5 km² per hex
   * Resolution 8: ~0.7 km² per hex
   */
  generateTiles(config: H3TileConfig): H3Tile[] {
    // Calculate adaptive resolution if enabled
    let resolution = config.resolution;
    if (config.adaptiveResolution && config.settlements && config.settlements.length > 0) {
      resolution = this.calculateAdaptiveResolution(config.bounds, config.settlements);
      console.log(`🔷 Using adaptive resolution: ${resolution} (was ${config.resolution})`);
    }
    
    // Create updated config with adaptive resolution
    const adaptiveConfig = { ...config, resolution };
    
    // Use settlement-aware generation if enabled and settlements provided
    if (config.settlementAware && config.settlements && config.settlements.length > 0) {
      return this.generateSettlementAwareH3Tiles(adaptiveConfig, config.settlements);
    }
    
    const { bounds } = adaptiveConfig;
    
    // Create a polygon from bounding box
    const bbox = turf.bboxPolygon([
      bounds.west,
      bounds.south,
      bounds.east,
      bounds.north
    ]);
    
    // Get all H3 cells that cover this polygon
    const tiles: H3Tile[] = [];
    const processedCells = new Set<string>();
    
    // Start with center cell
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLng = (bounds.east + bounds.west) / 2;
    const centerCell = latLngToCell(centerLat, centerLng, resolution);
    
    // Use gridDisk to get cells in expanding rings until we cover the bbox
    let ring = 0;
    const maxRings = 50; // Safety limit
    
    while (ring < maxRings) {
      const cells = gridDisk(centerCell, ring);
      let addedInRing = 0;
      
      for (const h3Index of cells) {
        if (processedCells.has(h3Index)) {
          continue;
        }
        processedCells.add(h3Index);
        
        // Get cell center
        const [lat, lng] = cellToLatLng(h3Index);
        
        // Check if cell center is within bounds
        if (lat >= bounds.south && lat <= bounds.north &&
            lng >= bounds.west && lng <= bounds.east) {
          
          // Get cell boundary
          const boundary = cellToBoundary(h3Index, true); // true for GeoJSON format
          const polygon = turf.polygon([boundary.map(([lat, lng]) => [lng, lat])]);
          
          tiles.push({
            h3Index,
            center: [lng, lat],
            bounds: polygon
          });
          addedInRing++;
        }
      }
      
      // If we didn't add any cells in this ring and we have some tiles, we're done
      if (addedInRing === 0 && tiles.length > 0) {
        break;
      }
      
      ring++;
    }
    
    console.log(`🔷 Generated ${tiles.length} H3 tiles at resolution ${resolution}`);
    return tiles;
  }

  /**
   * Determine optimal resolution based on region size
   * Larger regions use lower resolution for broader coverage
   */
  determineResolution(areaKm2: number, storeCount: number): number {
    // Very large regions (> 100,000 km²) - use resolution 6
    if (areaKm2 > 100000) {
      console.log(`📏 Large region (${Math.round(areaKm2)} km²) - using H3 resolution 6`);
      return 6;
    }
    
    // Large regions (10,000-100,000 km²) - use resolution 7
    if (areaKm2 > 10000) {
      console.log(`📏 Medium region (${Math.round(areaKm2)} km²) - using H3 resolution 7`);
      return 7;
    }
    
    // Medium regions (< 10,000 km²) - use resolution 8
    console.log(`📏 Small region (${Math.round(areaKm2)} km²) - using H3 resolution 8`);
    return 8;
  }

  /**
   * Sample candidates evenly across tiles
   * Prevents clustering by ensuring even geographic distribution
   */
  sampleCandidatesPerTile(
    tiles: H3Tile[],
    candidates: ScoredCell[],
    samplesPerTile: number
  ): ScoredCell[] {
    // Group candidates by their containing H3 tile
    const candidatesByTile = new Map<string, ScoredCell[]>();
    
    for (const candidate of candidates) {
      // Find which tile contains this candidate
      const [lng, lat] = candidate.center;
      const h3Index = latLngToCell(lat, lng, this.DEFAULT_RESOLUTION);
      
      if (!candidatesByTile.has(h3Index)) {
        candidatesByTile.set(h3Index, []);
      }
      candidatesByTile.get(h3Index)!.push(candidate);
    }
    
    // Sample fixed number from each tile
    const sampledCandidates: ScoredCell[] = [];
    
    for (const [h3Index, tileCandidates] of candidatesByTile.entries()) {
      // Sort by score (if available) and take top N
      const sorted = tileCandidates.sort((a, b) => {
        const scoreA = a.score?.totalScore || 0;
        const scoreB = b.score?.totalScore || 0;
        return scoreB - scoreA;
      });
      
      // Take up to samplesPerTile from this tile
      const sampled = sorted.slice(0, samplesPerTile);
      sampledCandidates.push(...sampled);
    }
    
    console.log(`🔷 Sampled ${sampledCandidates.length} candidates from ${candidatesByTile.size} tiles (${samplesPerTile} per tile)`);
    return sampledCandidates;
  }

  /**
   * Convert H3 tiles to hex cells format for compatibility
   */
  tilesToHexCells(tiles: H3Tile[]): Array<{
    id: string;
    center: [number, number];
    bounds: any;
  }> {
    return tiles.map(tile => ({
      id: tile.h3Index,
      center: tile.center,
      bounds: tile.bounds
    }));
  }

  /**
   * Calculate area coverage of tiles
   */
  calculateTileArea(resolution: number): number {
    // Approximate area per hex at each resolution (in km²)
    const areaByResolution: Record<number, number> = {
      6: 36.13,
      7: 5.16,
      8: 0.74,
      9: 0.11
    };
    
    return areaByResolution[resolution] || 1;
  }

  /**
   * Get statistics about tile generation
   */
  getTileStats(tiles: H3Tile[], resolution: number) {
    const areaPerTile = this.calculateTileArea(resolution);
    const totalArea = tiles.length * areaPerTile;
    
    return {
      tileCount: tiles.length,
      resolution,
      areaPerTileKm2: areaPerTile,
      totalAreaKm2: Math.round(totalArea),
      avgTileSpacingKm: Math.sqrt(areaPerTile)
    };
  }
}
