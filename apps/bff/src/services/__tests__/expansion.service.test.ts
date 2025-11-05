import { ExpansionService } from '../expansion.service';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
const mockPrisma = {
  tradeArea: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

describe('ExpansionService', () => {
  let service: ExpansionService;

  beforeEach(() => {
    service = new ExpansionService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('getRecommendations', () => {
    const mockTradeArea = {
      id: 'test-id-1',
      region: 'AMER',
      country: 'US',
      centroidLat: 40.7128,
      centroidLng: -74.0060,
      population: 100000,
      footfallIndex: 0.8,
      incomeIndex: 0.75,
      competitorIdx: 0.6,
      existingStoreDist: 2.5,
      demandScore: 0.725,
      supplyPenalty: 0.06,
      competitionPenalty: 0.24,
      finalScore: 0.785,
      confidence: 0.85,
      isLive: true,
    };

    it('should fetch recommendations with default parameters', async () => {
      (mockPrisma.tradeArea.findMany as jest.Mock).mockResolvedValue([mockTradeArea]);

      const result = await service.getRecommendations({ mode: 'live' });

      expect(mockPrisma.tradeArea.findMany).toHaveBeenCalledWith({
        where: { isLive: true },
        orderBy: { finalScore: 'desc' },
        take: 50,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'test-id-1',
        lat: 40.7128,
        lng: -74.0060,
        region: 'AMER',
        country: 'US',
        finalScore: 0.785,
        confidence: 0.85,
        isLive: true,
      });
      expect(result[0].predictedAUV).toBeGreaterThan(0);
      expect(result[0].paybackPeriod).toBeGreaterThan(0);
    });

    it('should filter by region when specified', async () => {
      (mockPrisma.tradeArea.findMany as jest.Mock).mockResolvedValue([mockTradeArea]);

      await service.getRecommendations({ region: 'AMER', mode: 'live' });

      expect(mockPrisma.tradeArea.findMany).toHaveBeenCalledWith({
        where: { region: 'AMER', isLive: true },
        orderBy: { finalScore: 'desc' },
        take: 50,
      });
    });

    it('should filter by mode correctly', async () => {
      (mockPrisma.tradeArea.findMany as jest.Mock).mockResolvedValue([mockTradeArea]);

      await service.getRecommendations({ mode: 'model' });

      expect(mockPrisma.tradeArea.findMany).toHaveBeenCalledWith({
        where: { isLive: false },
        orderBy: { finalScore: 'desc' },
        take: 50,
      });
    });

    it('should respect target and limit parameters', async () => {
      (mockPrisma.tradeArea.findMany as jest.Mock).mockResolvedValue([mockTradeArea]);

      await service.getRecommendations({ mode: 'live', target: 10, limit: 25 });

      expect(mockPrisma.tradeArea.findMany).toHaveBeenCalledWith({
        where: { isLive: true },
        orderBy: { finalScore: 'desc' },
        take: 25,
      });
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (mockPrisma.tradeArea.findMany as jest.Mock).mockRejectedValue(dbError);

      await expect(service.getRecommendations({ mode: 'live' })).rejects.toThrow(dbError);
    });

    it('should calculate predicted metrics correctly', async () => {
      const highScoreArea = { ...mockTradeArea, finalScore: 0.9 };
      (mockPrisma.tradeArea.findMany as jest.Mock).mockResolvedValue([highScoreArea]);

      const result = await service.getRecommendations({ mode: 'live' });

      expect(result[0].predictedAUV).toBeGreaterThan(1000000); // Should be above base AUV
      expect(result[0].paybackPeriod).toBeLessThan(72); // Should be reasonable payback period
    });
  });

  describe('recomputeScores', () => {
    const mockTradeArea = {
      id: 'test-id-1',
      region: 'AMER',
      population: 100000,
      footfallIndex: 0.8,
      incomeIndex: 0.75,
      competitorIdx: 0.6,
      existingStoreDist: 2.5,
    };

    it('should recompute scores for all trade areas when no region specified', async () => {
      (mockPrisma.tradeArea.findMany as jest.Mock).mockResolvedValue([mockTradeArea]);
      (mockPrisma.tradeArea.update as jest.Mock).mockResolvedValue(mockTradeArea);

      const result = await service.recomputeScores();

      expect(mockPrisma.tradeArea.findMany).toHaveBeenCalledWith({ where: {} });
      expect(mockPrisma.tradeArea.update).toHaveBeenCalledTimes(1);
      expect(result.processed).toBe(1);
      expect(result.message).toContain('Successfully recomputed scores for 1 trade areas');
    });

    it('should recompute scores for specific region', async () => {
      (mockPrisma.tradeArea.findMany as jest.Mock).mockResolvedValue([mockTradeArea]);
      (mockPrisma.tradeArea.update as jest.Mock).mockResolvedValue(mockTradeArea);

      const result = await service.recomputeScores('AMER');

      expect(mockPrisma.tradeArea.findMany).toHaveBeenCalledWith({ where: { region: 'AMER' } });
      expect(result.message).toContain('in AMER');
    });

    it('should handle empty results gracefully', async () => {
      (mockPrisma.tradeArea.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.recomputeScores();

      expect(result.processed).toBe(0);
      expect(mockPrisma.tradeArea.update).not.toHaveBeenCalled();
    });

    it('should handle database errors during recomputation', async () => {
      (mockPrisma.tradeArea.findMany as jest.Mock).mockResolvedValue([mockTradeArea]);
      (mockPrisma.tradeArea.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

      await expect(service.recomputeScores()).rejects.toThrow('Update failed');
    });
  });

  describe('calculateGravityScore', () => {
    it('should calculate gravity scores correctly', () => {
      const tradeArea = {
        population: 100000,
        footfallIndex: 0.8,
        incomeIndex: 0.75,
        competitorIdx: 0.6,
        existingStoreDist: 2.5,
      };

      // Access private method through any cast for testing
      const result = (service as any).calculateGravityScore(tradeArea);

      expect(result.demandScore).toBeGreaterThan(0);
      expect(result.demandScore).toBeLessThanOrEqual(1);
      expect(result.supplyPenalty).toBeGreaterThan(0);
      expect(result.competitionPenalty).toBeGreaterThan(0);
      expect(result.finalScore).toBeGreaterThanOrEqual(0);
      expect(result.finalScore).toBeLessThanOrEqual(1);
    });

    it('should handle edge cases in distance calculations', () => {
      const tradeArea = {
        population: 100000,
        footfallIndex: 0.8,
        incomeIndex: 0.75,
        competitorIdx: 0.6,
        existingStoreDist: 0, // Edge case: zero distance
      };

      const result = (service as any).calculateGravityScore(tradeArea);

      expect(result.finalScore).toBeGreaterThanOrEqual(0);
      expect(result.finalScore).toBeLessThanOrEqual(1);
      expect(result.supplyPenalty).toBeGreaterThan(0); // Should handle division by zero
    });

    it('should normalize population correctly', () => {
      const highPopArea = {
        population: 300000, // Above max normalization
        footfallIndex: 0.8,
        incomeIndex: 0.75,
        competitorIdx: 0.6,
        existingStoreDist: 2.5,
      };

      const lowPopArea = {
        population: 10000, // Low population
        footfallIndex: 0.8,
        incomeIndex: 0.75,
        competitorIdx: 0.6,
        existingStoreDist: 2.5,
      };

      const highResult = (service as any).calculateGravityScore(highPopArea);
      const lowResult = (service as any).calculateGravityScore(lowPopArea);

      expect(highResult.demandScore).toBeGreaterThan(lowResult.demandScore);
    });
  });

  describe('calculateConfidence', () => {
    it('should calculate confidence based on data variance', () => {
      const consistentData = {
        footfallIndex: 0.8,
        incomeIndex: 0.8,
        population: 160000, // Normalizes to 0.8
      };

      const inconsistentData = {
        footfallIndex: 0.2,
        incomeIndex: 0.9,
        population: 40000, // Normalizes to 0.2
      };

      const consistentConfidence = (service as any).calculateConfidence(consistentData);
      const inconsistentConfidence = (service as any).calculateConfidence(inconsistentData);

      expect(consistentConfidence).toBeGreaterThan(inconsistentConfidence);
      expect(consistentConfidence).toBeGreaterThanOrEqual(0.3);
      expect(consistentConfidence).toBeLessThanOrEqual(0.95);
      expect(inconsistentConfidence).toBeGreaterThanOrEqual(0.3);
      expect(inconsistentConfidence).toBeLessThanOrEqual(0.95);
    });

    it('should enforce confidence bounds', () => {
      const extremeData = {
        footfallIndex: 0.0,
        incomeIndex: 1.0,
        population: 200000, // Maximum normalization
      };

      const confidence = (service as any).calculateConfidence(extremeData);

      expect(confidence).toBeGreaterThanOrEqual(0.3);
      expect(confidence).toBeLessThanOrEqual(0.95);
    });
  });

  describe('normalizeValue', () => {
    it('should normalize values correctly', () => {
      const normalize = (service as any).normalizeValue.bind(service);

      expect(normalize(50, 0, 100)).toBe(0.5);
      expect(normalize(0, 0, 100)).toBe(0);
      expect(normalize(100, 0, 100)).toBe(1);
      expect(normalize(150, 0, 100)).toBe(1); // Should clamp to 1
      expect(normalize(-50, 0, 100)).toBe(0); // Should clamp to 0
    });

    it('should handle edge cases', () => {
      const normalize = (service as any).normalizeValue.bind(service);

      expect(normalize(50, 50, 50)).toBe(0); // Same min and max
      expect(normalize(25, 50, 0)).toBe(0.5); // Max < min returns normalized value based on actual calculation
    });
  });

  describe('transformToRecommendation', () => {
    it('should transform trade area to recommendation correctly', () => {
      const tradeArea = {
        id: 'test-id-1',
        centroidLat: 40.7128,
        centroidLng: -74.0060,
        region: 'AMER',
        country: 'US',
        finalScore: 0.8,
        confidence: 0.85,
        isLive: true,
        demandScore: 0.75,
        competitionPenalty: 0.2,
        supplyPenalty: 0.1,
        population: 100000,
        footfallIndex: 0.8,
        incomeIndex: 0.75,
      };

      const result = (service as any).transformToRecommendation(tradeArea);

      expect(result).toMatchObject({
        id: 'test-id-1',
        lat: 40.7128,
        lng: -74.0060,
        region: 'AMER',
        country: 'US',
        finalScore: 0.8,
        confidence: 0.85,
        isLive: true,
        demandScore: 0.75,
        competitionPenalty: 0.2,
        supplyPenalty: 0.1,
        population: 100000,
        footfallIndex: 0.8,
        incomeIndex: 0.75,
      });

      expect(result.predictedAUV).toBeGreaterThan(0);
      expect(result.paybackPeriod).toBeGreaterThan(0);
    });

    it('should calculate predicted metrics based on score', () => {
      const highScoreArea = {
        id: 'high-score',
        centroidLat: 40.7128,
        centroidLng: -74.0060,
        region: 'AMER',
        country: 'US',
        finalScore: 0.9,
        confidence: 0.9,
        isLive: true,
        demandScore: 0.85,
        competitionPenalty: 0.1,
        supplyPenalty: 0.05,
        population: 150000,
        footfallIndex: 0.9,
        incomeIndex: 0.85,
      };

      const lowScoreArea = {
        ...highScoreArea,
        id: 'low-score',
        finalScore: 0.3,
      };

      const highResult = (service as any).transformToRecommendation(highScoreArea);
      const lowResult = (service as any).transformToRecommendation(lowScoreArea);

      expect(highResult.predictedAUV).toBeGreaterThan(lowResult.predictedAUV);
      expect(highResult.paybackPeriod).toBeLessThan(lowResult.paybackPeriod);
    });

    it('should handle missing country gracefully', () => {
      const tradeArea = {
        id: 'test-id-1',
        centroidLat: 40.7128,
        centroidLng: -74.0060,
        region: 'AMER',
        country: null,
        finalScore: 0.8,
        confidence: 0.85,
        isLive: true,
        demandScore: 0.75,
        competitionPenalty: 0.2,
        supplyPenalty: 0.1,
        population: 100000,
        footfallIndex: 0.8,
        incomeIndex: 0.75,
      };

      const result = (service as any).transformToRecommendation(tradeArea);

      expect(result.country).toBeUndefined();
    });
  });
});