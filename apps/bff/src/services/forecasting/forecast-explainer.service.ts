import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import type { StoreForecast, RevenueDataPoint } from './revenue-forecasting.service';

export interface ForecastExplanation {
  storeId: string;
  storeName: string;
  summary: string;
  keyDrivers: string[];
  seasonalInsights: string[];
  risks: string[];
  opportunities: string[];
  recommendations: string[];
  confidence: number;
}

@Injectable()
export class ForecastExplainerService {
  private openai: OpenAI;

  constructor(private readonly prisma: PrismaClient) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async explainForecast(forecast: StoreForecast): Promise<ForecastExplanation> {
    console.log(`🤖 Generating AI explanation for store ${forecast.storeId}`);

    const store = await this.prisma.store.findUnique({
      where: { id: forecast.storeId }
    });

    if (!store) {
      throw new Error(`Store ${forecast.storeId} not found`);
    }

    // Build context for AI
    const context = this.buildContext(forecast, store);

    // Generate explanation using GPT-5-mini
    const explanation = await this.generateAIExplanation(context);

    console.log(`✅ Generated AI explanation`);

    return {
      storeId: forecast.storeId,
      storeName: forecast.storeName,
      ...explanation,
      confidence: forecast.summary.confidence
    };
  }

  private buildContext(forecast: StoreForecast, store: any): string {
    const { summary, forecasts, historicalData } = forecast;

    // Calculate recent performance
    const recentMonths = historicalData.slice(-3);
    const recentAverage = recentMonths.reduce((sum, d) => sum + d.revenue, 0) / recentMonths.length;

    // Calculate year-over-year change if we have enough data
    let yoyChange = 0;
    if (historicalData.length >= 12) {
      const lastYear = historicalData.slice(-12, -11)[0]?.revenue || 0;
      const thisYear = historicalData.slice(-1)[0]?.revenue || 0;
      yoyChange = lastYear > 0 ? ((thisYear - lastYear) / lastYear) * 100 : 0;
    }

    // Identify seasonal pattern
    const seasonalPattern = this.identifySeasonalPattern(forecasts);

    // Format context
    return `STORE: ${store.name}
LOCATION: ${store.city}, ${store.country}
REGION: ${store.region}

CURRENT PERFORMANCE:
- Recent 3-month average: ${this.formatCurrency(recentAverage)}
- Year-over-year change: ${yoyChange.toFixed(1)}%
- Historical data points: ${historicalData.length} months

FORECAST SUMMARY:
- Next month: ${this.formatCurrency(summary.nextMonthRevenue)}
- Next quarter: ${this.formatCurrency(summary.nextQuarterRevenue)}
- Year-end total: ${this.formatCurrency(summary.yearEndRevenue)}
- Growth rate: ${summary.growthRate}% annually

SEASONAL PATTERN:
${seasonalPattern}

TREND:
${summary.growthRate > 0 ? 'Growing' : summary.growthRate < 0 ? 'Declining' : 'Stable'} (${Math.abs(summary.growthRate)}% per year)`;
  }

  private identifySeasonalPattern(forecasts: any[]): string {
    // Find highest and lowest months
    const sorted = [...forecasts].sort((a, b) => b.predictedRevenue - a.predictedRevenue);
    const highest = sorted.slice(0, 3);
    const lowest = sorted.slice(-3);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const highestMonths = highest.map(f => monthNames[f.month - 1]).join(', ');
    const lowestMonths = lowest.map(f => monthNames[f.month - 1]).join(', ');

    return `- Peak months: ${highestMonths}
- Low months: ${lowestMonths}`;
  }

  private async generateAIExplanation(context: string): Promise<Omit<ForecastExplanation, 'storeId' | 'storeName' | 'confidence'>> {
    const prompt = `You are a revenue forecasting analyst for a franchise chain. Analyze this store's forecast and provide insights.

${context}

Provide a structured analysis in JSON format:
{
  "summary": "2-3 sentence overview of the forecast",
  "keyDrivers": ["driver1", "driver2", "driver3"],
  "seasonalInsights": ["insight1", "insight2"],
  "risks": ["risk1", "risk2"],
  "opportunities": ["opportunity1", "opportunity2"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
}

Be specific, data-driven, and actionable. Focus on:
1. What's driving the forecast (growth/decline)
2. Seasonal patterns and their business implications
3. Specific risks to watch for
4. Concrete opportunities to capture
5. Actionable recommendations with expected impact

Keep each point concise (1-2 sentences max).`;

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.FORECAST_ANALYSIS_MODEL || 'gpt-5-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const parsed = JSON.parse(content);

      return {
        summary: parsed.summary || 'Analysis unavailable',
        keyDrivers: parsed.keyDrivers || [],
        seasonalInsights: parsed.seasonalInsights || [],
        risks: parsed.risks || [],
        opportunities: parsed.opportunities || [],
        recommendations: parsed.recommendations || []
      };
    } catch (error) {
      console.error('AI explanation failed:', error);
      
      // Return fallback explanation
      return {
        summary: 'AI analysis temporarily unavailable. Review forecast metrics above for insights.',
        keyDrivers: ['Historical performance trends', 'Seasonal patterns', 'Market conditions'],
        seasonalInsights: ['Review peak and low months in forecast chart'],
        risks: ['Market volatility', 'Competitive changes'],
        opportunities: ['Optimize for peak seasons', 'Address underperforming periods'],
        recommendations: ['Monitor actual vs forecast monthly', 'Adjust operations for seasonal patterns', 'Review performance drivers']
      };
    }
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }
}
