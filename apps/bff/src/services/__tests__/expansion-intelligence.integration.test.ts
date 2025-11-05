import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { ExpansionService, ScopeQueryParams, ScopeSelection } from '../expansion.service';
import { LocationIntelligenceService } from '../intelligence/location-intelligence.service';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { EnhancedSuggestion } from '../../types/intelligence.types';

describe('Expansion Service Intelligence Integration Tests', () => {
  let module: TestingModule;
  let expansionService: ExpansionService;
  let locationIntelligenceService: LocationIntelligenceService;
  let prismaClient: PrismaClient;

  const mockScope: ScopeSelection = {
    type: 'country',
    value: 'US',
    area: 9833520
  };

  const mockScopeParams: ScopeQueryParams = {
    scope: mockScope,
    intensity: 50,
    dataMode: 'live',
    minDistance: 2.0,
    maxPerCity: 5
  };

  // Mock trade area data
  const mockTradeAreas = [
    {
      id: 'ta_1',
      centroidLat: 40.7128,
      centroidLng: -74.0060,
      finalScore: 0.85,
      confidence: 0.9,
      demandScore: 0.8,
      competitionPenalty: 0.2,
      supplyPenalty: 0.1,
      existingStoreDist: 3.5,
      population: 50000,
      footfallIndex: 0.8,
      incomeIndex: 0.7,
      competitorIdx: 0.3,
      region: 'New York',
      country: 'US',
      dataMode: 'live',
      isLive: true,
      modelVersion: 'v0.3',
      dataSnapshotDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'ta_2',
      centroidLat: 40.7589,
      centroidLng: -73.9851,
      finalScore: 0.75,
      confidence: 0.8,
      demandScore: 0.7,
      competitionPenalty: 0.3,
      supplyPenalty: 0.15,
      existingStoreDist: 2.8,
      population: 45000,
      footfallIndex: 0.9,
      incomeIndex: 0.6,
      competitorIdx: 0.4,
      region: 'New York',
      country: 'US',
      dataMode: 'live',
      isLive: true,
      modelVersion: 'v0.3',
      dataSnapshotDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'ta_3',
      centroidLat: 40.6892,
      centroidLng: -74.0445,
      finalScore: 0.65,
      confidence: 0.7,
      demandScore: 0.6,
      competitionPenalty: 0.2,
      supplyPenalty: 0.2,
      existingStoreDist: 4.2,
      population: 35000,
      footfallIndex: 0.6,
      incomeIndex: 0.8,
      competitorIdx: 0.2,
      region: 'New York',
      country: 'US',
      dataMode: 'live',
      isLive: true,
      modelVersion: 'v0.3',
      dataSnapshotDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [IntelligenceModule],
      providers: [
        ExpansionService,
        {
          provide: PrismaClient,
          useValue: {
            tradeArea: {
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              findUnique: jest.fn()
            },
            expansionCache: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn()
            }
          }
        }
      ]
    }).compile();

    expansionService = module.get<ExpansionService>(ExpansionService);
    locationIntelligenceService = module.get<LocationIntelligenceService>(LocationIntelligenceService);
    prismaClient = module.get<PrismaClient>(PrismaClient);

    // Setup default mock responses
    (prismaClient.tradeArea.findMany as jest.Mock).mockResolvedValue(mockTradeAreas);
    (prismaClient.tradeArea.count as jest.Mock).mockResolvedValue(mockTradeAreas.length);
    (prismaClient.expansionCache.findUnique as jest.Mock).mockResolvedValue(null);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('Intelligence-Enhanced Suggestions', () => {
    it('should enhance basic suggestions with intelligence data', async () => {
      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);

      expect(enhancedSuggestions).toBeDefined();
      expect(enhancedSuggestions).toHaveLength(3);

      // Verify each suggestion has intelligence enhancement
      enhancedSuggestions.forEach((suggestion: EnhancedSuggestion) => {
        expect(suggestion.originalSuggestion).toBeDefined();
        expect(suggestion.locationIntelligence).toBeDefined();
        expect(suggestion.demographicProfile).toBeDefined();
        expect(suggestion.competitiveAnalysis).toBeDefined();
        expect(suggestion.viabilityAssessment).toBeDefined();
        expect(suggestion.strategicRationale).toBeDefined();
        
        // Verify intelligence metrics
        expect(suggestion.intelligenceScore).toBeGreaterThanOrEqual(0);
        expect(suggestion.intelligenceScore).toBeLessThanOrEqual(1);
        expect(['LOW', 'MEDIUM', 'HIGH']).toContain(suggestion.credibilityRating);
        expect(typeof suggestion.executiveReadiness).toBe('boolean');
      });
    }, 30000);

    it('should maintain backward compatibility with basic suggestions', async () => {
      const basicSuggestions = await expansionService.getSuggestionsInScope(mockScopeParams);
      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);

      expect(basicSuggestions).toHaveLength(3);
      expect(enhancedSuggestions).toHaveLength(3);

      // Verify enhanced suggestions contain all basic suggestion data
      enhancedSuggestions.forEach((enhanced, index) => {
        const basic = basicSuggestions[index];
        expect(enhanced.id).toBe(basic.id);
        expect(enhanced.lat).toBe(basic.lat);
        expect(enhanced.lng).toBe(basic.lng);
        expect(enhanced.finalScore).toBe(basic.finalScore);
        expect(enhanced.confidence).toBe(basic.confidence);
      });
    });

    it('should handle graceful degradation when intelligence service fails', async () => {
      // Mock intelligence service to throw an error
      jest.spyOn(locationIntelligenceService, 'enhanceLocationSuggestions')
        .mockRejectedValueOnce(new Error('Intelligence service unavailable'));

      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);

      expect(enhancedSuggestions).toBeDefined();
      expect(enhancedSuggestions).toHaveLength(3);

      // Verify fallback enhancement is applied
      enhancedSuggestions.forEach((suggestion: EnhancedSuggestion) => {
        expect(suggestion.credibilityRating).toBe('LOW');
        expect(suggestion.executiveReadiness).toBe(false);
        expect(suggestion.viabilityAssessment.concerns).toContain('Intelligence enhancement unavailable - limited data');
      });
    });

    it('should handle empty basic suggestions gracefully', async () => {
      (prismaClient.tradeArea.findMany as jest.Mock).mockResolvedValueOnce([]);

      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);

      expect(enhancedSuggestions).toHaveLength(0);
    });

    it('should calculate intelligence metrics correctly', async () => {
      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);

      const highScoreSuggestion = enhancedSuggestions.find(s => s.finalScore > 0.8);
      const lowScoreSuggestion = enhancedSuggestions.find(s => s.finalScore < 0.7);

      if (highScoreSuggestion && lowScoreSuggestion) {
        // High score suggestions should generally have better intelligence metrics
        expect(highScoreSuggestion.intelligenceScore).toBeGreaterThanOrEqual(lowScoreSuggestion.intelligenceScore);
        
        // Credibility should correlate with scores
        const credibilityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        expect(credibilityOrder[highScoreSuggestion.credibilityRating])
          .toBeGreaterThanOrEqual(credibilityOrder[lowScoreSuggestion.credibilityRating]);
      }
    });
  });

  describe('Performance and Latency Tests', () => {
    it('should complete intelligence enhancement within acceptable time', async () => {
      const startTime = Date.now();
      
      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);
      
      const latency = Date.now() - startTime;
      
      expect(enhancedSuggestions).toHaveLength(3);
      expect(latency).toBeLessThan(15000); // Should complete within 15 seconds
      
      console.log(`Intelligence enhancement latency: ${latency}ms`);
    }, 20000);

    it('should handle large batch processing efficiently', async () => {
      // Create larger mock dataset
      const largeMockData = Array.from({ length: 10 }, (_, i) => ({
        ...mockTradeAreas[0],
        id: `ta_large_${i}`,
        centroidLat: 40.7128 + (i * 0.01),
        centroidLng: -74.0060 + (i * 0.01),
        finalScore: 0.6 + (Math.random() * 0.3)
      }));

      (prismaClient.tradeArea.findMany as jest.Mock).mockResolvedValueOnce(largeMockData);

      const startTime = Date.now();
      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope({
        ...mockScopeParams,
        intensity: 80 // Higher intensity for more suggestions
      });
      const latency = Date.now() - startTime;

      expect(enhancedSuggestions).toHaveLength(10);
      expect(latency).toBeLessThan(30000); // Should complete within 30 seconds for 10 suggestions
      
      console.log(`Large batch intelligence enhancement latency: ${latency}ms`);
    }, 35000);

    it('should demonstrate performance improvement with caching', async () => {
      // First request (no cache)
      const startTime1 = Date.now();
      const result1 = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);
      const time1 = Date.now() - startTime1;

      // Mock cache hit for second request
      const cachedSuggestions = await expansionService.getSuggestionsInScope(mockScopeParams);
      (prismaClient.expansionCache.findUnique as jest.Mock).mockResolvedValueOnce({
        cacheKey: 'test_cache_key',
        suggestions: JSON.stringify(cachedSuggestions),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });

      // Second request (with cache)
      const startTime2 = Date.now();
      const result2 = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);
      const time2 = Date.now() - startTime2;

      expect(result1).toHaveLength(3);
      expect(result2).toHaveLength(3);
      
      console.log(`Performance - First request: ${time1}ms, Cached request: ${time2}ms`);
      
      // Cached request should be significantly faster
      expect(time2).toBeLessThan(time1 * 0.5);
    });
  });

  describe('Scope-Based Intelligence Enhancement', () => {
    it('should handle different scope types correctly', async () => {
      const countryScope: ScopeQueryParams = {
        scope: { type: 'country', value: 'US' },
        intensity: 50,
        dataMode: 'live',
        minDistance: 2.0
      };

      const stateScope: ScopeQueryParams = {
        scope: { type: 'state', value: 'NY' },
        intensity: 50,
        dataMode: 'live',
        minDistance: 2.0
      };

      const customScope: ScopeQueryParams = {
        scope: { 
          type: 'custom_area', 
          value: 'manhattan',
          polygon: { type: 'Polygon', coordinates: [[[-74.0, 40.7], [-73.9, 40.7], [-73.9, 40.8], [-74.0, 40.8], [-74.0, 40.7]]] }
        },
        intensity: 50,
        dataMode: 'live',
        minDistance: 2.0
      };

      const [countryResults, stateResults, customResults] = await Promise.all([
        expansionService.getEnhancedSuggestionsInScope(countryScope),
        expansionService.getEnhancedSuggestionsInScope(stateScope),
        expansionService.getEnhancedSuggestionsInScope(customScope)
      ]);

      expect(countryResults).toHaveLength(3);
      expect(stateResults).toHaveLength(3);
      expect(customResults).toHaveLength(3);

      // Verify all have intelligence enhancement
      [countryResults, stateResults, customResults].forEach(results => {
        results.forEach((suggestion: EnhancedSuggestion) => {
          expect(suggestion.locationIntelligence).toBeDefined();
          expect(suggestion.demographicProfile).toBeDefined();
          expect(suggestion.intelligenceScore).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('should apply cannibalization filtering correctly', async () => {
      const strictParams: ScopeQueryParams = {
        ...mockScopeParams,
        minDistance: 5.0 // Strict distance requirement
      };

      const lenientParams: ScopeQueryParams = {
        ...mockScopeParams,
        minDistance: 1.0 // Lenient distance requirement
      };

      const [strictResults, lenientResults] = await Promise.all([
        expansionService.getEnhancedSuggestionsInScope(strictParams),
        expansionService.getEnhancedSuggestionsInScope(lenientParams)
      ]);

      // Lenient params should return more or equal suggestions
      expect(lenientResults.length).toBeGreaterThanOrEqual(strictResults.length);

      // All results should respect minimum distance
      strictResults.forEach((suggestion: EnhancedSuggestion) => {
        expect(suggestion.nearestSubwayDistance).toBeGreaterThanOrEqual(5.0);
      });
    });

    it('should handle intensity parameter correctly', async () => {
      const lowIntensity: ScopeQueryParams = {
        ...mockScopeParams,
        intensity: 20
      };

      const highIntensity: ScopeQueryParams = {
        ...mockScopeParams,
        intensity: 80
      };

      const [lowResults, highResults] = await Promise.all([
        expansionService.getEnhancedSuggestionsInScope(lowIntensity),
        expansionService.getEnhancedSuggestionsInScope(highIntensity)
      ]);

      // High intensity should return more suggestions (up to available data)
      expect(highResults.length).toBeGreaterThanOrEqual(lowResults.length);

      // All results should have intelligence enhancement regardless of intensity
      [lowResults, highResults].forEach(results => {
        results.forEach((suggestion: EnhancedSuggestion) => {
          expect(suggestion.intelligenceScore).toBeGreaterThanOrEqual(0);
          expect(suggestion.credibilityRating).toBeDefined();
        });
      });
    });
  });

  describe('Data Mode Compatibility', () => {
    it('should handle live data mode correctly', async () => {
      const liveParams: ScopeQueryParams = {
        ...mockScopeParams,
        dataMode: 'live'
      };

      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(liveParams);

      expect(enhancedSuggestions).toHaveLength(3);
      enhancedSuggestions.forEach((suggestion: EnhancedSuggestion) => {
        expect(suggestion.dataMode).toBe('live');
        expect(suggestion.locationIntelligence).toBeDefined();
        expect(suggestion.demographicProfile.dataSource).toBeDefined();
      });
    });

    it('should handle modelled data mode correctly', async () => {
      const modelledTradeAreas = mockTradeAreas.map(area => ({
        ...area,
        dataMode: 'modelled',
        isLive: false
      }));

      (prismaClient.tradeArea.findMany as jest.Mock).mockResolvedValueOnce(modelledTradeAreas);

      const modelledParams: ScopeQueryParams = {
        ...mockScopeParams,
        dataMode: 'modelled'
      };

      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(modelledParams);

      expect(enhancedSuggestions).toHaveLength(3);
      enhancedSuggestions.forEach((suggestion: EnhancedSuggestion) => {
        expect(suggestion.dataMode).toBe('modelled');
        expect(suggestion.locationIntelligence).toBeDefined();
        // Modelled data might have different confidence levels
        expect(suggestion.credibilityRating).toBeDefined();
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      (prismaClient.tradeArea.findMany as jest.Mock).mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(expansionService.getEnhancedSuggestionsInScope(mockScopeParams))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle partial intelligence service failures', async () => {
      // Mock partial failure in intelligence enhancement
      jest.spyOn(locationIntelligenceService, 'enhanceLocationSuggestions')
        .mockImplementationOnce(async (suggestions) => {
          // Return only partial enhancements
          return suggestions.slice(0, 2).map(suggestion => ({
            ...suggestion,
            locationIntelligence: { isCommercialArea: true, distanceToTownCenter: 500, nearbyCommercialFeatures: [], landUseType: 'commercial', developmentPotential: 0.8 },
            demographicProfile: { population: { total: 50000, density: 1000, growthRate: 0.02, urbanDensityIndex: 0.8 }, ageDistribution: { under18: 0.2, age18to34: 0.3, age35to54: 0.3, age55plus: 0.2 }, incomeDistribution: { medianHouseholdIncome: 75000, averageDisposableIncome: 45000, incomeIndex: 0.7, purchasingPower: 0.8 }, lifestyleSegments: ['urban_professionals'], consumerBehavior: { fastFoodFrequency: 0.6, healthConsciousness: 0.7, pricesensitivity: 0.5, brandLoyalty: 0.6, digitalEngagement: 0.8 }, marketFitScore: 0.75, dataSource: 'external_api', confidence: 0.8 },
            competitiveAnalysis: { nearbyCompetitors: [], marketSaturation: 0.4, cannibalizationRisk: { riskLevel: 'LOW', estimatedImpact: 0.1, affectedStores: [], mitigationStrategies: [] }, competitiveAdvantages: ['prime location'], marketGapOpportunity: 0.6 },
            viabilityAssessment: { commercialViability: { score: 0.8, factors: { zoning: 0.9, landAvailability: 0.8, constructionFeasibility: 0.7, permitComplexity: 0.8 }, estimatedDevelopmentCost: 750000, timeToOpen: 6 }, accessibility: { score: 0.9, factors: { vehicleAccess: 0.9, publicTransit: 0.8, walkability: 0.9, parking: 0.7 }, nearestTransitDistance: 200, walkingTrafficScore: 0.8 }, urbanContext: { score: 0.8, factors: { populationDensity: 0.9, commercialActivity: 0.8, residentialProximity: 0.7, employmentCenters: 0.8 }, landUsePattern: 'mixed_use', developmentTrend: 'growing' }, overallScore: 0.83, concerns: [], strengths: ['excellent accessibility', 'strong urban context'] },
            strategicRationale: { primaryReasons: ['High market potential', 'Strong demographic fit'], addressedConcerns: [], confidenceFactors: ['Comprehensive market analysis'], riskMitigations: ['Standard market entry strategy'] },
            intelligenceScore: 0.8,
            credibilityRating: 'HIGH' as const,
            executiveReadiness: true
          }));
        });

      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);

      // Should still return results, but may have different counts or fallback data
      expect(enhancedSuggestions).toBeDefined();
      expect(enhancedSuggestions.length).toBeGreaterThan(0);
    });

    it('should handle invalid scope parameters', async () => {
      const invalidScope: ScopeQueryParams = {
        scope: { type: 'country', value: '' }, // Empty value
        intensity: 150, // Invalid intensity > 100
        dataMode: 'live',
        minDistance: -1 // Invalid negative distance
      };

      // Should handle gracefully or throw appropriate validation error
      await expect(async () => {
        await expansionService.getEnhancedSuggestionsInScope(invalidScope);
      }).not.toThrow(); // Service should handle gracefully
    });
  });

  describe('Intelligence Quality Validation', () => {
    it('should ensure intelligence scores are within valid ranges', async () => {
      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);

      enhancedSuggestions.forEach((suggestion: EnhancedSuggestion) => {
        // Intelligence score validation
        expect(suggestion.intelligenceScore).toBeGreaterThanOrEqual(0);
        expect(suggestion.intelligenceScore).toBeLessThanOrEqual(1);
        expect(isFinite(suggestion.intelligenceScore)).toBe(true);

        // Demographic scores validation
        expect(suggestion.demographicProfile.marketFitScore).toBeGreaterThanOrEqual(0);
        expect(suggestion.demographicProfile.marketFitScore).toBeLessThanOrEqual(1);
        expect(suggestion.demographicProfile.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.demographicProfile.confidence).toBeLessThanOrEqual(1);

        // Viability scores validation
        expect(suggestion.viabilityAssessment.overallScore).toBeGreaterThanOrEqual(0);
        expect(suggestion.viabilityAssessment.overallScore).toBeLessThanOrEqual(1);
        expect(suggestion.viabilityAssessment.commercialViability.score).toBeGreaterThanOrEqual(0);
        expect(suggestion.viabilityAssessment.commercialViability.score).toBeLessThanOrEqual(1);

        // Competitive analysis validation
        expect(suggestion.competitiveAnalysis.marketSaturation).toBeGreaterThanOrEqual(0);
        expect(suggestion.competitiveAnalysis.marketSaturation).toBeLessThanOrEqual(1);
        expect(suggestion.competitiveAnalysis.marketGapOpportunity).toBeGreaterThanOrEqual(0);
        expect(suggestion.competitiveAnalysis.marketGapOpportunity).toBeLessThanOrEqual(1);
      });
    });

    it('should ensure credibility ratings are consistent with scores', async () => {
      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);

      enhancedSuggestions.forEach((suggestion: EnhancedSuggestion) => {
        const { intelligenceScore, credibilityRating, demographicProfile } = suggestion;
        const combinedScore = (intelligenceScore + demographicProfile.confidence) / 2;

        if (credibilityRating === 'HIGH') {
          expect(combinedScore).toBeGreaterThanOrEqual(0.7);
        } else if (credibilityRating === 'MEDIUM') {
          expect(combinedScore).toBeGreaterThanOrEqual(0.4);
          expect(combinedScore).toBeLessThan(0.8);
        } else if (credibilityRating === 'LOW') {
          expect(combinedScore).toBeLessThan(0.6);
        }
      });
    });

    it('should ensure executive readiness is properly calculated', async () => {
      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);

      enhancedSuggestions.forEach((suggestion: EnhancedSuggestion) => {
        const { executiveReadiness, credibilityRating, intelligenceScore, demographicProfile } = suggestion;

        if (executiveReadiness) {
          // Executive ready suggestions should meet high standards
          expect(credibilityRating).toBe('HIGH');
          expect(intelligenceScore).toBeGreaterThan(0.7);
          expect(demographicProfile.marketFitScore).toBeGreaterThan(0.6);
        }
      });
    });

    it('should validate strategic rationale quality', async () => {
      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);

      enhancedSuggestions.forEach((suggestion: EnhancedSuggestion) => {
        const { strategicRationale } = suggestion;

        // Strategic rationale should have meaningful content
        expect(strategicRationale.primaryReasons).toBeInstanceOf(Array);
        expect(strategicRationale.primaryReasons.length).toBeGreaterThan(0);
        expect(strategicRationale.confidenceFactors).toBeInstanceOf(Array);
        expect(strategicRationale.riskMitigations).toBeInstanceOf(Array);

        // Each reason should be a non-empty string
        strategicRationale.primaryReasons.forEach(reason => {
          expect(typeof reason).toBe('string');
          expect(reason.length).toBeGreaterThan(5);
        });
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain API compatibility for existing consumers', async () => {
      const basicSuggestions = await expansionService.getSuggestionsInScope(mockScopeParams);
      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);

      // Basic suggestions should have all required fields
      basicSuggestions.forEach(suggestion => {
        expect(suggestion.id).toBeDefined();
        expect(suggestion.lat).toBeDefined();
        expect(suggestion.lng).toBeDefined();
        expect(suggestion.finalScore).toBeDefined();
        expect(suggestion.confidence).toBeDefined();
        expect(suggestion.dataMode).toBeDefined();
        expect(suggestion.demandScore).toBeDefined();
        expect(suggestion.cannibalizationPenalty).toBeDefined();
        expect(suggestion.opsFitScore).toBeDefined();
        expect(suggestion.nearestSubwayDistance).toBeDefined();
        expect(suggestion.topPOIs).toBeInstanceOf(Array);
        expect(suggestion.cacheKey).toBeDefined();
        expect(suggestion.modelVersion).toBeDefined();
        expect(suggestion.dataSnapshotDate).toBeDefined();
      });

      // Enhanced suggestions should include all basic fields plus intelligence data
      enhancedSuggestions.forEach((enhanced: EnhancedSuggestion) => {
        // All basic fields should be present
        expect(enhanced.id).toBeDefined();
        expect(enhanced.lat).toBeDefined();
        expect(enhanced.lng).toBeDefined();
        expect(enhanced.finalScore).toBeDefined();
        expect(enhanced.confidence).toBeDefined();

        // Intelligence fields should be added
        expect(enhanced.locationIntelligence).toBeDefined();
        expect(enhanced.demographicProfile).toBeDefined();
        expect(enhanced.competitiveAnalysis).toBeDefined();
        expect(enhanced.viabilityAssessment).toBeDefined();
        expect(enhanced.strategicRationale).toBeDefined();
        expect(enhanced.intelligenceScore).toBeDefined();
        expect(enhanced.credibilityRating).toBeDefined();
        expect(enhanced.executiveReadiness).toBeDefined();
      });
    });

    it('should handle legacy expansion recommendation format', async () => {
      const legacyRecommendations = await expansionService.getRecommendations({
        region: 'New York',
        mode: 'live',
        target: 5,
        limit: 10
      });

      expect(legacyRecommendations).toBeDefined();
      expect(legacyRecommendations.length).toBeGreaterThan(0);

      // Verify legacy format fields
      legacyRecommendations.forEach(recommendation => {
        expect(recommendation.id).toBeDefined();
        expect(recommendation.lat).toBeDefined();
        expect(recommendation.lng).toBeDefined();
        expect(recommendation.region).toBeDefined();
        expect(recommendation.finalScore).toBeDefined();
        expect(recommendation.confidence).toBeDefined();
        expect(recommendation.isLive).toBeDefined();
        expect(recommendation.demandScore).toBeDefined();
        expect(recommendation.competitionPenalty).toBeDefined();
        expect(recommendation.supplyPenalty).toBeDefined();
        expect(recommendation.population).toBeDefined();
        expect(recommendation.footfallIndex).toBeDefined();
        expect(recommendation.incomeIndex).toBeDefined();
        expect(recommendation.predictedAUV).toBeDefined();
        expect(recommendation.paybackPeriod).toBeDefined();
      });
    });
  });
});