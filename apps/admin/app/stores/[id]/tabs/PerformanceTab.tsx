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

interface AIAnalysis {
  id: string;
  analysisDate: string;
  locationQualityScore: number;
  locationRating: string;
  primaryFactor: string;
  expectedRevenue: number | null;
  actualRevenue: number | null;
  performanceGap: number | null;
  recommendationPriority: string;
  model: string;
  tokensUsed: number;
}

export function PerformanceTab({ storeId }: { storeId: string }) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  
  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

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

  // Fetch latest AI analysis
  useEffect(() => {
    const fetchAIAnalysis = async () => {
      setAiLoading(true);
      try {
        const response = await fetch(`/api/ai-intelligence/stores/${storeId}/latest`);
        if (response.ok) {
          const data = await response.json();
          if (data.hasAnalysis) {
            setAiAnalysis(data.analysis);
          }
        }
      } catch (err) {
        console.error('Failed to fetch AI analysis:', err);
      } finally {
        setAiLoading(false);
      }
    };

    fetchAIAnalysis();
  }, [storeId]);

  const analyzeStore = async () => {
    setAnalyzing(true);
    setAiError(null);
    try {
      const response = await fetch(`/api/ai-intelligence/analyze/${storeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'current-user', // TODO: Get from auth context
          premium: false
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Refresh the analysis
          const latestResponse = await fetch(`/api/ai-intelligence/stores/${storeId}/latest`);
          if (latestResponse.ok) {
            const latestData = await latestResponse.json();
            if (latestData.hasAnalysis) {
              setAiAnalysis(latestData.analysis);
            }
          }
        }
      }
    } catch (err: any) {
      setAiError(err.response?.data?.message || 'Failed to analyze store');
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

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

      <div className="s-panel" style={{ marginBottom: '24px' }}>
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

      {/* AI Analysis Section */}
      <div className="s-panel">
        <div className="s-panelCard">
          <div className="s-panelHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="s-panelT">AI Performance Analysis</p>
              <p style={{ fontSize: '12px', color: 'var(--s-muted)', marginTop: '4px' }}>
                Powered by GPT-5-mini • Cost: ~$0.007 per analysis
              </p>
            </div>
            <button
              onClick={analyzeStore}
              disabled={analyzing}
              className="s-btn s-btn--primary"
              style={{ fontSize: '14px', padding: '8px 16px' }}
            >
              {analyzing ? 'Analyzing...' : aiAnalysis ? 'Analyze Again' : 'Analyze with AI'}
            </button>
          </div>

          <div style={{ padding: '24px' }}>
            {aiError && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#fee', 
                border: '1px solid #fcc',
                borderRadius: '8px',
                marginBottom: '16px',
                color: '#c00'
              }}>
                {aiError}
              </div>
            )}

            {aiLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--s-muted)' }}>
                Loading AI analysis...
              </div>
            ) : aiAnalysis ? (
              <>
                {/* Analysis Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: 'var(--s-bg-secondary)', 
                    border: '1px solid var(--s-border)',
                    borderRadius: '8px'
                  }}>
                    <p style={{ fontSize: '12px', color: 'var(--s-muted)', marginBottom: '8px' }}>
                      Location Quality
                    </p>
                    <p style={{ fontSize: '28px', fontWeight: '600', color: 'var(--s-text)' }}>
                      {aiAnalysis.locationQualityScore}/100
                    </p>
                    <p style={{ 
                      fontSize: '12px', 
                      fontWeight: '500',
                      marginTop: '4px',
                      color: aiAnalysis.locationRating === 'EXCELLENT' ? '#10b981' :
                             aiAnalysis.locationRating === 'GOOD' ? '#3b82f6' :
                             aiAnalysis.locationRating === 'FAIR' ? '#f59e0b' : '#ef4444'
                    }}>
                      {aiAnalysis.locationRating}
                    </p>
                  </div>

                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: 'var(--s-bg-secondary)', 
                    border: '1px solid var(--s-border)',
                    borderRadius: '8px'
                  }}>
                    <p style={{ fontSize: '12px', color: 'var(--s-muted)', marginBottom: '8px' }}>
                      Primary Factor
                    </p>
                    <p style={{ fontSize: '18px', fontWeight: '600', color: 'var(--s-text)', marginTop: '8px' }}>
                      {aiAnalysis.primaryFactor}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--s-muted)', marginTop: '4px' }}>
                      {aiAnalysis.primaryFactor === 'LOCATION' ? 'Site-related issues' :
                       aiAnalysis.primaryFactor === 'OPERATOR' ? 'Management-related' :
                       aiAnalysis.primaryFactor === 'MARKET' ? 'External factors' : 'Multiple factors'}
                    </p>
                  </div>

                  {aiAnalysis.performanceGap !== null && (
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: 'var(--s-bg-secondary)', 
                      border: '1px solid var(--s-border)',
                      borderRadius: '8px'
                    }}>
                      <p style={{ fontSize: '12px', color: 'var(--s-muted)', marginBottom: '8px' }}>
                        Performance Gap
                      </p>
                      <p style={{ 
                        fontSize: '24px', 
                        fontWeight: '600',
                        color: aiAnalysis.performanceGap >= 0 ? '#10b981' : '#ef4444'
                      }}>
                        {aiAnalysis.performanceGap >= 0 ? '+' : ''}
                        ${Math.abs(aiAnalysis.performanceGap).toLocaleString()}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--s-muted)', marginTop: '4px' }}>
                        vs expected revenue
                      </p>
                    </div>
                  )}

                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: 'var(--s-bg-secondary)', 
                    border: '1px solid var(--s-border)',
                    borderRadius: '8px'
                  }}>
                    <p style={{ fontSize: '12px', color: 'var(--s-muted)', marginBottom: '8px' }}>
                      Recommendation Priority
                    </p>
                    <p style={{ 
                      fontSize: '18px', 
                      fontWeight: '600',
                      marginTop: '8px',
                      color: aiAnalysis.recommendationPriority === 'HIGH' ? '#ef4444' :
                             aiAnalysis.recommendationPriority === 'MEDIUM' ? '#f59e0b' : '#10b981'
                    }}>
                      {aiAnalysis.recommendationPriority}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--s-muted)', marginTop: '4px' }}>
                      Action required
                    </p>
                  </div>
                </div>

                {/* Analysis Metadata */}
                <div style={{ 
                  padding: '12px 16px', 
                  backgroundColor: 'var(--s-bg-secondary)', 
                  border: '1px solid var(--s-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--s-muted)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>
                    Analyzed: {new Date(aiAnalysis.analysisDate).toLocaleDateString()} at{' '}
                    {new Date(aiAnalysis.analysisDate).toLocaleTimeString()}
                  </span>
                  <span>
                    Model: {aiAnalysis.model} • Tokens: {aiAnalysis.tokensUsed.toLocaleString()}
                  </span>
                </div>

                {/* Info Box */}
                <div style={{ 
                  marginTop: '16px',
                  padding: '12px 16px', 
                  backgroundColor: '#eff6ff', 
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#1e40af'
                }}>
                  <strong>💡 Full Analysis Available:</strong> This is a summary view. The complete AI analysis includes peer benchmarking, 
                  detailed recommendations, and strategic insights. Access the full report in the store analysis dashboard.
                </div>
              </>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px',
                color: 'var(--s-muted)'
              }}>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>No AI analysis available yet</p>
                <p style={{ fontSize: '13px', marginBottom: '20px' }}>
                  Click "Analyze with AI" to get AI-powered insights about this store's performance
                </p>
                <div style={{ 
                  display: 'inline-block',
                  padding: '12px 16px',
                  backgroundColor: 'var(--s-bg-secondary)',
                  border: '1px solid var(--s-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  textAlign: 'left'
                }}>
                  <p style={{ fontWeight: '600', marginBottom: '8px' }}>AI Analysis includes:</p>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li>Location quality assessment</li>
                    <li>Performance gap analysis</li>
                    <li>Root cause identification</li>
                    <li>Actionable recommendations</li>
                    <li>Peer benchmarking</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
