import { Injectable } from '@nestjs/common';
import {
  StrategicRationale,
  LocationAnalysis,
  Location,
  AlternativeLocation,
  AlternativeComparison,
  IntelligenceError
} from '../../types/intelligence.types';
import { IntelligenceConfigManager } from '../../config/intelligence.config';

interface RationalePromptContext {
  location: Location;
  analysis: LocationAnalysis;
  alternatives?: AlternativeLocation[];
  businessContext?: {
    brandName: string;
    targetMarket: string;
    expansionGoals: string[];
  };
}

interface AIRationaleResponse {
  primaryReasons: string[];
  addressedConcerns: string[];
  confidenceFactors: string[];
  riskMitigations: string[];
  executiveSummary: string;
  alternativeComparison?: {
    whyOriginalIsBetter: string[];
    tradeoffs: string[];
  };
}

@Injectable()
export class StrategicRationaleService {
  private configManager: IntelligenceConfigManager;
  private cache: Map<string, { data: StrategicRationale; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

  constructor() {
    this.configManager = IntelligenceConfigManager.getInstance();
  }

  async generateStrategicRationale(
    location: Location,
    analysis: LocationAnalysis,
    alternatives?: AlternativeLocation[]
  ): Promise<StrategicRationale> {
    console.info('Generating strategic rationale', { 
      lat: location.lat, 
      lng: location.lng,
      hasAlternatives: !!alternatives?.length 
    });

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(location, analysis);
      const cached = this.getCachedRationale(cacheKey);
      if (cached) {
        return cached;
      }

      const config = this.configManager.getConfig();
      
      if (!config.enableStrategicRationale) {
        return this.generateBasicRationale(location, analysis, alternatives);
      }

      // Generate AI-powered rationale
      const aiRationale = await this.generateAIRationale({
        location,
        analysis,
        alternatives,
        businessContext: {
          brandName: 'Subway',
          targetMarket: 'Quick-service restaurant customers',
          expansionGoals: ['Market penetration', 'Revenue growth', 'Brand presence']
        }
      });

      const rationale: StrategicRationale = {
        primaryReasons: aiRationale.primaryReasons,
        addressedConcerns: aiRationale.addressedConcerns,
        confidenceFactors: aiRationale.confidenceFactors,
        riskMitigations: aiRationale.riskMitigations,
        alternativeComparison: alternatives?.length ? {
          alternativeLocation: {
            lat: alternatives[0].lat,
            lng: alternatives[0].lng,
            name: `Alternative location ${alternatives[0].distance}m away`
          },
          whyOriginalIsBetter: aiRationale.alternativeComparison?.whyOriginalIsBetter || [],
          tradeoffs: aiRationale.alternativeComparison?.tradeoffs || []
        } : undefined
      };

      // Cache the result
      this.cacheRationale(cacheKey, rationale);

      return rationale;
    } catch (error) {
      console.error('Failed to generate strategic rationale:', error);
      
      // Fallback to basic rationale generation
      return this.generateBasicRationale(location, analysis, alternatives);
    }
  }

  async generateAlternativeComparison(
    originalLocation: Location,
    originalAnalysis: LocationAnalysis,
    alternativeLocation: AlternativeLocation
  ): Promise<AlternativeComparison> {
    console.info('Generating alternative comparison', {
      original: { lat: originalLocation.lat, lng: originalLocation.lng },
      alternative: { lat: alternativeLocation.lat, lng: alternativeLocation.lng }
    });

    try {
      const config = this.configManager.getConfig();
      
      if (!config.enableStrategicRationale) {
        return this.generateBasicComparison(originalLocation, originalAnalysis, alternativeLocation);
      }

      // Generate AI-powered comparison
      const prompt = this.buildComparisonPrompt(originalLocation, originalAnalysis, alternativeLocation);
      const aiResponse = await this.callAIService(prompt, 'comparison');

      return {
        alternativeLocation: {
          lat: alternativeLocation.lat,
          lng: alternativeLocation.lng,
          name: `Alternative location (${alternativeLocation.distance}m away)`
        },
        whyOriginalIsBetter: aiResponse.whyOriginalIsBetter || [],
        tradeoffs: aiResponse.tradeoffs || []
      };
    } catch (error) {
      console.error('Failed to generate alternative comparison:', error);
      return this.generateBasicComparison(originalLocation, originalAnalysis, alternativeLocation);
    }
  }

