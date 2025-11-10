import { PrismaClient } from '@prisma/client';
import { ExpansionGenerationService, GenerationParams, ExpansionJobResult } from './expansion-generation.service';
import { ExpansionLogger } from '../logging/expansion-logger';

// ExpansionJobResult is now imported from expansion-generation.service.ts

export interface ExpansionJob {
  id: string;
  idempotencyKey: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  userId: string;
  params: GenerationParams;
  result?: ExpansionJobResult;
  error?: string;
  tokenEstimate?: number;
  tokensUsed?: number;
  costEstimate?: number;
  actualCost?: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class ExpansionJobService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create or retrieve existing job with idempotency
   */
  async createJob(
    idempotencyKey: string,
    userId: string,
    params: GenerationParams
  ): Promise<{ jobId: string; isReused: boolean }> {
    // Check if job already exists with this idempotency key
    const existingJob = await this.prisma.expansionJob.findUnique({
      where: { idempotencyKey }
    });

    if (existingJob) {
      return { jobId: existingJob.id, isReused: true };
    }

    // Estimate tokens and cost before creating job
    const tokenEstimate = this.estimateTokens(params);
    const costEstimate = this.estimateCost(tokenEstimate);

    // Create new job
    const job = await this.prisma.expansionJob.create({
      data: {
        idempotencyKey,
        userId,
        params: JSON.stringify(params),
        tokenEstimate,
        costEstimate,
        status: 'queued'
      }
    });

    // Job will be picked up by BFF background worker
    // No processing here - just create the job and return

    return { jobId: job.id, isReused: false };
  }

  /**
   * Get job status and result
   */
  async getJob(jobId: string): Promise<ExpansionJob | null> {
    const job = await this.prisma.expansionJob.findUnique({
      where: { id: jobId }
    });

    if (!job) return null;

    return {
      id: job.id,
      idempotencyKey: job.idempotencyKey,
      status: job.status as any,
      userId: job.userId,
      params: JSON.parse(job.params),
      result: job.result ? (typeof job.result === 'string' ? JSON.parse(job.result) : job.result) : undefined,
      error: job.error || undefined,
      tokenEstimate: job.tokenEstimate || undefined,
      tokensUsed: job.tokensUsed || undefined,
      costEstimate: job.costEstimate || undefined,
      actualCost: job.actualCost || undefined,
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    };
  }

