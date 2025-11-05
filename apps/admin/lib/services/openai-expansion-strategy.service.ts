import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

// Types for OpenAI Strategy Layer
export interface StrategyAnalysisInput {
  candidates: EnhancedCandidate[];
  existingStores: Store[];
  regionData: RegionAnalysis;
  targetCount: number;
}

export interface EnhancedCandidate {
  id: string;
  name: string;
  lat: number;
  lng: number;
  population: number;
  nearestStoreDistance: number; // in meters
  anchorCount: number;
  peerPerformanceScore: number; // 0-1 normalized
  stateCode: string;
  candidateType: 'settlement' | 'h3_explore' | 'hybrid';
  confidence: number;
  totalScore: number;
}

export interface Store {
  id: string;
  latitude: number;
  longitude: number;
  state: string;
  annualTurnover?: number;
}

export interface RegionAnalysis {
  country: string;
  totalStores: number;
  averageStoreDistance: number;
  stateDistribution: Record<string, number>;
}

export interface SelectedLocation {
  name: string;
  lat: number;
  lng: number;
  rationale: string;
}

export interface StrategyResponse {
  selected: SelectedLocation[];
  summary: {
    selectedCount: number;
    stateDistribution: Record<string, number>;
    keyDrivers: string[];
  };
}

export interface StrategyPromptData {
  candidates: Array<{
    name: string;
    lat: number;
    lng: number;
    population: number;
    nearestStoreDistance: number;
    anchorCount: number;
    peerPerformanceScore: number;
    stateCode: string;
  }>;
  existingStores: Array<{
    lat: number;
    lng: number;
    state: string;
  }>;
  targetCount: number;
}

export interface OpenAIStrategyConfig {
  model: string;
  reasoningEffort: 'minimal' | 'low' | 'medium' | 'high';
  textVerbosity: 'low' | 'medium' | 'high';
  maxTokens: number;
  targetSelections: number;
  promptTemplate: string;
  fallbackToDeterministic: boolean;
  retryAttempts: number;
  timeoutMs: number;
}

export class OpenAIExpansionStrategyService {
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly MODEL = process.env.EXPANSION_OPENAI_MODEL || 'gpt-5-mini';
  private readonly REASONING_EFFORT: 'minimal' | 'low' | 'medium' | 'high' = 'medium'; // Strategic analysis needs medium reasoning
  private readonly TEXT_VERBOSITY: 'low' | 'medium' | 'high' = 'medium'; // Balanced output for rationales
  private readonly MAX_TOKENS = parseInt(process.env.EXPANSION_OPENAI_MAX_TOKENS || '4000');
  private readonly RETRY_ATTEMPTS = parseInt(process.env.EXPANSION_OPENAI_RETRY_ATTEMPTS || '3');
  private readonly TIMEOUT_MS = parseInt(process.env.EXPANSION_OPENAI_TIMEOUT_MS || '30000');
  private readonly FALLBACK_ENABLED = process.env.EXPANSION_OPENAI_FALLBACK_ENABLED !== 'false';
  
  // Cache and statistics
  private cacheHits = 0;
  private cacheMisses = 0;
  private apiCalls = 0;
  private totalTokensUsed = 0;
  private apiErrors = 0;
  private fallbackUsed = 0;

  constructor(private readonly prisma: PrismaClient) {
    console.log('🤖 OpenAI Strategy Layer initialized:', {
      MODEL: this.MODEL,
      REASONING_EFFORT: this.REASONING_EFFORT,
      TEXT_VERBOSITY: this.TEXT_VERBOSITY,
      MAX_TOKENS: this.MAX_TOKENS,
      RETRY_ATTEMPTS: this.RETRY_ATTEMPTS,
      TIMEOUT_MS: this.TIMEOUT_MS,
      FALLBACK_ENABLED: this.FALLBACK_ENABLED,
      API_KEY_CONFIGURED: !!this.OPENAI_API_KEY,
      API_KEY_PREFIX: this.OPENAI_API_KEY?.substring(0, 10) || 'NONE'
    });
  }

