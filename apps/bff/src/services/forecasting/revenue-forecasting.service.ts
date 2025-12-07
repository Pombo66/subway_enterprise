import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface RevenueDataPoint {
  date: Date;
  revenue: number;
  month: number;
  year: number;
}

export interface ForecastPoint {
  date: Date;
  month: number;
  year: number;
  predictedRevenue: number;
  confidenceLow: number;
  confidenceHigh: number;
  baselineRevenue: number;
  seasonalFactor: number;
  trendFactor: number;
}

export interface StoreForecast {
  storeId: string;
  storeName: string;
  forecasts: ForecastPoint[];
  summary: {
    nextMonthRevenue: number;
    nextQuarterRevenue: number;
    yearEndRevenue: number;
    growthRate: number;
    confidence: number;
  };
  historicalData: RevenueDataPoint[];
}

@Injectable()
export class RevenueForecastingService {
  constructor(private readonly prisma: PrismaClient) {}

  async forecastStore(storeId: string, horizonMonths: number = 12): Promise<StoreForecast> {
    console.log(`📊 Forecasting revenue for store ${storeId}, horizon: ${horizonMonths} months`);

    // 1. Load store details
    const store = await this.prisma.store.findUnique({
      where: { id: storeId }
    });

    if (!store) {
      throw new Error(`Store ${storeId} not found`);
    }

    // 2. Load historical revenue data
    const historicalData = await this.loadHistoricalRevenue(storeId);

    if (historicalData.length < 6) {
      throw new Error(`Insufficient historical data for store ${storeId}. Need at least 6 months.`);
    }

    console.log(`✅ Loaded ${historicalData.length} months of historical data`);

    // 3. Calculate baseline (average revenue)
    const baseline = this.calculateBaseline(historicalData);

    // 4. Calculate trend (growth/decline rate)
    const trend = this.calculateTrend(historicalData);

    // 5. Extract seasonal pattern
    const seasonalIndices = await this.getSeasonalIndices(storeId, historicalData);

    // 6. Generate forecasts
    const forecasts = this.generateForecasts(
      baseline,
      trend,
      seasonalIndices,
      horizonMonths
    );

    // 7. Save forecasts to database
    await this.saveForecasts(storeId, forecasts);

    // 8. Calculate summary metrics
    const summary = this.calculateSummary(forecasts, trend);

    console.log(`✅ Generated ${forecasts.length} forecast points`);

    return {
      storeId,
      storeName: store.name,
      forecasts,
      summary,
      historicalData
    };
  }

