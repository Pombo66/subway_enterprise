import { ScoringService } from '../ScoringService';
import { CandidateFeatures, ScoreWeights, DataQuality, LocationCandidate, AnchorType, CandidateStatus } from '../../../types/core';
import { DEFAULT_WEIGHTS } from '../../../config/constants';

describe('ScoringService', () => {
  let scoringService: ScoringService;
  let mockFeatures: CandidateFeatures;
  let mockDataQuality: DataQuality;

  beforeEach(() => {
    scoringService = new ScoringService();
    
    mockFeatures = {
      population: 50000,
      nearestBrandKm: 5.0,
      competitorDensity: 0.1,
      anchors: {
        raw: 10,
        deduplicated: 8,
        diminishingScore: 5.2,
        breakdown: {
          [AnchorType.MALL_TENANT]: 2,
          [AnchorType.STATION_SHOPS]: 1,
          [AnchorType.GROCER]: 3,
          [AnchorType.RETAIL]: 2
        }
      },
      performanceProxy: 0.7
    };

    mockDataQuality = {
      completeness: 0.8,
      estimated: {
        population: false,
        anchors: false,
        travelTime: false
      },
      confidence: 0.9
    };
  });

  describe('calculateScores', () => {
    it('should calculate all score components', () => {
      const scores = scoringService.calculateScores(mockFeatures, DEFAULT_WEIGHTS, mockDataQuality);

      expect(scores).toHaveProperty('population');
      expect(scores).toHaveProperty('gap');
      expect(scores).toHaveProperty('anchor');
      expect(scores).toHaveProperty('performance');
      expect(scores).toHaveProperty('saturationPenalty');
      expect(scores).toHaveProperty('final');

      expect(scores.population).toBeGreaterThan(0);
      expect(scores.gap).toBeGreaterThan(0);
      expect(scores.anchor).toBeGreaterThan(0);
      expect(scores.performance).toBeGreaterThan(0);
      expect(scores.saturationPenalty).toBeGreaterThanOrEqual(0);
      expect(scores.final).toBeGreaterThan(0);
    });

    it('should produce scores between 0 and 1', () => {
      const scores = scoringService.calculateScores(mockFeatures, DEFAULT_WEIGHTS, mockDataQuality);

      expect(scores.population).toBeGreaterThanOrEqual(0);
      expect(scores.population).toBeLessThanOrEqual(1);
      expect(scores.gap).toBeGreaterThanOrEqual(0);
      expect(scores.gap).toBeLessThanOrEqual(1);
      expect(scores.anchor).toBeGreaterThanOrEqual(0);
      expect(scores.anchor).toBeLessThanOrEqual(1);
      expect(scores.performance).toBeGreaterThanOrEqual(0);
      expect(scores.performance).toBeLessThanOrEqual(1);
      expect(scores.final).toBeGreaterThanOrEqual(0);
      expect(scores.final).toBeLessThanOrEqual(1);
    });

    it('should handle zero features gracefully', () => {
      const zeroFeatures: CandidateFeatures = {
        population: 0,
        nearestBrandKm: Infinity,
        competitorDensity: 0,
        anchors: {
          raw: 0,
          deduplicated: 0,
          diminishingScore: 0,
          breakdown: {
            [AnchorType.MALL_TENANT]: 0,
            [AnchorType.STATION_SHOPS]: 0,
            [AnchorType.GROCER]: 0,
            [AnchorType.RETAIL]: 0
          }
        },
        performanceProxy: 0
      };

      const scores = scoringService.calculateScores(zeroFeatures, DEFAULT_WEIGHTS, mockDataQuality);

      expect(scores.population).toBe(0);
      expect(scores.anchor).toBe(0);
      expect(scores.performance).toBe(0);
      expect(scores.final).toBeGreaterThanOrEqual(0);
    });
  });

  describe('individual score calculations', () => {
    it('should calculate population score correctly', () => {
      expect(scoringService.calculatePopulationScore(0, 100000)).toBe(0);
      expect(scoringService.calculatePopulationScore(50000, 100000)).toBe(0.5);
      expect(scoringService.calculatePopulationScore(100000, 100000)).toBe(1);
      expect(scoringService.calculatePopulationScore(150000, 100000)).toBe(1); // Capped at 1
    });

    it('should calculate gap score correctly', () => {
      // High distance, low competition = high gap score
      const highGap = scoringService.calculateGapScore(15, 0);
      expect(highGap).toBeGreaterThan(0.5);

      // Low distance, high competition = low gap score
      const lowGap = scoringService.calculateGapScore(1, 0.5);
      expect(lowGap).toBeLessThan(0.5);
    });

    it('should calculate anchor score correctly', () => {
      const anchorData = mockFeatures.anchors;
      const score = scoringService.calculateAnchorScore(anchorData);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);

      // Zero anchors should give zero score
      const zeroAnchors = { ...anchorData, diminishingScore: 0 };
      expect(scoringService.calculateAnchorScore(zeroAnchors)).toBe(0);
    });

    it('should calculate performance score correctly', () => {
      expect(scoringService.calculatePerformanceScore(0)).toBe(0);
      expect(scoringService.calculatePerformanceScore(0.5)).toBe(0.5);
      expect(scoringService.calculatePerformanceScore(1)).toBe(1);
      expect(scoringService.calculatePerformanceScore(1.5)).toBe(1); // Capped at 1
    });

    it('should calculate saturation penalty correctly', () => {
      // High competition should increase penalty
      const highPenalty = scoringService.calculateSaturationPenalty(0.5, 5);
      const lowPenalty = scoringService.calculateSaturationPenalty(0.1, 5);
      expect(highPenalty).toBeGreaterThanOrEqual(lowPenalty);

      // Close brand store should add penalty
      const brandPenalty = scoringService.calculateSaturationPenalty(0.1, 0.5);
      const noBrandPenalty = scoringService.calculateSaturationPenalty(0.1, 5);
      expect(brandPenalty).toBeGreaterThan(noBrandPenalty);
    });
  });

  describe('adjustWeightsForDataQuality', () => {
    it('should reduce weights for estimated data', () => {
      const estimatedQuality: DataQuality = {
        completeness: 0.6,
        estimated: {
          population: true,
          anchors: true,
          travelTime: false
        },
        confidence: 0.7
      };

      const adjustedWeights = scoringService.adjustWeightsForDataQuality(DEFAULT_WEIGHTS, estimatedQuality);

      expect(adjustedWeights.population).toBeLessThan(DEFAULT_WEIGHTS.population);
      expect(adjustedWeights.anchor).toBeLessThan(DEFAULT_WEIGHTS.anchor);
      expect(adjustedWeights.gap).toBeGreaterThan(DEFAULT_WEIGHTS.gap); // Should receive redistribution
    });

    it('should maintain weight sum of 1', () => {
      const estimatedQuality: DataQuality = {
        completeness: 0.6,
        estimated: {
          population: true,
          anchors: true,
          travelTime: true
        },
        confidence: 0.7
      };

      const adjustedWeights = scoringService.adjustWeightsForDataQuality(DEFAULT_WEIGHTS, estimatedQuality);
      const sum = Object.values(adjustedWeights).reduce((total, weight) => total + weight, 0);

      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('should not significantly change weights for high-quality data', () => {
      const highQuality: DataQuality = {
        completeness: 1.0,
        estimated: {
          population: false,
          anchors: false,
          travelTime: false
        },
        confidence: 1.0
      };

      const adjustedWeights = scoringService.adjustWeightsForDataQuality(DEFAULT_WEIGHTS, highQuality);

      // Weights should be close to original (allowing for normalization)
      expect(adjustedWeights.population).toBeGreaterThan(0.2);
      expect(adjustedWeights.anchor).toBeGreaterThan(0.15);
      
      // Total should still sum to 1
      const sum = Object.values(adjustedWeights).reduce((total, weight) => total + weight, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });

  describe('calculateFinalScore', () => {
    it('should combine scores with weights correctly', () => {
      const scores = {
        population: 0.8,
        gap: 0.6,
        anchor: 0.4,
        performance: 0.7,
        saturationPenalty: 0.2
      };

      const finalScore = scoringService.calculateFinalScore(scores, DEFAULT_WEIGHTS);

      expect(finalScore).toBeGreaterThan(0);
      expect(finalScore).toBeLessThanOrEqual(1);

      // Should be affected by saturation penalty
      const scoresNoPenalty = { ...scores, saturationPenalty: 0 };
      const finalScoreNoPenalty = scoringService.calculateFinalScore(scoresNoPenalty, DEFAULT_WEIGHTS);
      expect(finalScoreNoPenalty).toBeGreaterThan(finalScore);
    });

    it('should handle extreme values', () => {
      const maxScores = {
        population: 1,
        gap: 1,
        anchor: 1,
        performance: 1,
        saturationPenalty: 0
      };

      const minScores = {
        population: 0,
        gap: 0,
        anchor: 0,
        performance: 0,
        saturationPenalty: 1
      };

      const maxFinal = scoringService.calculateFinalScore(maxScores, DEFAULT_WEIGHTS);
      const minFinal = scoringService.calculateFinalScore(minScores, DEFAULT_WEIGHTS);

      expect(maxFinal).toBeGreaterThan(minFinal);
      expect(maxFinal).toBeLessThanOrEqual(1);
      expect(minFinal).toBeGreaterThanOrEqual(0);
    });
  });

  describe('normalizeScores', () => {
    it('should normalize scores across candidates', () => {
      const candidates: LocationCandidate[] = [
        {
          id: 'candidate1',
          lat: 52.5,
          lng: 13.4,
          h3Index: 'test1',
          administrativeRegion: 'region1',
          features: mockFeatures,
          scores: {
            population: 0.8,
            gap: 0.6,
            anchor: 0.4,
            performance: 0.7,
            saturationPenalty: 0.2,
            final: 0.65
          },
          constraints: { spacingOk: true, stateShareOk: true },
          dataQuality: mockDataQuality,
          status: CandidateStatus.SELECTED
        },
        {
          id: 'candidate2',
          lat: 52.6,
          lng: 13.5,
          h3Index: 'test2',
          administrativeRegion: 'region1',
          features: mockFeatures,
          scores: {
            population: 0.4,
            gap: 0.8,
            anchor: 0.6,
            performance: 0.3,
            saturationPenalty: 0.1,
            final: 0.55
          },
          constraints: { spacingOk: true, stateShareOk: true },
          dataQuality: mockDataQuality,
          status: CandidateStatus.SELECTED
        }
      ];

      const normalized = scoringService.normalizeScores(candidates);

      expect(normalized).toHaveLength(2);
      
      // Check that scores are normalized (should be between 0 and 1)
      normalized.forEach(candidate => {
        expect(candidate.scores.population).toBeGreaterThanOrEqual(0);
        expect(candidate.scores.population).toBeLessThanOrEqual(1);
        expect(candidate.scores.final).toBeGreaterThanOrEqual(0);
        expect(candidate.scores.final).toBeLessThanOrEqual(1);
      });
    });

    it('should handle empty candidate list', () => {
      const normalized = scoringService.normalizeScores([]);
      expect(normalized).toEqual([]);
    });

    it('should handle single candidate', () => {
      const candidates: LocationCandidate[] = [{
        id: 'candidate1',
        lat: 52.5,
        lng: 13.4,
        h3Index: 'test1',
        administrativeRegion: 'region1',
        features: mockFeatures,
        scores: {
          population: 0.8,
          gap: 0.6,
          anchor: 0.4,
          performance: 0.7,
          saturationPenalty: 0.2,
          final: 0.65
        },
        constraints: { spacingOk: true, stateShareOk: true },
        dataQuality: mockDataQuality,
        status: CandidateStatus.SELECTED
      }];

      const normalized = scoringService.normalizeScores(candidates);
      expect(normalized).toHaveLength(1);
      // Single candidate should get normalized to 0.5 (middle value)
      expect(normalized[0].scores.population).toBe(0.5);
    });
  });

  describe('rankCandidates', () => {
    it('should rank candidates by final score', () => {
      const candidates: LocationCandidate[] = [
        {
          id: 'low',
          lat: 52.5,
          lng: 13.4,
          h3Index: 'test1',
          administrativeRegion: 'region1',
          features: mockFeatures,
          scores: { population: 0.3, gap: 0.3, anchor: 0.3, performance: 0.3, saturationPenalty: 0.1, final: 0.3 },
          constraints: { spacingOk: true, stateShareOk: true },
          dataQuality: mockDataQuality,
          status: CandidateStatus.SELECTED
        },
        {
          id: 'high',
          lat: 52.6,
          lng: 13.5,
          h3Index: 'test2',
          administrativeRegion: 'region1',
          features: mockFeatures,
          scores: { population: 0.8, gap: 0.8, anchor: 0.8, performance: 0.8, saturationPenalty: 0.1, final: 0.8 },
          constraints: { spacingOk: true, stateShareOk: true },
          dataQuality: mockDataQuality,
          status: CandidateStatus.SELECTED
        },
        {
          id: 'medium',
          lat: 52.7,
          lng: 13.6,
          h3Index: 'test3',
          administrativeRegion: 'region1',
          features: mockFeatures,
          scores: { population: 0.5, gap: 0.5, anchor: 0.5, performance: 0.5, saturationPenalty: 0.1, final: 0.5 },
          constraints: { spacingOk: true, stateShareOk: true },
          dataQuality: mockDataQuality,
          status: CandidateStatus.SELECTED
        }
      ];

      const ranked = scoringService.rankCandidates(candidates);

      expect(ranked[0].id).toBe('high');
      expect(ranked[1].id).toBe('medium');
      expect(ranked[2].id).toBe('low');
      expect(ranked[0].scores.final).toBeGreaterThan(ranked[1].scores.final);
      expect(ranked[1].scores.final).toBeGreaterThan(ranked[2].scores.final);
    });

    it('should not modify original array', () => {
      const candidates: LocationCandidate[] = [
        {
          id: 'first',
          lat: 52.5,
          lng: 13.4,
          h3Index: 'test1',
          administrativeRegion: 'region1',
          features: mockFeatures,
          scores: { population: 0.3, gap: 0.3, anchor: 0.3, performance: 0.3, saturationPenalty: 0.1, final: 0.3 },
          constraints: { spacingOk: true, stateShareOk: true },
          dataQuality: mockDataQuality,
          status: CandidateStatus.SELECTED
        }
      ];

      const originalFirst = candidates[0].id;
      scoringService.rankCandidates(candidates);
      
      expect(candidates[0].id).toBe(originalFirst);
    });
  });

  describe('calculateScoringDistribution', () => {
    it('should calculate distribution statistics', () => {
      const candidates: LocationCandidate[] = [
        { id: '1', scores: { final: 0.2 } },
        { id: '2', scores: { final: 0.4 } },
        { id: '3', scores: { final: 0.6 } },
        { id: '4', scores: { final: 0.8 } }
      ].map(c => ({
        ...c,
        lat: 52.5,
        lng: 13.4,
        h3Index: 'test',
        administrativeRegion: 'region1',
        features: mockFeatures,
        scores: { population: 0.5, gap: 0.5, anchor: 0.5, performance: 0.5, saturationPenalty: 0.1, ...c.scores },
        constraints: { spacingOk: true, stateShareOk: true },
        dataQuality: mockDataQuality,
        status: CandidateStatus.SELECTED
      }));

      const distribution = scoringService.calculateScoringDistribution(candidates);

      expect(distribution.mean).toBeCloseTo(0.5, 1);
      expect(distribution.median).toBeCloseTo(0.5, 1);
      expect(distribution.min).toBe(0.2);
      expect(distribution.max).toBe(0.8);
      expect(distribution.std).toBeGreaterThan(0);
    });

    it('should handle empty candidates', () => {
      const distribution = scoringService.calculateScoringDistribution([]);
      
      expect(distribution.mean).toBe(0);
      expect(distribution.median).toBe(0);
      expect(distribution.std).toBe(0);
      expect(distribution.min).toBe(0);
      expect(distribution.max).toBe(0);
    });
  });

  describe('calculateCompletenessScore', () => {
    it('should calculate completeness based on available data', () => {
      const completeness = scoringService.calculateCompletenessScore(mockFeatures, mockDataQuality);
      
      expect(completeness).toBeGreaterThan(0);
      expect(completeness).toBeLessThanOrEqual(1);
    });

    it('should penalize estimated data', () => {
      const estimatedQuality: DataQuality = {
        completeness: 0.6,
        estimated: {
          population: true,
          anchors: true,
          travelTime: true
        },
        confidence: 0.6
      };

      const highQualityScore = scoringService.calculateCompletenessScore(mockFeatures, mockDataQuality);
      const lowQualityScore = scoringService.calculateCompletenessScore(mockFeatures, estimatedQuality);

      expect(highQualityScore).toBeGreaterThan(lowQualityScore);
    });
  });
});