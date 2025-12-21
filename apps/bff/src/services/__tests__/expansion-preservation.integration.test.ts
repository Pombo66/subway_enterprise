/**
 * Integration Test: Expansion and AI Features Preservation
 * 
 * This test validates that the expansion generation and AI features continue
 * to work correctly after the competitor system refactoring.
 * 
 * **Property 10: Expansion and AI Features Preserved**
 * *For any* expansion generation request after the competitor system refactoring,
 * the system should successfully generate expansion suggestions with AI rationales,
 * identical to behavior before the refactoring.
 * 
 * **Validates: Requirements 5.7**
 * 
 * @see .kiro/specs/competitor-overlay-simplification/design.md
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { ExpansionService } from '../expansion.service';
import { LocationIntelligenceService } from '../intelligence/location-intelligence.service';
import { GeographicValidationService } from '../intelligence/geographic-validation.service';
import { DemographicAnalysisService } from '../intelligence/demographic-analysis.service';
import { ViabilityAssessmentService } from '../intelligence/viability-assessment.service';
import { CompetitiveAnalysisService } from '../intelligence/competitive-analysis.service';
import { StrategicRationaleService } from '../intelligence/strategic-rationale.service';
import { PatternDetectionService } from '../intelligence/pattern-detection.service';
import { GeographicAnalysisService } from '../intelligence/geographic-analysis.service';
import { AIDemographicInferenceService } from '../intelligence/ai-demographic-inference.service';

describe('Property 10: Expansion and AI Features Preserved', () => {
  let module: TestingModule;
  let expansionService: ExpansionService;
  let locationIntelligenceService: LocationIntelligenceService;

  // Mock data for testing
  const mockTradeAreas = [
    {
      id: 'ta_test_1',
      centroidLat: 51.5074,
      centroidLng: -0.1278,
      finalScore: 0.85,
      confidence: 0.9,
      demandScore: 0.8,
      competitionPenalty: 0.15,
      supplyPenalty: 0.1,
      existingStoreDist: 3.5,
      population: 50000,
      footfallIndex: 0.9,
      incomeIndex: 0.8,
      competitorIdx: 0.4,
      region: 'London',
      country: 'GB',
      dataMode: 'live',
      isLive: true,
      modelVersion: 'v0.3',
      dataSnapshotDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'ta_test_2',
      centroidLat: 51.5200,
      centroidLng: -0.1400,
      finalScore: 0.72,
      confidence: 0.85,
      demandScore: 0.7,
      competitionPenalty: 0.2,
      supplyPenalty: 0.12,
      existingStoreDist: 2.8,
      population: 35000,
      footfallIndex: 0.75,
      incomeIndex: 0.7,
      competitorIdx: 0.35,
      region: 'London',
      country: 'GB',
      dataMode: 'live',
      isLive: true,
      modelVersion: 'v0.3',
      dataSnapshotDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockStores = [
    {
      id: 'store_existing_1',
      name: 'Central London Subway',
      latitude: 51.5100,
      longitude: -0.1300,
      status: 'active',
      country: 'GB',
      region: 'London',
      city: 'London',
      address: '123 Oxford Street',
      postcode: 'W1D 1AA',
      ownerName: 'London Franchisee',
      annualTurnover: 1200000,
      openedAt: new Date('2020-01-15'),
      cityPopulationBand: 'large',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockScope = {
    type: 'country' as const,
    value: 'GB',
    area: 242495
  };

  const mockScopeParams = {
    scope: mockScope,
    intensity: 50,
    dataMode: 'live' as const,
    minDistance: 2.0,
    maxPerCity: 5
  };

  beforeAll(async () => {
    const mockPrismaClient = {
      tradeArea: {
        findMany: jest.fn().mockResolvedValue(mockTradeAreas),
        count: jest.fn().mockResolvedValue(mockTradeAreas.length),
        update: jest.fn().mockImplementation((args) => Promise.resolve(args.data))
      },
      store: {
        findMany: jest.fn().mockResolvedValue(mockStores),
        count: jest.fn().mockResolvedValue(mockStores.length)
      },
      expansionCache: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn()
      },
      intelligenceDemographicCache: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        upsert: jest.fn().mockResolvedValue({})
      },
      telemetryEvent: {
        create: jest.fn().mockResolvedValue({})
      },
      // Mock for competitor-related tables (should NOT be called)
      competitorPlace: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn()
      },
      competitorRefreshJob: {
        create: jest.fn(),
        update: jest.fn()
      }
    };

    module = await Test.createTestingModule({
      providers: [
        ExpansionService,
        LocationIntelligenceService,
        GeographicValidationService,
        DemographicAnalysisService,
        ViabilityAssessmentService,
        CompetitiveAnalysisService,
        StrategicRationaleService,
        PatternDetectionService,
        GeographicAnalysisService,
        AIDemographicInferenceService,
        {
          provide: PrismaClient,
          useValue: mockPrismaClient
        }
      ],
    }).compile();

    expansionService = module.get<ExpansionService>(ExpansionService);
    locationIntelligenceService = module.get<LocationIntelligenceService>(LocationIntelligenceService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Core Expansion Functionality', () => {
    it('should initialize expansion service successfully', () => {
      expect(expansionService).toBeDefined();
      expect(locationIntelligenceService).toBeDefined();
    });

    it('should retrieve basic expansion suggestions', async () => {
      const suggestions = await expansionService.getSuggestionsInScope(mockScopeParams);
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Verify suggestion structure
      suggestions.forEach(suggestion => {
        expect(suggestion.id).toBeDefined();
        expect(typeof suggestion.lat).toBe('number');
        expect(typeof suggestion.lng).toBe('number');
        expect(suggestion.finalScore).toBeGreaterThanOrEqual(0);
        expect(suggestion.finalScore).toBeLessThanOrEqual(1);
        expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should retrieve enhanced suggestions with intelligence data', async () => {
      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);
      
      expect(enhancedSuggestions).toBeDefined();
      expect(Array.isArray(enhancedSuggestions)).toBe(true);
      expect(enhancedSuggestions.length).toBeGreaterThan(0);
      
      // Verify enhanced suggestion structure
      enhancedSuggestions.forEach(suggestion => {
        // Basic expansion data
        expect(suggestion.id).toBeDefined();
        expect(typeof suggestion.lat).toBe('number');
        expect(typeof suggestion.lng).toBe('number');
        expect(suggestion.finalScore).toBeGreaterThanOrEqual(0);
        
        // Intelligence enhancements
        expect(suggestion.locationIntelligence).toBeDefined();
        expect(suggestion.demographicProfile).toBeDefined();
        expect(suggestion.competitiveAnalysis).toBeDefined();
        expect(suggestion.viabilityAssessment).toBeDefined();
        expect(suggestion.strategicRationale).toBeDefined();
        
        // Intelligence metrics
        expect(suggestion.intelligenceScore).toBeGreaterThanOrEqual(0);
        expect(suggestion.intelligenceScore).toBeLessThanOrEqual(1);
        expect(['LOW', 'MEDIUM', 'HIGH']).toContain(suggestion.credibilityRating);
        expect(typeof suggestion.executiveReadiness).toBe('boolean');
      });
    }, 30000);
  });

  describe('AI Rationale Generation', () => {
    it('should generate strategic rationales for suggestions', async () => {
      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);
      
      expect(enhancedSuggestions.length).toBeGreaterThan(0);
      
      enhancedSuggestions.forEach(suggestion => {
        const rationale = suggestion.strategicRationale;
        
        expect(rationale).toBeDefined();
        expect(Array.isArray(rationale.primaryReasons)).toBe(true);
        expect(rationale.primaryReasons.length).toBeGreaterThan(0);
        expect(Array.isArray(rationale.confidenceFactors)).toBe(true);
      });
    }, 30000);

    it('should include demographic analysis in suggestions', async () => {
      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);
      
      enhancedSuggestions.forEach(suggestion => {
        const demographic = suggestion.demographicProfile;
        
        expect(demographic).toBeDefined();
        expect(demographic.population).toBeDefined();
        expect(demographic.population.total).toBeGreaterThan(0);
        expect(demographic.marketFitScore).toBeGreaterThanOrEqual(0);
        expect(demographic.marketFitScore).toBeLessThanOrEqual(1);
      });
    }, 30000);

    it('should include competitive analysis in suggestions', async () => {
      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);
      
      enhancedSuggestions.forEach(suggestion => {
        const competitive = suggestion.competitiveAnalysis;
        
        expect(competitive).toBeDefined();
        expect(competitive.marketSaturation).toBeGreaterThanOrEqual(0);
        expect(competitive.marketSaturation).toBeLessThanOrEqual(1);
        expect(competitive.marketGapOpportunity).toBeGreaterThanOrEqual(0);
        expect(competitive.marketGapOpportunity).toBeLessThanOrEqual(1);
      });
    }, 30000);
  });

  describe('No Database Writes for Competitors', () => {
    it('should not write to competitor tables during expansion generation', async () => {
      const mockPrisma = module.get<PrismaClient>(PrismaClient);
      
      // Clear any previous calls
      jest.clearAllMocks();
      
      // Generate expansion suggestions
      await expansionService.getSuggestionsInScope(mockScopeParams);
      
      // Verify no competitor database writes occurred
      expect(mockPrisma.competitorPlace.create).not.toHaveBeenCalled();
      expect(mockPrisma.competitorPlace.update).not.toHaveBeenCalled();
      expect(mockPrisma.competitorRefreshJob.create).not.toHaveBeenCalled();
      expect(mockPrisma.competitorRefreshJob.update).not.toHaveBeenCalled();
    });

    it('should not write to competitor tables during enhanced expansion generation', async () => {
      const mockPrisma = module.get<PrismaClient>(PrismaClient);
      
      // Clear any previous calls
      jest.clearAllMocks();
      
      // Generate enhanced expansion suggestions
      await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);
      
      // Verify no competitor database writes occurred
      expect(mockPrisma.competitorPlace.create).not.toHaveBeenCalled();
      expect(mockPrisma.competitorPlace.update).not.toHaveBeenCalled();
      expect(mockPrisma.competitorRefreshJob.create).not.toHaveBeenCalled();
      expect(mockPrisma.competitorRefreshJob.update).not.toHaveBeenCalled();
    }, 30000);
  });

  describe('Performance Validation', () => {
    it('should complete basic expansion within acceptable time', async () => {
      const startTime = Date.now();
      await expansionService.getSuggestionsInScope(mockScopeParams);
      const duration = Date.now() - startTime;
      
      // Basic expansion should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should complete enhanced expansion within acceptable time', async () => {
      const startTime = Date.now();
      await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);
      const duration = Date.now() - startTime;
      
      // Enhanced expansion should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
    }, 35000);
  });

  describe('Data Quality Validation', () => {
    it('should produce suggestions with reasonable scores', async () => {
      const suggestions = await expansionService.getSuggestionsInScope(mockScopeParams);
      
      const avgScore = suggestions.reduce((sum, s) => sum + s.finalScore, 0) / suggestions.length;
      
      // Average score should be reasonable (not all zeros or all ones)
      expect(avgScore).toBeGreaterThan(0.3);
      expect(avgScore).toBeLessThan(0.95);
    });

    it('should produce enhanced suggestions with valid intelligence scores', async () => {
      const enhancedSuggestions = await expansionService.getEnhancedSuggestionsInScope(mockScopeParams);
      
      const avgIntelligenceScore = enhancedSuggestions.reduce(
        (sum, s) => sum + s.intelligenceScore, 0
      ) / enhancedSuggestions.length;
      
      // Average intelligence score should be reasonable
      expect(avgIntelligenceScore).toBeGreaterThan(0.2);
      expect(avgIntelligenceScore).toBeLessThan(0.95);
      
      // At least some suggestions should have high credibility
      const highCredibilityCount = enhancedSuggestions.filter(
        s => s.credibilityRating === 'HIGH'
      ).length;
      expect(highCredibilityCount).toBeGreaterThan(0);
    }, 30000);
  });
});
