import { PrismaClient } from '@prisma/client';
import { OpenAIRationaleService, RationaleContext, RationaleOutput } from './openai-rationale.service';
import { OpenAIRationaleDiversificationService } from './openai-rationale-diversification.service';
import { OpenAIContextAnalysisService } from './openai-context-analysis.service';
import {
  UniqueRationale,
  DiversityReport,
  ContextualInsights,
  CompetitorData,
  DemographicData,
  AccessibilityData,
  LocationData
} from './types/intelligent-expansion.types';

/**
 * Enhanced OpenAI Rationale Service
 * Extends the existing rationale service with diversity enforcement and individual location analysis
 */
export class EnhancedOpenAIRationaleService extends OpenAIRationaleService {
  private diversificationService: OpenAIRationaleDiversificationService;
  private contextAnalysisService: OpenAIContextAnalysisService;
  private existingRationales: Map<string, string[]> = new Map(); // Track rationales per generation batch

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.diversificationService = new OpenAIRationaleDiversificationService(prisma);
    this.contextAnalysisService = new OpenAIContextAnalysisService(prisma);
    console.log('🤖 Enhanced OpenAI Rationale Service initialized with diversity enforcement');
  }

  /**
   * Generate unique rationale with individual location analysis and diversity enforcement
   */
  async generateUniqueRationaleForLocation(
    context: RationaleContext,
    locationData: LocationData,
    competitors: CompetitorData[],
    demographics: DemographicData,
    accessibility: AccessibilityData,
    batchId: string = 'default'
  ): Promise<UniqueRationale> {
    console.log(`🤖 Generating unique rationale for location ${context.lat.toFixed(4)}, ${context.lng.toFixed(4)}`);

    try {
      // Step 1: Get contextual insights for this specific location
      const contextualInsights = await this.contextAnalysisService.generateUniqueContextualInsights(
        locationData,
        competitors,
        accessibility
      );

      // Step 2: Get existing rationales for this batch to ensure uniqueness
      const existingRationales = this.existingRationales.get(batchId) || [];

      // Step 3: Generate unique rationale using diversification service
      const uniqueRationale = await this.diversificationService.generateLocationSpecificRationale(
        context,
        existingRationales,
        contextualInsights,
        { lat: context.lat, lng: context.lng }
      );

      // Step 4: Store this rationale to prevent future duplicates in this batch
      if (!this.existingRationales.has(batchId)) {
        this.existingRationales.set(batchId, []);
      }
      this.existingRationales.get(batchId)!.push(uniqueRationale.text);

      console.log(`✅ Unique rationale generated with ${uniqueRationale.uniquenessScore.toFixed(2)} uniqueness score`);
      return uniqueRationale;

    } catch (error) {
      console.error(`❌ Enhanced rationale generation failed for ${context.lat.toFixed(4)}, ${context.lng.toFixed(4)}:`, error);
      
      // Fallback to standard rationale generation
      console.log(`🔄 Falling back to standard rationale generation`);
      const standardRationale = await this.generateRationale(context);
      
      // Convert to UniqueRationale format
      return this.convertToUniqueRationale(standardRationale, context);
    }
  }

  /**
   * Generate rationales for multiple locations with diversity enforcement
   */
  async generateDiverseRationalesForBatch(
    contexts: Array<{
      context: RationaleContext;
      locationData: LocationData;
      competitors: CompetitorData[];
      demographics: DemographicData;
      accessibility: AccessibilityData;
    }>,
    batchId: string = `batch_${Date.now()}`
  ): Promise<UniqueRationale[]> {
    console.log(`🤖 Generating diverse rationales for batch of ${contexts.length} locations`);

    // Clear existing rationales for this batch
    this.existingRationales.set(batchId, []);

    const rationales: UniqueRationale[] = [];

    for (let i = 0; i < contexts.length; i++) {
      const { context, locationData, competitors, demographics, accessibility } = contexts[i];
      
      try {
        const uniqueRationale = await this.generateUniqueRationaleForLocation(
          context,
          locationData,
          competitors,
          demographics,
          accessibility,
          batchId
        );
        
        rationales.push(uniqueRationale);
        
        console.log(`   Generated ${i + 1}/${contexts.length} rationales`);
        
      } catch (error) {
        console.error(`Failed to generate rationale for location ${i + 1}:`, error);
        // Continue with other locations rather than failing the entire batch
      }
    }

    // Validate diversity of the entire batch
    const diversityReport = await this.validateBatchDiversity(rationales);
    
    if (!diversityReport.passed) {
      console.warn(`⚠️  Batch diversity validation failed: ${diversityReport.diversityIssues.join(', ')}`);
    } else {
      console.log(`✅ Batch diversity validation passed: ${diversityReport.uniquenessScore.toFixed(2)} uniqueness score`);
    }

    return rationales;
  }

  /**
   * Validate diversity of a batch of rationales
   */
  async validateBatchDiversity(rationales: UniqueRationale[]): Promise<DiversityReport & { passed: boolean }> {
    if (rationales.length === 0) {
      return {
        passed: false,
        uniquenessScore: 0,
        repetitionCount: 0,
        averageLength: 0,
        contextualVariety: 0,
        aiRecommendations: ['No rationales to validate'],
        diversityIssues: ['Empty rationale batch']
      };
    }

    const texts = rationales.map(r => r.text);
    
    try {
      const diversityReport = await this.diversificationService.validateIndividualRationaleDiversity(texts);
      
      // Add passed flag based on thresholds
      const passed = diversityReport.uniquenessScore >= 0.8 && 
                    diversityReport.repetitionCount === 0 &&
                    diversityReport.contextualVariety >= 0.7;
      
      return {
        ...diversityReport,
        passed
      };
      
    } catch (error) {
      console.error('Diversity validation failed:', error);
      return {
        passed: false,
        uniquenessScore: 0.5,
        repetitionCount: 0,
        averageLength: texts.reduce((sum, t) => sum + t.length, 0) / texts.length,
        contextualVariety: 0.5,
        aiRecommendations: ['Diversity validation failed due to error'],
        diversityIssues: ['Validation error occurred']
      };
    }
  }

  /**
   * Convert standard RationaleOutput to UniqueRationale format
   */
  private convertToUniqueRationale(
    standardRationale: RationaleOutput,
    context: RationaleContext
  ): UniqueRationale {
    return {
      text: standardRationale.text,
      factors: standardRationale.factors,
      confidence: standardRationale.confidence,
      dataCompleteness: standardRationale.dataCompleteness,
      uniquenessScore: 0.5, // Default score for fallback rationales
      contextualElements: [`Location: ${context.lat.toFixed(4)}, ${context.lng.toFixed(4)}`],
      differentiators: ['Standard rationale generation'],
      aiGeneratedInsights: ['Fallback to standard generation due to enhanced service failure']
    };
  }

  /**
   * Clear rationale history for a batch (useful for testing or new generations)
   */
  clearBatchHistory(batchId: string): void {
    this.existingRationales.delete(batchId);
    console.log(`🧹 Cleared rationale history for batch: ${batchId}`);
  }

  /**
   * Get combined cache statistics from all services
   */
  getCombinedCacheStats() {
    const baseStats = this.getCacheStats();
    const diversificationStats = this.diversificationService.getCacheStats();
    const contextStats = this.contextAnalysisService.getCacheStats();

    return {
      rationale: baseStats,
      diversification: diversificationStats,
      context: contextStats,
      combined: {
        totalApiCalls: baseStats.apiCalls + diversificationStats.apiCalls + contextStats.apiCalls,
        totalTokensUsed: baseStats.totalTokensUsed + diversificationStats.totalTokensUsed + contextStats.totalTokensUsed,
        averageHitRate: (baseStats.hitRate + diversificationStats.hitRate + contextStats.hitRate) / 3
      }
    };
  }

  /**
   * Reset all service statistics
   */
  resetAllStats(): void {
    this.resetCacheStats();
    this.diversificationService.resetStats();
    this.contextAnalysisService.resetStats();
    this.existingRationales.clear();
    console.log('🔄 Reset all enhanced rationale service statistics');
  }
}