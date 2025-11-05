import * as turf from '@turf/turf';
import { PrismaClient } from '@prisma/client';
import { Store } from './types';
import * as crypto from 'crypto';

export interface PerformanceCluster {
  id: string;
  centroid: [number, number]; // [lng, lat]
  radius: number;
  stores: Store[];
  averageTurnover: number;
  storeCount: number;
  strength: number; // 0-1 based on performance and density
  demographics: ClusterDemographics;
  anchorPatterns: string[]; // Common anchor types in cluster
  region: string;
  calculatedAt: Date;
}

export interface ClusterDemographics {
  averageIncome: number;
  averagePopulationDensity: number;
  averageGrowthRate: number;
  dominantAreaClassification: 'urban' | 'suburban' | 'rural';
  populationRange: { min: number; max: number };
  incomeRange: { min: number; max: number };
}

export class ClusterAnalysisService {
  private readonly CACHE_TTL_DAYS = 7;
  private readonly HIGH_PERFORMER_PERCENTILE = 75;
  private readonly MIN_STORES_PER_CLUSTER = 3;
  private readonly MAX_CLUSTER_RADIUS_KM = 15;
  
  constructor(private readonly prisma: PrismaClient) {
    console.log('🎯 ClusterAnalysisService initialized');
  }

  /**
   * Identify clusters of high-performing stores
   * Implements requirements 10.1, 10.2 for cluster identification
   */
  async identifyClusters(stores: Store[]): Promise<PerformanceCluster[]> {
    try {
      console.log(`🎯 Analyzing ${stores.length} stores for performance clusters...`);
      
      // Filter to high-performing stores (Requirement 10.1)
      const highPerformers = this.identifyHighPerformers(stores);
      console.log(`📈 Identified ${highPerformers.length} high-performing stores (>${this.HIGH_PERFORMER_PERCENTILE}th percentile)`);
      
      if (highPerformers.length < this.MIN_STORES_PER_CLUSTER) {
        console.log('❌ Insufficient high-performing stores for clustering');
        return [];
      }
      
      // Use spatial clustering to group stores (Requirement 10.2)
      const clusters = await this.performSpatialClustering(highPerformers);
      
      // Calculate cluster metrics and demographics
      const enrichedClusters = await Promise.all(
        clusters.map(cluster => this.enrichClusterData(cluster))
      );
      
      // Cache clusters for future use
      await this.cacheClusters(enrichedClusters);
      
      console.log(`✅ Identified ${enrichedClusters.length} performance clusters`);
      return enrichedClusters;
      
    } catch (error) {
      console.error('Error identifying clusters:', error);
      return [];
    }
  }

  /**
   * Analyze demographic patterns within clusters
   * Implements requirement 12.1 for demographic pattern analysis
   */
  async analyzeClusterDemographics(cluster: PerformanceCluster): Promise<ClusterDemographics> {
    try {
      // This is a simplified implementation
      // In a full implementation, this would query actual demographic data for each store location
      
      const demographics: ClusterDemographics = {
        averageIncome: 55000, // Estimated based on high-performing stores
        averagePopulationDensity: 300, // Estimated
        averageGrowthRate: 1.5, // Estimated
        dominantAreaClassification: 'suburban', // Most common for successful clusters
        populationRange: { min: 50000, max: 500000 },
        incomeRange: { min: 45000, max: 75000 }
      };
      
      // Adjust based on cluster characteristics
      if (cluster.averageTurnover > 800000) {
        demographics.averageIncome *= 1.2; // Higher income areas for top performers
        demographics.dominantAreaClassification = 'urban';
      }
      
      return demographics;
      
    } catch (error) {
      console.error('Error analyzing cluster demographics:', error);
      return this.getDefaultDemographics();
    }
  }

  /**
   * Find common anchor patterns in clusters
   * Implements requirement 12.2 for anchor pattern analysis
   */
  async analyzeAnchorPatterns(cluster: PerformanceCluster): Promise<string[]> {
    try {
      // This is a simplified implementation
      // In a full implementation, this would analyze actual anchor data for each store location
      
      const commonPatterns: string[] = [];
      
      // Based on cluster characteristics, infer likely anchor patterns
      if (cluster.demographics.dominantAreaClassification === 'urban') {
        commonPatterns.push('transport_hubs', 'educational_institutions', 'retail_centers');
      } else if (cluster.demographics.dominantAreaClassification === 'suburban') {
        commonPatterns.push('retail_centers', 'service_stations', 'educational_institutions');
      } else {
        commonPatterns.push('service_stations', 'transport_hubs');
      }
      
      // High-performing clusters often have multiple anchor types
      if (cluster.strength > 0.8) {
        commonPatterns.push('multi_anchor_locations');
      }
      
      return commonPatterns;
      
    } catch (error) {
      console.error('Error analyzing anchor patterns:', error);
      return ['unknown'];
    }
  }

