/**
 * SubMind Context System
 * 
 * Allows pages to register their current data/state so SubMind can provide
 * intelligent, context-aware responses based on what's actually on screen.
 */

export interface SubMindPageContext {
  screen: string;
  data?: any;
  scope?: {
    region?: string;
    country?: string;
    storeId?: string;
    franchiseeId?: string;
  };
  metadata?: {
    lastUpdated?: string;
    dataSource?: string;
  };
}

class SubMindContextManager {
  private currentContext: SubMindPageContext | null = null;
  private listeners: Set<(context: SubMindPageContext | null) => void> = new Set();

  /**
   * Register page context - called by pages when they load/update data
   */
  setContext(context: SubMindPageContext) {
    this.currentContext = context;
    this.notifyListeners();
  }

  /**
   * Get current page context
   */
  getContext(): SubMindPageContext | null {
    return this.currentContext;
  }

  /**
   * Clear context when page unmounts
   */
  clearContext() {
    this.currentContext = null;
    this.notifyListeners();
  }

  /**
   * Subscribe to context changes
   */
  subscribe(listener: (context: SubMindPageContext | null) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentContext));
  }
}

// Singleton instance
export const subMindContext = new SubMindContextManager();

/**
 * Hook for pages to register their context
 */
export function useSubMindContext(context: SubMindPageContext) {
  if (typeof window !== 'undefined') {
    // Register context on mount/update
    subMindContext.setContext(context);
  }
}

/**
 * Helper to format store data for SubMind
 */
export function formatStoreDataForSubMind(stores: any[]) {
  if (!stores || stores.length === 0) {
    return {
      summary: 'No stores currently visible',
      count: 0,
    };
  }

  // Group by country
  const byCountry = stores.reduce((acc, store) => {
    const country = store.country || 'Unknown';
    if (!acc[country]) acc[country] = [];
    acc[country].push(store);
    return acc;
  }, {} as Record<string, any[]>);

  // Group by city (top 10)
  const byCity = stores.reduce((acc, store) => {
    const city = store.city || 'Unknown';
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCities = Object.entries(byCity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([city, count]) => ({ city, count }));

  // Calculate revenue stats if available
  const storesWithRevenue = stores.filter(s => s.monthlyRevenue);
  const revenueStats = storesWithRevenue.length > 0 ? {
    avgMonthlyRevenue: Math.round(
      storesWithRevenue.reduce((sum, s) => sum + s.monthlyRevenue, 0) / storesWithRevenue.length
    ),
    totalMonthlyRevenue: storesWithRevenue.reduce((sum, s) => sum + s.monthlyRevenue, 0),
    minRevenue: Math.min(...storesWithRevenue.map(s => s.monthlyRevenue)),
    maxRevenue: Math.max(...storesWithRevenue.map(s => s.monthlyRevenue)),
  } : null;

  return {
    summary: `${stores.length} stores across ${Object.keys(byCountry).length} countries`,
    totalStores: stores.length,
    countries: Object.entries(byCountry).map(([country, countryStores]) => ({
      country,
      count: countryStores.length,
    })),
    topCities,
    revenueStats,
    regions: [...new Set(stores.map(s => s.region).filter(Boolean))],
  };
}

/**
 * Helper to format expansion data for SubMind
 */
export function formatExpansionDataForSubMind(suggestions: any[], scope: any) {
  if (!suggestions || suggestions.length === 0) {
    return {
      summary: 'No expansion suggestions currently visible',
      count: 0,
    };
  }

  const avgConfidence = suggestions.reduce((sum, s) => sum + (s.confidence || 0), 0) / suggestions.length;
  const highConfidence = suggestions.filter(s => (s.confidence || 0) >= 0.75).length;
  
  const cities = [...new Set(suggestions.map(s => s.city).filter(Boolean))];
  
  return {
    summary: `${suggestions.length} expansion suggestions with ${Math.round(avgConfidence * 100)}% avg confidence`,
    totalSuggestions: suggestions.length,
    highConfidenceCount: highConfidence,
    avgConfidence: Math.round(avgConfidence * 100),
    cities: cities.slice(0, 10),
    scope: {
      type: scope?.type || 'unknown',
      value: scope?.value || 'unknown',
    },
  };
}

/**
 * Helper to format KPI data for SubMind
 */
export function formatKPIDataForSubMind(kpis: any) {
  if (!kpis) {
    return {
      summary: 'No KPI data available',
    };
  }

  return {
    summary: `Current KPIs: ${kpis.totalRevenue ? `$${Math.round(kpis.totalRevenue / 1000)}k revenue` : 'N/A'}`,
    totalRevenue: kpis.totalRevenue,
    totalOrders: kpis.totalOrders,
    avgOrderValue: kpis.avgOrderValue,
    activeStores: kpis.activeStores,
    growthRate: kpis.growthRate,
  };
}
