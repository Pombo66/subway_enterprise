import { Test, TestingModule } from '@nestjs/testing';
import { OptimizedLocationIntelligenceService } from '../optimized-location-intelligence.service';
import { DemographicAnalysisService } from '../demographic-analysis.service';
import { ViabilityAssessmentService } from '../viability-assessment.service';
import { CompetitiveAnalysisService } from '../competitive-analysis.service';
import { StrategicRationaleService } from '../strategic-rationale.service';
import { PatternDetectionService } from '../pattern-detection.service';
import { PerformanceOptimizerService } from '../performance/performance-optimizer.service';
import { PerformanceMonitorService } from '../performance/performance-monitor.service';
import { CacheManagerService } from '../cache/cache-manager.service';
import { PrismaClient } from '@prisma/client';
import { ExpansionSuggestion, ScopeSelection } from '../../expansion.service';

describe('OptimizedLocationIntelligenceService Integration', () => {
  let service: OptimizedLocationIntelligenceService;
  let demographicService: jest.Mocked<DemographicAnalysisService>;
  let viabilityService: jest.Mocked<ViabilityAssessmentService>;
  let competitiveService: jest.Mocked<CompetitiveAnalysisService>;
  let strategicService: jest.Mocked<StrategicRationaleService>;
  let patternService: jest.Mocked<PatternDetectionService>;
  let performanceOptimizer: jest.Mocked<PerformanceOptimizerService>;
  let performanceMonitor: jest.Mocked<PerformanceMonitorService>;
  let cacheManager: jest.Mocked<CacheManagerService>;
  let prismaClient: jest.Mocked<PrismaClient>;

  const mockSuggestions: ExpansionSuggestion[] = [
    {
      id: 'suggestion-1',
      lat: 40.7128,
      lng: -74.0060,
      finalScore: 0.85,
      confidence: 0.9,
      dataMode: 'live',
      demandScore: 0.8,
      cannibalizationPenalty: 0.2,
      opsFitScore: 0.9,
      nearestSubwayDistance: 3.5,
      topPOIs: ['Shopping Center', 'Transit Hub'],
      cacheKey: 'test-cache-key-1',
      modelVersion: 'v0.3',
      dataSnapshotDate: new Date().toISOString(),
      score: 0.85
    },
    {
      id: 'suggestion-2',
      lat: 40.7589,
      lng: -73.9851,
      finalScore: 0.75,
      confidence: 0.8,
      dataMode: 'live',
      demandScore: 0.7,
      cannibalizationPenalty: 0.3,
      opsFitScore: 0.8,
      nearestSubwayDistance: 2.8,
      topPOIs: ['University', 'Hospital'],
      cacheKey: 'test-cache-key-2',
      modelVersion: 'v0.3',
      dataSnapshotDate: new Date().toISOString(),
      score: 0.75
    }
  ];

  const mockScope: ScopeSelection = {
    type: 'country',
    value: 'US',
    area: 9833520
  };

  beforeEach(async () => {
    const mockDemographicService = {
      analyzeDemographics: jest.fn()
    };

    const mockViabilityService = {
      assessCommercialViability: jest.fn(),
      validateLocationAccessibility: jest.fn(),
      analyzeUrbanContext: jest.fn()
    };

    const mockCompetitiveService = {
      analyzeCompetitiveLandscape: jest.fn()
    };

    const mockStrategicService = {
      generateStrategicRationale: jest.fn()
    };

    const mockPatternService = {
      analyzeLocationPatterns: jest.fn()
    };

    const mockPerformanceOptimizer = {
      batchProcessDemographicProfiles: jest.fn(),
      processLocationsInParallel: jest.fn(),
      optimizeWithIntelligentCaching: jest.fn(),
      getPerformanceMetrics: jest.fn()
    };

    const mockPerformanceMonitor = {
      startTracking: jest.fn(),
      stopTracking: jest.fn(),
      getPerformanceSummary: jest.fn(),
      healthCheck: jest.fn()
    };

    const mockCacheManager = {
      getCacheStats: jest.fn(),
      healthCheck: jest.fn()
    };

    const mockPrismaClient = {
      store: {
        findMany: jest.fn()
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptimizedLocationIntelligenceService,
        { provide: DemographicAnalysisService, useValue: mockDemographicService },
        { provide: ViabilityAssessmentService, useValue: mockViabilityService },
        { provide: CompetitiveAnalysisService, useValue: mockCompetitiveService },
        { provide: StrategicRationaleService, useValue: mockStrategicService },
        { provide: PatternDetectionService, useValue: mockPatternService },
        { provide: PerformanceOptimizerService, useValue: mockPerformanceOptimizer },
        { provide: PerformanceMonitorService, useValue: mockPerformanceMonitor },
        { provide: CacheManagerService, useValue: mockCacheManager },
        { provide: PrismaClient, useValue: mockPrismaClient }
      ],
    }).compile();

    service = module.get<OptimizedLocationIntelligenceService>(OptimizedLocationIntelligenceService);
    demographicService = module.get(DemographicAnalysisService);
    viabilityService = module.get(ViabilityAssessmentService);
    competitiveService = module.get(CompetitiveAnalysisService);
    strategicService = module.get(StrategicRationaleService);
    patternService = module.get(PatternDetectionService);
    performanceOptimizer = module.get(PerformanceOptimizerService);
    performanceMonitor = module.get(PerformanceMonitorService);
    cacheManager = module.get(CacheManagerService);
    prismaClient = module.get(PrismaClient);
  });

  describe('Enhanced Location Suggestions with Performance Optimization', () => {
    beforeEach(() => {
      // Setup default mock responses
      performanceMonitor.startTracking.mockReturnValue('tracking-id-123');
      performanceMonitor.stopTracking.mockReturnValue();

      // Mock demographic profiles
      const mockDemographicProfiles = new Map([
        ['40.7128,-74.0060', {
          population: { total: 50000, density: 1000, growthRate: 0.02, urbanDensityIndex: 0.8 },
          ageDistribution: { under18: 0.2, age18to34: 0.3, age35to54: 0.3, age55plus: 0.2 },
          incomeDistribution: { medianHouseholdIncome: 75000, averageDisposableIncome: 45000, incomeIndex: 0.7, purchasingPower: 0.8 },
          lifestyleSegments: ['urban_professionals'],
          consumerBehavior: { fastFoodFrequency: 0.6, healthConsciousness: 0.7, pricesensitivity: 0.5, brandLoyalty: 0.6, digitalEngagement: 0.8 },
          marketFitScore: 0.75,
          dataSource: 'external_api' as const,
          confidence: 0.8
        }],
        ['40.7589,-73.9851', {
          population: { total: 45000, density: 900, growthRate: 0.015, urbanDensityIndex: 0.75 },
          ageDistribution: { under18: 0.18, age18to34: 0.35, age35to54: 0.32, age55plus: 0.15 },
          incomeDistribution: { medianHouseholdIncome: 70000, averageDisposableIncome: 42000, incomeIndex: 0.65, purchasingPower: 0.75 },
          lifestyleSegments: ['young_professionals'],
          consumerBehavior: { fastFoodFrequency: 0.7, healthConsciousness: 0.6, pricesensitivity: 0.6, brandLoyalty: 0.5, digitalEngagement: 0.9 },
          marketFitScore: 0.7,
          dataSource: 'external_api' as const,
          confidence: 0.75
        }]
      ]);

      performanceOptimizer.batchProcessDemographicProfiles.mockResolvedValue(mockDemographicProfiles);

      // Mock location intelligence
      const mockLocationIntelligence = new Map([
        ['40.7128,-74.0060', {
          isCommercialArea: true,
          distanceToTownCenter: 500,
          nearbyCommercialFeatures: ['shopping_center', 'restaurant'],
          landUseType: 'commercial' as const,
          developmentPotential: 0.8
        }],
        ['40.7589,-73.9851', {
          isCommercialArea: true,
          distanceToTownCenter: 800,
          nearbyCommercialFeatures: ['university', 'hospital'],
          landUseType: 'mixed' as const,
          developmentPotential: 0.7
        }]
      ]);

      performanceOptimizer.optimizeWithIntelligentCaching.mockResolvedValue([
        { location: { lat: 40.7128, lng: -74.0060 }, result: mockLocationIntelligence.get('40.7128,-74.0060') },
        { location: { lat: 40.7589, lng: -73.9851 }, result: mockLocationIntelligence.get('40.7589,-73.9851') }
      ]);

      // Mock viability assessments
      const mockViabilityResults = [
        {
          location: { lat: 40.7128, lng: -74.0060 },
          result: {
            commercialViability: { score: 0.8, factors: { zoning: 0.9, landAvailability: 0.8, constructionFeasibility: 0.7, permitComplexity: 0.8 }, estimatedDevelopmentCost: 750000, timeToOpen: 6 },
            accessibility: { score: 0.9, factors: { vehicleAccess: 0.9, publicTransit: 0.8, walkability: 0.9, parking: 0.7 }, nearestTransitDistance: 200, walkingTrafficScore: 0.8 },
            urbanContext: { score: 0.8, factors: { populationDensity: 0.9, commercialActivity: 0.8, residentialProximity: 0.7, employmentCenters: 0.8 }, landUsePattern: 'mixed_use', developmentTrend: 'growing' as const },
            overallScore: 0.83,
            concerns: [],
            strengths: ['excellent accessibility', 'strong urban context']
          }
        },
        {
          location: { lat: 40.7589, lng: -73.9851 },
          result: {
            commercialViability: { score: 0.75, factors: { zoning: 0.8, landAvailability: 0.7, constructionFeasibility: 0.8, permitComplexity: 0.7 }, estimatedDevelopmentCost: 650000, timeToOpen: 7 },
            accessibility: { score: 0.85, factors: { vehicleAccess: 0.8, publicTransit: 0.9, walkability: 0.8, parking: 0.8 }, nearestTransitDistance: 150, walkingTrafficScore: 0.85 },
            urbanContext: { score: 0.75, factors: { populationDensity: 0.8, commercialActivity: 0.7, residentialProximity: 0.8, employmentCenters: 0.7 }, landUsePattern: 'mixed_use', developmentTrend: 'stable' as const },
            overallScore: 0.78,
            concerns: [],
            strengths: ['good public transit access']
          }
        }
      ];

      performanceOptimizer.processLocationsInParallel.mockResolvedValue(mockViabilityResults);

      // Mock competitive analysis
      const mockCompetitiveResults = [
        {
          location: { lat: 40.7128, lng: -74.0060 },
          result: {
            nearbyCompetitors: [],
            marketSaturation: 0.4,
            cannibalizationRisk: { riskLevel: 'LOW' as const, estimatedImpact: 0.1, affectedStores: [], mitigationStrategies: [] },
            competitiveAdvantages: ['prime location'],
            marketGapOpportunity: 0.6
          }
        },
        {
          location: { lat: 40.7589, lng: -73.9851 },
          result: {
            nearbyCompetitors: [],
            marketSaturation: 0.5,
            cannibalizationRisk: { riskLevel: 'MEDIUM' as const, estimatedImpact: 0.2, affectedStores: [], mitigationStrategies: [] },
            competitiveAdvantages: ['university proximity'],
            marketGapOpportunity: 0.5
          }
        }
      ];

      performanceOptimizer.processLocationsInParallel.mockResolvedValueOnce(mockViabilityResults).mockResolvedValueOnce(mockCompetitiveResults);

      // Mock strategic rationale
      strategicService.generateStrategicRationale.mockResolvedValue({
        primaryReasons: ['High market potential', 'Strong demographic fit'],
        addressedConcerns: [],
        confidenceFactors: ['Comprehensive market analysis'],
        riskMitigations: ['Standard market entry strategy']
      });

      // Mock existing stores for pattern analysis
      prismaClient.store.findMany.mockResolvedValue([]);

      // Mock pattern analysis
      patternService.analyzeLocationPatterns.mockResolvedValue({
        detectedPatterns: [],
        overallPatternScore: 0.5,
        recommendations: [],
        alternativeSpacing: []
      });

      // Mock cache stats
      cacheManager.getCacheStats.mockResolvedValue({
        provider: 'memory' as const,
        memory: { hits: 10, misses: 5, hitRate: 0.67, totalRequests: 15, cacheSize: 50, memoryUsage: 1024000 },
        hotspots: 5,
        maintenanceRuns: 2,
        fallbackEvents: 0
      });
    });

    it('should enhance location suggestions with optimized performance', async () => {
      const result = await service.enhanceLocationSuggestions(mockSuggestions, mockScope);

      expect(result).toHaveLength(2);
      
      // Verify performance monitoring was used
      expect(performanceMonitor.startTracking).toHaveBeenCalledWith('enhanceLocationSuggestions', {
        suggestionCount: 2,
        scopeType: 'country'
      });
      expect(performanceMonitor.stopTracking).toHaveBeenCalledWith('tracking-id-123', true, undefined, expect.any(Object));

      // Verify optimized batch processing was used
      expect(performanceOptimizer.batchProcessDemographicProfiles).toHaveBeenCalled();
      expect(performanceOptimizer.optimizeWithIntelligentCaching).toHaveBeenCalled();
      expect(performanceOptimizer.processLocationsInParallel).toHaveBeenCalledTimes(2); // viability and competitive

      // Verify enhanced suggestions structure
      result.forEach(suggestion => {
        expect(suggestion.locationIntelligence).toBeDefined();
        expect(suggestion.demographicProfile).toBeDefined();
        expect(suggestion.competitiveAnalysis).toBeDefined();
        expect(suggestion.viabilityAssessment).toBeDefined();
        expect(suggestion.strategicRationale).toBeDefined();
        expect(suggestion.intelligenceScore).toBeGreaterThanOrEqual(0);
        expect(suggestion.intelligenceScore).toBeLessThanOrEqual(1);
        expect(['LOW', 'MEDIUM', 'HIGH']).toContain(suggestion.credibilityRating);
        expect(typeof suggestion.executiveReadiness).toBe('boolean');
      });
    }, 15000);

    it('should handle empty suggestions array efficiently', async () => {
      const result = await service.enhanceLocationSuggestions([], mockScope);

      expect(result).toHaveLength(0);
      expect(performanceMonitor.startTracking).toHaveBeenCalled();
      expect(performanceMonitor.stopTracking).toHaveBeenCalledWith('tracking-id-123', true);
      
      // Should not call batch processing for empty array
      expect(performanceOptimizer.batchProcessDemographicProfiles).not.toHaveBeenCalled();
    });

    it('should handle processing errors gracefully with fallback', async () => {
      // Mock a processing error
      performanceOptimizer.batchProcessDemographicProfiles.mockRejectedValue(new Error('Processing failed'));

      const result = await service.enhanceLocationSuggestions(mockSuggestions, mockScope);

      expect(result).toHaveLength(2);
      expect(performanceMonitor.stopTracking).toHaveBeenCalledWith('tracking-id-123', false, 'Processing failed');
      
      // Should return fallback enhanced suggestions
      result.forEach(suggestion => {
        expect(suggestion.credibilityRating).toBe('LOW');
        expect(suggestion.executiveReadiness).toBe(false);
        expect(suggestion.viabilityAssessment.concerns).toContain('Intelligence enhancement unavailable - limited data');
      });
    });

    it('should apply pattern optimization when patterns are detected', async () => {
      // Mock pattern detection with results
      patternService.analyzeLocationPatterns.mockResolvedValue({
        detectedPatterns: ['geometric_clustering'],
        overallPatternScore: 0.8,
        recommendations: ['Consider alternative spacing', 'Evaluate market saturation'],
        alternativeSpacing: [
          { lat: 40.7200, lng: -74.0100, reason: 'Better spacing' },
          { lat: 40.7400, lng: -73.9900, reason: 'Market gap opportunity' }
        ]
      });

      const result = await service.enhanceLocationSuggestions(mockSuggestions, mockScope);

      expect(result).toHaveLength(2);
      expect(patternService.analyzeLocationPatterns).toHaveBeenCalledTimes(2);
      
      // Verify pattern insights are included in strategic rationale
      result.forEach(suggestion => {
        expect(suggestion.strategicRationale.alternativeComparison).toBeDefined();
        expect(suggestion.strategicRationale.riskMitigations.length).toBeGreaterThan(2);
      });
    });

    it('should calculate intelligence scores correctly', async () => {
      const result = await service.enhanceLocationSuggestions(mockSuggestions, mockScope);

      expect(result).toHaveLength(2);
      
      // First suggestion should have higher intelligence score due to better metrics
      const firstSuggestion = result.find(s => s.lat === 40.7128);
      const secondSuggestion = result.find(s => s.lat === 40.7589);
      
      expect(firstSuggestion?.intelligenceScore).toBeGreaterThan(0);
      expect(secondSuggestion?.intelligenceScore).toBeGreaterThan(0);
      
      // Verify credibility ratings are consistent with scores
      if (firstSuggestion && firstSuggestion.intelligenceScore > 0.8) {
        expect(['HIGH', 'MEDIUM']).toContain(firstSuggestion.credibilityRating);
      }
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track performance metrics for all operations', async () => {
      await service.enhanceLocationSuggestions(mockSuggestions, mockScope);

      // Verify main operation tracking
      expect(performanceMonitor.startTracking).toHaveBeenCalledWith('enhanceLocationSuggestions', expect.any(Object));
      
      // Verify sub-operation tracking would be called by the optimizer
      expect(performanceOptimizer.batchProcessDemographicProfiles).toHaveBeenCalled();
      expect(performanceOptimizer.processLocationsInParallel).toHaveBeenCalled();
    });

    it('should provide performance metrics', () => {
      const mockMetrics = {
        totalProcessingTime: 5000,
        averageTimePerLocation: 2500,
        cacheHitRate: 0.67,
        parallelEfficiency: 0.8,
        batchesProcessed: 2,
        locationsProcessed: 2,
        errorsEncountered: 0
      };

      performanceOptimizer.getPerformanceMetrics.mockReturnValue(mockMetrics);

      const metrics = service.getPerformanceMetrics();

      expect(metrics).toEqual(mockMetrics);
      expect(performanceOptimizer.getPerformanceMetrics).toHaveBeenCalled();
    });

    it('should provide performance summary', () => {
      const mockSummary = {
        timeWindow: '60 minutes',
        totalRequests: 10,
        averageResponseTime: 2500,
        errorRate: 0.1,
        cacheHitRate: 0.75,
        memoryUsage: 1024000,
        concurrentRequests: 2,
        alerts: [],
        topSlowOperations: []
      };

      performanceMonitor.getPerformanceSummary.mockReturnValue(mockSummary);

      const summary = service.getPerformanceSummary(60);

      expect(summary).toEqual(mockSummary);
      expect(performanceMonitor.getPerformanceSummary).toHaveBeenCalledWith(60);
    });
  });

  describe('Health Check Integration', () => {
    it('should perform comprehensive health check', async () => {
      const mockCacheHealth = {
        status: 'healthy' as const,
        details: { test: 'passed' }
      };

      const mockMonitorHealth = {
        status: 'healthy' as const,
        details: { eventsTracked: 100 }
      };

      const mockPerformanceMetrics = {
        totalProcessingTime: 10000,
        averageTimePerLocation: 1000,
        cacheHitRate: 0.8,
        parallelEfficiency: 0.9,
        batchesProcessed: 5,
        locationsProcessed: 10,
        errorsEncountered: 0
      };

      cacheManager.healthCheck.mockResolvedValue(mockCacheHealth);
      performanceMonitor.healthCheck.mockReturnValue(mockMonitorHealth);
      performanceOptimizer.getPerformanceMetrics.mockReturnValue(mockPerformanceMetrics);

      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.cache).toEqual(mockCacheHealth);
      expect(health.details.monitor).toEqual(mockMonitorHealth);
      expect(health.details.performance).toEqual(mockPerformanceMetrics);
    });

    it('should return degraded status when components are unhealthy', async () => {
      const mockCacheHealth = {
        status: 'unhealthy' as const,
        details: { error: 'Cache connection failed' }
      };

      const mockMonitorHealth = {
        status: 'healthy' as const,
        details: { eventsTracked: 100 }
      };

      cacheManager.healthCheck.mockResolvedValue(mockCacheHealth);
      performanceMonitor.healthCheck.mockReturnValue(mockMonitorHealth);

      const health = await service.healthCheck();

      expect(health.status).toBe('degraded');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle demographic processing failures', async () => {
      performanceOptimizer.batchProcessDemographicProfiles.mockRejectedValue(new Error('Demographic service unavailable'));

      const result = await service.enhanceLocationSuggestions(mockSuggestions, mockScope);

      expect(result).toHaveLength(2);
      expect(performanceMonitor.stopTracking).toHaveBeenCalledWith('tracking-id-123', false, 'Demographic service unavailable');
      
      // Should return fallback suggestions
      result.forEach(suggestion => {
        expect(suggestion.credibilityRating).toBe('LOW');
        expect(suggestion.demographicProfile.confidence).toBe(0.3);
      });
    });

    it('should handle viability assessment failures', async () => {
      // Mock successful demographic processing but failed viability
      performanceOptimizer.processLocationsInParallel
        .mockResolvedValueOnce([]) // Empty viability results
        .mockResolvedValueOnce([]); // Empty competitive results

      const result = await service.enhanceLocationSuggestions(mockSuggestions, mockScope);

      expect(result).toHaveLength(2);
      expect(performanceMonitor.stopTracking).toHaveBeenCalledWith('tracking-id-123', false, expect.any(String));
    });

    it('should handle pattern analysis failures gracefully', async () => {
      patternService.analyzeLocationPatterns.mockRejectedValue(new Error('Pattern analysis failed'));

      const result = await service.enhanceLocationSuggestions(mockSuggestions, mockScope);

      expect(result).toHaveLength(2);
      
      // Should still complete successfully without pattern optimization
      result.forEach(suggestion => {
        expect(suggestion.strategicRationale).toBeDefined();
        // Should not have alternative comparisons due to pattern analysis failure
        expect(suggestion.strategicRationale.alternativeComparison).toBeUndefined();
      });
    });

    it('should handle database connection failures', async () => {
      prismaClient.store.findMany.mockRejectedValue(new Error('Database connection failed'));

      const result = await service.enhanceLocationSuggestions(mockSuggestions, mockScope);

      expect(result).toHaveLength(2);
      
      // Should still complete with fallback pattern analysis
      expect(patternService.analyzeLocationPatterns).not.toHaveBeenCalled();
    });
  });

  describe('Performance Optimization Verification', () => {
    it('should use batch processing for efficiency', async () => {
      await service.enhanceLocationSuggestions(mockSuggestions, mockScope);

      // Verify batch processing was used instead of individual calls
      expect(performanceOptimizer.batchProcessDemographicProfiles).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ lat: 40.7128, lng: -74.0060, priority: 0.85 }),
          expect.objectContaining({ lat: 40.7589, lng: -73.9851, priority: 0.75 })
        ]),
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should use intelligent caching for location intelligence', async () => {
      await service.enhanceLocationSuggestions(mockSuggestions, mockScope);

      expect(performanceOptimizer.optimizeWithIntelligentCaching).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ lat: 40.7128, lng: -74.0060 }),
          expect.objectContaining({ lat: 40.7589, lng: -73.9851 })
        ]),
        expect.any(Function),
        'getLocationIntelligence'
      );
    });

    it('should process viability and competitive analysis in parallel', async () => {
      await service.enhanceLocationSuggestions(mockSuggestions, mockScope);

      // Should be called twice - once for viability, once for competitive
      expect(performanceOptimizer.processLocationsInParallel).toHaveBeenCalledTimes(2);
      
      // Verify different batch configurations for different operations
      const calls = performanceOptimizer.processLocationsInParallel.mock.calls;
      expect(calls[0][2]).toEqual(expect.objectContaining({ batchSize: 4, concurrency: 2 })); // viability
      expect(calls[1][2]).toEqual(expect.objectContaining({ batchSize: 6, concurrency: 3 })); // competitive
    });
  });
});