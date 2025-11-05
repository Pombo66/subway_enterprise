import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  CompetitiveAnalysisService as ICompetitiveAnalysisService,
  CompetitiveAnalysis,
  CannibalizationRisk,
  MarketGap,
  CompetitorStore,
  AffectedStore,
  Location,
  Store,
  ScopeSelection
} from '../../types/intelligence.types';
import { IntelligenceConfigManager } from '../../config/intelligence.config';

@Injectable()
export class CompetitiveAnalysisService implements ICompetitiveAnalysisService {
  private configManager: IntelligenceConfigManager;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 45 * 60 * 1000; // 45 minutes

  constructor(
    @Inject(PrismaClient) private readonly prisma: PrismaClient
  ) {
    this.configManager = IntelligenceConfigManager.getInstance();
  }

  async analyzeCompetitiveLandscape(
    lat: number, 
    lng: number, 
    analysisRadius: number = 2000
  ): Promise<CompetitiveAnalysis> {
    console.info('Analyzing competitive landscape', { lat, lng, analysisRadius });

    const cacheKey = this.generateCacheKey('competitive', lat, lng, analysisRadius);
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Find nearby competitors
      const nearbyCompetitors = await this.findNearbyCompetitors(lat, lng, analysisRadius);
      
      // Calculate market saturation
      const marketSaturation = await this.calculateMarketSaturation(lat, lng, analysisRadius, nearbyCompetitors);
      
      // Assess cannibalization risk (for existing Subway stores)
      const existingStores = await this.findExistingStores(lat, lng, analysisRadius);
      const cannibalizationRisk = await this.calculateCannibalizationRisk(
        { lat, lng, country: 'US' }, 
        existingStores
      );
      
      // Identify competitive advantages
      const competitiveAdvantages = await this.identifyCompetitiveAdvantages(
        lat, lng, nearbyCompetitors
      );
      
      // Calculate market gap opportunity
      const marketGapOpportunity = await this.calculateMarketGapOpportunity(
        lat, lng, analysisRadius, nearbyCompetitors, marketSaturation
      );

      const result: CompetitiveAnalysis = {
        nearbyCompetitors,
        marketSaturation,
        cannibalizationRisk,
        competitiveAdvantages,
        marketGapOpportunity
      };

      this.cacheData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to analyze competitive landscape:', error);
      return this.createFallbackCompetitiveAnalysis();
    }
  }

  async calculateCannibalizationRisk(
    newLocation: Location,
    existingStores: Store[]
  ): Promise<CannibalizationRisk> {
    console.info('Calculating cannibalization risk', { 
      lat: newLocation.lat, 
      lng: newLocation.lng,
      existingStoreCount: existingStores.length 
    });

    try {
      const affectedStores: AffectedStore[] = [];
      let totalEstimatedImpact = 0;
      let highRiskCount = 0;

      for (const store of existingStores) {
        const distance = this.calculateDistance(
          newLocation.lat, newLocation.lng,
          store.lat, store.lng
        );

        // Only consider stores within 5km for cannibalization
        if (distance <= 5000) {
          const impact = this.calculateRevenueImpact(distance, store.performance);
          
          if (impact > 0.05) { // More than 5% impact
            affectedStores.push({
              storeId: store.id,
              distance,
              estimatedRevenueImpact: impact * 100, // Convert to percentage
              currentPerformance: store.performance
            });

            totalEstimatedImpact += impact;
            
            if (impact > 0.15) { // More than 15% impact
              highRiskCount++;
            }
          }
        }
      }

      // Determine risk level
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
      if (highRiskCount > 0 || totalEstimatedImpact > 0.3) {
        riskLevel = 'HIGH';
      } else if (affectedStores.length > 2 || totalEstimatedImpact > 0.15) {
        riskLevel = 'MEDIUM';
      } else {
        riskLevel = 'LOW';
      }

      // Generate mitigation strategies
      const mitigationStrategies = this.generateMitigationStrategies(
        riskLevel, affectedStores, totalEstimatedImpact
      );

      return {
        riskLevel,
        estimatedImpact: Math.min(totalEstimatedImpact, 1), // Cap at 100%
        affectedStores,
        mitigationStrategies
      };
    } catch (error) {
      console.error('Failed to calculate cannibalization risk:', error);
      return this.createFallbackCannibalizationRisk();
    }
  }

  async identifyMarketGaps(
    region: ScopeSelection,
    competitorData: CompetitorStore[]
  ): Promise<MarketGap[]> {
    console.info('Identifying market gaps', { 
      region: region.type,
      competitorCount: competitorData.length 
    });

    try {
      const marketGaps: MarketGap[] = [];
      
      // Analyze competitor distribution to find gaps
      const gaps = await this.analyzeCompetitorDistribution(region, competitorData);
      
      for (const gap of gaps) {
        const opportunityScore = await this.calculateOpportunityScore(gap, competitorData);
        
        if (opportunityScore > 0.4) { // Only include significant opportunities
          marketGaps.push({
            lat: gap.lat,
            lng: gap.lng,
            opportunityScore,
            gapType: gap.gapType,
            description: gap.description,
            estimatedPotential: this.estimateRevenuePotential(opportunityScore, gap)
          });
        }
      }

      // Sort by opportunity score
      marketGaps.sort((a, b) => b.opportunityScore - a.opportunityScore);
      
      return marketGaps.slice(0, 10); // Return top 10 opportunities
    } catch (error) {
      console.error('Failed to identify market gaps:', error);
      return [];
    }
  }

  // Private helper methods
  private async findNearbyCompetitors(
    lat: number, 
    lng: number, 
    radius: number
  ): Promise<CompetitorStore[]> {
    // In a real implementation, this would query:
    // - Business directories (Google Places, Yelp)
    // - Competitor location databases
    // - Franchise disclosure documents
    // - Local business registrations

    const competitors: CompetitorStore[] = [];
    
    // Simulate competitor analysis based on location characteristics
    const urbanScore = this.calculateUrbanScore(lat, lng);
    const competitorDensity = this.estimateCompetitorDensity(urbanScore);
    
    // Generate realistic competitors
    const competitorTypes = [
      { brand: 'McDonald\'s', directCompetitor: true, marketShare: 0.25 },
      { brand: 'Burger King', directCompetitor: true, marketShare: 0.15 },
      { brand: 'KFC', directCompetitor: true, marketShare: 0.12 },
      { brand: 'Taco Bell', directCompetitor: true, marketShare: 0.10 },
      { brand: 'Chipotle', directCompetitor: true, marketShare: 0.08 },
      { brand: 'Pizza Hut', directCompetitor: false, marketShare: 0.06 },
      { brand: 'Domino\'s', directCompetitor: false, marketShare: 0.05 },
      { brand: 'Starbucks', directCompetitor: false, marketShare: 0.04 }
    ];

    const numCompetitors = Math.floor(competitorDensity * competitorTypes.length);
    
    for (let i = 0; i < numCompetitors; i++) {
      const competitorType = competitorTypes[i % competitorTypes.length];
      const distance = Math.random() * radius;
      const angle = Math.random() * 2 * Math.PI;
      
      // Calculate competitor location
      const competitorLat = lat + (distance / 111000) * Math.cos(angle);
      const competitorLng = lng + (distance / (111000 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
      
      competitors.push({
        brand: competitorType.brand,
        lat: competitorLat,
        lng: competitorLng,
        distance,
        estimatedRevenue: this.estimateCompetitorRevenue(competitorType.marketShare, urbanScore),
        marketShare: competitorType.marketShare,
        directCompetitor: competitorType.directCompetitor
      });
    }

    return competitors;
  }

  private async findExistingStores(
    lat: number, 
    lng: number, 
    radius: number
  ): Promise<Store[]> {
    try {
      // Query existing Subway stores from database
      const stores = await this.prisma.store.findMany({
        where: {
          latitude: {
            gte: lat - (radius / 111000),
            lte: lat + (radius / 111000)
          },
          longitude: {
            gte: lng - (radius / (111000 * Math.cos(lat * Math.PI / 180))),
            lte: lng + (radius / (111000 * Math.cos(lat * Math.PI / 180)))
          },
          status: 'ACTIVE'
        }
      });

      return stores.map(store => ({
        id: store.id,
        lat: store.latitude || 0,
        lng: store.longitude || 0,
        performance: this.calculateStorePerformance(store),
        revenue: store.annualTurnover || undefined,
        openDate: store.openedAt || new Date()
      }));
    } catch (error) {
      console.error('Failed to find existing stores:', error);
      return [];
    }
  }

  private calculateStorePerformance(store: any): number {
    // Calculate performance score based on available data
    let score = 0.5; // Base score
    
    if (store.annualTurnover) {
      // Normalize turnover to 0-1 scale (assuming $500k-$2M range)
      const normalizedTurnover = Math.min(store.annualTurnover / 2000000, 1);
      score = normalizedTurnover * 0.7 + 0.3;
    }
    
    return Math.max(0.1, Math.min(1, score));
  }

  private calculateMarketSaturation(
    lat: number, 
    lng: number, 
    radius: number, 
    competitors: CompetitorStore[]
  ): Promise<number> {
    // Calculate market saturation based on competitor density and market size
    const area = Math.PI * Math.pow(radius / 1000, 2); // Area in km²
    const competitorDensity = competitors.length / area;
    
    // Estimate market capacity based on population density
    const urbanScore = this.calculateUrbanScore(lat, lng);
    const estimatedPopulation = urbanScore * 50000; // Rough population estimate
    const marketCapacity = estimatedPopulation / 10000; // 1 QSR per 10k people
    
    const saturation = Math.min(competitorDensity / marketCapacity, 1);
    return Promise.resolve(Math.max(0, saturation));
  }

  private async identifyCompetitiveAdvantages(
    lat: number, 
    lng: number, 
    competitors: CompetitorStore[]
  ): Promise<string[]> {
    const advantages: string[] = [];
    
    // Analyze competitor landscape for advantages
    const directCompetitors = competitors.filter(c => c.directCompetitor);
    const nearbyCompetitors = competitors.filter(c => c.distance < 500);
    
    if (directCompetitors.length < 2) {
      advantages.push('Limited direct QSR competition in immediate area');
    }
    
    if (nearbyCompetitors.length === 0) {
      advantages.push('First-mover advantage in local market');
    }
    
    // Check for specific competitor gaps
    const hasSubwayNearby = competitors.some(c => c.brand === 'Subway' && c.distance < 1000);
    if (!hasSubwayNearby) {
      advantages.push('No existing Subway presence within 1km radius');
    }
    
    const hasPremiumCompetitors = competitors.some(c => 
      ['Chipotle', 'Panera'].includes(c.brand) && c.distance < 800
    );
    if (!hasPremiumCompetitors) {
      advantages.push('Opportunity to capture premium fast-casual segment');
    }
    
    // Location-based advantages
    const urbanScore = this.calculateUrbanScore(lat, lng);
    if (urbanScore > 0.7) {
      advantages.push('High foot traffic urban location');
    }
    
    return advantages;
  }

  private async calculateMarketGapOpportunity(
    lat: number, 
    lng: number, 
    radius: number, 
    competitors: CompetitorStore[], 
    marketSaturation: number
  ): Promise<number> {
    // Calculate opportunity score based on multiple factors
    let opportunityScore = 0;
    
    // Base opportunity from low saturation
    opportunityScore += (1 - marketSaturation) * 0.4;
    
    // Bonus for limited direct competition
    const directCompetitors = competitors.filter(c => c.directCompetitor && c.distance < 1000);
    if (directCompetitors.length === 0) {
      opportunityScore += 0.3;
    } else if (directCompetitors.length === 1) {
      opportunityScore += 0.2;
    }
    
    // Urban location bonus
    const urbanScore = this.calculateUrbanScore(lat, lng);
    opportunityScore += urbanScore * 0.2;
    
    // Distance from nearest competitor bonus
    const nearestCompetitor = competitors.reduce((nearest, competitor) => 
      competitor.distance < nearest.distance ? competitor : nearest,
      { distance: Infinity } as CompetitorStore
    );
    
    if (nearestCompetitor.distance > 1000) {
      opportunityScore += 0.1;
    }
    
    return Math.max(0, Math.min(1, opportunityScore));
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Haversine formula for calculating distance between two points
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateRevenueImpact(distance: number, storePerformance: number): number {
    // Calculate revenue impact based on distance and store performance
    if (distance > 5000) return 0; // No impact beyond 5km
    
    // Impact decreases with distance (inverse square law with minimum)
    const distanceImpact = Math.max(0.1, 1 - Math.pow(distance / 5000, 2));
    
    // Higher performing stores are more affected
    const performanceMultiplier = 0.5 + (storePerformance * 0.5);
    
    return distanceImpact * performanceMultiplier * 0.3; // Max 30% impact
  }

  private generateMitigationStrategies(
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
    affectedStores: AffectedStore[],
    totalImpact: number
  ): string[] {
    const strategies: string[] = [];
    
    if (riskLevel === 'HIGH') {
      strategies.push('Consider alternative location with greater distance from existing stores');
      strategies.push('Implement differentiated menu offerings to reduce direct competition');
      strategies.push('Focus on different customer segments (e.g., breakfast, catering)');
    }
    
    if (riskLevel === 'MEDIUM' || riskLevel === 'HIGH') {
      strategies.push('Coordinate marketing efforts to avoid direct competition');
      strategies.push('Consider smaller format or specialized concept');
    }
    
    if (affectedStores.length > 0) {
      strategies.push('Monitor affected store performance and adjust operations accordingly');
      strategies.push('Implement loyalty programs to retain customers across locations');
    }
    
    if (strategies.length === 0) {
      strategies.push('Minimal cannibalization risk - proceed with standard operations');
    }
    
    return strategies;
  }

  // Analysis helper methods
  private async analyzeCompetitorDistribution(
    region: ScopeSelection,
    competitors: CompetitorStore[]
  ): Promise<Array<{
    lat: number;
    lng: number;
    gapType: 'underserved' | 'competitor_weak' | 'demographic_match';
    description: string;
  }>> {
    // Simplified gap analysis - in reality would use sophisticated spatial analysis
    const gaps = [];
    
    // Create a grid and analyze each cell for gaps
    const gridSize = 0.01; // Roughly 1km
    const bounds = this.calculateRegionBounds(region);
    
    for (let lat = bounds.minLat; lat < bounds.maxLat; lat += gridSize) {
      for (let lng = bounds.minLng; lng < bounds.maxLng; lng += gridSize) {
        const nearbyCompetitors = competitors.filter(c => 
          this.calculateDistance(lat, lng, c.lat, c.lng) < 2000
        );
        
        if (nearbyCompetitors.length < 2) {
          gaps.push({
            lat,
            lng,
            gapType: 'underserved' as const,
            description: 'Underserved area with limited QSR options'
          });
        }
      }
    }
    
    return gaps.slice(0, 20); // Limit to top 20 gaps
  }

  private calculateRegionBounds(region: ScopeSelection): {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } {
    // Simplified bounds calculation - in reality would use actual geographic data
    return {
      minLat: 40.0,
      maxLat: 41.0,
      minLng: -75.0,
      maxLng: -73.0
    };
  }

  private async calculateOpportunityScore(
    gap: any,
    competitors: CompetitorStore[]
  ): Promise<number> {
    const nearbyCompetitors = competitors.filter(c => 
      this.calculateDistance(gap.lat, gap.lng, c.lat, c.lng) < 3000
    );
    
    // Higher score for fewer nearby competitors
    const competitionScore = Math.max(0, 1 - (nearbyCompetitors.length / 5));
    
    // Urban score bonus
    const urbanScore = this.calculateUrbanScore(gap.lat, gap.lng);
    
    return (competitionScore * 0.7 + urbanScore * 0.3);
  }

  private estimateRevenuePotential(opportunityScore: number, gap: any): number {
    // Estimate annual revenue potential
    const baseRevenue = 800000; // $800k base
    const opportunityMultiplier = 0.5 + (opportunityScore * 1.5);
    
    return Math.round(baseRevenue * opportunityMultiplier);
  }

  // Utility methods
  private calculateUrbanScore(lat: number, lng: number): number {
    // Simple heuristic - in reality would use actual urban density data
    const latAbs = Math.abs(lat);
    const lngAbs = Math.abs(lng);
    const baseScore = Math.random() * 0.4 + 0.3;
    const coordinateBonus = (latAbs + lngAbs) % 1;
    return Math.min(1, baseScore + coordinateBonus * 0.3);
  }

  private estimateCompetitorDensity(urbanScore: number): number {
    // Higher urban score = more competitors
    return Math.min(1, urbanScore * 1.2);
  }

  private estimateCompetitorRevenue(marketShare: number, urbanScore: number): number {
    const baseRevenue = 1000000; // $1M base
    const marketMultiplier = marketShare * 4; // Scale by market share
    const urbanMultiplier = 0.5 + (urbanScore * 1.5);
    
    return Math.round(baseRevenue * marketMultiplier * urbanMultiplier);
  }

  // Fallback methods
  private createFallbackCompetitiveAnalysis(): CompetitiveAnalysis {
    return {
      nearbyCompetitors: [],
      marketSaturation: 0.5,
      cannibalizationRisk: this.createFallbackCannibalizationRisk(),
      competitiveAdvantages: ['Standard market conditions'],
      marketGapOpportunity: 0.5
    };
  }

  private createFallbackCannibalizationRisk(): CannibalizationRisk {
    return {
      riskLevel: 'MEDIUM',
      estimatedImpact: 0.1,
      affectedStores: [],
      mitigationStrategies: ['Monitor market conditions and adjust strategy as needed']
    };
  }

  // Cache management
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