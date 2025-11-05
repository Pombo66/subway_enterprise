import * as turf from '@turf/turf';
import { AreaClassificationService, AreaClassification } from './area-classification.service';
import { 
  ExpansionStrategy, 
  StrategyScore, 
  StrategyType, 
  ScoredCell, 
  Store, 
  ExpansionContext,
  StrategyConfig
} from './types';

export interface CoverageAnalysis {
  nearestStoreDistance: number;
  areaClassification: 'urban' | 'suburban' | 'rural';
  coverageRadius: number;
  isWhiteSpace: boolean;
  populationInArea: number;
  underservedBoost: number;
}

export class WhiteSpaceStrategy implements ExpansionStrategy {
  private readonly areaClassifier: AreaClassificationService;
  
  constructor(areaClassifier: AreaClassificationService) {
    this.areaClassifier = areaClassifier;
    console.log('🌍 WhiteSpaceStrategy initialized');
  }

  getStrategyName(): string {
    return 'White Space Strategy';
  }

  validateConfig(config: StrategyConfig): boolean {
    return (
      config.urbanCoverageKm > 0 &&
      config.suburbanCoverageKm > 0 &&
      config.ruralCoverageKm > 0 &&
      config.whiteSpaceWeight >= 0 &&
      config.whiteSpaceWeight <= 1
    );
  }

