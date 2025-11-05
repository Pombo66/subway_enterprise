import * as turf from '@turf/turf';
import { ClusterAnalysisService, PerformanceCluster, ClusterDemographics } from './cluster-analysis.service';
import { 
  ExpansionStrategy, 
  StrategyScore, 
  StrategyType, 
  ScoredCell, 
  Store, 
  ExpansionContext,
  StrategyConfig
} from './types';

export interface ClusterProximityAnalysis {
  nearestCluster: PerformanceCluster | null;
  distanceToCluster: number;
  clusterBoost: number;
  patternMatch: number; // 0-1 similarity to cluster characteristics
  patternMatchReasons: string[];
}

export class PerformanceClusterStrategy implements ExpansionStrategy {
  private readonly clusterAnalyzer: ClusterAnalysisService;
  private clustersCache: Map<string, PerformanceCluster[]> = new Map();
  private cacheTimestamp: Map<string, Date> = new Map();
  private readonly CACHE_TTL_HOURS = 24;
  
  constructor(clusterAnalyzer: ClusterAnalysisService) {
    this.clusterAnalyzer = clusterAnalyzer;
    console.log('🎯 PerformanceClusterStrategy initialized');
  }

  getStrategyName(): string {
    return 'Performance Cluster Strategy';
  }

  validateConfig(config: StrategyConfig): boolean {
    return (
      config.clusterWeight >= 0 &&
      config.clusterWeight <= 1 &&
      config.clusterMinStores > 0 &&
      config.clusterMaxRadiusKm > 0 &&
      config.highPerformerPercentile > 0 &&
      config.highPerformerPercentile <= 100
    );
  }