  private async loadHistoricalRevenue(storeId: string): Promise<RevenueDataPoint[]> {
    // Load orders grouped by month
    const orders = await this.prisma.order.groupBy({
      by: ['createdAt'],
      where: {
        storeId,
        status: { in: ['COMPLETED', 'DELIVERED'] }
      },
      _sum: {
        total: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Group by month
    const monthlyRevenue = new Map<string, number>();

    orders.forEach(order => {
      const date = new Date(order.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const revenue = Number(order._sum.total || 0);
      
      monthlyRevenue.set(
        monthKey,
        (monthlyRevenue.get(monthKey) || 0) + revenue
      );
    });

    // Convert to array
    const dataPoints: RevenueDataPoint[] = [];
    monthlyRevenue.forEach((revenue, monthKey) => {
      const [year, month] = monthKey.split('-').map(Number);
      dataPoints.push({
        date: new Date(year, month - 1, 1),
        revenue,
        month,
        year
      });
    });

    return dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private calculateBaseline(data: RevenueDataPoint[]): number {
    const sum = data.reduce((acc, point) => acc + point.revenue, 0);
    return sum / data.length;
  }

  private calculateTrend(data: RevenueDataPoint[]): number {
    // Simple linear regression to find trend
    const n = data.length;
    if (n < 2) return 0;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    data.forEach((point, index) => {
      const x = index;
      const y = point.revenue;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  private async getSeasonalIndices(
    storeId: string,
    historicalData: RevenueDataPoint[]
  ): Promise<Record<number, number>> {
    // Try to load from database first
    const patterns = await this.prisma.seasonalPattern.findMany({
      where: { storeId }
    });

    if (patterns.length === 12) {
      // Use cached patterns
      const indices: Record<number, number> = {};
      patterns.forEach(pattern => {
        indices[pattern.month] = pattern.seasonalIndex;
      });
      return indices;
    }

    // Calculate seasonal indices from historical data
    const indices = this.calculateSeasonalIndices(historicalData);

    // Save to database
    await this.saveSeasonalPatterns(storeId, indices, historicalData.length);

    return indices;
  }

  private calculateSeasonalIndices(data: RevenueDataPoint[]): Record<number, number> {
    // Group by month
    const monthlyData: Record<number, number[]> = {};
    
    data.forEach(point => {
      if (!monthlyData[point.month]) {
        monthlyData[point.month] = [];
      }
      monthlyData[point.month].push(point.revenue);
    });

    // Calculate average for each month
    const monthlyAverages: Record<number, number> = {};
    Object.keys(monthlyData).forEach(monthStr => {
      const month = Number(monthStr);
      const revenues = monthlyData[month];
      monthlyAverages[month] = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    });

    // Calculate overall average
    const overallAverage = Object.values(monthlyAverages).reduce((a, b) => a + b, 0) / 
                          Object.values(monthlyAverages).length;

    // Calculate seasonal indices (ratio to overall average)
    const indices: Record<number, number> = {};
    for (let month = 1; month <= 12; month++) {
      if (monthlyAverages[month]) {
        indices[month] = monthlyAverages[month] / overallAverage;
      } else {
        indices[month] = 1.0; // Default to average if no data
      }
    }

    return indices;
  }

  private async saveSeasonalPatterns(
    storeId: string,
    indices: Record<number, number>,
    sampleSize: number
  ): Promise<void> {
    const patterns = Object.entries(indices).map(([month, index]) => ({
      storeId,
      month: Number(month),
      seasonalIndex: index,
      confidence: Math.min(sampleSize / 24, 1.0), // Higher confidence with more data
      sampleSize
    }));

    await this.prisma.seasonalPattern.createMany({
      data: patterns,
      skipDuplicates: true
    });
  }

  private generateForecasts(
    baseline: number,
    trend: number,
    seasonalIndices: Record<number, number>,
    horizonMonths: number
  ): ForecastPoint[] {
    const forecasts: ForecastPoint[] = [];
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    for (let i = 1; i <= horizonMonths; i++) {
      const forecastDate = new Date(currentYear, currentMonth - 1 + i, 1);
      const month = forecastDate.getMonth() + 1;
      const year = forecastDate.getFullYear();

      // Calculate trend component
      const trendComponent = baseline + (trend * i);
      
      // Apply seasonal factor
      const seasonalFactor = seasonalIndices[month] || 1.0;
      const predictedRevenue = trendComponent * seasonalFactor;

      // Calculate confidence interval (±15% for 80% confidence)
      const confidenceLow = predictedRevenue * 0.85;
      const confidenceHigh = predictedRevenue * 1.15;

      forecasts.push({
        date: forecastDate,
        month,
        year,
        predictedRevenue: Math.round(predictedRevenue),
        confidenceLow: Math.round(confidenceLow),
        confidenceHigh: Math.round(confidenceHigh),
        baselineRevenue: Math.round(baseline),
        seasonalFactor,
        trendFactor: trend
      });
    }

    return forecasts;
  }

  private async saveForecasts(storeId: string, forecasts: ForecastPoint[]): Promise<void> {
    // Delete existing forecasts for this store
    await this.prisma.revenueForecast.deleteMany({
      where: { storeId }
    });

    // Insert new forecasts
    await this.prisma.revenueForecast.createMany({
      data: forecasts.map(forecast => ({
        storeId,
        forecastDate: forecast.date,
        forecastMonth: forecast.month,
        forecastYear: forecast.year,
        predictedRevenue: forecast.predictedRevenue,
        confidenceLow: forecast.confidenceLow,
        confidenceHigh: forecast.confidenceHigh,
        baselineRevenue: forecast.baselineRevenue,
        seasonalFactor: forecast.seasonalFactor,
        trendFactor: forecast.trendFactor
      }))
    });
  }

  private calculateSummary(forecasts: ForecastPoint[], trend: number) {
    const nextMonth = forecasts[0];
    const nextQuarter = forecasts.slice(0, 3);
    const yearEnd = forecasts;

    const nextQuarterRevenue = nextQuarter.reduce((sum, f) => sum + f.predictedRevenue, 0);
    const yearEndRevenue = yearEnd.reduce((sum, f) => sum + f.predictedRevenue, 0);

    // Calculate growth rate (annualized)
    const growthRate = (trend / nextMonth.baselineRevenue) * 12 * 100;

    // Calculate confidence (based on trend strength)
    const confidence = Math.min(Math.abs(trend) / nextMonth.baselineRevenue * 10, 1.0);

    return {
      nextMonthRevenue: Math.round(nextMonth.predictedRevenue),
      nextQuarterRevenue: Math.round(nextQuarterRevenue),
      yearEndRevenue: Math.round(yearEndRevenue),
      growthRate: Math.round(growthRate * 10) / 10,
      confidence: Math.round(confidence * 100) / 100
    };
  }

  async getStoreForecast(storeId: string): Promise<StoreForecast | null> {
    // Load existing forecasts from database
    const forecasts = await this.prisma.revenueForecast.findMany({
      where: { storeId },
      orderBy: { forecastDate: 'asc' }
    });

    if (forecasts.length === 0) {
      return null;
    }

    const store = await this.prisma.store.findUnique({
      where: { id: storeId }
    });

    if (!store) {
      return null;
    }

    const forecastPoints: ForecastPoint[] = forecasts.map(f => ({
      date: f.forecastDate,
      month: f.forecastMonth,
      year: f.forecastYear,
      predictedRevenue: f.predictedRevenue,
      confidenceLow: f.confidenceLow,
      confidenceHigh: f.confidenceHigh,
      baselineRevenue: f.baselineRevenue,
      seasonalFactor: f.seasonalFactor,
      trendFactor: f.trendFactor
    }));

    const historicalData = await this.loadHistoricalRevenue(storeId);
    const summary = this.calculateSummary(forecastPoints, forecastPoints[0].trendFactor);

    return {
      storeId,
      storeName: store.name,
      forecasts: forecastPoints,
      summary,
      historicalData
    };
  }
}