  private async generateAIRationale(context: RationalePromptContext): Promise<AIRationaleResponse> {
    const prompt = this.buildRationalePrompt(context);
    return await this.callAIService(prompt, 'rationale');
  }

  private buildRationalePrompt(context: RationalePromptContext): string {
    const { location, analysis, alternatives, businessContext } = context;

    return `
You are a strategic business analyst for ${businessContext?.brandName || 'a restaurant chain'} evaluating a potential expansion location. 
Generate a comprehensive strategic rationale for opening a new location at coordinates ${location.lat}, ${location.lng}.

LOCATION ANALYSIS DATA:
- Commercial Area: ${analysis.intelligence.isCommercialArea ? 'Yes' : 'No'}
- Distance to Town Center: ${analysis.intelligence.distanceToTownCenter}m
- Land Use Type: ${analysis.intelligence.landUseType}
- Development Potential: ${analysis.intelligence.developmentPotential.toFixed(2)}
- Commercial Features: ${analysis.intelligence.nearbyCommercialFeatures.map(f => f.name).join(', ')}

DEMOGRAPHIC PROFILE:
- Market Fit Score: ${analysis.demographics.marketFitScore.toFixed(2)}
- Population: ${analysis.demographics.population.total.toLocaleString()}
- Population Density: ${analysis.demographics.population.density}/km²
- Data Source: ${analysis.demographics.dataSource}
- Confidence: ${analysis.demographics.confidence.toFixed(2)}

VIABILITY ASSESSMENT:
- Commercial Viability: ${analysis.viability.commercialViability.score.toFixed(2)}
- Accessibility Score: ${analysis.viability.accessibility.score.toFixed(2)}
- Urban Context Score: ${analysis.viability.urbanContext.score.toFixed(2)}
- Development Cost: $${analysis.viability.commercialViability.estimatedDevelopmentCost.toLocaleString()}
- Time to Open: ${analysis.viability.commercialViability.timeToOpen} months

COMPETITIVE LANDSCAPE:
- Market Gap Opportunity: ${analysis.competitive.marketGapOpportunity.toFixed(2)}
- Market Saturation: ${analysis.competitive.marketSaturation.toFixed(2)}
- Cannibalization Risk: ${analysis.competitive.cannibalizationRisk.riskLevel}
- Competitive Advantages: ${analysis.competitive.competitiveAdvantages.join(', ')}

${alternatives?.length ? `
ALTERNATIVE LOCATIONS CONSIDERED:
${alternatives.map(alt => `- Location ${alt.distance}m away with ${alt.improvementScore.toFixed(2)} improvement score: ${alt.reasons.join(', ')}`).join('\n')}
` : ''}

Please provide a strategic rationale in the following JSON format:
{
  "primaryReasons": ["3-5 compelling reasons why this location should be chosen"],
  "addressedConcerns": ["2-4 potential concerns and how they are mitigated"],
  "confidenceFactors": ["3-5 factors that increase confidence in this decision"],
  "riskMitigations": ["2-4 specific risk mitigation strategies"],
  "executiveSummary": "2-3 sentence executive summary of the recommendation",
  ${alternatives?.length ? `"alternativeComparison": {
    "whyOriginalIsBetter": ["2-3 reasons why the original location is better than alternatives"],
    "tradeoffs": ["1-2 tradeoffs being made by choosing the original location"]
  }` : ''}
}

Focus on business impact, market opportunity, operational feasibility, and strategic alignment with ${businessContext?.targetMarket || 'target market'}.
Be specific and data-driven in your reasoning.
`;
  }

