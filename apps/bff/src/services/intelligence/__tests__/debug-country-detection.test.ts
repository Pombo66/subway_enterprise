import { Test, TestingModule } from '@nestjs/testing';
import { GeographicValidationService } from '../geographic-validation.service';

describe('Debug Country Detection', () => {
  let service: GeographicValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeographicValidationService],
    }).compile();

    service = module.get<GeographicValidationService>(GeographicValidationService);
  });

  it('should debug country detection for failing locations', async () => {
    const testCases = [
      { lat: 52.3676, lng: 4.9041, country: 'NL', name: 'Amsterdam' },
      { lat: 46.9481, lng: 7.4474, country: 'CH', name: 'Bern' },
      { lat: 48.2082, lng: 16.3738, country: 'AT', name: 'Vienna' },
      { lat: 41.9028, lng: 12.4964, country: 'IT', name: 'Rome' },
      { lat: 40.4168, lng: -3.7038, country: 'ES', name: 'Madrid' },
      { lat: 59.3293, lng: 18.0686, country: 'SE', name: 'Stockholm' }
    ];

    for (const testCase of testCases) {
      // First test without expected country to see what gets detected
      const detectionResult = await service.validateLocation(testCase.lat, testCase.lng);
      
      // Then test with expected country
      const validationResult = await service.validateLocation(testCase.lat, testCase.lng, { 
        expectedCountry: testCase.country 
      });
      
      console.log(`🔍 ${testCase.name} (${testCase.lat}, ${testCase.lng}):`);
      console.log(`   Expected: ${testCase.country}`);
      console.log(`   Detected: ${detectionResult.detectedCountry}`);
      console.log(`   With validation: isValid=${validationResult.isValid}, isInCorrectCountry=${validationResult.isInCorrectCountry}`);
      console.log(`   Issues: ${validationResult.issues.join(', ')}`);
      console.log('');
    }
  });

  it('should test water location behavior', async () => {
    const waterResult = await service.validateLocation(54.4271, 6.7375, { expectedCountry: 'DE' });
    
    console.log('🌊 Water location (54.4271, 6.7375) with DE validation:');
    console.log(`   isValid: ${waterResult.isValid}`);
    console.log(`   isInWater: ${waterResult.isInWater}`);
    console.log(`   isInCorrectCountry: ${waterResult.isInCorrectCountry}`);
    console.log(`   detectedCountry: ${waterResult.detectedCountry}`);
    console.log(`   issues: ${waterResult.issues.join(', ')}`);
  });

  it('should test Berlin without country validation', async () => {
    const berlinResult = await service.validateLocation(52.52, 13.405);
    
    console.log('🏙️ Berlin (52.52, 13.405) without country validation:');
    console.log(`   isValid: ${berlinResult.isValid}`);
    console.log(`   isInCorrectCountry: ${berlinResult.isInCorrectCountry}`);
    console.log(`   detectedCountry: ${berlinResult.detectedCountry}`);
  });
});