  /**
   * Get cached clusters for a region
   */
  async getCachedClusters(region: string): Promise<PerformanceCluster[]> {
    try {
      const cached = await this.prisma.$queryRaw<Array<{
        id: string;
        region: string;
        centroidLat: number;
        centroidLng: number;
        radius: number;
        storeIds: string;
        storeCount: number;
        averageTurnover: number;
        strength: number;
        demographics: string;
        anchorPatterns: string;
        calculatedAt: Date;
        expiresAt: Date;
      }>>`
        SELECT id, region, centroidLat, centroidLng, radius, storeIds, storeCount, 
               averageTurnover, strength, demographics, anchorPatterns, calculatedAt, expiresAt
        FROM PerformanceCluster 
        WHERE region = ${region} AND expiresAt > ${new Date()}
      `;

      if (!cached || cached.length === 0) {
        return [];
      }

      // Convert cached data back to PerformanceCluster objects
      const clusters: PerformanceCluster[] = [];
      
      for (const record of cached) {
        try {
          const storeIds = JSON.parse(record.storeIds) as string[];
          const demographics = JSON.parse(record.demographics) as ClusterDemographics;
          const anchorPatterns = JSON.parse(record.anchorPatterns) as string[];
          
          // Note: We don't have the full store objects in cache, so we create minimal store objects
          const stores: Store[] = storeIds.map(id => ({
            id,
            latitude: record.centroidLat, // Approximate
            longitude: record.centroidLng, // Approximate
            annualTurnover: record.averageTurnover // Approximate
          }));
          
          clusters.push({
            id: record.id,
            centroid: [record.centroidLng, record.centroidLat],
            radius: record.radius,
            stores,
            averageTurnover: record.averageTurnover,
            storeCount: record.storeCount,
            strength: record.strength,
            demographics,
            anchorPatterns,
            region: record.region,
            calculatedAt: record.calculatedAt
          });
          
        } catch (parseError) {
          console.error('Error parsing cached cluster data:', parseError);
        }
      }
      
      console.log(`🎯 Retrieved ${clusters.length} cached clusters for region ${region}`);
      return clusters;
      
    } catch (error) {
      console.error('Error getting cached clusters:', error);
      return [];
    }
  }

  /**
   * Identify high-performing stores based on turnover percentile
   */
  private identifyHighPerformers(stores: Store[]): Store[] {
    // Filter stores with valid turnover data
    const storesWithTurnover = stores.filter(store => 
      store.annualTurnover && store.annualTurnover > 0
    );
    
    if (storesWithTurnover.length === 0) {
      return [];
    }
    
    // Calculate percentile threshold
    const turnovers = storesWithTurnover
      .map(store => store.annualTurnover!)
      .sort((a, b) => a - b);
    
    const percentileIndex = Math.floor((this.HIGH_PERFORMER_PERCENTILE / 100) * turnovers.length);
    const threshold = turnovers[percentileIndex] || turnovers[turnovers.length - 1];
    
    // Return stores above threshold
    const highPerformers = storesWithTurnover.filter(store => 
      store.annualTurnover! >= threshold
    );
    
    console.log(`📊 High performer threshold: $${threshold.toLocaleString()} (${this.HIGH_PERFORMER_PERCENTILE}th percentile)`);
    return highPerformers;
  }

  /**
   * Perform spatial clustering using distance-based grouping
   */
  private async performSpatialClustering(stores: Store[]): Promise<PerformanceCluster[]> {
    const clusters: PerformanceCluster[] = [];
    const processedStores = new Set<string>();
    
    for (const store of stores) {
      if (processedStores.has(store.id) || !store.latitude || !store.longitude) {
        continue;
      }
      
      // Find nearby stores within cluster radius
      const nearbyStores = stores.filter(otherStore => {
        if (processedStores.has(otherStore.id) || 
            !otherStore.latitude || !otherStore.longitude ||
            otherStore.id === store.id) {
          return false;
        }
        
        const distance = this.calculateDistance(
          store.latitude!, store.longitude!,
          otherStore.latitude!, otherStore.longitude!
        );
        
        return distance <= this.MAX_CLUSTER_RADIUS_KM;
      });
      
      // Include the seed store
      const clusterStores = [store, ...nearbyStores];
      
      // Only create cluster if it meets minimum size requirement
      if (clusterStores.length >= this.MIN_STORES_PER_CLUSTER) {
        const cluster = this.createCluster(clusterStores);
        clusters.push(cluster);
        
        // Mark all stores in this cluster as processed
        clusterStores.forEach(s => processedStores.add(s.id));
      }
    }
    
    return clusters;
  }

