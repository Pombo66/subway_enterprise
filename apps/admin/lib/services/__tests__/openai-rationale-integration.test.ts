import { PrismaClient } from '@prisma/client';
import { ExpansionGenerationService } from '../expansion-generation.service';
import { OpenAIRationaleService } from '../openai-rationale.service';

// Mock PrismaClient
const mockPrisma = {
  openAIRationaleCache: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  openAIStrategyCache: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
} as unknown as PrismaClient;

// Mock fetch for OpenAI API calls
global.fetch = jest.fn();

describe('OpenAI Rationale Integration', () => {
  let service: ExpansionGenerationService;
  let openaiService: OpenAIRationaleService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful OpenAI API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: 'This location offers strong market potential with a population of 50k residents and a 15km gap to the nearest store, providing excellent expansion opportunity.'
          }
        }],
        usage: {
          total_tokens: 45
        }
      })
    });

    service = new ExpansionGenerationService(mockPrisma);
    openaiService = new OpenAIRationaleService(mockPrisma);
  });

  describe('Configuration Validation', () => {
    test('should validate OpenAI API key format', async () => {
      const originalApiKey = process.env.OPENAI_API_KEY;
      
      // Test invalid API key
      process.env.OPENAI_API_KEY = 'invalid-key';
      
      const { ExpansionConfigValidator } = await import('../../config/expansion-config');
      const config = await ExpansionConfigValidator.validate();
      
      expect(config.openai.enabled).toBe(false);
      
      // Restore original API key
      process.env.OPENAI_API_KEY = originalApiKey;
    });

    test('should validate proper API key format', async () => {
      const originalApiKey = process.env.OPENAI_API_KEY;
      
      // Test valid API key format
      process.env.OPENAI_API_KEY = 'sk-test1234567890abcdef1234567890abcdef';
      
      const { ExpansionConfigValidator } = await import('../../config/expansion-config');
      ExpansionConfigValidator.reset(); // Reset cached config
      const config = await ExpansionConfigValidator.validate();
      
      expect(config.openai.enabled).toBe(true);
      expect(config.openai.apiKey).toBe('sk-test1234567890abcdef1234567890abcdef');
      
      // Restore original API key
      process.env.OPENAI_API_KEY = originalApiKey;
    });
  });

  describe('Rationale Generation', () => {
    test('should generate rationale with valid context', async () => {
      // Mock cache miss
      mockPrisma.openAIRationaleCache.findUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.openAIRationaleCache.create = jest.fn().mockResolvedValue({});

      const context = {
        lat: 52.5200,
        lng: 13.4050,
        populationScore: 0.7,
        proximityScore: 0.8,
        turnoverScore: 0.6,
        urbanDensity: 0.5,
        roadDistance: 100,
        buildingDistance: 50
      };

      const result = await openaiService.generateRationale(context);

      expect(result).toBeDefined();
      expect(result.text).toContain('market potential');
      expect(result.confidence).toBeGreaterThan(0);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/json'
          })
        })
      );
    });

    test('should handle API errors gracefully', async () => {
      // Mock API error
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded')
      });

      const context = {
        lat: 52.5200,
        lng: 13.4050,
        populationScore: 0.7,
        proximityScore: 0.8,
        turnoverScore: 0.6,
        urbanDensity: null,
        roadDistance: null,
        buildingDistance: null
      };

      await expect(openaiService.generateRationale(context)).rejects.toThrow('OpenAI API error: 429');
    });

    test('should use cache when available', async () => {
      // Mock cache hit
      const cachedResult = {
        rationaleText: 'Cached rationale text',
        factors: JSON.stringify({
          population: 'High density area',
          proximity: 'Good coverage gap',
          turnover: 'Strong sales potential'
        }),
        confidence: 0.8,
        dataCompleteness: 0.9,
        expiresAt: new Date(Date.now() + 86400000) // 24 hours from now
      };
      
      mockPrisma.openAIRationaleCache.findUnique = jest.fn().mockResolvedValue(cachedResult);

      const context = {
        lat: 52.5200,
        lng: 13.4050,
        populationScore: 0.7,
        proximityScore: 0.8,
        turnoverScore: 0.6,
        urbanDensity: 0.5,
        roadDistance: 100,
        buildingDistance: 50
      };

      const result = await openaiService.generateRationale(context);

      expect(result.text).toBe('Cached rationale text');
      expect(global.fetch).not.toHaveBeenCalled();
      
      const stats = openaiService.getCacheStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.apiCalls).toBe(0);
    });
  });

  describe('Statistics Tracking', () => {
    test('should track API calls correctly', async () => {
      // Mock cache miss
      mockPrisma.openAIRationaleCache.findUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.openAIRationaleCache.create = jest.fn().mockResolvedValue({});

      const context = {
        lat: 52.5200,
        lng: 13.4050,
        populationScore: 0.7,
        proximityScore: 0.8,
        turnoverScore: 0.6,
        urbanDensity: null,
        roadDistance: null,
        buildingDistance: null
      };

      await openaiService.generateRationale(context);

      const stats = openaiService.getCacheStats();
      expect(stats.apiCalls).toBe(1);
      expect(stats.totalTokensUsed).toBe(45);
      expect(stats.cacheMisses).toBe(1);
    });

    test('should calculate hit rate correctly', async () => {
      // Reset stats
      openaiService.resetCacheStats();

      // Mock one cache hit
      mockPrisma.openAIRationaleCache.findUnique = jest.fn()
        .mockResolvedValueOnce({
          rationaleText: 'Cached text',
          factors: '{}',
          confidence: 0.8,
          dataCompleteness: 0.9,
          expiresAt: new Date(Date.now() + 86400000)
        })
        .mockResolvedValueOnce(null);

      mockPrisma.openAIRationaleCache.create = jest.fn().mockResolvedValue({});

      const context = {
        lat: 52.5200,
        lng: 13.4050,
        populationScore: 0.7,
        proximityScore: 0.8,
        turnoverScore: 0.6,
        urbanDensity: null,
        roadDistance: null,
        buildingDistance: null
      };

      // First call - cache hit
      await openaiService.generateRationale(context);
      
      // Second call - cache miss
      await openaiService.generateRationale({ ...context, lat: 52.5201 });

      const stats = openaiService.getCacheStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
      expect(stats.hitRate).toBe(50); // 50% hit rate
    });
  });

  describe('Error Handling', () => {
    test('should throw error when API key is missing', async () => {
      const originalApiKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const context = {
        lat: 52.5200,
        lng: 13.4050,
        populationScore: 0.7,
        proximityScore: 0.8,
        turnoverScore: 0.6,
        urbanDensity: null,
        roadDistance: null,
        buildingDistance: null
      };

      await expect(openaiService.generateRationale(context)).rejects.toThrow('OPENAI_API_KEY not configured');

      // Restore API key
      process.env.OPENAI_API_KEY = originalApiKey;
    });

    test('should handle network errors', async () => {
      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      mockPrisma.openAIRationaleCache.findUnique = jest.fn().mockResolvedValue(null);

      const context = {
        lat: 52.5200,
        lng: 13.4050,
        populationScore: 0.7,
        proximityScore: 0.8,
        turnoverScore: 0.6,
        urbanDensity: null,
        roadDistance: null,
        buildingDistance: null
      };

      await expect(openaiService.generateRationale(context)).rejects.toThrow('Network error');
    });
  });

  describe('Data Handling', () => {
    test('should handle unknown data fields', async () => {
      mockPrisma.openAIRationaleCache.findUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.openAIRationaleCache.create = jest.fn().mockResolvedValue({});

      const context = {
        lat: 52.5200,
        lng: 13.4050,
        populationScore: 0.7,
        proximityScore: 0.8,
        turnoverScore: 0.6,
        urbanDensity: null,
        roadDistance: null,
        buildingDistance: null,
        nearestStoreKm: 'unknown' as const,
        tradeAreaPopulation: 'unknown' as const,
        proximityGapPercentile: 'unknown' as const,
        turnoverPercentile: 'unknown' as const
      };

      const result = await openaiService.generateRationale(context);

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      
      // Verify the prompt includes "unknown" flags
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const prompt = requestBody.messages[1].content;
      
      expect(prompt).toContain('unknown (data not available)');
    });
  });
});