  /**
   * Main method to select locations using OpenAI Strategy Layer
   */
  async selectLocations(input: StrategyAnalysisInput): Promise<StrategyResponse> {
    console.log(`🤖 OpenAI Strategy Layer analyzing ${input.candidates.length} candidates for ${input.targetCount} selections...`);
    
    // Check if OpenAI is configured
    console.log(`🔍 OpenAI API Key check: ${this.OPENAI_API_KEY ? 'SET' : 'NOT SET'} (length: ${this.OPENAI_API_KEY?.length || 0})`);
    if (!this.OPENAI_API_KEY) {
      if (this.FALLBACK_ENABLED) {
        console.warn('⚠️  OpenAI API key not configured, falling back to deterministic selection');
        return this.fallbackToDeterministicSelection(input);
      } else {
        throw new Error('OpenAI API key not configured and fallback is disabled');
      }
    }

    // Check cache first (temporarily disabled for testing)
    // const cacheKey = this.generateCacheKey(input);
    // const cached = await this.getFromCache(cacheKey);
    // if (cached) {
    //   this.cacheHits++;
    //   console.log('✅ Using cached OpenAI strategy response');
    //   return cached;
    // }

    this.cacheMisses++;

    // Prepare data for AI analysis
    const promptData = this.preparePromptData(input);
    
    // Execute OpenAI API call with retry logic
    try {
      const response = await this.callOpenAIWithRetry(promptData);
      
      // Validate and parse JSON response
      const parsed = this.validateAndParseResponse(response, input);
      
      // Apply post-selection guardrails
      const validated = this.applyPostSelectionGuardrails(parsed, input);
      
      // Cache the result (temporarily disabled for testing)
      // await this.cacheResponse(cacheKey, validated);
      
      console.log(`✅ OpenAI Strategy Layer selected ${validated.selected.length} locations`);
      return validated;
      
    } catch (error) {
      this.apiErrors++;
      console.error('❌ OpenAI Strategy Layer error:', error);
      
      if (this.FALLBACK_ENABLED) {
        console.warn('⚠️  Falling back to deterministic selection due to OpenAI error');
        this.fallbackUsed++;
        return this.fallbackToDeterministicSelection(input);
      } else {
        throw error;
      }
    }
  }

  /**
   * Prepare structured data for AI analysis
   */
  private preparePromptData(input: StrategyAnalysisInput): StrategyPromptData {
    const candidates = input.candidates.map(candidate => ({
      name: candidate.name,
      lat: candidate.lat,
      lng: candidate.lng,
      population: candidate.population,
      nearestStoreDistance: Math.round(candidate.nearestStoreDistance / 1000 * 10) / 10, // Convert to km with 1 decimal
      anchorCount: candidate.anchorCount,
      peerPerformanceScore: Math.round(candidate.peerPerformanceScore * 100) / 100, // Round to 2 decimals
      stateCode: candidate.stateCode
    }));

    const existingStores = input.existingStores.map(store => ({
      lat: store.latitude,
      lng: store.longitude,
      state: store.state
    }));

    return {
      candidates,
      existingStores,
      targetCount: input.targetCount
    };
  }

  /**
   * Execute OpenAI API call with retry logic and exponential backoff
   */
  private async callOpenAIWithRetry(promptData: StrategyPromptData): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`   Attempt ${attempt}/${this.RETRY_ATTEMPTS}: Calling OpenAI API...`);
        
        const response = await this.callOpenAI(promptData);
        this.apiCalls++;
        return response;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`   Attempt ${attempt} failed:`, error);
        
        // Check if it's a rate limit error
        if (error instanceof Error && error.message.includes('rate_limit')) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`   Rate limited, waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        } else if (attempt < this.RETRY_ATTEMPTS) {
          // For other errors, wait a shorter time
          const delay = attempt * 1000; // Linear backoff: 1s, 2s, 3s
          console.log(`   Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Execute single OpenAI API call
   */
  private async callOpenAI(promptData: StrategyPromptData): Promise<string> {
    // Development mode: Use mock response if API key is placeholder
    if (this.OPENAI_API_KEY === 'sk-your-openai-api-key-here' || this.OPENAI_API_KEY === 'mock') {
      console.log('🧪 Using mock OpenAI response for development');
      return this.generateMockResponse(promptData);
    }
    const prompt = this.buildSubwayStrategistPrompt(promptData);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
    
    try {
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
              input: `System: You are the Subway Expansion Strategist AI. You analyze market data and make strategic location decisions for restaurant expansion. Always respond with valid JSON in the exact format requested.\n\nUser: ${prompt}`,
              max_output_tokens: this.MAX_TOKENS,
              reasoning: { effort: this.REASONING_EFFORT },
              text: { verbosity: this.TEXT_VERBOSITY }
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
          }

          const data = await response.json();
          
          // GPT-5 Responses API has a different structure
          if (!data.output || !Array.isArray(data.output)) {
            throw new Error('No response from OpenAI');
          }

          // Find the message output (type: "message")
          const messageOutput = data.output.find((item: any) => item.type === 'message');
          if (!messageOutput || !messageOutput.content || !messageOutput.content[0]) {
            throw new Error('No message content in OpenAI response');
          }

          return data;
        },
        'expansion-strategy'
      );

      // Extract text from GPT-5 Responses API structure
      const messageOutput = result.output.find((item: any) => item.type === 'message');
      const responseText = messageOutput.content[0].text.trim();
      const tokensUsed = result.usage?.total_tokens || 0;
      this.totalTokensUsed += tokensUsed;

      console.log(`   OpenAI API success: ${tokensUsed} tokens used`);
      return responseText;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`OpenAI API timeout after ${this.TIMEOUT_MS}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Build the Subway Expansion Strategist AI prompt with exact specification
   */
  private buildSubwayStrategistPrompt(promptData: StrategyPromptData): string {
    const candidateDataJson = JSON.stringify(promptData, null, 2);
    
    return `You are the Subway Expansion Strategist AI.

