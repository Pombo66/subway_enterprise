import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ModelConfigurationManager } from './model-configuration.service';

export interface CostReport {
  totalCost: number;
  costByModel: {
    [modelName: string]: {
      totalCost: number;
      tokensUsed: number;
      operationCount: number;
      averageCostPerOperation: number;
    };
  };
  costByOperation: {
    [operationType: string]: {
      totalCost: number;
      tokensUsed: number;
      operationCount: number;
      averageCostPerOperation: number;
    };
  };
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
  projectedMonthlyCost: number;
  savingsOpportunities: CostSavingOpportunity[];
}

export interface CostSavingOpportunity {
  type: 'MODEL_OPTIMIZATION' | 'BATCH_OPTIMIZATION' | 'CACHING_IMPROVEMENT' | 'THRESHOLD_ADJUSTMENT';
  description: string;
  potentialSavings: number;
  implementationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedImplementationTime: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CostOptimizationRecommendation {
  currentConfiguration: {
    modelUsage: { [model: string]: number };
    operationVolumes: { [operation: string]: number };
    averageCostPerOperation: number;
  };
  optimizedConfiguration: {
    recommendedModelChanges: { [operation: string]: string };
    batchSizeOptimizations: { [operation: string]: number };
    cachingImprovements: string[];
    qualityThresholdAdjustments: { [operation: string]: number };
  };
  projectedSavings: {
    dailySavings: number;
    monthlySavings: number;
    annualSavings: number;
    percentageReduction: number;
  };
  implementationPlan: {
    phase: number;
    description: string;
    estimatedSavings: number;
    implementationTime: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }[];
}

export interface CostTrackingEntry {
  id: string;
  timestamp: Date;
  operationType: string;
  modelUsed: string;
  tokensUsed: number;
  cost: number;
  operationMetadata: any;
}

@Injectable()
export class CostOptimizationEngine {
  private readonly logger = new Logger(CostOptimizationEngine.name);
  private readonly modelConfigManager: ModelConfigurationManager;
  
  // In-memory cost tracking (in production, this would be persisted)
  private costTrackingEntries: CostTrackingEntry[] = [];
  private costThresholds = {
    daily: 50, // £50 per day
    monthly: 1500, // £1500 per month
    perOperation: 0.10 // £0.10 per operation
  };

  constructor(private readonly prisma: PrismaClient) {
    this.modelConfigManager = new ModelConfigurationManager();
    this.logger.log('Cost Optimization Engine initialized');
  }

