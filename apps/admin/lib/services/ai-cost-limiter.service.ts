/**
 * AI Cost Limiter Service
 * Limits AI processing to only the top candidates to reduce costs
 */

export interface AICostLimiterConfig {
  enabled: boolean;
  maxPercentage: number; // Percentage of candidates to process with AI
  developmentMode: boolean;
  maxAbsoluteCount?: number; // Hard cap regardless of percentage
}

export class AICostLimiterService {
  private static readonly DEFAULT_CONFIG: AICostLimiterConfig = {
    enabled: true,
    maxPercentage: parseInt(process.env.AI_CANDIDATE_PERCENTAGE || '20'), // Configurable percentage
    developmentMode: process.env.NODE_ENV === 'development',
    maxAbsoluteCount: parseInt(process.env.AI_MAX_CANDIDATES || '60') // Configurable max count
  };

  /**
   * Calculate how many candidates should get AI processing
   */
  static calculateAILimit(
    totalCandidates: number,
    aggressionLevel: number,
    config: Partial<AICostLimiterConfig> = {}
  ): {
    aiCandidateCount: number;
    totalCandidates: number;
    percentageWithAI: number;
    costSavings: {
      tokensSkipped: number;
      estimatedSavings: number; // in GBP
    };
  } {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    // If disabled, process all candidates
    if (!finalConfig.enabled) {
      return {
        aiCandidateCount: totalCandidates,
        totalCandidates,
        percentageWithAI: 100,
        costSavings: {
          tokensSkipped: 0,
          estimatedSavings: 0
        }
      };
    }

    // Calculate AI candidate count
    let aiCandidateCount = Math.ceil(totalCandidates * (finalConfig.maxPercentage / 100));

    // Apply absolute cap if configured
    if (finalConfig.maxAbsoluteCount) {
      aiCandidateCount = Math.min(aiCandidateCount, finalConfig.maxAbsoluteCount);
    }

    // Ensure we don't exceed total candidates
    aiCandidateCount = Math.min(aiCandidateCount, totalCandidates);

    // Calculate cost savings
    const candidatesSkipped = totalCandidates - aiCandidateCount;
    const tokensPerCandidate = 150; // Average tokens per AI rationale
    const tokensSkipped = candidatesSkipped * tokensPerCandidate;
    const estimatedSavings = this.estimateCost(tokensSkipped);

    const percentageWithAI = totalCandidates > 0 ? (aiCandidateCount / totalCandidates) * 100 : 0;

    return {
      aiCandidateCount,
      totalCandidates,
      percentageWithAI,
      costSavings: {
        tokensSkipped,
        estimatedSavings
      }
    };
  }

  /**
   * Get AI limit based on aggression level mapping
   */
  static getAILimitForAggression(aggression: number): {
    targetStores: number;
    aiCandidates: number;
    description: string;
  } {
    // Map aggression to target stores (same as intensity config)
    let targetStores: number;
    let intensityName: string;

    if (aggression <= 20) {
      targetStores = 50;
      intensityName = 'Light';
    } else if (aggression <= 40) {
      targetStores = 100;
      intensityName = 'Moderate';
    } else if (aggression <= 60) {
      targetStores = 150;
      intensityName = 'Medium';
    } else if (aggression <= 80) {
      targetStores = 200;
      intensityName = 'High';
    } else {
      targetStores = 300;
      intensityName = 'Aggressive';
    }

    const result = this.calculateAILimit(targetStores, aggression);

    return {
      targetStores,
      aiCandidates: result.aiCandidateCount,
      description: `${intensityName} (${targetStores} total, ${result.aiCandidateCount} with AI - ${result.percentageWithAI.toFixed(0)}%)`
    };
  }

  /**
   * Determine which candidates should get AI processing
   * Returns indices of candidates that should get AI processing
   */
  static selectCandidatesForAI<T>(
    candidates: T[],
    scoreExtractor: (candidate: T) => number,
    aggressionLevel: number,
    config: Partial<AICostLimiterConfig> = {}
  ): {
    aiCandidateIndices: number[];
    skippedIndices: number[];
    summary: {
      total: number;
      withAI: number;
      skipped: number;
      percentageWithAI: number;
      estimatedSavings: number;
    };
  } {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const limit = this.calculateAILimit(candidates.length, aggressionLevel, finalConfig);

    // If processing all candidates, return all indices
    if (limit.aiCandidateCount >= candidates.length) {
      return {
        aiCandidateIndices: candidates.map((_, index) => index),
        skippedIndices: [],
        summary: {
          total: candidates.length,
          withAI: candidates.length,
          skipped: 0,
          percentageWithAI: 100,
          estimatedSavings: 0
        }
      };
    }

    // Sort candidates by score (highest first) and take top N
    const candidatesWithIndices = candidates.map((candidate, index) => ({
      candidate,
      index,
      score: scoreExtractor(candidate)
    }));

    candidatesWithIndices.sort((a, b) => b.score - a.score);

    const aiCandidateIndices = candidatesWithIndices
      .slice(0, limit.aiCandidateCount)
      .map(item => item.index);

    const skippedIndices = candidatesWithIndices
      .slice(limit.aiCandidateCount)
      .map(item => item.index);

    return {
      aiCandidateIndices,
      skippedIndices,
      summary: {
        total: candidates.length,
        withAI: limit.aiCandidateCount,
        skipped: skippedIndices.length,
        percentageWithAI: limit.percentageWithAI,
        estimatedSavings: limit.costSavings.estimatedSavings
      }
    };
  }

  /**
   * Get development mode configuration
   */
  static getDevelopmentConfig(): AICostLimiterConfig {
    return {
      enabled: true,
      maxPercentage: 20, // Even more restrictive in development
      developmentMode: true,
      maxAbsoluteCount: 30 // Lower absolute cap for development
    };
  }

  /**
   * Get production mode configuration
   */
  static getProductionConfig(): AICostLimiterConfig {
    return {
      enabled: true,
      maxPercentage: 20, // 20% in production too
      developmentMode: false,
      maxAbsoluteCount: 60 // Higher cap for production
    };
  }

  /**
   * Estimate cost in GBP based on tokens
   */
  private static estimateCost(tokens: number): number {
    // GPT-5-mini: $0.15 per 1M input tokens, $0.60 per 1M output tokens
    // Assume 70% input, 30% output, convert to GBP (~0.8 USD/GBP)
    const inputTokens = tokens * 0.7;
    const outputTokens = tokens * 0.3;
    
    const costUSD = (inputTokens * 0.15 / 1000000) + (outputTokens * 0.60 / 1000000);
    const costGBP = costUSD * 0.8;
    
    return costGBP;
  }

  /**
   * Log cost savings information
   */
  static logCostSavings(
    aggressionLevel: number,
    totalCandidates: number,
    aiCandidates: number,
    estimatedSavings: number
  ): void {
    const percentageWithAI = totalCandidates > 0 ? (aiCandidates / totalCandidates) * 100 : 0;
    const candidatesSkipped = totalCandidates - aiCandidates;

    console.log(`💰 AI Cost Limiting Active:`);
    console.log(`   Aggression Level: ${aggressionLevel}`);
    console.log(`   Total Candidates: ${totalCandidates}`);
    console.log(`   AI Processing: ${aiCandidates} (${percentageWithAI.toFixed(1)}%)`);
    console.log(`   Skipped: ${candidatesSkipped} candidates`);
    console.log(`   Estimated Savings: £${estimatedSavings.toFixed(4)}`);
  }
}