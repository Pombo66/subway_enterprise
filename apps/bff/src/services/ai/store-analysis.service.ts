import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { fetch, Agent } from 'undici';

export interface StoreAnalysisRequest {
  region: string;
  stores: {
    id: string;
    name: string;
    city: string;
    lat: number;
    lng: number;
    revenue: number;
    openDate?: Date;
    franchiseeName?: string;
    franchiseeExperience?: number;
    franchiseeStoreCount?: number;
  }[];
  model?: 'gpt-5.2' | 'gpt-5-mini';
}

export interface StoreAnalysisResult {
  storeId: string;
  storeName: string;
  locationQualityScore: number; // 0-100
  locationRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  locationStrengths: string[];
  locationWeaknesses: string[];
  expectedRevenue: number;
  actualRevenue: number;
  performanceGap: number;
  performanceGapPercent: number;
  primaryFactor: 'LOCATION' | 'FRANCHISEE' | 'MARKET' | 'BALANCED';
  franchiseeRating?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  franchiseeStrengths?: string[];
  franchiseeConcerns?: string[];
  recommendationPriority: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendations: string[];
  estimatedImpact?: number;
}

export interface StoreAnalysisResponse {
  analyses: StoreAnalysisResult[];
  metadata: {
    model: string;
    tokensUsed: number;
    processingTimeMs: number;
    cost: number;
    storesAnalyzed: number;
  };
  summary?: {
    overallInsights: string;
    criticalStores: number;
    opportunityStores: number;
  };
}

/**
 * Simple Single-Call Store Analysis Service
 * Analyzes existing store performance using one GPT call
 */
@Injectable()
export class StoreAnalysisService {
  private readonly logger = new Logger(StoreAnalysisService.name);
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly DEFAULT_MODEL = 'gpt-5-mini';
  private readonly MAX_OUTPUT_TOKENS = 64000;

  constructor(private readonly prisma: PrismaClient) {
    this.logger.log('Store Analysis Service initialized (supports GPT-5.2 and GPT-5-mini)');
  }

  /**
   * Analyze stores in a single GPT call
   */
  async analyzeStores(request: StoreAnalysisRequest): Promise<StoreAnalysisResponse> {
    const startTime = Date.now();

    if (!this.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const model = request.model || this.DEFAULT_MODEL;

    this.logger.log(`Analyzing ${request.stores.length} stores in ${request.region}`);
    this.logger.log(`Using model: ${model}`);

    try {
      const prompt = this.buildPrompt(request);

      // Create custom agent with extended timeouts
      const agent = new Agent({
        headersTimeout: 600000,
        bodyTimeout: 600000,
        connectTimeout: 60000
      });

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          input: prompt,
          max_output_tokens: this.MAX_OUTPUT_TOKENS,
          reasoning: { effort: 'low' },
          text: { 
            verbosity: 'high',
            format: { type: 'json_object' }
          }
        }),
        dispatcher: agent
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`OpenAI API error: ${response.status}`);
        this.logger.error(`Response body: ${errorText}`);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data: any = await response.json();
      const tokensUsed = data.usage?.total_tokens || 0;

      const messageOutput = data.output?.find((item: any) => item.type === 'message');
      if (!messageOutput?.content?.[0]?.text) {
        this.logger.error('No message output from GPT');
        throw new Error('No message output from GPT');
      }

      const textContent = messageOutput.content[0].text;
      const aiResponse = JSON.parse(textContent);

      const analyses = this.parseAnalyses(aiResponse, request);
      const processingTime = Date.now() - startTime;
      const cost = this.estimateCost(tokensUsed);

      this.logger.log(`Analyzed ${analyses.length} stores in ${processingTime}ms`);
      this.logger.log(`Tokens used: ${tokensUsed}, Cost: £${cost.toFixed(4)}`);

