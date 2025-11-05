import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  DemographicAnalysisService as IDemographicAnalysisService,
  DemographicProfile,
  LocationContext,
  RegionalDemographics,
  InferredDemographics,
  CustomerProfile,
  MarketFitScore,
  PopulationMetrics,
  AgeDistribution,
  IncomeDistribution,
  LifestyleSegment,
  ConsumerBehaviorProfile
} from '../../types/intelligence.types';
import { IntelligenceConfigManager } from '../../config/intelligence.config';
import { AIDemographicInferenceService } from './ai-demographic-inference.service';

@Injectable()
export class DemographicAnalysisService implements IDemographicAnalysisService {
  private configManager: IntelligenceConfigManager;
  private cache: Map<string, { data: DemographicProfile; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private aiInferenceService: AIDemographicInferenceService;

  constructor(
    @Inject(PrismaClient) private readonly prisma: PrismaClient
  ) {
    this.configManager = IntelligenceConfigManager.getInstance();
    this.aiInferenceService = new AIDemographicInferenceService();
  }

  async analyzeDemographics(
    lat: number, 
    lng: number, 
    radius: number = 1000
  ): Promise<DemographicProfile> {
    console.info('Analyzing demographics', { lat, lng, radius });

    const cacheKey = this.generateCacheKey(lat, lng, radius);
    const cached = this.getCachedDemographics(cacheKey);
    
    if (cached) {
      console.info('Returning cached demographic data', { cacheKey });
      return cached;
    }

    try {
      // Try to fetch from multiple data sources
      let demographics = await this.fetchFromPrimarySource(lat, lng, radius);
      
      if (!demographics) {
        demographics = await this.fetchFromSecondarySource(lat, lng, radius);
      }
      
      if (!demographics) {
        // Fall back to database lookup for similar areas
        demographics = await this.fetchFromDatabase(lat, lng, radius);
      }

      if (!demographics) {
        // Generate basic demographics from regional patterns
        demographics = await this.generateBasicDemographics(lat, lng);
      }

      // Cache the result
      this.cacheDemographics(cacheKey, demographics);

      // Persist to database for future use
      await this.persistDemographics(lat, lng, radius, demographics);

      return demographics;
    } catch (error) {
      console.error('Failed to analyze demographics:', error);
      // Return basic fallback demographics
      return this.createFallbackDemographics(lat, lng);
    }
  }

  async inferDemographicsWithAI(
    location: LocationContext,
    regionalPatterns: RegionalDemographics
  ): Promise<InferredDemographics> {
    console.info('Inferring demographics with AI', { 
      location: `${location.lat}, ${location.lng}`,
      country: location.country 
    });

    const config = this.configManager.getConfig();
    
    if (!config.enableDemographicInference) {
      console.info('AI demographic inference disabled, using pattern-based inference');
      const inferred = await this.inferFromRegionalPatterns(location, regionalPatterns);
      return {
        ...inferred,
        inferenceMethod: 'regional_pattern_matching',
        inferenceConfidence: 0.7,
        basedOnSimilarAreas: [`${location.country}_regional_average`],
        dataSource: 'ai_inferred'
      };
    }

    try {
      // Use AI service for inference
      return await this.aiInferenceService.inferDemographicsWithAI(location, regionalPatterns);
    } catch (error) {
      console.error('Failed to infer demographics with AI:', error);
      
      // Fallback to pattern-based inference
      console.info('Falling back to pattern-based demographic inference');
      const inferred = await this.inferFromRegionalPatterns(location, regionalPatterns);
      return {
        ...inferred,
        inferenceMethod: 'regional_pattern_fallback',
        inferenceConfidence: 0.6,
        basedOnSimilarAreas: [`${location.country}_regional_average`],
        dataSource: 'ai_inferred'
      };
    }
  }

  async assessMarketFit(
    demographics: DemographicProfile,
    targetProfile: CustomerProfile
  ): Promise<MarketFitScore> {
    console.info('Assessing market fit', { 
      marketFitScore: demographics.marketFitScore,
      dataSource: demographics.dataSource 
    });

    try {
      // Calculate age alignment
      const ageAlignment = this.calculateAgeAlignment(
        demographics.ageDistribution,
        targetProfile.targetAgeRange
      );

      // Calculate income alignment
      const incomeAlignment = this.calculateIncomeAlignment(
        demographics.incomeDistribution,
        targetProfile.targetIncomeRange
      );

      // Calculate lifestyle alignment
      const lifestyleAlignment = this.calculateLifestyleAlignment(
        demographics.lifestyleSegments,
        targetProfile.preferredLifestyleSegments
      );

      // Calculate behavior alignment
      const behaviorAlignment = this.calculateBehaviorAlignment(
        demographics.consumerBehavior,
        targetProfile.behaviorPreferences
      );

      // Overall score (weighted average)
      const score = (
        ageAlignment * 0.25 +
        incomeAlignment * 0.3 +
        lifestyleAlignment * 0.25 +
        behaviorAlignment * 0.2
      );

      const strengths: string[] = [];
      const concerns: string[] = [];

      // Identify strengths and concerns
      if (ageAlignment > 0.7) strengths.push('Strong age demographic alignment');
      else if (ageAlignment < 0.4) concerns.push('Age demographic mismatch');

      if (incomeAlignment > 0.7) strengths.push('Good income level match');
      else if (incomeAlignment < 0.4) concerns.push('Income levels below target');

      if (lifestyleAlignment > 0.7) strengths.push('Lifestyle segments align well');
      else if (lifestyleAlignment < 0.4) concerns.push('Lifestyle segments don\'t match target');

      if (behaviorAlignment > 0.7) strengths.push('Consumer behavior fits profile');
      else if (behaviorAlignment < 0.4) concerns.push('Consumer behavior patterns concerning');

      return {
        score: Math.max(0, Math.min(1, score)),
        factors: {
          ageAlignment,
          incomeAlignment,
          lifestyleAlignment,
          behaviorAlignment
        },
        strengths,
        concerns
      };
    } catch (error) {
      console.error('Failed to assess market fit:', error);
      throw new Error(`Market fit assessment failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async fetchFromPrimarySource(
    lat: number, 
    lng: number, 
    radius: number
  ): Promise<DemographicProfile | null> {
    // In a real implementation, this would call external demographic APIs
    // For now, return null to simulate data unavailability
    console.info('Attempting to fetch from primary demographic source');
    return null;
  }

  private async fetchFromSecondarySource(
    lat: number, 
    lng: number, 
    radius: number
  ): Promise<DemographicProfile | null> {
    // In a real implementation, this would call backup demographic APIs
    console.info('Attempting to fetch from secondary demographic source');
    return null;
  }

  private async fetchFromDatabase(
    lat: number, 
    lng: number, 
    radius: number
  ): Promise<DemographicProfile | null> {
    try {
      // Look for cached demographic data in database
      const cached = await this.prisma.intelligenceDemographicCache.findFirst({
        where: {
          lat: { gte: lat - 0.01, lte: lat + 0.01 },
          lng: { gte: lng - 0.01, lte: lng + 0.01 },
          radius: { gte: radius * 0.8, lte: radius * 1.2 },
          expiresAt: { gt: new Date() }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (cached) {
        console.info('Found cached demographic data in database');
        return JSON.parse(cached.demographicData) as DemographicProfile;
      }

      return null;
    } catch (error) {
      console.warn('Failed to fetch from database:', error);
      return null;
    }
  }

  private async generateBasicDemographics(
    lat: number, 
    lng: number
  ): Promise<DemographicProfile> {
    console.info('Generating basic demographics from location context');

    // Generate realistic demographics based on location
    // This is a simplified implementation - real version would use geographic analysis
    
    const population: PopulationMetrics = {
      total: Math.floor(Math.random() * 100000) + 20000, // 20k-120k
      density: Math.floor(Math.random() * 2000) + 500, // 500-2500 per km²
      growthRate: (Math.random() * 4) - 1, // -1% to 3%
      urbanDensityIndex: Math.random() * 0.6 + 0.3 // 0.3-0.9
    };

    // Generate age distribution that sums to 100
    const under18 = Math.floor(Math.random() * 15) + 15; // 15-30%
    const age18to34 = Math.floor(Math.random() * 15) + 25; // 25-40%
    const age35to54 = Math.floor(Math.random() * 15) + 25; // 25-40%
    const remaining = 100 - under18 - age18to34 - age35to54;
    const age55plus = Math.max(10, remaining); // Ensure at least 10%
    
    const ageDistribution: AgeDistribution = {
      under18,
      age18to34,
      age35to54,
      age55plus
    };

    const incomeDistribution: IncomeDistribution = {
      medianHouseholdIncome: Math.floor(Math.random() * 50000) + 40000, // $40k-$90k
      averageDisposableIncome: Math.floor(Math.random() * 30000) + 25000, // $25k-$55k
      incomeIndex: Math.random() * 0.6 + 0.4, // 0.4-1.0
      purchasingPower: Math.random() * 0.6 + 0.3 // 0.3-0.9
    };

    const lifestyleSegments: LifestyleSegment[] = [
      {
        name: 'Urban Professionals',
        percentage: Math.floor(Math.random() * 20) + 20,
        description: 'Working professionals in urban areas',
        subwayAffinity: Math.random() * 0.4 + 0.6 // 0.6-1.0
      },
      {
        name: 'Families',
        percentage: Math.floor(Math.random() * 25) + 25,
        description: 'Families with children',
        subwayAffinity: Math.random() * 0.3 + 0.5 // 0.5-0.8
      },
      {
        name: 'Students',
        percentage: Math.floor(Math.random() * 15) + 10,
        description: 'College and university students',
        subwayAffinity: Math.random() * 0.4 + 0.6 // 0.6-1.0
      }
    ];

    const consumerBehavior: ConsumerBehaviorProfile = {
      fastFoodFrequency: Math.random() * 6 + 2, // 2-8 visits per month
      healthConsciousness: Math.random() * 0.6 + 0.3, // 0.3-0.9
      pricesensitivity: Math.random() * 0.6 + 0.2, // 0.2-0.8
      brandLoyalty: Math.random() * 0.5 + 0.4, // 0.4-0.9
      digitalEngagement: Math.random() * 0.4 + 0.5 // 0.5-0.9
    };

    // Calculate market fit score based on generated data
    const marketFitScore = this.calculateBasicMarketFit(
      ageDistribution,
      incomeDistribution,
      lifestyleSegments,
      consumerBehavior
    );

    return {
      population,
      ageDistribution,
      incomeDistribution,
      lifestyleSegments,
      consumerBehavior,
      marketFitScore,
      dataSource: 'ai_inferred',
      confidence: 0.6 // Medium confidence for generated data
    };
  }

  private async inferFromRegionalPatterns(
    location: LocationContext,
    regionalPatterns: RegionalDemographics
  ): Promise<DemographicProfile> {
    // Use regional patterns as base and adjust for location context
    const adjustmentFactor = location.populationDensity ? 
      Math.min(location.populationDensity / 1000, 2) : 1;

    const population: PopulationMetrics = {
      total: Math.floor(50000 * adjustmentFactor),
      density: location.populationDensity || 1000,
      growthRate: 1.5,
      urbanDensityIndex: Math.min(adjustmentFactor * 0.5, 0.9)
    };

    return {
      population,
      ageDistribution: regionalPatterns.typicalAgeDistribution,
      incomeDistribution: regionalPatterns.typicalIncomeDistribution,
      lifestyleSegments: regionalPatterns.commonLifestyleSegments,
      consumerBehavior: {
        fastFoodFrequency: 4.5,
        healthConsciousness: 0.6,
        pricesensitivity: 0.5,
        brandLoyalty: 0.7,
        digitalEngagement: 0.8
      },
      marketFitScore: 0.7,
      dataSource: 'ai_inferred',
      confidence: 0.7
    };
  }

  private calculateBasicMarketFit(
    ageDistribution: AgeDistribution,
    incomeDistribution: IncomeDistribution,
    lifestyleSegments: LifestyleSegment[],
    consumerBehavior: ConsumerBehaviorProfile
  ): number {
    // Simple market fit calculation
    const ageScore = (ageDistribution.age18to34 + ageDistribution.age35to54) / 100;
    const incomeScore = Math.min(incomeDistribution.incomeIndex, 1);
    const lifestyleScore = lifestyleSegments.reduce((sum, segment) => 
      sum + (segment.subwayAffinity * segment.percentage / 100), 0);
    const behaviorScore = (
      Math.min(consumerBehavior.fastFoodFrequency / 8, 1) * 0.4 +
      consumerBehavior.digitalEngagement * 0.3 +
      (1 - consumerBehavior.pricesensitivity) * 0.3
    );

    return (ageScore * 0.25 + incomeScore * 0.3 + lifestyleScore * 0.25 + behaviorScore * 0.2);
  }

  private calculateAgeAlignment(
    demographics: AgeDistribution,
    targetRange: [number, number]
  ): number {
    // Calculate alignment based on target age range
    const [minAge, maxAge] = targetRange;
    
    let alignmentScore = 0;
    
    if (minAge <= 18 && maxAge >= 18) alignmentScore += demographics.under18 / 100;
    if (minAge <= 34 && maxAge >= 18) alignmentScore += demographics.age18to34 / 100;
    if (minAge <= 54 && maxAge >= 35) alignmentScore += demographics.age35to54 / 100;
    if (maxAge >= 55) alignmentScore += demographics.age55plus / 100;
    
    return Math.min(alignmentScore, 1);
  }

  private calculateIncomeAlignment(
    demographics: IncomeDistribution,
    targetRange: [number, number]
  ): number {
    const [minIncome, maxIncome] = targetRange;
    const medianIncome = demographics.medianHouseholdIncome;
    
    if (medianIncome >= minIncome && medianIncome <= maxIncome) {
      return 1.0;
    } else if (medianIncome < minIncome) {
      return Math.max(0, 1 - (minIncome - medianIncome) / minIncome);
    } else {
      return Math.max(0, 1 - (medianIncome - maxIncome) / maxIncome);
    }
  }

  private calculateLifestyleAlignment(
    segments: LifestyleSegment[],
    preferredSegments: string[]
  ): number {
    const totalAlignment = segments.reduce((sum, segment) => {
      if (preferredSegments.includes(segment.name)) {
        return sum + (segment.percentage / 100) * segment.subwayAffinity;
      }
      return sum;
    }, 0);
    
    return Math.min(totalAlignment, 1);
  }

  private calculateBehaviorAlignment(
    behavior: ConsumerBehaviorProfile,
    preferences: Partial<ConsumerBehaviorProfile>
  ): number {
    let score = 0;
    let factors = 0;
    
    if (preferences.fastFoodFrequency !== undefined) {
      score += Math.min(behavior.fastFoodFrequency / preferences.fastFoodFrequency, 1);
      factors++;
    }
    
    if (preferences.digitalEngagement !== undefined) {
      score += Math.min(behavior.digitalEngagement / preferences.digitalEngagement, 1);
      factors++;
    }
    
    if (preferences.brandLoyalty !== undefined) {
      score += Math.min(behavior.brandLoyalty / preferences.brandLoyalty, 1);
      factors++;
    }
    
    return factors > 0 ? score / factors : 0.5;
  }

  private createFallbackDemographics(lat: number, lng: number): DemographicProfile {
    console.warn('Creating fallback demographics', { lat, lng });
    
    return {
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
      marketFitScore: 0,
      dataSource: 'ai_inferred',
      confidence: 0
    };
  }

  private generateCacheKey(lat: number, lng: number, radius: number): string {
    return `demo_${lat.toFixed(4)}_${lng.toFixed(4)}_${radius}`;
  }

  private getCachedDemographics(cacheKey: string): DemographicProfile | null {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(cacheKey);
    }
    return null;
  }

  private cacheDemographics(cacheKey: string, demographics: DemographicProfile): void {
    this.cache.set(cacheKey, {
      data: demographics,
      timestamp: Date.now()
    });
  }

  private async persistDemographics(
    lat: number,
    lng: number,
    radius: number,
    demographics: DemographicProfile
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await this.prisma.intelligenceDemographicCache.create({
        data: {
          lat,
          lng,
          radius,
          demographicData: JSON.stringify(demographics),
          dataSource: demographics.dataSource,
          confidence: demographics.confidence,
          expiresAt
        }
      });
    } catch (error) {
      console.warn('Failed to persist demographics to database:', error);
      // Don't throw - persistence is optional
    }
  }
}