  private buildComparisonPrompt(
    originalLocation: Location,
    originalAnalysis: LocationAnalysis,
    alternativeLocation: AlternativeLocation
  ): string {
    return `
Compare two potential restaurant locations and explain why the original location is recommended over the alternative.

ORIGINAL LOCATION (${originalLocation.lat}, ${originalLocation.lng}):
- Commercial Area: ${originalAnalysis.intelligence.isCommercialArea ? 'Yes' : 'No'}
- Development Potential: ${originalAnalysis.intelligence.developmentPotential.toFixed(2)}
- Market Fit: ${originalAnalysis.demographics.marketFitScore.toFixed(2)}
- Commercial Viability: ${originalAnalysis.viability.commercialViability.score.toFixed(2)}
- Market Gap Opportunity: ${originalAnalysis.competitive.marketGapOpportunity.toFixed(2)}

ALTERNATIVE LOCATION (${alternativeLocation.lat}, ${alternativeLocation.lng}):
- Distance: ${alternativeLocation.distance}m away
- Improvement Score: ${alternativeLocation.improvementScore.toFixed(2)}
- Viability Score: ${alternativeLocation.viabilityScore.toFixed(2)}
- Reasons for consideration: ${alternativeLocation.reasons.join(', ')}

Provide comparison in JSON format:
{
  "whyOriginalIsBetter": ["2-3 specific advantages of the original location"],
  "tradeoffs": ["1-2 tradeoffs being made by choosing original over alternative"]
}
`;
  }

