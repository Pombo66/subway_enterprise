import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import { IOpenAIContextAnalysisService } from './interfaces/intelligent-expansion.interfaces';
import {
  AIContextAnalysis,
  ContextualInsights,
  LocationData,
  CompetitorData,
  DemographicData,
  AccessibilityData
} from './types/intelligent-expansion.types';
import { IndividualLocationAnalysisMonitor } from '../monitoring/individual-location-analysis-monitor.service';

/**
 * OpenAI Context Analysis Service
 * Provides AI-driven location context analysis with unique insights for each location
 */
export class OpenAIContextAnalysisService implements IOpenAIContextAnalysisService {
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly MODEL = process.env.EXPANSION_OPENAI_MODEL || 'gpt-5-mini';
  private readonly REASONING_EFFORT: 'minimal' | 'low' | 'medium' | 'high' = 'medium'; // Context analysis needs medium reasoning
  private readonly TEXT_VERBOSITY: 'low' | 'medium' | 'high' = 'medium'; // Balanced output for analysis
  private readonly MAX_TOKENS = parseInt(process.env.EXPANSION_OPENAI_MAX_TOKENS || '500');
  private readonly CACHE_TTL_DAYS = 30; // Cache AI context analysis for 30 days
  
  // Cache and statistics
  private cacheHits = 0;
  private cacheMisses = 0;
  private apiCalls = 0;
  private totalTokensUsed = 0;
  private locationMonitor: IndividualLocationAnalysisMonitor;

  constructor(private readonly prisma: PrismaClient) {
    this.locationMonitor = IndividualLocationAnalysisMonitor.getInstance();
    console.log('🤖 OpenAI Context Analysis Service initialized with location monitoring');
  }