  /**
   * Process job asynchronously
   * NOTE: This method is no longer used - job processing moved to BFF background worker
   * Kept for reference only
   */
  private async processJobAsync_DEPRECATED(jobId: string): Promise<void> {
    // SAFETY: Temporarily disabled for testing - job processing enabled
    const jobProcessingEnabled = true; // Force enable for testing
    if (process.env.NODE_ENV === 'development' && !jobProcessingEnabled) {
      console.log(`🛡️ Job ${jobId} BLOCKED - development job processing disabled`);
      console.log(`   To enable: set ENABLE_JOB_PROCESSING=true in environment`);
      console.log(`   ⚠️  This will incur real API costs!`);
      
      // Complete job with mock data instead of processing
      await this.prisma.expansionJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          result: JSON.stringify({
            suggestions: [],
            statistics: { tokensUsed: 0, totalCost: 0 },
            metadata: { 
              generationTimeMs: 100,
              mockMode: true,
              message: 'Mock result - job processing disabled in development'
            }
          }),
          tokensUsed: 0,
          actualCost: 0,
          completedAt: new Date()
        }
      });
      return;
    }

    console.log(`💰 Processing job ${jobId} - REAL API calls will be made!`);

    try {
      // Mark job as running
      await this.prisma.expansionJob.update({
        where: { id: jobId },
        data: {
          status: 'running',
          startedAt: new Date()
        }
      });

      // Get job details
      const job = await this.prisma.expansionJob.findUnique({
        where: { id: jobId }
      });

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      const params: GenerationParams = JSON.parse(job.params);

      ExpansionLogger.logGenerationStart(params);

      // Run the actual generation
      const service = new ExpansionGenerationService(this.prisma);
      const result = await service.generate(params);

      ExpansionLogger.logGenerationComplete(result);

      // Calculate actual cost
      const actualCost = this.calculateActualCost((result as any).statistics?.tokensUsed || 0);

      // Ensure result is properly serializable
      let serializedResult: string;
      try {
        serializedResult = JSON.stringify(result);
        console.log(`✅ Successfully serialized result: ${serializedResult.length} characters`);
      } catch (serializationError) {
        console.error('❌ Failed to serialize result:', serializationError);
        console.error('Result object:', result);
        throw new Error(`Result serialization failed: ${serializationError instanceof Error ? serializationError.message : 'Unknown error'}`);
      }

      // Mark job as completed
      await this.prisma.expansionJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          result: serializedResult,
          tokensUsed: (result as any).statistics?.tokensUsed || 0,
          actualCost,
          completedAt: new Date()
        }
      });

    } catch (error: any) {
      ExpansionLogger.logDetailedError(error, {
        endpoint: 'job_processing'
      });

      // Mark job as failed
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
   * Estimate tokens based on parameters with AI cost limiting
   */
  private estimateTokens(params: GenerationParams): number {
    // Base tokens for deterministic processing
    let estimate = 100;

    // Add tokens for AI rationale if enabled (with 20% cost limiting)
    if (params.enableAIRationale) {
      // Get target stores based on aggression level
      let targetStores: number;
      if (params.aggression <= 20) {
        targetStores = 50;
      } else if (params.aggression <= 40) {
        targetStores = 100;
      } else if (params.aggression <= 60) {
        targetStores = 150;
      } else if (params.aggression <= 80) {
        targetStores = 200;
      } else {
        targetStores = 300;
      }

      // Apply 20% AI limit - only top 20% get AI processing
      const aiCandidates = Math.min(Math.ceil(targetStores * 0.2), 60); // Max 60 candidates
      estimate += aiCandidates * 150; // ~150 tokens per rationale
      
      console.log(`💰 Token Estimation: ${targetStores} total candidates, ${aiCandidates} with AI (${((aiCandidates/targetStores)*100).toFixed(0)}%)`);
    }

    // Add tokens for Mapbox filtering if enabled
    if (params.enableMapboxFiltering) {
      estimate += 50;
    }

    return estimate;
  }

  /**
   * Estimate cost in GBP based on token count
   */
  private estimateCost(tokens: number): number {
    // GPT-5-mini pricing: ~$0.10 per 1M input tokens, $0.40 per 1M output tokens
    // (Estimated pricing - GPT-5 mini is more cost-effective than legacy models)
    // Assuming 70% input, 30% output, convert to GBP (~0.8 USD/GBP)
    const inputTokens = tokens * 0.7;
    const outputTokens = tokens * 0.3;
    
    const costUSD = (inputTokens * 0.10 / 1000000) + (outputTokens * 0.40 / 1000000);
    const costGBP = costUSD * 0.8;
    
    return Math.round(costGBP * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate actual cost based on tokens used
   */
  private calculateActualCost(tokensUsed: number): number {
    return this.estimateCost(tokensUsed);
  }

  /**
   * Clean up old completed/failed jobs
   */
  async cleanupOldJobs(olderThanHours: number = 24): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    const result = await this.prisma.expansionJob.deleteMany({
      where: {
        AND: [
          {
            OR: [
              { status: 'completed' },
              { status: 'failed' }
            ]
          },
          {
            completedAt: {
              lt: cutoff
            }
          }
        ]
      }
    });

    return result.count;
  }

  /**
   * Get user's recent jobs
   */
  async getUserJobs(userId: string, limit: number = 10): Promise<ExpansionJob[]> {
    const jobs = await this.prisma.expansionJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return jobs.map(job => ({
      id: job.id,
      idempotencyKey: job.idempotencyKey,
      status: job.status as any,
      userId: job.userId,
      params: JSON.parse(job.params),
      result: job.result ? (typeof job.result === 'string' ? JSON.parse(job.result) : job.result) : undefined,
      error: job.error || undefined,
      tokenEstimate: job.tokenEstimate || undefined,
      tokensUsed: job.tokensUsed || undefined,
      costEstimate: job.costEstimate || undefined,
      actualCost: job.actualCost || undefined,
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    }));
  }
}