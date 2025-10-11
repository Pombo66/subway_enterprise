'use client';

import { useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import type { AnalyticsFilters, PeriodComparison } from '../services/analytics.service';

// Consistent date formatting to avoid hydration issues
const formatDateShort = (dateString: string) => {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
};

const formatDateLong = (dateString: string) => {
  const date = new Date(dateString);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
};

const formatDateWithWeekday = (dateString: string) => {
  const date = new Date(dateString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
};

interface DailyPoint {
  day: string;
  orders: number;
  revenue: number;
}

interface DimensionBreakdown {
  name: string;
  orders: number;
  revenue: number;
  percentage: number;
}

interface AnalyticsChartSectionProps {
  daily: DailyPoint[];
  filters: AnalyticsFilters;
  loading?: boolean;
  comparison?: PeriodComparison;
}

// Chart component using existing dashboard patterns
function TimeSeriesChart({ 
  title, 
  data, 
  dataKey, 
  color, 
  fillId, 
  unit = '' 
}: { 
  title: string; 
  data: DailyPoint[]; 
  dataKey: 'orders' | 'revenue'; 
  color: string; 
  fillId: string; 
  unit?: string; 
}) {
  const values = data.map(d => dataKey === 'revenue' ? Math.round(d.revenue) : d.orders);
  const w = 900;
  const h = 220;
  const pad = 24;
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const step = values.length > 1 ? (w - 2 * pad) / (values.length - 1) : 0;
  
  const X = (i: number) => pad + step * i;
  const Y = (v: number) => h - pad - ((v - min) / span) * (h - 2 * pad);
  
  const path = values.map((p, i) => `${i ? 'L' : 'M'} ${X(i)} ${Y(p)}`).join(' ');
  const area = `M ${X(0)} ${Y(values[0] ?? 0)} ${values
    .map((p, i) => `L ${X(i)} ${Y(p)}`)
    .join(' ')} L ${X(values.length - 1)} ${h - pad} L ${X(0)} ${h - pad} Z`;

  const last = values[values.length - 1] ?? 0;
  const prev = values[values.length - 2] ?? 0;
  const delta = prev ? ((last - prev) / prev) * 100 : 0;

  return (
    <div className="s-panelCard">
      <p className="s-panelT">{title}</p>
      <div className="s-chart">
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={title}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {Array.from({ length: 4 }).map((_, i) => (
            <line
              key={i}
              className="s-grid"
              x1={pad}
              x2={w - pad}
              y1={pad + ((h - 2 * pad) / 4) * i}
              y2={pad + ((h - 2 * pad) / 4) * i}
            />
          ))}
          <path d={area} fill={`url(#${fillId})`} />
          <path d={path} fill="none" stroke={color} strokeWidth="2.5" data-line />
          {values.length > 0 && (
            <circle cx={X(values.length - 1)} cy={Y(last)} r="3" fill={color} data-dot />
          )}
        </svg>
      </div>
      <div className="s-glance">
        <div className="s-glItem">
          <span>Points</span>
          <span className="s-strong">{values.length}</span>
        </div>
        <div className="s-glItem">
          <span>Latest</span>
          <span className="s-strong">{unit}{last}</span>
        </div>
        <div className="s-glItem">
          <span>Previous</span>
          <span className="s-strong">{unit}{prev}</span>
        </div>
        <div className="s-glItem">
          <span>Δ vs prev</span>
          <span className="s-strong">{delta >= 0 ? '+' : ''}{delta.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

// Enhanced date range comparison component
function DateRangeComparison({ 
  comparison, 
  filters 
}: { 
  comparison?: PeriodComparison; 
  filters: AnalyticsFilters; 
}) {
  if (!comparison || !filters.compareEnabled) {
    return (
      <div className="s-panelCard">
        <h3 className="s-panelT">Period Comparison</h3>
        <div style={{ 
          padding: '24px', 
          textAlign: 'center',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '8px',
          border: '1px dashed var(--s-border)'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
          <div style={{ color: 'var(--s-muted)', fontStyle: 'italic', marginBottom: '8px' }}>
            Enable &ldquo;Compare Periods&rdquo; in filters to see comparison data
          </div>
          <div style={{ fontSize: '12px', color: 'var(--s-muted)' }}>
            Compare current period performance against previous period
          </div>
        </div>
      </div>
    );
  }

  const getChangeColor = (percent: number) => {
    if (percent > 5) return '#4ade80';
    if (percent < -5) return '#f87171';
    return 'var(--s-accent-2)';
  };

  const getChangeIcon = (percent: number) => {
    if (percent > 5) return '📈';
    if (percent < -5) return '📉';
    return '➡️';
  };

  return (
    <div className="s-panelCard">
      <h3 className="s-panelT">Period Comparison Analysis</h3>
      
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div className="s-card" style={{ padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--s-muted)', marginBottom: '4px' }}>
            ORDERS CHANGE
          </div>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: '700', 
            color: getChangeColor(comparison.changes.ordersPercent),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
            <span>{getChangeIcon(comparison.changes.ordersPercent)}</span>
            <span>
              {comparison.changes.ordersPercent >= 0 ? '+' : ''}{comparison.changes.ordersPercent.toFixed(1)}%
            </span>
          </div>
        </div>
        
        <div className="s-card" style={{ padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--s-muted)', marginBottom: '4px' }}>
            REVENUE CHANGE
          </div>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: '700', 
            color: getChangeColor(comparison.changes.revenuePercent),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
            <span>{getChangeIcon(comparison.changes.revenuePercent)}</span>
            <span>
              {comparison.changes.revenuePercent >= 0 ? '+' : ''}{comparison.changes.revenuePercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Comparison */}
      <div className="sys">
        <div style={{ 
          fontSize: '12px', 
          color: 'var(--s-muted)', 
          marginBottom: '12px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          📊 Current Period ({comparison.current.period})
        </div>
        <div className="sys-row">
          <span>Orders</span>
          <span className="state ok">{comparison.current.orders.toLocaleString()}</span>
        </div>
        <div className="sys-row">
          <span>Revenue</span>
          <span className="state ok">£{comparison.current.revenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="sys-row">
          <span>Average Order Value</span>
          <span className="muted">£{(comparison.current.revenue / comparison.current.orders).toFixed(2)}</span>
        </div>
        
        <div className="sep" />
        
        <div style={{ 
          fontSize: '12px', 
          color: 'var(--s-muted)', 
          marginBottom: '12px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          📈 Previous Period ({comparison.previous.period})
        </div>
        <div className="sys-row">
          <span>Orders</span>
          <span className="muted">{comparison.previous.orders.toLocaleString()}</span>
        </div>
        <div className="sys-row">
          <span>Revenue</span>
          <span className="muted">£{comparison.previous.revenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="sys-row">
          <span>Average Order Value</span>
          <span className="muted">£{(comparison.previous.revenue / comparison.previous.orders).toFixed(2)}</span>
        </div>
        
        <div className="sep" />
        
        <div style={{ 
          fontSize: '12px', 
          color: 'var(--s-muted)', 
          marginBottom: '12px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          🔄 Net Changes
        </div>
        <div className="sys-row">
          <span>Orders Difference</span>
          <span style={{ color: getChangeColor(comparison.changes.ordersPercent) }}>
            {(comparison.current.orders - comparison.previous.orders) >= 0 ? '+' : ''}
            {(comparison.current.orders - comparison.previous.orders).toLocaleString()}
          </span>
        </div>
        <div className="sys-row">
          <span>Revenue Difference</span>
          <span style={{ color: getChangeColor(comparison.changes.revenuePercent) }}>
            {(comparison.current.revenue - comparison.previous.revenue) >= 0 ? '+' : ''}
            £{(comparison.current.revenue - comparison.previous.revenue).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}

// Enhanced dimension breakdown component with multiple views
function DimensionBreakdowns({ filters }: { filters: AnalyticsFilters }) {
  const [viewMode, setViewMode] = useState<'chart' | 'table' | 'comparison'>('chart');
  const [sortBy, setSortBy] = useState<'orders' | 'revenue' | 'percentage'>('revenue');
  
  // Mock dimension data based on scope
  const generateBreakdownData = (): DimensionBreakdown[] => {
    let baseData: DimensionBreakdown[] = [];
    
    if (filters.scope === 'global') {
      baseData = [
        { name: 'EMEA', orders: 145, revenue: 3250.75, percentage: 35 },
        { name: 'AMER', orders: 132, revenue: 2890.50, percentage: 32 },
        { name: 'APAC', orders: 98, revenue: 2180.25, percentage: 24 },
        { name: 'Other', orders: 38, revenue: 845.00, percentage: 9 },
      ];
    } else if (filters.scope === 'region') {
      baseData = [
        { name: 'London Central', orders: 45, revenue: 1250.75, percentage: 40 },
        { name: 'Manchester', orders: 32, revenue: 890.50, percentage: 28 },
        { name: 'Birmingham', orders: 28, revenue: 780.25, percentage: 25 },
        { name: 'Edinburgh', orders: 15, revenue: 420.30, percentage: 12 },
        { name: 'Cardiff', orders: 12, revenue: 335.15, percentage: 8 },
        { name: 'Other', orders: 8, revenue: 220.00, percentage: 7 },
      ];
    } else {
      baseData = [
        { name: 'Sandwiches', orders: 28, revenue: 680.25, percentage: 45 },
        { name: 'Salads', orders: 15, revenue: 425.50, percentage: 28 },
        { name: 'Drinks', orders: 18, revenue: 285.75, percentage: 22 },
        { name: 'Cookies', orders: 8, revenue: 128.50, percentage: 8 },
        { name: 'Wraps', orders: 6, revenue: 95.40, percentage: 6 },
        { name: 'Soups', orders: 4, revenue: 78.60, percentage: 5 },
      ];
    }
    
    // Sort data based on selected criteria
    return baseData.sort((a, b) => {
      switch (sortBy) {
        case 'orders': return b.orders - a.orders;
        case 'revenue': return b.revenue - a.revenue;
        case 'percentage': return b.percentage - a.percentage;
        default: return b.revenue - a.revenue;
      }
    });
  };

  const breakdownData = generateBreakdownData();
  const colors = ['var(--s-accent)', 'var(--s-accent-2)', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

  const getDimensionTitle = () => {
    switch (filters.scope) {
      case 'global': return 'Performance by Region';
      case 'region': return 'Performance by Store';
      case 'store': return 'Performance by Category';
      default: return 'Performance Breakdown';
    }
  };

  return (
    <div className="s-panelCard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 className="s-panelT" style={{ margin: 0 }}>
          {getDimensionTitle()}
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            className="s-select" 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as 'orders' | 'revenue' | 'percentage')}
            style={{ fontSize: '12px', padding: '4px 8px', minWidth: '100px' }}
          >
            <option value="revenue">Sort by Revenue</option>
            <option value="orders">Sort by Orders</option>
            <option value="percentage">Sort by Share</option>
          </select>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className={viewMode === 'chart' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setViewMode('chart')}
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              Chart
            </button>
            <button
              className={viewMode === 'table' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setViewMode('table')}
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              Table
            </button>
            <button
              className={viewMode === 'comparison' ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setViewMode('comparison')}
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              Compare
            </button>
          </div>
        </div>
      </div>
      
      {viewMode === 'chart' ? (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: '220px', height: '220px', minWidth: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdownData}
                  dataKey="percentage"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  paddingAngle={2}
                >
                  {breakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Market Share']}
                  contentStyle={{ 
                    background: 'var(--s-bg)', 
                    border: '1px solid var(--s-border)',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="list" style={{ flex: 1, minWidth: '250px' }}>
            {breakdownData.map((item, index) => (
              <div key={item.name} className="list-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div 
                    style={{ 
                      width: '14px', 
                      height: '14px', 
                      borderRadius: '3px',
                      backgroundColor: colors[index % colors.length] 
                    }} 
                  />
                  <div>
                    <div className="list-h">{item.name}</div>
                    <div className="list-sub">
                      {item.orders} orders • {item.percentage}% share
                    </div>
                  </div>
                </div>
                <div className="list-right">
                  <div className="list-amt">£{item.revenue.toFixed(2)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--s-muted)', marginTop: '2px' }}>
                    £{(item.revenue / item.orders).toFixed(2)} avg
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div style={{ height: '280px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdownData} layout="horizontal" margin={{ left: 80 }}>
              <XAxis 
                type="number" 
                stroke="currentColor" 
                opacity={0.6}
                tickFormatter={(value) => sortBy === 'revenue' ? `£${value}` : value.toString()}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="currentColor" 
                opacity={0.6}
                width={75}
                fontSize={12}
              />
              <Tooltip 
                formatter={(value: number) => [
                  sortBy === 'revenue' ? `£${value.toFixed(2)}` : value,
                  sortBy === 'revenue' ? 'Revenue' : sortBy === 'orders' ? 'Orders' : 'Share %'
                ]}
                contentStyle={{ 
                  background: 'var(--s-bg)', 
                  border: '1px solid var(--s-border)',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey={sortBy} 
                fill="var(--s-accent)"
                radius={[0, 3, 3, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {breakdownData.slice(0, 4).map((item, index) => (
            <div key={item.name} className="s-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div 
                  style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '2px',
                    backgroundColor: colors[index % colors.length] 
                  }} 
                />
                <div className="s-k" style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>
                  {item.name}
                </div>
              </div>
              <div className="sys">
                <div className="sys-row">
                  <span>Orders</span>
                  <span className="state ok">{item.orders}</span>
                </div>
                <div className="sys-row">
                  <span>Revenue</span>
                  <span className="state ok">£{item.revenue.toFixed(2)}</span>
                </div>
                <div className="sys-row">
                  <span>Market Share</span>
                  <span className="muted">{item.percentage}%</span>
                </div>
                <div className="sys-row">
                  <span>Avg Order</span>
                  <span className="muted">£{(item.revenue / item.orders).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsChartSection({ daily, filters, loading, comparison }: AnalyticsChartSectionProps) {
  const [activeChart, setActiveChart] = useState<'orders' | 'revenue'>('orders');
  const [chartView, setChartView] = useState<'line' | 'bar'>('line');

  if (loading) {
    return (
      <section className="s-panel">
        <div className="s-panelT">Analytics Trends</div>
        <div className="s-card">
          <div className="s-muted">Loading chart data...</div>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Time Series Charts */}
      <section className="s-panel">
        <div className="s-panelT">Time Series Analytics</div>
        <div className="s-panGrid">
          <TimeSeriesChart
            title="Daily Orders"
            data={daily}
            dataKey="orders"
            color="var(--s-accent)"
            fillId="ordersFill"
          />
          
          <TimeSeriesChart
            title="Daily Revenue (£)"
            data={daily}
            dataKey="revenue"
            color="var(--s-accent-2)"
            fillId="revenueFill"
            unit="£"
          />
        </div>
      </section>

      {/* Enhanced Interactive Chart Controls */}
      <section className="s-panel">
        <div className="s-panelT">Interactive Time Series</div>
        <div className="s-panelCard">
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            marginBottom: '20px', 
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className={activeChart === 'orders' ? 'btn btn-primary' : 'btn btn-secondary'}
                  onClick={() => setActiveChart('orders')}
                  style={{ fontSize: '13px', padding: '8px 12px' }}
                >
                  📊 Orders Trend
                </button>
                <button
                  className={activeChart === 'revenue' ? 'btn btn-primary' : 'btn btn-secondary'}
                  onClick={() => setActiveChart('revenue')}
                  style={{ fontSize: '13px', padding: '8px 12px' }}
                >
                  💰 Revenue Trend
                </button>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  className={chartView === 'line' ? 'btn btn-primary' : 'btn btn-secondary'}
                  onClick={() => setChartView('line')}
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                >
                  📈 Line
                </button>
                <button
                  className={chartView === 'bar' ? 'btn btn-primary' : 'btn btn-secondary'}
                  onClick={() => setChartView('bar')}
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                >
                  📊 Bar
                </button>
              </div>
            </div>
            
            {/* Chart Statistics */}
            <div style={{ 
              display: 'flex', 
              gap: '16px', 
              fontSize: '12px', 
              color: 'var(--s-muted)',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span>Total</span>
                <span className="s-strong">
                  {activeChart === 'orders' 
                    ? daily.reduce((sum, d) => sum + d.orders, 0)
                    : `£${daily.reduce((sum, d) => sum + d.revenue, 0).toFixed(2)}`
                  }
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span>Average</span>
                <span className="s-strong">
                  {activeChart === 'orders' 
                    ? Math.round(daily.reduce((sum, d) => sum + d.orders, 0) / daily.length)
                    : `£${(daily.reduce((sum, d) => sum + d.revenue, 0) / daily.length).toFixed(2)}`
                  }
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span>Peak</span>
                <span className="s-strong">
                  {activeChart === 'orders' 
                    ? Math.max(...daily.map(d => d.orders))
                    : `£${Math.max(...daily.map(d => d.revenue)).toFixed(2)}`
                  }
                </span>
              </div>
            </div>
          </div>
          
          <div style={{ height: '350px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'line' ? (
                <LineChart data={daily} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop 
                        offset="5%" 
                        stopColor={activeChart === 'orders' ? 'var(--s-accent)' : 'var(--s-accent-2)'} 
                        stopOpacity={0.3}
                      />
                      <stop 
                        offset="95%" 
                        stopColor={activeChart === 'orders' ? 'var(--s-accent)' : 'var(--s-accent-2)'} 
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="day" 
                    stroke="currentColor" 
                    opacity={0.6}
                    fontSize={11}
                    tickFormatter={(value) => formatDateShort(value)}
                  />
                  <YAxis 
                    stroke="currentColor" 
                    opacity={0.6} 
                    fontSize={11}
                    allowDecimals={false}
                    tickFormatter={(value) => activeChart === 'revenue' ? `£${value}` : value.toString()}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--s-bg)', 
                      border: '1px solid var(--s-border)',
                      borderRadius: '8px',
                      fontSize: '13px'
                    }}
                    labelFormatter={(value) => formatDateLong(value)}
                    formatter={(value: number) => [
                      activeChart === 'revenue' ? `£${value.toFixed(2)}` : value,
                      activeChart === 'orders' ? 'Orders' : 'Revenue'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={activeChart} 
                    dot={{ r: 5, strokeWidth: 2 }} 
                    strokeWidth={3}
                    stroke={activeChart === 'orders' ? 'var(--s-accent)' : 'var(--s-accent-2)'}
                    activeDot={{ r: 7, strokeWidth: 2 }}
                    fill="url(#chartGradient)"
                    fillOpacity={0.3}
                  />
                </LineChart>
              ) : (
                <BarChart data={daily} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <XAxis 
                    dataKey="day" 
                    stroke="currentColor" 
                    opacity={0.6}
                    fontSize={11}
                    tickFormatter={(value) => formatDateShort(value)}
                  />
                  <YAxis 
                    stroke="currentColor" 
                    opacity={0.6} 
                    fontSize={11}
                    allowDecimals={false}
                    tickFormatter={(value) => activeChart === 'revenue' ? `£${value}` : value.toString()}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--s-bg)', 
                      border: '1px solid var(--s-border)',
                      borderRadius: '8px',
                      fontSize: '13px'
                    }}
                    labelFormatter={(value) => formatDateLong(value)}
                    formatter={(value: number) => [
                      activeChart === 'revenue' ? `£${value.toFixed(2)}` : value,
                      activeChart === 'orders' ? 'Orders' : 'Revenue'
                    ]}
                  />
                  <Bar 
                    dataKey={activeChart} 
                    fill={activeChart === 'orders' ? 'var(--s-accent)' : 'var(--s-accent-2)'}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          
          {/* Chart Insights */}
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: 'rgba(255,255,255,0.02)', 
            borderRadius: '8px',
            border: '1px solid var(--s-border)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--s-muted)', marginBottom: '8px' }}>
              📈 Quick Insights
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--s-muted)' }}>Trend Direction</span>
                <div style={{ fontSize: '13px', color: 'var(--s-text)', fontWeight: '500' }}>
                  {(() => {
                    const recent = daily.slice(-3);
                    const older = daily.slice(-6, -3);
                    const recentAvg = recent.reduce((sum, d) => sum + (activeChart === 'orders' ? d.orders : d.revenue), 0) / recent.length;
                    const olderAvg = older.reduce((sum, d) => sum + (activeChart === 'orders' ? d.orders : d.revenue), 0) / older.length;
                    const trend = recentAvg > olderAvg ? '📈 Increasing' : recentAvg < olderAvg ? '📉 Decreasing' : '➡️ Stable';
                    return trend;
                  })()}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--s-muted)' }}>Best Day</span>
                <div style={{ fontSize: '13px', color: 'var(--s-text)', fontWeight: '500' }}>
                  {(() => {
                    const best = daily.reduce((max, d) => 
                      (activeChart === 'orders' ? d.orders : d.revenue) > (activeChart === 'orders' ? max.orders : max.revenue) ? d : max
                    );
                    return formatDateWithWeekday(best.day);
                  })()}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--s-muted)' }}>Growth Rate</span>
                <div style={{ fontSize: '13px', color: 'var(--s-text)', fontWeight: '500' }}>
                  {(() => {
                    const first = daily[0];
                    const last = daily[daily.length - 1];
                    const firstVal = activeChart === 'orders' ? first.orders : first.revenue;
                    const lastVal = activeChart === 'orders' ? last.orders : last.revenue;
                    const growthNum = ((lastVal - firstVal) / firstVal * 100);
                    const growth = growthNum.toFixed(1);
                    return `${growthNum >= 0 ? '+' : ''}${growth}%`;
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dimension Breakdowns and Comparisons */}
      <section className="s-panel">
        <div className="s-panelT">Analytics Breakdowns</div>
        <div className="s-panGrid">
          <DimensionBreakdowns filters={filters} />
          <DateRangeComparison comparison={comparison} filters={filters} />
        </div>
      </section>
    </>
  );
}