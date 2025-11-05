import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import { IOpenAIRationaleDiversificationService } from './interfaces/intelligent-expansion.interfaces';
import {
  UniqueRationale,
  DiversityReport,
  RationaleCandidate,
  ContextualInsights
} from './types/intelligent-expansion.types';
import { RationaleContext } from './openai-rationale.service';

/**
 * OpenAI Rationale Diversification Service
 * Extends existing rationale service with diversity enforcement and uniqueness validation
 */
export class OpenAIRationaleDiversificationService implements IOpenAIRationaleDiversificationService {
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly MODEL = process.env.EXPANSION_OPENAI_MODEL || 'gpt-5-mini';
  private readonly REASONING_EFFORT: 'minimal' | 'low' | 'medium' | 'high' = 'medium'; // Rationale generation needs medium reasoning
  private readonly TEXT_VERBOSITY: 'low' | 'medium' | 'high' = 'medium'; // Balanced output for rationales
  private readonly MAX_TOKENS = parseInt(process.env.EXPANSION_OPENAI_MAX_TOKENS || '300');
  private readonly CACHE_TTL_DAYS = 14; // Cache diverse rationales for 14 days
  
  // Cache and statistics
  private cacheHits = 0;
  private cacheMisses = 0;
  private apiCalls = 0;
  private totalTokensUsed = 0;

  constructor(private readonly prisma: PrismaClient) {
    if (!prisma) {
      throw new Error('Prisma client is required for OpenAI Rationale Diversification Service');
    }
    console.log('🤖 OpenAI Rationale Diversification Service initialized');
  }

  /**
   * Generate location-specific rationale with uniqueness enforcement
   */
  async generateLocationSpecificRationale(
    individualLocationContext: RationaleContext,
    existingRationales: string[],
    uniqueLocationInsights: ContextualInsights,
    locationCoordinates: { lat: number; lng: number }
  ): Promise<UniqueRationale> {
    console.log(`🤖 Generating unique rationale for location ${locationCoordinates.lat.toFixed(4)}, ${locationCoordinates.lng.toFixed(4)}`);
    
    if (!this.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured - cannot perform AI rationale diversification');
    }

    // Check cache first
    const cacheKey = this.generateDiversityCacheKey(
      individualLocationContext,
      existingRationales,
      uniqueLocationInsights
    );
    
    try {
      const cached = await this.getDiverseRationaleFromCache(cacheKey);
      if (cached) {
        this.cacheHits++;
        console.log(`✅ Using cached diverse rationale for ${locationCoordinates.lat.toFixed(4)}, ${locationCoordinates.lng.toFixed(4)}`);
        return cached;
      }
    } catch (error) {
      console.warn('Diversity cache lookup failed, proceeding without cache:', error);
    }

    this.cacheMisses++;

    try {
      const prompt = this.buildUniquenessValidationPrompt(
        individualLocationContext,
        existingRationales,
        uniqueLocationInsights,
        locationCoordinates
      );

      const response = await this.callOpenAI(prompt);
      this.apiCalls++;

      const uniqueRationale = this.parseUniqueRationaleResponse(response);
      
      // Cache the result
      try {
        await this.cacheDiverseRationale(cacheKey, locationCoordinates, uniqueRationale);
      } catch (cacheError) {
        console.warn('Diversity cache write failed, continuing without caching:', cacheError);
      }
      
      console.log(`✅ Unique rationale generated for ${locationCoordinates.lat.toFixed(4)}, ${locationCoordinates.lng.toFixed(4)} (uniqueness: ${uniqueRationale.uniquenessScore})`);
      return uniqueRationale;

    } catch (error) {
      console.error('🚨 [AI Service Error] Rationale diversification failed:', {
        service: 'OpenAIRationaleDiversificationService',
        operation: 'generateLocationSpecificRationale',
        coordinates: `${locationCoordinates.lat.toFixed(4)}, ${locationCoordinates.lng.toFixed(4)}`,
        existingRationalesCount: existingRationales.length,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        apiCalls: this.apiCalls,
        cacheStats: { hits: this.cacheHits, misses: this.cacheMisses }
      });
      throw error;
    }
  }

