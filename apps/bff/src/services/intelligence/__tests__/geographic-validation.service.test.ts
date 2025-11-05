import { Test, TestingModule } from '@nestjs/testing';
import { GeographicValidationService } from '../geographic-validation.service';

describe('GeographicValidationService', () => {
  let service: GeographicValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeographicValidationService],
    }).compile();

    service = module.get<GeographicValidationService>(GeographicValidationService);
  });

  describe('validateLocation', () => {
    it('should identify water locations correctly', async () => {
      // Test the user's problematic coordinates (North Sea)
      const result = await service.validateLocation(54.4271, 6.7375);
      
      expect(result.isInWater).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(issue => issue.toLowerCase().includes('water'))).toBe(true);
      expect(result.recommendations.some(rec => rec.toLowerCase().includes('land'))).toBe(true);
      
      console.log('🌊 Water location test result:', {
        coordinates: '54.4271, 6.7375',
        isInWater: result.isInWater,
        isValid: result.isValid,
        issues: result.issues,
        recommendations: result.recommendations
      });
    });

    it('should validate land locations correctly', async () => {
      // Test Berlin coordinates (definitely on land)
      const result = await service.validateLocation(52.5200, 13.4050);
      
      expect(result.isInWater).toBe(false);
      expect(result.isOnLand).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.validationScore).toBeGreaterThan(0.5);
      
      console.log('🏙️ Land location test result:', {
        coordinates: '52.5200, 13.4050 (Berlin)',
        isOnLand: result.isOnLand,
        isValid: result.isValid,
        validationScore: result.validationScore,
        countryCode: result.countryCode
      });
    });

    it('should reject invalid coordinates', async () => {
      // Test invalid coordinates
      const result = await service.validateLocation(999, 999);
      
      expect(result.isValid).toBe(false);
      expect(result.validationScore).toBe(0);
      expect(result.issues).toContain('Invalid coordinates provided');
    });

    it('should handle edge cases', async () => {
      // Test coordinates at the edge of water bodies
      const testCases = [
        { lat: 51.5074, lng: -0.1278, name: 'London' }, // Should be valid
        { lat: 55.0, lng: 8.0, name: 'North Sea edge' }, // Might be water
        { lat: 40.7128, lng: -74.0060, name: 'New York' }, // Should be valid
      ];

      for (const testCase of testCases) {
        const result = await service.validateLocation(testCase.lat, testCase.lng);
        console.log(`📍 ${testCase.name} (${testCase.lat}, ${testCase.lng}):`, {
          isValid: result.isValid,
          isInWater: result.isInWater,
          validationScore: result.validationScore
        });
      }
    });
  });

  describe('findNearestLandAlternatives', () => {
    it('should find land alternatives for water locations', async () => {
      // Test finding alternatives for the user's water coordinates
      // Use a larger search radius since the nearest cities are ~120km away
      const alternatives = await service.findNearestLandAlternatives(54.4271, 6.7375, 150000);
      
      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives[0].distance).toBeLessThan(150000);
      
      console.log('🗺️ Land alternatives for water location:', {
        originalCoords: '54.4271, 6.7375',
        searchRadius: '150km',
        alternatives: alternatives.map(alt => ({
          coords: `${alt.lat.toFixed(4)}, ${alt.lng.toFixed(4)}`,
          distance: `${(alt.distance / 1000).toFixed(1)}km`
        }))
      });
    });
  });

  describe('batch validation', () => {
    it('should validate multiple locations efficiently', async () => {
      const locations = [
        { lat: 54.4271, lng: 6.7375 }, // Water (North Sea)
        { lat: 52.5200, lng: 13.4050 }, // Land (Berlin)
        { lat: 51.5074, lng: -0.1278 }, // Land (London)
        { lat: 55.0, lng: 8.0 }, // Possibly water
      ];

      const results = await service.validateLocations(locations);
      
      expect(results.size).toBe(4);
      
      console.log('📊 Batch validation results:');
      results.forEach((result, key) => {
        console.log(`   ${key}: ${result.isValid ? '✅ Valid' : '❌ Invalid'} ${result.isInWater ? '(Water)' : '(Land)'}`);
      });
      
      // Check that at least one location is identified as water
      const waterLocations = Array.from(results.values()).filter(r => r.isInWater);
      expect(waterLocations.length).toBeGreaterThan(0);
    });
  });

  describe('service health', () => {
    it('should report healthy status', () => {
      const health = service.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.message).toContain('operational');
    });
  });
});