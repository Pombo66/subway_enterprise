import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AIModelConfigService, ModelConfig } from './ai-model-config.service';
import { StoreContextBuilderService, StoreContext } from './store-context-builder.service';
import { fetch, Agent } from 'undici';

export interface StoreAnalysisRequest {
  storeId: string;
  premium?: boolean; // Request premium analysis with better model
  includeRecommendations?: boolean;
  includePeerBenchmark?: boolean;
  includeRevenuePrediction?: boolean;
}

export interface StoreAnalysisResult {
  storeId: string;
  storeName: string;
  analysisDate: string;
  
  // Peer Benchmarking
  peerBenchmark?: {
    selectedPeers: Array<{
      storeId: string;
      city: string;
      revenue: number;
      similarity: number;
      selectionReason: string;
    }>;
    peerAverage: number;
    performanceGap: number;
    performanceGapPercent: number;
    ranking: string;
    significance: string;
  };
  
  // Root Cause Analysis
  rootCause: {
    primaryFactor: 'LOCATION' | 'OPERATOR' | 'MARKET' | 'BALANCED';
    confidence: number;
    evidence: string[];
    contributingFactors: Array<{
      factor: string;
      weight: number;
    }>;
  };
  
  // Location Quality
  locationQuality: {
    score: number;
    rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    strengths: string[];
    weaknesses: string[];
  };
  
  // Operator Quality (if multi-store franchisee)
  operatorQuality?: {
    rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    confidence: number;
    evidence: string[];
    strengths: string[];
    concerns: string[];
  };
  
  // Revenue Prediction
  revenuePrediction?: {
    expected: number;
    confidenceInterval: { low: number; high: number };
    confidence: number;
    methodology: string;
    factors: string[];
  };
  
  // Recommendations
  recommendations: Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    rationale: string;
    estimatedImpact: number;
    timeline: string;
    cost?: string;
  }>;
  
  // Strategic Insights
  strategicInsights: {
    pattern: string;
    networkLearning: string;
    outlierStatus: boolean;
    specialAttention: string;
  };
  
  // Executive Summary
  executiveSummary: string;
  
  // Metadata
  metadata: {
    model: string;
    tokensUsed: number;
    cost: number;
    duration: number;
    analysisVersion: string;
  };
}