  /**
   * Analyze individual location with AI using unique coordinates and context
   */
  async analyzeIndividualLocationWithAI(
    lat: number,
    lng: number,
    locationSpecificData: LocationData,
    nearbyCompetitors: CompetitorData[],
    localDemographics: DemographicData
  ): Promise<AIContextAnalysis> {
    console.log(`🤖 Analyzing location ${lat.toFixed(4)}, ${lng.toFixed(4)} with AI demographic analysis`);
    
    if (!this.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured - cannot perform AI demographic analysis');
    }

    // Check cache first
    const cacheKey = this.generateContextCacheKey(lat, lng, locationSpecificData, nearbyCompetitors, localDemographics);
    
    try {
      const cached = await this.getContextAnalysisFromCache(cacheKey);
      if (cached) {
        this.cacheHits++;
        console.log(`✅ Using cached AI context analysis for ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        
        // Log cache hit for monitoring
        const monitor = IndividualLocationAnalysisMonitor.getInstance();
        monitor.logApiCall(
          lat, lng,
          'OpenAIContextAnalysisService',
          'demographicAnalysis',
          { cached: true },
          cached,
          0, // No tokens used for cache hit
          0, // No response time for cache hit
          true // Cache hit
        );
        
        return cached;
      }
    } catch (error) {
      console.warn('Cache lookup failed, proceeding without cache:', error);
    }

    this.cacheMisses++;

    try {
      const prompt = this.buildDemographicAnalysisPrompt(
        lat,
        lng,
        locationSpecificData,
        nearbyCompetitors,
        localDemographics
      );

      const response = await this.callOpenAI(prompt, lat, lng, 'demographicAnalysis');
      this.apiCalls++;

      const analysis = this.parseDemographicAnalysisResponse(response);
      
      // Cache the result
      try {
        await this.cacheContextAnalysis(cacheKey, lat, lng, analysis);
      } catch (cacheError) {
        console.warn('Cache write failed, continuing without caching:', cacheError);
      }
      
      console.log(`✅ AI demographic analysis completed for ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      return analysis;

    } catch (error) {
      console.error(`❌ AI demographic analysis failed for ${lat.toFixed(4)}, ${lng.toFixed(4)}:`, error);
      throw error;
    }
  }

  /**
   * Generate unique contextual insights for specific location
   */
  async generateUniqueContextualInsights(
    uniqueLocationData: LocationData,
    locationSpecificCompetitors: CompetitorData[],
    individualAccessibilityData: AccessibilityData
  ): Promise<ContextualInsights> {
    console.log(`🤖 Generating competitive insights for location ${uniqueLocationData.lat.toFixed(4)}, ${uniqueLocationData.lng.toFixed(4)}`);
    
    if (!this.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured - cannot perform AI competition analysis');
    }

    try {
      const prompt = this.buildCompetitionAnalysisPrompt(
        uniqueLocationData,
        locationSpecificCompetitors,
        individualAccessibilityData
      );

      const response = await this.callOpenAI(prompt, uniqueLocationData.lat, uniqueLocationData.lng, 'competitionAnalysis');
      this.apiCalls++;

      const insights = this.parseCompetitionAnalysisResponse(response);
      
      console.log(`✅ AI competition analysis completed for ${uniqueLocationData.lat.toFixed(4)}, ${uniqueLocationData.lng.toFixed(4)}`);
      return insights;

    } catch (error) {
      console.error(`❌ AI competition analysis failed for ${uniqueLocationData.lat.toFixed(4)}, ${uniqueLocationData.lng.toFixed(4)}:`, error);
      throw error;
    }
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
   * Build OpenAI prompt for demographic analysis
   */
  private buildDemographicAnalysisPrompt(
    lat: number,
    lng: number,
    locationData: LocationData,
    competitors: CompetitorData[],
    demographics: DemographicData
  ): string {
    const competitorInfo = competitors.length > 0 
      ? competitors.map(c => `${c.name} (${c.type}) - ${c.distance.toFixed(1)}km away`).join(', ')
      : 'No major competitors within 5km';

    return `You are a market analyst specializing in restaurant site selection. Analyze this SPECIFIC location for Subway restaurant expansion potential.

CRITICAL: You MUST reference the specific settlement name, population numbers, and location characteristics in your analysis. Avoid generic phrases like "the location" or "this area" - use the actual settlement name and specific data provided.

LOCATION DETAILS:
- Settlement: ${demographics.settlementName || locationData.settlementName || 'Unknown Settlement'}
- Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}
- Population: ${demographics.population?.toLocaleString() || 'Unknown'}
- Income Level: ${demographics.incomeLevel || 'Unknown'}
- Employment Rate: ${demographics.employmentRate ? `${demographics.employmentRate}%` : 'Unknown'}
- Nearest Store Distance: ${(locationData.nearestStoreDistance / 1000).toFixed(1)}km
- Anchor Businesses: ${locationData.anchorCount} nearby
- Urban Density: ${locationData.urbanDensity?.toFixed(2) || 'Unknown'}

COMPETITIVE LANDSCAPE:
${competitorInfo}

ACCESSIBILITY FACTORS:
- Road Distance: ${locationData.roadDistance ? `${locationData.roadDistance}m from road` : 'Unknown'}
- Building Proximity: ${locationData.buildingDistance ? `${locationData.buildingDistance}m from buildings` : 'Unknown'}
- Urban Density: ${locationData.urbanDensity ? locationData.urbanDensity.toFixed(2) : 'Unknown'}

ANALYSIS REQUIREMENTS:
Provide a comprehensive market assessment focusing on:
1. Demographic suitability for Subway's target market
2. Income level analysis and spending power assessment
3. Employment patterns and lunch/dinner traffic potential
4. Accessibility analysis including foot traffic, parking, and public transport
5. Competitive advantages over nearby restaurants
6. Market gaps and positioning opportunities
7. Risk factors specific to this location including accessibility barriers
8. Unique selling points for this exact location

Respond in JSON format:
{
  "marketAssessment": "Detailed 2-3 sentence market analysis specific to this location",
  "competitiveAdvantages": ["advantage1", "advantage2", "advantage3"],
  "riskFactors": ["risk1", "risk2"],
  "demographicInsights": "Specific demographic analysis for this location",
  "accessibilityAnalysis": "Assessment of location accessibility and foot traffic",
  "uniqueSellingPoints": ["usp1", "usp2", "usp3"],
  "confidenceScore": 0.85
}

MANDATORY REQUIREMENTS:
1. Start your marketAssessment with the settlement name (e.g., "Cottbus, with its population of 99,678...")
2. Reference specific population numbers and demographic data
3. Mention the settlement name at least twice in your analysis
4. Use specific distance measurements and urban density figures
5. Avoid generic phrases like "the location" or "this area"
6. Make every sentence location-specific and data-driven

Focus on location-specific insights using the exact settlement name, coordinates and local data provided. Generic statements will be rejected.`;
  }

  /**
   * Call OpenAI API for demographic analysis
   */
  private async callOpenAI(prompt: string, lat?: number, lng?: number, operation: string = 'analysis'): Promise<string> {
    const { OpenAISafetyWrapper } = await import('./openai-safety-wrapper');
    
    const startTime = Date.now();
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
          input: `System: You are a market analyst specializing in restaurant site selection. Provide detailed, location-specific analysis in valid JSON format.\n\nUser: ${prompt}`,
          max_output_tokens: this.MAX_TOKENS,
          reasoning: { effort: this.REASONING_EFFORT },
          text: { verbosity: this.TEXT_VERBOSITY }
        })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        
        // GPT-5 Responses API has a different structure
        if (!data.output || !Array.isArray(data.output)) {
          throw new Error('No response from OpenAI');
        }

        return data;
      },
      `context-analysis-${operation}`,
      lat && lng ? `${lat}-${lng}` : undefined
    );

