'use client';

import { useState, useEffect } from 'react';
import AnalyticsFilters from './components/AnalyticsFilters';
import AnalyticsKPISection from './components/AnalyticsKPISection';
import AnalyticsChartSection from './components/AnalyticsChartSection';
import { AnalyticsService, type AnalyticsData } from './services/analytics.service';
import type { AnalyticsFilters as FilterType } from './components/AnalyticsFilters';

// Initialize with mock data
const initialData: AnalyticsData = {
  kpis: {
    scopeApplied: { scope: 'global' },
    ordersToday: 127,
    revenueToday: 2847.50,
    menuItems: 24,
    pendingOrders: 8,
    totalStores: 15,
  },
  daily: [
    { day: '2024-01-01', orders: 45, revenue: 1200.50 },
    { day: '2024-01-02', orders: 52, revenue: 1350.75 },
    { day: '2024-01-03', orders: 38, revenue: 980.25 },
    { day: '2024-01-04', orders: 61, revenue: 1580.00 },
    { day: '2024-01-05', orders: 47, revenue: 1225.50 },
    { day: '2024-01-06', orders: 55, revenue: 1420.75 },
    { day: '2024-01-07', orders: 49, revenue: 1290.25 },
  ],
};

export default function AnalyticsPage() {
  const [filters, setFilters] = useState<FilterType>({ 
    scope: 'global',
    dateRange: 'last7days',
    compareEnabled: false
  });
  const [data, setData] = useState<AnalyticsData | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live update data when filters change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const analyticsData = await AnalyticsService.fetchAnalyticsData(filters);
        setData(analyticsData);
      } catch (err) {
        console.error('Failed to fetch analytics data:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  return (
    <main>
      <div className="s-wrap">
        <div className="s-h1">Analytics Dashboard</div>
        
        <AnalyticsFilters 
          filters={filters}
          onChange={setFilters}
        />

        {error && (
          <div className="s-card" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <div style={{ color: '#f87171' }}>{error}</div>
          </div>
        )}

        {loading ? (
          <div className="s-card">
            <div className="s-muted">Loading analytics data...</div>
          </div>
        ) : data && (
          <>
            <AnalyticsKPISection 
              kpis={data.kpis}
              loading={loading}
            />
            
            <AnalyticsChartSection 
              daily={data.daily}
              filters={filters}
              loading={loading}
              comparison={data.comparison}
            />
          </>
        )}
      </div>
    </main>
  );
}