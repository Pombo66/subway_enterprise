import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  LocationContext,
  RegionalDemographics,
  InferredDemographics,
  DemographicProfile,
  PopulationMetrics,
  AgeDistribution,
  IncomeDistribution,
  LifestyleSegment,
  ConsumerBehaviorProfile
} from '../../types/intelligence.types';
import { IntelligenceConfigManager } from '../../config/intelligence.config';

@Injectable()
export class AIDemographicInferenceService {
  private openai: OpenAI;
  private configManager: IntelligenceConfigManager;

  constructor() {
    this.configManager = IntelligenceConfigManager.getInstance();
    
    // Initialize OpenAI client
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OpenAI API key not found. AI demographic inference will be disabled.');
    } else {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async inferDemographicsWithAI(
    location: LocationContext,
    regionalPatterns: RegionalDemographics
  ): Promise<InferredDemographics> {
    console.info('Inferring demographics with AI', {
      location: `${location.lat}, ${location.lng}`,
      country: location.country,
      region: location.region
    });

    if (!this.openai) {
      throw new Error('OpenAI client not initialized - API key missing');
    }

    try {
      const aiConfig = this.configManager.getAIConfig();
      const prompt = this.buildDemographicInferencePrompt(location, regionalPatterns);
      
      const response = await this.openai.chat.completions.create({
        model: aiConfig.demographicModel,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        // Note: temperature parameter removed as GPT-5 models only support default (1.0)
        max_completion_tokens: 1500,
        response_format: { type: 'json_object' }
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from AI service');
      }

      const parsedResponse = JSON.parse(aiResponse);
      const inferredDemographics = this.parseAIResponse(parsedResponse, location, regionalPatterns);

      console.info('AI demographic inference completed', {
        tokensUsed: response.usage?.total_tokens || 0,
        confidence: inferredDemographics.inferenceConfidence
      });

      return inferredDemographics;
    } catch (error) {
      console.error('AI demographic inference failed:', error);
      
      // Fallback to pattern-based inference
      console.info('Falling back to pattern-based demographic inference');
      return this.fallbackToPatternInference(location, regionalPatterns);
    }
  }

  private getSystemPrompt(): string {
    return `You are a demographic analysis expert specializing in retail location assessment. 
Your task is to infer detailed demographic characteristics for a specific location based on:
1. Geographic coordinates and context
2. Regional demographic patterns
3. Local features and characteristics

Provide realistic demographic estimates that would be useful for retail location planning, 
specifically for quick-service restaurant (QSR) site selection.

Return your analysis as a JSON object with the following structure:
{
  "population": {
    "total": number,
    "density": number,
    "growthRate": number,
    "urbanDensityIndex": number
  },
  "ageDistribution": {
    "under18": number,
    "age18to34": number,
    "age35to54": number,
    "age55plus": number
  },
  "incomeDistribution": {
    "medianHouseholdIncome": number,
    "averageDisposableIncome": number,
    "incomeIndex": number,
    "purchasingPower": number
  },
  "lifestyleSegments": [
    {
      "name": string,
      "percentage": number,
      "description": string,
      "subwayAffinity": number
    }
  ],
  "consumerBehavior": {
    "fastFoodFrequency": number,
    "healthConsciousness": number,
    "pricesensitivity": number,
    "brandLoyalty": number,
    "digitalEngagement": number
  },
  "marketFitScore": number,
  "confidence": number,
  "reasoning": string,
  "keyFactors": [string],
  "dataQualityNotes": string
}

Guidelines:
- Population total should be realistic for the area type and density
- Age distribution percentages should sum to 100
- Income values should be in local currency
- Lifestyle segment percentages should sum to 100
- All score values (indices, affinities, behaviors) should be between 0 and 1
- Confidence should reflect the quality of available data and inference certainty
- Provide clear reasoning for your estimates`;
  }

  private buildDemographicInferencePrompt(
    location: LocationContext,
    regionalPatterns: RegionalDemographics
  ): string {
    const nearbyFeaturesText = location.nearbyFeatures.length > 0 
      ? location.nearbyFeatures.join(', ')
      : 'No specific features identified';

    const populationDensityText = location.populationDensity 
      ? `Population density: ${location.populationDensity} people per km²`
      : 'Population density: Unknown';

    return `Please analyze the demographic characteristics for this location:

LOCATION DETAILS:
- Coordinates: ${location.lat}, ${location.lng}
- Country: ${location.country}
- Region: ${location.region || 'Not specified'}
- ${populationDensityText}
- Nearby features: ${nearbyFeaturesText}

REGIONAL CONTEXT:
- Country: ${regionalPatterns.country}
- Region: ${regionalPatterns.region || 'National average'}

Regional Age Distribution:
- Under 18: ${regionalPatterns.typicalAgeDistribution.under18}%
- 18-34: ${regionalPatterns.typicalAgeDistribution.age18to34}%
- 35-54: ${regionalPatterns.typicalAgeDistribution.age35to54}%
- 55+: ${regionalPatterns.typicalAgeDistribution.age55plus}%

Regional Income Profile:
- Median household income: $${regionalPatterns.typicalIncomeDistribution.medianHouseholdIncome}
- Income index: ${regionalPatterns.typicalIncomeDistribution.incomeIndex}
- Purchasing power: ${regionalPatterns.typicalIncomeDistribution.purchasingPower}

Common Lifestyle Segments:
${regionalPatterns.commonLifestyleSegments.map(segment => 
  `- ${segment.name}: ${segment.percentage}% (${segment.description})`
).join('\n')}

ANALYSIS REQUEST:
Based on the location coordinates, nearby features, and regional patterns, provide detailed demographic estimates for this specific location. Consider:

1. How the location's characteristics might differ from regional averages
2. The impact of nearby features on demographic composition
3. Urban vs suburban vs rural characteristics based on coordinates
4. Economic factors that might influence income and spending patterns
5. Lifestyle factors relevant to quick-service restaurant customers

Focus on providing realistic estimates that account for local variations while using regional patterns as a baseline. Explain your reasoning for any significant deviations from regional averages.`;
  }

  private parseAIResponse(
    aiResponse: any,
    location: LocationContext,
    regionalPatterns: RegionalDemographics
  ): InferredDemographics {
    try {
      // Validate and sanitize AI response
      const population: PopulationMetrics = {
        total: this.validateNumber(aiResponse.population?.total, 1000, 1000000, 50000),
        density: this.validateNumber(aiResponse.population?.density, 10, 10000, 1000),
        growthRate: this.validateNumber(aiResponse.population?.growthRate, -5, 10, 1.5),
        urbanDensityIndex: this.validateNumber(aiResponse.population?.urbanDensityIndex, 0, 1, 0.6)
      };

      const ageDistribution: AgeDistribution = this.validateAgeDistribution(
        aiResponse.ageDistribution,
        regionalPatterns.typicalAgeDistribution
      );

      const incomeDistribution: IncomeDistribution = {
        medianHouseholdIncome: this.validateNumber(
          aiResponse.incomeDistribution?.medianHouseholdIncome, 
          20000, 200000, 
          regionalPatterns.typicalIncomeDistribution.medianHouseholdIncome
        ),
        averageDisposableIncome: this.validateNumber(
          aiResponse.incomeDistribution?.averageDisposableIncome,
          15000, 150000,
          regionalPatterns.typicalIncomeDistribution.averageDisposableIncome
        ),
        incomeIndex: this.validateNumber(
          aiResponse.incomeDistribution?.incomeIndex, 0, 2, 
          regionalPatterns.typicalIncomeDistribution.incomeIndex
        ),
        purchasingPower: this.validateNumber(
          aiResponse.incomeDistribution?.purchasingPower, 0, 1,
          regionalPatterns.typicalIncomeDistribution.purchasingPower
        )
      };

      const lifestyleSegments: LifestyleSegment[] = this.validateLifestyleSegments(
        aiResponse.lifestyleSegments,
        regionalPatterns.commonLifestyleSegments
      );

      const consumerBehavior: ConsumerBehaviorProfile = {
        fastFoodFrequency: this.validateNumber(aiResponse.consumerBehavior?.fastFoodFrequency, 0, 20, 4),
        healthConsciousness: this.validateNumber(aiResponse.consumerBehavior?.healthConsciousness, 0, 1, 0.6),
        pricesensitivity: this.validateNumber(aiResponse.consumerBehavior?.pricesensitivity, 0, 1, 0.5),
        brandLoyalty: this.validateNumber(aiResponse.consumerBehavior?.brandLoyalty, 0, 1, 0.7),
        digitalEngagement: this.validateNumber(aiResponse.consumerBehavior?.digitalEngagement, 0, 1, 0.8)
      };

      const marketFitScore = this.validateNumber(aiResponse.marketFitScore, 0, 1, 0.6);
      const confidence = this.validateNumber(aiResponse.confidence, 0, 1, 0.7);

      return {
        population,
        ageDistribution,
        incomeDistribution,
        lifestyleSegments,
        consumerBehavior,
        marketFitScore,
        dataSource: 'ai_inferred',
        confidence,
        inferenceMethod: 'openai_gpt_analysis',
        inferenceConfidence: confidence,
        basedOnSimilarAreas: [
          `${location.country}_${location.region || 'national'}`,
          ...(aiResponse.keyFactors || []).slice(0, 3)
        ]
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error(`AI response parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private validateNumber(
    value: any, 
    min: number, 
    max: number, 
    fallback: number
  ): number {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num) || num < min || num > max) {
      return fallback;
    }
    return num;
  }

  private validateAgeDistribution(
    aiAgeDistribution: any,
    fallback: AgeDistribution
  ): AgeDistribution {
    if (!aiAgeDistribution || typeof aiAgeDistribution !== 'object') {
      return fallback;
    }

    const under18 = this.validateNumber(aiAgeDistribution.under18, 0, 50, fallback.under18);
    const age18to34 = this.validateNumber(aiAgeDistribution.age18to34, 0, 60, fallback.age18to34);
    const age35to54 = this.validateNumber(aiAgeDistribution.age35to54, 0, 60, fallback.age35to54);
    const age55plus = this.validateNumber(aiAgeDistribution.age55plus, 0, 50, fallback.age55plus);

    // Ensure percentages sum to approximately 100
    const total = under18 + age18to34 + age35to54 + age55plus;
    if (Math.abs(total - 100) > 10) {
      // If sum is too far from 100, return fallback
      return fallback;
    }

    return { under18, age18to34, age35to54, age55plus };
  }

  private validateLifestyleSegments(
    aiSegments: any[],
    fallback: LifestyleSegment[]
  ): LifestyleSegment[] {
    if (!Array.isArray(aiSegments) || aiSegments.length === 0) {
      return fallback;
    }

    const validSegments: LifestyleSegment[] = [];
    let totalPercentage = 0;

    for (const segment of aiSegments) {
      if (segment && typeof segment === 'object' && segment.name && typeof segment.percentage === 'number') {
        const validSegment: LifestyleSegment = {
          name: String(segment.name).slice(0, 100), // Limit name length
          percentage: this.validateNumber(segment.percentage, 0, 100, 0),
          description: String(segment.description || '').slice(0, 200),
          subwayAffinity: this.validateNumber(segment.subwayAffinity, 0, 1, 0.5)
        };
        
        if (validSegment.percentage > 0) {
          validSegments.push(validSegment);
          totalPercentage += validSegment.percentage;
        }
      }
    }

    // If total percentage is reasonable and we have segments, return them
    if (validSegments.length > 0 && totalPercentage >= 50 && totalPercentage <= 120) {
      return validSegments;
    }

    return fallback;
  }

  private fallbackToPatternInference(
    location: LocationContext,
    regionalPatterns: RegionalDemographics
  ): InferredDemographics {
    console.info('Using pattern-based demographic inference as fallback');

    // Apply simple adjustments based on location context
    const urbanAdjustment = location.populationDensity ? 
      Math.min(location.populationDensity / 1000, 2) : 1;

    const population: PopulationMetrics = {
      total: Math.floor(50000 * urbanAdjustment),
      density: location.populationDensity || 1000,
      growthRate: 1.5,
      urbanDensityIndex: Math.min(urbanAdjustment * 0.5, 0.9)
    };

    // Adjust age distribution slightly based on urban context
    const baseAge = regionalPatterns.typicalAgeDistribution;
    const ageDistribution: AgeDistribution = {
      under18: Math.max(baseAge.under18 - (urbanAdjustment * 2), 15),
      age18to34: Math.min(baseAge.age18to34 + (urbanAdjustment * 3), 45),
      age35to54: baseAge.age35to54,
      age55plus: Math.max(baseAge.age55plus - (urbanAdjustment * 1), 10)
    };

    // Adjust income based on urban context
    const baseIncome = regionalPatterns.typicalIncomeDistribution;
    const incomeDistribution: IncomeDistribution = {
      medianHouseholdIncome: Math.floor(baseIncome.medianHouseholdIncome * (1 + urbanAdjustment * 0.2)),
      averageDisposableIncome: Math.floor(baseIncome.averageDisposableIncome * (1 + urbanAdjustment * 0.15)),
      incomeIndex: Math.min(baseIncome.incomeIndex * (1 + urbanAdjustment * 0.1), 1.5),
      purchasingPower: Math.min(baseIncome.purchasingPower * (1 + urbanAdjustment * 0.1), 1)
    };

    const consumerBehavior: ConsumerBehaviorProfile = {
      fastFoodFrequency: 4 + (urbanAdjustment * 1.5),
      healthConsciousness: Math.max(0.6 - (urbanAdjustment * 0.1), 0.3),
      pricesensitivity: Math.max(0.5 - (urbanAdjustment * 0.1), 0.2),
      brandLoyalty: 0.7,
      digitalEngagement: Math.min(0.7 + (urbanAdjustment * 0.15), 0.95)
    };

    return {
      population,
      ageDistribution,
      incomeDistribution,
      lifestyleSegments: regionalPatterns.commonLifestyleSegments,
      consumerBehavior,
      marketFitScore: 0.65,
      dataSource: 'ai_inferred',
      confidence: 0.6,
      inferenceMethod: 'pattern_based_fallback',
      inferenceConfidence: 0.6,
      basedOnSimilarAreas: [`${location.country}_regional_patterns`]
    };
  }
}