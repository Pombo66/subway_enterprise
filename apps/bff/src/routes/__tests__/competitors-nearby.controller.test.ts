import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { CompetitorsNearbyController } from '../competitors-nearby.controller';
import { GooglePlacesNearbyService, NearbyCompetitorsResponse } from '../../services/competitive/google-places-nearby.service';

describe('CompetitorsNearbyController', () => {
  let controller: CompetitorsNearbyController;
  let mockService: jest.Mocked<GooglePlacesNearbyService>;

  const DEFAULT_BRANDS = ["McDonald's", "Burger King", "KFC", "Domino's", "Starbucks"];

  const createMockResponse = (overrides: Partial<NearbyCompetitorsResponse> = {}): NearbyCompetitorsResponse => ({
    center: { lat: 51.5074, lng: -0.1278 },
    radiusKm: 5,
    brands: DEFAULT_BRANDS,
    results: [],
    summary: {
      total: 0,
      byBrand: Object.fromEntries(DEFAULT_BRANDS.map(b => [b, { count: 0, nearestM: null }]))
    },
    source: 'google_places',
    cached: false,
    ...overrides
  });

  beforeEach(async () => {
    mockService = {
      getNearbyCompetitors: jest.fn(),
      calculateDistance: jest.fn(),
      generateCacheKey: jest.fn(),
      buildSummary: jest.fn(),
      deduplicateResults: jest.fn(),
      clearExpiredCache: jest.fn(),
      getCacheSize: jest.fn(),
      clearCache: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompetitorsNearbyController],
      providers: [
        {
          provide: GooglePlacesNearbyService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CompetitorsNearbyController>(CompetitorsNearbyController);
  });

  describe('Unit Tests', () => {
    describe('POST /competitors/nearby', () => {
      it('should return competitors for valid request', async () => {
        const mockResponse = createMockResponse({
          results: [
            { brand: "McDonald's", lat: 51.5, lng: -0.1, distanceM: 100 }
          ],
          summary: {
            total: 1,
            byBrand: {
              "McDonald's": { count: 1, nearestM: 100 },
              "Burger King": { count: 0, nearestM: null },
              "KFC": { count: 0, nearestM: null },
              "Domino's": { count: 0, nearestM: null },
              "Starbucks": { count: 0, nearestM: null },
            }
          }
        });

        mockService.getNearbyCompetitors.mockResolvedValue(mockResponse);

        const result = await controller.getNearbyCompetitors({
          lat: 51.5074,
          lng: -0.1278,
          radiusKm: 5
        });

        expect(result).toEqual(mockResponse);
      });

      it('should reject invalid latitude', async () => {
        await expect(
          controller.getNearbyCompetitors({
            lat: 100,
            lng: -0.1278,
            radiusKm: 5
          })
        ).rejects.toThrow(HttpException);
      });

      it('should reject invalid longitude', async () => {
        await expect(
          controller.getNearbyCompetitors({
            lat: 51.5074,
            lng: 200,
            radiusKm: 5
          })
        ).rejects.toThrow(HttpException);
      });

      it('should reject missing lat', async () => {
        await expect(
          controller.getNearbyCompetitors({
            lng: -0.1278,
            radiusKm: 5
          } as any)
        ).rejects.toThrow(HttpException);
      });

      it('should reject missing lng', async () => {
        await expect(
          controller.getNearbyCompetitors({
            lat: 51.5074,
            radiusKm: 5
          } as any)
        ).rejects.toThrow(HttpException);
      });

      it('should use default radiusKm when not provided', async () => {
        mockService.getNearbyCompetitors.mockResolvedValue(createMockResponse());

        await controller.getNearbyCompetitors({
          lat: 51.5074,
          lng: -0.1278
        } as any);

        expect(mockService.getNearbyCompetitors).toHaveBeenCalledWith(
          expect.objectContaining({
            radiusKm: 5
          })
        );
      });

      it('should pass custom brands when provided', async () => {
        mockService.getNearbyCompetitors.mockResolvedValue(createMockResponse());

        await controller.getNearbyCompetitors({
          lat: 51.5074,
          lng: -0.1278,
          radiusKm: 5,
          brands: ["McDonald's", "KFC"]
        });

        expect(mockService.getNearbyCompetitors).toHaveBeenCalledWith({
          lat: 51.5074,
          lng: -0.1278,
          radiusKm: 5,
          brands: ["McDonald's", "KFC"]
        });
      });

      it('should handle service errors gracefully', async () => {
        mockService.getNearbyCompetitors.mockRejectedValue(
          new Error('Google Places API key not configured')
        );

        await expect(
          controller.getNearbyCompetitors({
            lat: 51.5074,
            lng: -0.1278,
            radiusKm: 5
          })
        ).rejects.toThrow(HttpException);
      });
    });
  });

  describe('Property 4: Response Shape Validation', () => {
    it('should always return response with required fields', async () => {
      const mockResponse = createMockResponse();
      mockService.getNearbyCompetitors.mockResolvedValue(mockResponse);

      const result = await controller.getNearbyCompetitors({
        lat: 51.5074,
        lng: -0.1278,
        radiusKm: 5
      });

      expect(result).toHaveProperty('center');
      expect(result.center).toHaveProperty('lat');
      expect(result.center).toHaveProperty('lng');
      expect(result).toHaveProperty('radiusKm');
      expect(result).toHaveProperty('brands');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('total');
      expect(result.summary).toHaveProperty('byBrand');
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('cached');
    });

    it('should have results array with correct item shape', async () => {
      const mockResponse = createMockResponse({
        results: [
          { brand: "McDonald's", lat: 51.5, lng: -0.1, distanceM: 500 },
          { brand: "KFC", lat: 51.51, lng: -0.11, distanceM: 1200, placeName: "KFC London" }
        ]
      });
      mockService.getNearbyCompetitors.mockResolvedValue(mockResponse);

      const result = await controller.getNearbyCompetitors({
        lat: 51.5074,
        lng: -0.1278,
        radiusKm: 5
      });

      for (const item of result.results) {
        expect(item).toHaveProperty('brand');
        expect(item).toHaveProperty('lat');
        expect(item).toHaveProperty('lng');
        expect(item).toHaveProperty('distanceM');
        expect(typeof item.brand).toBe('string');
        expect(typeof item.lat).toBe('number');
        expect(typeof item.lng).toBe('number');
        expect(typeof item.distanceM).toBe('number');
      }
    });
  });

  describe('Property 7: Default Brands Behavior', () => {
    it('should use default brands when brands not specified', async () => {
      mockService.getNearbyCompetitors.mockResolvedValue(createMockResponse());

      await controller.getNearbyCompetitors({
        lat: 51.5074,
        lng: -0.1278,
        radiusKm: 5
      });

      const callArgs = mockService.getNearbyCompetitors.mock.calls[0][0];
      expect(callArgs.brands).toBeUndefined();
    });

    it('should return all 5 default brands in response', async () => {
      mockService.getNearbyCompetitors.mockResolvedValue(createMockResponse());

      const result = await controller.getNearbyCompetitors({
        lat: 51.5074,
        lng: -0.1278,
        radiusKm: 5
      });

      expect(result.brands).toHaveLength(5);
      expect(result.brands).toContain("McDonald's");
      expect(result.brands).toContain("Burger King");
      expect(result.brands).toContain("KFC");
      expect(result.brands).toContain("Domino's");
      expect(result.brands).toContain("Starbucks");
    });
  });

  describe('Edge Cases', () => {
    it('should handle coordinates at boundaries', async () => {
      mockService.getNearbyCompetitors.mockResolvedValue(createMockResponse());

      const result = await controller.getNearbyCompetitors({
        lat: 90,
        lng: 180,
        radiusKm: 5
      });
      expect(result).toHaveProperty('results');
    });

    it('should handle minimum radius', async () => {
      mockService.getNearbyCompetitors.mockResolvedValue(createMockResponse({ radiusKm: 0.1 }));

      const result = await controller.getNearbyCompetitors({
        lat: 51.5074,
        lng: -0.1278,
        radiusKm: 0.1
      });

      expect(result.radiusKm).toBe(0.1);
    });

    it('should handle maximum radius', async () => {
      mockService.getNearbyCompetitors.mockResolvedValue(createMockResponse({ radiusKm: 50 }));

      const result = await controller.getNearbyCompetitors({
        lat: 51.5074,
        lng: -0.1278,
        radiusKm: 50
      });

      expect(result.radiusKm).toBe(50);
    });

    it('should reject radius above maximum', async () => {
      await expect(
        controller.getNearbyCompetitors({
          lat: 51.5074,
          lng: -0.1278,
          radiusKm: 100
        })
      ).rejects.toThrow(HttpException);
    });

    it('should reject radius below minimum', async () => {
      await expect(
        controller.getNearbyCompetitors({
          lat: 51.5074,
          lng: -0.1278,
          radiusKm: 0.05
        })
      ).rejects.toThrow(HttpException);
    });
  });
});
