'use client';

import { useState, useEffect } from 'react';
import { bff } from '../../../lib/api';
import { useToast } from '../../components/ToastProvider';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface AnalyticsSummary {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  ordersByStatus: Array<{ status: string; count: number }>;
  recentOrders: Array<{
    id: string;
    total: number;
    status: string;
    createdAt: string;
    Store: { name: string; region: string };
  }>;
}

interface TrendData {
  trends: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
}

interface StorePerformance {
  stores: Array<{
    storeId: string;
    storeName: string;
    region: string;
    country: string;
    city: string;
    orderCount: number;
    totalRevenue: number;
    avgOrderValue: number;
  }>;
}

interface PeakHours {
  peakHours: Array<{
    hour: number;
    orderCount: number;
  }>;
}

const DATE_RANGES = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: '7days' },
  { label: 'Last 30 Days', value: '30days' },
  { label: 'Last 90 Days', value: '90days' },
  { label: 'All Time', value: 'all' }
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  PREPARING: '#3b82f6',
  READY: '#8b5cf6',
  COMPLETED: '#10b981',
  CANCELLED: '#ef4444'
};

export default function OrderAnalyticsPage() {
  const { showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30days');
  
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<TrendData | null>(null);
  const [storePerformance, setStorePerformance] = useState<StorePerformance | null>(null);
  const [peakHours, setPeakHours] = useState<PeakHours | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const [summaryData, trendsData, storesData, hoursData] = await Promise.all([
        bff<AnalyticsSummary>(`/orders/analytics/summary?dateRange=${dateRange}`),
        bff<TrendData>(`/orders/analytics/trends?days=${dateRange === 'today' ? 1 : dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90}`),
        bff<StorePerformance>(`/orders/analytics/stores?dateRange=${dateRange}`),
        bff<PeakHours>(`/orders/analytics/peak-hours?days=${dateRange === 'today' ? 1 : dateRange === '7days' ? 7 : 30}`)
      ]);

      setSummary(summaryData);
      setTrends(trendsData);
      setStorePerformance(storesData);
      setPeakHours(hoursData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      showError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="s-wrap">
        <div className="s-panelCard">
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-white">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main>
      <div className="s-wrap">
        <div className="menu-header-section">
          <div>
            <h1 className="s-h1">Order Analytics</h1>
            <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
              Performance insights and trends across all locations
            </p>
          </div>
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="s-select"
            >
              {DATE_RANGES.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="s-panelCard">
            <div style={{ padding: '20px' }}>
              <div style={{ fontSize: '14px', color: 'var(--s-muted)', marginBottom: '8px' }}>Total Orders</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--s-head)' }}>
                {summary?.totalOrders.toLocaleString() || 0}
              </div>
            </div>
          </div>

          <div className="s-panelCard">
            <div style={{ padding: '20px' }}>
              <div style={{ fontSize: '14px', color: 'var(--s-muted)', marginBottom: '8px' }}>Total Revenue</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>
                £{summary?.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
            </div>
          </div>

          <div className="s-panelCard">
            <div style={{ padding: '20px' }}>
              <div style={{ fontSize: '14px', color: 'var(--s-muted)', marginBottom: '8px' }}>Avg Order Value</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#3b82f6' }}>
                £{summary?.avgOrderValue.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {/* Revenue Trend */}
          <section className="s-panel">
            <div className="s-panelCard">
              <div className="s-panelHeader">
                <p className="s-panelT">Revenue Trend</p>
              </div>
              <div style={{ padding: '20px', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends?.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af' }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Revenue (£)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Order Status Distribution */}
          <section className="s-panel">
            <div className="s-panelCard">
              <div className="s-panelHeader">
                <p className="s-panelT">Order Status</p>
              </div>
              <div style={{ padding: '20px', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary?.ordersByStatus || []}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {summary?.ordersByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </div>

        {/* Charts Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {/* Order Volume Trend */}
          <section className="s-panel">
            <div className="s-panelCard">
              <div className="s-panelHeader">
                <p className="s-panelT">Order Volume</p>
              </div>
              <div style={{ padding: '20px', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends?.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af' }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="orders" fill="#3b82f6" name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Peak Hours */}
          <section className="s-panel">
            <div className="s-panelCard">
              <div className="s-panelHeader">
                <p className="s-panelT">Peak Hours</p>
              </div>
              <div style={{ padding: '20px', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakHours?.peakHours || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="hour" 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af' }}
                      label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5, fill: '#9ca3af' }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="orderCount" fill="#8b5cf6" name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </div>

        {/* Store Performance Table */}
        <section className="s-panel">
          <div className="s-panelCard">
            <div className="s-panelHeader">
              <p className="s-panelT">Store Performance</p>
              <div style={{ fontSize: '14px', color: 'var(--s-muted)' }}>
                Top {storePerformance?.stores.length || 0} stores by revenue
              </div>
            </div>

            <div className="orders-table">
              <div className="orders-header">
                <div className="orders-cell">Store</div>
                <div className="orders-cell">Location</div>
                <div className="orders-cell">Orders</div>
                <div className="orders-cell">Revenue</div>
                <div className="orders-cell">Avg Order</div>
              </div>
              <div className="orders-body">
                {storePerformance?.stores.slice(0, 10).map((store) => (
                  <div key={store.storeId} className="orders-row">
                    <div className="orders-cell">
                      <div className="store-name">{store.storeName}</div>
                    </div>
                    <div className="orders-cell">
                      <div className="store-info">
                        <div className="store-location">
                          {store.city}, {store.country}
                        </div>
                        <span className={`badge region-${store.region.toLowerCase()}`}>
                          {store.region}
                        </span>
                      </div>
                    </div>
                    <div className="orders-cell">
                      <span style={{ fontWeight: '600' }}>{store.orderCount}</span>
                    </div>
                    <div className="orders-cell">
                      <span className="order-total">£{store.totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="orders-cell">
                      <span>£{store.avgOrderValue.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
