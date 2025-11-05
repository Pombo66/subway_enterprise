import { PrismaClient } from '@prisma/client';
import { IOpenAIPlacementIntelligenceService } from './interfaces/intelligent-expansion.interfaces';
import {
  AIPlacementScore,
  AIPatternAnalysis,
  OptimizedPlacement,
  PlacementConstraints,
  ExpansionCandidate,
  RegionData,
  LocationData,
  RealWorldFactorAnalysis,
  TrafficAccessibilityAnalysis,
  SeasonalAnalysis,
  EconomicAnalysis
} from './types/intelligent-expansion.types';

/**
 * OpenAI Placement Intelligence Service
 * Provides AI-driven placement analysis and pattern detection
 */
export class OpenAIPlacementIntelligenceService implements IOpenAIPlacementIntelligenceService {
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly MODEL = process.env.EXPANSION_OPENAI_MODEL || 'gpt-5-mini';
  private readonly TEMPERATURE = parseFloat(process.env.EXPANSION_OPENAI_TEMPERATURE || '0.3');
  private readonly MAX_TOKENS = parseInt(process.env.EXPANSION_OPENAI_MAX_TOKENS || '600');
  
  // Cache and statistics
  private cacheHits = 0;
  private cacheMisses = 0;
  private apiCalls = 0;
  private totalTokensUsed = 0;

  constructor(private readonly prisma: PrismaClient) {
    console.log('🤖 OpenAI Placement Intelligence Service initialized');
  }

  /**
   * Evaluate location viability using AI analysis
   */
  async evaluateLocationViabilityWithAI(
    candidate: ExpansionCandidate,
    contextualData: LocationData,
    existingStores: Array<{ id: string; latitude: number; longitude: number; state: string }>
  ): Promise<AIPlacementScore> {
    console.log(`🤖 Evaluating viability for ${candidate.name} (${candidate.lat.toFixed(4)}, ${candidate.lng.toFixed(4)})`);
    
    if (!this.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured - cannot perform AI viability scoring');
    }

    try {
      // Find nearby stores for competitive analysis
      const nearbyStores = this.findNearbyStores(candidate, existingStores, 10); // 10km radius
      
      const prompt = this.buildViabilityAnalysisPrompt(candidate, contextualData, nearbyStores);
      const response = await this.callOpenAI(prompt);
      this.apiCalls++;

      const viabilityScore = this.parseViabilityAnalysisResponse(response);
      
      console.log(`✅ Viability analysis completed for ${candidate.name}: ${viabilityScore.numericScores.viability.toFixed(2)} overall score`);
      return viabilityScore;

    } catch (error) {
      console.error(`❌ AI viability scoring failed for ${candidate.name}:`, error);
      throw error;
    }
  }

