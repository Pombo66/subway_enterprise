import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { StoreIntelligenceService } from './store-intelligence.service';

export interface AIControlConfig {
  continuousEnabled: boolean;
  onDemandEnabled: boolean;
  dailyCostLimit: number;
  monthlyCostLimit: number;
  maxAnalysesPerHour: number;
  maxAnalysesPerStorePerDay: number;
}

export interface CostStatus {
  dailySpent: number;
  dailyLimit: number;
  dailyRemaining: number;
  dailyPercent: number;
  monthlySpent: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  monthlyPercent: number;
}

export interface AnalysisPermission {
  allowed: boolean;
  reason?: string;
  costStatus: CostStatus;
}

/**
 * AI Intelligence Controller Service
 * Controls AI analysis execution with cost limits and rate limiting
 * Does NOT modify existing functionality - purely additive
 */
@Injectable()
export class AIIntelligenceControllerService {
  private readonly logger = new Logger(AIIntelligenceControllerService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly storeIntelligence: StoreIntelligenceService
  ) {
    this.logger.log('AI Intelligence Controller initialized');
  }

  /**
   * Check if AI analysis is allowed
   */
  async canRunAnalysis(type: 'continuous' | 'ondemand'): Promise<AnalysisPermission> {
    try {
      // 1. Get configuration
      const config = await this.getConfig();

      // 2. Check feature flags
      if (type === 'continuous' && !config.continuousEnabled) {
        return {
          allowed: false,
          reason: 'Continuous intelligence is disabled',
          costStatus: await this.getCostStatus()
        };
      }

      if (type === 'ondemand' && !config.onDemandEnabled) {
        return {
          allowed: false,
          reason: 'On-demand intelligence is disabled',
          costStatus: await this.getCostStatus()
        };
      }

      // 3. Check cost limits
      const costStatus = await this.getCostStatus();

      if (costStatus.dailySpent >= config.dailyCostLimit) {
        return {
          allowed: false,
          reason: `Daily cost limit reached ($${config.dailyCostLimit.toFixed(2)})`,
          costStatus
        };
      }

      if (costStatus.monthlySpent >= config.monthlyCostLimit) {
        return {
          allowed: false,
          reason: `Monthly cost limit reached ($${config.monthlyCostLimit.toFixed(2)})`,
          costStatus
        };
      }

      // 4. Check rate limits
      const recentAnalyses = await this.getRecentAnalysisCount(60); // Last hour

      if (recentAnalyses >= config.maxAnalysesPerHour) {
        return {
          allowed: false,
          reason: `Rate limit exceeded (${config.maxAnalysesPerHour}/hour)`,
          costStatus
        };
      }

      return {
        allowed: true,
        costStatus
      };
    } catch (error) {
      this.logger.error('Failed to check analysis permission:', error);
      throw error;
    }
  }

