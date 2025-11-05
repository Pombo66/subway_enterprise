import { PrismaClient } from '@prisma/client';
import { IOpenAIExpansionIntensityService } from './interfaces/intelligent-expansion.interfaces';
import {
  AIRankedLocations,
  IntensityOptimizedSelection,
  SaturationAnalysis,
  ExpansionIntensity,
  ExpansionCandidate,
  RegionData,
  MarketConditions,
  GeographicConstraints,
  LocationRanking
} from './types/intelligent-expansion.types';

/**
 * OpenAI Expansion Intensity Service
 * Provides AI-driven intensity scaling and market potential analysis
 */
export class OpenAIExpansionIntensityService implements IOpenAIExpansionIntensityService {
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly MODEL = process.env.EXPANSION_OPENAI_MODEL || 'gpt-5-mini';
  private readonly TEMPERATURE = parseFloat(process.env.EXPANSION_OPENAI_TEMPERATURE || '0.3');
  private readonly MAX_TOKENS = parseInt(process.env.EXPANSION_OPENAI_MAX_TOKENS || '800');
  
  // Cache and statistics
  private cacheHits = 0;
  private cacheMisses = 0;
  private apiCalls = 0;
  private totalTokensUsed = 0;

  constructor(private readonly prisma: PrismaClient) {
    console.log('🤖 OpenAI Expansion Intensity Service initialized');
  }

  /**
   * Get intensity configuration for a given level
   */
  private getIntensityConfiguration(intensityLevel: ExpansionIntensity): { targetCount: number } {
    const configurations = {
      [ExpansionIntensity.LIGHT]: { targetCount: 50 },
      [ExpansionIntensity.MODERATE]: { targetCount: 100 },
      [ExpansionIntensity.MEDIUM]: { targetCount: 150 },
      [ExpansionIntensity.HIGH]: { targetCount: 200 },
      [ExpansionIntensity.VERY_HIGH]: { targetCount: 250 },
      [ExpansionIntensity.AGGRESSIVE]: { targetCount: 300 }
    };
    
    return configurations[intensityLevel] || { targetCount: 100 };
  }

  /**
   * Rank locations by market potential using AI analysis
   */
  async rankLocationsByPotentialWithAI(
    allCandidates: ExpansionCandidate[],
    regionData: RegionData,
    marketConditions: MarketConditions
  ): Promise<AIRankedLocations> {
    console.log(`🤖 Ranking ${allCandidates.length} locations by market potential using AI`);
    
    if (!this.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured - cannot perform AI market potential ranking');
    }

    if (allCandidates.length === 0) {
      return {
        totalAnalyzed: 0,
        highPotentialCount: 0,
        rankings: [],
        marketInsights: ['No candidates provided for analysis'],
        saturationWarnings: []
      };
    }

    try {
      // Process candidates in batches to avoid token limits
      const batchSize = 20; // Analyze 20 candidates at a time
      const allRankings: LocationRanking[] = [];
      
      for (let i = 0; i < allCandidates.length; i += batchSize) {
        const batch = allCandidates.slice(i, i + batchSize);
        console.log(`   Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allCandidates.length / batchSize)} (${batch.length} candidates)`);
        
        const batchRankings = await this.rankCandidateBatch(batch, regionData, marketConditions);
        allRankings.push(...batchRankings);
      }

      // Sort all rankings by AI potential score
      allRankings.sort((a, b) => b.aiPotentialScore - a.aiPotentialScore);
      
      // Assign final rankings
      allRankings.forEach((ranking, index) => {
        ranking.aiRanking = index + 1;
      });

      // Analyze overall market insights
      const marketInsights = await this.generateMarketInsights(allRankings, regionData);
      const saturationWarnings = this.identifySaturationWarnings(allRankings, regionData);
      
      // Count high potential locations (top 30% or score > 0.7)
      const highPotentialThreshold = Math.max(0.7, allRankings[Math.floor(allRankings.length * 0.3)]?.aiPotentialScore || 0.7);
      const highPotentialCount = allRankings.filter(r => r.aiPotentialScore >= highPotentialThreshold).length;

      console.log(`✅ Market potential ranking completed: ${highPotentialCount}/${allRankings.length} high-potential locations identified`);

      return {
        totalAnalyzed: allCandidates.length,
        highPotentialCount,
        rankings: allRankings,
        marketInsights,
        saturationWarnings
      };

    } catch (error) {
      console.error(`❌ AI market potential ranking failed:`, error);
      throw error;
    }
  }