    // For GPT-5, prefer reasoning output, but fall back to message if reasoning is empty
    let contentOutput = result.output.find((item: any) => item.type === 'reasoning');
    
    // If reasoning is empty or missing, use message output
    if (!contentOutput || !contentOutput.content || !contentOutput.content[0] || !contentOutput.content[0].text) {
      contentOutput = result.output.find((item: any) => item.type === 'message');
    }
    
    if (!contentOutput || !contentOutput.content || !contentOutput.content[0] || !contentOutput.content[0].text) {
      throw new Error(`No usable content in OpenAI response. Available outputs: ${result.output.map((o: any) => `${o.type}:${o.content?.length || 0}`).join(', ')}`);
    }

    const responseText = contentOutput.content[0].text.trim();
    const tokensUsed = result.usage?.total_tokens || 0;
    const responseTime = Date.now() - startTime;
    this.totalTokensUsed += tokensUsed;

    // Log API call for monitoring if coordinates provided
    if (lat !== undefined && lng !== undefined) {
      const monitor = IndividualLocationAnalysisMonitor.getInstance();
      monitor.logApiCall(
        lat, lng, 
        'OpenAIContextAnalysisService', 
        operation,
        { prompt: prompt.substring(0, 200) + '...' }, // Truncated request
        { response: responseText },
        tokensUsed,
        responseTime,
        false // Not from cache
      );
    }

