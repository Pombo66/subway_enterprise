'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceData {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    statusBreakdown: Record<string, number>;
  };
  trends: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
}

export function PerformanceTab({ storeId }: { storeId: string }) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const fetchPerformance = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/stores/${storeId}/performance?days=${days}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (err) {
        console.error('Failed to fetch performance data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [storeId, days]);

  if (loading) {
    return <div style={{ padding: '24px' }}>Loading performance data...</div>;
  }

  if (!data) {
    return <div style={{ padding: '24px' }}>No performance data available</div>;
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', gap: '8px' }}>
        {[7, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={days === d ? 's-btn s-btn--primary' : 's-btn s-btn--secondary'}
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            {d} Days
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="s-panel">
          <div className="s-panelCard" style={{ padding: '20px' }}>
            <p style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500' }}>
              Total Orders
            </p>
            <p style={{ fontSize: '32px', fontWeight: '600', marginTop: '8px', color: 'var(--s-text)' }}>
              {data.summary.totalOrders}
            </p>
          </div>
        </div>

        <div className="s-panel">
          <div className="s-panelCard" style={{ padding: '20px' }}>
            <p style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500' }}>
              Total Revenue
            </p>
            <p style={{ fontSize: '32px', fontWeight: '600', marginTop: '8px', color: 'var(--s-text)' }}>
              ${data.summary.totalRevenue.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="s-panel">
          <div className="s-panelCard" style={{ padding: '20px' }}>
            <p style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500' }}>
              Avg Order Value
            </p>
            <p style={{ fontSize: '32px', fontWeight: '600', marginTop: '8px', color: 'var(--s-text)' }}>
              ${data.summary.avgOrderValue.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="s-panel" style={{ marginBottom: '24px' }}>
        <div className="s-panelCard">
          <div className="s-panelHeader">
            <p className="s-panelT">Order Trends</p>
          </div>
          <div style={{ padding: '24px', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--s-border)" />
                <XAxis dataKey="date" stroke="var(--s-muted)" />
                <YAxis stroke="var(--s-muted)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--s-bg)', 
                    border: '1px solid var(--s-border)',
                    borderRadius: '8px'
                  }}
                />
                <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="s-panel">
        <div className="s-panelCard">
          <div className="s-panelHeader">
            <p className="s-panelT">Revenue Trends</p>
          </div>
          <div style={{ padding: '24px', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--s-border)" />
                <XAxis dataKey="date" stroke="var(--s-muted)" />
                <YAxis stroke="var(--s-muted)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--s-bg)', 
                    border: '1px solid var(--s-border)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
