import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

export interface TurnoverPrediction {
  storeId: string;
  storeName: string;
  
  // Predictions
  predictedAnnualRevenue: number;
  confidenceInterval: {
    low: number;
    high: number;
  };
  confidence: number; // 0-100
  
  // Comparison
  actualRevenue: number | null;
  predictionAccuracy: number | null; // If actual is known
  
  // Methodology
  methodology: string;
  factors: Array<{
    factor: string;
    weight: number;
    impact: string;
  }>;
  
  // Insights
  insights: string;
  riskFactors: string[];
  opportunities: string[];
}

@Injectable()
export class TurnoverPredictionService {
  private openai: OpenAI;
  private model: string;

  constructor(private prisma: PrismaClient) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = process.env.STORE_ANALYSIS_MODEL || 'gpt-5.1';
  }

  async predictTurnover(storeId: string): Promise<TurnoverPrediction> {
    // Get store data
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        Orders: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            },
          },
        },
        Franchisee: true,
      },
    });

    if (!store) {
      throw new Error('Store not found');
    }

    // Calculate actual revenue
    const actualRevenue = store.Orders.reduce(
      (sum, order) => sum + Number(order.total),
      0
    );

    // Get comparable stores for benchmarking
    const comparableStores = await this.getComparableStores(store);

    // Calculate base prediction using multiple methods
    const predictions = await this.calculatePredictions(store, comparableStores, actualRevenue);

    // Generate AI-enhanced insights
    const aiInsights = await this.generateAIInsights(store, predictions, actualRevenue);

    return {
      storeId: store.id,
      storeName: store.name,
      predictedAnnualRevenue: predictions.predicted,
      confidenceInterval: predictions.confidenceInterval,
      confidence: predictions.confidence,
      actualRevenue: actualRevenue > 0 ? actualRevenue : null,
      predictionAccuracy: actualRevenue > 0 
        ? this.calculateAccuracy(predictions.predicted, actualRevenue)
        : null,
      methodology: predictions.methodology,
      factors: predictions.factors,
      insights: aiInsights.insights,
      riskFactors: aiInsights.riskFactors,
      opportunities: aiInsights.opportunities,
    };
  }

  private async getComparableStores(targetStore: any) {
    return this.prisma.store.findMany({
      where: {
        id: { not: targetStore.id },
        status: 'ACTIVE',
        country: targetStore.country,
        cityPopulationBand: targetStore.cityPopulationBand,
      },
      include: {
        Orders: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
      take: 20,
    });
  }

  private async calculatePredictions(store: any, comparables: any[], actualRevenue: number) {
    const factors: Array<{ factor: string; weight: number; impact: string }> = [];
    let predicted = 0;
    let confidence = 50;

    // Method 1: Peer average (40% weight)
    if (comparables.length > 0) {
      const peerRevenues = comparables.map(s =>
        s.Orders.reduce((sum: number, o: any) => sum + Number(o.total), 0)
      );
      const peerAverage = peerRevenues.reduce((a, b) => a + b, 0) / peerRevenues.length;
      predicted += peerAverage * 0.4;
      confidence += 15;
      factors.push({
        factor: 'Peer Benchmarking',
        weight: 0.4,
        impact: `Similar stores average $${peerAverage.toFixed(0)}`,
      });
    }

    // Method 2: Population-based estimate (30% weight)
    const populationMultiplier = this.getPopulationMultiplier(store.cityPopulationBand);
    const baseRevenue = 500000; // Base estimate
    const populationEstimate = baseRevenue * populationMultiplier;
    predicted += populationEstimate * 0.3;
    confidence += 10;
    factors.push({
      factor: 'Population Density',
      weight: 0.3,
      impact: `${store.cityPopulationBand || 'Unknown'} city size`,
    });

    // Method 3: Franchisee performance (20% weight)
    if (store.Franchisee) {
      const franchiseeAvg = store.Franchisee.avgStoreRevenue || baseRevenue;
      predicted += franchiseeAvg * 0.2;
      confidence += 10;
      factors.push({
        factor: 'Franchisee Track Record',
        weight: 0.2,
        impact: `Franchisee averages $${franchiseeAvg.toFixed(0)} per store`,
      });
    }

    // Method 4: Historical performance (10% weight)
    if (actualRevenue > 0) {
      predicted += actualRevenue * 0.1;
      confidence += 15;
      factors.push({
        factor: 'Historical Performance',
        weight: 0.1,
        impact: `Current revenue: $${actualRevenue.toFixed(0)}`,
      });
    }

    // Normalize if no historical data
    if (actualRevenue === 0) {
      predicted = predicted / 0.9; // Redistribute weights
    }

    // Calculate confidence interval (±15%)
    const margin = predicted * 0.15;
    const confidenceInterval = {
      low: predicted - margin,
      high: predicted + margin,
    };

    return {
      predicted,
      confidenceInterval,
      confidence: Math.min(100, confidence),
      methodology: 'Multi-factor prediction model combining peer benchmarking, population analysis, franchisee performance, and historical data',
      factors,
    };
  }

  private getPopulationMultiplier(band: string | null): number {
    const multipliers: Record<string, number> = {
      'MEGA': 1.5,
      'LARGE': 1.3,
      'MEDIUM': 1.0,
      'SMALL': 0.8,
      'RURAL': 0.6,
    };
    return multipliers[band || 'MEDIUM'] || 1.0;
  }

  private calculateAccuracy(predicted: number, actual: number): number {
    if (actual === 0) return 0;
    const error = Math.abs(predicted - actual) / actual;
    return Math.max(0, (1 - error) * 100);
  }

  private async generateAIInsights(
    store: any,
    predictions: any,
    actualRevenue: number
  ): Promise<{ insights: string; riskFactors: string[]; opportunities: string[] }> {
    const prompt = `You are an elite revenue forecasting analyst. Analyze this store's revenue prediction.

STORE:
- Name: ${store.name}
- City: ${store.city || 'Unknown'}, ${store.country || 'Unknown'}
- City Size: ${store.cityPopulationBand || 'Unknown'}

PREDICTION:
- Predicted Annual Revenue: $${predictions.predicted.toFixed(0)}
- Confidence: ${predictions.confidence}%
- Range: $${predictions.confidenceInterval.low.toFixed(0)} - $${predictions.confidenceInterval.high.toFixed(0)}
${actualRevenue > 0 ? `- Actual Revenue: $${actualRevenue.toFixed(0)}` : ''}

FACTORS:
${predictions.factors.map((f: any) => `- ${f.factor} (${(f.weight * 100).toFixed(0)}%): ${f.impact}`).join('\n')}

Provide analysis in JSON format:
{
  "insights": "2-3 sentence assessment of revenue potential and prediction reliability",
  "riskFactors": ["risk1", "risk2"],
  "opportunities": ["opportunity1", "opportunity2"]
}

Be specific about what could impact revenue positively or negatively.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a revenue forecasting analyst. Provide structured analysis in valid JSON format.',
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
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content);
      return result;
    } catch (error) {
      console.error('AI prediction insights error:', error);
      
      // Fallback
      const gap = actualRevenue > 0 ? predictions.predicted - actualRevenue : 0;
      return {
        insights: `Predicted revenue of $${predictions.predicted.toFixed(0)} with ${predictions.confidence}% confidence based on ${predictions.factors.length} factors.`,
        riskFactors: [
          gap < 0 ? 'Underperforming vs prediction' : 'Market saturation risk',
          'Economic conditions',
        ],
        opportunities: [
          gap > 0 ? 'Exceeding expectations' : 'Growth potential',
          'Market expansion',
        ],
      };
    }
  }
}