    return responseText;
  }

  /**
   * Parse OpenAI demographic analysis response
   */
  private parseDemographicAnalysisResponse(responseText: string): AIContextAnalysis {
    try {
      // Extract JSON from response (handle cases where AI adds explanation text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in OpenAI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.marketAssessment || typeof parsed.marketAssessment !== 'string') {
        throw new Error('Invalid response: missing or invalid marketAssessment');
      }
      
      if (!parsed.competitiveAdvantages || !Array.isArray(parsed.competitiveAdvantages)) {
        throw new Error('Invalid response: missing or invalid competitiveAdvantages');
      }
      
      if (!parsed.riskFactors || !Array.isArray(parsed.riskFactors)) {
        throw new Error('Invalid response: missing or invalid riskFactors');
      }

      return {
        marketAssessment: parsed.marketAssessment,
        competitiveAdvantages: parsed.competitiveAdvantages,
        riskFactors: parsed.riskFactors,
        demographicInsights: parsed.demographicInsights || 'No demographic insights provided',
        accessibilityAnalysis: parsed.accessibilityAnalysis || 'No accessibility analysis provided',
        uniqueSellingPoints: parsed.uniqueSellingPoints || [],
        confidenceScore: parsed.confidenceScore || 0.5
      };
      
    } catch (error) {
      console.error('Failed to parse OpenAI demographic analysis response:', responseText);
      throw new Error(`JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build OpenAI prompt for competition analysis
   */
  private buildCompetitionAnalysisPrompt(
    locationData: LocationData,
    competitors: CompetitorData[],
    accessibility: AccessibilityData
  ): string {
    const competitorAnalysis = competitors.length > 0 
      ? competitors.map(c => `- ${c.name} (${c.type}): ${c.distance.toFixed(1)}km away`).join('\n')
      : '- No major competitors within 5km radius';

    const accessibilityInfo = [
      accessibility.publicTransportScore ? `Public Transport Score: ${accessibility.publicTransportScore}/10` : null,
      accessibility.walkabilityIndex ? `Walkability Index: ${accessibility.walkabilityIndex}/10` : null,
      accessibility.parkingAvailability ? `Parking: ${accessibility.parkingAvailability}` : null,
      accessibility.roadAccess !== undefined ? `Road Access: ${accessibility.roadAccess ? 'Good' : 'Limited'}` : null
    ].filter(Boolean).join(', ') || 'Accessibility data not available';

    return `You are a competitive intelligence analyst for restaurant expansion. Analyze the competitive landscape and market opportunities for this specific Subway location.

LOCATION ANALYSIS:
- Coordinates: ${locationData.lat.toFixed(6)}, ${locationData.lng.toFixed(6)}
- Population Catchment: ${locationData.population?.toLocaleString() || 'Unknown'}
- Nearest Subway: ${(locationData.nearestStoreDistance / 1000).toFixed(1)}km away
- Anchor Businesses: ${locationData.anchorCount} nearby
- Accessibility: ${accessibilityInfo}

COMPETITIVE LANDSCAPE:
${competitorAnalysis}

ANALYSIS REQUIREMENTS:
Provide strategic insights focusing on:
1. Market gaps and unmet demand in this specific location
2. Competitive positioning opportunities against existing restaurants
3. Potential challenges from nearby competitors
4. Recommended market positioning strategy
5. Seasonal considerations specific to this location's context

Respond in JSON format:
{
  "primaryStrengths": ["strength1", "strength2", "strength3"],
  "marketOpportunities": ["opportunity1", "opportunity2"],
  "potentialChallenges": ["challenge1", "challenge2"],
  "recommendedPositioning": "Specific positioning strategy for this location",
  "seasonalConsiderations": ["seasonal1", "seasonal2"]
}

Focus on actionable insights specific to this exact location and competitive environment.`;
  }

  /**
   * Parse OpenAI competition analysis response
   */
  private parseCompetitionAnalysisResponse(responseText: string): ContextualInsights {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in OpenAI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.primaryStrengths || !Array.isArray(parsed.primaryStrengths)) {
        throw new Error('Invalid response: missing or invalid primaryStrengths');
      }
      
      if (!parsed.marketOpportunities || !Array.isArray(parsed.marketOpportunities)) {
        throw new Error('Invalid response: missing or invalid marketOpportunities');
      }

      return {
        primaryStrengths: parsed.primaryStrengths,
        marketOpportunities: parsed.marketOpportunities,
        potentialChallenges: parsed.potentialChallenges || [],
        recommendedPositioning: parsed.recommendedPositioning || 'Standard Subway positioning',
        seasonalConsiderations: parsed.seasonalConsiderations || []
      };
      
    } catch (error) {
      console.error('Failed to parse OpenAI competition analysis response:', responseText);
      throw new Error(`JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze accessibility intelligence using AI and Mapbox data
   */
  async analyzeAccessibilityWithAI(
    lat: number,
    lng: number,
    locationData: LocationData,
    accessibilityData: AccessibilityData
  ): Promise<string> {
    console.log(`🤖 Analyzing accessibility intelligence for ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    
    if (!this.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured - cannot perform AI accessibility analysis');
    }

    try {
      const prompt = this.buildAccessibilityAnalysisPrompt(lat, lng, locationData, accessibilityData);
      const response = await this.callOpenAI(prompt, lat, lng, 'accessibilityAnalysis');
      this.apiCalls++;

      const analysis = this.parseAccessibilityAnalysisResponse(response);
      
      console.log(`✅ AI accessibility analysis completed for ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      return analysis;

    } catch (error) {
      console.error(`❌ AI accessibility analysis failed for ${lat.toFixed(4)}, ${lng.toFixed(4)}:`, error);
      throw error;
    }
  }

  /**
   * Build OpenAI prompt for accessibility analysis
   */
  private buildAccessibilityAnalysisPrompt(
    lat: number,
    lng: number,
    locationData: LocationData,
    accessibility: AccessibilityData
  ): string {
    return `You are a location accessibility expert analyzing foot traffic and accessibility for restaurant placement.

LOCATION DETAILS:
- Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}
- Road Distance: ${locationData.roadDistance ? `${locationData.roadDistance}m` : 'Unknown'}
- Building Distance: ${locationData.buildingDistance ? `${locationData.buildingDistance}m` : 'Unknown'}
- Urban Density: ${locationData.urbanDensity ? locationData.urbanDensity.toFixed(2) : 'Unknown'}
- Public Transport Score: ${accessibility.publicTransportScore || 'Unknown'}
- Walkability Index: ${accessibility.walkabilityIndex || 'Unknown'}
- Parking Availability: ${accessibility.parkingAvailability || 'Unknown'}
- Road Access: ${accessibility.roadAccess !== undefined ? (accessibility.roadAccess ? 'Good' : 'Limited') : 'Unknown'}

ANALYSIS REQUIREMENTS:
Analyze the accessibility and foot traffic potential for this Subway location:
1. Pedestrian accessibility and walkability assessment
2. Public transportation connectivity analysis
3. Vehicle accessibility and parking situation
4. Foot traffic patterns and peak hours prediction
5. Accessibility barriers and mitigation strategies
6. Overall accessibility score and recommendations

Provide a detailed accessibility analysis in 2-3 sentences focusing on practical foot traffic and customer access considerations for this specific location.`;
  }

  /**
   * Parse OpenAI accessibility analysis response
   */
  private parseAccessibilityAnalysisResponse(responseText: string): string {
    // For accessibility analysis, we expect a text response rather than JSON
    // Clean up the response and return the analysis
    return responseText.trim().replace(/^["']|["']$/g, '');
  }

  /**
   * Generate cache key for context analysis
   */
  private generateContextCacheKey(
    lat: number,
    lng: number,
    locationData: LocationData,
    competitors: CompetitorData[],
    demographics: DemographicData
  ): string {
    const key = [
      lat.toFixed(5),
      lng.toFixed(5),
      locationData.population,
      locationData.nearestStoreDistance,
      locationData.anchorCount,
      demographics.population || 0,
      demographics.incomeLevel || 'unknown',
      competitors.length,
      this.MODEL,
      this.REASONING_EFFORT,
      this.TEXT_VERBOSITY
    ].join('|');
    
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * Get context analysis from cache
   */
  private async getContextAnalysisFromCache(cacheKey: string): Promise<AIContextAnalysis | null> {
    try {
      const cached = await this.prisma.aIContextAnalysisCache.findUnique({
        where: { contextHash: cacheKey }
      });

      if (!cached) {
        return null;
      }

      if (cached.expiresAt < new Date()) {
        await this.prisma.aIContextAnalysisCache.delete({
          where: { id: cached.id }
        });
        return null;
      }

      return {
        marketAssessment: cached.marketAssessment,
        competitiveAdvantages: JSON.parse(cached.competitiveAdvantages),
        riskFactors: JSON.parse(cached.riskFactors),
        demographicInsights: cached.demographicInsights,
        accessibilityAnalysis: cached.accessibilityAnalysis,
        uniqueSellingPoints: JSON.parse(cached.uniqueSellingPoints),
        confidenceScore: cached.confidenceScore
      };
    } catch (error) {
      console.error('Cache lookup error:', error);
      return null;
    }
  }

  /**
   * Cache context analysis result
   */
  private async cacheContextAnalysis(
    cacheKey: string,
    lat: number,
    lng: number,
    analysis: AIContextAnalysis
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.CACHE_TTL_DAYS);

      await this.prisma.aIContextAnalysisCache.create({
        data: {
          contextHash: cacheKey,
          lat,
          lng,
          marketAssessment: analysis.marketAssessment,
          competitiveAdvantages: JSON.stringify(analysis.competitiveAdvantages),
          riskFactors: JSON.stringify(analysis.riskFactors),
          demographicInsights: analysis.demographicInsights,
          accessibilityAnalysis: analysis.accessibilityAnalysis,
          uniqueSellingPoints: JSON.stringify(analysis.uniqueSellingPoints),
          confidenceScore: analysis.confidenceScore,
          model: this.MODEL,
          temperature: 1.0, // GPT-5 default - keeping for schema compatibility
          tokensUsed: Math.ceil(analysis.marketAssessment.length / 4), // Estimate tokens
          expiresAt
        }
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }
}