  private async callAIService(prompt: string, type: 'rationale' | 'comparison'): Promise<any> {
    const config = this.configManager.getConfig();
    
    // Simulate AI service call
    // In a real implementation, this would call OpenAI, Anthropic, or other AI services
    console.info(`Calling AI service for ${type} generation`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    if (type === 'rationale') {
      return this.generateMockRationaleResponse(prompt);
    } else {
      return this.generateMockComparisonResponse(prompt);
    }
  }

  private generateMockRationaleResponse(prompt: string): AIRationaleResponse {
    // Extract key metrics from prompt for realistic responses
    const developmentPotential = this.extractMetric(prompt, 'Development Potential: (\\d+\\.\\d+)');
    const marketFitScore = this.extractMetric(prompt, 'Market Fit Score: (\\d+\\.\\d+)');
    const viabilityScore = this.extractMetric(prompt, 'Commercial Viability: (\\d+\\.\\d+)');
    const isCommercialArea = prompt.includes('Commercial Area: Yes');
    const hasAlternatives = prompt.includes('ALTERNATIVE LOCATIONS CONSIDERED:');
    
    // Extract location coordinates to make responses location-specific
    const latMatch = prompt.match(/coordinates ([\d.-]+), ([\d.-]+)/);
    const locationHash = latMatch ? `${latMatch[1]}_${latMatch[2]}` : 'unknown';

    const primaryReasons: string[] = [];
    const addressedConcerns: string[] = [];
    const confidenceFactors: string[] = [];
    const riskMitigations: string[] = [];

    // Generate primary reasons based on strengths
    if (developmentPotential > 0.7) {
      primaryReasons.push(`Exceptional development potential at location ${locationHash} indicates strong market fundamentals and operational feasibility`);
    } else if (developmentPotential > 0.5) {
      primaryReasons.push(`Solid development potential at location ${locationHash} supports sustainable business operations`);
    }

    if (marketFitScore > 0.7) {
      primaryReasons.push('Outstanding demographic alignment with target customer profile ensures strong market demand');
    } else if (marketFitScore > 0.5) {
      primaryReasons.push('Good demographic match provides solid foundation for customer acquisition');
    }

    if (viabilityScore > 0.7) {
      primaryReasons.push('High commercial viability score demonstrates excellent development potential and operational efficiency');
    }

    if (isCommercialArea) {
      primaryReasons.push('Established commercial area provides proven foot traffic and business-friendly environment');
      confidenceFactors.push('Located in established commercial district with existing customer flow');
    }

    // Generate addressed concerns based on weaknesses
    if (developmentPotential < 0.5) {
      addressedConcerns.push('Lower development potential mitigated by targeted marketing and community engagement strategy');
      riskMitigations.push('Implement enhanced local marketing and community partnership programs');
    }

    if (marketFitScore < 0.5) {
      addressedConcerns.push('Demographic challenges addressed through menu customization and pricing strategy');
      riskMitigations.push('Adapt menu offerings and pricing to better match local demographic preferences');
    }

    if (viabilityScore < 0.5) {
      addressedConcerns.push('Development challenges managed through phased construction and permit optimization');
      riskMitigations.push('Engage local development consultants to streamline permitting and construction process');
    }

    // Add confidence factors
    confidenceFactors.push('Comprehensive multi-factor analysis provides high confidence in location assessment');
    confidenceFactors.push('Data-driven approach reduces subjective bias in location selection');

    if (primaryReasons.length < 3) {
      primaryReasons.push('Strategic location positioning supports long-term market presence and brand visibility');
    }

    if (addressedConcerns.length === 0) {
      addressedConcerns.push('Minimal operational concerns identified through comprehensive viability assessment');
    }

    if (riskMitigations.length === 0) {
      riskMitigations.push('Continuous market monitoring and performance optimization protocols in place');
    }

    const response: AIRationaleResponse = {
      primaryReasons: primaryReasons.slice(0, 5),
      addressedConcerns: addressedConcerns.slice(0, 4),
      confidenceFactors: confidenceFactors.slice(0, 5),
      riskMitigations: riskMitigations.slice(0, 4),
      executiveSummary: `Location ${locationHash} demonstrates ${developmentPotential > 0.6 ? 'strong' : 'adequate'} development potential with ${marketFitScore > 0.6 ? 'excellent' : 'good'} demographic alignment. The comprehensive analysis supports proceeding with development while implementing targeted risk mitigation strategies.`
    };

    if (hasAlternatives) {
      response.alternativeComparison = {
        whyOriginalIsBetter: [
          'Original location offers superior balance of market opportunity and operational feasibility',
          'Better alignment with strategic expansion criteria and brand positioning requirements'
        ],
        tradeoffs: [
          'Accepting slightly higher development complexity for better long-term market position'
        ]
      };
    }

    return response;
  }

  private generateMockComparisonResponse(prompt: string): any {
    const originalDevelopmentPotential = this.extractMetric(prompt, 'Development Potential: (\\d+\\.\\d+)');
    const alternativeScore = this.extractMetric(prompt, 'Improvement Score: (\\d+\\.\\d+)');

    return {
      whyOriginalIsBetter: [
        'Original location provides better balance of market opportunity and operational feasibility',
        `Higher development potential (${originalDevelopmentPotential.toFixed(2)}) indicates superior market fundamentals`,
        'Better strategic alignment with long-term expansion objectives'
      ].slice(0, 3),
      tradeoffs: [
        alternativeScore > originalDevelopmentPotential 
          ? 'Accepting lower improvement potential for proven market stability'
          : 'Choosing established market presence over potentially higher growth opportunity'
      ]
    };
  }

  private generateBasicRationale(
    location: Location,
    analysis: LocationAnalysis,
    alternatives?: AlternativeLocation[]
  ): StrategicRationale {
    const primaryReasons: string[] = [];
    const addressedConcerns: string[] = [];
    const confidenceFactors: string[] = [];
    const riskMitigations: string[] = [];

    // Generate basic rationale based on analysis scores
    if (analysis.intelligence.developmentPotential > 0.6) {
      primaryReasons.push('Strong development potential supports business viability');
      confidenceFactors.push('High development potential indicates favorable market conditions');
    }

    if (analysis.demographics.marketFitScore > 0.6) {
      primaryReasons.push('Good demographic alignment with target customer profile');
      confidenceFactors.push('Demographic analysis shows strong market fit');
    }

    if (analysis.viability.commercialViability.score > 0.6) {
      primaryReasons.push('Favorable viability assessment for development and operations');
      confidenceFactors.push('Comprehensive viability analysis supports location choice');
    }

    if (analysis.competitive.marketGapOpportunity > 0.6) {
      primaryReasons.push('Significant market gap opportunity with limited direct competition');
      confidenceFactors.push('Competitive analysis reveals market opportunity');
    }

    // Add concerns for lower scores
    if (analysis.intelligence.developmentPotential < 0.5) {
      addressedConcerns.push('Lower development potential requires enhanced market development strategy');
      riskMitigations.push('Implement targeted marketing and community engagement programs');
    }

    if (analysis.demographics.marketFitScore < 0.5) {
      addressedConcerns.push('Demographic challenges require customized approach');
      riskMitigations.push('Adapt offerings to better match local market preferences');
    }

    // Ensure minimum content
    if (primaryReasons.length === 0) {
      primaryReasons.push('Location meets basic criteria for restaurant development');
    }

    if (confidenceFactors.length === 0) {
      confidenceFactors.push('Systematic analysis approach provides decision confidence');
    }

    return {
      primaryReasons,
      addressedConcerns,
      confidenceFactors,
      riskMitigations,
      alternativeComparison: alternatives?.length ? {
        alternativeLocation: {
          lat: alternatives[0].lat,
          lng: alternatives[0].lng,
          name: `Alternative location ${alternatives[0].distance}m away`
        },
        whyOriginalIsBetter: ['Original location better aligns with strategic criteria'],
        tradeoffs: ['Accepting current location characteristics over alternative options']
      } : undefined
    };
  }

  private generateBasicComparison(
    originalLocation: Location,
    originalAnalysis: LocationAnalysis,
    alternativeLocation: AlternativeLocation
  ): AlternativeComparison {
    return {
      alternativeLocation: {
        lat: alternativeLocation.lat,
        lng: alternativeLocation.lng,
        name: `Alternative location (${alternativeLocation.distance}m away)`
      },
      whyOriginalIsBetter: [
        'Original location meets established selection criteria',
        'Better alignment with strategic expansion objectives'
      ],
      tradeoffs: [
        'Choosing proven location over potentially higher opportunity alternative'
      ]
    };
  }

  private extractMetric(text: string, pattern: string): number {
    const match = text.match(new RegExp(pattern));
    return match ? parseFloat(match[1]) : 0.5;
  }

  // Cache management methods
  private generateCacheKey(location: Location, analysis: LocationAnalysis): string {
    const analysisHash = this.hashAnalysis(analysis);
    const locationHash = `${location.lat.toFixed(4)}_${location.lng.toFixed(4)}`;
    return `rationale_${locationHash}_${analysisHash}`;
  }

  private hashAnalysis(analysis: LocationAnalysis): string {
    // Simple hash of key analysis metrics including location
    const key = `${analysis.location.lat.toFixed(4)}_${analysis.location.lng.toFixed(4)}_${analysis.intelligence.developmentPotential.toFixed(2)}_${analysis.demographics.marketFitScore.toFixed(2)}_${analysis.viability.commercialViability.score.toFixed(2)}_${analysis.competitive.marketGapOpportunity.toFixed(2)}`;
    return Buffer.from(key).toString('base64').substring(0, 8);
  }

  private getCachedRationale(cacheKey: string): StrategicRationale | null {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(cacheKey);
    }
    return null;
  }

  private cacheRationale(cacheKey: string, rationale: StrategicRationale): void {
    this.cache.set(cacheKey, {
      data: rationale,
      timestamp: Date.now()
    });
  }
}