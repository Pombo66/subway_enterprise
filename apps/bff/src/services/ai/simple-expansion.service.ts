import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface SimpleExpansionRequest {
  region: string;
  existingStores: {
    name: string;
    city: string;
    lat: number;
    lng: number;
    revenue?: number;
  }[];
  targetCount: number;
}

export interface ExpansionSuggestion {
  lat: number;
  lng: number;
  city: string;
  address?: string;
  specificLocation?: string;
  searchQuery?: string;
  nearestExistingStore?: {
    distance: number; // km
    location: string;
  };
  rationale: string;
  confidence: number;
  estimatedRevenue?: number;
  distanceToNearestStore?: number;
  geocoded?: boolean; // Flag to indicate if coordinates came from Mapbox
  usedCityFallback?: boolean; // Flag to indicate if we fell back to city center due to address mismatch
}

export interface SimpleExpansionResult {
  suggestions: ExpansionSuggestion[];
  metadata: {
    model: string;
    tokensUsed: number;
    processingTimeMs: number;
    cost: number;
    existingStoresAnalyzed: number;
  };
}

/**
 * Simple Single-Call Expansion Service
 * Replaces the complex 5-stage pipeline with one GPT call
 */
@Injectable()
export class SimpleExpansionService {
  private readonly logger = new Logger(SimpleExpansionService.name);
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly MODEL = 'gpt-5-mini'; // Upgraded for better geographic reasoning
  private readonly MAX_TOKENS = 16000;

  constructor(private readonly prisma: PrismaClient) {
    this.logger.log('Simple Expansion Service initialized with GPT-5-mini');
  }

