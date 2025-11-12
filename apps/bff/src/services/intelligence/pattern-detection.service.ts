import { Injectable } from '@nestjs/common';
import {
  Location,
  AlternativeLocation
} from '../../types/intelligence.types';
import { Prisma } from '@prisma/client';

type Store = Prisma.StoreGetPayload<{}>;

interface GeometricPattern {
  type: 'grid' | 'linear' | 'radial' | 'cluster';
  confidence: number; // 0-1
  locations: Location[];
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface PatternAnalysis {
  detectedPatterns: GeometricPattern[];
  overallPatternScore: number; // 0-1 (higher = more geometric/artificial)
  recommendations: string[];
  alternativeSpacing: AlternativeLocation[];
}

interface NaturalBarrier {
  type: 'river' | 'highway' | 'mountain' | 'park' | 'industrial_zone';
  coordinates: Location[];
  influence: number; // 0-1 how much it affects location placement
}

interface TransportationNetwork {
  type: 'highway' | 'major_road' | 'transit_line' | 'pedestrian_corridor';
  coordinates: Location[];
  importance: number; // 0-1 importance for location placement
  accessibilityBonus: number; // 0-1 accessibility improvement
}

@Injectable()
export class PatternDetectionService {
  private readonly MIN_LOCATIONS_FOR_PATTERN = 3;
  private readonly GRID_TOLERANCE = 0.001; // degrees (~100m)
  private readonly LINEAR_TOLERANCE = 0.0005; // degrees (~50m)
  private readonly CLUSTER_RADIUS = 0.01; // degrees (~1km)

