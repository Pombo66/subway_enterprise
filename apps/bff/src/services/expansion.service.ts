import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LocationIntelligenceService } from './intelligence/location-intelligence.service';
import { GeographicValidationService } from './intelligence/geographic-validation.service';
import { EnhancedSuggestion } from '../types/intelligence.types';

// Scope-based interfaces
export interface ScopeSelection {
  type: 'country' | 'state' | 'custom_area';
  value: string;
  polygon?: any; // GeoJSON.Polygon
  area?: number;
}

export interface ScopeQueryParams {
  scope: ScopeSelection;
  intensity: number; // 0-100
  dataMode: 'live' | 'modelled';
  minDistance: number; // anti-cannibalization km
  maxPerCity?: number;
}

export interface ExpansionSuggestion {
  id: string;
  lat: number;
  lng: number;
  finalScore: number;
  confidence: number;
  dataMode: 'live' | 'modelled';
  demandScore: number;
  cannibalizationPenalty: number;
  opsFitScore: number;
  nearestSubwayDistance: number;
  topPOIs: string[];
  cacheKey: string;
  modelVersion: string;
  dataSnapshotDate: string;
}

export interface CapacityEstimate {
  totalSites: number;
  availableSites: number;
  scopeArea: number;
  density: number; // sites per km²
}

// Legacy interfaces for backward compatibility
export interface ExpansionQueryParams {
  region?: string;
  country?: string; // NEW: Country filtering
  target?: number;
  mode: 'live' | 'model';
  limit?: number;
}

export interface ExpansionRecommendation {
  id: string;
  lat: number;
  lng: number;
  region: string;
  country?: string;
  finalScore: number;
  confidence: number;
  isLive: boolean;
  demandScore: number;
  competitionPenalty: number;
  supplyPenalty: number;
  population: number;
  footfallIndex: number;
  incomeIndex: number;
  predictedAUV?: number;
  paybackPeriod?: number;
}