  /**
   * Generate expansion suggestions in a single GPT call
   */
  async generateSuggestions(request: SimpleExpansionRequest): Promise<SimpleExpansionResult> {
    const startTime = Date.now();

    if (!this.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Validate targetCount is provided (should be calculated from aggression)
    if (!request.targetCount || request.targetCount <= 0) {
      throw new Error('targetCount must be provided and greater than 0');
    }

    this.logger.log(`Generating ${request.targetCount} suggestions for ${request.region}`);
    this.logger.log(`Analyzing ${request.existingStores.length} existing stores`);

    try {
      // Build the prompt with all store data
      const prompt = this.buildPrompt(request);

      // Single API call to GPT
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.MODEL,
          input: prompt,
          max_output_tokens: this.MAX_TOKENS,
          reasoning: { effort: 'low' }, // Low effort for speed
          text: { 
            verbosity: 'high',
            format: { type: 'json_object' }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const tokensUsed = data.usage?.total_tokens || 0;

      // Extract the response
      const messageOutput = data.output?.find((item: any) => item.type === 'message');
      if (!messageOutput?.content?.[0]?.text) {
        throw new Error('No message output from GPT');
      }

      const textContent = messageOutput.content[0].text;
      const aiResponse = JSON.parse(textContent);

      // Validate and format suggestions (with geocoding)
      const suggestions = await this.parseSuggestions(aiResponse, request);

      const processingTime = Date.now() - startTime;
      const cost = this.estimateCost(tokensUsed);

      this.logger.log(`Generated ${suggestions.length} suggestions in ${processingTime}ms`);
      this.logger.log(`Tokens used: ${tokensUsed}, Cost: £${cost.toFixed(4)}`);

      return {
        suggestions,
        metadata: {
          model: this.MODEL,
          tokensUsed,
          processingTimeMs: processingTime,
          cost,
          existingStoresAnalyzed: request.existingStores.length
        }
      };

    } catch (error) {
      this.logger.error('Simple expansion generation failed:', error);
      throw new Error(`Expansion generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build the prompt with all store data
   */
  private buildPrompt(request: SimpleExpansionRequest): string {
    // Format stores for the prompt (limit to essential info to save tokens)
    const storeList = request.existingStores
      .map(s => `${s.city}, ${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}${s.revenue ? `, €${Math.round(s.revenue/1000)}k` : ''}`)
      .join('\n');

    // Create city-level summary for better awareness
    const cityStoreCounts = new Map<string, number>();
    request.existingStores.forEach(store => {
      const city = store.city || 'Unknown';
      cityStoreCounts.set(city, (cityStoreCounts.get(city) || 0) + 1);
    });
    
    const citySummary = Array.from(cityStoreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20) // Top 20 cities only
      .map(([city, count]) => `${city}: ${count} store${count > 1 ? 's' : ''}`)
      .join(', ');

    return `System: You are a retail expansion strategist analyzing Subway's existing store network in ${request.region}.

Your goal is to identify new city zones and regional opportunities that maximize coverage, minimize overlap, and capture untapped population centers.

STRATEGIC OBJECTIVES:
- Identify regions with moderate-to-high population but low store density
- Suggest clusters near commuter routes, university towns, or tourist areas
- Avoid overlapping with existing store coordinates (use approximate distance logic)

ANALYSIS FRAMEWORK - For each potential new location:
1. Check if the city or region currently has <2 stores
2. Estimate whether population or visitor flow is significant
3. Find plausible sub-locations (city center, train station, university, shopping area)
4. Ensure at least 3-5 km from the nearest existing Subway
5. Use your geographic knowledge of ${request.region} (population centers, tourist areas, commuter belts) to justify each suggestion
6. Provide rationale that references specific local features and real demographic patterns

DISTANCE RULES:
- Use approximate distances between cities to estimate store spacing
- Avoid placing new stores within 2 km of existing ones unless population exceeds 1M
- Consider that major cities can support multiple stores if properly spaced

GENERATION STRATEGY:
Generate suggestions using three different strategic modes, then merge the best:

Mode A (Conservative): Focus on proven city centers with established demand
Mode B (Aggressive): Target high-growth regions and emerging markets  
Mode C (Experimental): Explore emerging suburban zones and university towns

User: Analyze Subway expansion opportunities in ${request.region}.

EXISTING NETWORK SUMMARY:
Total stores: ${request.existingStores.length}
Cities with most stores: ${citySummary}

EXISTING STORES (${request.existingStores.length} locations):
${storeList}

CRITICAL REQUIREMENT - Distance Awareness:
For EACH suggestion, you MUST identify the nearest existing store and calculate distance.
- If nearest store is <5km away: Explain why another store is justified (different catchment, distinct demographics, etc.)
- If nearest store is >5km away: Explain the market gap being filled
- Your rationale MUST reference existing stores to demonstrate awareness

TARGET: Generate ${request.targetCount} high-quality expansion suggestions

LOCATION SPECIFICITY REQUIREMENTS:
- Provide exact street names or landmarks (e.g., "Hauptbahnhof", "Marktplatz", "Porschestraße")
- Avoid vague descriptions (e.g., "near the center", "shopping area")
- Format as: "[Street/Landmark], [City]"
- Examples:
  ✅ "Porschestraße, Wolfsburg"
  ✅ "Hauptbahnhof, Tübingen"
  ✅ "Marienplatz, Munich"
  ❌ "City center, Munich"
  ❌ "Near university, Heidelberg"

OUTPUT FORMAT (JSON):
{
  "suggestions": [
    {
      "city": "<city name>",
      "specificLocation": "<exact street or landmark>",
      "searchQuery": "<full address for geocoding: 'Street/Landmark, City, Germany'>",
      "nearestExistingStore": {
        "distance": <distance in km to nearest store>,
        "location": "<city or area of nearest store>"
      },
      "rationale": "<detailed explanation that MUST reference nearest existing store and justify the new location>",
      "confidence": <0.0-1.0>,
      "estimatedRevenue": <annual revenue estimate in euros>
    }
  ],
  "analysis": {
    "marketGaps": "<summary of identified gaps>",
    "recommendations": "<strategic recommendations>"
  }
}

Provide ${request.targetCount} strategically diverse suggestions with context-aware rationale.`;
  }

  /**
   * Parse and validate GPT suggestions with geocoding
   */
  private async parseSuggestions(
    aiResponse: any,
    request: SimpleExpansionRequest
  ): Promise<ExpansionSuggestion[]> {
    if (!aiResponse.suggestions || !Array.isArray(aiResponse.suggestions)) {
      throw new Error('Invalid response format: missing suggestions array');
    }

    const suggestions: ExpansionSuggestion[] = [];

    for (const suggestion of aiResponse.suggestions) {
      const claimedCity = suggestion.city || 'Unknown';
      const searchQuery = suggestion.searchQuery || `${suggestion.specificLocation || claimedCity}, ${claimedCity}, Germany`;
      
      // Geocode the address to get accurate coordinates
      let geocoded = await this.geocodeAddress(searchQuery, claimedCity);
      let usedCityFallback = false;
      
      // If geocoding failed or city mismatch, try fallback to city center
      if (!geocoded || !geocoded.cityMatch) {
        if (geocoded && !geocoded.cityMatch) {
          this.logger.warn(`⚠️ City mismatch detected for "${searchQuery}"`);
          this.logger.warn(`   GPT claimed: "${claimedCity}", Mapbox found: "${geocoded.actualCity}"`);
          this.logger.warn(`   Falling back to city center: "${claimedCity}, Germany"`);
        }
        
        // Try geocoding just the city name
        const cityFallback = await this.geocodeAddress(`${claimedCity}, Germany`, claimedCity);
        
        if (cityFallback && cityFallback.cityMatch) {
          geocoded = cityFallback;
          usedCityFallback = true;
          this.logger.log(`✅ Using city center fallback for ${claimedCity}`);
        } else if (!geocoded) {
          this.logger.warn(`❌ Skipping suggestion - geocoding failed: "${searchQuery}"`);
          continue;
        }
        // If we have geocoded result but no fallback worked, we'll use the original (with flag)
      }

      const { lat, lng, actualCity } = geocoded;
      
      // Use the actual geocoded city name
      const city = actualCity;

      // Validate coordinates are in reasonable range
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        this.logger.warn(`Skipping suggestion with out-of-range coordinates: ${lat}, ${lng}`);
        continue;
      }

      // Validate minimum distance from existing stores (using accurate coordinates)
      const nearestDistance = this.calculateNearestStoreDistance(
        lat,
        lng,
        request.existingStores
      );

      if (nearestDistance < 500) {
        this.logger.warn(`Skipping suggestion too close to existing store: ${nearestDistance}m at "${searchQuery}"`);
        continue;
      }

      suggestions.push({
        lat,
        lng,
        city,
        address: suggestion.specificLocation || suggestion.address,
        specificLocation: suggestion.specificLocation,
        searchQuery,
        nearestExistingStore: suggestion.nearestExistingStore,
        rationale: suggestion.rationale || 'AI-generated location',
        confidence: Math.min(1, Math.max(0, suggestion.confidence || 0.7)),
        estimatedRevenue: suggestion.estimatedRevenue,
        distanceToNearestStore: nearestDistance,
        geocoded: true,
        usedCityFallback
      });
    }

    this.logger.log(`✅ Geocoded and validated ${suggestions.length}/${aiResponse.suggestions.length} suggestions`);

    return suggestions;
  }

  /**
   * Calculate distance to nearest existing store
   */
  private calculateNearestStoreDistance(
    lat: number,
    lng: number,
    existingStores: { lat: number; lng: number }[]
  ): number {
    let minDistance = Infinity;

    for (const store of existingStores) {
      const distance = this.haversineDistance(lat, lng, store.lat, store.lng);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance;
  }

  /**
   * Geocode an address using Mapbox with city verification
   */
  private async geocodeAddress(searchQuery: string, expectedCity: string): Promise<{ lat: number; lng: number; actualCity: string; geocoded: boolean; cityMatch: boolean } | null> {
    const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
    
    if (!MAPBOX_TOKEN) {
      this.logger.warn('MAPBOX_ACCESS_TOKEN not configured, skipping geocoding');
      return null;
    }

    try {
      // Try specific address first
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&country=DE&limit=1`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [lng, lat] = feature.center;
        
        // Extract actual city name from Mapbox response
        const actualCity = this.extractCityFromMapboxFeature(feature);
        
        // Verify city matches what GPT claimed
        const cityMatch = this.verifyCityMatch(expectedCity, actualCity);
        
        if (!cityMatch) {
          this.logger.warn(`⚠️ CITY MISMATCH: GPT claimed "${expectedCity}" but geocoded to "${actualCity}"`);
          this.logger.warn(`   Query: "${searchQuery}"`);
          this.logger.warn(`   Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } else {
          this.logger.log(`✅ Geocoded: "${searchQuery}" → ${actualCity} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
        
        return { lat, lng, actualCity, geocoded: true, cityMatch };
      }

      // No results found
      this.logger.warn(`⚠️ No geocoding results for: "${searchQuery}"`);
      return null;
      
    } catch (error) {
      this.logger.error(`Geocoding failed for "${searchQuery}":`, error);
      return null;
    }
  }

  /**
   * Extract city name from Mapbox feature
   */
  private extractCityFromMapboxFeature(feature: any): string {
    // Mapbox context array contains place hierarchy
    // Look for 'place' type which represents city/town
    if (feature.context) {
      const placeContext = feature.context.find((ctx: any) => ctx.id.startsWith('place.'));
      if (placeContext) {
        return placeContext.text;
      }
    }
    
    // Fallback to place_name or text
    if (feature.place_type?.includes('place')) {
      return feature.text;
    }
    
    // Last resort: extract from place_name
    const placeName = feature.place_name || '';
    const parts = placeName.split(',').map((p: string) => p.trim());
    return parts[0] || 'Unknown';
  }

  /**
   * Verify if two city names match (accounting for variations)
   */
  private verifyCityMatch(expected: string, actual: string): boolean {
    const normalize = (str: string) => str.toLowerCase().trim().replace(/[^a-z]/g, '');
    return normalize(expected) === normalize(actual);
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Estimate cost based on tokens used
   */
  private estimateCost(tokens: number): number {
    // GPT-5-nano pricing (example - adjust based on actual pricing)
    const inputTokensPerMillion = 0.50; // $0.50 per 1M input tokens
    const outputTokensPerMillion = 1.50; // $1.50 per 1M output tokens
    
    // Assume 70% input, 30% output
    const inputTokens = tokens * 0.7;
    const outputTokens = tokens * 0.3;
    
    const costUSD = (inputTokens * inputTokensPerMillion / 1000000) + 
                   (outputTokens * outputTokensPerMillion / 1000000);
    
    return costUSD * 0.8; // Convert to GBP (approximate)
  }
}