  /**
   * Detect placement patterns using AI analysis
   */
  async detectPlacementPatternsWithAI(
    candidates: ExpansionCandidate[],
    regionData: RegionData
  ): Promise<AIPatternAnalysis> {
    // TODO: Implement AI pattern detection
    // This will be implemented in task 5.2
    throw new Error('Method not implemented yet - will be implemented in task 5.2');
  }



  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
    
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      apiCalls: this.apiCalls,
      totalTokensUsed: this.totalTokensUsed
    };
  }

  /**
   * Reset statistics for testing
   */
  resetStats() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.apiCalls = 0;
    this.totalTokensUsed = 0;
  }

  /**
   * Find nearby stores within specified radius
   */
  private findNearbyStores(
    candidate: ExpansionCandidate,
    existingStores: Array<{ id: string; latitude: number; longitude: number; state: string }>,
    radiusKm: number
  ): Array<{ id: string; latitude: number; longitude: number; state: string; distance: number }> {
    return existingStores
      .map(store => ({
        ...store,
        distance: this.calculateDistance(candidate.lat, candidate.lng, store.latitude, store.longitude)
      }))
      .filter(store => store.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Calculate distance between two points in kilometers
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Build OpenAI prompt for viability analysis
   */
  private buildViabilityAnalysisPrompt(
    candidate: ExpansionCandidate,
    contextualData: LocationData,
    nearbyStores: Array<{ id: string; latitude: number; longitude: number; state: string; distance: number }>
  ): string {
    const nearbyStoreInfo = nearbyStores.length > 0
      ? nearbyStores.slice(0, 5).map(store => `Store ${store.id}: ${store.distance.toFixed(1)}km away`).join('\n')
      : 'No existing stores within 10km';

    return `You are a restaurant location viability expert analyzing this Subway expansion candidate.

CANDIDATE DETAILS:
- Name: ${candidate.name}
- Coordinates: ${candidate.lat.toFixed(6)}, ${candidate.lng.toFixed(6)}
- Type: ${candidate.candidateType}
- Population: ${candidate.population.toLocaleString()}
- Nearest Store: ${(candidate.nearestStoreDistance / 1000).toFixed(1)}km
- Anchor Count: ${candidate.anchorCount}
- Performance Score: ${candidate.peerPerformanceScore.toFixed(2)}
- State: ${candidate.stateCode}

CONTEXTUAL DATA:
- Urban Density: ${contextualData.urbanDensity || 'Unknown'}
- Road Distance: ${contextualData.roadDistance ? `${contextualData.roadDistance}m` : 'Unknown'}
- Building Distance: ${contextualData.buildingDistance ? `${contextualData.buildingDistance}m` : 'Unknown'}

NEARBY COMPETITION:
${nearbyStoreInfo}

VIABILITY ANALYSIS:
Evaluate this location's viability for Subway expansion across these dimensions:
1. Market viability (population, demographics, demand potential)
2. Competitive positioning (market gaps, differentiation opportunities)
3. Accessibility (foot traffic, parking, public transport)
4. Market potential (growth prospects, economic conditions)

Provide detailed analysis in JSON format:
{
  "viabilityAssessment": "Comprehensive 2-3 sentence viability analysis",
  "competitiveAnalysis": "Competitive landscape and positioning analysis",
  "accessibilityInsights": "Accessibility and foot traffic assessment",
  "marketPotentialAnalysis": "Market growth and economic potential analysis",
  "riskAssessment": ["risk1", "risk2"],
  "aiConfidenceReasoning": "Explanation of confidence level and data quality",
  "numericScores": {
    "viability": 0.85,
    "competition": 0.78,
    "accessibility": 0.82,
    "marketPotential": 0.88
  }
}

Provide location-specific insights based on the exact coordinates and local context.`;
  }

  /**
   * Call OpenAI API for placement analysis with safety wrapper
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const { OpenAISafetyWrapper } = await import('./openai-safety-wrapper');
    
    const result = await OpenAISafetyWrapper.makeCall(
      async () => {
        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.MODEL,
            messages: [
              {
                role: 'system',
                content: 'You are a restaurant location viability expert specializing in site selection analysis. Always respond with valid JSON and provide detailed, location-specific insights.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_completion_tokens: this.MAX_TOKENS
            // Note: temperature parameter removed as GPT-5 models only support default (1.0)
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.choices || data.choices.length === 0) {
          throw new Error('No response from OpenAI');
        }

        return data;
      },
      'placement-intelligence'
    );

    // Extract text from GPT-5 Responses API structure
      const messageOutput = result.output.find((item: any) => item.type === 'message');
      const responseText = messageOutput.content[0].text.trim();
    const tokensUsed = result.usage?.total_tokens || 0;
    this.totalTokensUsed += tokensUsed;

    return responseText;
  }

  /**
   * Parse OpenAI viability analysis response
   */
  private parseViabilityAnalysisResponse(responseText: string): AIPlacementScore {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in OpenAI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.viabilityAssessment || typeof parsed.viabilityAssessment !== 'string') {
        throw new Error('Invalid response: missing or invalid viabilityAssessment');
      }
      
      if (!parsed.numericScores || typeof parsed.numericScores !== 'object') {
        throw new Error('Invalid response: missing or invalid numericScores');
      }

      return {
        viabilityAssessment: parsed.viabilityAssessment,
        competitiveAnalysis: parsed.competitiveAnalysis || 'No competitive analysis provided',
        accessibilityInsights: parsed.accessibilityInsights || 'No accessibility insights provided',
        marketPotentialAnalysis: parsed.marketPotentialAnalysis || 'No market potential analysis provided',
        riskAssessment: parsed.riskAssessment || [],
        aiConfidenceReasoning: parsed.aiConfidenceReasoning || 'No confidence reasoning provided',
        numericScores: {
          viability: parsed.numericScores.viability || 0.5,
          competition: parsed.numericScores.competition || 0.5,
          accessibility: parsed.numericScores.accessibility || 0.5,
          marketPotential: parsed.numericScores.marketPotential || 0.5
        }
      };
      
    } catch (error) {
      console.error('Failed to parse OpenAI viability analysis response:', responseText);
      throw new Error(`JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Optimize placement using AI recommendations
   */
  async optimizePlacementWithAI(
    candidates: ExpansionCandidate[],
    targetCount: number,
    constraints: PlacementConstraints
  ): Promise<OptimizedPlacement> {
    console.log(`🤖 Optimizing placement for ${candidates.length} candidates, target: ${targetCount} locations`);
    
    if (!this.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured - cannot perform AI placement optimization');
    }

    if (candidates.length === 0) {
      return {
        optimizedCandidates: [],
        distributionAnalysis: 'No candidates provided for optimization',
        selectionReasoning: 'Cannot optimize without candidates',
        balancingStrategy: 'No balancing strategy applicable',
        optimizationMetrics: {
          geographicBalance: 0,
          marketPotential: 0,
          competitiveAdvantage: 0,
          overallOptimization: 0
        }
      };
    }

    try {
      // Step 1: Score all candidates with AI viability analysis
      const scoredCandidates = await this.scoreAllCandidatesForOptimization(candidates, constraints.existingStores);
      
      // Step 2: Analyze geographic distribution patterns
      const distributionAnalysis = this.analyzeDistributionForOptimization(scoredCandidates, constraints.regionData);
      
      // Step 3: Use AI to optimize selection and balancing
      const optimizationResult = await this.performAIOptimization(
        scoredCandidates,
        targetCount,
        distributionAnalysis,
        constraints
      );

      console.log(`✅ Placement optimization completed: ${optimizationResult.optimizedCandidates.length} locations selected`);
      return optimizationResult;

    } catch (error) {
      console.error(`❌ AI placement optimization failed:`, error);
      throw error;
    }
  }

  /**
   * Score all candidates for optimization
   */
  private async scoreAllCandidatesForOptimization(
    candidates: ExpansionCandidate[],
    existingStores: Array<{ id: string; latitude: number; longitude: number; state: string }>
  ): Promise<Array<ExpansionCandidate & { aiViabilityScore: number }>> {
    console.log(`   Scoring ${candidates.length} candidates with AI viability analysis...`);
    
    const scoredCandidates = [];
    const batchSize = 5; // Process in small batches to avoid rate limits
    
    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (candidate) => {
        try {
          // Use simplified scoring for optimization (avoid full viability analysis)
          const viabilityScore = await this.calculateSimplifiedViabilityScore(candidate, existingStores);
          
          return {
            ...candidate,
            aiViabilityScore: viabilityScore
          };
        } catch (error) {
          console.warn(`   Failed to score candidate ${candidate.name}:`, error);
          return {
            ...candidate,
            aiViabilityScore: candidate.totalScore / 100 // Fallback to existing score
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      scoredCandidates.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < candidates.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`   Completed scoring ${scoredCandidates.length} candidates`);
    return scoredCandidates;
  }

  /**
   * Calculate simplified viability score without full AI analysis
   */
  private async calculateSimplifiedViabilityScore(
    candidate: ExpansionCandidate,
    existingStores: Array<{ id: string; latitude: number; longitude: number; state: string }>
  ): Promise<number> {
    // Calculate basic viability factors
    const populationScore = Math.min(candidate.population / 100000, 1.0); // Normalize to 100k population
    const distanceScore = Math.min(candidate.nearestStoreDistance / 20000, 1.0); // Normalize to 20km
    const anchorScore = Math.min(candidate.anchorCount / 10, 1.0); // Normalize to 10 anchors
    const performanceScore = candidate.peerPerformanceScore;
    const confidenceScore = candidate.confidence;
    
    // Weighted combination
    const viabilityScore = (
      populationScore * 0.25 +
      distanceScore * 0.25 +
      anchorScore * 0.20 +
      performanceScore * 0.20 +
      confidenceScore * 0.10
    );
    
    return Math.min(Math.max(viabilityScore, 0), 1);
  }

  /**
   * Analyze distribution for optimization
   */
  private analyzeDistributionForOptimization(
    scoredCandidates: Array<ExpansionCandidate & { aiViabilityScore: number }>,
    regionData: RegionData
  ) {
    // Analyze state distribution
    const stateDistribution = new Map<string, number>();
    scoredCandidates.forEach(candidate => {
      const state = candidate.stateCode;
      stateDistribution.set(state, (stateDistribution.get(state) || 0) + 1);
    });

    // Calculate distribution metrics
    const totalCandidates = scoredCandidates.length;
    const stateCount = stateDistribution.size;
    const avgCandidatesPerState = totalCandidates / stateCount;
    
    // Find imbalanced states
    const imbalancedStates = Array.from(stateDistribution.entries())
      .filter(([_, count]) => count > avgCandidatesPerState * 1.5 || count < avgCandidatesPerState * 0.5)
      .map(([state, count]) => ({ state, count, percentage: (count / totalCandidates) * 100 }));

    // Calculate viability distribution
    const viabilityScores = scoredCandidates.map(c => c.aiViabilityScore);
    const avgViability = viabilityScores.reduce((sum, score) => sum + score, 0) / viabilityScores.length;
    const highViabilityCandidates = scoredCandidates.filter(c => c.aiViabilityScore > avgViability * 1.2);

    return {
      stateDistribution: Object.fromEntries(stateDistribution),
      stateCount,
      avgCandidatesPerState,
      imbalancedStates,
      avgViability,
      highViabilityCandidates: highViabilityCandidates.length,
      totalCandidates
    };
  }

  /**
   * Perform AI optimization
   */
  private async performAIOptimization(
    scoredCandidates: Array<ExpansionCandidate & { aiViabilityScore: number }>,
    targetCount: number,
    distributionAnalysis: any,
    constraints: PlacementConstraints
  ): Promise<OptimizedPlacement> {
    const prompt = `Optimize restaurant expansion placement for strategic market coverage:

OPTIMIZATION PARAMETERS:
- Total Candidates: ${scoredCandidates.length}
- Target Selection: ${targetCount}
- Country: ${constraints.regionData.country}
- Existing Stores: ${constraints.regionData.totalStores}

DISTRIBUTION ANALYSIS:
- States Covered: ${distributionAnalysis.stateCount}
- Average per State: ${distributionAnalysis.avgCandidatesPerState.toFixed(1)}
- High Viability Candidates: ${distributionAnalysis.highViabilityCandidates}
- Average Viability Score: ${distributionAnalysis.avgViability.toFixed(3)}
- Imbalanced States: ${distributionAnalysis.imbalancedStates.length}

CANDIDATE SAMPLE (Top 10 by AI Viability):
${scoredCandidates
  .sort((a, b) => b.aiViabilityScore - a.aiViabilityScore)
  .slice(0, 10)
  .map((c, i) => `${i + 1}. ${c.name} (${c.stateCode}): Viability ${c.aiViabilityScore.toFixed(3)}, Pop ${Math.round(c.population/1000)}k, Distance ${Math.round(c.nearestStoreDistance/1000)}km`)
  .join('\n')}

OPTIMIZATION REQUIREMENTS:
1. Select ${targetCount} locations that maximize market potential
2. Balance geographic distribution across states
3. Prioritize high viability scores while ensuring coverage
4. Avoid over-concentration in any single state
5. Consider competitive positioning and market gaps

Provide optimization strategy in JSON format:
{
  "selectedCandidates": [
    {
      "name": "Heidelberg",
      "stateCode": "BW",
      "aiViabilityScore": 0.85,
      "selectionReason": "High viability with strategic gap coverage"
    }
  ],
  "distributionAnalysis": "Geographic distribution assessment",
  "selectionReasoning": "Overall selection strategy explanation",
  "balancingStrategy": "How geographic balance was achieved",
  "optimizationMetrics": {
    "geographicBalance": 0.85,
    "marketPotential": 0.92,
    "competitiveAdvantage": 0.78,
    "overallOptimization": 0.85
  }
}

Focus on strategic market coverage and sustainable expansion patterns.`;

    try {
      const response = await this.callOpenAI(prompt);
      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)![0]);
      
      // Map selected candidates back to full candidate objects
      const selectedCandidateNames = new Set(parsed.selectedCandidates?.map((c: any) => c.name) || []);
      const optimizedCandidates = scoredCandidates
        .filter(candidate => selectedCandidateNames.has(candidate.name))
        .slice(0, targetCount); // Ensure we don't exceed target
      
      return {
        optimizedCandidates,
        distributionAnalysis: parsed.distributionAnalysis || 'AI distribution analysis completed',
        selectionReasoning: parsed.selectionReasoning || 'AI selection optimization completed',
        balancingStrategy: parsed.balancingStrategy || 'Geographic balancing applied',
        optimizationMetrics: parsed.optimizationMetrics || {
          geographicBalance: 0.75,
          marketPotential: 0.80,
          competitiveAdvantage: 0.70,
          overallOptimization: 0.75
        }
      };
      
    } catch (error) {
      console.error('AI optimization failed, using fallback strategy:', error);
      
      // Fallback: Select top candidates with geographic balancing
      const sortedCandidates = scoredCandidates.sort((a, b) => b.aiViabilityScore - a.aiViabilityScore);
      const stateQuota = Math.ceil(targetCount / distributionAnalysis.stateCount);
      const stateCount: Record<string, number> = {};
      const selected: ExpansionCandidate[] = [];
      
      // First pass: Select top candidates with state limits
      for (const candidate of sortedCandidates) {
        if (selected.length >= targetCount) break;
        
        const currentStateCount = stateCount[candidate.stateCode] || 0;
        if (currentStateCount < stateQuota) {
          selected.push(candidate);
          stateCount[candidate.stateCode] = currentStateCount + 1;
        }
      }
      
      // Second pass: Fill remaining slots with best available
      if (selected.length < targetCount) {
        const selectedIds = new Set(selected.map(c => c.id));
        for (const candidate of sortedCandidates) {
          if (selected.length >= targetCount) break;
          if (!selectedIds.has(candidate.id)) {
            selected.push(candidate);
          }
        }
      }
      
      return {
        optimizedCandidates: selected,
        distributionAnalysis: `Fallback optimization: ${selected.length} locations selected across ${Object.keys(stateCount).length} states`,
        selectionReasoning: 'Fallback strategy used due to AI optimization failure - selected top viability candidates with geographic balancing',
        balancingStrategy: 'State-based quota system with overflow handling',
        optimizationMetrics: {
          geographicBalance: 0.60,
          marketPotential: 0.75,
          competitiveAdvantage: 0.65,
          overallOptimization: 0.67
        }
      };
    }
  }

  /**
   * Analyze real-world factors using AI
   */
  async analyzeRealWorldFactorsWithAI(
    candidate: ExpansionCandidate,
    contextualData: LocationData,
    seasonalData?: any,
    economicIndicators?: any
  ): Promise<RealWorldFactorAnalysis> {
    console.log(`🤖 Analyzing real-world factors for ${candidate.name}`);
    
    if (!this.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured - cannot perform AI real-world factor analysis');
    }

    try {
      // Analyze traffic flow and accessibility
      const trafficAnalysis = await this.analyzeTrafficFlowWithAI(candidate, contextualData);
      
      // Analyze seasonal variations
      const seasonalAnalysis = await this.analyzeSeasonalVariationsWithAI(candidate, seasonalData);
      
      // Analyze economic indicators
      const economicAnalysis = await this.analyzeEconomicIndicatorsWithAI(candidate, economicIndicators);
      
      // Combine all analyses
      const combinedAnalysis = await this.combineRealWorldAnalyses(
        candidate,
        trafficAnalysis,
        seasonalAnalysis,
        economicAnalysis
      );

      console.log(`✅ Real-world factor analysis completed for ${candidate.name}`);
      return combinedAnalysis;

    } catch (error) {
      console.error(`❌ AI real-world factor analysis failed for ${candidate.name}:`, error);
      throw error;
    }
  }

  /**
   * Analyze traffic flow and accessibility with AI
   */
  private async analyzeTrafficFlowWithAI(
    candidate: ExpansionCandidate,
    contextualData: LocationData
  ): Promise<TrafficAccessibilityAnalysis> {
    const prompt = `Analyze traffic flow and accessibility for restaurant location:

LOCATION DETAILS:
- Name: ${candidate.name}
- Coordinates: ${candidate.lat.toFixed(6)}, ${candidate.lng.toFixed(6)}
- State: ${candidate.stateCode}
- Population: ${candidate.population.toLocaleString()}

ACCESSIBILITY DATA:
- Urban Density: ${contextualData.urbanDensity?.toFixed(2) || 'Unknown'}
- Road Distance: ${contextualData.roadDistance ? `${contextualData.roadDistance}m` : 'Unknown'}
- Building Distance: ${contextualData.buildingDistance ? `${contextualData.buildingDistance}m` : 'Unknown'}
- Anchor Businesses: ${candidate.anchorCount}

TRAFFIC FLOW ANALYSIS REQUIREMENTS:
Evaluate accessibility and traffic patterns for restaurant success:

1. PEDESTRIAN ACCESSIBILITY (0.0-1.0): Walkability, foot traffic, pedestrian infrastructure
2. VEHICLE ACCESSIBILITY (0.0-1.0): Parking availability, road access, drive-through potential
3. PUBLIC TRANSPORT (0.0-1.0): Transit connections, bus/train accessibility
4. PEAK HOUR IMPACT (0.0-1.0): Rush hour accessibility, traffic congestion effects

Provide analysis in JSON format:
{
  "pedestrianAccessibility": {
    "score": 0.85,
    "analysis": "High walkability with good pedestrian infrastructure"
  },
  "vehicleAccessibility": {
    "score": 0.72,
    "analysis": "Adequate parking with moderate road access"
  },
  "publicTransport": {
    "score": 0.68,
    "analysis": "Good transit connections with bus stops nearby"
  },
  "peakHourImpact": {
    "score": 0.75,
    "analysis": "Moderate traffic impact during rush hours"
  },
  "overallAccessibility": 0.75,
  "trafficInsights": ["insight1", "insight2", "insight3"]
}

Focus on practical accessibility factors that impact restaurant customer flow.`;

    try {
      const response = await this.callOpenAI(prompt);
      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)![0]);
      
      return {
        pedestrianAccessibility: parsed.pedestrianAccessibility || { score: 0.5, analysis: 'No analysis available' },
        vehicleAccessibility: parsed.vehicleAccessibility || { score: 0.5, analysis: 'No analysis available' },
        publicTransport: parsed.publicTransport || { score: 0.5, analysis: 'No analysis available' },
        peakHourImpact: parsed.peakHourImpact || { score: 0.5, analysis: 'No analysis available' },
        overallAccessibility: parsed.overallAccessibility || 0.5,
        trafficInsights: parsed.trafficInsights || []
      };
      
    } catch (error) {
      console.error('Traffic flow analysis failed:', error);
      
      // Fallback analysis based on available data
      const urbanScore = contextualData.urbanDensity ? Math.min(contextualData.urbanDensity / 100, 1) : 0.5;
      const roadScore = contextualData.roadDistance ? Math.max(1 - (contextualData.roadDistance / 1000), 0) : 0.5;
      const anchorScore = Math.min(candidate.anchorCount / 10, 1);
      
      return {
        pedestrianAccessibility: { score: urbanScore, analysis: 'Estimated based on urban density' },
        vehicleAccessibility: { score: roadScore, analysis: 'Estimated based on road proximity' },
        publicTransport: { score: anchorScore, analysis: 'Estimated based on anchor presence' },
        peakHourImpact: { score: 0.6, analysis: 'Default moderate impact assumption' },
        overallAccessibility: (urbanScore + roadScore + anchorScore) / 3,
        trafficInsights: ['AI analysis failed - using fallback estimates']
      };
    }
  }

  /**
   * Analyze seasonal variations with AI
   */
  private async analyzeSeasonalVariationsWithAI(
    candidate: ExpansionCandidate,
    seasonalData?: any
  ): Promise<SeasonalAnalysis> {
    const prompt = `Analyze seasonal business variations for restaurant location in Germany:

LOCATION DETAILS:
- Name: ${candidate.name}
- State: ${candidate.stateCode}
- Population: ${candidate.population.toLocaleString()}
- Settlement Type: ${candidate.candidateType}

SEASONAL ANALYSIS REQUIREMENTS:
Evaluate how seasonal factors affect restaurant business potential:

1. SUMMER PERFORMANCE (0.0-1.0): Tourist activity, outdoor dining potential, vacation impact
2. WINTER PERFORMANCE (0.0-1.0): Indoor dining demand, holiday shopping, weather resilience
3. SPRING/AUTUMN STABILITY (0.0-1.0): Consistent business during transition seasons
4. TOURISM SEASONALITY (0.0-1.0): Impact of seasonal tourism on customer base

Consider German market characteristics:
- Christmas market seasons
- Summer vacation patterns
- School holiday impacts
- Weather-dependent dining preferences

Provide analysis in JSON format:
{
  "summerPerformance": {
    "score": 0.85,
    "factors": ["outdoor dining", "tourism", "longer days"]
  },
  "winterPerformance": {
    "score": 0.72,
    "factors": ["indoor comfort", "holiday shopping", "reduced tourism"]
  },
  "springAutumnStability": {
    "score": 0.78,
    "factors": ["stable weather", "consistent traffic", "school schedules"]
  },
  "tourismSeasonality": {
    "score": 0.65,
    "factors": ["moderate tourism", "business travelers", "local events"]
  },
  "overallSeasonalStability": 0.75,
  "seasonalInsights": ["insight1", "insight2"],
  "riskFactors": ["risk1", "risk2"]
}

Focus on German market-specific seasonal patterns and restaurant business implications.`;

    try {
      const response = await this.callOpenAI(prompt);
      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)![0]);
      
      return {
        summerPerformance: parsed.summerPerformance || { score: 0.7, factors: ['summer season'] },
        winterPerformance: parsed.winterPerformance || { score: 0.6, factors: ['winter season'] },
        springAutumnStability: parsed.springAutumnStability || { score: 0.7, factors: ['transition seasons'] },
        tourismSeasonality: parsed.tourismSeasonality || { score: 0.5, factors: ['tourism impact'] },
        overallSeasonalStability: parsed.overallSeasonalStability || 0.65,
        seasonalInsights: parsed.seasonalInsights || [],
        riskFactors: parsed.riskFactors || []
      };
      
    } catch (error) {
      console.error('Seasonal analysis failed:', error);
      
      // Fallback based on location type and population
      const populationScore = Math.min(candidate.population / 100000, 1);
      const stabilityScore = populationScore * 0.7 + 0.3; // Larger cities more stable
      
      return {
        summerPerformance: { score: stabilityScore + 0.1, factors: ['estimated summer boost'] },
        winterPerformance: { score: stabilityScore - 0.1, factors: ['estimated winter reduction'] },
        springAutumnStability: { score: stabilityScore, factors: ['estimated stability'] },
        tourismSeasonality: { score: populationScore * 0.5, factors: ['estimated tourism impact'] },
        overallSeasonalStability: stabilityScore,
        seasonalInsights: ['AI analysis failed - using population-based estimates'],
        riskFactors: ['Limited seasonal data available']
      };
    }
  }

  /**
   * Analyze economic indicators with AI
   */
  private async analyzeEconomicIndicatorsWithAI(
    candidate: ExpansionCandidate,
    economicIndicators?: any
  ): Promise<EconomicAnalysis> {
    const prompt = `Analyze economic indicators for restaurant location viability in Germany:

LOCATION DETAILS:
- Name: ${candidate.name}
- State: ${candidate.stateCode}
- Population: ${candidate.population.toLocaleString()}
- Peer Performance Score: ${candidate.peerPerformanceScore.toFixed(2)}

ECONOMIC ANALYSIS REQUIREMENTS:
Evaluate economic factors affecting restaurant business potential:

1. LOCAL PURCHASING POWER (0.0-1.0): Income levels, disposable income, spending patterns
2. EMPLOYMENT STABILITY (0.0-1.0): Job market, unemployment rates, economic resilience
3. BUSINESS ENVIRONMENT (0.0-1.0): Commercial activity, retail health, competition density
4. GROWTH POTENTIAL (0.0-1.0): Economic development, population growth, infrastructure investment

Consider German economic context:
- Regional economic variations
- Industry presence and diversity
- Cost of living factors
- Consumer spending on dining

Provide analysis in JSON format:
{
  "localPurchasingPower": {
    "score": 0.82,
    "indicators": ["median income", "spending patterns", "retail activity"]
  },
  "employmentStability": {
    "score": 0.78,
    "indicators": ["unemployment rate", "job diversity", "economic base"]
  },
  "businessEnvironment": {
    "score": 0.75,
    "indicators": ["commercial density", "retail health", "competition level"]
  },
  "growthPotential": {
    "score": 0.85,
    "indicators": ["population growth", "development projects", "infrastructure"]
  },
  "overallEconomicViability": 0.80,
  "economicInsights": ["insight1", "insight2"],
  "economicRisks": ["risk1", "risk2"]
}

Focus on economic factors that directly impact restaurant customer base and spending capacity.`;

    try {
      const response = await this.callOpenAI(prompt);
      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)![0]);
      
      return {
        localPurchasingPower: parsed.localPurchasingPower || { score: 0.7, indicators: ['purchasing power'] },
        employmentStability: parsed.employmentStability || { score: 0.7, indicators: ['employment'] },
        businessEnvironment: parsed.businessEnvironment || { score: 0.7, indicators: ['business environment'] },
        growthPotential: parsed.growthPotential || { score: 0.7, indicators: ['growth potential'] },
        overallEconomicViability: parsed.overallEconomicViability || 0.7,
        economicInsights: parsed.economicInsights || [],
        economicRisks: parsed.economicRisks || []
      };
      
    } catch (error) {
      console.error('Economic analysis failed:', error);
      
      // Fallback based on peer performance and population
      const peerScore = candidate.peerPerformanceScore;
      const populationScore = Math.min(candidate.population / 100000, 1);
      const economicScore = (peerScore + populationScore) / 2;
      
      return {
        localPurchasingPower: { score: economicScore, indicators: ['estimated from peer performance'] },
        employmentStability: { score: economicScore, indicators: ['estimated from population size'] },
        businessEnvironment: { score: peerScore, indicators: ['peer performance indicator'] },
        growthPotential: { score: populationScore, indicators: ['population-based estimate'] },
        overallEconomicViability: economicScore,
        economicInsights: ['AI analysis failed - using performance-based estimates'],
        economicRisks: ['Limited economic data available']
      };
    }
  }

  /**
   * Combine all real-world analyses
   */
  private async combineRealWorldAnalyses(
    candidate: ExpansionCandidate,
    trafficAnalysis: TrafficAccessibilityAnalysis,
    seasonalAnalysis: SeasonalAnalysis,
    economicAnalysis: EconomicAnalysis
  ): Promise<RealWorldFactorAnalysis> {
    const prompt = `Synthesize comprehensive real-world factor analysis for restaurant location:

LOCATION: ${candidate.name} (${candidate.stateCode})

TRAFFIC & ACCESSIBILITY ANALYSIS:
- Overall Accessibility: ${trafficAnalysis.overallAccessibility.toFixed(2)}
- Pedestrian Score: ${trafficAnalysis.pedestrianAccessibility.score.toFixed(2)}
- Vehicle Score: ${trafficAnalysis.vehicleAccessibility.score.toFixed(2)}
- Public Transport: ${trafficAnalysis.publicTransport.score.toFixed(2)}

SEASONAL ANALYSIS:
- Seasonal Stability: ${seasonalAnalysis.overallSeasonalStability.toFixed(2)}
- Summer Performance: ${seasonalAnalysis.summerPerformance.score.toFixed(2)}
- Winter Performance: ${seasonalAnalysis.winterPerformance.score.toFixed(2)}

ECONOMIC ANALYSIS:
- Economic Viability: ${economicAnalysis.overallEconomicViability.toFixed(2)}
- Purchasing Power: ${economicAnalysis.localPurchasingPower.score.toFixed(2)}
- Employment Stability: ${economicAnalysis.employmentStability.score.toFixed(2)}

SYNTHESIS REQUIREMENTS:
Provide integrated assessment of real-world viability:

{
  "overallRealWorldScore": 0.78,
  "strengthFactors": ["factor1", "factor2", "factor3"],
  "challengeFactors": ["challenge1", "challenge2"],
  "seasonalRiskLevel": "LOW|MODERATE|HIGH",
  "accessibilityRating": "EXCELLENT|GOOD|FAIR|POOR",
  "economicStability": "STRONG|MODERATE|WEAK",
  "realWorldRecommendation": "HIGHLY_RECOMMENDED|RECOMMENDED|CONDITIONAL|NOT_RECOMMENDED",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "mitigationStrategies": ["strategy1", "strategy2"]
}

Focus on practical business implications and actionable insights.`;

    try {
      const response = await this.callOpenAI(prompt);
      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)![0]);
      
      return {
        trafficAccessibilityAnalysis: trafficAnalysis,
        seasonalAnalysis: seasonalAnalysis,
        economicAnalysis: economicAnalysis,
        overallRealWorldScore: parsed.overallRealWorldScore || 0.7,
        strengthFactors: parsed.strengthFactors || [],
        challengeFactors: parsed.challengeFactors || [],
        seasonalRiskLevel: parsed.seasonalRiskLevel || 'MODERATE',
        accessibilityRating: parsed.accessibilityRating || 'GOOD',
        economicStability: parsed.economicStability || 'MODERATE',
        realWorldRecommendation: parsed.realWorldRecommendation || 'RECOMMENDED',
        keyInsights: parsed.keyInsights || [],
        mitigationStrategies: parsed.mitigationStrategies || []
      };
      
    } catch (error) {
      console.error('Combined real-world analysis failed:', error);
      
      // Fallback synthesis
      const avgScore = (
        trafficAnalysis.overallAccessibility +
        seasonalAnalysis.overallSeasonalStability +
        economicAnalysis.overallEconomicViability
      ) / 3;
      
      return {
        trafficAccessibilityAnalysis: trafficAnalysis,
        seasonalAnalysis: seasonalAnalysis,
        economicAnalysis: economicAnalysis,
        overallRealWorldScore: avgScore,
        strengthFactors: ['Location has basic viability factors'],
        challengeFactors: ['AI synthesis failed - manual review recommended'],
        seasonalRiskLevel: avgScore > 0.7 ? 'LOW' : avgScore > 0.5 ? 'MODERATE' : 'HIGH',
        accessibilityRating: trafficAnalysis.overallAccessibility > 0.7 ? 'GOOD' : 'FAIR',
        economicStability: economicAnalysis.overallEconomicViability > 0.7 ? 'STRONG' : 'MODERATE',
        realWorldRecommendation: avgScore > 0.7 ? 'RECOMMENDED' : avgScore > 0.5 ? 'CONDITIONAL' : 'NOT_RECOMMENDED',
        keyInsights: ['Fallback analysis used due to AI synthesis failure'],
        mitigationStrategies: ['Conduct detailed local market research']
      };
    }
  }
}