  /**
   * Score based on proximity to high-performing clusters
   * Implements requirements 11, 12 for cluster proximity and pattern matching
   */
  async scoreCandidate(
    candidate: ScoredCell,
    stores: Store[],
    context: ExpansionContext
  ): Promise<StrategyScore> {
    try {
      const [lat, lng] = [candidate.center[1], candidate.center[0]]; // Convert from [lng, lat] to [lat, lng]
      
      // Get or identify performance clusters
      const clusters = await this.getClusters(stores, context.region);
      
      if (clusters.length === 0) {
        return {
          strategyType: StrategyType.CLUSTER,
          score: 0,
          confidence: 0.3,
          reasoning: 'No high-performing clusters identified in region for pattern analysis',
          metadata: { clusterCount: 0, reason: 'no_clusters' }
        };
      }
      
      // Analyze proximity to clusters
      const proximityAnalysis = this.analyzeClusterProximity(lat, lng, clusters);
      
      // Calculate pattern matching if near a cluster
      if (proximityAnalysis.nearestCluster) {
        proximityAnalysis.patternMatch = await this.calculatePatternMatch(
          candidate, proximityAnalysis.nearestCluster, context
        );
        proximityAnalysis.patternMatchReasons = this.generatePatternMatchReasons(
          proximityAnalysis.nearestCluster, proximityAnalysis.patternMatch
        );
      }
      
      // Calculate base cluster score
      let clusterScore = proximityAnalysis.clusterBoost;
      
      // Apply pattern match bonus (Requirement 12.4)
      if (proximityAnalysis.patternMatch > 0.7) {
        clusterScore *= 1.15; // 15% boost for high pattern match
      }
      
      // Weight by cluster weight parameter
      const weightedScore = clusterScore * context.config.clusterWeight;
      
      // Generate reasoning text
      const reasoning = this.generateClusterRationale(proximityAnalysis);
      
      // Normalize score to 0-100 range
      const normalizedScore = Math.min(100, Math.max(0, weightedScore));
      
      return {
        strategyType: StrategyType.CLUSTER,
        score: normalizedScore,
        confidence: proximityAnalysis.nearestCluster ? 0.8 : 0.3,
        reasoning,
        metadata: {
          clusterProximityAnalysis: proximityAnalysis,
          clusterCount: clusters.length,
          nearestClusterKm: proximityAnalysis.distanceToCluster,
          clusterStrength: proximityAnalysis.nearestCluster?.strength || 0,
          patternMatch: proximityAnalysis.patternMatch,
          patternMatchReasons: proximityAnalysis.patternMatchReasons,
          rawClusterScore: clusterScore,
          weightedScore
        }
      };
      
    } catch (error) {
      console.error('Performance cluster strategy error:', error);
      return {
        strategyType: StrategyType.CLUSTER,
        score: 0,
        confidence: 0.1,
        reasoning: 'Error analyzing cluster proximity',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Get or identify performance clusters for the region
   */
  private async getClusters(stores: Store[], region: any): Promise<PerformanceCluster[]> {
    const regionKey = this.getRegionKey(region);
    
    // Check cache first
    const cached = this.clustersCache.get(regionKey);
    const cacheTime = this.cacheTimestamp.get(regionKey);
    
    if (cached && cacheTime && this.isCacheValid(cacheTime)) {
      return cached;
    }
    
    try {
      // Try to get cached clusters from database
      let clusters = await this.clusterAnalyzer.getCachedClusters(regionKey);
      
      // If no cached clusters, identify new ones
      if (clusters.length === 0) {
        console.log(`🎯 No cached clusters found for ${regionKey}, identifying new clusters...`);
        clusters = await this.clusterAnalyzer.identifyClusters(stores);
      }
      
      // Update cache
      this.clustersCache.set(regionKey, clusters);
      this.cacheTimestamp.set(regionKey, new Date());
      
      return clusters;
      
    } catch (error) {
      console.error('Error getting clusters:', error);
      return [];
    }
  }

  /**
   * Analyze proximity to high-performing clusters
   * Implements requirement 11.1, 11.2 for cluster proximity analysis
   */
  private analyzeClusterProximity(
    lat: number,
    lng: number,
    clusters: PerformanceCluster[]
  ): ClusterProximityAnalysis {
    let nearestCluster: PerformanceCluster | null = null;
    let minDistance = Infinity;
    
    // Find nearest cluster
    for (const cluster of clusters) {
      const distance = this.calculateDistance(
        lat, lng, 
        cluster.centroid[1], cluster.centroid[0]
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestCluster = cluster;
      }
    }
    
    // Calculate cluster proximity boost
    const clusterBoost = nearestCluster 
      ? this.calculateClusterProximityBoost(minDistance, nearestCluster)
      : 0;
    
    return {
      nearestCluster,
      distanceToCluster: minDistance === Infinity ? 1000 : minDistance,
      clusterBoost,
      patternMatch: 0, // Will be calculated later
      patternMatchReasons: []
    };
  }

  /**
   * Apply distance decay from cluster center
   * Implements requirement 11.3, 11.4 for distance decay formula
   */
  private calculateClusterProximityBoost(
    distance: number,
    cluster: PerformanceCluster
  ): number {
    const maxDistance = 10; // 10km maximum influence distance
    
    if (distance > maxDistance) {
      return 0; // No boost beyond 10km
    }
    
    // Base boost varies by cluster strength
    const baseBoost = 30 * cluster.strength; // 0-30 points based on cluster strength
    
    // Apply distance decay: boost = base_boost × (1 - distance/10km) (Requirement 11.3)
    const distanceDecayFactor = 1 - (distance / maxDistance);
    const proximityBoost = baseBoost * distanceDecayFactor;
    
    // Apply minimum and maximum bounds (Requirement 11.4, 11.5)
    const maxBoost = 30; // Maximum 30 points at cluster center
    const minBoost = distance <= maxDistance ? 5 : 0; // Minimum 5 points within 10km
    
    return Math.max(minBoost, Math.min(maxBoost, proximityBoost));
  }

  /**
   * Calculate pattern match score comparing candidate characteristics with cluster patterns
   * Implements requirement 12.3 for pattern matching logic
   */
  private async calculatePatternMatch(
    candidate: ScoredCell,
    cluster: PerformanceCluster,
    context: ExpansionContext
  ): Promise<number> {
    try {
      // This is a simplified pattern matching implementation
      // In a full implementation, this would compare actual demographic and anchor data
      
      let matchScore = 0;
      let totalFactors = 0;
      
      // Factor 1: Geographic similarity (always available)
      // Candidates closer to cluster center have higher pattern match
      const [lat, lng] = [candidate.center[1], candidate.center[0]];
      const distanceToCenter = this.calculateDistance(
        lat, lng, cluster.centroid[1], cluster.centroid[0]
      );
      
      const geographicMatch = Math.max(0, 1 - (distanceToCenter / cluster.radius));
      matchScore += geographicMatch;
      totalFactors++;
      
      // Factor 2: Regional consistency
      // Candidates in the same region as cluster have higher match
      if (context.region?.country && cluster.region === context.region.country) {
        matchScore += 0.8;
      } else {
        matchScore += 0.3; // Partial match for different regions
      }
      totalFactors++;
      
      // Factor 3: Cluster strength influence
      // Stronger clusters provide more reliable patterns
      matchScore += cluster.strength;
      totalFactors++;
      
      // Calculate average match score (0-1)
      const averageMatch = totalFactors > 0 ? matchScore / totalFactors : 0;
      
      return Math.min(1, Math.max(0, averageMatch));
      
    } catch (error) {
      console.error('Error calculating pattern match:', error);
      return 0.5; // Default moderate match
    }
  }

  /**
   * Generate pattern match reasons
   */
  private generatePatternMatchReasons(
    cluster: PerformanceCluster,
    patternMatch: number
  ): string[] {
    const reasons: string[] = [];
    
    if (patternMatch > 0.8) {
      reasons.push('High similarity to successful cluster characteristics');
      reasons.push(`Strong cluster with ${cluster.storeCount} high-performing stores`);
    } else if (patternMatch > 0.6) {
      reasons.push('Moderate similarity to cluster patterns');
      reasons.push(`Cluster strength: ${(cluster.strength * 100).toFixed(0)}%`);
    } else if (patternMatch > 0.3) {
      reasons.push('Some similarity to cluster characteristics');
    } else {
      reasons.push('Limited similarity to existing successful patterns');
    }
    
    // Add demographic context
    if (cluster.demographics.dominantAreaClassification) {
      reasons.push(`Cluster pattern: ${cluster.demographics.dominantAreaClassification} area success`);
    }
    
    // Add anchor pattern context
    if (cluster.anchorPatterns.length > 0) {
      reasons.push(`Common anchors: ${cluster.anchorPatterns.slice(0, 2).join(', ')}`);
    }
    
    return reasons;
  }

  /**
   * Generate reasoning text explaining cluster context
   * Implements requirement 11.6 for cluster rationale generation
   */
  private generateClusterRationale(analysis: ClusterProximityAnalysis): string {
    if (!analysis.nearestCluster) {
      return 'No high-performing clusters identified in region. Limited pattern-based expansion guidance available.';
    }
    
    const cluster = analysis.nearestCluster;
    let reasoning = `Performance cluster analysis: ${analysis.distanceToCluster.toFixed(1)}km from nearest high-performing cluster`;
    
    // Add cluster details
    reasoning += ` (${cluster.storeCount} stores, avg turnover $${cluster.averageTurnover.toLocaleString()}, strength ${(cluster.strength * 100).toFixed(0)}%)`;
    
    // Add proximity context (Requirement 11.6)
    if (analysis.distanceToCluster <= 2) {
      reasoning += '. Excellent proximity to proven success pattern';
    } else if (analysis.distanceToCluster <= 5) {
      reasoning += '. Good proximity to successful cluster corridor';
    } else if (analysis.distanceToCluster <= 10) {
      reasoning += '. Within influence zone of high-performing cluster';
    } else {
      reasoning += '. Beyond primary cluster influence zone';
    }
    
    // Add pattern match context (Requirement 12.5)
    if (analysis.patternMatch > 0.7) {
      reasoning += `. High pattern similarity (${(analysis.patternMatch * 100).toFixed(0)}%) suggests strong replication potential`;
    } else if (analysis.patternMatch > 0.5) {
      reasoning += `. Moderate pattern match (${(analysis.patternMatch * 100).toFixed(0)}%) indicates reasonable success likelihood`;
    } else if (analysis.patternMatch > 0.3) {
      reasoning += `. Limited pattern match (${(analysis.patternMatch * 100).toFixed(0)}%) suggests different market dynamics`;
    }
    
    // Add boost information
    reasoning += `. Cluster proximity boost: ${analysis.clusterBoost.toFixed(1)} points`;
    
    // Add pattern match reasons
    if (analysis.patternMatchReasons.length > 0) {
      reasoning += `. ${analysis.patternMatchReasons[0]}`;
    }
    
    // Add strategic context
    if (analysis.clusterBoost > 20) {
      reasoning += '. Strategic advantage: Mirrors success pattern in high-performing corridor';
    } else if (analysis.clusterBoost > 10) {
      reasoning += '. Strategic opportunity: Extends successful cluster pattern';
    }
    
    return reasoning;
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
   * Get region key for caching
   */
  private getRegionKey(region: any): string {
    if (typeof region === 'string') {
      return region;
    }
    
    if (region?.country) {
      return region.country;
    }
    
    return 'global';
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(cacheTime: Date): boolean {
    const now = new Date();
    const diffHours = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);
    return diffHours < this.CACHE_TTL_HOURS;
  }
}