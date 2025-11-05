import { StrategyScore, ScoredCell, ExpansionContext, StrategyType } from './types';
import { StrategyOrchestrator } from './strategy-orchestrator';

export interface BatchProcessingResult {
  processedCandidates: ScoredCell[];
  totalProcessed: number;
  averageProcessingTime: number;
  errorCount: number;
  successRate: number;
}

export class ParallelStrategyProcessor {
  private readonly maxConcurrency: number;
  private readonly timeoutMs: number;
  
  constructor(maxConcurrency: number = 4, timeoutMs: number = 30000) {
    this.maxConcurrency = maxConcurrency;
    this.timeoutMs = timeoutMs;
    console.log(`⚡ ParallelStrategyProcessor initialized with ${maxConcurrency} max concurrency`);
  }

  /**
   * Execute all strategies in parallel for better performance
   * Implements requirement 13 for parallel strategy execution
   */
  async processStrategiesParallel(
    candidate: ScoredCell,
    context: ExpansionContext,
    orchestrator: StrategyOrchestrator
  ): Promise<StrategyScore[]> {
    const startTime = Date.now();
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Strategy processing timeout')), this.timeoutMs);
      });
      
      // Process strategies with timeout
      const strategicResult = await Promise.race([
        orchestrator.scoreCandidate(candidate, context),
        timeoutPromise
      ]);
      
      const processingTime = Date.now() - startTime;
      console.log(`⚡ Parallel strategy processing completed in ${processingTime}ms`);
      
      // Extract strategy scores from the result
      return strategicResult.strategyBreakdown ? 
        this.extractStrategyScores(strategicResult) : [];
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Parallel strategy processing failed after ${processingTime}ms:`, error);
      
      // Return empty array on failure
      return [];
    }
  }

  /**
   * Batch process multiple candidates with controlled concurrency
   * Implements requirement 13 for batch processing
   */
  async processCandidateBatch(
    candidates: ScoredCell[],
    context: ExpansionContext,
    orchestrator: StrategyOrchestrator
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;
    const processedCandidates: ScoredCell[] = [];
    
    console.log(`🔄 Starting batch processing of ${candidates.length} candidates with ${this.maxConcurrency} concurrency`);
    
    // Process candidates in batches to control concurrency
    for (let i = 0; i < candidates.length; i += this.maxConcurrency) {
      const batch = candidates.slice(i, i + this.maxConcurrency);
      
      const batchPromises = batch.map(async (candidate) => {
        try {
          const strategicResult = await orchestrator.scoreCandidate(candidate, context);
          
          // Enhance candidate with strategic data
          const enhancedCandidate = {
            ...candidate,
            strategicScores: this.extractStrategyScores(strategicResult),
            strategicMetadata: {
              dominantStrategy: strategicResult.dominantStrategy,
              strategicClassification: strategicResult.strategicClassification,
              executiveSummary: strategicResult.executiveSummary
            }
          };
          
          processedCount++;
          return enhancedCandidate;
          
        } catch (error) {
          console.error(`Error processing candidate ${candidate.id}:`, error);
          errorCount++;
          return candidate; // Return original candidate on error
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Collect successful results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          processedCandidates.push(result.value);
        }
      });
      
      // Log progress
      const progress = Math.round(((i + batch.length) / candidates.length) * 100);
      console.log(`📊 Batch progress: ${progress}% (${processedCount}/${candidates.length})`);
    }
    
    const totalTime = Date.now() - startTime;
    const averageProcessingTime = totalTime / candidates.length;
    const successRate = (processedCount / candidates.length) * 100;
    
    console.log(`✅ Batch processing completed: ${processedCount}/${candidates.length} successful (${successRate.toFixed(1)}%) in ${totalTime}ms`);
    
    return {
      processedCandidates,
      totalProcessed: processedCount,
      averageProcessingTime,
      errorCount,
      successRate
    };
  }

  /**
   * Process strategies with error handling and timeout management
   */
  private async processWithErrorHandling<T>(
    operation: () => Promise<T>,
    candidateId: string
  ): Promise<T | null> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), this.timeoutMs);
      });
      
      return await Promise.race([operation(), timeoutPromise]);
      
    } catch (error) {
      console.error(`Error processing candidate ${candidateId}:`, error);
      return null;
    }
  }

  /**
   * Extract strategy scores from strategic suggestion
   */
  private extractStrategyScores(strategicResult: any): StrategyScore[] {
    const scores: StrategyScore[] = [];
    
    if (strategicResult.strategyBreakdown) {
      const breakdown = strategicResult.strategyBreakdown;
      
      if (breakdown.whiteSpaceScore > 0) {
        scores.push({
          strategyType: StrategyType.WHITE_SPACE,
          score: breakdown.whiteSpaceScore,
          confidence: 0.8,
          reasoning: 'White space analysis',
          metadata: breakdown.whiteSpace || {}
        });
      }
      
      if (breakdown.economicScore > 0) {
        scores.push({
          strategyType: StrategyType.ECONOMIC,
          score: breakdown.economicScore,
          confidence: 0.8,
          reasoning: 'Economic analysis',
          metadata: breakdown.economic || {}
        });
      }
      
      if (breakdown.anchorScore > 0) {
        scores.push({
          strategyType: StrategyType.ANCHOR,
          score: breakdown.anchorScore,
          confidence: 0.8,
          reasoning: 'Anchor analysis',
          metadata: breakdown.anchors || {}
        });
      }
      
      if (breakdown.clusterScore > 0) {
        scores.push({
          strategyType: StrategyType.CLUSTER,
          score: breakdown.clusterScore,
          confidence: 0.8,
          reasoning: 'Cluster analysis',
          metadata: breakdown.clustering || {}
        });
      }
    }
    
    return scores;
  }

  /**
   * Get processing statistics
   */
  getProcessingStats() {
    return {
      maxConcurrency: this.maxConcurrency,
      timeoutMs: this.timeoutMs,
      isOptimized: this.maxConcurrency > 1
    };
  }
}