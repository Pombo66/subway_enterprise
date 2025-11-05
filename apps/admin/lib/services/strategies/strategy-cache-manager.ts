import { PrismaClient } from '@prisma/client';
import { StrategyScore } from './types';
import { PerformanceCluster } from './cluster-analysis.service';
import { EconomicIndicators } from './demographic-data.service';
import { OSMFeature } from './osm-query.service';
import * as crypto from 'crypto';

export interface CacheStatistics {
  demographicCache: {
    hits: number;
    misses: number;
    hitRate: number;
    totalEntries: number;
    expiredEntries: number;
  };
  osmCache: {
    hits: number;
    misses: number;
    hitRate: number;
    totalEntries: number;
    expiredEntries: number;
  };
  clusterCache: {
    hits: number;
    misses: number;
    hitRate: number;
    totalEntries: number;
    expiredEntries: number;
  };
  strategyCache: {
    hits: number;
    misses: number;
    hitRate: number;
    totalEntries: number;
    expiredEntries: number;
  };
  overall: {
    totalHits: number;
    totalMisses: number;
    overallHitRate: number;
  };
}

export class StrategyCacheManager {
  // Cache layers with different TTLs
  private demographicCacheHits = 0;
  private demographicCacheMisses = 0;
  private osmCacheHits = 0;
  private osmCacheMisses = 0;
  private clusterCacheHits = 0;
  private clusterCacheMisses = 0;
  private strategyCacheHits = 0;
  private strategyCacheMisses = 0;

  private readonly DEMOGRAPHIC_TTL_DAYS = 90;
  private readonly OSM_TTL_DAYS = 30;
  private readonly CLUSTER_TTL_DAYS = 7;
  private readonly STRATEGY_TTL_HOURS = 24;

  constructor(private readonly prisma: PrismaClient) {
    console.log('💾 StrategyCacheManager initialized with multi-layer caching');
  }

  /**
   * Get cached strategy scores
   * Implements requirement 17 for strategy score caching with 24h TTL
   */
  async getCachedScores(coordinateHash: string): Promise<StrategyScore[] | null> {
    try {
      const cached = await this.prisma.$queryRaw<Array<{
        id: string;
        coordinateHash: string;
        whiteSpaceScore: number | null;
        economicScore: number | null;
        anchorScore: number | null;
        clusterScore: number | null;
        strategyBreakdown: string;
        dominantStrategy: string | null;
        expiresAt: Date;
      }>>`
        SELECT id, coordinateHash, whiteSpaceScore, economicScore, anchorScore, 
               clusterScore, strategyBreakdown, dominantStrategy, expiresAt
        FROM StrategyScoringCache 
        WHERE coordinateHash = ${coordinateHash}
        LIMIT 1
      `;

      if (!cached || cached.length === 0) {
        this.strategyCacheMisses++;
        return null;
      }

      const record = cached[0];
      if (record.expiresAt < new Date()) {
        await this.prisma.$executeRaw`DELETE FROM StrategyScoringCache WHERE id = ${record.id}`;
        this.strategyCacheMisses++;
        return null;
      }

      this.strategyCacheHits++;

      // Parse strategy breakdown and reconstruct strategy scores
      const breakdown = JSON.parse(record.strategyBreakdown);
      const scores: StrategyScore[] = [];

      if (record.whiteSpaceScore !== null) {
        scores.push({
          strategyType: 'white_space' as any,
          score: record.whiteSpaceScore,
          confidence: 0.8,
          reasoning: 'Cached white space analysis',
          metadata: breakdown.whiteSpace || {}
        });
      }

      if (record.economicScore !== null) {
        scores.push({
          strategyType: 'economic' as any,
          score: record.economicScore,
          confidence: 0.8,
          reasoning: 'Cached economic analysis',
          metadata: breakdown.economic || {}
        });
      }

      if (record.anchorScore !== null) {
        scores.push({
          strategyType: 'anchor' as any,
          score: record.anchorScore,
          confidence: 0.8,
          reasoning: 'Cached anchor analysis',
          metadata: breakdown.anchors || {}
        });
      }

      if (record.clusterScore !== null) {
        scores.push({
          strategyType: 'cluster' as any,
          score: record.clusterScore,
          confidence: 0.8,
          reasoning: 'Cached cluster analysis',
          metadata: breakdown.clustering || {}
        });
      }

      console.log(`🎯 Cache hit: Retrieved ${scores.length} strategy scores from cache`);
      return scores;

    } catch (error) {
      console.error('Error getting cached strategy scores:', error);
      this.strategyCacheMisses++;
      return null;
    }
  }