  /**
   * Validate diversity of individual location rationales
   */
  async validateIndividualRationaleDiversity(
    locationSpecificRationales: string[]
  ): Promise<DiversityReport> {
    console.log(`🤖 Validating diversity of ${locationSpecificRationales.length} rationales`);
    
    if (!this.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured - cannot perform AI diversity validation');
    }

    if (locationSpecificRationales.length === 0) {
      return {
        uniquenessScore: 0,
        repetitionCount: 0,
        averageLength: 0,
        contextualVariety: 0,
        aiRecommendations: ['No rationales provided for validation'],
        diversityIssues: ['Empty rationale list']
      };
    }

    try {
      const prompt = this.buildDiversityValidationPrompt(locationSpecificRationales);
      const response = await this.callOpenAI(prompt);
      this.apiCalls++;

      const diversityReport = this.parseDiversityValidationResponse(response, locationSpecificRationales);
      
      console.log(`✅ Diversity validation completed: ${diversityReport.uniquenessScore.toFixed(2)} uniqueness score`);
      return diversityReport;

    } catch (error) {
      console.error(`❌ AI diversity validation failed:`, error);
      
      // Fallback to basic diversity analysis
      return this.performBasicDiversityAnalysis(locationSpecificRationales);
    }
  }

  /**
   * Enforce location uniqueness using AI analysis
   */
  async enforceLocationUniquenessWithAI(
    individualCandidates: RationaleCandidate[],
    targetCount: number
  ): Promise<UniqueRationale[]> {
    console.log(`🤖 Enforcing uniqueness for ${individualCandidates.length} candidates (target: ${targetCount})`);
    
    if (!this.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured - cannot perform AI uniqueness enforcement');
    }

    const uniqueRationales: UniqueRationale[] = [];
    const usedRationales: string[] = [];
    const maxRetries = 3;

    for (let i = 0; i < Math.min(individualCandidates.length, targetCount); i++) {
      const candidate = individualCandidates[i];
      let attempts = 0;
      let rationale: UniqueRationale | null = null;

      while (attempts < maxRetries && !rationale) {
        try {
          console.log(`   Generating rationale ${i + 1}/${targetCount} (attempt ${attempts + 1})`);
          
          // Create a basic context from candidate data
          const context: RationaleContext = {
            lat: candidate.lat,
            lng: candidate.lng,
            populationScore: 0.7, // Default values - would be provided by caller in real usage
            proximityScore: 0.6,
            turnoverScore: 0.8,
            urbanDensity: null,
            roadDistance: null,
            buildingDistance: null
          };

          // Create basic insights
          const insights: ContextualInsights = {
            primaryStrengths: [`Location ${candidate.id} advantages`],
            marketOpportunities: ['Market gap opportunity'],
            potentialChallenges: ['Standard market challenges'],
            recommendedPositioning: 'Standard Subway positioning',
            seasonalConsiderations: []
          };

          const generatedRationale = await this.generateLocationSpecificRationale(
            context,
            usedRationales,
            insights,
            { lat: candidate.lat, lng: candidate.lng }
          );

          // Check if this rationale is sufficiently unique
          if (await this.isRationaleSufficientlyUnique(generatedRationale.text, usedRationales)) {
            rationale = generatedRationale;
            usedRationales.push(rationale.text);
            uniqueRationales.push(rationale);
            
            console.log(`   ✅ Unique rationale generated (uniqueness: ${rationale.uniquenessScore.toFixed(2)})`);
          } else {
            console.log(`   🔄 Rationale not unique enough, retrying...`);
            attempts++;
          }

        } catch (error) {
          console.error(`   ❌ Failed to generate rationale for candidate ${i + 1}:`, error);
          attempts++;
        }
      }

      if (!rationale) {
        console.warn(`   ⚠️  Failed to generate unique rationale for candidate ${i + 1} after ${maxRetries} attempts`);
        // Create a fallback rationale
        const fallbackRationale: UniqueRationale = {
          text: `Location ${candidate.lat.toFixed(4)}, ${candidate.lng.toFixed(4)} offers expansion potential with unique geographic positioning.`,
          factors: {
            population: 'Standard population analysis',
            proximity: 'Standard proximity analysis', 
            turnover: 'Standard turnover analysis'
          },
          confidence: 0.5,
          dataCompleteness: 0.5,
          uniquenessScore: 0.3,
          contextualElements: [`Fallback for ${candidate.id}`],
          differentiators: ['Geographic coordinates'],
          aiGeneratedInsights: ['Fallback rationale due to generation failure']
        };
        uniqueRationales.push(fallbackRationale);
      }
    }

    console.log(`✅ Uniqueness enforcement completed: ${uniqueRationales.length} unique rationales generated`);
    return uniqueRationales;
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
   * Build OpenAI prompt for uniqueness validation and rationale generation
   */
  private buildUniquenessValidationPrompt(
    context: RationaleContext,
    existingRationales: string[],
    insights: ContextualInsights,
    coordinates: { lat: number; lng: number }
  ): string {
    const existingRationalesText = existingRationales.length > 0 
      ? existingRationales.map((r, i) => `${i + 1}. ${r}`).join('\n')
      : 'No existing rationales to avoid';

    return `You are a location analysis expert creating unique, location-specific rationales for Subway restaurant expansion.

LOCATION DETAILS:
- Coordinates: ${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}
- Population Score: ${(context.populationScore * 100).toFixed(0)}%
- Proximity Gap: ${(context.proximityScore * 100).toFixed(0)}%
- Sales Potential: ${(context.turnoverScore * 100).toFixed(0)}%
- Urban Density: ${context.urbanDensity || 'Unknown'}
- Road Distance: ${context.roadDistance ? `${context.roadDistance}m` : 'Unknown'}
- Building Distance: ${context.buildingDistance ? `${context.buildingDistance}m` : 'Unknown'}

CONTEXTUAL INSIGHTS:
- Primary Strengths: ${insights.primaryStrengths.join(', ')}
- Market Opportunities: ${insights.marketOpportunities.join(', ')}
- Potential Challenges: ${insights.potentialChallenges.join(', ')}
- Recommended Positioning: ${insights.recommendedPositioning}

EXISTING RATIONALES TO AVOID DUPLICATING:
${existingRationalesText}

UNIQUENESS REQUIREMENTS:
1. Create a completely unique rationale that differs from all existing ones
2. Use specific location coordinates and metrics in your explanation
3. Highlight unique aspects of this exact location
4. Avoid generic phrases used in existing rationales
5. Include location-specific differentiators and insights

Generate a unique rationale in JSON format:
{
  "text": "Unique 2-3 sentence rationale specific to this location",
  "factors": {
    "population": "Location-specific population insight",
    "proximity": "Unique proximity analysis for this location",
    "turnover": "Specific sales potential assessment"
  },
  "confidence": 0.85,
  "dataCompleteness": 0.90,
  "uniquenessScore": 0.95,
  "contextualElements": ["element1", "element2", "element3"],
  "differentiators": ["differentiator1", "differentiator2"],
  "aiGeneratedInsights": ["insight1", "insight2"]
}

Focus on what makes this specific location unique compared to others.`;
  }

  /**
   * Call OpenAI API for rationale diversification with safety wrapper
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
          input: `System: You are a location analysis expert specializing in creating unique, location-specific rationales. Always respond with valid JSON and ensure each rationale is completely unique.\n\nUser: ${prompt}`,
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
      'rationale-diversification'
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
    this.totalTokensUsed += tokensUsed;

    return responseText;
  }

  /**
   * Parse OpenAI unique rationale response
   */
  private parseUniqueRationaleResponse(responseText: string): UniqueRationale {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in OpenAI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.text || typeof parsed.text !== 'string') {
        throw new Error('Invalid response: missing or invalid text');
      }
      
      if (!parsed.factors || typeof parsed.factors !== 'object') {
        throw new Error('Invalid response: missing or invalid factors');
      }

      return {
        text: parsed.text,
        factors: {
          population: parsed.factors.population || 'No population analysis',
          proximity: parsed.factors.proximity || 'No proximity analysis',
          turnover: parsed.factors.turnover || 'No turnover analysis'
        },
        confidence: parsed.confidence || 0.5,
        dataCompleteness: parsed.dataCompleteness || 0.5,
        uniquenessScore: parsed.uniquenessScore || 0.5,
        contextualElements: parsed.contextualElements || [],
        differentiators: parsed.differentiators || [],
        aiGeneratedInsights: parsed.aiGeneratedInsights || []
      };
      
    } catch (error) {
      console.error('Failed to parse OpenAI unique rationale response:', responseText);
      throw new Error(`JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build OpenAI prompt for diversity validation
   */
  private buildDiversityValidationPrompt(rationales: string[]): string {
    const rationaleList = rationales.map((r, i) => `${i + 1}. ${r}`).join('\n');

    return `You are a content analysis expert evaluating the diversity and uniqueness of location rationales for restaurant expansion.

RATIONALES TO ANALYZE:
${rationaleList}

ANALYSIS REQUIREMENTS:
Evaluate these rationales for:
1. Uniqueness - How different are they from each other?
2. Repetition - Are there duplicate phrases or concepts?
3. Contextual variety - Do they reference different location-specific factors?
4. Quality - Are they specific and actionable?

Provide analysis in JSON format:
{
  "uniquenessScore": 0.85,
  "repetitionCount": 2,
  "averageLength": 145,
  "contextualVariety": 0.90,
  "aiRecommendations": ["recommendation1", "recommendation2"],
  "diversityIssues": ["issue1", "issue2"]
}

Focus on identifying specific repetitive phrases and suggesting improvements for better diversity.`;
  }

  /**
   * Parse OpenAI diversity validation response
   */
  private parseDiversityValidationResponse(responseText: string, rationales: string[]): DiversityReport {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in OpenAI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        uniquenessScore: parsed.uniquenessScore || 0.5,
        repetitionCount: parsed.repetitionCount || 0,
        averageLength: parsed.averageLength || rationales.reduce((sum, r) => sum + r.length, 0) / rationales.length,
        contextualVariety: parsed.contextualVariety || 0.5,
        aiRecommendations: parsed.aiRecommendations || [],
        diversityIssues: parsed.diversityIssues || []
      };
      
    } catch (error) {
      console.error('Failed to parse OpenAI diversity validation response:', responseText);
      return this.performBasicDiversityAnalysis(rationales);
    }
  }

  /**
   * Perform basic diversity analysis as fallback
   */
  private performBasicDiversityAnalysis(rationales: string[]): DiversityReport {
    const averageLength = rationales.reduce((sum, r) => sum + r.length, 0) / rationales.length;
    
    // Simple uniqueness check - count exact duplicates
    const uniqueRationales = new Set(rationales);
    const uniquenessScore = uniqueRationales.size / rationales.length;
    
    // Count repetitive phrases (simple approach)
    const allWords = rationales.join(' ').toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();
    allWords.forEach(word => {
      if (word.length > 3) { // Only count meaningful words
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    });
    
    const repetitionCount = Array.from(wordCounts.values()).filter(count => count > rationales.length * 0.5).length;
    
    // Basic contextual variety - check for location-specific terms
    const locationTerms = ['km', 'population', 'distance', 'area', 'location', 'coordinates'];
    const hasLocationTerms = rationales.filter(r => 
      locationTerms.some(term => r.toLowerCase().includes(term))
    ).length;
    const contextualVariety = hasLocationTerms / rationales.length;
    
    return {
      uniquenessScore,
      repetitionCount,
      averageLength,
      contextualVariety,
      aiRecommendations: ['Use basic diversity analysis - AI validation unavailable'],
      diversityIssues: repetitionCount > 0 ? ['Repetitive phrases detected'] : []
    };
  }

  /**
   * Check if a rationale is sufficiently unique compared to existing ones
   */
  private async isRationaleSufficientlyUnique(
    newRationale: string,
    existingRationales: string[],
    threshold: number = 0.7
  ): Promise<boolean> {
    if (existingRationales.length === 0) {
      return true; // First rationale is always unique
    }

    try {
      // Use AI to assess uniqueness
      const prompt = `You are a content uniqueness analyzer. Compare this new rationale against existing ones and determine if it's sufficiently unique.

NEW RATIONALE:
${newRationale}

EXISTING RATIONALES:
${existingRationales.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Analyze uniqueness based on:
1. Different phrasing and vocabulary
2. Unique location-specific details
3. Different reasoning approaches
4. Distinct value propositions

Respond with JSON:
{
  "isUnique": true,
  "similarityScore": 0.2,
  "reasoning": "Explanation of uniqueness assessment"
}

Similarity score: 0.0 = completely unique, 1.0 = identical`;

      const response = await this.callOpenAI(prompt);
      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)![0]);
      
      const isUnique = parsed.isUnique && parsed.similarityScore < (1 - threshold);
      
      if (!isUnique) {
        console.log(`   Similarity too high: ${parsed.similarityScore.toFixed(2)} (${parsed.reasoning})`);
      }
      
      return isUnique;
      
    } catch (error) {
      console.warn('AI uniqueness check failed, using basic comparison:', error);
      
      // Fallback to basic string similarity
      return this.basicUniquenessCheck(newRationale, existingRationales, threshold);
    }
  }

  /**
   * Basic uniqueness check using string similarity
   */
  private basicUniquenessCheck(
    newRationale: string,
    existingRationales: string[],
    threshold: number
  ): boolean {
    const newWords = new Set(newRationale.toLowerCase().split(/\s+/));
    
    for (const existing of existingRationales) {
      const existingWords = new Set(existing.toLowerCase().split(/\s+/));
      
      // Calculate Jaccard similarity
      const intersection = new Set([...newWords].filter(word => existingWords.has(word)));
      const union = new Set([...newWords, ...existingWords]);
      const similarity = intersection.size / union.size;
      
      if (similarity > (1 - threshold)) {
        return false; // Too similar
      }
    }
    
    return true; // Sufficiently unique
  }

  /**
   * Generate cache key for diverse rationale
   */
  private generateDiversityCacheKey(
    context: RationaleContext,
    existingRationales: string[],
    insights: ContextualInsights
  ): string {
    // Create a hash that includes location, context, and existing rationales
    const existingHash = crypto.createHash('md5')
      .update(existingRationales.join('|'))
      .digest('hex')
      .substring(0, 8);

    const key = [
      context.lat.toFixed(5),
      context.lng.toFixed(5),
      context.populationScore.toFixed(2),
      context.proximityScore.toFixed(2),
      context.turnoverScore.toFixed(2),
      insights.primaryStrengths.join(','),
      existingHash,
      this.MODEL,
      this.REASONING_EFFORT,
      this.TEXT_VERBOSITY
    ].join('|');
    
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * Get diverse rationale from cache
   */
  private async getDiverseRationaleFromCache(cacheKey: string): Promise<UniqueRationale | null> {
    try {
      // Validate Prisma client before use
      if (!this.prisma || !this.prisma.aIRationaleDiversityCache) {
        console.warn('Prisma client or aIRationaleDiversityCache not available, skipping cache lookup');
        return null;
      }

      const cached = await this.prisma.aIRationaleDiversityCache.findUnique({
        where: { contextHash: cacheKey }
      });

      if (!cached) {
        return null;
      }

      if (cached.expiresAt < new Date()) {
        await this.prisma.aIRationaleDiversityCache.delete({
          where: { id: cached.id }
        });
        return null;
      }

      return {
        text: cached.rationaleText,
        factors: JSON.parse(cached.keyFactors),
        confidence: cached.confidence,
        dataCompleteness: cached.dataCompleteness,
        uniquenessScore: cached.uniquenessScore,
        contextualElements: JSON.parse(cached.contextualElements),
        differentiators: JSON.parse(cached.differentiators),
        aiGeneratedInsights: JSON.parse(cached.aiGeneratedInsights)
      };
    } catch (error) {
      console.error('🚨 [AI Service Error] Diversity cache lookup failed:', {
        service: 'OpenAIRationaleDiversificationService',
        operation: 'getDiverseRationaleFromCache',
        cacheKey: cacheKey.substring(0, 16) + '...',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }

  /**
   * Cache diverse rationale result
   */
  private async cacheDiverseRationale(
    cacheKey: string,
    coordinates: { lat: number; lng: number },
    rationale: UniqueRationale
  ): Promise<void> {
    try {
      // Validate Prisma client before use
      if (!this.prisma || !this.prisma.aIRationaleDiversityCache) {
        console.warn('Prisma client or aIRationaleDiversityCache not available, skipping cache write');
        return;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.CACHE_TTL_DAYS);

      await this.prisma.aIRationaleDiversityCache.create({
        data: {
          contextHash: cacheKey,
          lat: coordinates.lat,
          lng: coordinates.lng,
          rationaleText: rationale.text,
          keyFactors: JSON.stringify(rationale.factors),
          uniquenessScore: rationale.uniquenessScore,
          contextualElements: JSON.stringify(rationale.contextualElements),
          differentiators: JSON.stringify(rationale.differentiators),
          aiGeneratedInsights: JSON.stringify(rationale.aiGeneratedInsights),
          confidence: rationale.confidence,
          dataCompleteness: rationale.dataCompleteness,
          model: this.MODEL,
          temperature: 1.0, // GPT-5 default - keeping for schema compatibility
          tokensUsed: Math.ceil(rationale.text.length / 4), // Estimate tokens
          expiresAt
        }
      });
    } catch (error) {
      console.error('🚨 [AI Service Error] Diversity cache write failed:', {
        service: 'OpenAIRationaleDiversificationService',
        operation: 'cacheDiverseRationale',
        cacheKey: cacheKey.substring(0, 16) + '...',
        coordinates: `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        impact: 'AI functionality continues without caching'
      });
      // Continue execution without caching - AI functionality should not be blocked by cache issues
    }
  }

  /**
   * Clear expired cache entries (maintenance method)
   */
  async clearExpiredCache(): Promise<number> {
    try {
      // Validate Prisma client before use
      if (!this.prisma || !this.prisma.aIRationaleDiversityCache) {
        console.warn('Prisma client or aIRationaleDiversityCache not available, skipping cache cleanup');
        return 0;
      }

      const result = await this.prisma.aIRationaleDiversityCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });
      
      console.log(`🧹 Cleared ${result.count} expired diversity cache entries`);
      return result.count;
    } catch (error) {
      console.error('Failed to clear expired diversity cache:', error);
      return 0;
    }
  }
}