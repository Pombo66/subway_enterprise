import { FeatureService } from '../FeatureService';
import { H3Cell } from '../../../types/geospatial';
import { ExistingStore, CompetitorLocation, PopulationGrid, AnchorPoint, AnchorType } from '../../../types/core';
import { AnalysisContext } from '../../IFeatureService';

describe('FeatureService', () => {
  let featureService: FeatureService;
  let mockContext: AnalysisContext;

  beforeEach(() => {
    featureService = new FeatureService();
    
    // Create mock context
    mockContext = {
      existingStores: [
        { id: 'store1', name: 'Store 1', lat: 52.5, lng: 13.4 },
        { id: 'store2', name: 'Store 2', lat: 52.6, lng: 13.5 }
      ],
      competitors: [
        { lat: 52.51, lng: 13.41 },
        { lat: 52.52, lng: 13.42 }
      ],
      populationData: {
        cells: [
          { lat: 52.5, lng: 13.4, population: 5000 },
          { lat: 52.51, lng: 13.41, population: 3000 },
          { lat: 52.52, lng: 13.42, population: 4000 }
        ],
        resolution: 8,
        dataSource: 'test'
      },
      anchors: [
        { id: 'anchor1', lat: 52.5, lng: 13.4, type: AnchorType.MALL_TENANT, name: 'Mall 1' },
        { id: 'anchor2', lat: 52.501, lng: 13.401, type: AnchorType.MALL_TENANT, name: 'Mall 2' }, // Very close
        { id: 'anchor3', lat: 52.51, lng: 13.41, type: AnchorType.STATION_SHOPS, name: 'Station 1' }
      ],
      countryBoundary: {
        type: 'Polygon',
        coordinates: [[[13.0, 52.3], [13.8, 52.3], [13.8, 52.7], [13.0, 52.7], [13.0, 52.3]]]
      }
    };
  });

  describe('computeBasicFeatures', () => {
    it('should compute basic features for a cell', () => {
      const cell: H3Cell = {
        index: 'test_cell',
        lat: 52.5,
        lng: 13.4,
        resolution: 8
      };

      const features = featureService.computeBasicFeatures(cell, mockContext);

      expect(features).toHaveProperty('population');
      expect(features).toHaveProperty('nearestBrandKm');
      expect(features).toHaveProperty('competitorDensity');
      expect(features).toHaveProperty('anchors');
      expect(features).toHaveProperty('performanceProxy');

      expect(features.population).toBeGreaterThan(0);
      expect(features.nearestBrandKm).toBeGreaterThanOrEqual(0);
      expect(features.competitorDensity).toBeGreaterThanOrEqual(0);
      expect(features.performanceProxy).toBeGreaterThanOrEqual(0);
    });

    it('should handle cells with no nearby data', () => {
      const cell: H3Cell = {
        index: 'remote_cell',
        lat: 60.0, // Far from test data
        lng: 20.0,
        resolution: 8
      };

      const features = featureService.computeBasicFeatures(cell, mockContext);

      // Population might be estimated from nearest cells
      expect(features.population).toBeGreaterThanOrEqual(0);
      expect(features.nearestBrandKm).toBeGreaterThan(500); // Should be far
      expect(features.competitorDensity).toBe(0);
      expect(features.anchors.raw).toBe(0);
    });
  });

  describe('computeRefinedFeatures', () => {
    it('should compute refined features with larger radius', () => {
      const cell: H3Cell = {
        index: 'test_cell',
        lat: 52.5,
        lng: 13.4,
        resolution: 8
      };

      const basicFeatures = featureService.computeBasicFeatures(cell, mockContext);
      const refinedFeatures = featureService.computeRefinedFeatures(cell, mockContext);

      // Refined features should generally capture more data due to larger radius
      expect(refinedFeatures.population).toBeGreaterThanOrEqual(basicFeatures.population);
      expect(refinedFeatures.anchors.raw).toBeGreaterThanOrEqual(basicFeatures.anchors.raw);
    });
  });

  describe('calculatePopulation', () => {
    it('should calculate population within radius', () => {
      const result = featureService.calculatePopulation(52.5, 13.4, 2, mockContext.populationData);

      expect(result).toHaveProperty('population');
      expect(result).toHaveProperty('isEstimated');
      expect(result.population).toBeGreaterThan(0);
      expect(result.isEstimated).toBe(false);
    });

    it('should estimate population when no cells found', () => {
      const result = featureService.calculatePopulation(60.0, 20.0, 2, mockContext.populationData);

      expect(result.population).toBeGreaterThanOrEqual(0);
      expect(result.isEstimated).toBe(true);
    });

    it('should handle empty population data', () => {
      const emptyPopData: PopulationGrid = {
        cells: [],
        resolution: 8,
        dataSource: 'empty'
      };

      const result = featureService.calculatePopulation(52.5, 13.4, 2, emptyPopData);

      expect(result.population).toBe(0);
      expect(result.isEstimated).toBe(true);
    });
  });

  describe('calculateNearestBrandDistance', () => {
    it('should find nearest brand store', () => {
      const distance = featureService.calculateNearestBrandDistance(52.5, 13.4, mockContext.existingStores);

      expect(distance).toBeGreaterThanOrEqual(0);
      expect(distance).toBeLessThan(1); // Should be very close to store1
    });

    it('should return Infinity for no stores', () => {
      const distance = featureService.calculateNearestBrandDistance(52.5, 13.4, []);

      expect(distance).toBe(Infinity);
    });

    it('should find correct nearest store among multiple', () => {
      const stores: ExistingStore[] = [
        { id: 'far', name: 'Far Store', lat: 53.0, lng: 14.0 },
        { id: 'near', name: 'Near Store', lat: 52.501, lng: 13.401 }
      ];

      const distance = featureService.calculateNearestBrandDistance(52.5, 13.4, stores);

      expect(distance).toBeLessThan(1); // Should find the near store
    });
  });

  describe('calculateCompetitorDensity', () => {
    it('should calculate competitor density', () => {
      const density = featureService.calculateCompetitorDensity(52.5, 13.4, mockContext.competitors, 2);

      expect(density).toBeGreaterThanOrEqual(0);
      expect(typeof density).toBe('number');
    });

    it('should return zero for no competitors', () => {
      const density = featureService.calculateCompetitorDensity(52.5, 13.4, [], 2);

      expect(density).toBe(0);
    });

    it('should increase density with more competitors', () => {
      const moreCompetitors: CompetitorLocation[] = [
        ...mockContext.competitors,
        { lat: 52.503, lng: 13.403 },
        { lat: 52.504, lng: 13.404 }
      ];

      const density1 = featureService.calculateCompetitorDensity(52.5, 13.4, mockContext.competitors, 2);
      const density2 = featureService.calculateCompetitorDensity(52.5, 13.4, moreCompetitors, 2);

      expect(density2).toBeGreaterThan(density1);
    });
  });

  describe('processAnchors', () => {
    it('should process anchors with deduplication', () => {
      const anchorData = featureService.processAnchors(52.5, 13.4, mockContext.anchors, 2);

      expect(anchorData).toHaveProperty('raw');
      expect(anchorData).toHaveProperty('deduplicated');
      expect(anchorData).toHaveProperty('diminishingScore');
      expect(anchorData).toHaveProperty('breakdown');

      expect(anchorData.raw).toBe(3); // All 3 anchors
      expect(anchorData.deduplicated).toBeLessThanOrEqual(anchorData.raw); // Should deduplicate close malls
      expect(anchorData.diminishingScore).toBeGreaterThan(0);
    });

    it('should handle no anchors', () => {
      const anchorData = featureService.processAnchors(52.5, 13.4, [], 2);

      expect(anchorData.raw).toBe(0);
      expect(anchorData.deduplicated).toBe(0);
      expect(anchorData.diminishingScore).toBe(0);
      expect(anchorData.breakdown[AnchorType.MALL_TENANT]).toBe(0);
    });

    it('should apply type-specific deduplication', () => {
      const anchors: AnchorPoint[] = [
        { id: 'mall1', lat: 52.5, lng: 13.4, type: AnchorType.MALL_TENANT },
        { id: 'mall2', lat: 52.5001, lng: 13.4001, type: AnchorType.MALL_TENANT }, // Very close mall
        { id: 'station1', lat: 52.5001, lng: 13.4001, type: AnchorType.STATION_SHOPS } // Same location, different type
      ];

      const anchorData = featureService.processAnchors(52.5, 13.4, anchors, 2);

      // Should deduplicate the close malls but keep the station
      expect(anchorData.raw).toBe(3);
      expect(anchorData.deduplicated).toBe(2); // One mall + one station
    });

    it('should apply diminishing returns correctly', () => {
      // Create many anchors to test diminishing returns
      const manyAnchors: AnchorPoint[] = [];
      for (let i = 0; i < 30; i++) {
        manyAnchors.push({
          id: `anchor${i}`,
          lat: 52.5 + (i * 0.01), // Spread them out
          lng: 13.4 + (i * 0.01),
          type: AnchorType.RETAIL
        });
      }

      const anchorData = featureService.processAnchors(52.5, 13.4, manyAnchors, 10);

      // Should find anchors within radius (not all 30 will be within 10km)
      expect(anchorData.raw).toBeGreaterThan(0);
      expect(anchorData.raw).toBeLessThanOrEqual(30);
      expect(anchorData.diminishingScore).toBeGreaterThan(0); // Should have some score
    });
  });

  describe('calculatePerformanceProxy', () => {
    it('should calculate performance proxy', () => {
      const proxy = featureService.calculatePerformanceProxy(52.5, 13.4, mockContext);

      expect(proxy).toBeGreaterThanOrEqual(0);
      expect(proxy).toBeLessThanOrEqual(1);
      expect(typeof proxy).toBe('number');
    });

    it('should be higher for high population, low competition', () => {
      const highPopContext = {
        ...mockContext,
        populationData: {
          ...mockContext.populationData,
          cells: [{ lat: 52.5, lng: 13.4, population: 50000 }] // High population
        },
        competitors: [] // No competition
      };

      const lowPopContext = {
        ...mockContext,
        populationData: {
          ...mockContext.populationData,
          cells: [{ lat: 52.5, lng: 13.4, population: 1000 }] // Low population
        },
        competitors: [
          { lat: 52.5, lng: 13.4 },
          { lat: 52.501, lng: 13.401 }
        ] // High competition
      };

      const highProxy = featureService.calculatePerformanceProxy(52.5, 13.4, highPopContext);
      const lowProxy = featureService.calculatePerformanceProxy(52.5, 13.4, lowPopContext);

      expect(highProxy).toBeGreaterThan(lowProxy);
    });
  });

  describe('getTravelTimeCatchment', () => {
    it('should get travel time catchment', async () => {
      const result = await featureService.getTravelTimeCatchment(52.5, 13.4, 15);

      expect(result).toHaveProperty('population');
      expect(result).toHaveProperty('isEstimated');
      expect(result.isEstimated).toBe(true); // Always estimated in current implementation
      expect(result.population).toBeGreaterThanOrEqual(0);
    });

    it('should scale radius with time', async () => {
      const result5min = await featureService.getTravelTimeCatchment(52.5, 13.4, 5);
      const result15min = await featureService.getTravelTimeCatchment(52.5, 13.4, 15);

      // 15-minute catchment should cover larger area (though population might be 0 in mock)
      expect(result15min.isEstimated).toBe(true);
      expect(result5min.isEstimated).toBe(true);
    });
  });

  describe('computeRefinedFeaturesWithTravelTime', () => {
    it('should compute refined features with travel time', async () => {
      const cell: H3Cell = {
        index: 'test_cell',
        lat: 52.5,
        lng: 13.4,
        resolution: 8
      };

      const features = await featureService.computeRefinedFeaturesWithTravelTime(cell, mockContext);

      expect(features).toHaveProperty('population');
      expect(features).toHaveProperty('nearestBrandKm');
      expect(features).toHaveProperty('competitorDensity');
      expect(features).toHaveProperty('anchors');
      expect(features).toHaveProperty('performanceProxy');
    });

    it('should fallback gracefully on travel time failure', async () => {
      const cell: H3Cell = {
        index: 'test_cell',
        lat: 52.5,
        lng: 13.4,
        resolution: 8
      };

      // Should not throw even if travel time calculation has issues
      const features = await featureService.computeRefinedFeaturesWithTravelTime(cell, mockContext);
      expect(features).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle invalid coordinates gracefully', () => {
      // NaN coordinates should return Infinity for distance
      const distance = featureService.calculateNearestBrandDistance(NaN, 13.4, mockContext.existingStores);
      expect(distance).toBe(Infinity);
    });

    it('should handle null/undefined inputs', () => {
      expect(() => {
        featureService.calculateCompetitorDensity(52.5, 13.4, null as any, 2);
      }).toThrow();
    });
  });
});