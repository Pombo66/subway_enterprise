import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Background worker that processes expansion jobs
 * Runs continuously in the BFF, no timeout limits
 */
@Injectable()
export class ExpansionJobWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExpansionJobWorkerService.name);
  private pollingInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private readonly POLL_INTERVAL_MS = 5000; // Check every 5 seconds

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Start the worker when the module initializes
   */
  async onModuleInit() {
    this.logger.log('🚀 Expansion Job Worker starting...');
    this.startPolling();
  }

  /**
   * Stop the worker when the module is destroyed
   */
  async onModuleDestroy() {
    this.logger.log('🛑 Expansion Job Worker stopping...');
    this.stopPolling();
  }

  /**
   * Start polling for queued jobs
   */
  private startPolling() {
    this.pollingInterval = setInterval(async () => {
      await this.processNextJob();
    }, this.POLL_INTERVAL_MS);

    this.logger.log(`✅ Worker polling started (every ${this.POLL_INTERVAL_MS}ms)`);
  }

  /**
   * Stop polling
   */
  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.logger.log('✅ Worker polling stopped');
    }
  }

  /**
   * Process the next queued job
   */
  private async processNextJob() {
    // Skip if already processing a job
    if (this.isProcessing) {
      return;
    }

    try {
      // Check for expansion jobs
      const expansionJob = await this.prisma.expansionJob.findFirst({
        where: { status: 'queued' },
        orderBy: { createdAt: 'asc' }
      });

      // Check for store analysis jobs
      const analysisJob = await this.prisma.storeAnalysisJob.findFirst({
        where: { status: 'queued' },
        orderBy: { createdAt: 'asc' }
      });

      // Process whichever job is older
      if (!expansionJob && !analysisJob) {
        return; // No jobs to process
      }

      this.isProcessing = true;

      if (expansionJob && (!analysisJob || expansionJob.createdAt <= analysisJob.createdAt)) {
        // Process expansion job
        this.logger.log(`📋 Processing expansion job ${expansionJob.id}...`);
        await this.prisma.expansionJob.update({
          where: { id: expansionJob.id },
          data: { status: 'processing', startedAt: new Date() }
        });
        await this.processExpansionJob(expansionJob.id, JSON.parse(expansionJob.params));
      } else if (analysisJob) {
        // Process analysis job
        this.logger.log(`📋 Processing store analysis job ${analysisJob.id}...`);
        await this.prisma.storeAnalysisJob.update({
          where: { id: analysisJob.id },
          data: { status: 'processing', startedAt: new Date() }
        });
        await this.processAnalysisJob(analysisJob.id, JSON.parse(analysisJob.params));
      }

    } catch (error) {
      this.logger.error('Error in job processing loop:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process an expansion job
   */
  private async processExpansionJob(jobId: string, params: any) {
    const startTime = Date.now();

    try {
      this.logger.log(`🎯 Job ${jobId}: Starting expansion generation`);
      this.logger.log(`   Region: ${params.region?.country || 'Unknown'}`);
      this.logger.log(`   Aggression: ${params.aggression}`);
      this.logger.log(`   Model: ${params.model || 'gpt-5-mini'}`);

      // Import simple expansion service
      const { SimpleExpansionService } = await import('./ai/simple-expansion.service');
      
      // First, check what status values exist
      const allStores = await this.prisma.store.findMany({
        where: {
          country: params.region.country || 'Germany'
        },
        select: {
          status: true
        }
      });

      const statusCounts = allStores.reduce((acc, store) => {
        const status = store.status || 'null';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      this.logger.log(`   Status distribution: ${JSON.stringify(statusCounts)}`);

      // Get existing OPEN stores for the region (handle various status formats)
      const stores = await this.prisma.store.findMany({
        where: {
          country: params.region.country || 'Germany',
          OR: [
            { status: 'OPEN' },
            { status: 'Open' },
            { status: 'open' },
            { status: null } // Include stores with no status set
          ]
        },
        select: {
          name: true,
          city: true,
          latitude: true,
          longitude: true,
          annualTurnover: true,
          status: true
        }
      });

      this.logger.log(`   Found ${stores.length} open stores in ${params.region.country || 'Germany'}`);

      // Calculate target count based on aggression (minimum 25, maximum 150)
      // Scale: 0% = 25, 50% = 87, 100% = 150
      // Note: AI refuses to generate 300 in one call, caps at ~150 for quality
      const targetCount = params.targetCount || Math.max(25, Math.min(150, Math.round(25 + (params.aggression / 100) * 125)));

      // Use simple expansion service directly
      const simpleService = new SimpleExpansionService(this.prisma);
      
      const result = await simpleService.generateSuggestions({
        region: params.region.country || 'Germany',
        existingStores: stores.map(store => ({
          name: store.name || 'Unknown',
          city: store.city || 'Unknown',
          lat: store.latitude || 0,
          lng: store.longitude || 0,
          revenue: store.annualTurnover || undefined
        })),
        targetCount,
        model: params.model
      });

      const processingTime = Date.now() - startTime;

      // Convert simple expansion result to expected format
      const formattedResult = {
        suggestions: result.suggestions.map((s, i) => ({
          id: `simple-${i + 1}`,
          lat: s.lat,
          lng: s.lng,
          region: s.city,
          country: params.region.country || 'Germany',
          finalScore: s.confidence,
          confidence: s.confidence,
          isLive: true,
          aiRecommended: true,
          demandScore: s.confidence,
          competitionPenalty: 0.1,
          supplyPenalty: 0.1,
          population: 100000,
          footfallIndex: 0.7,
          incomeIndex: 0.7,
          predictedAUV: s.estimatedRevenue || 450000,
          paybackPeriod: 18,
          cacheKey: `simple-${i}`,
          modelVersion: 'v4.0-simple-ai',
          dataSnapshotDate: new Date().toISOString(),
          rationaleText: s.rationale,
          hasAIAnalysis: true,
          aiProcessingRank: i + 1,
          distanceToNearestStore: s.distanceToNearestStore,
          rationale: {
            population: s.confidence * 0.8,
            proximityGap: s.distanceToNearestStore ? Math.min(1, s.distanceToNearestStore / 2000) : 0.7,
            turnoverGap: s.estimatedRevenue ? s.estimatedRevenue / 2000000 : 0.7,
            notes: s.rationale || 'AI-generated location'
          }
        })),
        metadata: {
          generationTimeMs: result.metadata.processingTimeMs,
          enhancedRationaleEnabled: true,
          diversificationEnabled: false,
          aiCostLimitingEnabled: false,
          aiCandidatesCount: result.suggestions.length,
          totalCandidatesCount: result.suggestions.length,
          aiPercentage: 100,
          pipelineStages: ['simple-ai-single-call'],
          aiPipelineUsed: true,
          strategicAnalysis: result.analysis // Include strategic analysis
        },
        statistics: {
          tokensUsed: result.metadata.tokensUsed,
          totalCost: result.metadata.cost,
          generationTimeMs: result.metadata.processingTimeMs
        }
      };

      // Update job with results
      await this.prisma.expansionJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          result: JSON.stringify(formattedResult),
          tokensUsed: result.metadata.tokensUsed,
          actualCost: result.metadata.cost,
          completedAt: new Date()
        }
      });

      this.logger.log(`✅ Job ${jobId}: Completed successfully`);
      this.logger.log(`   Suggestions: ${result.suggestions.length}`);
      this.logger.log(`   Processing time: ${Math.round(processingTime / 1000)}s`);
      this.logger.log(`   Tokens used: ${result.metadata.tokensUsed}`);
      this.logger.log(`   Cost: £${result.metadata.cost.toFixed(4)}`);

    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`❌ Job ${jobId}: Failed after ${Math.round(processingTime / 1000)}s`);
      this.logger.error(`   Error: ${error.message}`);

      // Update job with error
      await this.prisma.expansionJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          error: error.message || 'Unknown error',
          completedAt: new Date()
        }
      });
    }
  }

  /**
   * Process a store analysis job
   */
  private async processAnalysisJob(jobId: string, params: any) {
    const startTime = Date.now();

    try {
      this.logger.log(`🔍 Job ${jobId}: Starting store analysis`);
      this.logger.log(`   Region: ${params.region || 'Unknown'}`);
      this.logger.log(`   Model: ${params.model || 'gpt-5-mini'}`);

      // Import store analysis service
      const { StoreAnalysisService } = await import('./ai/store-analysis.service');
      const analysisService = new StoreAnalysisService(this.prisma);

      // Get stores to analyze
      const stores = await this.prisma.store.findMany({
        where: params.storeIds 
          ? { id: { in: params.storeIds } }
          : { country: params.region || 'Germany' },
        select: {
          id: true,
          name: true,
          city: true,
          latitude: true,
          longitude: true,
          annualTurnover: true,
          openedAt: true,
          ownerName: true
        }
      });

      // Group stores by owner to get franchisee store counts
      const ownerStoreCounts = new Map<string, number>();
      stores.forEach(store => {
        const owner = store.ownerName || 'Unknown';
        ownerStoreCounts.set(owner, (ownerStoreCounts.get(owner) || 0) + 1);
      });

      // Prepare analysis request
      const analysisRequest = {
        region: params.region || 'Germany',
        stores: stores.map(store => {
          const owner = store.ownerName || 'Unknown';
          return {
            id: store.id,
            name: store.name || 'Unknown',
            city: store.city || 'Unknown',
            lat: store.latitude || 0,
            lng: store.longitude || 0,
            revenue: store.annualTurnover || 0,
            openDate: store.openedAt || undefined,
            franchiseeName: owner,
            franchiseeStoreCount: ownerStoreCounts.get(owner) || 1
          };
        }),
        model: params.model
      };

      // Run analysis
      const result = await analysisService.analyzeStores(analysisRequest);

      // Save individual analyses to database
      for (const analysis of result.analyses) {
        await this.prisma.storeAnalysis.create({
          data: {
            storeId: analysis.storeId,
            locationQualityScore: analysis.locationQualityScore,
            locationRating: analysis.locationRating,
            locationStrengths: JSON.stringify(analysis.locationStrengths),
            locationWeaknesses: JSON.stringify(analysis.locationWeaknesses),
            expectedRevenue: analysis.expectedRevenue,
            actualRevenue: analysis.actualRevenue,
            performanceGap: analysis.performanceGap,
            performanceGapPercent: analysis.performanceGapPercent,
            primaryFactor: analysis.primaryFactor,
            franchiseeRating: analysis.franchiseeRating,
            franchiseeStrengths: analysis.franchiseeStrengths ? JSON.stringify(analysis.franchiseeStrengths) : null,
            franchiseeConcerns: analysis.franchiseeConcerns ? JSON.stringify(analysis.franchiseeConcerns) : null,
            recommendationPriority: analysis.recommendationPriority,
            recommendations: JSON.stringify(analysis.recommendations),
            estimatedImpact: analysis.estimatedImpact,
            model: result.metadata.model,
            tokensUsed: Math.round(result.metadata.tokensUsed / result.analyses.length)
          }
        });
      }

      const processingTime = Date.now() - startTime;

      // Update job with results
      await this.prisma.storeAnalysisJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          result: JSON.stringify(result),
          storesAnalyzed: result.analyses.length,
          tokensUsed: result.metadata.tokensUsed,
          actualCost: result.metadata.cost,
          completedAt: new Date()
        }
      });

      this.logger.log(`✅ Job ${jobId}: Analysis completed successfully`);
      this.logger.log(`   Stores analyzed: ${result.analyses.length}`);
      this.logger.log(`   Processing time: ${Math.round(processingTime / 1000)}s`);
      this.logger.log(`   Tokens used: ${result.metadata.tokensUsed}`);
      this.logger.log(`   Cost: £${result.metadata.cost.toFixed(4)}`);
      if (result.summary) {
        this.logger.log(`   Critical stores: ${result.summary.criticalStores}`);
        this.logger.log(`   Opportunity stores: ${result.summary.opportunityStores}`);
      }

    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`❌ Job ${jobId}: Analysis failed after ${Math.round(processingTime / 1000)}s`);
      this.logger.error(`   Error: ${error.message}`);

      await this.prisma.storeAnalysisJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          error: error.message || 'Unknown error',
          completedAt: new Date()
        }
      });
    }
  }
}
