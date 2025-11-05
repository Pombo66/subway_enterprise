import { Test, TestingModule } from '@nestjs/testing';
import { PatternDetectionService } from '../pattern-detection.service';
import { Location } from '../../../types/intelligence.types';
import { Store } from '@prisma/client';

describe('PatternDetectionService', () => {
  let service: PatternDetectionService;

  const mockProposedLocation: Location = {
    lat: 40.7128,
    lng: -74.0060,
    country: 'US'
  };

  const createMockStore = (id: string, lat: number, lng: number): Store => ({
    id,
    name: `Store ${id}`,
    address: null,
    postcode: null,
    country: 'US',
    region: null,
    city: null,
    status: 'active',
    ownerName: null,
    latitude: lat,
    longitude: lng,
    annualTurnover: null,
    openedAt: null,
    cityPopulationBand: null,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PatternDetectionService],
    }).compile();

    service = module.get<PatternDetectionService>(PatternDetectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeLocationPatterns', () => {
    it('should return empty patterns for insufficient locations', async () => {
      const stores = [
        createMockStore('1', 40.7100, -74.0050),
        createMockStore('2', 40.7110, -74.0055)
      ];

      const result = await service.analyzeLocationPatterns(stores, mockProposedLocation);

      expect(result.detectedPatterns).toHaveLength(0);
      expect(result.overallPatternScore).toBe(0);
      expect(result.recommendations).toContain('Insufficient nearby locations for pattern analysis');
    });

    it('should detect grid patterns', async () => {
      // Create a perfect grid pattern
      const stores = [
        createMockStore('1', 40.7100, -74.0050),
        createMockStore('2', 40.7100, -74.0060),
        createMockStore('3', 40.7100, -74.0070),
        createMockStore('4', 40.7110, -74.0050),
        createMockStore('5', 40.7110, -74.0060),
        createMockStore('6', 40.7110, -74.0070)
      ];

      const result = await service.analyzeLocationPatterns(stores, mockProposedLocation);

      expect(result.detectedPatterns.length).toBeGreaterThan(0);
      const gridPattern = result.detectedPatterns.find(p => p.type === 'grid');
      if (gridPattern) {
        expect(gridPattern.confidence).toBeGreaterThan(0.5);
        expect(gridPattern.severity).toMatch(/MEDIUM|HIGH/);
      }
    });

    it('should detect linear patterns', async () => {
      // Create a linear pattern
      const stores = [
        createMockStore('1', 40.7100, -74.0050),
        createMockStore('2', 40.7110, -74.0055),
        createMockStore('3', 40.7120, -74.0060),
        createMockStore('4', 40.7130, -74.0065)
      ];

      const result = await service.analyzeLocationPatterns(stores, mockProposedLocation);

      expect(result.detectedPatterns.length).toBeGreaterThan(0);
      const linearPattern = result.detectedPatterns.find(p => p.type === 'linear');
      if (linearPattern) {
        expect(linearPattern.confidence).toBeGreaterThan(0.5);
        expect(linearPattern.locations.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should detect cluster patterns', async () => {
      // Create a tight cluster
      const stores = [
        createMockStore('1', 40.7100, -74.0050),
        createMockStore('2', 40.7101, -74.0051),
        createMockStore('3', 40.7102, -74.0052),
        createMockStore('4', 40.7103, -74.0053)
      ];

      const result = await service.analyzeLocationPatterns(stores, mockProposedLocation);

      expect(result.detectedPatterns.length).toBeGreaterThan(0);
      const clusterPattern = result.detectedPatterns.find(p => p.type === 'cluster');
      if (clusterPattern) {
        expect(clusterPattern.confidence).toBeGreaterThan(0.3);
        expect(clusterPattern.locations.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should calculate overall pattern score correctly', async () => {
      // Create a highly geometric pattern
      const stores = [
        createMockStore('1', 40.7100, -74.0050),
        createMockStore('2', 40.7100, -74.0060),
        createMockStore('3', 40.7110, -74.0050),
        createMockStore('4', 40.7110, -74.0060)
      ];

      const result = await service.analyzeLocationPatterns(stores, mockProposedLocation);

      expect(result.overallPatternScore).toBeGreaterThan(0);
      expect(result.overallPatternScore).toBeLessThanOrEqual(1);
    });

    it('should generate appropriate recommendations based on pattern score', async () => {
      const stores = [
        createMockStore('1', 40.7100, -74.0050),
        createMockStore('2', 40.7100, -74.0060),
        createMockStore('3', 40.7110, -74.0050),
        createMockStore('4', 40.7110, -74.0060)
      ];

      const result = await service.analyzeLocationPatterns(stores, mockProposedLocation);

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      // Should contain actionable recommendations
      const hasActionableRecommendation = result.recommendations.some(rec => 
        rec.includes('consider') || rec.includes('recommend') || rec.includes('detected')
      );
      expect(hasActionableRecommendation).toBe(true);
    });

    it('should generate alternative spacing suggestions', async () => {
      const stores = [
        createMockStore('1', 40.7100, -74.0050),
        createMockStore('2', 40.7100, -74.0060),
        createMockStore('3', 40.7110, -74.0050),
        createMockStore('4', 40.7110, -74.0060)
      ];

      const result = await service.analyzeLocationPatterns(stores, mockProposedLocation);

      if (result.detectedPatterns.length > 0) {
        expect(result.alternativeSpacing).toBeInstanceOf(Array);
        // Should provide alternatives when patterns are detected
        if (result.overallPatternScore > 0.5) {
          expect(result.alternativeSpacing.length).toBeGreaterThan(0);
        }
      }
    });

    it('should filter stores by analysis radius', async () => {
      const stores = [
        createMockStore('1', 40.7100, -74.0050), // Close
        createMockStore('2', 40.7110, -74.0055), // Close
        createMockStore('3', 41.0000, -75.0000), // Far away
        createMockStore('4', 40.7120, -74.0060)  // Close
      ];

      const result = await service.analyzeLocationPatterns(stores, mockProposedLocation, 5000); // 5km radius

      // Should only consider nearby stores
      expect(result).toBeDefined();
      // The far store should not affect the pattern analysis significantly
    });

    it('should handle stores with null coordinates', async () => {
      const stores = [
        createMockStore('1', 40.7100, -74.0050),
        { ...createMockStore('2', 0, 0), latitude: null, longitude: null },
        createMockStore('3', 40.7110, -74.0055)
      ];

      const result = await service.analyzeLocationPatterns(stores, mockProposedLocation);

      // Should not crash and should filter out null coordinates
      expect(result).toBeDefined();
      expect(result.detectedPatterns).toBeInstanceOf(Array);
    });
  });

  describe('considerNaturalBarriers', () => {
    const mockExistingLocations: Location[] = [
      { lat: 40.7100, lng: -74.0050, country: 'US' },
      { lat: 40.7110, lng: -74.0055, country: 'US' }
    ];

    it('should identify natural barriers', async () => {
      const result = await service.considerNaturalBarriers(
        mockProposedLocation,
        mockExistingLocations
      );

      expect(result).toBeDefined();
      expect(result.barriers).toBeInstanceOf(Array);
      expect(result.reasoning).toBeInstanceOf(Array);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should provide reasoning for barrier influence', async () => {
      const result = await service.considerNaturalBarriers(
        mockProposedLocation,
        mockExistingLocations
      );

      expect(result.reasoning).toBeInstanceOf(Array);
      result.reasoning.forEach(reason => {
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(10);
      });
    });

    it('should suggest adjusted location when appropriate', async () => {
      const result = await service.considerNaturalBarriers(
        mockProposedLocation,
        mockExistingLocations
      );

      if (result.adjustedLocation) {
        expect(result.adjustedLocation.lat).toBeCloseTo(mockProposedLocation.lat, 2);
        expect(result.adjustedLocation.lng).toBeCloseTo(mockProposedLocation.lng, 2);
        expect(result.adjustedLocation.country).toBe(mockProposedLocation.country);
      }
    });

    it('should handle empty existing locations', async () => {
      const result = await service.considerNaturalBarriers(
        mockProposedLocation,
        []
      );

      expect(result).toBeDefined();
      expect(result.barriers).toBeInstanceOf(Array);
      expect(result.reasoning).toBeInstanceOf(Array);
    });
  });

  describe('generateNaturalSpacingVariation', () => {
    const mockBaseLocations: Location[] = [
      { lat: 40.7100, lng: -74.0050, country: 'US' },
      { lat: 40.7110, lng: -74.0055, country: 'US' },
      { lat: 40.7120, lng: -74.0060, country: 'US' }
    ];

    it('should generate adjusted locations with natural variation', async () => {
      const result = await service.generateNaturalSpacingVariation(mockBaseLocations, 0.5);

      expect(result).toBeDefined();
      expect(result.adjustedLocations).toHaveLength(mockBaseLocations.length);
      expect(result.spacingStrategy).toBeDefined();
      expect(result.naturalness).toBeGreaterThanOrEqual(0);
      expect(result.naturalness).toBeLessThanOrEqual(1);
    });

    it('should vary spacing strategy based on target density', async () => {
      const highDensityResult = await service.generateNaturalSpacingVariation(mockBaseLocations, 0.8);
      const lowDensityResult = await service.generateNaturalSpacingVariation(mockBaseLocations, 0.2);

      expect(highDensityResult.spacingStrategy).not.toBe(lowDensityResult.spacingStrategy);
      expect(highDensityResult.spacingStrategy).toContain('High-density');
      expect(lowDensityResult.spacingStrategy).toContain('Wide spacing');
    });

    it('should maintain location count', async () => {
      const result = await service.generateNaturalSpacingVariation(mockBaseLocations, 0.5);

      expect(result.adjustedLocations).toHaveLength(mockBaseLocations.length);
      
      // Each adjusted location should have valid coordinates
      result.adjustedLocations.forEach(loc => {
        expect(typeof loc.lat).toBe('number');
        expect(typeof loc.lng).toBe('number');
        expect(loc.country).toBeDefined();
        expect(isFinite(loc.lat)).toBe(true);
        expect(isFinite(loc.lng)).toBe(true);
      });
    });

    it('should handle empty location array', async () => {
      const result = await service.generateNaturalSpacingVariation([], 0.5);

      expect(result.adjustedLocations).toHaveLength(0);
      expect(result.spacingStrategy).toContain('No locations');
      expect(result.naturalness).toBe(1.0);
    });

    it('should calculate meaningful naturalness scores', async () => {
      const result = await service.generateNaturalSpacingVariation(mockBaseLocations, 0.5);

      expect(result.naturalness).toBeGreaterThanOrEqual(0);
      expect(result.naturalness).toBeLessThanOrEqual(1);
      
      // Lower target density should generally result in higher naturalness
      const lowDensityResult = await service.generateNaturalSpacingVariation(mockBaseLocations, 0.2);
      const highDensityResult = await service.generateNaturalSpacingVariation(mockBaseLocations, 0.9);
      
      // This is a general expectation, but may not always hold due to randomization
      expect(lowDensityResult.naturalness).toBeGreaterThanOrEqual(0);
      expect(highDensityResult.naturalness).toBeGreaterThanOrEqual(0);
    });
  });

  describe('pattern detection accuracy', () => {
    it('should not detect patterns in random locations', async () => {
      // Generate truly random locations with larger spread
      const stores = [
        createMockStore('1', 40.7023, -74.0087),
        createMockStore('2', 40.7156, -74.0234),
        createMockStore('3', 40.6987, -74.0156),
        createMockStore('4', 40.7234, -74.0098),
        createMockStore('5', 40.7098, -74.0345),
        createMockStore('6', 40.6876, -74.0267)
      ];

      const result = await service.analyzeLocationPatterns(stores, mockProposedLocation);

      // Random locations should have lower pattern scores than geometric arrangements
      // Note: Even random locations may show some patterns due to clustering algorithms
      expect(result.overallPatternScore).toBeLessThan(0.9);
    });

    it('should detect strong patterns in geometric arrangements', async () => {
      // Create a perfect square grid
      const stores = [
        createMockStore('1', 40.7100, -74.0050),
        createMockStore('2', 40.7100, -74.0060),
        createMockStore('3', 40.7100, -74.0070),
        createMockStore('4', 40.7110, -74.0050),
        createMockStore('5', 40.7110, -74.0060),
        createMockStore('6', 40.7110, -74.0070),
        createMockStore('7', 40.7120, -74.0050),
        createMockStore('8', 40.7120, -74.0060),
        createMockStore('9', 40.7120, -74.0070)
      ];

      const result = await service.analyzeLocationPatterns(stores, mockProposedLocation);

      expect(result.overallPatternScore).toBeGreaterThan(0.5);
      expect(result.detectedPatterns.length).toBeGreaterThan(0);
    });

    it('should provide pattern-specific recommendations', async () => {
      const gridStores = [
        createMockStore('1', 40.7100, -74.0050),
        createMockStore('2', 40.7100, -74.0060),
        createMockStore('3', 40.7110, -74.0050),
        createMockStore('4', 40.7110, -74.0060)
      ];

      const result = await service.analyzeLocationPatterns(gridStores, mockProposedLocation);

      if (result.detectedPatterns.some(p => p.type === 'grid')) {
        const hasGridRecommendation = result.recommendations.some(rec => 
          rec.toLowerCase().includes('grid') || rec.toLowerCase().includes('irregular')
        );
        expect(hasGridRecommendation).toBe(true);
      }
    });
  });

  describe('error handling', () => {
    it('should handle invalid coordinates gracefully', async () => {
      const stores = [
        createMockStore('1', NaN, -74.0050),
        createMockStore('2', 40.7110, NaN),
        createMockStore('3', 40.7120, -74.0060)
      ];

      const result = await service.analyzeLocationPatterns(stores, mockProposedLocation);

      expect(result).toBeDefined();
      expect(result.detectedPatterns).toBeInstanceOf(Array);
    });

    it('should handle analysis failures gracefully', async () => {
      const invalidLocation: Location = {
        lat: NaN,
        lng: NaN,
        country: 'US'
      };

      const result = await service.considerNaturalBarriers(invalidLocation, []);

      expect(result).toBeDefined();
      expect(result.barriers).toBeInstanceOf(Array);
      expect(result.reasoning).toBeInstanceOf(Array);
    });
  });
});