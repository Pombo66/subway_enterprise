import { Injectable } from '@nestjs/common';
import { PrismaClient, Franchisee, FranchiseeAnalysis } from '@prisma/client';
import OpenAI from 'openai';

interface AIAnalysisResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  riskFactors: string[];
  opportunities: string[];
  expansionReady: boolean;
  recommendedStores: number;
  expansionRationale: string;
  churnRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendations: string[];
}

@Injectable()
export class FranchiseeIntelligenceService {
  private openai: OpenAI;
  private model: string;

  constructor(private prisma: PrismaClient) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = process.env.FRANCHISEE_ANALYSIS_MODEL || 'gpt-5-mini';
  }

  async analyzeFranchisee(franchiseeId: string): Promise<FranchiseeAnalysis> {
    // Check for recent analysis (within 7 days)
    const recentAnalysis = await this.prisma.franchiseeAnalysis.findFirst({
      where: {
        franchiseeId,
        analysisDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { analysisDate: 'desc' },
    });

    if (recentAnalysis) {
      return recentAnalysis;
    }

    // Generate new analysis
    const franchisee = await this.prisma.franchisee.findUnique({
      where: { id: franchiseeId },
      include: {
        stores: {
          include: {
            Orders: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
                },
              },
            },
          },
        },
      },
    });

    if (!franchisee) {
      throw new Error('Franchisee not found');
    }

    // Calculate metrics
    const metrics = await this.calculateMetrics(franchisee);
    
    // Generate AI insights
    const aiResult = await this.generateAIInsights(franchisee, metrics);

    // Save analysis
    const analysis = await this.prisma.franchiseeAnalysis.create({
      data: {
        franchiseeId,
        avgRevenuePerStore: metrics.avgRevenuePerStore,
        revenueGrowthRate: metrics.revenueGrowthRate,
        profitabilityIndex: metrics.profitabilityIndex,
        avgStoreAge: metrics.avgStoreAge,
        storeOpeningRate: metrics.storeOpeningRate,
        storeClosureRate: metrics.storeClosureRate,
        customerSatisfaction: metrics.customerSatisfaction,
        operationalCompliance: metrics.operationalCompliance,
        brandStandards: metrics.brandStandards,
        peerRanking: metrics.peerRanking,
        expansionReady: aiResult.expansionReady,
        recommendedStores: aiResult.recommendedStores,
        expansionRationale: aiResult.expansionRationale,
        churnRisk: aiResult.churnRisk,
        riskFactors: JSON.stringify(aiResult.riskFactors),
        aiSummary: aiResult.summary,
        recommendations: JSON.stringify(aiResult.recommendations),
        model: this.model,
        tokensUsed: metrics.tokensUsed,
      },
    });

    // Update franchisee scores
    await this.prisma.franchisee.update({
      where: { id: franchiseeId },
      data: {
        performanceScore: franchisee.performanceScore,
        expansionScore: aiResult.expansionReady ? 
          (aiResult.recommendedStores > 0 ? 80 : 60) : 40,
        riskScore: aiResult.churnRisk === 'HIGH' ? 80 : 
                   aiResult.churnRisk === 'MEDIUM' ? 50 : 20,
      },
    });

    return analysis;
  }

  private async calculateMetrics(franchisee: any) {
    const activeStores = franchisee.stores.filter((s: any) => s.status === 'ACTIVE');
    
    // Revenue metrics
    const totalRevenue = franchisee.stores.reduce((sum: number, store: any) => {
      const storeRevenue = store.Orders.reduce((orderSum: number, order: any) => {
        return orderSum + Number(order.total);
      }, 0);
      return sum + storeRevenue;
    }, 0);

    const avgRevenuePerStore = activeStores.length > 0 ? totalRevenue / activeStores.length : 0;

    // Growth rate
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const recentRevenue = franchisee.stores.reduce((sum: number, store: any) => {
      const storeRevenue = store.Orders
        .filter((o: any) => o.createdAt >= sixMonthsAgo)
        .reduce((orderSum: number, order: any) => orderSum + Number(order.total), 0);
      return sum + storeRevenue;
    }, 0);

    const previousRevenue = totalRevenue - recentRevenue;
    const revenueGrowthRate = previousRevenue > 0 
      ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    // Store metrics
    const avgStoreAge = franchisee.stores.reduce((sum: number, store: any) => {
      if (!store.openedAt) return sum;
      const ageMonths = (Date.now() - store.openedAt.getTime()) / (30 * 24 * 60 * 60 * 1000);
      return sum + ageMonths;
    }, 0) / Math.max(franchisee.stores.length, 1);

    const tenure = (Date.now() - franchisee.joinedDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
    const storeOpeningRate = tenure > 0 ? franchisee.totalStores / tenure : 0;
    const storeClosureRate = franchisee.totalStores > 0 
      ? (franchisee.totalStores - activeStores.length) / franchisee.totalStores 
      : 0;

    // Benchmarking
    const allFranchisees = await this.prisma.franchisee.findMany({
      where: { status: 'ACTIVE' },
      select: { avgStoreRevenue: true },
    });

    const betterPerformers = allFranchisees.filter(
      f => (f.avgStoreRevenue || 0) > avgRevenuePerStore
    ).length;
    const peerRanking = allFranchisees.length > 0 
      ? Math.round((1 - betterPerformers / allFranchisees.length) * 100) 
      : 50;

    return {
      avgRevenuePerStore,
      revenueGrowthRate,
      profitabilityIndex: avgRevenuePerStore > 0 ? 75 : 50, // Simplified
      avgStoreAge,
      storeOpeningRate,
      storeClosureRate,
      customerSatisfaction: 75, // Simplified
      operationalCompliance: 80, // Simplified
      brandStandards: 80, // Simplified
      peerRanking,
      tokensUsed: 0, // Will be updated after AI call
    };
  }

  private async generateAIInsights(
    franchisee: any,
    metrics: any
  ): Promise<AIAnalysisResult> {
    const tenure = (Date.now() - franchisee.joinedDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
    const performanceScore = franchisee.performanceScore || 70;

    const prompt = `You are a franchise operations analyst evaluating franchisee performance.

FRANCHISEE: ${franchisee.name}
STORES: ${franchisee.totalStores} (${franchisee.activeStores} active)
TENURE: ${tenure.toFixed(1)} years
TOTAL REVENUE: $${franchisee.totalRevenue?.toFixed(0) || 0}
AVG REVENUE PER STORE: $${metrics.avgRevenuePerStore.toFixed(0)}

PERFORMANCE METRICS:
- Performance Score: ${performanceScore}/100
- Revenue Growth: ${metrics.revenueGrowthRate.toFixed(1)}%
- Store Opening Rate: ${metrics.storeOpeningRate.toFixed(1)} stores/year
- Store Closure Rate: ${(metrics.storeClosureRate * 100).toFixed(1)}%

BENCHMARKING:
- Peer Ranking: ${metrics.peerRanking} percentile
- Avg Store Age: ${metrics.avgStoreAge.toFixed(1)} months

Provide a structured analysis in JSON format:
{
  "summary": "2-3 sentence overview of franchisee performance and potential",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "riskFactors": ["risk1", "risk2"],
  "opportunities": ["opportunity1", "opportunity2"],
  "expansionReady": boolean,
  "recommendedStores": number (0-5, how many more stores they can handle),
  "expansionRationale": "brief explanation of expansion readiness",
  "churnRisk": "LOW|MEDIUM|HIGH",
  "recommendations": ["rec1", "rec2", "rec3"]
}

Be specific, data-driven, and actionable. Focus on concrete metrics and realistic assessments.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a franchise operations analyst. Provide structured, data-driven analysis in valid JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      metrics.tokensUsed = response.usage?.total_tokens || 0;

      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content) as AIAnalysisResult;
      return result;
    } catch (error) {
      console.error('AI analysis error:', error);
      
      // Fallback analysis
      return {
        summary: `${franchisee.name} operates ${franchisee.totalStores} stores with ${metrics.revenueGrowthRate > 0 ? 'positive' : 'negative'} growth trends.`,
        strengths: ['Established franchisee', 'Multi-store operator'],
        weaknesses: ['Limited data available'],
        riskFactors: metrics.revenueGrowthRate < 0 ? ['Declining revenue'] : [],
        opportunities: ['Expansion potential', 'Performance optimization'],
        expansionReady: performanceScore > 70 && metrics.revenueGrowthRate > 0,
        recommendedStores: performanceScore > 80 ? 2 : performanceScore > 70 ? 1 : 0,
        expansionRationale: 'Based on current performance metrics',
        churnRisk: performanceScore < 50 ? 'HIGH' : performanceScore < 70 ? 'MEDIUM' : 'LOW',
        recommendations: ['Monitor performance', 'Review operational metrics'],
      };
    }
  }

  async getLatestAnalysis(franchiseeId: string): Promise<FranchiseeAnalysis | null> {
    return this.prisma.franchiseeAnalysis.findFirst({
      where: { franchiseeId },
      orderBy: { analysisDate: 'desc' },
    });
  }
}
