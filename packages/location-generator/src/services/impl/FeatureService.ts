import { H3Cell } from '../../types/geospatial';
import { CandidateFeatures, ExistingStore, CompetitorLocation, PopulationGrid, AnchorPoint, AnchorData, AnchorType } from '../../types/core';
import { IFeatureService, AnalysisContext } from '../IFeatureService';
import { MERGE_RADII } from '../../config/constants';

/**
 * Implementation of feature computation for location candidates
 */
export class FeatureService implements IFeatureService {

  /**
   * Compute basic features for national sweep (fast, approximate)
   */
  computeBasicFeatures(cell: H3Cell, context: AnalysisContext): CandidateFeatures {
    try {
      const population = this.calculatePopulation(cell.lat, cell.lng, 2, context.populationData);
      const nearestBrandKm = this.calculateNearestBrandDistance(cell.lat, cell.lng, context.existingStores);
      const competitorDensity = this.calculateCompetitorDensity(cell.lat, cell.lng, context.competitors, 2);
      const anchors = this.processAnchors(cell.lat, cell.lng, context.anchors, 1); // Smaller radius for basic
      const performanceProxy = this.calculatePerformanceProxy(cell.lat, cell.lng, context);

      return {
        population: population.population,
        nearestBrandKm,
        competitorDensity,
        anchors,
        performanceProxy
      };
    } catch (error) {
      throw new Error(`Failed to compute basic features: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compute refined features for shortlisted candidates (detailed, accurate)
   */
  computeRefinedFeatures(cell: H3Cell, context: AnalysisContext): CandidateFeatures {
    try {
      // Use larger radius and more detailed calculations for refined features
      const population = this.calculatePopulation(cell.lat, cell.lng, 5, context.populationData);
      const nearestBrandKm = this.calculateNearestBrandDistance(cell.lat, cell.lng, context.existingStores);
      const competitorDensity = this.calculateCompetitorDensity(cell.lat, cell.lng, context.competitors, 5);
      const anchors = this.processAnchors(cell.lat, cell.lng, context.anchors, 2); // Larger radius for refined
      const performanceProxy = this.calculatePerformanceProxy(cell.lat, cell.lng, context);

      return {
        population: population.population,
        nearestBrandKm,
        competitorDensity,
        anchors,
        performanceProxy
      };
    } catch (error) {
      throw new Error(`Failed to compute refined features: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate population within radius of a point
   */
  calculatePopulation(lat: number, lng: number, radiusKm: number, populationData: PopulationGrid): {
    population: number;
    isEstimated: boolean;
  } {
    try {
      let totalPopulation = 0;
      let cellsFound = 0;

      // Find population cells within radius
      for (const cell of populationData.cells) {
        const distance = this.haversineDistance(lat, lng, cell.lat, cell.lng);
        if (distance <= radiusKm) {
          totalPopulation += cell.population;
          cellsFound++;
        }
      }

      // If no cells found, estimate based on nearest cells
      if (cellsFound === 0) {
        const nearestCells = this.findNearestPopulationCells(lat, lng, populationData.cells, 3);
        if (nearestCells.length > 0) {
          const avgPopulation = nearestCells.reduce((sum, cell) => sum + cell.population, 0) / nearestCells.length;
          return { population: avgPopulation, isEstimated: true };
        }
        return { population: 0, isEstimated: true };
      }

      return { population: totalPopulation, isEstimated: false };
    } catch (error) {
      throw new Error(`Failed to calculate population: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find nearest brand store distance
   */
  calculateNearestBrandDistance(lat: number, lng: number, existingStores: ExistingStore[]): number {
    try {
      if (existingStores.length === 0) {
        return Infinity;
      }

      let minDistance = Infinity;
      for (const store of existingStores) {
        const distance = this.haversineDistance(lat, lng, store.lat, store.lng);
        minDistance = Math.min(minDistance, distance);
      }

      return minDistance;
    } catch (error) {
      throw new Error(`Failed to calculate nearest brand distance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate competitor density within radius
   */
  calculateCompetitorDensity(lat: number, lng: number, competitors: CompetitorLocation[], radiusKm: number): number {
    try {
      let competitorCount = 0;

      for (const competitor of competitors) {
        const distance = this.haversineDistance(lat, lng, competitor.lat, competitor.lng);
        if (distance <= radiusKm) {
          competitorCount++;
        }
      }

      // Return density per square km
      const area = Math.PI * radiusKm * radiusKm;
      return competitorCount / area;
    } catch (error) {
      throw new Error(`Failed to calculate competitor density: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process anchor points with deduplication and scoring
   */
  processAnchors(lat: number, lng: number, anchors: AnchorPoint[], radiusKm: number): AnchorData {
    try {
      // Find anchors within radius
      const nearbyAnchors = anchors.filter(anchor => {
        const distance = this.haversineDistance(lat, lng, anchor.lat, anchor.lng);
        return distance <= radiusKm;
      });

      if (nearbyAnchors.length === 0) {
        return {
          raw: 0,
          deduplicated: 0,
          diminishingScore: 0,
          breakdown: {
            [AnchorType.MALL_TENANT]: 0,
            [AnchorType.STATION_SHOPS]: 0,
            [AnchorType.GROCER]: 0,
            [AnchorType.RETAIL]: 0
          }
        };
      }

      // Group by type for deduplication
      const anchorsByType = this.groupAnchorsByType(nearbyAnchors);
      
      // Apply deduplication by type
      const deduplicatedAnchors = this.deduplicateAnchorsByType(anchorsByType, lat, lng);
      
      // Calculate breakdown
      const breakdown = {
        [AnchorType.MALL_TENANT]: deduplicatedAnchors.filter(a => a.type === AnchorType.MALL_TENANT).length,
        [AnchorType.STATION_SHOPS]: deduplicatedAnchors.filter(a => a.type === AnchorType.STATION_SHOPS).length,
        [AnchorType.GROCER]: deduplicatedAnchors.filter(a => a.type === AnchorType.GROCER).length,
        [AnchorType.RETAIL]: deduplicatedAnchors.filter(a => a.type === AnchorType.RETAIL).length
      };

      // Apply diminishing returns: Σ 1/√rank, max 25 anchors
      const limitedAnchors = deduplicatedAnchors.slice(0, 25);
      const diminishingScore = limitedAnchors.reduce((sum, _, index) => {
        return sum + (1 / Math.sqrt(index + 1));
      }, 0);

      return {
        raw: nearbyAnchors.length,
        deduplicated: deduplicatedAnchors.length,
        diminishingScore,
        breakdown
      };
    } catch (error) {
      throw new Error(`Failed to process anchors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate performance proxy (market-based estimates)
   */
  calculatePerformanceProxy(lat: number, lng: number, context: AnalysisContext): number {
    try {
      // Simple performance proxy based on population density and competition
      const population = this.calculatePopulation(lat, lng, 3, context.populationData);
      const competitorDensity = this.calculateCompetitorDensity(lat, lng, context.competitors, 3);
      
      // Higher population and lower competition = higher performance proxy
      const populationScore = Math.min(population.population / 10000, 1); // Normalize to 0-1
      const competitionPenalty = Math.min(competitorDensity * 0.1, 0.5); // Max 50% penalty
      
      return Math.max(0, populationScore - competitionPenalty);
    } catch (error) {
      throw new Error(`Failed to calculate performance proxy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get travel time catchment (with fallback to radial)
   */
  async getTravelTimeCatchment(lat: number, lng: number, timeMinutes: number): Promise<{
    population: number;
    isEstimated: boolean;
  }> {
    try {
      // For now, fallback to radial distance (approximate 1km per minute driving in urban areas)
      const radiusKm = timeMinutes * 0.8; // More conservative estimate for urban driving
      
      // In production, this would use cached isochrone data or travel-time APIs
      // For now, simulate with radial approximation
      const mockPopulationData: import('../../types/core').PopulationGrid = {
        cells: [], // Would be populated with actual data
        resolution: 8,
        dataSource: 'mock'
      };
      
      // Fallback to radial calculation
      const result = this.calculatePopulation(lat, lng, radiusKm, mockPopulationData);
      return { 
        population: result.population, 
        isEstimated: true // Always estimated until real travel-time data is available
      };
    } catch (error) {
      throw new Error(`Failed to get travel time catchment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhanced refined feature computation with travel-time analysis
   */
  async computeRefinedFeaturesWithTravelTime(cell: H3Cell, context: AnalysisContext): Promise<CandidateFeatures> {
    try {
      // Start with standard refined features
      const basicFeatures = this.computeRefinedFeatures(cell, context);
      
      // Try to get travel-time based population (15-minute catchment)
      try {
        const travelTimePopulation = await this.getTravelTimeCatchment(cell.lat, cell.lng, 15);
        if (travelTimePopulation.population > 0) {
          // Use travel-time population if available
          return {
            ...basicFeatures,
            population: travelTimePopulation.population
          };
        }
      } catch (error) {
        // Fall back to radial calculation if travel-time fails
        console.warn(`Travel-time calculation failed for ${cell.index}, using radial fallback`);
      }
      
      return basicFeatures;
    } catch (error) {
      throw new Error(`Failed to compute refined features with travel time: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper methods
  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Handle invalid coordinates
    if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
      return Infinity;
    }
    
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

  private findNearestPopulationCells(lat: number, lng: number, cells: import('../../types/core').PopulationCell[], count: number): import('../../types/core').PopulationCell[] {
    const distances = cells.map(cell => ({
      cell,
      distance: this.haversineDistance(lat, lng, cell.lat, cell.lng)
    }));

    distances.sort((a, b) => a.distance - b.distance);
    return distances.slice(0, count).map(d => d.cell);
  }

  private groupAnchorsByType(anchors: AnchorPoint[]): Record<AnchorType, AnchorPoint[]> {
    const groups: Record<AnchorType, AnchorPoint[]> = {
      [AnchorType.MALL_TENANT]: [],
      [AnchorType.STATION_SHOPS]: [],
      [AnchorType.GROCER]: [],
      [AnchorType.RETAIL]: []
    };

    for (const anchor of anchors) {
      if (groups[anchor.type]) {
        groups[anchor.type].push(anchor);
      }
    }

    return groups;
  }

  private deduplicateAnchorsByType(anchorsByType: Record<AnchorType, AnchorPoint[]>, centerLat: number, centerLng: number): AnchorPoint[] {
    const deduplicated: AnchorPoint[] = [];

    for (const [type, anchors] of Object.entries(anchorsByType)) {
      const anchorType = type as AnchorType;
      const mergeRadius = MERGE_RADII[anchorType] / 1000; // Convert meters to km
      
      const typeDeduped = this.spatialDeduplication(anchors, mergeRadius);
      deduplicated.push(...typeDeduped);
    }

    // Sort by distance from center
    deduplicated.sort((a, b) => {
      const distA = this.haversineDistance(centerLat, centerLng, a.lat, a.lng);
      const distB = this.haversineDistance(centerLat, centerLng, b.lat, b.lng);
      return distA - distB;
    });

    return deduplicated;
  }

  private spatialDeduplication(anchors: AnchorPoint[], mergeRadiusKm: number): AnchorPoint[] {
    if (anchors.length === 0) return [];

    // Use more sophisticated clustering approach
    const clusters = this.clusterAnchors(anchors, mergeRadiusKm);
    
    // Select representative anchor from each cluster (closest to cluster centroid)
    const deduplicated: AnchorPoint[] = [];
    
    for (const cluster of clusters) {
      if (cluster.length === 1) {
        deduplicated.push(cluster[0]);
      } else {
        // Find centroid of cluster
        const centroidLat = cluster.reduce((sum, a) => sum + a.lat, 0) / cluster.length;
        const centroidLng = cluster.reduce((sum, a) => sum + a.lng, 0) / cluster.length;
        
        // Find anchor closest to centroid
        let closest = cluster[0];
        let minDistance = this.haversineDistance(centroidLat, centroidLng, closest.lat, closest.lng);
        
        for (const anchor of cluster.slice(1)) {
          const distance = this.haversineDistance(centroidLat, centroidLng, anchor.lat, anchor.lng);
          if (distance < minDistance) {
            minDistance = distance;
            closest = anchor;
          }
        }
        
        deduplicated.push(closest);
      }
    }

    return deduplicated;
  }

  /**
   * Cluster anchors using single-linkage clustering
   */
  private clusterAnchors(anchors: AnchorPoint[], mergeRadiusKm: number): AnchorPoint[][] {
    const clusters: AnchorPoint[][] = anchors.map(anchor => [anchor]);
    
    let merged = true;
    while (merged) {
      merged = false;
      
      for (let i = 0; i < clusters.length - 1; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          if (this.shouldMergeClusters(clusters[i], clusters[j], mergeRadiusKm)) {
            // Merge clusters
            clusters[i] = [...clusters[i], ...clusters[j]];
            clusters.splice(j, 1);
            merged = true;
            break;
          }
        }
        if (merged) break;
      }
    }
    
    return clusters;
  }

  /**
   * Check if two clusters should be merged based on minimum distance
   */
  private shouldMergeClusters(cluster1: AnchorPoint[], cluster2: AnchorPoint[], mergeRadiusKm: number): boolean {
    for (const anchor1 of cluster1) {
      for (const anchor2 of cluster2) {
        const distance = this.haversineDistance(anchor1.lat, anchor1.lng, anchor2.lat, anchor2.lng);
        if (distance <= mergeRadiusKm) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Apply advanced anchor scoring with quality weighting
   */
  private calculateAdvancedAnchorScore(anchors: AnchorPoint[], centerLat: number, centerLng: number): number {
    if (anchors.length === 0) return 0;

    let totalScore = 0;
    
    // Sort by distance from center
    const sortedAnchors = anchors.sort((a, b) => {
      const distA = this.haversineDistance(centerLat, centerLng, a.lat, a.lng);
      const distB = this.haversineDistance(centerLat, centerLng, b.lat, b.lng);
      return distA - distB;
    });

    // Apply diminishing returns with distance decay
    for (let i = 0; i < Math.min(sortedAnchors.length, 25); i++) {
      const anchor = sortedAnchors[i];
      const distance = this.haversineDistance(centerLat, centerLng, anchor.lat, anchor.lng);
      
      // Base score with diminishing returns
      const baseScore = 1 / Math.sqrt(i + 1);
      
      // Distance decay (closer anchors are more valuable)
      const distanceDecay = Math.exp(-distance / 0.5); // 0.5km decay constant
      
      // Type-specific multiplier
      const typeMultiplier = this.getAnchorTypeMultiplier(anchor.type);
      
      totalScore += baseScore * distanceDecay * typeMultiplier;
    }

    return totalScore;
  }

  /**
   * Get type-specific multiplier for anchor scoring
   */
  private getAnchorTypeMultiplier(type: AnchorType): number {
    const multipliers = {
      [AnchorType.MALL_TENANT]: 1.2, // High foot traffic
      [AnchorType.STATION_SHOPS]: 1.3, // Very high foot traffic
      [AnchorType.GROCER]: 1.0, // Standard
      [AnchorType.RETAIL]: 0.8 // Lower foot traffic
    };
    
    return multipliers[type] || 1.0;
  }
}