  /**
   * Cache strategy scores with appropriate TTL
   * Implements requirement 17 for strategy score caching
   */
  async cacheScores(
    coordinateHash: string,
    lat: number,
    lng: number,
    scores: StrategyScore[]
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.STRATEGY_TTL_HOURS);

      // Extract individual strategy scores
      let whiteSpaceScore: number | null = null;
      let economicScore: number | null = null;
      let anchorScore: number | null = null;
      let clusterScore: number | null = null;
      let dominantStrategy: string | null = null;

      const strategyBreakdown: any = {};

      for (const score of scores) {
        switch (score.strategyType) {
          case 'white_space':
            whiteSpaceScore = score.score;
            strategyBreakdown.whiteSpace = score.metadata;
            break;
          case 'economic':
            economicScore = score.score;
            strategyBreakdown.economic = score.metadata;
            break;
          case 'anchor':
            anchorScore = score.score;
            strategyBreakdown.anchors = score.metadata;
            break;
          case 'cluster':
            clusterScore = score.score;
            strategyBreakdown.clustering = score.metadata;
            break;
        }
      }

      // Determine dominant strategy
      const sortedScores = [...scores].sort((a, b) => b.score - a.score);
      dominantStrategy = sortedScores[0]?.strategyType || null;

      await this.prisma.$executeRaw`
        INSERT INTO StrategyScoringCache (
          id, coordinateHash, lat, lng, whiteSpaceScore, economicScore, 
          anchorScore, clusterScore, strategyBreakdown, dominantStrategy, createdAt, expiresAt
        ) VALUES (
          ${crypto.randomUUID()}, ${coordinateHash}, ${lat}, ${lng}, ${whiteSpaceScore}, 
          ${economicScore}, ${anchorScore}, ${clusterScore}, ${JSON.stringify(strategyBreakdown)}, 
          ${dominantStrategy}, ${new Date()}, ${expiresAt}
        )
      `;