  /**
   * Analyze coverage gaps and boost underserved areas
   */
  async scoreCandidate(
    candidate: ScoredCell,
    stores: Store[],
    context: ExpansionContext
  ): Promise<StrategyScore> {
    try {
      const [lat, lng] = [candidate.center[1], candidate.center[0]]; // Convert from [lng, lat] to [lat, lng]
      
      // Perform coverage analysis
      const coverageAnalysis = await this.analyzeCoverage(lat, lng, stores, context.config);
      
      // Calculate base white space score
      let score = 0;
      let reasoning = '';
      
      if (coverageAnalysis.isWhiteSpace) {
        // Base score for white space areas
        score = 30; // Base white space score
        
        // Apply underserved area boost (Requirements 1.4, 1.5)
        score += coverageAnalysis.underservedBoost;
        
        // Generate detailed reasoning explaining coverage gap and population context
        reasoning = `White space opportunity: ${coverageAnalysis.nearestStoreDistance.toFixed(1)}km from nearest store in ${coverageAnalysis.areaClassification} area (coverage radius: ${coverageAnalysis.coverageRadius}km)`;
        
        if (coverageAnalysis.populationInArea > 10000) {
          reasoning += `. High population municipality (${coverageAnalysis.populationInArea.toLocaleString()}) provides significant market opportunity`;
        }
        
        if (coverageAnalysis.populationInArea > 0) {
          reasoning += `. Population density: ${Math.round(coverageAnalysis.populationInArea / (Math.PI * 5 * 5))} people/km²`;
        }
        
        // Add strategic context
        reasoning += `. Strategic value: Fills coverage gap in ${coverageAnalysis.areaClassification} market with ${coverageAnalysis.underservedBoost.toFixed(1)} point underserved area boost`;
        
      } else {
        // Not white space - lower score based on proximity
        const proximityFactor = coverageAnalysis.nearestStoreDistance / coverageAnalysis.coverageRadius;
        score = Math.max(0, 15 * (1 - proximityFactor));
        
        reasoning = `Covered area: ${coverageAnalysis.nearestStoreDistance.toFixed(1)}km from nearest store (within ${coverageAnalysis.coverageRadius}km ${coverageAnalysis.areaClassification} coverage radius)`;
        
        if (proximityFactor > 0.7) {
          reasoning += `. Near coverage boundary - potential for market expansion`;
        } else {
          reasoning += `. Well-covered market area`;
        }
      }
      
      // Normalize score to 0-100 range
      score = Math.min(100, Math.max(0, score));
      
      return {
        strategyType: StrategyType.WHITE_SPACE,
        score,
        confidence: coverageAnalysis.isWhiteSpace ? 0.9 : 0.7,
        reasoning,
        metadata: {
          coverageAnalysis,
          nearestStoreKm: coverageAnalysis.nearestStoreDistance,
          isWhiteSpace: coverageAnalysis.isWhiteSpace,
          areaClassification: coverageAnalysis.areaClassification,
          populationInArea: coverageAnalysis.populationInArea,
          coverageRadius: coverageAnalysis.coverageRadius,
          underservedBoost: coverageAnalysis.underservedBoost,
          // Include white space classification and nearest store distance in metadata (Requirement 1.6)
          whiteSpaceClassification: coverageAnalysis.isWhiteSpace ? 'white_space' : 'covered',
          nearestStoreDistance: coverageAnalysis.nearestStoreDistance,
          strategicValue: coverageAnalysis.isWhiteSpace ? 'high' : 'medium'
        }
      };
      
    } catch (error) {
      console.error('White space strategy error:', error);
      return {
        strategyType: StrategyType.WHITE_SPACE,
        score: 0,
        confidence: 0.1,
        reasoning: 'Error analyzing white space coverage',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Analyze coverage gaps for a candidate location
   * Implements requirements 1.1, 1.2, 1.3, 1.4 from the specification
   */
  private async analyzeCoverage(
    lat: number,
    lng: number,
    stores: Store[],
    config: StrategyConfig
  ): Promise<CoverageAnalysis> {
    // Classify the area to determine appropriate coverage radius (Requirement 2.1)
    const areaClassification = await this.areaClassifier.classifyArea(lat, lng);
    
    // Get coverage radius based on area classification (Requirements 2.2, 2.3, 2.4)
    const coverageRadius = this.getCoverageRadius(areaClassification, config);
    
    // Calculate distance to nearest existing store using Turf.js (Requirement 1.1)
    const nearestStoreDistance = this.calculateNearestStoreDistance(lat, lng, stores);
    
    // Determine if this is white space (Requirement 1.3)
    // White space = beyond coverage radius from any existing store
    const isWhiteSpace = nearestStoreDistance > coverageRadius;
    
    // Calculate underserved area boost (Requirements 1.4, 1.5)
    const underservedBoost = this.calculateUnderservedBoost({
      nearestStoreDistance,
      areaClassification: areaClassification.classification,
      coverageRadius,
      isWhiteSpace,
      populationInArea: areaClassification.populationInRadius,
      underservedBoost: 0 // Will be calculated
    });
    
    // Log white space opportunities for tracking (Requirement 1.7)
    if (isWhiteSpace) {
      console.log(`🌍 White space opportunity identified: ${lat.toFixed(3)}, ${lng.toFixed(3)} - ${nearestStoreDistance.toFixed(1)}km from nearest store in ${areaClassification.classification} area`);
    }
    
    return {
      nearestStoreDistance,
      areaClassification: areaClassification.classification,
      coverageRadius,
      isWhiteSpace,
      populationInArea: areaClassification.populationInRadius,
      underservedBoost
    };
  }

  /**
   * Calculate coverage radius based on area classification
   * Implements requirements 2.2, 2.3, 2.4 for different coverage radii
   */
  private getCoverageRadius(
    areaClassification: AreaClassification,
    config: StrategyConfig
  ): number {
    switch (areaClassification.classification) {
      case 'urban':
        // Urban areas: 10-15 km coverage radius (Requirement 2.2)
        return config.urbanCoverageKm; // Default 12.5km
      case 'suburban':
        // Suburban areas: 15-20 km coverage radius (Requirement 2.3)
        return config.suburbanCoverageKm; // Default 17.5km
      case 'rural':
        // Rural areas: 25 km coverage radius (Requirement 2.4)
        return config.ruralCoverageKm; // Default 25km
      default:
        return config.suburbanCoverageKm; // Default fallback to suburban
    }
  }

  /**
   * Calculate distance to nearest existing store using Turf.js distance calculation
   * Implements requirement 1.1 for distance calculation to nearest store
   */
  private calculateNearestStoreDistance(
    lat: number,
    lng: number,
    stores: Store[]
  ): number {
    if (stores.length === 0) {
      return Infinity; // No stores = infinite distance (complete white space)
    }

    const candidatePoint = turf.point([lng, lat]);
    let minDistance = Infinity;
    let nearestStore: Store | null = null;

    // Find the nearest store using Turf.js distance calculation
    for (const store of stores) {
      if (store.latitude && store.longitude) {
        const storePoint = turf.point([store.longitude, store.latitude]);
        const distance = turf.distance(candidatePoint, storePoint, { units: 'kilometers' });
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestStore = store;
        }
      }
    }

    // Log the nearest store for debugging
    if (nearestStore && minDistance < Infinity) {
      console.log(`📍 Nearest store to ${lat.toFixed(3)}, ${lng.toFixed(3)}: ${minDistance.toFixed(1)}km (Store ID: ${nearestStore.id})`);
    }

    return minDistance === Infinity ? 1000 : minDistance; // Return large number if no valid stores
  }

  /**
   * Boost score for underserved high-population areas
   * Implements requirements 1.4, 1.5 for white space and population-based boosts
   */
  private calculateUnderservedBoost(analysis: CoverageAnalysis): number {
    let boost = 0;
    let boostReasons: string[] = [];

    if (analysis.isWhiteSpace) {
      // Base white space boost: 20-30% (Requirement 1.4)
      const baseWhiteSpaceBoost = 25; // 25% base boost for white space
      boost += baseWhiteSpaceBoost;
      boostReasons.push(`White space area (+${baseWhiteSpaceBoost} points)`);

      // Additional boost for high-population municipalities (Requirement 1.5)
      if (analysis.populationInArea > 10000) {
        const populationBoost = 15; // Additional 15% boost for population > 10,000
        boost += populationBoost;
        boostReasons.push(`High population municipality (${analysis.populationInArea.toLocaleString()}) (+${populationBoost} points)`);
      }

      // Distance-based boost - further from stores = higher boost
      // More remote white space areas get additional scoring
      const distanceRatio = analysis.nearestStoreDistance / analysis.coverageRadius;
      if (distanceRatio > 1.5) {
        const distanceBoost = Math.min(15, (distanceRatio - 1.0) * 10);
        boost += distanceBoost;
        boostReasons.push(`Remote location (${analysis.nearestStoreDistance.toFixed(1)}km from nearest store) (+${distanceBoost.toFixed(1)} points)`);
      }

      // Area classification bonus
      if (analysis.areaClassification === 'rural') {
        const ruralBoost = 5;
        boost += ruralBoost;
        boostReasons.push(`Rural area expansion opportunity (+${ruralBoost} points)`);
      }

      // Log the boost calculation for transparency
      console.log(`🚀 Underserved area boost calculation: ${boostReasons.join(', ')} = Total +${boost.toFixed(1)} points`);
    } else {
      // Not white space - minimal boost based on distance
      const proximityPenalty = (analysis.nearestStoreDistance / analysis.coverageRadius) * 5;
      boost = Math.max(0, 5 - proximityPenalty);
      
      if (boost > 0) {
        console.log(`📍 Proximity boost: ${boost.toFixed(1)} points for ${analysis.nearestStoreDistance.toFixed(1)}km distance`);
      }
    }

    return Math.min(50, Math.max(0, boost)); // Cap total boost at 50 points, minimum 0
  }
}