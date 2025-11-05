import * as turf from '@turf/turf';
import { OSMQueryService, OSMFeature } from './osm-query.service';
import { 
  ExpansionStrategy, 
  StrategyScore, 
  StrategyType, 
  ScoredCell, 
  Store, 
  ExpansionContext,
  StrategyConfig,
  AnchorLocation
} from './types';

export interface AnchorAnalysis {
  anchors: AnchorLocation[];
  totalBoost: number;
  anchorCount: number;
  dominantAnchorType: string;
  isSuperLocation: boolean; // 3+ anchors within 500m
}

export class HighTrafficAnchorStrategy implements ExpansionStrategy {
  private readonly osmService: OSMQueryService;
  
  constructor(osmService: OSMQueryService) {
    this.osmService = osmService;
    console.log('⚓ HighTrafficAnchorStrategy initialized');
  }

  getStrategyName(): string {
    return 'High-Traffic Anchor Strategy';
  }

  validateConfig(config: StrategyConfig): boolean {
    return (
      config.anchorWeight >= 0 &&
      config.anchorWeight <= 1 &&
      config.transportProximityM > 0 &&
      config.educationProximityM > 0 &&
      config.retailProximityM > 0 &&
      config.serviceProximityM > 0
    );
  }

  /**
   * Score based on proximity to high-traffic anchors
   * Implements requirements 5, 6, 7, 8, 9 for anchor proximity scoring
   */
  async scoreCandidate(
    candidate: ScoredCell,
    stores: Store[],
    context: ExpansionContext
  ): Promise<StrategyScore> {
    try {
      const [lat, lng] = [candidate.center[1], candidate.center[0]]; // Convert from [lng, lat] to [lat, lng]
      
      // Find all nearby anchors
      const anchors = await this.findNearbyAnchors(lat, lng, context.config);
      
      // Calculate anchor analysis
      const analysis = this.analyzeAnchors(anchors);
      
      // Calculate composite anchor score
      const anchorScore = this.calculateAnchorScore(analysis.anchors);
      
      // Weight by anchor weight parameter
      const weightedScore = anchorScore * context.config.anchorWeight;
      
      // Generate reasoning text
      const reasoning = this.generateAnchorRationale(analysis);
      
      // Normalize score to 0-100 range
      const normalizedScore = Math.min(100, Math.max(0, weightedScore));
      
      return {
        strategyType: StrategyType.ANCHOR,
        score: normalizedScore,
        confidence: analysis.anchorCount > 0 ? 0.9 : 0.3,
        reasoning,
        metadata: {
          anchorAnalysis: analysis,
          anchorCount: analysis.anchorCount,
          anchors: analysis.anchors,
          dominantAnchorType: analysis.dominantAnchorType,
          isSuperLocation: analysis.isSuperLocation,
          totalBoost: analysis.totalBoost,
          rawAnchorScore: anchorScore,
          weightedScore
        }
      };
      
    } catch (error) {
      console.error('High-traffic anchor strategy error:', error);
      return {
        strategyType: StrategyType.ANCHOR,
        score: 0,
        confidence: 0.1,
        reasoning: 'Error analyzing anchor proximity',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Find all anchors within proximity thresholds
   * Implements requirements 5.1, 6.1, 7.1, 8.1 for finding nearby anchors
   */
  private async findNearbyAnchors(
    lat: number,
    lng: number,
    config: StrategyConfig
  ): Promise<AnchorLocation[]> {
    const anchors: AnchorLocation[] = [];
    
    try {
      // Query transport hubs within proximity threshold (Requirement 5.1)
      const transportFeatures = await this.osmService.getTransportHubs(
        lat, lng, config.transportProximityM
      );
      
      for (const feature of transportFeatures) {
        const distance = this.calculateDistance(lat, lng, feature.lat, feature.lon);
        if (distance <= config.transportProximityM / 1000) { // Convert to km
          anchors.push(this.createAnchorLocation(feature, 'transport', distance));
        }
      }
      
      // Query educational institutions within proximity threshold (Requirement 6.1)
      const educationFeatures = await this.osmService.getEducationalInstitutions(
        lat, lng, config.educationProximityM
      );
      
      for (const feature of educationFeatures) {
        const distance = this.calculateDistance(lat, lng, feature.lat, feature.lon);
        if (distance <= config.educationProximityM / 1000) { // Convert to km
          anchors.push(this.createAnchorLocation(feature, 'education', distance));
        }
      }
      
      // Query retail centers within proximity threshold (Requirement 7.1)
      const retailFeatures = await this.osmService.getRetailCenters(
        lat, lng, config.retailProximityM
      );
      
      for (const feature of retailFeatures) {
        const distance = this.calculateDistance(lat, lng, feature.lat, feature.lon);
        if (distance <= config.retailProximityM / 1000) { // Convert to km
          anchors.push(this.createAnchorLocation(feature, 'retail', distance));
        }
      }
      
      // Query service stations within proximity threshold (Requirement 8.1)
      const serviceFeatures = await this.osmService.getServiceStations(
        lat, lng, config.serviceProximityM
      );
      
      for (const feature of serviceFeatures) {
        const distance = this.calculateDistance(lat, lng, feature.lat, feature.lon);
        if (distance <= config.serviceProximityM / 1000) { // Convert to km
          anchors.push(this.createAnchorLocation(feature, 'service_station', distance));
        }
      }
      
      console.log(`⚓ Found ${anchors.length} anchors near ${lat.toFixed(3)}, ${lng.toFixed(3)}`);
      return anchors;
      
    } catch (error) {
      console.error('Error finding nearby anchors:', error);
      return [];
    }
  }

  /**
   * Create anchor location from OSM feature
   */
  private createAnchorLocation(
    feature: OSMFeature,
    type: 'transport' | 'education' | 'retail' | 'service_station',
    distance: number
  ): AnchorLocation {
    // Determine subtype based on OSM tags
    let subtype = 'unknown';
    if (feature.railway) subtype = `railway_${feature.railway}`;
    else if (feature.public_transport) subtype = `public_transport_${feature.public_transport}`;
    else if (feature.amenity) subtype = `amenity_${feature.amenity}`;
    else if (feature.shop) subtype = `shop_${feature.shop}`;
    else if (feature.highway) subtype = `highway_${feature.highway}`;
    else if (feature.landuse) subtype = `landuse_${feature.landuse}`;
    
    // Estimate size and footfall based on type and tags
    const { size, estimatedFootfall } = this.estimateAnchorSize(feature, type);
    
    // Calculate boost based on type and size
    const boost = this.calculateAnchorBoost(type, size);
    
    return {
      type,
      subtype,
      name: feature.name || `${type}_${feature.id}`,
      lat: feature.lat,
      lng: feature.lon,
      distance: distance * 1000, // Convert back to meters
      size,
      estimatedFootfall,
      boost
    };
  }

  /**
   * Estimate anchor size and footfall
   */
  private estimateAnchorSize(
    feature: OSMFeature,
    type: 'transport' | 'education' | 'retail' | 'service_station'
  ): { size: 'major' | 'medium' | 'minor'; estimatedFootfall: number } {
    // This is a simplified estimation - in reality would use more sophisticated data
    let size: 'major' | 'medium' | 'minor' = 'minor';
    let estimatedFootfall = 1000; // Default
    
    switch (type) {
      case 'transport':
        if (feature.railway === 'station') {
          size = 'major';
          estimatedFootfall = 15000;
        } else if (feature.public_transport === 'station') {
          size = 'medium';
          estimatedFootfall = 8000;
        } else {
          size = 'minor';
          estimatedFootfall = 3000;
        }
        break;
        
      case 'education':
        if (feature.amenity === 'university') {
          size = 'major';
          estimatedFootfall = 20000;
        } else if (feature.amenity === 'college') {
          size = 'medium';
          estimatedFootfall = 8000;
        } else {
          size = 'minor';
          estimatedFootfall = 2000;
        }
        break;
        
      case 'retail':
        if (feature.shop === 'mall' || feature.landuse === 'retail') {
          size = 'major';
          estimatedFootfall = 25000;
        } else if (feature.shop === 'supermarket') {
          size = 'medium';
          estimatedFootfall = 5000;
        } else {
          size = 'minor';
          estimatedFootfall = 2000;
        }
        break;
        
      case 'service_station':
        if (feature.highway === 'services') {
          size = 'major';
          estimatedFootfall = 10000;
        } else {
          size = 'medium';
          estimatedFootfall = 3000;
        }
        break;
    }
    
    return { size, estimatedFootfall };
  }

  /**
   * Calculate anchor boost based on type and size
   * Implements requirements 5.4, 6.4, 7.4, 8.3 for anchor boosts
   */
  private calculateAnchorBoost(
    type: 'transport' | 'education' | 'retail' | 'service_station',
    size: 'major' | 'medium' | 'minor'
  ): number {
    let baseBoost = 0;
    
    // Base boosts by type (from requirements)
    switch (type) {
      case 'transport':
        baseBoost = 15; // +15pts (Requirement 5.4)
        break;
      case 'education':
        baseBoost = 18; // +18pts (Requirement 6.4)
        break;
      case 'retail':
        baseBoost = 12; // +12pts (Requirement 7.4)
        break;
      case 'service_station':
        baseBoost = 20; // +20pts (Requirement 8.3)
        break;
    }
    
    // Size modifiers (Requirements 5.6, 6.5, 7.6)
    switch (size) {
      case 'major':
        return baseBoost * 1.33; // +33% for major anchors
      case 'medium':
        return baseBoost;
      case 'minor':
        return baseBoost * 0.67; // -33% for minor anchors
    }
  }

  /**
   * Analyze anchors and create analysis summary
   */
  private analyzeAnchors(anchors: AnchorLocation[]): AnchorAnalysis {
    const anchorCount = anchors.length;
    
    // Calculate total boost with diminishing returns
    const totalBoost = this.calculateAnchorScore(anchors);
    
    // Find dominant anchor type
    const typeCounts = anchors.reduce((counts, anchor) => {
      counts[anchor.type] = (counts[anchor.type] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    const dominantAnchorType = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';
    
    // Check if this is a super location (3+ anchors within 500m)
    const anchorsWithin500m = anchors.filter(anchor => anchor.distance <= 500);
    const isSuperLocation = anchorsWithin500m.length >= 3;
    
    return {
      anchors,
      totalBoost,
      anchorCount,
      dominantAnchorType,
      isSuperLocation
    };
  }

  /**
   * Calculate composite anchor score with diminishing returns
   * Implements requirement 9.1, 9.2, 9.3 for composite scoring
   */
  private calculateAnchorScore(anchors: AnchorLocation[]): number {
    if (anchors.length === 0) {
      return 0;
    }
    
    // Sort anchors by boost value (highest first)
    const sortedAnchors = [...anchors].sort((a, b) => b.boost - a.boost);
    
    let totalScore = 0;
    
    for (let i = 0; i < sortedAnchors.length; i++) {
      const anchor = sortedAnchors[i];
      let anchorScore = anchor.boost;
      
      // Apply diminishing returns (Requirement 9.2)
      if (i === 1) {
        anchorScore *= 0.8; // 2nd anchor = 80% boost
      } else if (i >= 2) {
        anchorScore *= 0.6; // 3rd+ anchor = 60% boost
      }
      
      totalScore += anchorScore;
    }
    
    // Cap maximum anchor boost at 50 points (Requirement 9.2)
    return Math.min(50, totalScore);
  }

  /**
   * Calculate distance between two points using Turf.js
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const point1 = turf.point([lng1, lat1]);
    const point2 = turf.point([lng2, lat2]);
    return turf.distance(point1, point2, { units: 'kilometers' });
  }

  /**
   * Generate reasoning text highlighting anchor advantages
   * Implements requirement 9.6 for anchor rationale generation
   */
  private generateAnchorRationale(analysis: AnchorAnalysis): string {
    if (analysis.anchorCount === 0) {
      return 'No high-traffic anchors found within proximity thresholds. Limited natural footfall generation.';
    }
    
    let reasoning = `High-traffic anchor analysis: ${analysis.anchorCount} anchor${analysis.anchorCount > 1 ? 's' : ''} found`;
    
    // Highlight super locations (Requirement 9.4)
    if (analysis.isSuperLocation) {
      reasoning += ` (SUPER LOCATION: ${analysis.anchors.filter(a => a.distance <= 500).length} anchors within 500m)`;
    }
    
    // List anchor types and distances
    const anchorSummary = analysis.anchors
      .slice(0, 3) // Show top 3 anchors
      .map(anchor => `${anchor.type} (${anchor.distance}m)`)
      .join(', ');
    
    reasoning += `. Key anchors: ${anchorSummary}`;
    
    if (analysis.anchors.length > 3) {
      reasoning += ` and ${analysis.anchors.length - 3} more`;
    }
    
    // Add dominant anchor type context
    if (analysis.dominantAnchorType !== 'none') {
      reasoning += `. Dominant anchor type: ${analysis.dominantAnchorType}`;
    }
    
    // Add boost information
    reasoning += `. Total anchor boost: ${analysis.totalBoost.toFixed(1)} points`;
    
    // Add multi-anchor advantage context (Requirement 9.6)
    if (analysis.anchorCount > 1) {
      reasoning += ` with diminishing returns applied for multiple anchors`;
    }
    
    // Add strategic context
    if (analysis.isSuperLocation) {
      reasoning += '. Strategic advantage: Multiple complementary footfall generators create synergistic customer attraction';
    } else if (analysis.anchorCount > 0) {
      reasoning += '. Strategic advantage: Natural footfall from nearby high-traffic locations';
    }
    
    return reasoning;
  }
}