  /**
   * Select optimal locations for specific intensity level
   */
  async selectOptimalLocationsForIntensity(
    rankedLocations: AIRankedLocations,
    intensityLevel: ExpansionIntensity,
    geographicConstraints: GeographicConstraints
  ): Promise<IntensityOptimizedSelection> {
    // Get the target count for this intensity level
    const intensityConfig = this.getIntensityConfiguration(intensityLevel);
    console.log(`🤖 Selecting optimal locations for ${intensityLevel} intensity level (${intensityConfig.targetCount} stores)`);
    
    if (!this.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured - cannot perform AI intensity optimization');
    }

    if (rankedLocations.rankings.length === 0) {
      return {
        selectedLocations: [],
        intensityLevel,
        selectionReasoning: 'No locations available for selection',
        alternativesAvailable: 0,
        geographicDistribution: {},
        aiOptimizationInsights: ['No candidates to analyze']
      };
    }

    try {
      // Step 1: Apply geographic constraints and balancing
      const geographicallyBalanced = await this.applyGeographicBalancing(
        rankedLocations.rankings,
        intensityLevel,
        geographicConstraints
      );

      // Step 2: Use AI to optimize final selection
      const aiOptimizedSelection = await this.optimizeSelectionWithAI(
        geographicallyBalanced,
        intensityLevel,
        geographicConstraints
      );

      // Step 3: Calculate geographic distribution
      const geographicDistribution = this.calculateGeographicDistribution(aiOptimizedSelection);

      // Step 4: Generate AI insights about the selection
      const aiOptimizationInsights = await this.generateSelectionInsights(
        aiOptimizedSelection,
        rankedLocations.rankings,
        intensityLevel
      );

      const alternativesAvailable = Math.max(0, rankedLocations.rankings.length - aiOptimizedSelection.length);

      console.log(`✅ Intensity optimization completed: Selected ${aiOptimizedSelection.length}/${intensityConfig.targetCount} locations with ${alternativesAvailable} alternatives available`);

      return {
        selectedLocations: aiOptimizedSelection,
        intensityLevel,
        selectionReasoning: `AI-optimized selection for ${intensityLevel} intensity level with geographic balancing`,
        alternativesAvailable,
        geographicDistribution,
        aiOptimizationInsights
      };

    } catch (error) {
      console.error('🚨 [AI Service Error] Intensity optimization failed:', {
        service: 'OpenAIExpansionIntensityService',
        operation: 'selectOptimalLocationsForIntensity',
        intensityLevel: intensityLevel,
        candidatesCount: rankedLocations.rankings.length,
        targetCount: intensityConfig.targetCount,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        apiCalls: this.apiCalls,
        fallbackStrategy: 'top-N selection'
      });
      
      // Fallback to simple top-N selection
      const fallbackConfig = this.getIntensityConfiguration(intensityLevel);
      const fallbackSelection = rankedLocations.rankings.slice(0, fallbackConfig.targetCount);
      return {
        selectedLocations: fallbackSelection,
        intensityLevel,
        selectionReasoning: 'Fallback selection due to AI optimization failure',
        alternativesAvailable: Math.max(0, rankedLocations.rankings.length - fallbackSelection.length),
        geographicDistribution: this.calculateGeographicDistribution(fallbackSelection),
        aiOptimizationInsights: ['AI optimization failed, using top-ranked locations']
      };
    }
  }

  /**
   * Analyze market saturation using AI
   */
  async analyzeMarketSaturationWithAI(
    highPotentialLocations: ExpansionCandidate[],
    existingStores: Array<{ id: string; latitude: number; longitude: number; state: string }>,
    targetIntensity: ExpansionIntensity
  ): Promise<SaturationAnalysis> {
    console.log(`🤖 Analyzing market saturation: ${highPotentialLocations.length} high-potential locations vs ${existingStores.length} existing stores`);
    
    if (!this.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured - cannot perform AI market saturation analysis');
    }

    try {
      // Calculate market metrics
      const marketMetrics = this.calculateMarketMetrics(highPotentialLocations, existingStores);
      
      // Analyze saturation with AI
      const saturationAnalysis = await this.performAISaturationAnalysis(
        marketMetrics,
        targetIntensity,
        existingStores.length
      );

      // Identify cannibalization risks
      const cannibalizationRisks = await this.identifyCannibalizationRisks(
        highPotentialLocations,
        existingStores
      );

      // Generate optimal distribution recommendations
      const optimalDistribution = await this.generateOptimalDistributionStrategy(
        marketMetrics,
        targetIntensity,
        cannibalizationRisks
      );

      console.log(`✅ Market saturation analysis completed: ${saturationAnalysis.marketSaturation.toFixed(2)} saturation level`);

      return {
        marketSaturation: saturationAnalysis.marketSaturation,
        cannibalizationRisk: cannibalizationRisks,
        optimalDistribution,
        aiRecommendations: saturationAnalysis.recommendations
      };

    } catch (error) {
      console.error(`❌ AI market saturation analysis failed:`, error);
      
      // Fallback to basic analysis
      return this.performBasicSaturationAnalysis(highPotentialLocations, existingStores, targetIntensity);
    }
  }

