import { AIDemographicInferenceService } from '../ai-demographic-inference.service';
import {
  LocationContext,
  RegionalDemographics,
  InferredDemographics
} from '../../../types/intelligence.types';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('AIDemographicInferenceService', () => {
  let service: AIDemographicInferenceService;
  let mockOpenAI: any;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    // Set up environment variable for testing
    process.env.OPENAI_API_KEY = 'test-api-key';
    
    // Create mock functions
    mockCreate = jest.fn();
    mockOpenAI = {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };

    MockedOpenAI.mockImplementation(() => mockOpenAI);

    service = new AIDemographicInferenceService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  describe('constructor', () => {
    it('should initialize with OpenAI API key', () => {
      expect(MockedOpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });

    it('should handle missing API key gracefully', () => {
      delete process.env.OPENAI_API_KEY;
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      new AIDemographicInferenceService();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'OpenAI API key not found. AI demographic inference will be disabled.'
      );
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('inferDemographicsWithAI', () => {
    const testLocation: LocationContext = {
      lat: 40.7128,
      lng: -74.0060,
      country: 'US',
      region: 'NY',
      nearbyFeatures: ['shopping_center', 'transit_hub', 'university'],
      populationDensity: 1500
    };

    const testRegionalPatterns: RegionalDemographics = {
      country: 'US',
      region: 'NY',
      typicalAgeDistribution: { under18: 20, age18to34: 30, age35to54: 30, age55plus: 20 },
      typicalIncomeDistribution: { 
        medianHouseholdIncome: 70000, 
        averageDisposableIncome: 50000, 
        incomeIndex: 0.85, 
        purchasingPower: 0.8 
      },
      commonLifestyleSegments: [{
        name: 'Urban Professionals',
        percentage: 40,
        description: 'City workers',
        subwayAffinity: 0.85
      }]
    };

    it('should successfully infer demographics with valid AI response', async () => {
      const mockAIResponse = {
        population: {
          total: 55000,
          density: 1500,
          growthRate: 2.5,
          urbanDensityIndex: 0.8
        },
        ageDistribution: {
          under18: 18,
          age18to34: 35,
          age35to54: 30,
          age55plus: 17
        },
        incomeDistribution: {
          medianHouseholdIncome: 75000,
          averageDisposableIncome: 55000,
          incomeIndex: 0.9,
          purchasingPower: 0.85
        },
        lifestyleSegments: [{
          name: 'Urban Professionals',
          percentage: 45,
          description: 'Working professionals in urban areas',
          subwayAffinity: 0.9
        }, {
          name: 'Students',
          percentage: 25,
          description: 'University students',
          subwayAffinity: 0.85
        }],
        consumerBehavior: {
          fastFoodFrequency: 5.2,
          healthConsciousness: 0.7,
          pricesensitivity: 0.4,
          brandLoyalty: 0.8,
          digitalEngagement: 0.9
        },
        marketFitScore: 0.85,
        confidence: 0.8,
        reasoning: 'High urban density with university presence suggests young professional demographic',
        keyFactors: ['university_proximity', 'urban_density', 'commercial_activity'],
        dataQualityNotes: 'Good data availability for urban area'
      };

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockAIResponse)
          }
        }],
        usage: {
          total_tokens: 850
        }
      } as any);

      const result = await service.inferDemographicsWithAI(testLocation, testRegionalPatterns);

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: 'gpt-5-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('demographic analysis expert')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('40.7128, -74.006')
          })
        ]),
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      }));

      expect(result).toBeDefined();
      expect(result.inferenceMethod).toBe('openai_gpt_analysis');
      expect(result.population.total).toBe(55000);
      expect(result.ageDistribution.age18to34).toBe(35);
      expect(result.lifestyleSegments).toHaveLength(2);
      expect(result.basedOnSimilarAreas).toContain('US_NY');
    });

    it('should validate and sanitize AI response data', async () => {
      const invalidAIResponse = {
        population: {
          total: -1000, // Invalid negative value
          density: 50000, // Too high
          growthRate: 15, // Too high
          urbanDensityIndex: 1.5 // Too high
        },
        ageDistribution: {
          under18: 150, // Invalid percentage
          age18to34: -10, // Invalid negative
          age35to54: 30,
          age55plus: 20
        },
        incomeDistribution: {
          medianHouseholdIncome: 300000, // Too high, should be capped
          averageDisposableIncome: 200000,
          incomeIndex: 3.0, // Too high
          purchasingPower: 1.5 // Too high
        },
        lifestyleSegments: [{
          name: 'Test Segment',
          percentage: 150, // Invalid percentage
          description: 'Test',
          subwayAffinity: 2.0 // Too high
        }],
        consumerBehavior: {
          fastFoodFrequency: 25, // Too high
          healthConsciousness: 1.5, // Too high
          pricesensitivity: -0.5, // Too low
          brandLoyalty: 2.0, // Too high
          digitalEngagement: 1.2 // Too high
        },
        marketFitScore: 1.5, // Too high
        confidence: 1.2 // Too high
      };

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(invalidAIResponse)
          }
        }],
        usage: { total_tokens: 500 }
      } as any);

      const result = await service.inferDemographicsWithAI(testLocation, testRegionalPatterns);

      // Should use fallback values for invalid data
      expect(result.population.total).toBe(50000); // Fallback value
      expect(result.ageDistribution).toEqual(testRegionalPatterns.typicalAgeDistribution); // Fallback
      expect(result.incomeDistribution.incomeIndex).toBeLessThanOrEqual(2); // Capped
      expect(result.marketFitScore).toBeLessThanOrEqual(1); // Capped
      expect(result.inferenceConfidence).toBeLessThanOrEqual(1); // Capped
    });

    it('should handle malformed JSON response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }],
        usage: { total_tokens: 100 }
      } as any);

      const result = await service.inferDemographicsWithAI(testLocation, testRegionalPatterns);

      // Should fallback to pattern-based inference
      expect(result.inferenceMethod).toBe('pattern_based_fallback');
      expect(result.inferenceConfidence).toBe(0.6);
    });

    it('should handle OpenAI API errors', async () => {
      mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

      const result = await service.inferDemographicsWithAI(testLocation, testRegionalPatterns);

      expect(result.inferenceMethod).toBe('pattern_based_fallback');
      expect(result.inferenceConfidence).toBe(0.6);
      expect(result.basedOnSimilarAreas).toContain('US_regional_patterns');
    });

    it('should handle empty AI response', async () => {
      mockCreate.mockResolvedValue({
        choices: [],
        usage: { total_tokens: 0 }
      } as any);

      const result = await service.inferDemographicsWithAI(testLocation, testRegionalPatterns);

      expect(result.inferenceMethod).toBe('pattern_based_fallback');
    });

    it('should throw error when OpenAI client is not initialized', async () => {
      // Create service without API key
      delete process.env.OPENAI_API_KEY;
      const serviceWithoutKey = new AIDemographicInferenceService();

      await expect(serviceWithoutKey.inferDemographicsWithAI(testLocation, testRegionalPatterns))
        .rejects.toThrow('OpenAI client not initialized - API key missing');
    });
  });

  describe('prompt generation', () => {
    it('should build comprehensive prompts with location context', async () => {
      const testLocation: LocationContext = {
        lat: 51.5074,
        lng: -0.1278,
        country: 'GB',
        region: 'London',
        nearbyFeatures: ['financial_district', 'transport_hub'],
        populationDensity: 5700
      };

      const testRegionalPatterns: RegionalDemographics = {
        country: 'GB',
        region: 'London',
        typicalAgeDistribution: { under18: 18, age18to34: 35, age35to54: 32, age55plus: 15 },
        typicalIncomeDistribution: { 
          medianHouseholdIncome: 45000, 
          averageDisposableIncome: 32000, 
          incomeIndex: 1.1, 
          purchasingPower: 0.9 
        },
        commonLifestyleSegments: []
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{}' } }],
        usage: { total_tokens: 100 }
      } as any);

      await service.inferDemographicsWithAI(testLocation, testRegionalPatterns);

      const callArgs = mockCreate.mock.calls[0][0];
      const userPrompt = callArgs.messages[1].content;

      expect(userPrompt).toContain('51.5074, -0.1278');
      expect(userPrompt).toContain('GB');
      expect(userPrompt).toContain('London');
      expect(userPrompt).toContain('Population density: 5700');
      expect(userPrompt).toContain('financial_district, transport_hub');
      expect(userPrompt).toContain('45000'); // Should contain income amount
    });

    it('should handle missing location features gracefully', async () => {
      const minimalLocation: LocationContext = {
        lat: 40.7128,
        lng: -74.0060,
        country: 'US',
        nearbyFeatures: []
      };

      const minimalPatterns: RegionalDemographics = {
        country: 'US',
        typicalAgeDistribution: { under18: 20, age18to34: 30, age35to54: 30, age55plus: 20 },
        typicalIncomeDistribution: { 
          medianHouseholdIncome: 60000, 
          averageDisposableIncome: 40000, 
          incomeIndex: 0.8, 
          purchasingPower: 0.7 
        },
        commonLifestyleSegments: []
      };

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{}' } }],
        usage: { total_tokens: 100 }
      } as any);

      await service.inferDemographicsWithAI(minimalLocation, minimalPatterns);

      const callArgs = mockCreate.mock.calls[0][0];
      const userPrompt = callArgs.messages[1].content;

      expect(userPrompt).toContain('No specific features identified');
      expect(userPrompt).toContain('Population density: Unknown');
      expect(userPrompt).toContain('Region: Not specified');
    });
  });

  describe('data validation', () => {
    it('should validate age distribution percentages', () => {
      const validAgeDistribution = {
        under18: 20,
        age18to34: 30,
        age35to54: 30,
        age55plus: 20
      };

      const fallbackDistribution = { under18: 25, age18to34: 25, age35to54: 25, age55plus: 25 };

      const result = (service as any).validateAgeDistribution(validAgeDistribution, fallbackDistribution);
      expect(result).toEqual(validAgeDistribution);

      // Test invalid distribution (doesn't sum to ~100)
      const invalidAgeDistribution = {
        under18: 50,
        age18to34: 60,
        age35to54: 70,
        age55plus: 80
      };

      const invalidResult = (service as any).validateAgeDistribution(invalidAgeDistribution, fallbackDistribution);
      expect(invalidResult).toEqual(fallbackDistribution);
    });

    it('should validate lifestyle segments', () => {
      const validSegments = [{
        name: 'Professionals',
        percentage: 40,
        description: 'Working professionals',
        subwayAffinity: 0.8
      }, {
        name: 'Students',
        percentage: 30,
        description: 'University students',
        subwayAffinity: 0.9
      }];

      const fallbackSegments = [{ name: 'Default', percentage: 100, description: 'Default', subwayAffinity: 0.5 }];

      const result = (service as any).validateLifestyleSegments(validSegments, fallbackSegments);
      expect(result).toEqual(validSegments);

      // Test invalid segments (total percentage too high)
      const invalidSegments = [{
        name: 'Group1',
        percentage: 80,
        description: 'Test',
        subwayAffinity: 0.5
      }, {
        name: 'Group2',
        percentage: 80,
        description: 'Test',
        subwayAffinity: 0.5
      }];

      const invalidResult = (service as any).validateLifestyleSegments(invalidSegments, fallbackSegments);
      expect(invalidResult).toEqual(fallbackSegments);
    });

    it('should validate numeric ranges', () => {
      // Test valid number
      expect((service as any).validateNumber(50, 0, 100, 25)).toBe(50);
      
      // Test number too low
      expect((service as any).validateNumber(-10, 0, 100, 25)).toBe(25);
      
      // Test number too high
      expect((service as any).validateNumber(150, 0, 100, 25)).toBe(25);
      
      // Test invalid number
      expect((service as any).validateNumber('invalid', 0, 100, 25)).toBe(25);
      
      // Test null/undefined
      expect((service as any).validateNumber(null, 0, 100, 25)).toBe(25);
    });
  });

  describe('fallback inference', () => {
    it('should provide reasonable fallback demographics', async () => {
      const testLocation: LocationContext = {
        lat: 40.7128,
        lng: -74.0060,
        country: 'US',
        nearbyFeatures: [],
        populationDensity: 2000
      };

      const testRegionalPatterns: RegionalDemographics = {
        country: 'US',
        typicalAgeDistribution: { under18: 20, age18to34: 30, age35to54: 30, age55plus: 20 },
        typicalIncomeDistribution: { 
          medianHouseholdIncome: 60000, 
          averageDisposableIncome: 40000, 
          incomeIndex: 0.8, 
          purchasingPower: 0.7 
        },
        commonLifestyleSegments: [{
          name: 'Suburban Families',
          percentage: 50,
          description: 'Family households',
          subwayAffinity: 0.6
        }]
      };

      const result = (service as any).fallbackToPatternInference(testLocation, testRegionalPatterns);

      expect(result.inferenceMethod).toBe('pattern_based_fallback');
      expect(result.inferenceConfidence).toBe(0.6);
      expect(result.population.density).toBe(2000);
      expect(result.lifestyleSegments).toEqual(testRegionalPatterns.commonLifestyleSegments);
      
      // Should adjust income based on urban context
      expect(result.incomeDistribution.medianHouseholdIncome).toBeGreaterThan(
        testRegionalPatterns.typicalIncomeDistribution.medianHouseholdIncome
      );
    });
  });
});