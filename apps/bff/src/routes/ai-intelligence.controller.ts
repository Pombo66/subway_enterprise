import { Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AIIntelligenceControllerService } from '../services/ai/ai-intelligence-controller.service';
import { AIModelConfigService } from '../services/ai/ai-model-config.service';
import { StoreIntelligenceService } from '../services/ai/store-intelligence.service';
import { StoreContextBuilderService } from '../services/ai/store-context-builder.service';

/**
 * AI Intelligence Controller
 * New routes for AI-powered store intelligence
 * Does NOT modify existing routes - purely additive
 */
@Controller('ai/intelligence')
export class AIIntelligenceController {
  private readonly aiController: AIIntelligenceControllerService;
  private readonly storeIntelligence: StoreIntelligenceService;
  private readonly modelConfig: AIModelConfigService;
  private readonly contextBuilder: StoreContextBuilderService;

  constructor(private readonly prisma: PrismaClient) {
    // Initialize services
    this.modelConfig = new AIModelConfigService();
    this.contextBuilder = new StoreContextBuilderService(prisma);
    this.storeIntelligence = new StoreIntelligenceService(
      prisma,
      this.modelConfig,
      this.contextBuilder
    );
    this.aiController = new AIIntelligenceControllerService(
      prisma,
      this.storeIntelligence
    );
  }

  /**
   * Get AI intelligence status
   * GET /ai/intelligence/status
   */
  @Get('status')
  async getStatus() {
    try {
      const [config, costStatus, permission] = await Promise.all([
        this.aiController.getConfig(),
        this.aiController.getCostStatus(),
        this.aiController.canRunAnalysis('ondemand')
      ]);

      return {
        config: {
          continuousEnabled: config.continuousEnabled,
          onDemandEnabled: config.onDemandEnabled,
          dailyCostLimit: config.dailyCostLimit,
          monthlyCostLimit: config.monthlyCostLimit
        },
        costStatus,
        canAnalyze: permission.allowed,
        reason: permission.reason
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Analyze a store (on-demand)
   * POST /ai/intelligence/analyze/:storeId
   */
  @Post('analyze/:storeId')
  async analyzeStore(
    @Param('storeId') storeId: string,
    @Body() body: { userId?: string; premium?: boolean }
  ) {
    try {
      const userId = body.userId || 'system';
      const premium = body.premium || false;

      const analysis = await this.aiController.runOnDemandAnalysis(
        storeId,
        userId,
        premium
      );

      return {
        success: true,
        analysis
      };
    } catch (error) {
      throw new HttpException(
        `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Get latest analysis for a store
   * GET /ai/intelligence/stores/:storeId/latest
   */
  @Get('stores/:storeId/latest')
  async getLatestAnalysis(@Param('storeId') storeId: string) {
    try {
      const analysis = await this.prisma.storeAnalysis.findFirst({
        where: { storeId },
        orderBy: { analysisDate: 'desc' }
      });

      if (!analysis) {
        return {
          hasAnalysis: false,
          message: 'No analysis found for this store'
        };
      }

      return {
        hasAnalysis: true,
        analysis: {
          id: analysis.id,
          analysisDate: analysis.analysisDate,
          locationQualityScore: analysis.locationQualityScore,
          locationRating: analysis.locationRating,
          primaryFactor: analysis.primaryFactor,
          expectedRevenue: analysis.expectedRevenue,
          actualRevenue: analysis.actualRevenue,
          performanceGap: analysis.performanceGap,
          recommendationPriority: analysis.recommendationPriority,
          model: analysis.model,
          tokensUsed: analysis.tokensUsed
        }
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Toggle continuous intelligence
   * POST /ai/intelligence/continuous/toggle
   */
  @Post('continuous/toggle')
  async toggleContinuous(@Body() body: { enabled: boolean }) {
    try {
      await this.aiController.toggleContinuousIntelligence(body.enabled);

      return {
        success: true,
        enabled: body.enabled,
        message: `Continuous intelligence ${body.enabled ? 'enabled' : 'disabled'}`
      };
    } catch (error) {
      throw new HttpException(
        `Failed to toggle: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Toggle on-demand intelligence
   * POST /ai/intelligence/ondemand/toggle
   */
  @Post('ondemand/toggle')
  async toggleOnDemand(@Body() body: { enabled: boolean }) {
    try {
      await this.aiController.toggleOnDemandIntelligence(body.enabled);

      return {
        success: true,
        enabled: body.enabled,
        message: `On-demand intelligence ${body.enabled ? 'enabled' : 'disabled'}`
      };
    } catch (error) {
      throw new HttpException(
        `Failed to toggle: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get cost report
   * GET /ai/intelligence/costs/report
   */
  @Get('costs/report')
  async getCostReport(@Query('period') period?: string) {
    try {
      const costStatus = await this.aiController.getCostStatus();

      // Get analysis history
      const cutoff = this.getCutoffDate(period || 'week');
      
      const analyses = await this.prisma.storeAnalysis.findMany({
        where: {
          analysisDate: { gte: cutoff }
        },
        orderBy: { analysisDate: 'desc' },
        select: {
          analysisDate: true,
          model: true,
          tokensUsed: true,
          storeId: true
        }
      });

      // Group by day
      const byDay = analyses.reduce((acc, a) => {
        const day = a.analysisDate.toISOString().split('T')[0];
        if (!acc[day]) {
          acc[day] = { count: 0, tokens: 0 };
        }
        acc[day].count++;
        acc[day].tokens += a.tokensUsed || 0;
        return acc;
      }, {} as Record<string, { count: number; tokens: number }>);

      return {
        costStatus,
        period: period || 'week',
        totalAnalyses: analyses.length,
        byDay,
        recentAnalyses: analyses.slice(0, 10)
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get cost report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get model comparison
   * GET /ai/intelligence/models/compare
   */
  @Get('models/compare')
  async compareModels(
    @Query('inputTokens') inputTokens?: string,
    @Query('outputTokens') outputTokens?: string
  ) {
    try {
      const input = parseInt(inputTokens || '5000');
      const output = parseInt(outputTokens || '3000');

      const comparison = this.modelConfig.compareModels(input, output);

      return {
        inputTokens: input,
        outputTokens: output,
        models: comparison
      };
    } catch (error) {
      throw new HttpException(
        `Failed to compare models: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Health check for AI intelligence system
   * GET /ai/intelligence/health
   */
  @Get('health')
  async healthCheck() {
    try {
      const openaiConfigured = !!process.env.OPENAI_API_KEY;
      const config = await this.aiController.getConfig();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          openai: {
            configured: openaiConfigured,
            status: openaiConfigured ? 'ready' : 'not_configured'
          },
          database: {
            status: 'connected'
          }
        },
        features: {
          continuousIntelligence: config.continuousEnabled,
          onDemandIntelligence: config.onDemandEnabled
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper methods
  private getCutoffDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }
}
