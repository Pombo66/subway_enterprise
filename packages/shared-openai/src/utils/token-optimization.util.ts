/**
 * Token Optimization Utility
 * Provides utilities for optimizing token usage and prompt efficiency
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

export interface TokenOptimizationConfig {
  maxOutputTokens: number;
  targetPromptTokens: number;
  enableCompression: boolean;
  useAbbreviations: boolean;
  removeRedundancy: boolean;
}

export interface OptimizedPrompt {
  originalText: string;
  optimizedText: string;
  tokensSaved: number;
  compressionRatio: number;
  optimizations: string[];
}

export interface TokenUsageStats {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  efficiency: number;
}

export class TokenOptimizationUtil {
  private static readonly ABBREVIATIONS = new Map([
    ['Population', 'Pop'],
    ['Proximity', 'Prox'],
    ['Distance', 'Dist'],
    ['Building', 'Bldg'],
    ['Store', 'Store'],
    ['Turnover', 'Turn'],
    ['Percentile', 'th'],
    ['Urban Density', 'Urban'],
    ['Trade Area', 'Area'],
    ['kilometers', 'km'],
    ['meters', 'm'],
    ['unknown', 'NA'],
    ['not available', 'NA'],
    ['data not available', 'NA']
  ]);

  private static readonly REDUNDANT_PHRASES = [
    'Please note that',
    'It should be noted that',
    'It is important to mention that',
    'As you can see',
    'Obviously',
    'Clearly',
    'In conclusion',
    'To summarize',
    'In summary'
  ];

  /**
   * Optimize prompt for minimal token usage
   * Requirements: 4.1, 4.2, 4.5
   */
  static optimizePrompt(
    text: string,
    config: Partial<TokenOptimizationConfig> = {}
  ): OptimizedPrompt {
    const fullConfig: TokenOptimizationConfig = {
      maxOutputTokens: 200,
      targetPromptTokens: 150,
      enableCompression: true,
      useAbbreviations: true,
      removeRedundancy: true,
      ...config
    };

    let optimizedText = text;
    const optimizations: string[] = [];
    const originalLength = text.length;

    // Step 1: Remove redundant phrases
    if (fullConfig.removeRedundancy) {
      const beforeRedundancy = optimizedText.length;
      optimizedText = this.removeRedundantPhrases(optimizedText);
      if (optimizedText.length < beforeRedundancy) {
        optimizations.push('Removed redundant phrases');
      }
    }

    // Step 2: Apply abbreviations
    if (fullConfig.useAbbreviations) {
      const beforeAbbrev = optimizedText.length;
      optimizedText = this.applyAbbreviations(optimizedText);
      if (optimizedText.length < beforeAbbrev) {
        optimizations.push('Applied abbreviations');
      }
    }

    // Step 3: Compress structure
    if (fullConfig.enableCompression) {
      const beforeCompression = optimizedText.length;
      optimizedText = this.compressStructure(optimizedText);
      if (optimizedText.length < beforeCompression) {
        optimizations.push('Compressed structure');
      }
    }

    // Step 4: Replace verbose placeholders with sentinels
    const beforeSentinels = optimizedText.length;
    optimizedText = this.replacePlaceholdersWithSentinels(optimizedText);
    if (optimizedText.length < beforeSentinels) {
      optimizations.push('Replaced verbose placeholders with sentinels');
    }

    const finalLength = optimizedText.length;
    const tokensSaved = this.estimateTokensSaved(originalLength, finalLength);
    const compressionRatio = finalLength / originalLength;

    return {
      originalText: text,
      optimizedText,
      tokensSaved,
      compressionRatio,
      optimizations
    };
  }

  /**
   * Create concise context string for API requests
   * Requirement 4.3: Send null values instead of verbose placeholder text
   */
  static createConciseContext(contextData: Record<string, any>): string {
    const parts: string[] = [];

    for (const [key, value] of Object.entries(contextData)) {
      if (value === null || value === undefined) {
        continue; // Skip null values entirely
      }

      if (value === 'unknown' || value === 'not available') {
        parts.push(`${this.abbreviateKey(key)}: NA`);
      } else if (typeof value === 'number') {
        parts.push(`${this.abbreviateKey(key)}: ${this.formatNumber(value)}`);
      } else if (typeof value === 'string' && value.trim().length > 0) {
        parts.push(`${this.abbreviateKey(key)}: ${value}`);
      }
    }

    return parts.join(', ');
  }

  /**
   * Optimize API request parameters for token efficiency
   * Requirements: 4.1, 4.2
   */
  static optimizeAPIRequest(request: any): any {
    const optimized = { ...request };

    // Reduce max_output_tokens for rationale generation (Requirement 4.1)
    if (optimized.max_output_tokens > 250) {
      optimized.max_output_tokens = Math.min(200, optimized.max_output_tokens);
    }

    // Set reasoning effort to low for efficiency (Requirement 4.2)
    if (optimized.reasoning) {
      optimized.reasoning.effort = 'low';
    }

    // Set text verbosity to low for concise output (Requirement 4.5)
    if (optimized.text) {
      optimized.text.verbosity = 'low';
    }

    return optimized;
  }

  /**
   * Calculate token usage statistics
   */
  static calculateTokenStats(
    promptText: string,
    outputText: string,
    model: string = 'gpt-5'
  ): TokenUsageStats {
    const promptTokens = this.estimateTokenCount(promptText);
    const outputTokens = this.estimateTokenCount(outputText);
    const totalTokens = promptTokens + outputTokens;
    
    // Rough cost estimation (adjust based on actual pricing)
    const costPerToken = model.includes('gpt-5') ? 0.00001 : 0.000002;
    const estimatedCost = totalTokens * costPerToken;
    
    // Efficiency metric (output tokens per prompt token)
    const efficiency = promptTokens > 0 ? outputTokens / promptTokens : 0;

    return {
      promptTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
      efficiency
    };
  }

  /**
   * Generate token usage report
   */
  static generateTokenReport(
    originalPrompt: string,
    optimizedPrompt: string,
    outputText: string,
    model: string = 'gpt-5'
  ): TokenReport {
    const originalStats = this.calculateTokenStats(originalPrompt, outputText, model);
    const optimizedStats = this.calculateTokenStats(optimizedPrompt, outputText, model);
    
    const tokensSaved = originalStats.totalTokens - optimizedStats.totalTokens;
    const costSaved = originalStats.estimatedCost - optimizedStats.estimatedCost;
    const efficiencyGain = optimizedStats.efficiency - originalStats.efficiency;

    return {
      original: originalStats,
      optimized: optimizedStats,
      savings: {
        tokens: tokensSaved,
        cost: costSaved,
        percentage: (tokensSaved / originalStats.totalTokens) * 100
      },
      efficiencyGain,
      recommendations: this.generateOptimizationRecommendations(originalStats, optimizedStats)
    };
  }

  /**
   * Remove redundant phrases from text
   */
  private static removeRedundantPhrases(text: string): string {
    let result = text;
    
    for (const phrase of this.REDUNDANT_PHRASES) {
      const regex = new RegExp(`\\b${phrase}\\b,?\\s*`, 'gi');
      result = result.replace(regex, '');
    }

    // Clean up extra spaces and punctuation
    result = result.replace(/\s+/g, ' ').trim();
    result = result.replace(/,\s*,/g, ',');
    result = result.replace(/\.\s*\./g, '.');

    return result;
  }

  /**
   * Apply abbreviations to reduce token count
   */
  private static applyAbbreviations(text: string): string {
    let result = text;
    
    for (const [full, abbrev] of this.ABBREVIATIONS.entries()) {
      const regex = new RegExp(`\\b${full}\\b`, 'gi');
      result = result.replace(regex, abbrev);
    }

    return result;
  }

  /**
   * Compress text structure for efficiency
   */
  private static compressStructure(text: string): string {
    let result = text;

    // Remove unnecessary articles
    result = result.replace(/\b(a|an|the)\s+/gi, '');
    
    // Compress common phrases
    result = result.replace(/\bis suitable for\b/gi, 'suits');
    result = result.replace(/\blocation is\b/gi, 'location');
    result = result.replace(/\brestaurant location\b/gi, 'site');
    result = result.replace(/\bSubway restaurant\b/gi, 'Subway');
    
    // Remove filler words
    result = result.replace(/\b(very|quite|rather|somewhat|fairly)\s+/gi, '');
    
    return result.trim();
  }

  /**
   * Replace verbose placeholders with explicit sentinels
   * Requirement 4.3: Use explicit sentinels like 'NA' for missing data
   */
  private static replacePlaceholdersWithSentinels(text: string): string {
    let result = text;

    // Replace verbose unknown indicators
    result = result.replace(/\bunknown \(data not available\)/gi, 'NA');
    result = result.replace(/\bdata not available\b/gi, 'NA');
    result = result.replace(/\bnot available\b/gi, 'NA');
    result = result.replace(/\bunknown\b/gi, 'NA');
    result = result.replace(/\bmissing data\b/gi, 'NA');
    result = result.replace(/\bno data\b/gi, 'NA');

    return result;
  }

  /**
   * Abbreviate context keys for efficiency
   */
  private static abbreviateKey(key: string): string {
    const abbreviations: Record<string, string> = {
      'population': 'Pop',
      'proximity': 'Prox',
      'distance': 'Dist',
      'building': 'Bldg',
      'urban': 'Urban',
      'turnover': 'Turn',
      'nearest': 'Near',
      'trade_area': 'Area'
    };

    return abbreviations[key.toLowerCase()] || key;
  }

  /**
   * Format numbers for concise display
   */
  private static formatNumber(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    } else if (value % 1 === 0) {
      return value.toString();
    } else {
      return value.toFixed(2);
    }
  }

  /**
   * Estimate token count from text length
   */
  private static estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate tokens saved from length reduction
   */
  private static estimateTokensSaved(originalLength: number, optimizedLength: number): number {
    const lengthSaved = originalLength - optimizedLength;
    return Math.ceil(lengthSaved / 4);
  }

  /**
   * Generate optimization recommendations
   */
  private static generateOptimizationRecommendations(
    original: TokenUsageStats,
    optimized: TokenUsageStats
  ): string[] {
    const recommendations: string[] = [];

    if (original.promptTokens > 200) {
      recommendations.push('Consider further prompt compression - current prompt is still lengthy');
    }

    if (optimized.efficiency < 0.5) {
      recommendations.push('Low output efficiency - consider adjusting max_output_tokens');
    }

    const savingsPercentage = ((original.totalTokens - optimized.totalTokens) / original.totalTokens) * 100;
    
    if (savingsPercentage < 10) {
      recommendations.push('Limited token savings achieved - review for additional optimization opportunities');
    } else if (savingsPercentage > 30) {
      recommendations.push('Excellent token optimization achieved - monitor output quality');
    }

    return recommendations;
  }
}

export interface TokenReport {
  original: TokenUsageStats;
  optimized: TokenUsageStats;
  savings: {
    tokens: number;
    cost: number;
    percentage: number;
  };
  efficiencyGain: number;
  recommendations: string[];
}