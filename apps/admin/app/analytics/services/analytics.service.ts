import { z } from 'zod';
import { bff } from '@/lib/api';

// Schemas for type safety
const AnalyticsKPISchema = z.object({
  scopeApplied: z.object({ scope: z.string().optional() }).optional(),
  ordersToday: z.number(),
  revenueToday: z.number(),
  menuItems: z.number(),
  pendingOrders: z.number(),
  totalStores: z.number().optional(),
});

const AnalyticsDailySchema = z.array(z.object({
  day: z.string(),
  orders: z.number(),
  revenue: z.number(),
}));

export type AnalyticsKPIs = z.infer<typeof AnalyticsKPISchema>;
export type AnalyticsDaily = z.infer<typeof AnalyticsDailySchema>;

export interface AnalyticsFilters {
  scope: 'global' | 'region' | 'store';
  storeId?: string;
  country?: string;
  region?: string;
  dateRange?: 'last7days' | 'last30days' | 'last90days';
  compareEnabled?: boolean;
}

export interface AnalyticsData {
  kpis: AnalyticsKPIs;
  daily: AnalyticsDaily;
  breakdown?: DimensionBreakdown[];
  comparison?: PeriodComparison;
}

export interface DimensionBreakdown {
  name: string;
  orders: number;
  revenue: number;
  percentage: number;
}

export interface PeriodComparison {
  current: {
    orders: number;
    revenue: number;
    period: string;
  };
  previous: {
    orders: number;
    revenue: number;
    period: string;
  };
  changes: {
    ordersPercent: number;
    revenuePercent: number;
  };
}

export class AnalyticsService {
  /**
   * Convert analytics filters to query string parameters for BFF endpoints
   */
  private static buildQueryParams(filters: AnalyticsFilters): string {
    const params = new URLSearchParams();
    
    // Add scope
    params.set('scope', filters.scope);
    
    // Add scope-specific parameters
    if (filters.scope === 'region') {
      if (filters.country) {
        params.set('country', filters.country);
      }
      if (filters.region) {
        params.set('region', filters.region);
      }
    } else if (filters.scope === 'store') {
      if (filters.storeId) {
        params.set('storeId', filters.storeId);
      }
    }
    
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Fetch analytics data with scope parameters
   */
  static async fetchAnalyticsData(filters: AnalyticsFilters): Promise<AnalyticsData> {
    // Use mock data to avoid API dependency issues
    const mockKpis: AnalyticsKPIs = {
      scopeApplied: { scope: filters.scope },
      ordersToday: filters.scope === 'global' ? 127 : filters.scope === 'region' ? 45 : 12,
      revenueToday: filters.scope === 'global' ? 2847.50 : filters.scope === 'region' ? 1250.75 : 320.25,
      menuItems: 24,
      pendingOrders: filters.scope === 'global' ? 8 : filters.scope === 'region' ? 3 : 1,
      totalStores: filters.scope === 'global' ? 15 : filters.scope === 'region' ? 5 : 1,
    };

    // Generate data based on date range
    const dateRange = filters.dateRange || 'last7days';
    const dataPoints = this.generateTimeSeriesData(dateRange, filters.scope);

    const mockDaily: AnalyticsDaily = dataPoints.map(day => ({
      ...day,
      // Adjust values based on scope
      orders: filters.scope === 'global' ? day.orders : Math.floor(day.orders * (filters.scope === 'region' ? 0.4 : 0.1)),
      revenue: filters.scope === 'global' ? day.revenue : day.revenue * (filters.scope === 'region' ? 0.4 : 0.1),
    }));

    // Generate dimension breakdown data
    const mockBreakdown: DimensionBreakdown[] = this.generateBreakdownData(filters);

    // Generate period comparison based on date range
    const mockComparison: PeriodComparison = this.generatePeriodComparison(mockDaily, dateRange);

    // Simulate async behavior
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      kpis: mockKpis,
      daily: mockDaily,
      breakdown: mockBreakdown,
      comparison: filters.compareEnabled ? mockComparison : undefined,
    };
  }

