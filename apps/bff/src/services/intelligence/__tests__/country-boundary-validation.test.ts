import { Test, TestingModule } from '@nestjs/testing';
import { GeographicValidationService } from '../geographic-validation.service';

describe('Country Boundary Validation', () => {
  let service: GeographicValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeographicValidationService],
    }).compile();

    service = module.get<GeographicValidationService>(GeographicValidationService);
  });

  describe('🌍 Country Boundary Detection', () => {
    it('should validate locations within correct country boundaries', async () => {
      // Test German locations
      const berlinResult = await service.validateLocation(52.52, 13.405, { expectedCountry: 'DE' });
      expect(berlinResult.isValid).toBe(true);
      expect(berlinResult.isInCorrectCountry).toBe(true);
      expect(berlinResult.detectedCountry).toBe('DE');
      
      console.log('🇩🇪 Berlin validation:', {
        coordinates: '52.52, 13.405',
        isValid: berlinResult.isValid,
        isInCorrectCountry: berlinResult.isInCorrectCountry,
        detectedCountry: berlinResult.detectedCountry
      });

      // Test French locations
      const parisResult = await service.validateLocation(48.8566, 2.3522, { expectedCountry: 'FR' });
      expect(parisResult.isValid).toBe(true);
      expect(parisResult.isInCorrectCountry).toBe(true);
      expect(parisResult.detectedCountry).toBe('FR');
      
      console.log('🇫🇷 Paris validation:', {
        coordinates: '48.8566, 2.3522',
        isValid: parisResult.isValid,
        isInCorrectCountry: parisResult.isInCorrectCountry,
        detectedCountry: parisResult.detectedCountry
      });
    });

    it('should reject locations outside expected country boundaries', async () => {
      // Test Berlin coordinates but expect France
      const berlinAsFranceResult = await service.validateLocation(52.52, 13.405, { expectedCountry: 'FR' });
      expect(berlinAsFranceResult.isValid).toBe(false);
      expect(berlinAsFranceResult.isInCorrectCountry).toBe(false);
      expect(berlinAsFranceResult.detectedCountry).toBe('DE');
      expect(berlinAsFranceResult.issues.some(issue => issue.includes('outside FR boundaries'))).toBe(true);
      
      console.log('❌ Berlin as France validation:', {
        coordinates: '52.52, 13.405',
        expectedCountry: 'FR',
        isValid: berlinAsFranceResult.isValid,
        isInCorrectCountry: berlinAsFranceResult.isInCorrectCountry,
        detectedCountry: berlinAsFranceResult.detectedCountry,
        issues: berlinAsFranceResult.issues
      });

      // Test Paris coordinates but expect Germany
      const parisAsGermanyResult = await service.validateLocation(48.8566, 2.3522, { expectedCountry: 'DE' });
      expect(parisAsGermanyResult.isValid).toBe(false);
      expect(parisAsGermanyResult.isInCorrectCountry).toBe(false);
      expect(parisAsGermanyResult.detectedCountry).toBe('FR');
      expect(parisAsGermanyResult.issues.some(issue => issue.includes('outside DE boundaries'))).toBe(true);
      
      console.log('❌ Paris as Germany validation:', {
        coordinates: '48.8566, 2.3522',
        expectedCountry: 'DE',
        isValid: parisAsGermanyResult.isValid,
        isInCorrectCountry: parisAsGermanyResult.isInCorrectCountry,
        detectedCountry: parisAsGermanyResult.detectedCountry,
        issues: parisAsGermanyResult.issues
      });
    });

    it('should handle multiple European countries correctly', async () => {
      const testCases = [
        { lat: 52.3676, lng: 4.9041, country: 'NL', name: 'Amsterdam' },
        { lat: 46.9481, lng: 7.4474, country: 'CH', name: 'Bern' },
        { lat: 48.2082, lng: 16.3738, country: 'AT', name: 'Vienna' },
        { lat: 41.9028, lng: 12.4964, country: 'IT', name: 'Rome' },
        { lat: 40.4168, lng: -3.7038, country: 'ES', name: 'Madrid' },
        { lat: 59.3293, lng: 18.0686, country: 'SE', name: 'Stockholm' }
      ];

      for (const testCase of testCases) {
        const result = await service.validateLocation(testCase.lat, testCase.lng, { 
          expectedCountry: testCase.country 
        });
        
        expect(result.isValid).toBe(true);
        expect(result.isInCorrectCountry).toBe(true);
        expect(result.detectedCountry).toBe(testCase.country);
        
        console.log(`✅ ${testCase.name} (${testCase.country}):`, {
          coordinates: `${testCase.lat}, ${testCase.lng}`,
          isValid: result.isValid,
          detectedCountry: result.detectedCountry
        });
      }
    });

    it('should work without country boundary validation when no expected country is provided', async () => {
      // Test that validation still works for water detection without country validation
      const berlinResult = await service.validateLocation(52.52, 13.405);
      expect(berlinResult.isValid).toBe(true);
      expect(berlinResult.isOnLand).toBe(true);
      expect(berlinResult.isInWater).toBe(false);
      expect(berlinResult.detectedCountry).toBe('DE');
      expect(berlinResult.isInCorrectCountry).toBeUndefined(); // Should not be set when no expected country
      
      console.log('🔍 Berlin without country validation:', {
        coordinates: '52.52, 13.405',
        isValid: berlinResult.isValid,
        detectedCountry: berlinResult.detectedCountry,
        isInCorrectCountry: berlinResult.isInCorrectCountry
      });
    });

    it('should handle water locations with country validation', async () => {
      // Test water location with country validation
      const waterResult = await service.validateLocation(54.4271, 6.7375, { expectedCountry: 'DE' });
      expect(waterResult.isValid).toBe(false);
      expect(waterResult.isInWater).toBe(true);
      expect(waterResult.isInCorrectCountry).toBe(false); // This location is in water, so outside any country
      expect(waterResult.issues.some(issue => issue.includes('water'))).toBe(true);
      
      console.log('🌊 Water location with country validation:', {
        coordinates: '54.4271, 6.7375',
        expectedCountry: 'DE',
        isValid: waterResult.isValid,
        isInWater: waterResult.isInWater,
        isInCorrectCountry: waterResult.isInCorrectCountry,
        issues: waterResult.issues
      });
    });
  });

  describe('🔧 Country Code Normalization', () => {
    it('should handle different country code formats', async () => {
      // Test with different country code formats
      const testFormats = ['DE', 'de', 'Germany', 'GERMANY'];
      
      for (const format of testFormats) {
        const result = await service.validateLocation(52.52, 13.405, { expectedCountry: format });
        expect(result.isValid).toBe(true);
        expect(result.isInCorrectCountry).toBe(true);
        
        console.log(`✅ Country format "${format}":`, {
          isValid: result.isValid,
          isInCorrectCountry: result.isInCorrectCountry
        });
      }
    });
  });
});