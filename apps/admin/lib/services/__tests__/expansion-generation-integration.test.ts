import { PrismaClient } from '@prisma/client';
import { ExpansionGenerationService } from '../expansion-generation.service';

// Mock PrismaClient with basic store data
const mockPrisma = {
  store: {
    findMany: jest.fn().mockResolvedValue([
      {
        id: '1',
        latitude: 52.5200,
        longitude: 13.4050,
        country: 'Germany',
        region: 'Berlin',
        annualTurnover: 500000,
        status: 'ACTIVE'
      },
      {
        id: '2', 
        latitude: 50.1109,
        longitude: 8.6821,
        country: 'Germany',
        region: 'Hesse',
        annualTurnover: 450000,
        status: 'ACTIVE'
      }
    ])
  },
  openAIRationaleCache: {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
    delete: jest.fn(),
  },
  openAIStrategyCache: {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
    delete: jest.fn(),
  },
} as unknown as PrismaClient;

// Mock fetch for OpenAI API calls
global.fetch = jest.fn();

// Mock dynamic imports
jest.mock('../h3-tiling.service', () => ({
  H3TilingService: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../land-validation.service', () => ({
  LandValidationService: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../snapping.service', () => ({
  SnappingService: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../germany-land-mask.service', () => ({
  GermanyLandMaskService: jest.fn().mockImplementation(() => ({
    getGermanyBounds: () => ({
      north: 55.0,
      south: 47.0,
      east: 16.0,
      west: 5.0
    }),
    filterH3CellsToLand: (cells: any[]) => cells
  }))
}));

jest.mock('../enhanced-snapping.service', () => ({
  EnhancedSnappingService: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../expansion-smoke-test.service', () => ({
  ExpansionSmokeTestService: jest.fn().mockImplementation(() => ({
    runSmokeTest: () => ({ success: true, summary: 'All tests passed' })
  }))
}));

jest.mock('../settlement-candidate-generator.service', () => ({
  SettlementCandidateGeneratorService: jest.fn().mockImplementation(() => ({
    generateSettlementCandidates: () => ({
      settlementCandidates: [
        {
          id: 'settlement-1',
          name: 'Munich',
          lat: 48.1351,
          lng: 11.5820,
          population: 1500000,
          nearestStoreDistance: 25000,
          anchorCount: 15,
          peerPerformanceScore: 0.8,
          stateCode: 'BY',
          candidateType: 'settlement',
          confidence: 0.85,
          totalScore: 0.82
        }
      ]
    })
  }))
}));

jest.mock('../drive-time-nms.service', () => ({
  DriveTimeNMSService: jest.fn().mockImplementation(() => ({
    applyEnhancedNMS: (candidates: any[]) => ({
      selected: candidates,
      suppressed: [],
      capped: [],
      clusters: [],
      stats: { finalCount: candidates.length }
    })
  }))
}));

jest.mock('../scenario-persistence.service', () => ({
  ScenarioPersistenceService: jest.fn().mockImplementation(() => ({
    generateScenarioId: () => 'test-scenario-123',
    saveScenario: jest.fn().mockResolvedValue({})
  }))
}));

