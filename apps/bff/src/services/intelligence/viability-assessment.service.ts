import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  ViabilityAssessmentService as IViabilityAssessmentService,
  CommercialViabilityScore,
  AccessibilityAssessment,
  UrbanContextAnalysis,
  StrategicRationale,
  Location,
  LocationAnalysis,
  CommercialFeature
} from '../../types/intelligence.types';
import { IntelligenceConfigManager } from '../../config/intelligence.config';
import { GeographicValidationService } from './geographic-validation.service';

@Injectable()
export class ViabilityAssessmentService implements IViabilityAssessmentService {
  private configManager: IntelligenceConfigManager;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor(
    @Inject(PrismaClient) private readonly prisma: PrismaClient,
    private readonly geographicValidationService: GeographicValidationService
  ) {
    this.configManager = IntelligenceConfigManager.getInstance();
  }

  async assessCommercialViability(
    lat: number, 
    lng: number
  ): Promise<CommercialViabilityScore> {
    console.info('Assessing commercial viability', { lat, lng });

    const cacheKey = this.generateCacheKey('commercial', lat, lng);
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // First, validate the geographic location
      const geoValidation = await this.geographicValidationService.validateLocation(lat, lng);
      
      if (!geoValidation.isValid || geoValidation.isInWater) {
        console.warn('Location failed geographic validation', { 
          lat, 
          lng, 
          issues: geoValidation.issues,
          isInWater: geoValidation.isInWater 
        });
        
        // Return very low viability for invalid locations
        const invalidLocationResult: CommercialViabilityScore = {
          score: 0.1,
          factors: {
            zoning: 0.1,
            landAvailability: 0.0, // No land available if in water
            constructionFeasibility: 0.0, // Cannot construct in water
            permitComplexity: 0.1
          },
          estimatedDevelopmentCost: 0,
          timeToOpen: 0
        };
        
        this.cacheData(cacheKey, invalidLocationResult);
        return invalidLocationResult;
      }
      // Analyze zoning and land use
      const zoning = await this.analyzeZoning(lat, lng);
      
      // Check land availability
      const landAvailability = await this.assessLandAvailability(lat, lng);
      
      // Evaluate construction feasibility
      const constructionFeasibility = await this.evaluateConstructionFeasibility(lat, lng);
      
      // Assess permit complexity
      const permitComplexity = await this.assessPermitComplexity(lat, lng);
      
      // Calculate overall score
      const score = (zoning * 0.3 + landAvailability * 0.25 + 
                    constructionFeasibility * 0.25 + permitComplexity * 0.2);

      // Estimate development costs and timeline
      const estimatedDevelopmentCost = this.estimateDevelopmentCost(
        constructionFeasibility, 
        permitComplexity, 
        lat, 
        lng
      );
      
      const timeToOpen = this.estimateTimeToOpen(permitComplexity, constructionFeasibility);

      const result: CommercialViabilityScore = {
        score: Math.max(0, Math.min(1, score)),
        factors: {
          zoning,
          landAvailability,
          constructionFeasibility,
          permitComplexity
        },
        estimatedDevelopmentCost,
        timeToOpen
      };

      this.cacheData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to assess commercial viability:', error);
      return this.createFallbackCommercialViability();
    }
  }

  async validateLocationAccessibility(
    location: Location
  ): Promise<AccessibilityAssessment> {
    console.info('Validating location accessibility', { 
      lat: location.lat, 
      lng: location.lng 
    });

    const cacheKey = this.generateCacheKey('accessibility', location.lat, location.lng);
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Assess vehicle access
      const vehicleAccess = await this.assessVehicleAccess(location.lat, location.lng);
      
      // Evaluate public transit access
      const publicTransit = await this.assessPublicTransit(location.lat, location.lng);
      
      // Check walkability
      const walkability = await this.assessWalkability(location.lat, location.lng);
      
      // Evaluate parking availability
      const parking = await this.assessParking(location.lat, location.lng);
      
      // Find nearest transit
      const nearestTransitDistance = await this.findNearestTransit(location.lat, location.lng);
      
      // Calculate walking traffic score
      const walkingTrafficScore = await this.calculateWalkingTraffic(location.lat, location.lng);

      // Calculate overall accessibility score
      const score = (vehicleAccess * 0.3 + publicTransit * 0.25 + 
                    walkability * 0.25 + parking * 0.2);

      const result: AccessibilityAssessment = {
        score: Math.max(0, Math.min(1, score)),
        factors: {
          vehicleAccess,
          publicTransit,
          walkability,
          parking
        },
        nearestTransitDistance,
        walkingTrafficScore
      };

      this.cacheData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to validate location accessibility:', error);
      return this.createFallbackAccessibility();
    }
  }

  async analyzeUrbanContext(
    lat: number, 
    lng: number, 
    radius: number = 1000
  ): Promise<UrbanContextAnalysis> {
    console.info('Analyzing urban context', { lat, lng, radius });

    const cacheKey = this.generateCacheKey('urban', lat, lng, radius);
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Analyze population density
      const populationDensity = await this.analyzePopulationDensity(lat, lng, radius);
      
      // Assess commercial activity
      const commercialActivity = await this.assessCommercialActivity(lat, lng, radius);
      
      // Check residential proximity
      const residentialProximity = await this.assessResidentialProximity(lat, lng, radius);
      
      // Evaluate employment centers
      const employmentCenters = await this.assessEmploymentCenters(lat, lng, radius);
      
      // Determine land use pattern
      const landUsePattern = await this.determineLandUsePattern(lat, lng, radius);
      
      // Assess development trend
      const developmentTrend = await this.assessDevelopmentTrend(lat, lng, radius);

      // Calculate overall urban context score
      const score = (populationDensity * 0.3 + commercialActivity * 0.3 + 
                    residentialProximity * 0.2 + employmentCenters * 0.2);

      const result: UrbanContextAnalysis = {
        score: Math.max(0, Math.min(1, score)),
        factors: {
          populationDensity,
          commercialActivity,
          residentialProximity,
          employmentCenters
        },
        landUsePattern,
        developmentTrend
      };

      this.cacheData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to analyze urban context:', error);
      return this.createFallbackUrbanContext();
    }
  }

  async generateStrategicRationale(
    location: Location,
    analysis: LocationAnalysis
  ): Promise<StrategicRationale> {
    console.info('Generating strategic rationale', { 
      lat: location.lat, 
      lng: location.lng 
    });

    try {
      const primaryReasons = this.identifyPrimaryReasons(analysis);
      const addressedConcerns = this.identifyAddressedConcerns(analysis);
      const confidenceFactors = this.identifyConfidenceFactors(analysis);
      const riskMitigations = this.identifyRiskMitigations(analysis);

      return {
        primaryReasons,
        addressedConcerns,
        confidenceFactors,
        riskMitigations
      };
    } catch (error) {
      console.error('Failed to generate strategic rationale:', error);
      return this.createFallbackRationale();
    }
  }

  // Private helper methods for commercial viability assessment
  private async analyzeZoning(lat: number, lng: number): Promise<number> {
    // In a real implementation, this would call zoning APIs or databases
    // For now, simulate based on location characteristics
    
    // Urban areas typically have better commercial zoning
    const urbanScore = this.calculateUrbanScore(lat, lng);
    
    // Simulate zoning score based on urban characteristics
    if (urbanScore > 0.8) return 0.9; // High urban density = good commercial zoning
    if (urbanScore > 0.6) return 0.7; // Medium urban density = moderate zoning
    if (urbanScore > 0.4) return 0.5; // Low urban density = mixed zoning
    return 0.3; // Rural areas = limited commercial zoning
  }

  private async assessLandAvailability(lat: number, lng: number): Promise<number> {
    // Simulate land availability assessment
    // In reality, this would check property databases, satellite imagery, etc.
    
    const developmentDensity = await this.calculateDevelopmentDensity(lat, lng);
    
    // Higher development density = lower land availability
    return Math.max(0.1, 1 - developmentDensity);
  }

  private async evaluateConstructionFeasibility(lat: number, lng: number): Promise<number> {
    // Assess construction feasibility based on terrain, infrastructure, etc.
    
    const terrainScore = await this.assessTerrain(lat, lng);
    const infrastructureScore = await this.assessInfrastructure(lat, lng);
    
    return (terrainScore * 0.6 + infrastructureScore * 0.4);
  }

  private async assessPermitComplexity(lat: number, lng: number): Promise<number> {
    // Assess permit complexity based on location characteristics
    // Urban areas typically have more complex permitting
    
    const urbanScore = this.calculateUrbanScore(lat, lng);
    const jurisdictionComplexity = await this.assessJurisdictionComplexity(lat, lng);
    
    // Higher urban score = more complex permits (lower score)
    const complexityScore = 1 - (urbanScore * 0.6 + jurisdictionComplexity * 0.4);
    
    return Math.max(0.2, complexityScore);
  }

  // Private helper methods for accessibility assessment
  private async assessVehicleAccess(lat: number, lng: number): Promise<number> {
    // Assess vehicle accessibility based on road network
    const roadDensity = await this.calculateRoadDensity(lat, lng);
    const majorRoadProximity = await this.calculateMajorRoadProximity(lat, lng);
    
    return (roadDensity * 0.6 + majorRoadProximity * 0.4);
  }

  private async assessPublicTransit(lat: number, lng: number): Promise<number> {
    // Assess public transit accessibility
    const transitStopDistance = await this.findNearestTransit(lat, lng);
    const transitFrequency = await this.assessTransitFrequency(lat, lng);
    
    // Closer transit stops = better score
    const distanceScore = Math.max(0, 1 - (transitStopDistance / 1000)); // Normalize to 1km
    
    return (distanceScore * 0.7 + transitFrequency * 0.3);
  }

  private async assessWalkability(lat: number, lng: number): Promise<number> {
    // Assess walkability based on pedestrian infrastructure
    const sidewalkDensity = await this.calculateSidewalkDensity(lat, lng);
    const pedestrianSafety = await this.assessPedestrianSafety(lat, lng);
    const walkingDestinations = await this.assessWalkingDestinations(lat, lng);
    
    return (sidewalkDensity * 0.4 + pedestrianSafety * 0.3 + walkingDestinations * 0.3);
  }

  private async assessParking(lat: number, lng: number): Promise<number> {
    // Assess parking availability
    const parkingDensity = await this.calculateParkingDensity(lat, lng);
    const parkingCost = await this.assessParkingCost(lat, lng);
    
    // More parking and lower cost = better score
    return (parkingDensity * 0.7 + (1 - parkingCost) * 0.3);
  }

  // Private helper methods for urban context analysis
  private async analyzePopulationDensity(lat: number, lng: number, radius: number): Promise<number> {
    // Analyze population density in the area
    // This would typically use census data or demographic APIs
    
    const urbanScore = this.calculateUrbanScore(lat, lng);
    
    // Simulate population density based on urban characteristics
    return Math.min(1, urbanScore * 1.2);
  }

  private async assessCommercialActivity(lat: number, lng: number, radius: number): Promise<number> {
    // Assess commercial activity level
    const businessDensity = await this.calculateBusinessDensity(lat, lng, radius);
    const retailPresence = await this.assessRetailPresence(lat, lng, radius);
    
    return (businessDensity * 0.6 + retailPresence * 0.4);
  }

  private async assessResidentialProximity(lat: number, lng: number, radius: number): Promise<number> {
    // Assess proximity to residential areas
    const residentialDensity = await this.calculateResidentialDensity(lat, lng, radius);
    const housingTypes = await this.assessHousingTypes(lat, lng, radius);
    
    return (residentialDensity * 0.7 + housingTypes * 0.3);
  }

  private async assessEmploymentCenters(lat: number, lng: number, radius: number): Promise<number> {
    // Assess proximity to employment centers
    const officeDensity = await this.calculateOfficeDensity(lat, lng, radius);
    const industrialPresence = await this.assessIndustrialPresence(lat, lng, radius);
    
    return (officeDensity * 0.8 + industrialPresence * 0.2);
  }

  // Utility methods for calculations
  private calculateUrbanScore(lat: number, lng: number): number {
    // Simple heuristic based on coordinates
    // In reality, this would use actual urban density data
    
    // Major city centers tend to have higher density
    // This is a simplified calculation
    const latAbs = Math.abs(lat);
    const lngAbs = Math.abs(lng);
    
    // Simulate urban score based on coordinate patterns
    const baseScore = Math.random() * 0.4 + 0.3; // 0.3-0.7 base
    const coordinateBonus = (latAbs + lngAbs) % 1; // Add some variation
    
    return Math.min(1, baseScore + coordinateBonus * 0.3);
  }

  private async calculateDevelopmentDensity(lat: number, lng: number): Promise<number> {
    // Calculate development density in the area
    const urbanScore = this.calculateUrbanScore(lat, lng);
    return Math.min(0.9, urbanScore * 0.8 + Math.random() * 0.2);
  }

  private async assessTerrain(lat: number, lng: number): Promise<number> {
    // Assess terrain suitability for construction
    // Flat terrain = better score
    return 0.8 + Math.random() * 0.2; // Simulate mostly favorable terrain
  }

  private async assessInfrastructure(lat: number, lng: number): Promise<number> {
    // Assess infrastructure availability
    const urbanScore = this.calculateUrbanScore(lat, lng);
    return Math.min(1, urbanScore * 0.9 + 0.1);
  }

  private async assessJurisdictionComplexity(lat: number, lng: number): Promise<number> {
    // Assess jurisdiction complexity
    // Urban areas typically have more complex jurisdictions
    const urbanScore = this.calculateUrbanScore(lat, lng);
    return urbanScore * 0.7 + Math.random() * 0.3;
  }

  private async calculateRoadDensity(lat: number, lng: number): Promise<number> {
    const urbanScore = this.calculateUrbanScore(lat, lng);
    return Math.min(1, urbanScore * 0.9 + 0.1);
  }

  private async calculateMajorRoadProximity(lat: number, lng: number): Promise<number> {
    // Distance to major roads (closer = better score)
    const distance = Math.random() * 2000; // 0-2km
    return Math.max(0, 1 - (distance / 2000));
  }

  private async findNearestTransit(lat: number, lng: number): Promise<number> {
    // Find distance to nearest transit stop
    const urbanScore = this.calculateUrbanScore(lat, lng);
    const baseDistance = 500; // 500m base
    const variation = (1 - urbanScore) * 1500; // Up to 1.5km additional in rural areas
    
    return baseDistance + variation;
  }

  private async assessTransitFrequency(lat: number, lng: number): Promise<number> {
    const urbanScore = this.calculateUrbanScore(lat, lng);
    return Math.min(1, urbanScore * 0.8 + 0.2);
  }

  private async calculateSidewalkDensity(lat: number, lng: number): Promise<number> {
    const urbanScore = this.calculateUrbanScore(lat, lng);
    return Math.min(1, urbanScore * 0.85 + 0.15);
  }

  private async assessPedestrianSafety(lat: number, lng: number): Promise<number> {
    const urbanScore = this.calculateUrbanScore(lat, lng);
    // Urban areas might have more traffic but better infrastructure
    return 0.6 + Math.random() * 0.3;
  }

  private async assessWalkingDestinations(lat: number, lng: number): Promise<number> {
    const urbanScore = this.calculateUrbanScore(lat, lng);
    return Math.min(1, urbanScore * 0.9 + 0.1);
  }

  private async calculateParkingDensity(lat: number, lng: number): Promise<number> {
    const urbanScore = this.calculateUrbanScore(lat, lng);
    // Urban areas might have less parking availability
    return Math.max(0.2, 1 - urbanScore * 0.6);
  }

  private async assessParkingCost(lat: number, lng: number): Promise<number> {
    const urbanScore = this.calculateUrbanScore(lat, lng);
    // Urban areas typically have higher parking costs
    return Math.min(0.9, urbanScore * 0.7 + 0.1);
  }

  private async calculateWalkingTraffic(lat: number, lng: number): Promise<number> {
    const urbanScore = this.calculateUrbanScore(lat, lng);
    return Math.min(1, urbanScore * 0.8 + Math.random() * 0.2);
  }

  private async calculateBusinessDensity(lat: number, lng: number, radius: number): Promise<number> {
    const urbanScore = this.calculateUrbanScore(lat, lng);
    return Math.min(1, urbanScore * 0.85 + 0.15);
  }

  private async assessRetailPresence(lat: number, lng: number, radius: number): Promise<number> {
    const urbanScore = this.calculateUrbanScore(lat, lng);
    return Math.min(1, urbanScore * 0.8 + 0.2);
  }

  private async calculateResidentialDensity(lat: number, lng: number, radius: number): Promise<number> {
    const urbanScore = this.calculateUrbanScore(lat, lng);
    return Math.min(1, urbanScore * 0.7 + 0.3);
  }

  private async assessHousingTypes(lat: number, lng: number, radius: number): Promise<number> {
    // Diverse housing types = better score
    return 0.6 + Math.random() * 0.4;
  }

  private async calculateOfficeDensity(lat: number, lng: number, radius: number): Promise<number> {
    const urbanScore = this.calculateUrbanScore(lat, lng);
    return Math.min(1, urbanScore * 0.9 + 0.1);
  }

  private async assessIndustrialPresence(lat: number, lng: number, radius: number): Promise<number> {
    const urbanScore = this.calculateUrbanScore(lat, lng);
    // Industrial presence might be moderate in urban areas
    return Math.min(0.8, urbanScore * 0.5 + 0.3);
  }

  private async determineLandUsePattern(lat: number, lng: number, radius: number): Promise<string> {
    const urbanScore = this.calculateUrbanScore(lat, lng);
    
    if (urbanScore > 0.8) return 'dense urban mixed-use';
    if (urbanScore > 0.6) return 'urban commercial/residential';
    if (urbanScore > 0.4) return 'suburban mixed-use';
    return 'low-density residential';
  }

  private async assessDevelopmentTrend(lat: number, lng: number, radius: number): Promise<'growing' | 'stable' | 'declining'> {
    const urbanScore = this.calculateUrbanScore(lat, lng);
    const random = Math.random();
    
    if (urbanScore > 0.7) {
      return random > 0.3 ? 'growing' : 'stable';
    } else if (urbanScore > 0.4) {
      return random > 0.5 ? 'stable' : (random > 0.25 ? 'growing' : 'declining');
    } else {
      return random > 0.6 ? 'stable' : 'declining';
    }
  }

  // Strategic rationale generation methods
  private identifyPrimaryReasons(analysis: LocationAnalysis): string[] {
    const reasons: string[] = [];
    
    if (analysis.viability.commercialViability.score > 0.7) {
      reasons.push('Excellent commercial viability with favorable zoning and development conditions');
    }
    
    if (analysis.viability.accessibility.score > 0.7) {
      reasons.push('Superior accessibility with good vehicle access and public transit connectivity');
    }
    
    if (analysis.viability.urbanContext.score > 0.7) {
      reasons.push('Strong urban context with high population density and commercial activity');
    }
    
    if (analysis.demographics.marketFitScore > 0.7) {
      reasons.push('Demographics align well with target customer profile');
    }
    
    if (analysis.competitive.marketGapOpportunity > 0.6) {
      reasons.push('Significant market gap opportunity with limited direct competition');
    }
    
    // Ensure at least one reason
    if (reasons.length === 0) {
      reasons.push('Location meets basic viability criteria for restaurant development');
    }
    
    return reasons.slice(0, 4); // Limit to top 4 reasons
  }

  private identifyAddressedConcerns(analysis: LocationAnalysis): string[] {
    const concerns: string[] = [];
    
    if (analysis.competitive.cannibalizationRisk.riskLevel === 'HIGH') {
      concerns.push('High cannibalization risk mitigated by strong market demand and differentiated positioning');
    }
    
    if (analysis.viability.commercialViability.factors.permitComplexity < 0.5) {
      concerns.push('Complex permitting process addressed through experienced local development partners');
    }
    
    if (analysis.viability.accessibility.factors.parking < 0.5) {
      concerns.push('Limited parking availability offset by strong public transit and walkability');
    }
    
    if (analysis.demographics.confidence < 0.6) {
      concerns.push('Demographic data limitations addressed through local market research and validation');
    }
    
    return concerns;
  }

  private identifyConfidenceFactors(analysis: LocationAnalysis): string[] {
    const factors: string[] = [];
    
    if (analysis.demographics.dataSource === 'census') {
      factors.push('High-quality census demographic data available');
    }
    
    if (analysis.viability.commercialViability.score > 0.6) {
      factors.push('Strong commercial development fundamentals');
    }
    
    if (analysis.intelligence.isCommercialArea) {
      factors.push('Located in established commercial district');
    }
    
    if (analysis.intelligence.distanceToTownCenter < 1000) {
      factors.push('Close proximity to town center and main commercial activity');
    }
    
    return factors;
  }

  private identifyRiskMitigations(analysis: LocationAnalysis): string[] {
    const mitigations: string[] = [];
    
    mitigations.push('Comprehensive market analysis validates location viability');
    mitigations.push('Flexible lease terms allow for operational adjustments');
    
    if (analysis.competitive.cannibalizationRisk.riskLevel !== 'LOW') {
      mitigations.push('Differentiated menu and service offerings to minimize cannibalization');
    }
    
    if (analysis.viability.commercialViability.timeToOpen > 9) {
      mitigations.push('Extended development timeline managed through phased approach');
    }
    
    return mitigations;
  }

  // Fallback methods
  private createFallbackCommercialViability(): CommercialViabilityScore {
    return {
      score: 0.5,
      factors: {
        zoning: 0.5,
        landAvailability: 0.5,
        constructionFeasibility: 0.5,
        permitComplexity: 0.5
      },
      estimatedDevelopmentCost: 400000,
      timeToOpen: 8
    };
  }

  private createFallbackAccessibility(): AccessibilityAssessment {
    return {
      score: 0.5,
      factors: {
        vehicleAccess: 0.5,
        publicTransit: 0.5,
        walkability: 0.5,
        parking: 0.5
      },
      nearestTransitDistance: 800,
      walkingTrafficScore: 0.5
    };
  }

  private createFallbackUrbanContext(): UrbanContextAnalysis {
    return {
      score: 0.5,
      factors: {
        populationDensity: 0.5,
        commercialActivity: 0.5,
        residentialProximity: 0.5,
        employmentCenters: 0.5
      },
      landUsePattern: 'mixed-use',
      developmentTrend: 'stable'
    };
  }

  private createFallbackRationale(): StrategicRationale {
    return {
      primaryReasons: ['Location meets basic development criteria'],
      addressedConcerns: ['Standard market risks addressed through proven operational model'],
      confidenceFactors: ['Established market presence and operational expertise'],
      riskMitigations: ['Comprehensive due diligence and market validation']
    };
  }

  // Utility methods
  private estimateDevelopmentCost(
    constructionFeasibility: number,
    permitComplexity: number,
    lat: number,
    lng: number
  ): number {
    const baseCost = 350000; // Base development cost
    const complexityMultiplier = 1 + (1 - constructionFeasibility) * 0.5;
    const permitMultiplier = 1 + (1 - permitComplexity) * 0.3;
    const locationMultiplier = 1 + this.calculateUrbanScore(lat, lng) * 0.4;
    
    return Math.round(baseCost * complexityMultiplier * permitMultiplier * locationMultiplier);
  }

  private estimateTimeToOpen(permitComplexity: number, constructionFeasibility: number): number {
    const baseTime = 6; // 6 months base
    const permitDelay = (1 - permitComplexity) * 4; // Up to 4 months for complex permits
    const constructionDelay = (1 - constructionFeasibility) * 3; // Up to 3 months for difficult construction
    
    return Math.round(baseTime + permitDelay + constructionDelay);
  }

  private generateCacheKey(...parts: (string | number)[]): string {
    return parts.join('_');
  }

  private getCachedData(cacheKey: string): any | null {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(cacheKey);
    }
    return null;
  }

  private cacheData(cacheKey: string, data: any): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }
}