@Injectable()
export class ExpansionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly locationIntelligenceService: LocationIntelligenceService,
    private readonly geographicValidationService: GeographicValidationService
  ) {}

  // New scope-based methods with optional intelligence enhancement
  async getSuggestionsInScope(params: ScopeQueryParams): Promise<ExpansionSuggestion[]> {
    console.info('Fetching scope-based expansion suggestions', {
      scopeType: params.scope.type,
      scopeValue: params.scope.value,
      intensity: params.intensity,
      dataMode: params.dataMode
    });

    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(params);
      const cachedResult = await this.getCachedSuggestions(cacheKey);
      
      if (cachedResult) {
        console.info('Returning cached suggestions', { cacheKey, count: cachedResult.length });
        return cachedResult;
      }

      // Build scope-aware query
      const where = this.buildScopeQuery(params.scope, params.dataMode);
      
      // Fetch more trade areas than needed to account for geographic filtering
      const fetchMultiplier = 3; // Fetch 3x more to account for water filtering
      const tradeAreas = await this.prisma.tradeArea.findMany({
        where,
        orderBy: { finalScore: 'desc' }
      });

      console.info('Fetched trade areas before filtering', { count: tradeAreas.length });

      // Apply geographic validation (filter out water locations and country boundaries)
      const expectedCountry = params.scope.type === 'country' ? params.scope.value : undefined;
      const landValidatedAreas = await this.filterWaterLocations(tradeAreas, expectedCountry);
      
      console.info('After geographic validation', { 
        original: tradeAreas.length, 
        afterLandValidation: landValidatedAreas.length,
        filtered: tradeAreas.length - landValidatedAreas.length
      });

      // Apply anti-cannibalization filter
      const filteredAreas = this.applyCannibalizationFilter(landValidatedAreas, params.minDistance);

      // Calculate target count based on intensity
      const targetCount = Math.min(300, Math.round((params.intensity / 100) * filteredAreas.length));
      
      // Select top suggestions
      const topAreas = filteredAreas.slice(0, targetCount);

      // Transform to suggestions
      const suggestions = topAreas.map(area => this.transformToSuggestion(area, params));

      // Cache the results
      await this.cacheSuggestions(cacheKey, suggestions, params);

      const latencyMs = Date.now() - startTime;
      console.info('Scope-based suggestions generated', {
        count: suggestions.length,
        targetCount,
        latencyMs,
        cacheKey
      });

      return suggestions;
    } catch (error) {
      console.error('Failed to fetch scope-based suggestions', error);
      throw error;
    }
  }

  // Intelligence-enhanced suggestions method
  async getEnhancedSuggestionsInScope(params: ScopeQueryParams): Promise<EnhancedSuggestion[]> {
    console.info('Fetching intelligence-enhanced expansion suggestions', {
      scopeType: params.scope.type,
      scopeValue: params.scope.value,
      intensity: params.intensity,
      dataMode: params.dataMode
    });

    const startTime = Date.now();

    try {
      // Check if intelligence service is available
      if (!this.locationIntelligenceService) {
        console.warn('Intelligence service not available, falling back to basic suggestions');
        const basicSuggestions = await this.getSuggestionsInScope(params);
        return basicSuggestions.map(suggestion => this.createFallbackEnhancedSuggestion(suggestion));
      }

      // Get basic suggestions first
      const basicSuggestions = await this.getSuggestionsInScope(params);

      if (basicSuggestions.length === 0) {
        console.info('No basic suggestions found for scope');
        return [];
      }

      // Enhance suggestions with intelligence
      const enhancedSuggestions = await this.locationIntelligenceService.enhanceLocationSuggestions(
        basicSuggestions,
        params.scope
      );

      // Calculate intelligence scoring and credibility rating
      const scoredSuggestions = enhancedSuggestions.map(suggestion => 
        this.calculateIntelligenceMetrics(suggestion)
      );

      const latencyMs = Date.now() - startTime;
      console.info('Intelligence-enhanced suggestions generated', {
        originalCount: basicSuggestions.length,
        enhancedCount: scoredSuggestions.length,
        latencyMs
      });

      return scoredSuggestions;
    } catch (error) {
      console.error('Failed to fetch intelligence-enhanced suggestions', error);
      
      // Graceful degradation: return basic suggestions with fallback enhancement
      try {
        const basicSuggestions = await this.getSuggestionsInScope(params);
        console.warn('Falling back to basic suggestions due to intelligence enhancement failure');
        return basicSuggestions.map(suggestion => this.createFallbackEnhancedSuggestion(suggestion));
      } catch (fallbackError) {
        console.error('Fallback to basic suggestions also failed', fallbackError);
        throw error;
      }
    }
  }

  async estimateCapacity(scope: ScopeSelection): Promise<CapacityEstimate> {
    console.info('Estimating capacity for scope', { type: scope.type, value: scope.value });

    try {
      const where = this.buildScopeQuery(scope, 'live'); // Use live data for capacity estimation
      
      const totalSites = await this.prisma.tradeArea.count({ where });
      
      // Estimate available sites (those with reasonable scores and distances)
      const availableWhere = {
        ...where,
        finalScore: { gte: 0.3 }, // Minimum viable score
        existingStoreDist: { gte: 1.0 } // At least 1km from existing stores
      };
      
      const availableSites = await this.prisma.tradeArea.count({ where: availableWhere });
      
      // Calculate scope area (simplified - would need actual geographic calculation)
      const scopeArea = scope.area || this.estimateScopeArea(scope);
      
      const density = scopeArea > 0 ? totalSites / scopeArea : 0;

      return {
        totalSites,
        availableSites,
        scopeArea,
        density: Number(density.toFixed(4))
      };
    } catch (error) {
      console.error('Failed to estimate capacity', error);
      throw error;
    }
  }

  async recomputeForScope(scope: ScopeSelection): Promise<{ message: string; processed: number }> {
    console.info('Recomputing scores for scope', { type: scope.type, value: scope.value });

    const startTime = Date.now();

    try {
      const where = this.buildScopeQuery(scope, 'live');
      const tradeAreas = await this.prisma.tradeArea.findMany({ where });

      let processed = 0;

      for (const area of tradeAreas) {
        const updatedScores = this.calculateGravityScore(area);
        const confidence = this.calculateConfidence(area);

        await this.prisma.tradeArea.update({
          where: { id: area.id },
          data: {
            ...updatedScores,
            confidence,
            modelVersion: 'v0.3',
            dataSnapshotDate: new Date(),
            updatedAt: new Date()
          }
        });

        processed++;
      }

      // Clear related cache entries
      await this.clearScopeCache(scope);

      const latencyMs = Date.now() - startTime;
      console.info('Scope recomputation completed', { processed, latencyMs });

      return {
        message: `Successfully recomputed scores for ${processed} sites in scope`,
        processed
      };
    } catch (error) {
      console.error('Failed to recompute scope', error);
      throw error;
    }
  }

  async getRecommendations(params: ExpansionQueryParams): Promise<ExpansionRecommendation[]> {
    console.info('🔥 BFF: Fetching expansion recommendations', { 
      region: params.region,
      country: params.country, // Add country to debug output
      mode: params.mode, 
      target: params.target,
      timestamp: new Date().toISOString()
    });

    const startTime = Date.now();

    try {
      // Build query filters
      const where: any = {};
      
      if (params.region) {
        where.region = params.region;
      }
      
      if (params.country) {
        where.country = params.country.toUpperCase();
      }
      
      if (params.mode === 'live') {
        where.isLive = true;
      } else if (params.mode === 'model') {
        where.isLive = false;
      }

      // Fetch more trade areas than needed to account for geographic filtering
      const fetchMultiplier = 3; // Fetch 3x more to account for water filtering
      const requestedCount = params.limit || params.target || 50;
      
      const tradeAreas = await this.prisma.tradeArea.findMany({
        where,
        orderBy: {
          finalScore: 'desc'
        },
        take: requestedCount * fetchMultiplier
      });

      console.info('Fetched trade areas before filtering', { count: tradeAreas.length });

      // Apply geographic validation (filter out water locations and country boundaries)
      const expectedCountry = params.country;
      const landValidatedAreas = await this.filterWaterLocations(tradeAreas, expectedCountry);
      
      console.info('After geographic validation', { 
        original: tradeAreas.length, 
        afterLandValidation: landValidatedAreas.length,
        filtered: tradeAreas.length - landValidatedAreas.length
      });

      // Take only the requested count after filtering
      const finalAreas = landValidatedAreas.slice(0, requestedCount);

      // Transform to recommendations with predicted metrics
      const recommendations = finalAreas.map(area => this.transformToRecommendation(area));

      const latencyMs = Date.now() - startTime;
      console.info('Expansion recommendations fetched successfully', { 
        count: recommendations.length, 
        latencyMs 
      });

      return recommendations;
    } catch (error) {
      console.error('Failed to fetch expansion recommendations', error);
      throw error;
    }
  }

  async recomputeScores(region?: string): Promise<{ message: string; processed: number }> {
    console.info('Starting gravity score recomputation', { region });

    const startTime = Date.now();

    try {
      // Build query filters
      const where: any = {};
      if (region) {
        where.region = region;
      }

      // Fetch all trade areas to recompute
      const tradeAreas = await this.prisma.tradeArea.findMany({ where });

      let processed = 0;

      // Recompute scores for each trade area
      for (const area of tradeAreas) {
        const updatedScores = this.calculateGravityScore(area);
        const confidence = this.calculateConfidence(area);

        await this.prisma.tradeArea.update({
          where: { id: area.id },
          data: {
            demandScore: updatedScores.demandScore,
            supplyPenalty: updatedScores.supplyPenalty,
            competitionPenalty: updatedScores.competitionPenalty,
            finalScore: updatedScores.finalScore,
            confidence
          }
        });

        processed++;
      }

      const latencyMs = Date.now() - startTime;
      console.info('Gravity score recomputation completed', { 
        processed, 
        region, 
        latencyMs 
      });

      return {
        message: `Successfully recomputed scores for ${processed} trade areas${region ? ` in ${region}` : ''}`,
        processed
      };
    } catch (error) {
      console.error('Failed to recompute gravity scores', error);
      throw error;
    }
  }

  private calculateGravityScore(tradeArea: any): {
    demandScore: number;
    supplyPenalty: number;
    competitionPenalty: number;
    finalScore: number;
  } {
    // Normalize population to 0-1 range (assuming max population of 200,000)
    const populationNorm = this.normalizeValue(tradeArea.population, 0, 200000);
    
    // Demand score calculation: population * 0.5 + footfall * 0.3 + income * 0.2
    const demandScore = populationNorm * 0.5 + tradeArea.footfallIndex * 0.3 + tradeArea.incomeIndex * 0.2;
    
    // Supply penalty: 1 / distance to nearest store (prevent division by zero)
    const existingStorePenalty = 1 / Math.max(tradeArea.existingStoreDist, 0.1);
    
    // Competition penalty: competitor index * 0.4
    const competitionPenalty = tradeArea.competitorIdx * 0.4;
    
    // Supply penalty normalized
    const supplyPenalty = this.normalizeValue(existingStorePenalty, 0, 10) * 0.15;
    
    // Final gravity score with weights
    const demandWeight = 0.6;
    const compWeight = 0.25;
    const supplyWeight = 0.15;
    
    const rawScore = demandWeight * demandScore - compWeight * competitionPenalty - supplyWeight * supplyPenalty;
    const finalScore = Math.max(0, Math.min(1, rawScore));
    
    return {
      demandScore: Number(demandScore.toFixed(3)),
      supplyPenalty: Number(supplyPenalty.toFixed(3)),
      competitionPenalty: Number(competitionPenalty.toFixed(3)),
      finalScore: Number(finalScore.toFixed(3))
    };
  }

  private calculateConfidence(tradeArea: any): number {
    // Calculate confidence based on data variance across sources
    const dataPoints = [
      tradeArea.footfallIndex,
      tradeArea.incomeIndex,
      this.normalizeValue(tradeArea.population, 0, 200000)
    ];
    
    // Calculate variance
    const mean = dataPoints.reduce((sum, val) => sum + val, 0) / dataPoints.length;
    const variance = dataPoints.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dataPoints.length;
    
    // Convert variance to confidence (lower variance = higher confidence)
    const maxVariance = 0.25; // Reasonable maximum variance for normalized data
    const confidence = 1 - Math.min(variance / maxVariance, 1);
    
    // Ensure confidence is within reasonable bounds (0.3 to 0.95)
    return Number(Math.max(0.3, Math.min(0.95, confidence)).toFixed(3));
  }

  private normalizeValue(value: number, min: number, max: number): number {
    if (max === min) return 0;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  // Scope-based helper methods
  private buildScopeQuery(scope: ScopeSelection, dataMode: 'live' | 'modelled'): any {
    const where: any = {
      dataMode: dataMode
    };

    switch (scope.type) {
      case 'country':
        where.country = scope.value;
        where.scopeType = 'country';
        break;
      case 'state':
        where.country = 'US'; // States are US-specific
        where.scope = scope.value;
        where.scopeType = 'state';
        break;
      case 'custom_area':
        // For custom areas, we'd need to implement geographic filtering
        // For now, use a placeholder approach
        where.scopeType = 'custom_area';
        if (scope.polygon) {
          // In a real implementation, this would use PostGIS or similar
          // For now, we'll filter by a bounding box or similar approach
          where.scope = 'custom';
        }
        break;
      default:
        // Fallback to region-based filtering
        where.region = scope.value;
    }

    return where;
  }

  /**
   * Filters out trade areas that are in water bodies or outside country boundaries
   */
  private async filterWaterLocations(tradeAreas: any[], expectedCountry?: string): Promise<any[]> {
    const validAreas: any[] = [];
    
    for (const area of tradeAreas) {
      try {
        const validationOptions = expectedCountry ? { 
          expectedCountry, 
          strictBoundaryCheck: true 
        } : undefined;
        
        const validation = await this.geographicValidationService.validateLocation(
          area.centroidLat, 
          area.centroidLng,
          validationOptions
        );
        
        if (validation.isValid && !validation.isInWater && (validation.isInCorrectCountry !== false)) {
          validAreas.push(area);
        } else {
          console.warn(`Filtered out location: ${area.centroidLat}, ${area.centroidLng} - ${validation.issues.join(', ')}`);
        }
      } catch (error) {
        console.warn(`Error validating location ${area.centroidLat}, ${area.centroidLng}:`, error);
        // Skip this location if validation fails
      }
    }
    
    return validAreas;
  }

  private applyCannibalizationFilter(tradeAreas: any[], minDistance: number): any[] {
    return tradeAreas.filter(area => area.existingStoreDist >= minDistance);
  }

  private generateCacheKey(params: ScopeQueryParams): string {
    const scopeKey = params.scope.type === 'custom_area' 
      ? `custom_${this.hashObject(params.scope.polygon)}`
      : `${params.scope.type}_${params.scope.value}`;
    
    return this.hashString(`${scopeKey}_${params.intensity}_${params.dataMode}_v0.3`);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  private hashObject(obj: any): string {
    return this.hashString(JSON.stringify(obj));
  }

  private async getCachedSuggestions(cacheKey: string): Promise<ExpansionSuggestion[] | null> {
    try {
      const cached = await this.prisma.expansionCache.findUnique({
        where: { cacheKey }
      });

      if (cached && cached.expiresAt > new Date()) {
        return JSON.parse(cached.suggestions);
      }

      // Clean up expired cache
      if (cached) {
        await this.prisma.expansionCache.delete({ where: { cacheKey } });
      }

      return null;
    } catch (error) {
      console.warn('Cache lookup failed', error);
      return null;
    }
  }

  private async cacheSuggestions(
    cacheKey: string, 
    suggestions: ExpansionSuggestion[], 
    params: ScopeQueryParams
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await this.prisma.expansionCache.upsert({
        where: { cacheKey },
        create: {
          cacheKey,
          scope: JSON.stringify(params.scope),
          intensity: params.intensity,
          dataMode: params.dataMode,
          modelVersion: 'v0.3',
          suggestions: JSON.stringify(suggestions),
          expiresAt
        },
        update: {
          suggestions: JSON.stringify(suggestions),
          generatedAt: new Date(),
          expiresAt
        }
      });
    } catch (error) {
      console.warn('Failed to cache suggestions', error);
      // Don't throw - caching is optional
    }
  }

  private async clearScopeCache(scope: ScopeSelection): Promise<void> {
    try {
      // Delete cache entries for this scope
      const scopePattern = scope.type === 'custom_area' 
        ? 'custom_%'
        : `${scope.type}_${scope.value}_%`;

      // Note: This is a simplified approach. In production, you'd want more sophisticated cache invalidation
      await this.prisma.expansionCache.deleteMany({
        where: {
          scope: {
            contains: JSON.stringify(scope).substring(0, 50) // Partial match
          }
        }
      });
    } catch (error) {
      console.warn('Failed to clear cache', error);
    }
  }

  private estimateScopeArea(scope: ScopeSelection): number {
    // Simplified area estimation - in production, use actual geographic calculations
    const areaEstimates: Record<string, number> = {
      'US': 9833520,
      'CA': 9984670,
      'GB': 243610,
      'DE': 357022,
      'FR': 643801,
      'AU': 7692024,
      'JP': 377975,
      'SG': 719
    };

    if (scope.type === 'country') {
      return areaEstimates[scope.value] || 100000; // Default 100k km²
    } else if (scope.type === 'state') {
      return 100000; // Average US state size
    } else if (scope.area) {
      return scope.area;
    }

    return 50000; // Default fallback
  }

  private transformToSuggestion(tradeArea: any, params: ScopeQueryParams): ExpansionSuggestion {
    // Generate deterministic POIs based on location
    const poiOptions = ['Shopping Center', 'Transit Hub', 'University', 'Hospital', 'Office Complex', 'Residential Area'];
    const seed = parseInt(this.hashString(`${tradeArea.centroidLat}_${tradeArea.centroidLng}`), 10);
    const topPOIs = Array.from({ length: 3 }, (_, i) => 
      poiOptions[(seed + i) % poiOptions.length]
    );

    return {
      id: tradeArea.id,
      lat: tradeArea.centroidLat,
      lng: tradeArea.centroidLng,
      finalScore: tradeArea.finalScore,
      confidence: tradeArea.confidence,
      dataMode: params.dataMode,
      demandScore: tradeArea.demandScore,
      cannibalizationPenalty: tradeArea.competitionPenalty, // Map to new field name
      opsFitScore: 1 - tradeArea.supplyPenalty, // Convert penalty to score
      nearestSubwayDistance: tradeArea.existingStoreDist,
      topPOIs,
      cacheKey: this.generateCacheKey(params),
      modelVersion: tradeArea.modelVersion || 'v0.3',
      dataSnapshotDate: tradeArea.dataSnapshotDate?.toISOString() || new Date().toISOString()
    };
  }

  // Intelligence enhancement helper methods
  private calculateIntelligenceMetrics(suggestion: EnhancedSuggestion): EnhancedSuggestion {
    // Ensure intelligence score is properly calculated
    if (!suggestion.intelligenceScore || suggestion.intelligenceScore === 0) {
      suggestion.intelligenceScore = this.calculateFallbackIntelligenceScore(suggestion);
    }

    // Ensure credibility rating is set
    if (!suggestion.credibilityRating) {
      suggestion.credibilityRating = this.calculateCredibilityRating(
        suggestion.intelligenceScore,
        suggestion.demographicProfile?.confidence || 0.5
      );
    }

    // Determine executive readiness
    suggestion.executiveReadiness = 
      suggestion.credibilityRating === 'HIGH' && 
      suggestion.intelligenceScore > 0.7 &&
      suggestion.demographicProfile?.marketFitScore > 0.6;

    return suggestion;
  }

  private calculateFallbackIntelligenceScore(suggestion: EnhancedSuggestion): number {
    // Calculate a basic intelligence score from available data
    let score = 0.5; // Base score

    // Factor in original expansion metrics
    if (suggestion.finalScore) {
      score += suggestion.finalScore * 0.3;
    }

    if (suggestion.confidence) {
      score += suggestion.confidence * 0.2;
    }

    // Factor in demographic fit if available
    if (suggestion.demographicProfile?.marketFitScore) {
      score += suggestion.demographicProfile.marketFitScore * 0.3;
    }

    // Factor in viability if available
    if (suggestion.viabilityAssessment?.overallScore) {
      score += suggestion.viabilityAssessment.overallScore * 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  private calculateCredibilityRating(
    intelligenceScore: number,
    dataConfidence: number
  ): 'HIGH' | 'MEDIUM' | 'LOW' {
    const combinedScore = (intelligenceScore + dataConfidence) / 2;

    if (combinedScore >= 0.8) return 'HIGH';
    if (combinedScore >= 0.6) return 'MEDIUM';
    return 'LOW';
  }

  private createFallbackEnhancedSuggestion(suggestion: ExpansionSuggestion): EnhancedSuggestion {
    // Create a minimal enhanced suggestion when intelligence services are unavailable
    const fallbackIntelligence = {
      isCommercialArea: false, // Unknown
      distanceToTownCenter: -1, // Unknown
      nearbyCommercialFeatures: [],
      landUseType: 'mixed' as const,
      developmentPotential: 0.5 // Neutral score
    };

    const fallbackDemographic = {
      population: { total: 0, density: 0, growthRate: 0, urbanDensityIndex: 0 },
      ageDistribution: { under18: 0, age18to34: 0, age35to54: 0, age55plus: 0 },
      incomeDistribution: { 
        medianHouseholdIncome: 0, 
        averageDisposableIncome: 0, 
        incomeIndex: 0, 
        purchasingPower: 0 
      },
      lifestyleSegments: [],
      consumerBehavior: { 
        fastFoodFrequency: 0, 
        healthConsciousness: 0, 
        pricesensitivity: 0, 
        brandLoyalty: 0, 
        digitalEngagement: 0 
      },
      marketFitScore: 0.5, // Neutral score
      dataSource: 'ai_inferred' as const,
      confidence: 0.3 // Low confidence for fallback
    };

    const fallbackCompetitive = {
      nearbyCompetitors: [],
      marketSaturation: 0.5,
      cannibalizationRisk: {
        riskLevel: 'MEDIUM' as const,
        estimatedImpact: 0.5,
        affectedStores: [],
        mitigationStrategies: []
      },
      competitiveAdvantages: [],
      marketGapOpportunity: 0.5
    };

    const fallbackViability = {
      commercialViability: {
        score: 0.5,
        factors: { 
          zoning: 0.5, 
          landAvailability: 0.5, 
          constructionFeasibility: 0.5, 
          permitComplexity: 0.5 
        },
        estimatedDevelopmentCost: 500000,
        timeToOpen: 8
      },
      accessibility: {
        score: 0.5,
        factors: { 
          vehicleAccess: 0.5, 
          publicTransit: 0.5, 
          walkability: 0.5, 
          parking: 0.5 
        },
        nearestTransitDistance: 1000,
        walkingTrafficScore: 0.5
      },
      urbanContext: {
        score: 0.5,
        factors: { 
          populationDensity: 0.5, 
          commercialActivity: 0.5, 
          residentialProximity: 0.5, 
          employmentCenters: 0.5 
        },
        landUsePattern: 'unknown',
        developmentTrend: 'stable' as const
      },
      overallScore: 0.5,
      concerns: ['Intelligence enhancement unavailable - limited data'],
      strengths: []
    };

    const fallbackRationale = {
      primaryReasons: ['Location selected by algorithmic analysis'],
      addressedConcerns: ['Intelligence enhancement temporarily unavailable'],
      confidenceFactors: ['Basic expansion metrics support location selection'],
      riskMitigations: ['Standard due diligence recommended before development']
    };

    const intelligenceScore = this.calculateFallbackIntelligenceScore({
      ...suggestion,
      locationIntelligence: fallbackIntelligence,
      demographicProfile: fallbackDemographic,
      competitiveAnalysis: fallbackCompetitive,
      viabilityAssessment: fallbackViability,
      strategicRationale: fallbackRationale,
      intelligenceScore: 0,
      credibilityRating: 'LOW',
      executiveReadiness: false
    } as EnhancedSuggestion);

    return {
      ...suggestion,
      locationIntelligence: fallbackIntelligence,
      demographicProfile: fallbackDemographic,
      competitiveAnalysis: fallbackCompetitive,
      viabilityAssessment: fallbackViability,
      strategicRationale: fallbackRationale,
      intelligenceScore,
      credibilityRating: 'LOW',
      executiveReadiness: false
    };
  }

  private transformToRecommendation(tradeArea: any): ExpansionRecommendation {
    // Calculate predicted metrics based on gravity score and market data
    const baseAUV = 1000000; // Base AUV of $1M
    const scoreMultiplier = 0.5 + (tradeArea.finalScore * 1.5); // 0.5x to 2x multiplier
    const predictedAUV = Math.round(baseAUV * scoreMultiplier);
    
    // Payback period inversely related to score (higher score = faster payback)
    const basePaybackMonths = 36;
    const paybackPeriod = Math.round(basePaybackMonths * (2 - tradeArea.finalScore));
    
    return {
      id: tradeArea.id,
      lat: tradeArea.centroidLat,
      lng: tradeArea.centroidLng,
      region: tradeArea.region,
      country: tradeArea.country || undefined,
      finalScore: tradeArea.finalScore,
      confidence: tradeArea.confidence,
      isLive: tradeArea.isLive,
      demandScore: tradeArea.demandScore,
      competitionPenalty: tradeArea.competitionPenalty,
      supplyPenalty: tradeArea.supplyPenalty,
      population: tradeArea.population,
      footfallIndex: tradeArea.footfallIndex,
      incomeIndex: tradeArea.incomeIndex,
      predictedAUV,
      paybackPeriod
    };
  }
}