  async analyzeLocationPatterns(
    existingStores: Store[],
    proposedLocation: Location,
    analysisRadius: number = 10000 // meters
  ): Promise<PatternAnalysis> {
    console.info('Analyzing location patterns', {
      existingStoreCount: existingStores.length,
      proposedLocation,
      analysisRadius
    });

    try {
      // Convert stores to locations within analysis radius
      const nearbyLocations = this.filterLocationsByRadius(
        existingStores
          .filter(store => store.latitude !== null && store.longitude !== null)
          .map(store => ({ 
            lat: store.latitude!, 
            lng: store.longitude!, 
            country: store.country || 'US' 
          })),
        proposedLocation,
        analysisRadius
      );

      if (nearbyLocations.length < this.MIN_LOCATIONS_FOR_PATTERN) {
        return {
          detectedPatterns: [],
          overallPatternScore: 0,
          recommendations: ['Insufficient nearby locations for pattern analysis'],
          alternativeSpacing: []
        };
      }

      // Detect different types of geometric patterns
      const gridPatterns = await this.detectGridPatterns(nearbyLocations);
      const linearPatterns = await this.detectLinearPatterns(nearbyLocations);
      const radialPatterns = await this.detectRadialPatterns(nearbyLocations);
      const clusterPatterns = await this.detectClusterPatterns(nearbyLocations);

      const detectedPatterns = [
        ...gridPatterns,
        ...linearPatterns,
        ...radialPatterns,
        ...clusterPatterns
      ];

      // Calculate overall pattern score
      const overallPatternScore = this.calculateOverallPatternScore(detectedPatterns);

      // Generate recommendations based on detected patterns
      const recommendations = this.generatePatternRecommendations(detectedPatterns, overallPatternScore);

      // Generate alternative spacing suggestions
      const alternativeSpacing = await this.generateAlternativeSpacing(
        nearbyLocations,
        proposedLocation,
        detectedPatterns
      );

      return {
        detectedPatterns,
        overallPatternScore,
        recommendations,
        alternativeSpacing
      };
    } catch (error) {
      console.error('Failed to analyze location patterns:', error);
      throw new Error(`Pattern analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async considerNaturalBarriers(
    proposedLocation: Location,
    existingLocations: Location[],
    radius: number = 5000
  ): Promise<{
    barriers: NaturalBarrier[];
    adjustedLocation?: Location;
    reasoning: string[];
  }> {
    console.info('Considering natural barriers for location placement', {
      proposedLocation,
      existingLocationCount: existingLocations.length,
      radius
    });

    try {
      // In a real implementation, this would use geographic APIs to identify actual barriers
      // For now, we'll simulate barrier detection based on location patterns
      
      const barriers = await this.identifyNaturalBarriers(proposedLocation, radius);
      const transportationNetworks = await this.identifyTransportationNetworks(proposedLocation, radius);
      
      let adjustedLocation: Location | undefined;
      const reasoning: string[] = [];

      // Analyze if barriers create natural spacing
      if (barriers.length > 0) {
        reasoning.push(`Identified ${barriers.length} natural barriers that create organic location spacing`);
        
        // Check if proposed location respects natural barriers
        const barrierInfluence = this.calculateBarrierInfluence(proposedLocation, barriers);
        
        if (barrierInfluence > 0.7) {
          reasoning.push('Location naturally separated by geographic barriers, reducing artificial pattern concerns');
        } else if (barrierInfluence > 0.3) {
          reasoning.push('Moderate natural separation exists, consider enhancing with strategic positioning');
          adjustedLocation = this.adjustLocationForBarriers(proposedLocation, barriers);
        } else {
          reasoning.push('Limited natural separation, recommend strategic spacing to avoid geometric patterns');
          adjustedLocation = this.adjustLocationForBarriers(proposedLocation, barriers);
        }
      }

      // Consider transportation network influence
      if (transportationNetworks.length > 0) {
        reasoning.push(`Transportation networks provide natural location justification`);
        
        const networkAlignment = this.calculateNetworkAlignment(proposedLocation, transportationNetworks);
        if (networkAlignment > 0.6) {
          reasoning.push('Location aligns well with transportation infrastructure, justifying placement');
        }
      }

      return {
        barriers,
        adjustedLocation,
        reasoning
      };
    } catch (error) {
      console.error('Failed to consider natural barriers:', error);
      return {
        barriers: [],
        reasoning: ['Unable to analyze natural barriers, proceed with standard spacing analysis']
      };
    }
  }

  async generateNaturalSpacingVariation(
    baseLocations: Location[],
    targetDensity: number = 0.5 // 0-1, lower = more spread out
  ): Promise<{
    adjustedLocations: Location[];
    spacingStrategy: string;
    naturalness: number; // 0-1, higher = more natural looking
  }> {
    console.info('Generating natural spacing variation', {
      baseLocationCount: baseLocations.length,
      targetDensity
    });

    try {
      if (baseLocations.length === 0) {
        return {
          adjustedLocations: [],
          spacingStrategy: 'No locations to adjust',
          naturalness: 1.0
        };
      }

      // Apply natural variation algorithms
      const adjustedLocations = await this.applyNaturalVariation(baseLocations, targetDensity);
      
      // Determine spacing strategy based on density and patterns
      let spacingStrategy: string;
      if (targetDensity > 0.7) {
        spacingStrategy = 'High-density organic clustering with natural variation';
      } else if (targetDensity > 0.4) {
        spacingStrategy = 'Moderate spacing with transportation network alignment';
      } else {
        spacingStrategy = 'Wide spacing following natural geographic features';
      }

      // Calculate naturalness score
      const naturalness = this.calculateNaturalnessScore(adjustedLocations, baseLocations);

      return {
        adjustedLocations,
        spacingStrategy,
        naturalness
      };
    } catch (error) {
      console.error('Failed to generate natural spacing variation:', error);
      return {
        adjustedLocations: baseLocations,
        spacingStrategy: 'Standard spacing (variation generation failed)',
        naturalness: 0.5
      };
    }
  }

  // Private helper methods for pattern detection
  private async detectGridPatterns(locations: Location[]): Promise<GeometricPattern[]> {
    const patterns: GeometricPattern[] = [];
    
    if (locations.length < 4) return patterns; // Need at least 4 points for a grid
    
    // Sort locations by latitude, then longitude
    const sortedLocs = [...locations].sort((a, b) => a.lat - b.lat || a.lng - b.lng);
    
    // Look for regular spacing in both dimensions
    const latSpacings = this.calculateSpacings(sortedLocs.map(l => l.lat));
    const lngSpacings = this.calculateSpacings(sortedLocs.map(l => l.lng));
    
    const latRegularity = this.calculateRegularity(latSpacings);
    const lngRegularity = this.calculateRegularity(lngSpacings);
    
    if (latRegularity > 0.7 && lngRegularity > 0.7) {
      patterns.push({
        type: 'grid',
        confidence: (latRegularity + lngRegularity) / 2,
        locations: sortedLocs,
        description: `Regular grid pattern detected with ${latRegularity.toFixed(2)} lat regularity and ${lngRegularity.toFixed(2)} lng regularity`,
        severity: latRegularity > 0.9 && lngRegularity > 0.9 ? 'HIGH' : 'MEDIUM'
      });
    }
    
    return patterns;
  }

  private async detectLinearPatterns(locations: Location[]): Promise<GeometricPattern[]> {
    const patterns: GeometricPattern[] = [];
    
    if (locations.length < 3) return patterns;
    
    // Check for locations that fall on straight lines
    for (let i = 0; i < locations.length - 2; i++) {
      for (let j = i + 1; j < locations.length - 1; j++) {
        for (let k = j + 1; k < locations.length; k++) {
          const linearity = this.calculateLinearity(locations[i], locations[j], locations[k]);
          
          if (linearity > 0.8) {
            const patternLocs = [locations[i], locations[j], locations[k]];
            
            // Check if more locations fall on this line
            const extendedLine = this.extendLinearPattern(patternLocs, locations);
            
            if (extendedLine.length >= 3) {
              patterns.push({
                type: 'linear',
                confidence: linearity,
                locations: extendedLine,
                description: `Linear pattern detected with ${extendedLine.length} locations`,
                severity: extendedLine.length > 4 ? 'HIGH' : 'MEDIUM'
              });
            }
          }
        }
      }
    }
    
    return patterns;
  }

  private async detectRadialPatterns(locations: Location[]): Promise<GeometricPattern[]> {
    const patterns: GeometricPattern[] = [];
    
    if (locations.length < 4) return patterns;
    
    // Look for locations arranged in circles or arcs around central points
    for (let centerIdx = 0; centerIdx < locations.length; centerIdx++) {
      const center = locations[centerIdx];
      const otherLocs = locations.filter((_, idx) => idx !== centerIdx);
      
      const distances = otherLocs.map(loc => this.calculateDistance(center, loc));
      const distanceRegularity = this.calculateRegularity(distances);
      
      if (distanceRegularity > 0.7 && distances.length >= 3) {
        patterns.push({
          type: 'radial',
          confidence: distanceRegularity,
          locations: [center, ...otherLocs],
          description: `Radial pattern detected around center point with ${distanceRegularity.toFixed(2)} distance regularity`,
          severity: distanceRegularity > 0.9 ? 'HIGH' : 'MEDIUM'
        });
      }
    }
    
    return patterns;
  }

  private async detectClusterPatterns(locations: Location[]): Promise<GeometricPattern[]> {
    const patterns: GeometricPattern[] = [];
    
    if (locations.length < 3) return patterns;
    
    // Use simple clustering to identify tight groups
    const clusters = this.performSimpleClustering(locations, this.CLUSTER_RADIUS);
    
    for (const cluster of clusters) {
      if (cluster.length >= 3) {
        const compactness = this.calculateClusterCompactness(cluster);
        
        if (compactness > 0.6) {
          patterns.push({
            type: 'cluster',
            confidence: compactness,
            locations: cluster,
            description: `Tight cluster of ${cluster.length} locations detected`,
            severity: cluster.length > 5 ? 'HIGH' : 'MEDIUM'
          });
        }
      }
    }
    
    return patterns;
  }

  private calculateOverallPatternScore(patterns: GeometricPattern[]): number {
    if (patterns.length === 0) return 0;
    
    // Weight patterns by severity and confidence
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const pattern of patterns) {
      let weight = 1;
      if (pattern.severity === 'HIGH') weight = 3;
      else if (pattern.severity === 'MEDIUM') weight = 2;
      
      totalScore += pattern.confidence * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private generatePatternRecommendations(
    patterns: GeometricPattern[],
    overallScore: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (overallScore > 0.8) {
      recommendations.push('Strong geometric patterns detected - consider significant location adjustment to create more natural distribution');
    } else if (overallScore > 0.6) {
      recommendations.push('Moderate geometric patterns detected - minor location adjustments recommended');
    } else if (overallScore > 0.3) {
      recommendations.push('Some geometric tendencies detected - consider natural spacing variation');
    } else {
      recommendations.push('No significant geometric patterns detected - current distribution appears natural');
    }
    
    // Pattern-specific recommendations
    for (const pattern of patterns) {
      switch (pattern.type) {
        case 'grid':
          recommendations.push('Grid pattern detected - introduce irregular spacing to create more organic appearance');
          break;
        case 'linear':
          recommendations.push('Linear arrangement detected - consider staggered positioning to break straight lines');
          break;
        case 'radial':
          recommendations.push('Radial pattern detected - vary distances from center point to create natural variation');
          break;
        case 'cluster':
          recommendations.push('Tight clustering detected - consider spreading locations to improve market coverage');
          break;
      }
    }
    
    return recommendations;
  }

  private async generateAlternativeSpacing(
    nearbyLocations: Location[],
    proposedLocation: Location,
    patterns: GeometricPattern[]
  ): Promise<AlternativeLocation[]> {
    const alternatives: AlternativeLocation[] = [];
    
    if (patterns.length === 0) return alternatives;
    
    // Generate alternatives based on detected patterns
    for (const pattern of patterns) {
      const alternative = await this.generatePatternBreakingAlternative(
        proposedLocation,
        pattern,
        nearbyLocations
      );
      
      if (alternative) {
        alternatives.push(alternative);
      }
    }
    
    return alternatives.slice(0, 3); // Return top 3 alternatives
  }

  private async generatePatternBreakingAlternative(
    proposedLocation: Location,
    pattern: GeometricPattern,
    nearbyLocations: Location[]
  ): Promise<AlternativeLocation | null> {
    let adjustedLat = proposedLocation.lat;
    let adjustedLng = proposedLocation.lng;
    
    switch (pattern.type) {
      case 'grid':
        // Add irregular offset to break grid pattern
        adjustedLat += (Math.random() - 0.5) * 0.002; // ~200m variation
        adjustedLng += (Math.random() - 0.5) * 0.002;
        break;
        
      case 'linear':
        // Move perpendicular to the detected line
        const lineDirection = this.calculateLineDirection(pattern.locations);
        const perpendicular = this.getPerpendicularDirection(lineDirection);
        adjustedLat += perpendicular.lat * 0.001; // ~100m offset
        adjustedLng += perpendicular.lng * 0.001;
        break;
        
      case 'radial':
        // Vary the distance from center
        const center = this.calculateCentroid(pattern.locations);
        const currentDistance = this.calculateDistance(proposedLocation, center);
        const variation = (Math.random() - 0.5) * 0.3; // ±30% variation
        const newDistance = currentDistance * (1 + variation);
        const direction = this.calculateDirection(center, proposedLocation);
        adjustedLat = center.lat + Math.cos(direction) * newDistance / 111000; // Convert to degrees
        adjustedLng = center.lng + Math.sin(direction) * newDistance / (111000 * Math.cos(center.lat * Math.PI / 180));
        break;
        
      case 'cluster':
        // Move away from cluster center
        const clusterCenter = this.calculateCentroid(pattern.locations);
        const awayDirection = this.calculateDirection(clusterCenter, proposedLocation);
        adjustedLat += Math.cos(awayDirection) * 0.002; // ~200m away
        adjustedLng += Math.sin(awayDirection) * 0.002;
        break;
    }
    
    const distance = this.calculateDistance(proposedLocation, { lat: adjustedLat, lng: adjustedLng, country: 'US' });
    
    return {
      lat: adjustedLat,
      lng: adjustedLng,
      distance,
      improvementScore: Math.min(0.9, pattern.confidence * 0.8), // Improvement based on pattern strength
      reasons: [`Breaks ${pattern.type} pattern`, 'Creates more natural distribution'],
      viabilityScore: 0.7 // Assume reasonable viability for pattern-breaking alternatives
    };
  }

  // Utility methods for natural barriers and transportation networks
  private async identifyNaturalBarriers(location: Location, radius: number): Promise<NaturalBarrier[]> {
    // Simulate natural barrier detection
    // In reality, this would use geographic APIs like OpenStreetMap or Google Maps
    
    const barriers: NaturalBarrier[] = [];
    
    // Simulate some barriers based on location
    if (Math.random() > 0.7) { // 30% chance of river
      barriers.push({
        type: 'river',
        coordinates: this.generateBarrierCoordinates(location, 'river'),
        influence: 0.8
      });
    }
    
    if (Math.random() > 0.8) { // 20% chance of highway
      barriers.push({
        type: 'highway',
        coordinates: this.generateBarrierCoordinates(location, 'highway'),
        influence: 0.6
      });
    }
    
    return barriers;
  }

  private async identifyTransportationNetworks(location: Location, radius: number): Promise<TransportationNetwork[]> {
    // Simulate transportation network detection
    const networks: TransportationNetwork[] = [];
    
    // Most locations have some road access
    networks.push({
      type: 'major_road',
      coordinates: this.generateNetworkCoordinates(location, 'road'),
      importance: 0.7,
      accessibilityBonus: 0.3
    });
    
    // Urban areas more likely to have transit
    if (Math.random() > 0.6) { // 40% chance of transit
      networks.push({
        type: 'transit_line',
        coordinates: this.generateNetworkCoordinates(location, 'transit'),
        importance: 0.9,
        accessibilityBonus: 0.5
      });
    }
    
    return networks;
  }

  // Utility calculation methods
  private filterLocationsByRadius(locations: Location[], center: Location, radius: number): Location[] {
    return locations.filter(loc => {
      const distance = this.calculateDistance(center, loc);
      return distance <= radius;
    });
  }

  private calculateDistance(loc1: Location, loc2: Location): number {
    // Haversine formula for distance calculation
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = loc1.lat * Math.PI / 180;
    const lat2Rad = loc2.lat * Math.PI / 180;
    const deltaLatRad = (loc2.lat - loc1.lat) * Math.PI / 180;
    const deltaLngRad = (loc2.lng - loc1.lng) * Math.PI / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private calculateSpacings(values: number[]): number[] {
    const spacings: number[] = [];
    for (let i = 1; i < values.length; i++) {
      spacings.push(Math.abs(values[i] - values[i - 1]));
    }
    return spacings;
  }

  private calculateRegularity(spacings: number[]): number {
    if (spacings.length < 2) return 0;
    
    const mean = spacings.reduce((sum, s) => sum + s, 0) / spacings.length;
    const variance = spacings.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / spacings.length;
    const stdDev = Math.sqrt(variance);
    
    // Regularity is inverse of coefficient of variation
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
    return Math.max(0, 1 - coefficientOfVariation);
  }

  private calculateLinearity(p1: Location, p2: Location, p3: Location): number {
    // Calculate how close three points are to forming a straight line
    const d12 = this.calculateDistance(p1, p2);
    const d23 = this.calculateDistance(p2, p3);
    const d13 = this.calculateDistance(p1, p3);
    
    // For a perfect line, d13 should equal d12 + d23
    const expectedDistance = d12 + d23;
    const actualDistance = d13;
    
    if (expectedDistance === 0) return 0;
    
    const linearity = 1 - Math.abs(expectedDistance - actualDistance) / expectedDistance;
    return Math.max(0, linearity);
  }

  private extendLinearPattern(baseLine: Location[], allLocations: Location[]): Location[] {
    const extended = [...baseLine];
    
    for (const loc of allLocations) {
      if (!baseLine.includes(loc)) {
        // Check if this location fits the line pattern
        let fitsPattern = false;
        for (let i = 0; i < baseLine.length - 1; i++) {
          const linearity = this.calculateLinearity(baseLine[i], baseLine[i + 1], loc);
          if (linearity > 0.8) {
            fitsPattern = true;
            break;
          }
        }
        
        if (fitsPattern) {
          extended.push(loc);
        }
      }
    }
    
    return extended;
  }

  private performSimpleClustering(locations: Location[], radius: number): Location[][] {
    const clusters: Location[][] = [];
    const visited = new Set<number>();
    
    for (let i = 0; i < locations.length; i++) {
      if (visited.has(i)) continue;
      
      const cluster: Location[] = [locations[i]];
      visited.add(i);
      
      for (let j = i + 1; j < locations.length; j++) {
        if (visited.has(j)) continue;
        
        const distance = this.calculateDistance(locations[i], locations[j]);
        if (distance <= radius * 111000) { // Convert degrees to meters approximation
          cluster.push(locations[j]);
          visited.add(j);
        }
      }
      
      clusters.push(cluster);
    }
    
    return clusters;
  }

  private calculateClusterCompactness(cluster: Location[]): number {
    if (cluster.length < 2) return 1;
    
    const center = this.calculateCentroid(cluster);
    const distances = cluster.map(loc => this.calculateDistance(center, loc));
    const maxDistance = Math.max(...distances);
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    
    // Compactness is inverse of distance variation
    return maxDistance > 0 ? 1 - (avgDistance / maxDistance) : 1;
  }

  private calculateCentroid(locations: Location[]): Location {
    const avgLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
    const avgLng = locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length;
    
    return { lat: avgLat, lng: avgLng, country: 'US' };
  }

  private calculateDirection(from: Location, to: Location): number {
    const deltaLat = to.lat - from.lat;
    const deltaLng = to.lng - from.lng;
    return Math.atan2(deltaLng, deltaLat);
  }

  private calculateLineDirection(locations: Location[]): { lat: number; lng: number } {
    if (locations.length < 2) return { lat: 0, lng: 0 };
    
    const first = locations[0];
    const last = locations[locations.length - 1];
    
    return {
      lat: last.lat - first.lat,
      lng: last.lng - first.lng
    };
  }

  private getPerpendicularDirection(direction: { lat: number; lng: number }): { lat: number; lng: number } {
    // Rotate 90 degrees
    return {
      lat: -direction.lng,
      lng: direction.lat
    };
  }

  private calculateBarrierInfluence(location: Location, barriers: NaturalBarrier[]): number {
    if (barriers.length === 0) return 0;
    
    let totalInfluence = 0;
    for (const barrier of barriers) {
      // Calculate distance to barrier (simplified)
      const barrierCenter = this.calculateCentroid(barrier.coordinates);
      const distance = this.calculateDistance(location, barrierCenter);
      
      // Closer barriers have more influence
      const distanceInfluence = Math.max(0, 1 - distance / 5000); // 5km max influence
      totalInfluence += barrier.influence * distanceInfluence;
    }
    
    return Math.min(1, totalInfluence);
  }

  private calculateNetworkAlignment(location: Location, networks: TransportationNetwork[]): number {
    if (networks.length === 0) return 0;
    
    let bestAlignment = 0;
    for (const network of networks) {
      const networkCenter = this.calculateCentroid(network.coordinates);
      const distance = this.calculateDistance(location, networkCenter);
      
      // Closer to network = better alignment
      const alignment = Math.max(0, 1 - distance / 2000) * network.importance; // 2km max distance
      bestAlignment = Math.max(bestAlignment, alignment);
    }
    
    return bestAlignment;
  }

  private adjustLocationForBarriers(location: Location, barriers: NaturalBarrier[]): Location {
    // Simple adjustment - move slightly away from barriers
    let adjustedLat = location.lat;
    let adjustedLng = location.lng;
    
    for (const barrier of barriers) {
      const barrierCenter = this.calculateCentroid(barrier.coordinates);
      const direction = this.calculateDirection(barrierCenter, location);
      
      // Move slightly in the direction away from barrier
      const offset = 0.001 * barrier.influence; // ~100m * influence
      adjustedLat += Math.cos(direction) * offset;
      adjustedLng += Math.sin(direction) * offset;
    }
    
    return { lat: adjustedLat, lng: adjustedLng, country: location.country };
  }

  private async applyNaturalVariation(locations: Location[], targetDensity: number): Promise<Location[]> {
    const adjusted: Location[] = [];
    
    for (const location of locations) {
      // Apply random variation based on target density
      const variationAmount = (1 - targetDensity) * 0.002; // Up to ~200m variation
      
      const adjustedLat = location.lat + (Math.random() - 0.5) * variationAmount;
      const adjustedLng = location.lng + (Math.random() - 0.5) * variationAmount;
      
      adjusted.push({
        lat: adjustedLat,
        lng: adjustedLng,
        country: location.country
      });
    }
    
    return adjusted;
  }

  private calculateNaturalnessScore(adjusted: Location[], original: Location[]): number {
    if (adjusted.length !== original.length) return 0;
    
    // Calculate how much the adjustment improved naturalness
    const originalPatternScore = this.calculateSimplePatternScore(original);
    const adjustedPatternScore = this.calculateSimplePatternScore(adjusted);
    
    // Higher naturalness = lower pattern score
    const improvement = originalPatternScore - adjustedPatternScore;
    return Math.max(0, Math.min(1, 0.5 + improvement));
  }

  private calculateSimplePatternScore(locations: Location[]): number {
    if (locations.length < 3) return 0;
    
    // Simple pattern detection - check for regular spacing
    const distances: number[] = [];
    for (let i = 0; i < locations.length - 1; i++) {
      for (let j = i + 1; j < locations.length; j++) {
        distances.push(this.calculateDistance(locations[i], locations[j]));
      }
    }
    
    return this.calculateRegularity(distances);
  }

  private generateBarrierCoordinates(center: Location, type: string): Location[] {
    // Generate simple barrier coordinates for simulation
    const coords: Location[] = [];
    const length = type === 'river' ? 0.01 : 0.005; // degrees
    
    for (let i = 0; i < 5; i++) {
      coords.push({
        lat: center.lat + (i - 2) * length / 4,
        lng: center.lng + (Math.random() - 0.5) * length / 2,
        country: center.country
      });
    }
    
    return coords;
  }

  private generateNetworkCoordinates(center: Location, type: string): Location[] {
    // Generate simple network coordinates for simulation
    const coords: Location[] = [];
    const length = 0.008; // degrees
    
    for (let i = 0; i < 3; i++) {
      coords.push({
        lat: center.lat + (i - 1) * length / 2,
        lng: center.lng + (i - 1) * length / 2,
        country: center.country
      });
    }
    
    return coords;
  }
}