describe('Expansion Generation Integration', () => {
  let service: ExpansionGenerationService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful OpenAI API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: 'Munich presents an excellent expansion opportunity with its population of 1.5M residents and 25km gap to the nearest store, offering strong market potential in the Bavarian region.'
          }
        }],
        usage: {
          total_tokens: 52
        }
      })
    });

    service = new ExpansionGenerationService(mockPrisma);
  });

  describe('Full Generation Flow', () => {
    test('should complete generation with OpenAI rationales enabled', async () => {
      const params = {
        region: { country: 'Germany' },
        aggression: 50,
        populationBias: 0.3,
        proximityBias: 0.4,
        turnoverBias: 0.3,
        minDistanceM: 1000,
        seed: 12345,
        targetCount: 5,
        enableAIRationale: true,
        enableMapboxFiltering: false // Disable to simplify test
      };

      const result = await service.generate(params);

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.metadata).toBeDefined();
      
      // Verify OpenAI usage is tracked
      expect(result.metadata.openaiUsage).toBeDefined();
      expect(result.metadata.openaiUsage?.rationaleGeneration.apiCalls).toBeGreaterThan(0);
      expect(result.metadata.featuresEnabled?.aiRationale).toBe(true);
    });

    test('should handle OpenAI rationales disabled', async () => {
      const params = {
        region: { country: 'Germany' },
        aggression: 50,
        populationBias: 0.3,
        proximityBias: 0.4,
        turnoverBias: 0.3,
        minDistanceM: 1000,
        seed: 12345,
        targetCount: 5,
        enableAIRationale: false,
        enableMapboxFiltering: false
      };

      const result = await service.generate(params);

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.metadata.featuresEnabled?.aiRationale).toBe(false);
      expect(result.metadata.openaiUsage?.rationaleGeneration.apiCalls).toBe(0);
    });

    test('should validate rationale quality', async () => {
      const params = {
        region: { country: 'Germany' },
        aggression: 50,
        populationBias: 0.3,
        proximityBias: 0.4,
        turnoverBias: 0.3,
        minDistanceM: 1000,
        seed: 12345,
        targetCount: 3,
        enableAIRationale: true,
        enableMapboxFiltering: false
      };

      const result = await service.generate(params);

      // Verify all suggestions have rationales
      result.suggestions.forEach(suggestion => {
        expect(suggestion.rationaleText).toBeDefined();
        expect(suggestion.rationaleText.length).toBeGreaterThan(50);
        expect(suggestion.rationaleText).toContain('opportunity');
      });
    });

    test('should handle OpenAI API errors gracefully', async () => {
      // Mock API error
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal server error')
      });

      const params = {
        region: { country: 'Germany' },
        aggression: 50,
        populationBias: 0.3,
        proximityBias: 0.4,
        turnoverBias: 0.3,
        minDistanceM: 1000,
        seed: 12345,
        targetCount: 3,
        enableAIRationale: true,
        enableMapboxFiltering: false
      };

      // Should not throw error, but continue with default rationales
      const result = await service.generate(params);

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.metadata.openaiUsage?.rationaleGeneration.apiCalls).toBe(0);
    });
  });

  describe('Statistics Validation', () => {
    test('should track separate statistics for rationale and strategy services', async () => {
      const params = {
        region: { country: 'Germany' },
        aggression: 50,
        populationBias: 0.3,
        proximityBias: 0.4,
        turnoverBias: 0.3,
        minDistanceM: 1000,
        seed: 12345,
        targetCount: 3,
        enableAIRationale: true,
        enableMapboxFiltering: false
      };

      const result = await service.generate(params);

      expect(result.metadata.openaiUsage).toBeDefined();
      
      const rationaleStats = result.metadata.openaiUsage?.rationaleGeneration;
      const strategyStats = result.metadata.openaiUsage?.strategyLayer;
      
      expect(rationaleStats).toBeDefined();
      expect(strategyStats).toBeDefined();
      
      // Rationale service should have been used
      expect(rationaleStats?.apiCalls).toBeGreaterThan(0);
      expect(rationaleStats?.tokensUsed).toBeGreaterThan(0);
      
      // Strategy service might not be used in this test
      expect(strategyStats?.apiCalls).toBeGreaterThanOrEqual(0);
    });

    test('should detect when AI is enabled but no calls are made', async () => {
      // Mock configuration to disable OpenAI
      const originalApiKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const params = {
        region: { country: 'Germany' },
        aggression: 50,
        populationBias: 0.3,
        proximityBias: 0.4,
        turnoverBias: 0.3,
        minDistanceM: 1000,
        seed: 12345,
        targetCount: 3,
        enableAIRationale: true, // Enabled but no API key
        enableMapboxFiltering: false
      };

      // Should handle gracefully
      const result = await service.generate(params);

      expect(result).toBeDefined();
      expect(result.metadata.openaiUsage?.rationaleGeneration.apiCalls).toBe(0);

      // Restore API key
      process.env.OPENAI_API_KEY = originalApiKey;
    });
  });

  describe('Cache Integration', () => {
    test('should use cache when available', async () => {
      // Mock cache hit for rationale
      mockPrisma.openAIRationaleCache.findUnique = jest.fn().mockResolvedValue({
        rationaleText: 'Cached rationale for Munich expansion opportunity',
        factors: JSON.stringify({
          population: 'High density area',
          proximity: 'Good coverage gap', 
          turnover: 'Strong sales potential'
        }),
        confidence: 0.85,
        dataCompleteness: 0.9,
        expiresAt: new Date(Date.now() + 86400000)
      });

      const params = {
        region: { country: 'Germany' },
        aggression: 50,
        populationBias: 0.3,
        proximityBias: 0.4,
        turnoverBias: 0.3,
        minDistanceM: 1000,
        seed: 12345,
        targetCount: 1,
        enableAIRationale: true,
        enableMapboxFiltering: false
      };

      const result = await service.generate(params);

      expect(result.suggestions[0].rationaleText).toContain('Cached rationale');
      expect(result.metadata.openaiUsage?.rationaleGeneration.cacheHits).toBeGreaterThan(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});