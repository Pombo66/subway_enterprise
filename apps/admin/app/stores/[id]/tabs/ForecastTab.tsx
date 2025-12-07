'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface ForecastPoint {
  date: string;
  month: number;
  year: number;
  predictedRevenue: number;
  confidenceLow: number;
  confidenceHigh: number;
}

interface StoreForecast {
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
  historicalData: Array<{
    date: string;
    revenue: number;
    month: number;
    year: number;
  }>;
}

interface ForecastExplanation {
  summary: string;
  keyDrivers: string[];
  seasonalInsights: string[];
  risks: string[];
  opportunities: string[];
  recommendations: string[];
  confidence: number;
}

export function ForecastTab({ storeId }: { storeId: string }) {
  const [forecast, setForecast] = useState<StoreForecast | null>(null);
  const [explanation, setExplanation] = useState<ForecastExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchForecast();
  }, [storeId]);

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/forecasts/store/${storeId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load forecast');
      }

      const data = await response.json();
      setForecast(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forecast');
    } finally {
      setLoading(false);
    }
  };

  const fetchExplanation = async () => {
    setExplanationLoading(true);
    
    try {
      const response = await fetch(`/api/forecasts/store/${storeId}/explain`);
      
      if (!response.ok) {
        throw new Error('Failed to load explanation');
      }

      const data = await response.json();
      setExplanation(data);
    } catch (err) {
      console.error('Failed to load explanation:', err);
    } finally {
      setExplanationLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatMonth = (month: number, year: number) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month - 1]} ${year}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--s-muted)' }}>
        <p>Loading forecast...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px' }}>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '8px',
          color: '#c00'
        }}>
          <strong>Error:</strong> {error}
          <div style={{ marginTop: '12px' }}>
            <button onClick={fetchForecast} className="s-btn s-btn--primary">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!forecast) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--s-muted)' }}>
        <p>No forecast data available</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = forecast.forecasts.map(f => ({
    name: formatMonth(f.month, f.year),
    predicted: f.predictedRevenue,
    low: f.confidenceLow,
    high: f.confidenceHigh
  }));

  return (
    <div style={{ padding: '32px' }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ padding: '20px', backgroundColor: 'var(--s-bg-secondary)', borderRadius: '8px' }}>
          <p style={{ fontSize: '12px', color: 'var(--s-muted)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '500' }}>
            Next Month
          </p>
          <p style={{ fontSize: '32px', fontWeight: '600', color: 'var(--s-text)' }}>
            {formatCurrency(forecast.summary.nextMonthRevenue)}
          </p>
        </div>

        <div style={{ padding: '20px', backgroundColor: 'var(--s-bg-secondary)', borderRadius: '8px' }}>
          <p style={{ fontSize: '12px', color: 'var(--s-muted)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '500' }}>
            Next Quarter
          </p>
          <p style={{ fontSize: '32px', fontWeight: '600', color: 'var(--s-text)' }}>
            {formatCurrency(forecast.summary.nextQuarterRevenue)}
          </p>
        </div>

        <div style={{ padding: '20px', backgroundColor: 'var(--s-bg-secondary)', borderRadius: '8px' }}>
          <p style={{ fontSize: '12px', color: 'var(--s-muted)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '500' }}>
            Year-End Total
          </p>
          <p style={{ fontSize: '32px', fontWeight: '600', color: 'var(--s-text)' }}>
            {formatCurrency(forecast.summary.yearEndRevenue)}
          </p>
        </div>

        <div style={{ padding: '20px', backgroundColor: 'var(--s-bg-secondary)', borderRadius: '8px' }}>
          <p style={{ fontSize: '12px', color: 'var(--s-muted)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '500' }}>
            Growth Rate
          </p>
          <p style={{ 
            fontSize: '32px', 
            fontWeight: '600', 
            color: forecast.summary.growthRate >= 0 ? '#10b981' : '#ef4444'
          }}>
            {forecast.summary.growthRate >= 0 ? '+' : ''}{forecast.summary.growthRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Forecast Chart */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>12-Month Revenue Forecast</h3>
        <div style={{ backgroundColor: 'var(--s-bg-secondary)', padding: '24px', borderRadius: '8px' }}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--s-border)" />
              <XAxis 
                dataKey="name" 
                stroke="var(--s-muted)"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="var(--s-muted)"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--s-bg)', 
                  border: '1px solid var(--s-border)',
                  borderRadius: '6px'
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Area 
                type="monotone" 
                dataKey="high" 
                stroke="none" 
                fill="#3b82f6" 
                fillOpacity={0.1}
              />
              <Area 
                type="monotone" 
                dataKey="low" 
                stroke="none" 
                fill="#fff" 
                fillOpacity={1}
              />
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p style={{ fontSize: '11px', color: 'var(--s-muted)', marginTop: '12px', textAlign: 'center' }}>
            Shaded area represents 80% confidence interval
          </p>
        </div>
      </div>

      {/* AI Insights */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600' }}>AI Insights</h3>
          {!explanation && (
            <button 
              onClick={fetchExplanation}
              disabled={explanationLoading}
              className="s-btn s-btn--primary"
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              {explanationLoading ? 'Generating...' : 'Generate AI Insights'}
            </button>
          )}
        </div>

        {explanation && (
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Summary */}
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#eff6ff', 
              border: '1px solid #bfdbfe',
              borderRadius: '8px'
            }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af', marginBottom: '8px', textTransform: 'uppercase' }}>
                Summary
              </p>
              <p style={{ fontSize: '14px', color: '#1e40af', lineHeight: '1.6' }}>
                {explanation.summary}
              </p>
            </div>

            {/* Key Drivers */}
            {explanation.keyDrivers.length > 0 && (
              <div style={{ padding: '20px', backgroundColor: 'var(--s-bg-secondary)', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--s-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
                  Key Drivers
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--s-text)' }}>
                  {explanation.keyDrivers.map((driver, i) => (
                    <li key={i} style={{ marginBottom: '8px', fontSize: '14px' }}>{driver}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Seasonal Insights */}
            {explanation.seasonalInsights.length > 0 && (
              <div style={{ padding: '20px', backgroundColor: 'var(--s-bg-secondary)', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--s-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
                  Seasonal Patterns
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--s-text)' }}>
                  {explanation.seasonalInsights.map((insight, i) => (
                    <li key={i} style={{ marginBottom: '8px', fontSize: '14px' }}>{insight}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risks & Opportunities */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {explanation.risks.length > 0 && (
                <div style={{ padding: '20px', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px' }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#92400e', marginBottom: '12px', textTransform: 'uppercase' }}>
                    Risks
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#92400e' }}>
                    {explanation.risks.map((risk, i) => (
                      <li key={i} style={{ marginBottom: '8px', fontSize: '13px' }}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {explanation.opportunities.length > 0 && (
                <div style={{ padding: '20px', backgroundColor: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px' }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#065f46', marginBottom: '12px', textTransform: 'uppercase' }}>
                    Opportunities
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#065f46' }}>
                    {explanation.opportunities.map((opp, i) => (
                      <li key={i} style={{ marginBottom: '8px', fontSize: '13px' }}>{opp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {explanation.recommendations.length > 0 && (
              <div style={{ padding: '20px', backgroundColor: 'var(--s-bg-secondary)', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--s-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
                  Recommendations
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--s-text)' }}>
                  {explanation.recommendations.map((rec, i) => (
                    <li key={i} style={{ marginBottom: '8px', fontSize: '14px' }}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