  /**
   * Validate geographic distribution of selected locations
   */
  private validateGeographicDistribution(
    selections: LocationRanking[], 
    targetCount: number
  ): { isValid: boolean; maxStatePercentage: number; issues: string[] } {
    const stateCount = new Map<string, number>();
    
    selections.forEach(selection => {
      const state = selection.candidate.stateCode || 'UNKNOWN';
      stateCount.set(state, (stateCount.get(state) || 0) + 1);
    });

    const maxStateCount = Math.max(...Array.from(stateCount.values()));
    const maxStatePercentage = (maxStateCount / selections.length) * 100;
    const issues: string[] = [];

    if (maxStatePercentage > 40) {
      const dominantState = Array.from(stateCount.entries())
        .find(([_, count]) => count === maxStateCount)?.[0] || 'UNKNOWN';
      issues.push(`State ${dominantState} has ${maxStatePercentage.toFixed(1)}% of selections (max allowed: 40%)`);
    }

    if (stateCount.size < 3 && selections.length > 20) {
      issues.push(`Only ${stateCount.size} states represented (recommend at least 3 for ${selections.length} locations)`);
    }

    return {
      isValid: issues.length === 0,
      maxStatePercentage,
      issues
    };
  }

  /**
   * Rebalance geographic distribution to meet constraints
   */
  private rebalanceGeographicDistribution(
    selections: LocationRanking[], 
    targetCount: number, 
    maxPercentagePerState: number
  ): LocationRanking[] {
    const maxPerState = Math.floor(targetCount * maxPercentagePerState);
    const stateCount = new Map<string, number>();
    const rebalanced: LocationRanking[] = [];

    // Sort selections by AI potential score (descending)
    const sortedSelections = [...selections].sort((a, b) => b.aiPotentialScore - a.aiPotentialScore);

    // First pass: Add locations respecting state limits
    for (const selection of sortedSelections) {
      const state = selection.candidate.stateCode || 'UNKNOWN';
      const currentCount = stateCount.get(state) || 0;

      if (currentCount < maxPerState && rebalanced.length < targetCount) {
        rebalanced.push(selection);
        stateCount.set(state, currentCount + 1);
      }
    }

    console.log(`   Rebalancing result: ${rebalanced.length} locations across ${stateCount.size} states`);
    Array.from(stateCount.entries()).forEach(([state, count]) => {
      const percentage = (count / rebalanced.length) * 100;
      console.log(`      ${state}: ${count} locations (${percentage.toFixed(1)}%)`);
    });

    return rebalanced;
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
   * Rank a batch of candidates using AI analysis
   */
  private async rankCandidateBatch(
    candidates: ExpansionCandidate[],
    regionData: RegionData,
    marketConditions: MarketConditions
  ): Promise<LocationRanking[]> {
    const prompt = this.buildMarketPotentialRankingPrompt(candidates, regionData, marketConditions);
    
    const response = await this.callOpenAI(prompt);
    this.apiCalls++;

    return this.parseMarketPotentialRankingResponse(response, candidates);
  }

  /**
   * Build OpenAI prompt for market potential ranking
   */
  private buildMarketPotentialRankingPrompt(
    candidates: ExpansionCandidate[],
    regionData: RegionData,
    marketConditions: MarketConditions
  ): string {
    const candidateList = candidates.map((c, i) => 
      `${i + 1}. ${c.name} (${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}) - Pop: ${c.population.toLocaleString()}, Distance: ${(c.nearestStoreDistance / 1000).toFixed(1)}km, Anchors: ${c.anchorCount}, Score: ${c.totalScore.toFixed(2)}`
    ).join('\n');

    return `You are a market expansion strategist analyzing restaurant location potential for Subway expansion.

REGION CONTEXT:
- Country: ${regionData.country}
- Total Existing Stores: ${regionData.totalStores}
- Average Store Distance: ${regionData.averageStoreDistance.toFixed(1)}km
- State Distribution: ${Object.entries(regionData.stateDistribution).map(([state, count]) => `${state}: ${count}`).join(', ')}

MARKET CONDITIONS:
- Economic Indicators: ${Object.entries(marketConditions.economicIndicators || {}).map(([key, value]) => `${key}: ${value}`).join(', ')}
- Seasonal Factors: ${marketConditions.seasonalFactors?.join(', ') || 'None specified'}
- Competitive Landscape: ${marketConditions.competitiveLandscape || 'Standard competition'}

CANDIDATES TO RANK:
${candidateList}

RANKING CRITERIA:
Analyze each location's market potential based on:
1. Population size and demographic suitability
2. Market gap (distance to nearest store)
3. Anchor business density and foot traffic potential
4. Strategic value for regional expansion
5. Risk factors and market viability
6. Long-term growth potential

Respond with JSON array ranking all candidates:
[
  {
    "candidateIndex": 0,
    "aiPotentialScore": 0.92,
    "strategicFactors": ["high_population", "market_gap", "anchor_density"],
    "riskFactors": ["seasonal_variation"],
    "aiReasoning": "Excellent market potential due to high population and significant market gap",
    "geographicPriority": 8
  }
]

Provide scores from 0.0 to 1.0 where 1.0 is highest potential.`;
  }

  /**
   * Call OpenAI API for market analysis with safety wrapper
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
                content: 'You are a market expansion strategist specializing in restaurant location analysis. Always respond with valid JSON and provide detailed strategic reasoning.'
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
      'expansion-intensity'
    );

    // Extract text from GPT-5 Responses API structure
      const messageOutput = result.output.find((item: any) => item.type === 'message');
      const responseText = messageOutput.content[0].text.trim();
    const tokensUsed = result.usage?.total_tokens || 0;
    this.totalTokensUsed += tokensUsed;

    return responseText;
  }

  /**
   * Parse OpenAI market potential ranking response
   */
  private parseMarketPotentialRankingResponse(
    responseText: string,
    candidates: ExpansionCandidate[]
  ): LocationRanking[] {
    try {
      // Extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in OpenAI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      return parsed.map((ranking: any) => {
        const candidateIndex = ranking.candidateIndex;
        if (candidateIndex < 0 || candidateIndex >= candidates.length) {
          throw new Error(`Invalid candidate index: ${candidateIndex}`);
        }

        const candidate = candidates[candidateIndex];
        
        return {
          candidate,
          aiPotentialScore: ranking.aiPotentialScore || 0.5,
          aiRanking: 0, // Will be set after sorting
          strategicFactors: ranking.strategicFactors || [],
          riskFactors: ranking.riskFactors || [],
          aiReasoning: ranking.aiReasoning || 'No reasoning provided',
          geographicPriority: ranking.geographicPriority || 5
        };
      });
      
    } catch (error) {
      console.error('Failed to parse OpenAI market potential ranking response:', responseText);
      
      // Fallback to basic ranking based on existing scores
      return candidates.map((candidate, index) => ({
        candidate,
        aiPotentialScore: candidate.totalScore,
        aiRanking: index + 1,
        strategicFactors: ['fallback_ranking'],
        riskFactors: ['parsing_error'],
        aiReasoning: 'Fallback ranking due to parsing error',
        geographicPriority: 5
      }));
    }
  }

  /**
   * Generate market insights from rankings
   */
  private async generateMarketInsights(
    rankings: LocationRanking[],
    regionData: RegionData
  ): Promise<string[]> {
    if (rankings.length === 0) {
      return ['No locations to analyze'];
    }

    try {
      const topLocations = rankings.slice(0, Math.min(10, rankings.length));
      const avgScore = rankings.reduce((sum, r) => sum + r.aiPotentialScore, 0) / rankings.length;
      
      const prompt = `Analyze these top expansion locations and provide strategic market insights:

TOP LOCATIONS:
${topLocations.map((r, i) => 
  `${i + 1}. ${r.candidate.name} - Score: ${r.aiPotentialScore.toFixed(2)} - ${r.aiReasoning}`
).join('\n')}

MARKET SUMMARY:
- Total Locations Analyzed: ${rankings.length}
- Average Potential Score: ${avgScore.toFixed(2)}
- Region: ${regionData.country}
- Existing Stores: ${regionData.totalStores}

Provide 3-5 strategic insights about this market in JSON array format:
["insight1", "insight2", "insight3"]`;

      const response = await this.callOpenAI(prompt);
      const parsed = JSON.parse(response.match(/\[[\s\S]*\]/)![0]);
      
      return Array.isArray(parsed) ? parsed : ['Market analysis completed'];
      
    } catch (error) {
      console.error('Failed to generate market insights:', error);
      return [
        `Analyzed ${rankings.length} locations with average potential score of ${(rankings.reduce((sum, r) => sum + r.aiPotentialScore, 0) / rankings.length).toFixed(2)}`,
        `Top location: ${rankings[0]?.candidate.name} with ${rankings[0]?.aiPotentialScore.toFixed(2)} potential score`
      ];
    }
  }

  /**
   * Identify saturation warnings
   */
  private identifySaturationWarnings(
    rankings: LocationRanking[],
    regionData: RegionData
  ): string[] {
    const warnings: string[] = [];
    
    // Check for high concentration in specific areas
    const stateConcentration = new Map<string, number>();
    rankings.forEach(r => {
      const state = r.candidate.stateCode;
      stateConcentration.set(state, (stateConcentration.get(state) || 0) + 1);
    });
    
    const totalLocations = rankings.length;
    stateConcentration.forEach((count, state) => {
      const percentage = (count / totalLocations) * 100;
      if (percentage > 30) {
        warnings.push(`High concentration in ${state}: ${count} locations (${percentage.toFixed(1)}%)`);
      }
    });
    
    // Check for potential oversaturation
    const highPotentialCount = rankings.filter(r => r.aiPotentialScore > 0.8).length;
    if (highPotentialCount > regionData.totalStores * 0.5) {
      warnings.push(`Potential oversaturation: ${highPotentialCount} high-potential locations vs ${regionData.totalStores} existing stores`);
    }
    
    return warnings;
  }

  /**
   * Apply geographic balancing to location rankings
   */
  private async applyGeographicBalancing(
    rankings: LocationRanking[],
    intensityLevel: ExpansionIntensity,
    constraints: GeographicConstraints
  ): Promise<LocationRanking[]> {
    const intensityConfig = this.getIntensityConfiguration(intensityLevel);
    const targetCount = intensityConfig.targetCount;
    console.log(`   Applying geographic balancing for ${targetCount} locations`);

    // If no constraints, return top N locations
    if (!constraints.maxPerState && !constraints.minStateSpread && !constraints.avoidConcentration) {
      return rankings.slice(0, targetCount);
    }

    const balanced: LocationRanking[] = [];
    const stateCount = new Map<string, number>();
    
    // Calculate max per state to ensure no state exceeds 40% of total selections
    const maxPercentagePerState = 0.40; // 40% maximum
    const maxPerState = Math.min(
      constraints.maxPerState || Math.ceil(targetCount / 3), // Use constraint or default to ~33%
      Math.floor(targetCount * maxPercentagePerState) // Enforce 40% limit
    );

    console.log(`   Geographic constraints: max ${maxPerState} locations per state (${((maxPerState / targetCount) * 100).toFixed(1)}% of total)`);

    // First pass: Select top locations while respecting state limits
    for (const ranking of rankings) {
      if (balanced.length >= targetCount) break;

      const state = ranking.candidate.stateCode || 'UNKNOWN';
      const currentStateCount = stateCount.get(state) || 0;

      if (currentStateCount < maxPerState) {
        balanced.push(ranking);
        stateCount.set(state, currentStateCount + 1);
      }
    }

    // Second pass: Fill remaining slots if we haven't reached target, but maintain geographic balance
    if (balanced.length < targetCount) {
      const remaining = rankings.filter(r => !balanced.includes(r));
      
      // Try to fill remaining slots while maintaining geographic balance
      for (const ranking of remaining) {
        if (balanced.length >= targetCount) break;
        
        const state = ranking.candidate.stateCode || 'UNKNOWN';
        const currentStateCount = stateCount.get(state) || 0;
        
        // Only add if it doesn't violate the geographic balance
        if (currentStateCount < maxPerState) {
          balanced.push(ranking);
          stateCount.set(state, currentStateCount + 1);
        }
      }
    }

    // Validate geographic distribution
    const distributionReport = this.validateGeographicDistribution(balanced, targetCount);
    if (!distributionReport.isValid) {
      console.warn(`   ⚠️ Geographic distribution issues detected:`);
      distributionReport.issues.forEach(issue => console.warn(`      - ${issue}`));
      
      // Attempt rebalancing if needed
      if (distributionReport.maxStatePercentage > 40) {
        console.log(`   🔄 Attempting geographic rebalancing...`);
        const rebalanced = this.rebalanceGeographicDistribution(balanced, targetCount, maxPercentagePerState);
        console.log(`   Geographic balancing: ${rebalanced.length} locations selected across ${new Set(rebalanced.map(r => r.candidate.stateCode)).size} states`);
        return rebalanced;
      }
    }

    console.log(`   Geographic balancing: ${balanced.length} locations selected across ${stateCount.size} states`);
    return balanced;
  }

  /**
   * Optimize selection using AI analysis
   */
  private async optimizeSelectionWithAI(
    candidates: LocationRanking[],
    intensityLevel: ExpansionIntensity,
    constraints: GeographicConstraints
  ): Promise<LocationRanking[]> {
    const intensityConfig = this.getIntensityConfiguration(intensityLevel);
    const targetCount = intensityConfig.targetCount;
    
    if (candidates.length <= targetCount) {
      return candidates; // No optimization needed
    }

    try {
      const prompt = this.buildSelectionOptimizationPrompt(candidates, intensityLevel, constraints);
      const response = await this.callOpenAI(prompt);
      this.apiCalls++;

      const optimizedSelection = this.parseSelectionOptimizationResponse(response, candidates);
      
      console.log(`   AI optimization: Selected ${optimizedSelection.length} locations from ${candidates.length} candidates`);
      return optimizedSelection;

    } catch (error) {
      console.error('🚨 [AI Service Error] Selection optimization failed:', {
        service: 'OpenAIExpansionIntensityService',
        operation: 'optimizeSelectionWithAI',
        candidatesCount: candidates.length,
        targetCount: targetCount,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        fallbackStrategy: 'geographic balancing result'
      });
      return candidates.slice(0, targetCount);
    }
  }

  /**
   * Build prompt for AI selection optimization
   */
  private buildSelectionOptimizationPrompt(
    candidates: LocationRanking[],
    intensityLevel: ExpansionIntensity,
    constraints: GeographicConstraints
  ): string {
    const intensityConfig = this.getIntensityConfiguration(intensityLevel);
    const targetCount = intensityConfig.targetCount;
    
    const candidateList = candidates.slice(0, Math.min(50, candidates.length)).map((r, i) => 
      `${i + 1}. ${r.candidate.name} (${r.candidate.stateCode}) - Score: ${r.aiPotentialScore.toFixed(2)} - ${r.aiReasoning}`
    ).join('\n');

    return `You are optimizing restaurant expansion location selection for maximum strategic impact.

TARGET: Select exactly ${targetCount} locations from the candidates below.

CONSTRAINTS:
- Max per state: ${constraints.maxPerState || 'No limit'}
- Min state spread: ${constraints.minStateSpread || 'No requirement'}
- Avoid concentration: ${constraints.avoidConcentration ? 'Yes' : 'No'}

CANDIDATES (top 50 shown):
${candidateList}

OPTIMIZATION CRITERIA:
1. Maximize overall market potential
2. Ensure geographic distribution
3. Balance risk vs. reward
4. Consider strategic market positioning
5. Optimize for long-term expansion success

Respond with JSON array of selected candidate indices (0-based):
{
  "selectedIndices": [0, 2, 5, 8, 12],
  "optimizationReasoning": "Selected locations provide optimal balance of market potential and geographic distribution"
}

Select exactly ${targetCount} locations that provide the best strategic expansion portfolio.`;
  }

  /**
   * Parse AI selection optimization response
   */
  private parseSelectionOptimizationResponse(
    responseText: string,
    candidates: LocationRanking[]
  ): LocationRanking[] {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const selectedIndices = parsed.selectedIndices || [];

      if (!Array.isArray(selectedIndices)) {
        throw new Error('selectedIndices is not an array');
      }

      const selected = selectedIndices
        .filter((index: number) => index >= 0 && index < candidates.length)
        .map((index: number) => candidates[index]);

      return selected;

    } catch (error) {
      console.error('Failed to parse AI selection optimization response:', error);
      // Fallback to top N candidates
      return candidates.slice(0, Math.min(candidates.length, 100)); // Reasonable fallback
    }
  }

  /**
   * Calculate geographic distribution of selected locations
   */
  private calculateGeographicDistribution(locations: LocationRanking[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    locations.forEach(location => {
      const state = location.candidate.stateCode;
      distribution[state] = (distribution[state] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Generate AI insights about the selection
   */
  private async generateSelectionInsights(
    selectedLocations: LocationRanking[],
    allRankings: LocationRanking[],
    intensityLevel: ExpansionIntensity
  ): Promise<string[]> {
    if (selectedLocations.length === 0) {
      return ['No locations selected for analysis'];
    }

    try {
      const avgSelectedScore = selectedLocations.reduce((sum, l) => sum + l.aiPotentialScore, 0) / selectedLocations.length;
      const avgAllScore = allRankings.reduce((sum, l) => sum + l.aiPotentialScore, 0) / allRankings.length;
      
      const stateDistribution = this.calculateGeographicDistribution(selectedLocations);
      const stateCount = Object.keys(stateDistribution).length;

      const prompt = `Analyze this expansion selection and provide strategic insights:

SELECTION SUMMARY:
- Intensity Level: ${intensityLevel} (${this.getIntensityDescription(intensityLevel)})
- Selected: ${selectedLocations.length} locations
- Average Score: ${avgSelectedScore.toFixed(2)} vs ${avgAllScore.toFixed(2)} overall
- Geographic Spread: ${stateCount} states
- State Distribution: ${Object.entries(stateDistribution).map(([state, count]) => `${state}: ${count}`).join(', ')}

TOP SELECTED LOCATIONS:
${selectedLocations.slice(0, 5).map((l, i) => 
  `${i + 1}. ${l.candidate.name} (${l.candidate.stateCode}) - ${l.aiPotentialScore.toFixed(2)}`
).join('\n')}

Provide 3-4 strategic insights about this selection in JSON array:
["insight1", "insight2", "insight3"]`;

      const response = await this.callOpenAI(prompt);
      const parsed = JSON.parse(response.match(/\[[\s\S]*\]/)![0]);
      
      return Array.isArray(parsed) ? parsed : ['Selection analysis completed'];

    } catch (error) {
      console.error('Failed to generate selection insights:', error);
      
      const avgScore = selectedLocations.reduce((sum, l) => sum + l.aiPotentialScore, 0) / selectedLocations.length;
      const stateCount = Object.keys(this.calculateGeographicDistribution(selectedLocations)).length;
      
      return [
        `Selected ${selectedLocations.length} locations with average potential score of ${avgScore.toFixed(2)}`,
        `Geographic distribution across ${stateCount} states ensures market diversification`,
        `${this.getIntensityDescription(intensityLevel)} expansion approach balances growth with risk management`
      ];
    }
  }

  /**
   * Get description for intensity level
   */
  private getIntensityDescription(intensityLevel: ExpansionIntensity): string {
    switch (intensityLevel) {
      case ExpansionIntensity.LIGHT: return 'Conservative';
      case ExpansionIntensity.MODERATE: return 'Balanced';
      case ExpansionIntensity.MEDIUM: return 'Growth-focused';
      case ExpansionIntensity.HIGH: return 'Aggressive';
      case ExpansionIntensity.VERY_HIGH: return 'Very aggressive';
      case ExpansionIntensity.AGGRESSIVE: return 'Maximum expansion';
      default: return 'Standard';
    }
  }

  /**
   * Calculate market metrics for saturation analysis
   */
  private calculateMarketMetrics(
    candidates: ExpansionCandidate[],
    existingStores: Array<{ id: string; latitude: number; longitude: number; state: string }>
  ) {
    // Calculate average distances between stores
    const avgStoreDistance = this.calculateAverageStoreDistance(existingStores);
    
    // Calculate market density by state
    const stateMetrics = new Map<string, { stores: number; candidates: number; density: number }>();
    
    // Count existing stores by state
    existingStores.forEach(store => {
      const state = store.state;
      if (!stateMetrics.has(state)) {
        stateMetrics.set(state, { stores: 0, candidates: 0, density: 0 });
      }
      stateMetrics.get(state)!.stores++;
    });
    
    // Count candidates by state
    candidates.forEach(candidate => {
      const state = candidate.stateCode;
      if (!stateMetrics.has(state)) {
        stateMetrics.set(state, { stores: 0, candidates: 0, density: 0 });
      }
      stateMetrics.get(state)!.candidates++;
    });
    
    // Calculate density ratios
    stateMetrics.forEach((metrics, state) => {
      metrics.density = metrics.candidates / Math.max(1, metrics.stores);
    });

    return {
      totalExistingStores: existingStores.length,
      totalCandidates: candidates.length,
      avgStoreDistance,
      stateMetrics: Object.fromEntries(stateMetrics),
      candidateToStoreRatio: candidates.length / Math.max(1, existingStores.length)
    };
  }

  /**
   * Calculate average distance between existing stores
   */
  private calculateAverageStoreDistance(stores: Array<{ latitude: number; longitude: number }>): number {
    if (stores.length < 2) return 0;

    let totalDistance = 0;
    let pairCount = 0;

    // Sample up to 100 stores to avoid performance issues
    const sampleStores = stores.slice(0, 100);
    
    for (let i = 0; i < sampleStores.length; i++) {
      for (let j = i + 1; j < Math.min(sampleStores.length, i + 10); j++) {
        const distance = this.calculateDistance(
          sampleStores[i].latitude,
          sampleStores[i].longitude,
          sampleStores[j].latitude,
          sampleStores[j].longitude
        );
        totalDistance += distance;
        pairCount++;
      }
    }

    return pairCount > 0 ? totalDistance / pairCount : 0;
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
   * Perform AI-powered saturation analysis
   */
  private async performAISaturationAnalysis(
    marketMetrics: any,
    targetIntensity: ExpansionIntensity,
    existingStoreCount: number
  ): Promise<{ marketSaturation: number; recommendations: string[] }> {
    const prompt = `Analyze market saturation for restaurant expansion:

MARKET METRICS:
- Existing Stores: ${marketMetrics.totalExistingStores}
- High-Potential Candidates: ${marketMetrics.totalCandidates}
- Candidate-to-Store Ratio: ${marketMetrics.candidateToStoreRatio.toFixed(2)}
- Average Store Distance: ${marketMetrics.avgStoreDistance.toFixed(1)}km
- Target Intensity: ${targetIntensity} stores (${this.getIntensityDescription(targetIntensity)})

STATE BREAKDOWN:
${Object.entries(marketMetrics.stateMetrics).map(([state, metrics]: [string, any]) => 
  `${state}: ${metrics.stores} stores, ${metrics.candidates} candidates (${metrics.density.toFixed(1)}x ratio)`
).join('\n')}

ANALYSIS REQUIREMENTS:
1. Calculate market saturation level (0.0 = undersaturated, 1.0 = fully saturated)
2. Assess risk of market oversaturation
3. Identify optimal expansion pace
4. Recommend geographic distribution strategy

Respond with JSON:
{
  "marketSaturation": 0.65,
  "recommendations": [
    "recommendation1",
    "recommendation2", 
    "recommendation3"
  ]
}`;

    try {
      const response = await this.callOpenAI(prompt);
      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)![0]);
      
      return {
        marketSaturation: parsed.marketSaturation || 0.5,
        recommendations: parsed.recommendations || []
      };
    } catch (error) {
      console.error('AI saturation analysis failed:', error);
      
      // Fallback calculation
      const saturation = Math.min(1.0, marketMetrics.candidateToStoreRatio / 2);
      return {
        marketSaturation: saturation,
        recommendations: [`Market saturation estimated at ${(saturation * 100).toFixed(0)}% based on candidate-to-store ratio`]
      };
    }
  }

  /**
   * Identify cannibalization risks using AI
   */
  private async identifyCannibalizationRisks(
    candidates: ExpansionCandidate[],
    existingStores: Array<{ id: string; latitude: number; longitude: number; state: string }>
  ): Promise<string[]> {
    const risks: string[] = [];

    try {
      // Find candidates that are very close to existing stores
      const closeProximityThreshold = 5; // 5km
      const proximityRisks: Array<{ candidate: ExpansionCandidate; nearestDistance: number; storeCount: number }> = [];

      candidates.forEach(candidate => {
        const nearbyStores = existingStores.filter(store => {
          const distance = this.calculateDistance(
            candidate.lat,
            candidate.lng,
            store.latitude,
            store.longitude
          );
          return distance <= closeProximityThreshold;
        });

        if (nearbyStores.length > 0) {
          const nearestDistance = Math.min(...nearbyStores.map(store =>
            this.calculateDistance(candidate.lat, candidate.lng, store.latitude, store.longitude)
          ));
          
          proximityRisks.push({
            candidate,
            nearestDistance,
            storeCount: nearbyStores.length
          });
        }
      });

      // Generate AI analysis of cannibalization risks
      if (proximityRisks.length > 0) {
        const topRisks = proximityRisks
          .sort((a, b) => a.nearestDistance - b.nearestDistance)
          .slice(0, 10);

        const prompt = `Analyze cannibalization risks for these restaurant locations:

HIGH-RISK LOCATIONS:
${topRisks.map((risk, i) => 
  `${i + 1}. ${risk.candidate.name} - ${risk.nearestDistance.toFixed(1)}km from nearest store (${risk.storeCount} stores within 5km)`
).join('\n')}

Assess cannibalization risks and provide specific warnings in JSON array:
["risk1", "risk2", "risk3"]`;

        const response = await this.callOpenAI(prompt);
        const parsed = JSON.parse(response.match(/\[[\s\S]*\]/)![0]);
        
        if (Array.isArray(parsed)) {
          risks.push(...parsed);
        }
      }

      // Add basic proximity warnings
      const highRiskCount = proximityRisks.filter(r => r.nearestDistance < 2).length;
      if (highRiskCount > 0) {
        risks.push(`${highRiskCount} locations within 2km of existing stores pose high cannibalization risk`);
      }

    } catch (error) {
      console.error('Cannibalization risk analysis failed:', error);
      risks.push('Unable to perform detailed cannibalization analysis');
    }

    return risks;
  }

  /**
   * Generate optimal distribution strategy
   */
  private async generateOptimalDistributionStrategy(
    marketMetrics: any,
    targetIntensity: ExpansionIntensity,
    cannibalizationRisks: string[]
  ): Promise<string> {
    try {
      const prompt = `Generate optimal distribution strategy for restaurant expansion:

MARKET SITUATION:
- Target Expansion: ${targetIntensity} stores
- Current Saturation: ${(marketMetrics.candidateToStoreRatio * 50).toFixed(0)}%
- Cannibalization Risks: ${cannibalizationRisks.length} identified
- Geographic Spread: ${Object.keys(marketMetrics.stateMetrics).length} states

RISK FACTORS:
${cannibalizationRisks.slice(0, 3).join('\n')}

Provide a concise optimal distribution strategy (2-3 sentences):`;

      const response = await this.callOpenAI(prompt);
      return response.trim().replace(/^["']|["']$/g, '');

    } catch (error) {
      console.error('Distribution strategy generation failed:', error);
      
      const riskLevel = cannibalizationRisks.length > 5 ? 'high' : cannibalizationRisks.length > 2 ? 'moderate' : 'low';
      return `Recommended ${this.getIntensityDescription(targetIntensity).toLowerCase()} expansion approach with ${riskLevel} cannibalization risk. Focus on geographic diversification and maintain minimum 3km spacing between new and existing stores.`;
    }
  }

  /**
   * Perform basic saturation analysis as fallback
   */
  private performBasicSaturationAnalysis(
    candidates: ExpansionCandidate[],
    existingStores: Array<{ id: string; latitude: number; longitude: number; state: string }>,
    targetIntensity: ExpansionIntensity
  ): SaturationAnalysis {
    const candidateToStoreRatio = candidates.length / Math.max(1, existingStores.length);
    const marketSaturation = Math.min(1.0, candidateToStoreRatio / 3); // Assume saturation at 3:1 ratio
    
    const cannibalizationRisk = candidates.length > existingStores.length * 2 
      ? ['High candidate density may lead to market oversaturation']
      : candidates.length > existingStores.length 
      ? ['Moderate expansion pace recommended to avoid cannibalization']
      : ['Conservative expansion approach with low cannibalization risk'];

    const optimalDistribution = `${this.getIntensityDescription(targetIntensity)} expansion strategy recommended with ${(marketSaturation * 100).toFixed(0)}% market saturation level.`;

    return {
      marketSaturation,
      cannibalizationRisk,
      optimalDistribution,
      aiRecommendations: [
        `Market saturation level: ${(marketSaturation * 100).toFixed(0)}%`,
        `Candidate-to-store ratio: ${candidateToStoreRatio.toFixed(1)}:1`,
        `Recommended approach: ${this.getIntensityDescription(targetIntensity).toLowerCase()} expansion`
      ]
    };
  }
}