  /**
   * Track cost for an AI operation
   */
  trackCost(
    operationType: string,
    modelUsed: string,
    tokensUsed: number,
    operationMetadata: any = {}
  ): void {
    const cost = this.calculateCost(modelUsed, tokensUsed);
    
    const entry: CostTrackingEntry = {
      id: `cost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      operationType,
      modelUsed,
      tokensUsed,
      cost,
      operationMetadata
    };

    this.costTrackingEntries.push(entry);
    
    // Check for cost threshold alerts
    this.checkCostThresholds();
    
    this.logger.debug(`Cost tracked: ${operationType} using ${modelUsed} - £${cost.toFixed(4)}`);
  }

  /**
   * Generate comprehensive cost report
   */
  generateCostReport(
    startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: Date = new Date()
  ): CostReport {
    const filteredEntries = this.costTrackingEntries.filter(
      entry => entry.timestamp >= startDate && entry.timestamp <= endDate
    );

    const totalCost = filteredEntries.reduce((sum, entry) => sum + entry.cost, 0);

    // Cost by model
    const costByModel: { [modelName: string]: any } = {};
    filteredEntries.forEach(entry => {
      if (!costByModel[entry.modelUsed]) {
        costByModel[entry.modelUsed] = {
          totalCost: 0,
          tokensUsed: 0,
          operationCount: 0,
          averageCostPerOperation: 0
        };
      }
      
      costByModel[entry.modelUsed].totalCost += entry.cost;
      costByModel[entry.modelUsed].tokensUsed += entry.tokensUsed;
      costByModel[entry.modelUsed].operationCount += 1;
    });

    // Calculate averages for models
    Object.keys(costByModel).forEach(model => {
      const data = costByModel[model];
      data.averageCostPerOperation = data.operationCount > 0 ? data.totalCost / data.operationCount : 0;
    });

    // Cost by operation type
    const costByOperation: { [operationType: string]: any } = {};
    filteredEntries.forEach(entry => {
      if (!costByOperation[entry.operationType]) {
        costByOperation[entry.operationType] = {
          totalCost: 0,
          tokensUsed: 0,
          operationCount: 0,
          averageCostPerOperation: 0
        };
      }
      
      costByOperation[entry.operationType].totalCost += entry.cost;
      costByOperation[entry.operationType].tokensUsed += entry.tokensUsed;
      costByOperation[entry.operationType].operationCount += 1;
    });

    // Calculate averages for operations
    Object.keys(costByOperation).forEach(operation => {
      const data = costByOperation[operation];
      data.averageCostPerOperation = data.operationCount > 0 ? data.totalCost / data.operationCount : 0;
    });

    // Project monthly cost
    const daysInRange = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const projectedMonthlyCost = daysInRange > 0 ? (totalCost / daysInRange) * 30 : 0;

    // Identify savings opportunities
    const savingsOpportunities = this.identifySavingsOpportunities(costByModel, costByOperation);

    return {
      totalCost,
      costByModel,
      costByOperation,
      timeRange: { startDate, endDate },
      projectedMonthlyCost,
      savingsOpportunities
    };
  }

  /**
   * Generate cost optimization recommendations
   */
  generateOptimizationRecommendations(): CostOptimizationRecommendation {
    const report = this.generateCostReport();
    
    // Analyze current configuration
    const currentConfiguration = {
      modelUsage: Object.keys(report.costByModel).reduce((acc, model) => {
        acc[model] = report.costByModel[model].operationCount;
        return acc;
      }, {} as { [model: string]: number }),
      operationVolumes: Object.keys(report.costByOperation).reduce((acc, operation) => {
        acc[operation] = report.costByOperation[operation].operationCount;
        return acc;
      }, {} as { [operation: string]: number }),
      averageCostPerOperation: report.totalCost / Object.values(report.costByOperation).reduce((sum, op) => sum + op.operationCount, 0)
    };

    // Generate optimization recommendations
    const optimizedConfiguration = this.generateOptimizedConfiguration(report);
    const projectedSavings = this.calculateProjectedSavings(report, optimizedConfiguration);
    const implementationPlan = this.createImplementationPlan(optimizedConfiguration, projectedSavings);

    return {
      currentConfiguration,
      optimizedConfiguration,
      projectedSavings,
      implementationPlan
    };
  }

  /**
   * Get cost projection for different scenarios
   */
  projectCosts(scenarios: {
    operationVolumes: { [operation: string]: number };
    modelConfiguration?: { [operation: string]: string };
  }[]): {
    scenario: number;
    projectedDailyCost: number;
    projectedMonthlyCost: number;
    projectedAnnualCost: number;
  }[] {
    return scenarios.map((scenario, index) => {
      let dailyCost = 0;

      Object.entries(scenario.operationVolumes).forEach(([operation, volume]) => {
        const model = scenario.modelConfiguration?.[operation] || this.getDefaultModelForOperation(operation);
        const avgTokensPerOperation = this.getAverageTokensForOperation(operation);
        const costPerOperation = this.calculateCost(model, avgTokensPerOperation);
        
        dailyCost += volume * costPerOperation;
      });

      return {
        scenario: index + 1,
        projectedDailyCost: dailyCost,
        projectedMonthlyCost: dailyCost * 30,
        projectedAnnualCost: dailyCost * 365
      };
    });
  }

  /**
   * Monitor cost thresholds and generate alerts
   */
  private checkCostThresholds(): void {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const todaysCosts = this.costTrackingEntries
      .filter(entry => entry.timestamp >= startOfDay)
      .reduce((sum, entry) => sum + entry.cost, 0);

    if (todaysCosts > this.costThresholds.daily) {
      this.logger.warn(`Daily cost threshold exceeded: £${todaysCosts.toFixed(2)} > £${this.costThresholds.daily}`);
    }

    // Check monthly costs
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyCosts = this.costTrackingEntries
      .filter(entry => entry.timestamp >= startOfMonth)
      .reduce((sum, entry) => sum + entry.cost, 0);

    if (monthlyCosts > this.costThresholds.monthly) {
      this.logger.warn(`Monthly cost threshold exceeded: £${monthlyCosts.toFixed(2)} > £${this.costThresholds.monthly}`);
    }
  }

  /**
   * Identify cost saving opportunities
   */
  private identifySavingsOpportunities(
    costByModel: any,
    costByOperation: any
  ): CostSavingOpportunity[] {
    const opportunities: CostSavingOpportunity[] = [];

    // Model optimization opportunities
    Object.entries(costByOperation).forEach(([operation, data]: [string, any]) => {
      if (data.averageCostPerOperation > 0.05) { // £0.05 threshold
        opportunities.push({
          type: 'MODEL_OPTIMIZATION',
          description: `Consider using GPT-5-nano for ${operation} operations to reduce costs`,
          potentialSavings: data.totalCost * 0.3, // Estimated 30% savings
          implementationComplexity: 'MEDIUM',
          estimatedImplementationTime: '1-2 weeks',
          priority: 'HIGH'
        });
      }
    });

    // Batch optimization opportunities
    const highVolumeOperations = Object.entries(costByOperation)
      .filter(([, data]: [string, any]) => data.operationCount > 100)
      .map(([operation]) => operation);

    if (highVolumeOperations.length > 0) {
      opportunities.push({
        type: 'BATCH_OPTIMIZATION',
        description: `Implement batch processing for high-volume operations: ${highVolumeOperations.join(', ')}`,
        potentialSavings: Object.values(costByOperation).reduce((sum: number, data: any) => sum + data.totalCost, 0) * 0.15,
        implementationComplexity: 'HIGH',
        estimatedImplementationTime: '3-4 weeks',
        priority: 'MEDIUM'
      });
    }

    // Caching improvements
    opportunities.push({
      type: 'CACHING_IMPROVEMENT',
      description: 'Implement intelligent caching to reduce redundant AI operations',
      potentialSavings: Object.values(costByOperation).reduce((sum: number, data: any) => sum + data.totalCost, 0) * 0.20,
      implementationComplexity: 'MEDIUM',
      estimatedImplementationTime: '2-3 weeks',
      priority: 'HIGH'
    });

    return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  /**
   * Generate optimized configuration
   */
  private generateOptimizedConfiguration(report: CostReport) {
    const recommendedModelChanges: { [operation: string]: string } = {};
    const batchSizeOptimizations: { [operation: string]: number } = {};
    const cachingImprovements: string[] = [];
    const qualityThresholdAdjustments: { [operation: string]: number } = {};

    // Recommend model changes for high-cost operations
    Object.entries(report.costByOperation).forEach(([operation, data]) => {
      if (data.averageCostPerOperation > 0.05) {
        recommendedModelChanges[operation] = 'gpt-5-nano';
      }
      
      if (data.operationCount > 50) {
        batchSizeOptimizations[operation] = Math.min(100, data.operationCount * 0.1);
      }
    });

    // Caching improvements
    cachingImprovements.push('Implement result caching for market analysis');
    cachingImprovements.push('Add location candidate caching');
    cachingImprovements.push('Implement strategic zone caching');

    return {
      recommendedModelChanges,
      batchSizeOptimizations,
      cachingImprovements,
      qualityThresholdAdjustments
    };
  }

  /**
   * Calculate projected savings
   */
  private calculateProjectedSavings(report: CostReport, optimizedConfig: any) {
    const currentMonthlyCost = report.projectedMonthlyCost;
    
    // Estimate savings from model changes (30% reduction)
    const modelSavings = Object.keys(optimizedConfig.recommendedModelChanges).length > 0 ? currentMonthlyCost * 0.3 : 0;
    
    // Estimate savings from batching (15% reduction)
    const batchSavings = Object.keys(optimizedConfig.batchSizeOptimizations).length > 0 ? currentMonthlyCost * 0.15 : 0;
    
    // Estimate savings from caching (20% reduction)
    const cachingSavings = optimizedConfig.cachingImprovements.length > 0 ? currentMonthlyCost * 0.20 : 0;
    
    const totalMonthlySavings = Math.min(currentMonthlyCost * 0.5, modelSavings + batchSavings + cachingSavings); // Cap at 50%
    
    return {
      dailySavings: totalMonthlySavings / 30,
      monthlySavings: totalMonthlySavings,
      annualSavings: totalMonthlySavings * 12,
      percentageReduction: currentMonthlyCost > 0 ? (totalMonthlySavings / currentMonthlyCost) * 100 : 0
    };
  }

  /**
   * Create implementation plan
   */
  private createImplementationPlan(optimizedConfig: any, projectedSavings: any) {
    const plan = [];

    if (Object.keys(optimizedConfig.recommendedModelChanges).length > 0) {
      plan.push({
        phase: 1,
        description: 'Implement model optimization for high-cost operations',
        estimatedSavings: projectedSavings.monthlySavings * 0.5,
        implementationTime: '1-2 weeks',
        riskLevel: 'MEDIUM' as const
      });
    }

    if (optimizedConfig.cachingImprovements.length > 0) {
      plan.push({
        phase: 2,
        description: 'Implement intelligent caching system',
        estimatedSavings: projectedSavings.monthlySavings * 0.3,
        implementationTime: '2-3 weeks',
        riskLevel: 'LOW' as const
      });
    }

    if (Object.keys(optimizedConfig.batchSizeOptimizations).length > 0) {
      plan.push({
        phase: 3,
        description: 'Optimize batch processing for high-volume operations',
        estimatedSavings: projectedSavings.monthlySavings * 0.2,
        implementationTime: '3-4 weeks',
        riskLevel: 'HIGH' as const
      });
    }

    return plan;
  }

  /**
   * Calculate cost for model and token usage
   */
  private calculateCost(modelName: string, tokensUsed: number): number {
    const pricing = this.modelConfigManager.getModelPricing(modelName);
    const inputTokens = tokensUsed * 0.7; // Assume 70% input
    const outputTokens = tokensUsed * 0.3; // Assume 30% output
    
    const costUSD = (inputTokens * pricing.inputTokensPerMillion / 1000000) + 
                   (outputTokens * pricing.outputTokensPerMillion / 1000000);
    
    return costUSD * 0.8; // Convert to GBP
  }

  /**
   * Get default model for operation type
   */
  private getDefaultModelForOperation(operation: string): string {
    // Map operation types to default models
    const operationModelMap: { [key: string]: string } = {
      'market_analysis': 'gpt-5-mini',
      'location_discovery': 'gpt-5-nano',
      'strategic_scoring': 'gpt-5-mini',
      'rationale_generation': 'gpt-5-mini'
    };

    return operationModelMap[operation] || 'gpt-5-mini';
  }

  /**
   * Get average tokens for operation type
   */
  private getAverageTokensForOperation(operation: string): number {
    const operationTokenMap: { [key: string]: number } = {
      'market_analysis': 3000,
      'location_discovery': 1500,
      'strategic_scoring': 2500,
      'rationale_generation': 800
    };

    return operationTokenMap[operation] || 2000;
  }

  /**
   * Update cost thresholds
   */
  updateCostThresholds(thresholds: {
    daily?: number;
    monthly?: number;
    perOperation?: number;
  }): void {
    this.costThresholds = { ...this.costThresholds, ...thresholds };
    this.logger.log('Cost thresholds updated:', this.costThresholds);
  }

  /**
   * Get current cost statistics
   */
  getCurrentCostStats(): {
    todaysCost: number;
    monthsCost: number;
    averageCostPerOperation: number;
    totalOperations: number;
  } {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todaysCost = this.costTrackingEntries
      .filter(entry => entry.timestamp >= startOfDay)
      .reduce((sum, entry) => sum + entry.cost, 0);

    const monthsCost = this.costTrackingEntries
      .filter(entry => entry.timestamp >= startOfMonth)
      .reduce((sum, entry) => sum + entry.cost, 0);

    const totalOperations = this.costTrackingEntries.length;
    const totalCost = this.costTrackingEntries.reduce((sum, entry) => sum + entry.cost, 0);
    const averageCostPerOperation = totalOperations > 0 ? totalCost / totalOperations : 0;

    return {
      todaysCost,
      monthsCost,
      averageCostPerOperation,
      totalOperations
    };
  }
}