Your goal is to identify the strongest new Subway store locations across Germany using structured market data. You must act as both a data analyst and retail strategist — balancing population potential, market gaps, anchor presence, and regional fairness.

Evaluate each settlement using these key factors:
- Population size and growth potential
- Distance to nearest existing Subway stores (GREATER distance = BETTER to avoid cannibalization)
- Anchor density (shopping centres, transport hubs, grocers)
- Peer store performance and turnover
- Regional saturation (avoid over-represented states)
- Data completeness and confidence level

Select the most promising settlements for expansion, ensuring:
- Geographic balance across German states
- Realistic commercial clustering (urban and suburban mix)
- Strategic growth alignment with Subway's footprint doubling objective
- ${promptData.targetCount} target locations in total

Output your results in structured JSON:
{
  "selected": [
    {
      "name": "Heidelberg",
      "lat": 49.3988,
      "lng": 8.6724,
      "rationale": "High population (160k), strong anchor network (12 POIs), 14km nearest store gap, and strong peer turnover performance."
    }
  ],
  "summary": {
    "selectedCount": ${promptData.targetCount},
    "stateDistribution": { "Bavaria": 75, "NRW": 80, "Hesse": 60 },
    "keyDrivers": ["population_gap", "anchor_density", "peer_performance"]
  }
}