      return {
        analyses,
        metadata: {
          model,
          tokensUsed,
          processingTimeMs: processingTime,
          cost,
          storesAnalyzed: analyses.length
        },
        summary: aiResponse.summary
      };

    } catch (error) {
      this.logger.error('Store analysis failed:', error);
      throw new Error(`Store analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildPrompt(request: StoreAnalysisRequest): string {
    const storeList = request.stores.map(s => {
      const franchiseeInfo = s.franchiseeName 
        ? `Franchisee: ${s.franchiseeName} (${s.franchiseeExperience || 0}y exp, ${s.franchiseeStoreCount || 1} stores)`
        : 'Franchisee: Unknown';
      
      return `Store: ${s.name}, ${s.city} (${s.lat.toFixed(4)}, ${s.lng.toFixed(4)})
Revenue: €${Math.round(s.revenue/1000)}k/year
${franchiseeInfo}
ID: ${s.id}`;
    }).join('\n\n');

    return `System: You are a retail performance analyst specializing in Subway restaurant locations.

Your goal is to analyze existing store performance by evaluating:
1. Location Quality - inherent potential of the location
2. Performance Gap - actual vs expected revenue
3. Root Cause - whether issues stem from location, franchisee, or market factors
4. Recommendations - specific, actionable improvements

ANALYSIS FRAMEWORK:

For each store, assess:

LOCATION QUALITY (0-100):
- Demographics: Population density, income levels, age distribution
- Accessibility: Foot traffic, parking, public transport
- Competition: Nearby competitors, market saturation
- Visibility: Street presence, signage opportunities
- Context: Residential, commercial, tourist, commuter area

PERFORMANCE ANALYSIS:
- Expected Revenue: What should this location generate based on its quality?
- Actual Revenue: Current performance
- Gap Analysis: Is it over/underperforming and by how much?

ROOT CAUSE IDENTIFICATION:
- LOCATION: Poor site selection, high competition, low foot traffic
- FRANCHISEE: Operational issues, service quality, management
- MARKET: Economic downturn, demographic shifts, external factors
- BALANCED: Multiple contributing factors

RECOMMENDATIONS:
- HIGH Priority: Urgent action needed (>20% underperformance)
- MEDIUM Priority: Improvement opportunity (10-20% gap)
- LOW Priority: Minor optimizations (<10% gap)

STORES TO ANALYZE (${request.stores.length} locations in ${request.region}):

${storeList}

OUTPUT FORMAT (JSON):
{
  "analyses": [
    {
      "storeId": "<store ID>",
      "storeName": "<store name>",
      "locationQualityScore": 0-100,
      "locationRating": "EXCELLENT" | "GOOD" | "FAIR" | "POOR",
      "locationStrengths": ["strength 1", "strength 2"],
      "locationWeaknesses": ["weakness 1", "weakness 2"],
      "expectedRevenue": <number in euros>,
      "actualRevenue": <number in euros>,
      "performanceGap": <actual - expected>,
      "performanceGapPercent": <(actual - expected) / expected * 100>,
      "primaryFactor": "LOCATION" | "FRANCHISEE" | "MARKET" | "BALANCED",
      "franchiseeRating": "EXCELLENT" | "GOOD" | "FAIR" | "POOR",
      "franchiseeStrengths": ["strength 1"],
      "franchiseeConcerns": ["concern 1"],
      "recommendationPriority": "HIGH" | "MEDIUM" | "LOW",
      "recommendations": ["action 1", "action 2"],
      "estimatedImpact": <potential revenue increase in euros>
    }
  ],
  "summary": {
    "overallInsights": "<brief summary of key findings>",
    "criticalStores": <count of HIGH priority stores>,
    "opportunityStores": <count with high potential for improvement>
  }
}

Provide detailed, actionable analysis for all ${request.stores.length} stores.`;
  }

  private parseAnalyses(aiResponse: any, request: StoreAnalysisRequest): StoreAnalysisResult[] {
    if (!aiResponse.analyses || !Array.isArray(aiResponse.analyses)) {
      throw new Error('Invalid response format: missing analyses array');
    }

    return aiResponse.analyses.map((analysis: any) => ({
      storeId: analysis.storeId,
      storeName: analysis.storeName,
      locationQualityScore: Math.min(100, Math.max(0, analysis.locationQualityScore || 50)),
      locationRating: analysis.locationRating || 'FAIR',
      locationStrengths: Array.isArray(analysis.locationStrengths) ? analysis.locationStrengths : [],
      locationWeaknesses: Array.isArray(analysis.locationWeaknesses) ? analysis.locationWeaknesses : [],
      expectedRevenue: analysis.expectedRevenue || 0,
      actualRevenue: analysis.actualRevenue || 0,
      performanceGap: analysis.performanceGap || 0,
      performanceGapPercent: analysis.performanceGapPercent || 0,
      primaryFactor: analysis.primaryFactor || 'BALANCED',
      franchiseeRating: analysis.franchiseeRating,
      franchiseeStrengths: analysis.franchiseeStrengths,
      franchiseeConcerns: analysis.franchiseeConcerns,
      recommendationPriority: analysis.recommendationPriority || 'MEDIUM',
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
      estimatedImpact: analysis.estimatedImpact
    }));
  }

  private estimateCost(tokens: number): number {
    const inputTokens = tokens * 0.7;
    const outputTokens = tokens * 0.3;
    const costUSD = (inputTokens * 0.15 / 1000000) + (outputTokens * 0.60 / 1000000);
    return costUSD * 0.8; // Convert to GBP
  }
}