  /**
   * Create a cluster from a group of stores
   */
  private createCluster(stores: Store[]): PerformanceCluster {
    // Calculate centroid
    const validStores = stores.filter(s => s.latitude && s.longitude);
    const centroidLat = validStores.reduce((sum, s) => sum + s.latitude!, 0) / validStores.length;
    const centroidLng = validStores.reduce((sum, s) => sum + s.longitude!, 0) / validStores.length;
    
    // Calculate average turnover
    const storesWithTurnover = stores.filter(s => s.annualTurnover);
    const averageTurnover = storesWithTurnover.length > 0 
      ? storesWithTurnover.reduce((sum, s) => sum + s.annualTurnover!, 0) / storesWithTurnover.length
      : 0;
    
    // Calculate cluster radius (max distance from centroid)
    const radius = Math.max(...validStores.map(store => 
      this.calculateDistance(centroidLat, centroidLng, store.latitude!, store.longitude!)
    ));
    
    // Calculate cluster strength
    const strength = this.calculateClusterStrength(stores, averageTurnover);
    
    return {
      id: crypto.randomUUID(),
      centroid: [centroidLng, centroidLat],
      radius,
      stores,
      averageTurnover,
      storeCount: stores.length,
      strength,
      demographics: this.getDefaultDemographics(), // Will be enriched later
      anchorPatterns: [], // Will be enriched later
      region: stores[0]?.region || 'unknown',
      calculatedAt: new Date()
    };
  }

  /**
   * Calculate cluster strength score based on performance and density
   * Implements requirement 10.4 for cluster strength calculation
   */
  private calculateClusterStrength(stores: Store[], averageTurnover: number): number {
    // Base strength from average turnover (normalized to 0-1)
    const maxExpectedTurnover = 1500000; // $1.5M as high-end reference
    const turnoverStrength = Math.min(1, averageTurnover / maxExpectedTurnover);
    
    // Density strength from store count
    const maxExpectedStores = 10; // 10 stores as high-density reference
    const densityStrength = Math.min(1, stores.length / maxExpectedStores);
    
    // Combined strength (weighted average)
    const strength = (turnoverStrength * 0.7) + (densityStrength * 0.3);
    
    return Math.round(strength * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Enrich cluster with demographic and anchor data
   */
  private async enrichClusterData(cluster: PerformanceCluster): Promise<PerformanceCluster> {
    try {
      // Analyze demographics
      const demographics = await this.analyzeClusterDemographics(cluster);
      
      // Analyze anchor patterns
      const anchorPatterns = await this.analyzeAnchorPatterns(cluster);
      
      return {
        ...cluster,
        demographics,
        anchorPatterns
      };
      
    } catch (error) {
      console.error('Error enriching cluster data:', error);
      return cluster;
    }
  }

  /**
   * Cache clusters for future use
   */
  private async cacheClusters(clusters: PerformanceCluster[]): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.CACHE_TTL_DAYS);

      for (const cluster of clusters) {
        await this.prisma.$executeRaw`
          INSERT INTO PerformanceCluster (
            id, region, centroidLat, centroidLng, radius, storeIds, storeCount, 
            averageTurnover, strength, demographics, anchorPatterns, calculatedAt, expiresAt
          ) VALUES (
            ${cluster.id}, ${cluster.region}, ${cluster.centroid[1]}, ${cluster.centroid[0]}, 
            ${cluster.radius}, ${JSON.stringify(cluster.stores.map(s => s.id))}, ${cluster.storeCount}, 
            ${cluster.averageTurnover}, ${cluster.strength}, ${JSON.stringify(cluster.demographics)}, 
            ${JSON.stringify(cluster.anchorPatterns)}, ${cluster.calculatedAt}, ${expiresAt}
          )
        `;
      }
      
      console.log(`💾 Cached ${clusters.length} clusters for ${this.CACHE_TTL_DAYS} days`);
      
    } catch (error) {
      console.error('Error caching clusters:', error);
    }
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const point1 = turf.point([lng1, lat1]);
    const point2 = turf.point([lng2, lat2]);
    return turf.distance(point1, point2, { units: 'kilometers' });
  }

  /**
   * Get default demographics for fallback
   */
  private getDefaultDemographics(): ClusterDemographics {
    return {
      averageIncome: 50000,
      averagePopulationDensity: 250,
      averageGrowthRate: 1.0,
      dominantAreaClassification: 'suburban',
      populationRange: { min: 50000, max: 300000 },
      incomeRange: { min: 40000, max: 60000 }
    };
  }
}