@Injectable()
export class StoreIntelligenceService {
  private readonly logger = new Logger(StoreIntelligenceService.name);
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly modelConfig: AIModelConfigService,
    private readonly contextBuilder: StoreContextBuilderService
  ) {
    this.logger.log('Store Intelligence Service initialized');
  }

  /**
   * Analyze a store using AI
   * Model selection is automatic based on premium flag and configuration
   */
  async analyzeStore(request: StoreAnalysisRequest): Promise<StoreAnalysisResult> {
    const startTime = Date.now();

    this.logger.log(`Analyzing store ${request.storeId} (premium: ${request.premium || false})`);

    if (!this.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Get model configuration
    const modelConfig = this.modelConfig.getStoreAnalysisModel(request.premium);
    this.logger.log(`Using model: ${modelConfig.model}`);

    try {
      // 1. Build comprehensive context
      const context = await this.contextBuilder.buildStoreContext(request.storeId);

      // 2. Build prompt
      const prompt = this.buildAnalysisPrompt(context, request);

      // 3. Estimate cost
      const estimatedInputTokens = Math.ceil(prompt.length / 4); // Rough estimate
      const estimatedOutputTokens = 3000;
      const costEstimate = this.modelConfig.estimateCost(
        modelConfig.model,
        estimatedInputTokens,
        estimatedOutputTokens
      );

      this.logger.log(`Estimated cost: $${costEstimate.estimatedCost.toFixed(4)}`);

      // 4. Call OpenAI API
      const response = await this.callOpenAI(prompt, modelConfig);

      // 5. Parse response
      const analysis = this.parseAnalysisResponse(response.content, context);

      // 6. Calculate actual cost
      const actualCost = this.modelConfig.calculateCost(
        modelConfig.model,
        response.usage.inputTokens,
        response.usage.outputTokens
      );

      // 7. Log usage
      this.modelConfig.logModelUsage(
        modelConfig.model,
        'store_analysis',
        response.usage.inputTokens,
        response.usage.outputTokens,
        Date.now() - startTime
      );

      // 8. Save to database
      await this.saveAnalysis(request.storeId, analysis, {
        model: modelConfig.model,
        tokensUsed: response.usage.totalTokens,
        cost: actualCost
      });

      const duration = Date.now() - startTime;

      return {
        ...analysis,
        metadata: {
          model: modelConfig.model,
          tokensUsed: response.usage.totalTokens,
          cost: actualCost,
          duration,
          analysisVersion: '1.0'
        }
      };

    } catch (error) {
      this.logger.error(`Store analysis failed for ${request.storeId}:`, error);
      throw error;
    }
  }



  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(context: StoreContext, request: StoreAnalysisRequest): string {
    return `System: You are an elite franchise performance analyst with 20 years of experience analyzing QSR networks globally.

Store Context:
${JSON.stringify(context, null, 2)}

Analysis Requirements:
1. Peer Benchmarking: ${request.includePeerBenchmark !== false ? 'YES' : 'NO'}
2. Revenue Prediction: ${request.includeRevenuePrediction !== false ? 'YES' : 'NO'}
3. Recommendations: ${request.includeRecommendations !== false ? 'YES' : 'NO'}

Provide comprehensive analysis in JSON format with:
- peerBenchmark (if requested)
- rootCause (always)
- locationQuality (always)
- operatorQuality (if multi-store franchisee)
- revenuePrediction (if requested)
- recommendations (if requested)
- strategicInsights (always)
- executiveSummary (always)

Output valid JSON only.`;
  }

  /**
   * Call OpenAI API with model configuration
   */
  private async callOpenAI(prompt: string, config: ModelConfig): Promise<{
    content: string;
    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
  }> {
    const agent = new Agent({
      headersTimeout: 120000,
      bodyTimeout: 120000,
      connectTimeout: 30000
    });

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        input: prompt,
        max_output_tokens: config.maxTokens,
        reasoning: config.reasoning,
        text: {
          verbosity: 'high',
          format: { type: 'json_object' }
        }
      }),
      dispatcher: agent
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();
    const messageOutput = data.output?.find((item: any) => item.type === 'message');
    
    if (!messageOutput?.content?.[0]?.text) {
      throw new Error('No message output from AI');
    }

    return {
      content: messageOutput.content[0].text,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    };
  }

  /**
   * Parse AI response
   */
  private parseAnalysisResponse(content: string, context: StoreContext): Omit<StoreAnalysisResult, 'metadata'> {
    try {
      const parsed = JSON.parse(content);
      
      return {
        storeId: context.store.id,
        storeName: context.store.name,
        analysisDate: new Date().toISOString(),
        ...parsed
      };
    } catch (error) {
      this.logger.error('Failed to parse AI response:', error);
      throw new Error('Invalid AI response format');
    }
  }

  /**
   * Save analysis to database
   */
  private async saveAnalysis(
    storeId: string,
    analysis: any,
    metadata: { model: string; tokensUsed: number; cost: number }
  ): Promise<void> {
    await this.prisma.storeAnalysis.create({
      data: {
        storeId,
        analysisDate: new Date(),
        locationQualityScore: analysis.locationQuality.score,
        locationRating: analysis.locationQuality.rating,
        locationStrengths: JSON.stringify(analysis.locationQuality.strengths),
        locationWeaknesses: JSON.stringify(analysis.locationQuality.weaknesses),
        expectedRevenue: analysis.revenuePrediction?.expected,
        actualRevenue: analysis.performance?.annualRevenue,
        performanceGap: analysis.revenuePrediction?.expected 
          ? analysis.performance?.annualRevenue - analysis.revenuePrediction.expected 
          : null,
        primaryFactor: analysis.rootCause.primaryFactor,
        franchiseeRating: analysis.operatorQuality?.rating,
        franchiseeStrengths: analysis.operatorQuality?.strengths 
          ? JSON.stringify(analysis.operatorQuality.strengths) 
          : null,
        franchiseeConcerns: analysis.operatorQuality?.concerns 
          ? JSON.stringify(analysis.operatorQuality.concerns) 
          : null,
        recommendationPriority: analysis.recommendations?.[0]?.priority || 'MEDIUM',
        recommendations: JSON.stringify(analysis.recommendations),
        estimatedImpact: analysis.recommendations?.[0]?.estimatedImpact,
        model: metadata.model,
        tokensUsed: metadata.tokensUsed,
        analysisVersion: '1.0'
      }
    });
  }

}