  /**
   * Run on-demand analysis (user-triggered)
   */
  async runOnDemandAnalysis(storeId: string, userId: string, premium: boolean = false): Promise<any> {
    this.logger.log(`On-demand analysis requested for store ${storeId} by user ${userId} (premium: ${premium})`);

    try {
      // 1. Check if allowed
      const permission = await this.canRunAnalysis('ondemand');

      if (!permission.allowed) {
        throw new Error(`Analysis not allowed: ${permission.reason}`);
      }

      // 2. Check per-store rate limit
      const storeAnalysesToday = await this.getStoreAnalysisCount(storeId, 24);
      const config = await this.getConfig();

      if (storeAnalysesToday >= config.maxAnalysesPerStorePerDay) {
        throw new Error(`Store analysis limit reached (${config.maxAnalysesPerStorePerDay}/day)`);
      }

      // 3. Run analysis
      const startTime = Date.now();
      const analysis = await this.storeIntelligence.analyzeStore({
        storeId,
        premium,
        includeRecommendations: true,
        includePeerBenchmark: true,
        includeRevenuePrediction: true
      });
      const duration = Date.now() - startTime;

      // 4. Track usage
      await this.trackAnalysis({
        type: 'ondemand',
        storeId,
        userId,
        model: analysis.metadata.model,
        tokensUsed: analysis.metadata.tokensUsed,
        cost: analysis.metadata.cost,
        duration
      });

      // 5. Check cost alerts
      await this.checkCostAlerts();

      this.logger.log(`Analysis complete for store ${storeId}: $${analysis.metadata.cost.toFixed(4)}`);

      return analysis;
    } catch (error) {
      this.logger.error(`On-demand analysis failed for store ${storeId}:`, error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<AIControlConfig> {
    try {
      // Environment variables (defaults)
      const envConfig = {
        continuousEnabled: process.env.AI_CONTINUOUS_INTELLIGENCE_ENABLED === 'true',
        onDemandEnabled: process.env.AI_ONDEMAND_INTELLIGENCE_ENABLED !== 'false', // Default true
        dailyCostLimit: parseFloat(process.env.AI_DAILY_COST_LIMIT || '50'),
        monthlyCostLimit: parseFloat(process.env.AI_MONTHLY_COST_LIMIT || '1000'),
        maxAnalysesPerHour: parseInt(process.env.AI_MAX_ANALYSES_PER_HOUR || '100'),
        maxAnalysesPerStorePerDay: parseInt(process.env.AI_MAX_ANALYSES_PER_STORE_PER_DAY || '5')
      };

      // Check database feature flags (override env)
      const flags = await this.prisma.featureFlag.findMany({
        where: {
          key: {
            in: ['ai_continuous_intelligence', 'ai_ondemand_intelligence']
          }
        }
      });

      const flagMap = new Map(flags.map(f => [f.key, f.enabled]));

      return {
        ...envConfig,
        continuousEnabled: flagMap.get('ai_continuous_intelligence') ?? envConfig.continuousEnabled,
        onDemandEnabled: flagMap.get('ai_ondemand_intelligence') ?? envConfig.onDemandEnabled
      };
    } catch (error) {
      this.logger.warn('Failed to get config from database, using env defaults:', error);
      // Return env defaults if database query fails
      return {
        continuousEnabled: process.env.AI_CONTINUOUS_INTELLIGENCE_ENABLED === 'true',
        onDemandEnabled: process.env.AI_ONDEMAND_INTELLIGENCE_ENABLED !== 'false',
        dailyCostLimit: parseFloat(process.env.AI_DAILY_COST_LIMIT || '50'),
        monthlyCostLimit: parseFloat(process.env.AI_MONTHLY_COST_LIMIT || '1000'),
        maxAnalysesPerHour: parseInt(process.env.AI_MAX_ANALYSES_PER_HOUR || '100'),
        maxAnalysesPerStorePerDay: parseInt(process.env.AI_MAX_ANALYSES_PER_STORE_PER_DAY || '5')
      };
    }
  }

  /**
   * Get cost status
   */
  async getCostStatus(): Promise<CostStatus> {
    try {
      const config = await this.getConfig();

      // Get today's costs
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const dailyResult = await this.prisma.storeAnalysis.aggregate({
        where: {
          analysisDate: { gte: todayStart }
        },
        _sum: {
          tokensUsed: true
        }
      });

      // Rough cost estimate (will be more accurate when we track actual costs)
      const dailySpent = ((dailyResult._sum.tokensUsed || 0) / 1_000_000) * 0.5; // Rough estimate

      // Get this month's costs
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthlyResult = await this.prisma.storeAnalysis.aggregate({
        where: {
          analysisDate: { gte: monthStart }
        },
        _sum: {
          tokensUsed: true
        }
      });

      const monthlySpent = ((monthlyResult._sum.tokensUsed || 0) / 1_000_000) * 0.5; // Rough estimate

      return {
        dailySpent,
        dailyLimit: config.dailyCostLimit,
        dailyRemaining: Math.max(0, config.dailyCostLimit - dailySpent),
        dailyPercent: (dailySpent / config.dailyCostLimit) * 100,
        monthlySpent,
        monthlyLimit: config.monthlyCostLimit,
        monthlyRemaining: Math.max(0, config.monthlyCostLimit - monthlySpent),
        monthlyPercent: (monthlySpent / config.monthlyCostLimit) * 100
      };
    } catch (error) {
      this.logger.error('Failed to get cost status:', error);
      const config = await this.getConfig();
      return {
        dailySpent: 0,
        dailyLimit: config.dailyCostLimit,
        dailyRemaining: config.dailyCostLimit,
        dailyPercent: 0,
        monthlySpent: 0,
        monthlyLimit: config.monthlyCostLimit,
        monthlyRemaining: config.monthlyCostLimit,
        monthlyPercent: 0
      };
    }
  }

  /**
   * Track analysis execution
   */
  private async trackAnalysis(data: {
    type: 'continuous' | 'ondemand';
    storeId: string;
    userId: string;
    model: string;
    tokensUsed: number;
    cost: number;
    duration: number;
  }): Promise<void> {
    try {
      // Log to telemetry
      await this.prisma.telemetryEvent.create({
        data: {
          eventType: 'ai_analysis',
          userId: data.userId,
          properties: JSON.stringify({
            type: data.type,
            storeId: data.storeId,
            model: data.model,
            tokensUsed: data.tokensUsed,
            cost: data.cost,
            duration: data.duration
          })
        }
      });

      this.logger.log(`Analysis tracked: ${data.type} - $${data.cost.toFixed(4)} (${data.tokensUsed} tokens)`);
    } catch (error) {
      this.logger.warn('Failed to track analysis:', error);
      // Don't throw - tracking is optional
    }
  }

  /**
   * Check if we should send cost alerts
   */
  private async checkCostAlerts(): Promise<void> {
    try {
      const costStatus = await this.getCostStatus();
      const alertThreshold = parseFloat(process.env.AI_COST_ALERT_THRESHOLD || '0.80');

      if (costStatus.dailyPercent >= alertThreshold * 100) {
        this.logger.warn(
          `⚠️ Daily AI cost at ${costStatus.dailyPercent.toFixed(0)}% of limit ` +
          `($${costStatus.dailySpent.toFixed(2)}/$${costStatus.dailyLimit})`
        );
        // TODO: Send notification to admins
      }

      if (costStatus.monthlyPercent >= alertThreshold * 100) {
        this.logger.warn(
          `⚠️ Monthly AI cost at ${costStatus.monthlyPercent.toFixed(0)}% of limit ` +
          `($${costStatus.monthlySpent.toFixed(2)}/$${costStatus.monthlyLimit})`
        );
        // TODO: Send notification to admins
      }
    } catch (error) {
      this.logger.warn('Failed to check cost alerts:', error);
    }
  }

  /**
   * Get recent analysis count
   */
  private async getRecentAnalysisCount(minutes: number): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - minutes * 60 * 1000);

      const count = await this.prisma.storeAnalysis.count({
        where: {
          analysisDate: { gte: cutoff }
        }
      });

      return count;
    } catch (error) {
      this.logger.warn('Failed to get recent analysis count:', error);
      return 0;
    }
  }