Candidate Data:
${candidateDataJson}`;
  }

  /**
   * Validate and parse OpenAI JSON response
   */
  private validateAndParseResponse(responseText: string, input: StrategyAnalysisInput): StrategyResponse {
    try {
      // Extract JSON from response (handle cases where AI adds explanation text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in OpenAI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required structure
      if (!parsed.selected || !Array.isArray(parsed.selected)) {
        throw new Error('Invalid response: missing or invalid "selected" array');
      }
      
      if (!parsed.summary || typeof parsed.summary !== 'object') {
        throw new Error('Invalid response: missing or invalid "summary" object');
      }
      
      // Validate each selected location
      for (const location of parsed.selected) {
        if (!location.name || typeof location.name !== 'string') {
          throw new Error('Invalid selected location: missing or invalid "name"');
        }
        if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
          throw new Error('Invalid selected location: missing or invalid coordinates');
        }
        if (!location.rationale || typeof location.rationale !== 'string') {
          throw new Error('Invalid selected location: missing or invalid "rationale"');
        }
      }
      
      // Validate summary
      if (typeof parsed.summary.selectedCount !== 'number') {
        throw new Error('Invalid summary: missing or invalid "selectedCount"');
      }
      
      if (!parsed.summary.stateDistribution || typeof parsed.summary.stateDistribution !== 'object') {
        throw new Error('Invalid summary: missing or invalid "stateDistribution"');
      }
      
      if (!parsed.summary.keyDrivers || !Array.isArray(parsed.summary.keyDrivers)) {
        throw new Error('Invalid summary: missing or invalid "keyDrivers"');
      }
      
      console.log(`   Parsed ${parsed.selected.length} selected locations from OpenAI response`);
      
      // Debug: Log first few rationales to check for uniqueness
      parsed.selected.slice(0, 3).forEach((location: any, index: number) => {
        console.log(`   🤖 Location ${index + 1} (${location.name}): ${location.rationale.substring(0, 60)}...`);
      });
      
      return parsed as StrategyResponse;
      
    } catch (error) {
      console.error('Failed to parse OpenAI response:', responseText);
      throw new Error(`JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply post-selection guardrails and validation
   */
  private applyPostSelectionGuardrails(response: StrategyResponse, input: StrategyAnalysisInput): StrategyResponse {
    console.log('   Applying post-selection guardrails...');
    
    // Validate geographic coordinates are within expected bounds
    const validatedSelections = response.selected.filter(location => {
      // Germany bounds check (approximate)
      if (location.lat < 47.0 || location.lat > 55.0 || location.lng < 5.0 || location.lng > 16.0) {
        console.warn(`   Filtered out location outside Germany bounds: ${location.name} (${location.lat}, ${location.lng})`);
        return false;
      }
      
      // Check if location corresponds to an actual candidate
      const matchingCandidate = input.candidates.find(candidate => 
        Math.abs(candidate.lat - location.lat) < 0.01 && 
        Math.abs(candidate.lng - location.lng) < 0.01
      );
      
      if (!matchingCandidate) {
        console.warn(`   Filtered out location not matching any candidate: ${location.name}`);
        return false;
      }
      
      return true;
    });
    
    // Ensure we don't exceed target count
    const finalSelections = validatedSelections.slice(0, input.targetCount);
    
    // Recalculate state distribution based on validated selections
    const stateDistribution: Record<string, number> = {};
    finalSelections.forEach(location => {
      const matchingCandidate = input.candidates.find(candidate => 
        Math.abs(candidate.lat - location.lat) < 0.01 && 
        Math.abs(candidate.lng - location.lng) < 0.01
      );
      
      if (matchingCandidate) {
        const state = matchingCandidate.stateCode;
        stateDistribution[state] = (stateDistribution[state] || 0) + 1;
      }
    });
    
    console.log(`   Guardrails applied: ${response.selected.length} → ${finalSelections.length} locations`);
    console.log(`   State distribution:`, stateDistribution);
    
    return {
      selected: finalSelections,
      summary: {
        selectedCount: finalSelections.length,
        stateDistribution,
        keyDrivers: response.summary.keyDrivers
      }
    };
  }

  /**
   * Fallback to deterministic selection when OpenAI is unavailable
   */
  private fallbackToDeterministicSelection(input: StrategyAnalysisInput): StrategyResponse {
    console.log('🔄 Using deterministic fallback selection...');
    
    // Sort candidates by total score (highest first)
    const sortedCandidates = [...input.candidates].sort((a, b) => b.totalScore - a.totalScore);
    
    // Apply geographic balance - limit per state
    const maxPerState = Math.ceil(input.targetCount / 16); // Germany has 16 states
    const stateCount: Record<string, number> = {};
    const selected: SelectedLocation[] = [];
    
    for (const candidate of sortedCandidates) {
      if (selected.length >= input.targetCount) break;
      
      const currentStateCount = stateCount[candidate.stateCode] || 0;
      if (currentStateCount >= maxPerState) continue; // Skip if state quota exceeded
      
      selected.push({
        name: candidate.name,
        lat: candidate.lat,
        lng: candidate.lng,
        rationale: this.generateDeterministicRationale(candidate)
      });
      
      stateCount[candidate.stateCode] = currentStateCount + 1;
    }
    
    // If we still need more selections, fill without state limits
    if (selected.length < input.targetCount) {
      const selectedIds = new Set(selected.map(s => `${s.lat},${s.lng}`));
      
      for (const candidate of sortedCandidates) {
        if (selected.length >= input.targetCount) break;
        
        const candidateId = `${candidate.lat},${candidate.lng}`;
        if (selectedIds.has(candidateId)) continue;
        
        selected.push({
          name: candidate.name,
          lat: candidate.lat,
          lng: candidate.lng,
          rationale: this.generateDeterministicRationale(candidate)
        });
        
        stateCount[candidate.stateCode] = (stateCount[candidate.stateCode] || 0) + 1;
      }
    }
    
    console.log(`   Deterministic selection: ${selected.length} locations selected`);
    
    return {
      selected,
      summary: {
        selectedCount: selected.length,
        stateDistribution: stateCount,
        keyDrivers: ['total_score', 'geographic_balance', 'deterministic_fallback']
      }
    };
  }

  /**
   * Generate rationale for deterministic selection
   */
  private generateDeterministicRationale(candidate: EnhancedCandidate): string {
    const population = Math.round(candidate.population / 1000);
    const distance = Math.round(candidate.nearestStoreDistance / 1000 * 10) / 10;
    const score = Math.round(candidate.totalScore * 100);
    
    return `${candidate.name}: Population ${population}k, ${distance}km gap to nearest store, ${candidate.anchorCount} anchor POIs, ${score}% overall score. Selected via deterministic ranking.`;
  }

  /**
   * Generate cache key for strategy analysis
   */
  private generateCacheKey(input: StrategyAnalysisInput): string {
    const candidateIds = input.candidates
      .map(c => `${c.id}:${c.totalScore.toFixed(3)}`)
      .sort()
      .join(',');
    
    const key = [
      candidateIds,
      input.targetCount,
      this.MODEL,
      this.REASONING_EFFORT,
      this.TEXT_VERBOSITY
    ].join('|');
    
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * Get cached response
   */
  private async getFromCache(cacheKey: string): Promise<StrategyResponse | null> {
    try {
      const cached = await this.prisma.openAIStrategyCache.findUnique({
        where: { cacheKey }
      });

      if (!cached) return null;

      // Check expiration (24 hours for strategy decisions)
      const expirationHours = 24;
      const expirationTime = new Date(cached.createdAt.getTime() + expirationHours * 60 * 60 * 1000);
      
      if (new Date() > expirationTime) {
        await this.prisma.openAIStrategyCache.delete({ where: { id: cached.id } });
        return null;
      }

      return JSON.parse(cached.responseData) as StrategyResponse;
    } catch (error) {
      console.error('Cache lookup error:', error);
      return null;
    }
  }

  /**
   * Cache strategy response
   */
  private async cacheResponse(cacheKey: string, response: StrategyResponse): Promise<void> {
    try {
      await this.prisma.openAIStrategyCache.create({
        data: {
          cacheKey,
          responseData: JSON.stringify(response),
          model: this.MODEL,
          temperature: 1.0, // GPT-5 default - keeping for schema compatibility
          candidateCount: response.selected.length,
          tokensUsed: this.totalTokensUsed
        }
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  /**
   * Utility method for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service statistics
   */
  getCacheStats() {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
    
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      apiCalls: this.apiCalls,
      totalTokensUsed: this.totalTokensUsed,
      apiErrors: this.apiErrors,
      fallbackUsed: this.fallbackUsed
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.apiCalls = 0;
    this.totalTokensUsed = 0;
    this.apiErrors = 0;
    this.fallbackUsed = 0;
  }

  /**
   * Generate mock OpenAI response for development/testing
   */
  private generateMockResponse(promptData: StrategyPromptData): string {
    // Select top candidates based on a mix of population and distance
    const scoredCandidates = promptData.candidates.map(candidate => ({
      ...candidate,
      score: (candidate.population / 100000) * 0.4 + 
             (candidate.nearestStoreDistance / 20) * 0.3 + 
             (candidate.anchorCount / 10) * 0.2 + 
             candidate.peerPerformanceScore * 0.1
    }));
    
    // Sort by score and select top candidates
    const topCandidates = scoredCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(promptData.targetCount, promptData.candidates.length));
    
    // Create state distribution
    const stateDistribution: Record<string, number> = {};
    topCandidates.forEach(candidate => {
      stateDistribution[candidate.stateCode] = (stateDistribution[candidate.stateCode] || 0) + 1;
    });
    
    // Generate mock response
    const mockResponse = {
      selected: topCandidates.map(candidate => ({
        name: candidate.name,
        lat: candidate.lat,
        lng: candidate.lng,
        rationale: `Strategic analysis: Population ${Math.round(candidate.population/1000)}k provides strong market base, ${candidate.nearestStoreDistance.toFixed(1)}km gap to nearest store creates demand opportunity, ${candidate.anchorCount} anchor POIs drive foot traffic, ${Math.round(candidate.peerPerformanceScore*100)}% peer performance indicates viable market conditions.`
      })),
      summary: {
        selectedCount: topCandidates.length,
        stateDistribution,
        keyDrivers: ["population_density", "market_gap", "anchor_presence", "peer_performance"]
      }
    };
    
    return JSON.stringify(mockResponse, null, 2);
  }
}