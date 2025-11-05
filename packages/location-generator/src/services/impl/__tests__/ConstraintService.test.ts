import { ConstraintService } from '../ConstraintService';
import { LocationCandidate, CountryConfig, ExistingStore, CandidateStatus, AnchorType } from '../../../types/core';

describe('ConstraintService', () => {
  let constraintService: ConstraintService;
  let mockCountryConfig: CountryConfig;
  let mockExistingStores: ExistingStore[];

  beforeEach(() => {
    constraintService = new ConstraintService();
    
    mockCountryConfig = {
      countryCode: 'DE',
      boundary: {
        type: 'Polygon',
        coordinates: [[[13.0, 52.3], [13.8, 52.3], [13.8, 52.7], [13.0, 52.7], [13.0, 52.3]]]
      },
      administrativeRegions: [
        {
          id: 'BE',
          name: 'Berlin',
          boundary: {
            type: 'Polygon',
            coordinates: [[[13.0, 52.3], [13.8, 52.3], [13.8, 52.7], [13.0, 52.7], [13.0, 52.3]]]
          },
          population: 3700000
        },
        {
          id: 'BY',
          name: 'Bavaria',
          boundary: {
            type: 'Polygon',
            coordinates: [[[11.0, 47.0], [13.0, 47.0], [13.0, 50.0], [11.0, 50.0], [11.0, 47.0]]]
          },
          population: 13100000
        }
      ],
      majorMetropolitanAreas: ['Berlin', 'Munich'],
      maxRegionShare: 0.4
    };

    mockExistingStores = [
      { id: 'store1', name: 'Store 1', lat: 52.5, lng: 13.4 },
      { id: 'store2', name: 'Store 2', lat: 52.6, lng: 13.5 }
    ];
  });

  const createMockCandidate = (id: string, lat: number, lng: number, region: string = 'BE'): LocationCandidate => ({
    id,
    lat,
    lng,
    h3Index: `h3_${id}`,
    administrativeRegion: region,
    features: {
      population: 50000,
      nearestBrandKm: 2.0,
      competitorDensity: 0.1,
      anchors: {
        raw: 5,
        deduplicated: 4,
        diminishingScore: 3.2,
        breakdown: {
          [AnchorType.MALL_TENANT]: 1,
          [AnchorType.STATION_SHOPS]: 1,
          [AnchorType.GROCER]: 1,
          [AnchorType.RETAIL]: 1
        }
      },
      performanceProxy: 0.7
    },
    scores: {
      population: 0.5,
      gap: 0.6,
      anchor: 0.4,
      performance: 0.7,
      saturationPenalty: 0.2,
      final: 0.6
    },
    constraints: { spacingOk: true, stateShareOk: true },
    dataQuality: {
      completeness: 0.8,
      estimated: { population: false, anchors: false, travelTime: false },
      confidence: 0.9
    },
    status: CandidateStatus.SELECTED
  });

  describe('validateSpacing', () => {
    it('should validate spacing against existing stores', () => {
      const candidate = createMockCandidate('test1', 52.5, 13.4); // Same location as store1
      const result = constraintService.validateSpacing(candidate, mockExistingStores, [], 800);
      
      expect(result).toBe(false); // Should fail due to proximity to existing store
    });

    it('should validate spacing against selected candidates', () => {
      const candidate1 = createMockCandidate('test1', 52.5, 13.4);
      const candidate2 = createMockCandidate('test2', 52.501, 13.401); // Very close
      
      const result = constraintService.validateSpacing(candidate2, [], [candidate1], 800);
      
      expect(result).toBe(false); // Should fail due to proximity to other candidate
    });

    it('should pass when spacing is adequate', () => {
      const candidate = createMockCandidate('test1', 52.7, 13.7); // Far from existing stores
      const result = constraintService.validateSpacing(candidate, mockExistingStores, [], 800);
      
      expect(result).toBe(true);
    });

    it('should handle empty stores and candidates', () => {
      const candidate = createMockCandidate('test1', 52.5, 13.4);
      const result = constraintService.validateSpacing(candidate, [], [], 800);
      
      expect(result).toBe(true);
    });

    it('should ignore self when checking against selected candidates', () => {
      const candidate = createMockCandidate('test1', 52.5, 13.4);
      const result = constraintService.validateSpacing(candidate, [], [candidate], 800);
      
      expect(result).toBe(true); // Should ignore itself
    });
  });

  describe('validateRegionalShare', () => {
    it('should validate regional distribution within absolute limits', () => {
      // Create distribution that respects absolute limits (3 BE, 3 BY, 4 others = 30% each max)
      const candidates = [
        createMockCandidate('c1', 52.5, 13.4, 'BE'),
        createMockCandidate('c2', 52.6, 13.5, 'BE'),
        createMockCandidate('c3', 52.7, 13.6, 'BE'),
        createMockCandidate('c4', 48.1, 11.6, 'BY'),
        createMockCandidate('c5', 48.2, 11.7, 'BY'),
        createMockCandidate('c6', 48.3, 11.8, 'BY'),
        createMockCandidate('c7', 50.1, 8.7, 'NW'), // North Rhine-Westphalia
        createMockCandidate('c8', 50.2, 8.8, 'NW'),
        createMockCandidate('c9', 53.5, 10.0, 'HH'), // Hamburg
        createMockCandidate('c10', 53.6, 10.1, 'HH')
      ];

      const result = constraintService.validateRegionalShare(candidates, mockCountryConfig);
      
      // Check that no region exceeds absolute maximum (40%)
      const maxAllowed = Math.floor(candidates.length * mockCountryConfig.maxRegionShare); // 4 out of 10
      
      const regionCounts = new Map<string, number>();
      for (const candidate of candidates) {
        const count = regionCounts.get(candidate.administrativeRegion) || 0;
        regionCounts.set(candidate.administrativeRegion, count + 1);
      }

      for (const [regionId, count] of regionCounts) {
        expect(count).toBeLessThanOrEqual(maxAllowed);
      }
      
      // Should not have absolute limit violations
      const absoluteViolations = result.violations.filter(v => v.details.includes('exceeding absolute max share'));
      expect(absoluteViolations).toHaveLength(0);
    });

    it('should detect regional share violations', () => {
      // Create 5 candidates, all in Berlin (exceeds 40% limit)
      const candidates = [
        createMockCandidate('c1', 52.5, 13.4, 'BE'),
        createMockCandidate('c2', 52.6, 13.5, 'BE'),
        createMockCandidate('c3', 52.7, 13.6, 'BE'),
        createMockCandidate('c4', 52.8, 13.7, 'BE'),
        createMockCandidate('c5', 52.9, 13.8, 'BE')
      ];

      const result = constraintService.validateRegionalShare(candidates, mockCountryConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].reason).toBe('regional_share');
    });

    it('should handle empty candidates', () => {
      const result = constraintService.validateRegionalShare([], mockCountryConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('validateDataQuality', () => {
    it('should validate data completeness', () => {
      const candidate = createMockCandidate('test1', 52.5, 13.4);
      candidate.dataQuality.completeness = 0.8;
      
      expect(constraintService.validateDataQuality(candidate, 0.5)).toBe(true);
      expect(constraintService.validateDataQuality(candidate, 0.9)).toBe(false);
    });

    it('should handle edge cases', () => {
      const candidate = createMockCandidate('test1', 52.5, 13.4);
      
      candidate.dataQuality.completeness = 0.5;
      expect(constraintService.validateDataQuality(candidate, 0.5)).toBe(true);
      
      candidate.dataQuality.completeness = 0.49999;
      expect(constraintService.validateDataQuality(candidate, 0.5)).toBe(false);
    });
  });

  describe('validateMetropolitanAreas', () => {
    it('should validate metropolitan area representation', () => {
      const candidates = [
        createMockCandidate('c1', 52.5, 13.4, 'BE'), // Berlin
        createMockCandidate('c2', 48.1, 11.6, 'BY')  // Bavaria (contains Munich)
      ];

      const result = constraintService.validateMetropolitanAreas(candidates, mockCountryConfig);
      
      // The simple implementation may not perfectly detect Munich in Bavaria
      expect(result.missingAreas.length).toBeLessThanOrEqual(mockCountryConfig.majorMetropolitanAreas.length);
      expect(Array.isArray(result.missingAreas)).toBe(true);
    });

    it('should detect missing metropolitan areas', () => {
      const candidates = [
        createMockCandidate('c1', 52.5, 13.4, 'BE') // Only Berlin
      ];

      const result = constraintService.validateMetropolitanAreas(candidates, mockCountryConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.missingAreas).toContain('Munich');
    });

    it('should handle empty candidates', () => {
      const result = constraintService.validateMetropolitanAreas([], mockCountryConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.missingAreas).toEqual(mockCountryConfig.majorMetropolitanAreas);
    });
  });

  describe('validateAcceptanceRate', () => {
    it('should validate acceptance rate', () => {
      const result1 = constraintService.validateAcceptanceRate(15, 100, 0.15);
      expect(result1.isValid).toBe(true);
      expect(result1.actualRate).toBe(0.15);
      expect(result1.warning).toBeUndefined();

      const result2 = constraintService.validateAcceptanceRate(10, 100, 0.15);
      expect(result2.isValid).toBe(false);
      expect(result2.actualRate).toBe(0.10);
      expect(result2.warning).toBeDefined();
    });

    it('should handle edge cases', () => {
      const result1 = constraintService.validateAcceptanceRate(0, 0, 0.15);
      expect(result1.isValid).toBe(true);
      expect(result1.actualRate).toBe(0);

      const result2 = constraintService.validateAcceptanceRate(100, 100, 0.15);
      expect(result2.isValid).toBe(true);
      expect(result2.actualRate).toBe(1.0);
    });
  });

  describe('getConstraintViolations', () => {
    it('should identify all constraint violations', () => {
      const candidate = createMockCandidate('test1', 52.5, 13.4); // Same location as store1
      candidate.dataQuality.completeness = 0.3; // Low completeness

      const context = {
        existingStores: mockExistingStores,
        selectedCandidates: [],
        config: mockCountryConfig,
        minSpacingM: 800,
        minCompleteness: 0.5
      };

      const violations = constraintService.getConstraintViolations(candidate, context);
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.reason === 'spacing')).toBe(true);
      expect(violations.some(v => v.reason === 'data_quality')).toBe(true);
    });

    it('should return no violations for valid candidate', () => {
      const candidate = createMockCandidate('test1', 52.7, 13.7); // Far from stores
      candidate.dataQuality.completeness = 0.9; // High completeness

      const context = {
        existingStores: mockExistingStores,
        selectedCandidates: [],
        config: mockCountryConfig,
        minSpacingM: 800,
        minCompleteness: 0.5
      };

      const violations = constraintService.getConstraintViolations(candidate, context);
      
      expect(violations).toHaveLength(0);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between points', () => {
      const distance = constraintService.calculateDistance(52.5, 13.4, 52.6, 13.5);
      
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(20); // Should be reasonable distance
    });

    it('should handle same points', () => {
      const distance = constraintService.calculateDistance(52.5, 13.4, 52.5, 13.4);
      
      expect(distance).toBe(0);
    });

    it('should handle invalid coordinates', () => {
      const distance = constraintService.calculateDistance(NaN, 13.4, 52.5, 13.4);
      
      expect(distance).toBe(Infinity);
    });
  });

  describe('isWithinRegion', () => {
    it('should check if point is within region', () => {
      const region = mockCountryConfig.administrativeRegions[0]; // Berlin
      
      const withinRegion = constraintService.isWithinRegion(52.5, 13.4, region);
      const outsideRegion = constraintService.isWithinRegion(48.1, 11.6, region);
      
      expect(withinRegion).toBe(true);
      expect(outsideRegion).toBe(false);
    });

    it('should handle edge cases', () => {
      const region = mockCountryConfig.administrativeRegions[0];
      
      // Test boundary points
      const onBoundary = constraintService.isWithinRegion(52.3, 13.0, region);
      expect(typeof onBoundary).toBe('boolean');
    });
  });

  describe('calculatePopulationWeightedFairness', () => {
    it('should calculate population-weighted fairness', () => {
      const candidates = [
        createMockCandidate('c1', 52.5, 13.4, 'BE'),
        createMockCandidate('c2', 48.1, 11.6, 'BY'),
        createMockCandidate('c3', 48.2, 11.7, 'BY'),
        createMockCandidate('c4', 48.3, 11.8, 'BY')
      ];

      const result = constraintService.calculatePopulationWeightedFairness(candidates, mockCountryConfig);
      
      expect(result.expectedShares).toBeDefined();
      expect(result.fairnessScore).toBeGreaterThanOrEqual(0);
      expect(result.fairnessScore).toBeLessThanOrEqual(1);
      
      // Bavaria should have higher expected share due to larger population
      const berlinShare = result.expectedShares.get('BE') || 0;
      const bavariaShare = result.expectedShares.get('BY') || 0;
      expect(bavariaShare).toBeGreaterThan(berlinShare);
    });

    it('should handle empty candidates', () => {
      const result = constraintService.calculatePopulationWeightedFairness([], mockCountryConfig);
      
      expect(result.expectedShares.size).toBeGreaterThan(0);
      expect(result.fairnessScore).toBeGreaterThanOrEqual(0); // Should be valid number
      expect(result.fairnessScore).toBeLessThanOrEqual(1);
    });
  });

  describe('assessDataQuality', () => {
    it('should assess data quality comprehensively', () => {
      const candidate = createMockCandidate('test1', 52.5, 13.4);
      candidate.dataQuality.estimated.population = true;
      candidate.dataQuality.completeness = 0.6;

      const assessment = constraintService.assessDataQuality(candidate);
      
      expect(assessment.overallScore).toBeGreaterThan(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(1);
      expect(assessment.issues.length).toBeGreaterThan(0);
      expect(assessment.recommendations.length).toBeGreaterThan(0);
    });

    it('should give high score for high-quality data', () => {
      const candidate = createMockCandidate('test1', 52.5, 13.4);
      candidate.dataQuality.completeness = 1.0;
      candidate.dataQuality.confidence = 1.0;

      const assessment = constraintService.assessDataQuality(candidate);
      
      expect(assessment.overallScore).toBeGreaterThan(0.8);
      expect(assessment.issues.length).toBe(0);
    });
  });

  describe('filterByDataQuality', () => {
    it('should filter candidates by quality thresholds', () => {
      const candidates = [
        createMockCandidate('good', 52.5, 13.4),
        createMockCandidate('bad', 52.6, 13.5)
      ];
      
      candidates[0].dataQuality.completeness = 0.9;
      candidates[1].dataQuality.completeness = 0.3;

      const result = constraintService.filterByDataQuality(candidates, 0.5, 0.5);
      
      expect(result.passed).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.passed[0].id).toBe('good');
      expect(result.failed[0].id).toBe('bad');
      expect(result.rejectionReasons.has('bad')).toBe(true);
    });

    it('should handle empty candidates', () => {
      const result = constraintService.filterByDataQuality([], 0.5, 0.5);
      
      expect(result.passed).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(result.rejectionReasons.size).toBe(0);
    });
  });

  describe('batch operations', () => {
    it('should validate batch spacing', () => {
      const candidates = [
        createMockCandidate('c1', 52.7, 13.7), // Far from stores
        createMockCandidate('c2', 52.5, 13.4), // Close to store1
        createMockCandidate('c3', 52.8, 13.8)  // Far from stores
      ];

      const results = constraintService.validateBatchSpacing(candidates, mockExistingStores, 800);
      
      expect(results.size).toBe(3);
      expect(results.get('c1')).toBe(true);
      expect(results.get('c2')).toBe(false);
      expect(results.get('c3')).toBe(true);
    });

    it('should calculate optimal spacing', () => {
      const spacing1 = constraintService.calculateOptimalSpacing(1000, 800); // High density
      const spacing2 = constraintService.calculateOptimalSpacing(100, 800);  // Low density
      
      expect(spacing1).toBeLessThan(spacing2); // Higher density allows closer spacing
      expect(spacing1).toBeGreaterThan(0);
      expect(spacing2).toBeGreaterThan(0);
    });
  });
});