  /**
   * Get store analysis count
   */
  private async getStoreAnalysisCount(storeId: string, hours: number): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

      const count = await this.prisma.storeAnalysis.count({
        where: {
          storeId,
          analysisDate: { gte: cutoff }
        }
      });

      return count;
    } catch (error) {
      this.logger.warn('Failed to get store analysis count:', error);
      return 0;
    }
  }

  /**
   * Toggle continuous intelligence
   */
  async toggleContinuousIntelligence(enabled: boolean): Promise<void> {
    try {
      await this.prisma.featureFlag.upsert({
        where: { key: 'ai_continuous_intelligence' },
        create: {
          key: 'ai_continuous_intelligence',
          enabled,
          description: 'Enable continuous AI analysis of all stores'
        },
        update: { enabled }
      });

      this.logger.log(`Continuous intelligence ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      this.logger.error('Failed to toggle continuous intelligence:', error);
      throw error;
    }
  }

  /**
   * Toggle on-demand intelligence
   */
  async toggleOnDemandIntelligence(enabled: boolean): Promise<void> {
    try {
      await this.prisma.featureFlag.upsert({
        where: { key: 'ai_ondemand_intelligence' },
        create: {
          key: 'ai_ondemand_intelligence',
          enabled,
          description: 'Enable on-demand AI analysis'
        },
        update: { enabled }
      });

      this.logger.log(`On-demand intelligence ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      this.logger.error('Failed to toggle on-demand intelligence:', error);
      throw error;
    }
  }
}