      console.log(`💾 Cached ${scores.length} strategy scores for ${this.STRATEGY_TTL_HOURS} hours`);

    } catch (error) {
      console.error('Error caching strategy scores:', error);
    }
  }

  /**
   * Get cached demographic data
   * Implements requirement 15 for demographic caching with 90d TTL
   */
  async getCachedDemographicData(coordinateHash: string): Promise<EconomicIndicators | null> {
    try {
      const cached = await this.prisma.$queryRaw<Array<{
        id: string;
        coordinateHash: string;
        population: number | null;
        populationGrowthRate: number | null;
        medianIncome: number | null;
        nationalMedianIncome: number | null;
        incomeIndex: number | null;
        dataSource: string;
        expiresAt: Date;
      }>>`
        SELECT id, coordinateHash, population, populationGrowthRate, medianIncome, 
               nationalMedianIncome, incomeIndex, dataSource, expiresAt
        FROM DemographicCache 
        WHERE coordinateHash = ${coordinateHash}
        LIMIT 1
      `;

      if (!cached || cached.length === 0) {
        this.demographicCacheMisses++;
        return null;
      }

      const record = cached[0];
      if (record.expiresAt < new Date()) {
        await this.prisma.$executeRaw`DELETE FROM DemographicCache WHERE id = ${record.id}`;
        this.demographicCacheMisses++;
        return null;
      }

      this.demographicCacheHits++;

      // Reconstruct economic indicators
      const population = record.population || 0;
      const growthRate = record.populationGrowthRate || 0;
      const medianIncome = record.medianIncome || 50000;
      const nationalMedianIncome = record.nationalMedianIncome || 50000;
      const incomeIndex = record.incomeIndex || 1.0;

      return {
        population,
        populationGrowthRate: growthRate,
        medianIncome,
        nationalMedianIncome,
        incomeIndex,
        economicScore: population * (1 + growthRate / 100) * incomeIndex,
        growthTrajectory: this.classifyGrowthTrajectory(growthRate),
        dataCompleteness: 0.8,
        dataSource: record.dataSource as 'csv' | 'api' | 'estimated'
      };

    } catch (error) {
      console.error('Error getting cached demographic data:', error);
      this.demographicCacheMisses++;
      return null;
    }
  }

  /**
   * Get cached OSM data
   * Implements requirement 16 for OSM caching with 30d TTL
   */
  async getCachedOSMData(coordinateHash: string): Promise<OSMFeature[] | null> {
    try {
      const cached = await this.prisma.$queryRaw<Array<{
        id: string;
        coordinateHash: string;
        features: string;
        featureCount: number;
        expiresAt: Date;
      }>>`
        SELECT id, coordinateHash, features, featureCount, expiresAt
        FROM OSMPOICache 
        WHERE coordinateHash = ${coordinateHash}
        LIMIT 1
      `;

      if (!cached || cached.length === 0) {
        this.osmCacheMisses++;
        return null;
      }

      const record = cached[0];
      if (record.expiresAt < new Date()) {
        await this.prisma.$executeRaw`DELETE FROM OSMPOICache WHERE id = ${record.id}`;
        this.osmCacheMisses++;
        return null;
      }

      this.osmCacheHits++;

      const features = JSON.parse(record.features) as OSMFeature[];
      console.log(`🗺️ Cache hit: Retrieved ${features.length} OSM features from cache`);
      return features;

    } catch (error) {
      console.error('Error getting cached OSM data:', error);
      this.osmCacheMisses++;
      return null;
    }
  }

  /**
   * Get cached cluster data
   * Implements requirement 17 for cluster caching with 7d TTL
   */
  async getCachedClusters(region: string): Promise<PerformanceCluster[] | null> {
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
        this.clusterCacheMisses++;
        return null;
      }

      this.clusterCacheHits++;

      const clusters: PerformanceCluster[] = [];
      
      for (const record of cached) {
        try {
          const storeIds = JSON.parse(record.storeIds) as string[];
          const demographics = JSON.parse(record.demographics);
          const anchorPatterns = JSON.parse(record.anchorPatterns) as string[];
          
          clusters.push({
            id: record.id,
            centroid: [record.centroidLng, record.centroidLat],
            radius: record.radius,
            stores: storeIds.map(id => ({ id, latitude: record.centroidLat, longitude: record.centroidLng })),
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
      
      console.log(`🎯 Cache hit: Retrieved ${clusters.length} clusters for region ${region}`);
      return clusters;

    } catch (error) {
      console.error('Error getting cached clusters:', error);
      this.clusterCacheMisses++;
      return null;
    }
  }

  /**
   * Clean up expired cache entries
   * Implements requirement 17 for cache maintenance
   */
  async cleanupExpiredEntries(): Promise<void> {
    try {
      const now = new Date();
      
      // Clean up expired demographic cache entries
      const demographicDeleted = await this.prisma.$executeRaw`
        DELETE FROM DemographicCache WHERE expiresAt < ${now}
      `;
      
      // Clean up expired OSM cache entries
      const osmDeleted = await this.prisma.$executeRaw`
        DELETE FROM OSMPOICache WHERE expiresAt < ${now}
      `;
      
      // Clean up expired cluster cache entries
      const clusterDeleted = await this.prisma.$executeRaw`
        DELETE FROM PerformanceCluster WHERE expiresAt < ${now}
      `;
      
      // Clean up expired strategy cache entries
      const strategyDeleted = await this.prisma.$executeRaw`
        DELETE FROM StrategyScoringCache WHERE expiresAt < ${now}
      `;
      
      console.log(`🧹 Cache cleanup completed: ${demographicDeleted} demographic, ${osmDeleted} OSM, ${clusterDeleted} cluster, ${strategyDeleted} strategy entries removed`);
      
    } catch (error) {
      console.error('Error cleaning up expired cache entries:', error);
    }
  }

  /**
   * Get comprehensive cache statistics
   * Implements requirement 17 for cache statistics tracking
   */
  async getCacheStatistics(): Promise<CacheStatistics> {
    try {
      // Get cache entry counts
      const [demographicCount] = await this.prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*) as count FROM DemographicCache
      `;
      
      const [demographicExpired] = await this.prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*) as count FROM DemographicCache WHERE expiresAt < ${new Date()}
      `;
      
      const [osmCount] = await this.prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*) as count FROM OSMPOICache
      `;
      
      const [osmExpired] = await this.prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*) as count FROM OSMPOICache WHERE expiresAt < ${new Date()}
      `;
      
      const [clusterCount] = await this.prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*) as count FROM PerformanceCluster
      `;
      
      const [clusterExpired] = await this.prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*) as count FROM PerformanceCluster WHERE expiresAt < ${new Date()}
      `;
      
      const [strategyCount] = await this.prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*) as count FROM StrategyScoringCache
      `;
      
      const [strategyExpired] = await this.prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*) as count FROM StrategyScoringCache WHERE expiresAt < ${new Date()}
      `;

      // Calculate hit rates
      const demographicTotal = this.demographicCacheHits + this.demographicCacheMisses;
      const demographicHitRate = demographicTotal > 0 ? (this.demographicCacheHits / demographicTotal) * 100 : 0;
      
      const osmTotal = this.osmCacheHits + this.osmCacheMisses;
      const osmHitRate = osmTotal > 0 ? (this.osmCacheHits / osmTotal) * 100 : 0;
      
      const clusterTotal = this.clusterCacheHits + this.clusterCacheMisses;
      const clusterHitRate = clusterTotal > 0 ? (this.clusterCacheHits / clusterTotal) * 100 : 0;
      
      const strategyTotal = this.strategyCacheHits + this.strategyCacheMisses;
      const strategyHitRate = strategyTotal > 0 ? (this.strategyCacheHits / strategyTotal) * 100 : 0;
      
      const totalHits = this.demographicCacheHits + this.osmCacheHits + this.clusterCacheHits + this.strategyCacheHits;
      const totalMisses = this.demographicCacheMisses + this.osmCacheMisses + this.clusterCacheMisses + this.strategyCacheMisses;
      const overallTotal = totalHits + totalMisses;
      const overallHitRate = overallTotal > 0 ? (totalHits / overallTotal) * 100 : 0;

      return {
        demographicCache: {
          hits: this.demographicCacheHits,
          misses: this.demographicCacheMisses,
          hitRate: Math.round(demographicHitRate * 100) / 100,
          totalEntries: demographicCount.count,
          expiredEntries: demographicExpired.count
        },
        osmCache: {
          hits: this.osmCacheHits,
          misses: this.osmCacheMisses,
          hitRate: Math.round(osmHitRate * 100) / 100,
          totalEntries: osmCount.count,
          expiredEntries: osmExpired.count
        },
        clusterCache: {
          hits: this.clusterCacheHits,
          misses: this.clusterCacheMisses,
          hitRate: Math.round(clusterHitRate * 100) / 100,
          totalEntries: clusterCount.count,
          expiredEntries: clusterExpired.count
        },
        strategyCache: {
          hits: this.strategyCacheHits,
          misses: this.strategyCacheMisses,
          hitRate: Math.round(strategyHitRate * 100) / 100,
          totalEntries: strategyCount.count,
          expiredEntries: strategyExpired.count
        },
        overall: {
          totalHits,
          totalMisses,
          overallHitRate: Math.round(overallHitRate * 100) / 100
        }
      };

    } catch (error) {
      console.error('Error getting cache statistics:', error);
      throw error;
    }
  }

  /**
   * Reset cache statistics
   */
  resetCacheStats(): void {
    this.demographicCacheHits = 0;
    this.demographicCacheMisses = 0;
    this.osmCacheHits = 0;
    this.osmCacheMisses = 0;
    this.clusterCacheHits = 0;
    this.clusterCacheMisses = 0;
    this.strategyCacheHits = 0;
    this.strategyCacheMisses = 0;
    console.log('📊 Cache statistics reset');
  }

  /**
   * Classify growth trajectory from growth rate
   */
  private classifyGrowthTrajectory(growthRate: number): 'high_growth' | 'moderate_growth' | 'stable' | 'declining' {
    if (growthRate > 2.0) {
      return 'high_growth';
    } else if (growthRate > 0) {
      return 'moderate_growth';
    } else if (growthRate >= -0.5) {
      return 'stable';
    } else {
      return 'declining';
    }
  }
}