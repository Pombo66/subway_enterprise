import { Test, TestingModule } from '@nestjs/testing';
import { ExpansionService } from '../expansion.service';
import { GeographicValidationService } from '../intelligence/geographic-validation.service';
import { LocationIntelligenceService } from '../intelligence/location-intelligence.service';
import { PrismaClient } from '@prisma/client';

describe('Expansion Service Geographic Integration', () => {
  let expansionService: ExpansionService;
  let geographicValidationService: GeographicValidationService;
  let module: TestingModule;

  const mockTradeAreas = [
    {
      id: 'valid_land_location',
      centroidLat: 52.52, // Berlin - definitely on land
      centroidLng: 13.405,
      finalScore: 0.9,
      confidence: 0.9,
      demandScore: 0.8,
      competitionPenalty: 0.1,
      supplyPenalty: 0.1,
      existingStoreDist: 5.0,
      population: 100000,
      footfallIndex: 0.9,
      incomeIndex: 0.8,
      competitorIdx: 0.3,
      region: 'Berlin',
      country: 'DE',
      dataMode: 'live',
      isLive: true,
      modelVersion: 'v0.3',
      dataSnapshotDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'invalid_water_location',
      centroidLat: 54.4271, // The problematic water location
      centroidLng: 6.7375,
      finalScore: 0.8,
      confidence: 0.8,
      demandScore: 0.7,
      competitionPenalty: 0.2,
      supplyPenalty: 0.1,
      existingStoreDist: 3.0,
      population: 50000,
      footfallIndex: 0.6,
      incomeIndex: 0.7,
      competitorIdx: 0.4,
      region: 'North Sea',
      country: 'DE',
      dataMode: 'live',
      isLive: true,
      modelVersion: 'v0.3',
      dataSnapshotDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'another_valid_location',
      centroidLat: 48.1351, // Munich - definitely on land
      centroidLng: 11.582,
      finalScore: 0.85,
      confidence: 0.85,
      demandScore: 0.75,
      competitionPenalty: 0.15,
      supplyPenalty: 0.1,
      existingStoreDist: 4.0,
      population: 80000,
      footfallIndex: 0.8,
      incomeIndex: 0.85,
      competitorIdx: 0.35,
      region: 'Munich',
      country: 'DE',
      dataMode: 'live',
      isLive: true,
      modelVersion: 'v0.3',
      dataSnapshotDate: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeAll(async () => {
    const mockPrismaClient = {
      tradeArea: {
        findMany: jest.fn().mockResolvedValue(mockTradeAreas)
      },
      expansionCache: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({})
      },
      telemetryEvent: {
        create: jest.fn().mockResolvedValue({})
      }
    };

    const mockLocationIntelligenceService = {
      enhanceLocationSuggestions: jest.fn().mockResolvedValue([])
    };

    module = await Test.createTestingModule({
      providers: [
        ExpansionService,
        GeographicValidationService,
        {
          provide: PrismaClient,
          useValue: mockPrismaClient
        },
        {
          provide: LocationIntelligenceService,
          useValue: mockLocationIntelligenceService
        }
      ],
    }).compile();

    expansionService = module.get<ExpansionService>(ExpansionService);
    geographicValidationService = module.get<GeographicValidationService>(GeographicValidationService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('🌊 Water Location Filtering in Expansion Suggestions', () => {
    it('should filter out water locations from expansion suggestions', async () => {
      const params = {
        scope: {
          type: 'country' as const,
          value: 'DE',
          area: 357022
        },
        intensity: 100, // Use 100% intensity to get all valid locations
        dataMode: 'live' as const,
        minDistance: 0,
        maxPerCity: 10
      };

      const suggestions = await expansionService.getSuggestionsInScope(params);
      
      console.log('🔍 Expansion suggestions after geographic filtering:');
      suggestions.forEach(s => {
        console.log(`   - ${s.lat}, ${s.lng} (Score: ${s.finalScore}) - ID: ${s.id}`);
      });
      
      // Should have filtered out the water location
      expect(suggestions.length).toBe(2); // Only the 2 valid land locations
      
      // Verify the water location is not included
      const waterLocation = suggestions.find(s => 
        Math.abs(s.lat - 54.4271) < 0.001 && Math.abs(s.lng - 6.7375) < 0.001
      );
      expect(waterLocation).toBeUndefined();
      
      // Verify valid locations are included
      const berlinLocation = suggestions.find(s => 
        Math.abs(s.lat - 52.52) < 0.1 && Math.abs(s.lng - 13.405) < 0.1
      );
      expect(berlinLocation).toBeDefined();
      
      const munichLocation = suggestions.find(s => 
        Math.abs(s.lat - 48.1351) < 0.1 && Math.abs(s.lng - 11.582) < 0.1
      );
      expect(munichLocation).toBeDefined();
      
      console.log('✅ Water location successfully filtered from expansion suggestions');
      console.log(`   - Original locations: 3`);
      console.log(`   - After filtering: ${suggestions.length}`);
      console.log(`   - Water location (54.4271, 6.7375): REMOVED ✅`);
    });

    it('should use GeographicValidationService for location validation', async () => {
      // Spy on the geographic validation service
      const validateLocationSpy = jest.spyOn(geographicValidationService, 'validateLocation');
      
      const params = {
        scope: {
          type: 'country' as const,
          value: 'DE',
          area: 357022
        },
        intensity: 50,
        dataMode: 'live' as const,
        minDistance: 0
      };

      await expansionService.getSuggestionsInScope(params);
      
      // Verify that validateLocation was called for each trade area
      expect(validateLocationSpy).toHaveBeenCalledTimes(3); // 3 mock trade areas
      
      // Verify it was called with the correct coordinates and country validation
      expect(validateLocationSpy).toHaveBeenCalledWith(52.52, 13.405, { expectedCountry: 'DE', strictBoundaryCheck: true }); // Berlin
      expect(validateLocationSpy).toHaveBeenCalledWith(54.4271, 6.7375, { expectedCountry: 'DE', strictBoundaryCheck: true }); // Water location
      expect(validateLocationSpy).toHaveBeenCalledWith(48.1351, 11.582, { expectedCountry: 'DE', strictBoundaryCheck: true }); // Munich
      
      console.log('✅ GeographicValidationService integration verified');
      console.log(`   - validateLocation called ${validateLocationSpy.mock.calls.length} times`);
      console.log(`   - All trade area coordinates validated`);
      
      validateLocationSpy.mockRestore();
    });
  });
});