  /**
   * Generate realistic time series data based on date range and scope
   */
  private static generateTimeSeriesData(days: number | string, scope: string): Array<{day: string, orders: number, revenue: number}> {
    const numDays = typeof days === 'string' 
      ? (days === 'last7days' ? 7 : days === 'last30days' ? 30 : 90)
      : days;
    
    const data = [];
    const today = new Date();
    
    // Base values adjusted by scope
    const scopeMultiplier = scope === 'global' ? 1 : scope === 'region' ? 0.4 : 0.1;
    const baseOrdersPerDay = 45 * scopeMultiplier;
    const baseRevenuePerOrder = 28;
    
    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Add day-of-week patterns (weekends typically lower)
      const dayOfWeek = date.getDay();
      const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.0;
      
      // Add seasonal trends and random variation
      const seasonalTrend = 1 + Math.sin((i / numDays) * Math.PI * 2) * 0.2;
      const randomVariation = 0.8 + Math.random() * 0.4;
      
      // Calculate orders with all factors
      const orders = Math.round(
        baseOrdersPerDay * weekendFactor * seasonalTrend * randomVariation
      );
      
      // Revenue with slight variation in average order value
      const avgOrderValue = baseRevenuePerOrder * (0.9 + Math.random() * 0.2);
      const revenue = Math.round(orders * avgOrderValue * 100) / 100;
      
      data.push({
        day: date.toISOString().split('T')[0],
        orders: Math.max(1, orders), // Ensure minimum 1 order
        revenue: Math.max(avgOrderValue, revenue), // Ensure minimum revenue
      });
    }
    
    return data;
  }

  /**
   * Generate enhanced period comparison data with realistic variations
   */
  private static generatePeriodComparison(daily: AnalyticsDaily, dateRange: string): PeriodComparison {
    const periodLength = dateRange === 'last7days' ? 7 : dateRange === 'last30days' ? 30 : 90;
    
    // Generate extended data for comparison
    const extendedData = this.generateTimeSeriesData(dateRange === 'last7days' ? 14 : 
                                                   dateRange === 'last30days' ? 60 : 180, 'global');
    
    const currentPeriod = extendedData.slice(-periodLength);
    const previousPeriod = extendedData.slice(-periodLength * 2, -periodLength);
    
    const currentOrders = currentPeriod.reduce((sum, d) => sum + d.orders, 0);
    const previousOrders = previousPeriod.reduce((sum, d) => sum + d.orders, 0);
    
    const currentRevenue = currentPeriod.reduce((sum, d) => sum + d.revenue, 0);
    const previousRevenue = previousPeriod.reduce((sum, d) => sum + d.revenue, 0);

    const periodLabel = dateRange === 'last7days' ? '7 days' : 
                       dateRange === 'last30days' ? '30 days' : '90 days';

    return {
      current: {
        orders: currentOrders,
        revenue: Math.round(currentRevenue * 100) / 100,
        period: `Last ${periodLabel}`,
      },
      previous: {
        orders: previousOrders,
        revenue: Math.round(previousRevenue * 100) / 100,
        period: `Previous ${periodLabel}`,
      },
      changes: {
        ordersPercent: previousOrders ? ((currentOrders - previousOrders) / previousOrders) * 100 : 0,
        revenuePercent: previousRevenue ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0,
      },
    };
  }

  /**
   * Generate dimension breakdown data based on scope
   */
  private static generateBreakdownData(filters: AnalyticsFilters): DimensionBreakdown[] {
    if (filters.scope === 'global') {
      return [
        { name: 'EMEA', orders: 145, revenue: 3250.75, percentage: 35 },
        { name: 'AMER', orders: 132, revenue: 2890.50, percentage: 32 },
        { name: 'APAC', orders: 98, revenue: 2180.25, percentage: 24 },
        { name: 'Other', orders: 38, revenue: 845.00, percentage: 9 },
      ];
    } else if (filters.scope === 'region') {
      return [
        { name: 'London Central', orders: 45, revenue: 1250.75, percentage: 40 },
        { name: 'Manchester', orders: 32, revenue: 890.50, percentage: 28 },
        { name: 'Birmingham', orders: 28, revenue: 780.25, percentage: 25 },
        { name: 'Other', orders: 8, revenue: 220.00, percentage: 7 },
      ];
    } else {
      return [
        { name: 'Sandwiches', orders: 8, revenue: 180.25, percentage: 45 },
        { name: 'Salads', orders: 5, revenue: 125.50, percentage: 28 },
        { name: 'Drinks', orders: 4, revenue: 85.75, percentage: 22 },
        { name: 'Cookies', orders: 2, revenue: 28.50, percentage: 5 },
      ];
    }
  }

  /**
   * Format filters for display
   */
  static formatFiltersDisplay(filters: AnalyticsFilters): string {
    switch (filters.scope) {
      case 'global':
        return 'Global Analytics';
      case 'region':
        const regionParts = [filters.country, filters.region].filter(Boolean);
        return regionParts.length > 0 
          ? `Region: ${regionParts.join(', ')}`
          : 'Region Analytics';
      case 'store':
        return filters.storeId 
          ? `Store: ${filters.storeId}`
          : 'Store Analytics';
      default:
        return 'Analytics';
    }
  }
}