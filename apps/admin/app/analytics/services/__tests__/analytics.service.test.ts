import { AnalyticsService, AnalyticsFilters } from '../analytics.service';

describe('AnalyticsService', () => {
  describe('fetchAnalyticsData', () => {
    test('should return analytics data for global scope', async () => {
      const filters: AnalyticsFilters = {
        scope: 'global',
        dateRange: 'last7days',
      };

      const result = await AnalyticsService.fetchAnalyticsData(filters);

      expect(result.kpis).toEqual({
        scopeApplied: { scope: 'global' },
        ordersToday: 127,
        revenueToday: 2847.50,
        menuItems: 24,
        pendingOrders: 8,
        totalStores: 15,
      });

      expect(result.daily).toHaveLength(7);
      expect(result.daily[0]).toHaveProperty('day');
      expect(result.daily[0]).toHaveProperty('orders');
      expect(result.daily[0]).toHaveProperty('revenue');

      expect(result.breakdown).toHaveLength(4);
      expect(result.breakdown![0]).toEqual({
        name: 'EMEA',
        orders: 145,
        revenue: 3250.75,
        percentage: 35,
      });
    });

    test('should return analytics data for region scope', async () => {
      const filters: AnalyticsFilters = {
        scope: 'region',
        country: 'UK',
        region: 'London',
        dateRange: 'last30days',
      };

      const result = await AnalyticsService.fetchAnalyticsData(filters);

      expect(result.kpis).toEqual({
        scopeApplied: { scope: 'region' },
        ordersToday: 45,
        revenueToday: 1250.75,
        menuItems: 24,
        pendingOrders: 3,
        totalStores: 5,
      });

      expect(result.daily).toHaveLength(30);
      expect(result.breakdown).toHaveLength(4);
      expect(result.breakdown![0]).toEqual({
        name: 'London Central',
        orders: 45,
        revenue: 1250.75,
        percentage: 40,
      });
    });

    test('should return analytics data for store scope', async () => {
      const filters: AnalyticsFilters = {
        scope: 'store',
        storeId: 'store-123',
        dateRange: 'last90days',
      };

      const result = await AnalyticsService.fetchAnalyticsData(filters);

      expect(result.kpis).toEqual({
        scopeApplied: { scope: 'store' },
        ordersToday: 12,
        revenueToday: 320.25,
        menuItems: 24,
        pendingOrders: 1,
        totalStores: 1,
      });

      expect(result.daily).toHaveLength(90);
      expect(result.breakdown).toHaveLength(4);
      expect(result.breakdown![0]).toEqual({
        name: 'Sandwiches',
        orders: 8,
        revenue: 180.25,
        percentage: 45,
      });
    });

    test('should include comparison data when enabled', async () => {
      const filters: AnalyticsFilters = {
        scope: 'global',
        dateRange: 'last7days',
        compareEnabled: true,
      };

      const result = await AnalyticsService.fetchAnalyticsData(filters);

      expect(result.comparison).toBeDefined();
      expect(result.comparison!.current).toHaveProperty('orders');
      expect(result.comparison!.current).toHaveProperty('revenue');
      expect(result.comparison!.current).toHaveProperty('period');
      expect(result.comparison!.previous).toHaveProperty('orders');
      expect(result.comparison!.previous).toHaveProperty('revenue');
      expect(result.comparison!.previous).toHaveProperty('period');
      expect(result.comparison!.changes).toHaveProperty('ordersPercent');
      expect(result.comparison!.changes).toHaveProperty('revenuePercent');
    });

    test('should not include comparison data when disabled', async () => {
      const filters: AnalyticsFilters = {
        scope: 'global',
        dateRange: 'last7days',
        compareEnabled: false,
      };

      const result = await AnalyticsService.fetchAnalyticsData(filters);

      expect(result.comparison).toBeUndefined();
    });

    test('should handle different date ranges', async () => {
      const filters7Days: AnalyticsFilters = {
        scope: 'global',
        dateRange: 'last7days',
      };

      const filters30Days: AnalyticsFilters = {
        scope: 'global',
        dateRange: 'last30days',
      };

      const filters90Days: AnalyticsFilters = {
        scope: 'global',
        dateRange: 'last90days',
      };

      const result7 = await AnalyticsService.fetchAnalyticsData(filters7Days);
      const result30 = await AnalyticsService.fetchAnalyticsData(filters30Days);
      const result90 = await AnalyticsService.fetchAnalyticsData(filters90Days);

      expect(result7.daily).toHaveLength(7);
      expect(result30.daily).toHaveLength(30);
      expect(result90.daily).toHaveLength(90);
    });

    test('should generate realistic time series data', async () => {
      const filters: AnalyticsFilters = {
        scope: 'global',
        dateRange: 'last7days',
      };

      const result = await AnalyticsService.fetchAnalyticsData(filters);

      // Check that all days have valid data
      result.daily.forEach(day => {
        expect(day.day).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
        expect(day.orders).toBeGreaterThan(0);
        expect(day.revenue).toBeGreaterThan(0);
        expect(typeof day.orders).toBe('number');
        expect(typeof day.revenue).toBe('number');
      });

      // Check that days are in chronological order
      for (let i = 1; i < result.daily.length; i++) {
        const prevDate = new Date(result.daily[i - 1].day);
        const currDate = new Date(result.daily[i].day);
        expect(currDate.getTime()).toBeGreaterThan(prevDate.getTime());
      }
    });

    test('should simulate async behavior', async () => {
      const filters: AnalyticsFilters = {
        scope: 'global',
        dateRange: 'last7days',
      };

      const startTime = Date.now();
      await AnalyticsService.fetchAnalyticsData(filters);
      const endTime = Date.now();

      // Should take at least 100ms due to simulated delay
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('formatFiltersDisplay', () => {
    test('should format global scope display', () => {
      const filters: AnalyticsFilters = {
        scope: 'global',
      };

      const display = AnalyticsService.formatFiltersDisplay(filters);
      expect(display).toBe('Global Analytics');
    });

    test('should format region scope display with country and region', () => {
      const filters: AnalyticsFilters = {
        scope: 'region',
        country: 'UK',
        region: 'London',
      };

      const display = AnalyticsService.formatFiltersDisplay(filters);
      expect(display).toBe('Region: UK, London');
    });

    test('should format region scope display with only country', () => {
      const filters: AnalyticsFilters = {
        scope: 'region',
        country: 'UK',
      };

      const display = AnalyticsService.formatFiltersDisplay(filters);
      expect(display).toBe('Region: UK');
    });

    test('should format region scope display without specifics', () => {
      const filters: AnalyticsFilters = {
        scope: 'region',
      };

      const display = AnalyticsService.formatFiltersDisplay(filters);
      expect(display).toBe('Region Analytics');
    });

    test('should format store scope display with store ID', () => {
      const filters: AnalyticsFilters = {
        scope: 'store',
        storeId: 'store-123',
      };

      const display = AnalyticsService.formatFiltersDisplay(filters);
      expect(display).toBe('Store: store-123');
    });

    test('should format store scope display without store ID', () => {
      const filters: AnalyticsFilters = {
        scope: 'store',
      };

      const display = AnalyticsService.formatFiltersDisplay(filters);
      expect(display).toBe('Store Analytics');
    });

    test('should handle unknown scope', () => {
      const filters = {
        scope: 'unknown' as any,
      };

      const display = AnalyticsService.formatFiltersDisplay(filters);
      expect(display).toBe('Analytics');
    });
  });

  describe('private methods behavior', () => {
    test('should generate consistent data for same parameters', async () => {
      const filters: AnalyticsFilters = {
        scope: 'global',
        dateRange: 'last7days',
      };

      // Note: Since the service uses Math.random(), we can't test for exact consistency
      // but we can test that the structure and ranges are consistent
      const result1 = await AnalyticsService.fetchAnalyticsData(filters);
      const result2 = await AnalyticsService.fetchAnalyticsData(filters);

      expect(result1.daily).toHaveLength(result2.daily.length);
      expect(result1.breakdown).toHaveLength(result2.breakdown!.length);
      
      // KPIs should be the same for same scope
      expect(result1.kpis.ordersToday).toBe(result2.kpis.ordersToday);
      expect(result1.kpis.revenueToday).toBe(result2.kpis.revenueToday);
    });

    test('should scale data appropriately by scope', async () => {
      const globalFilters: AnalyticsFilters = { scope: 'global', dateRange: 'last7days' };
      const regionFilters: AnalyticsFilters = { scope: 'region', dateRange: 'last7days' };
      const storeFilters: AnalyticsFilters = { scope: 'store', dateRange: 'last7days' };

      const globalResult = await AnalyticsService.fetchAnalyticsData(globalFilters);
      const regionResult = await AnalyticsService.fetchAnalyticsData(regionFilters);
      const storeResult = await AnalyticsService.fetchAnalyticsData(storeFilters);

      // Global should have highest values
      expect(globalResult.kpis.ordersToday).toBeGreaterThan(regionResult.kpis.ordersToday);
      expect(regionResult.kpis.ordersToday).toBeGreaterThan(storeResult.kpis.ordersToday);

      expect(globalResult.kpis.revenueToday).toBeGreaterThan(regionResult.kpis.revenueToday);
      expect(regionResult.kpis.revenueToday).toBeGreaterThan(storeResult.kpis.revenueToday);
    });
  });
});