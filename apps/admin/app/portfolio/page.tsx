'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface OptimizationResult {
  selectedStores: Array<{
    candidateId: string;
    rank: number;
    name: string;
    city: string;
    country: string;
    roi: number;
    cost: number;
    expectedRevenue: number;
    cannibalizationImpact: number;
    paybackPeriod: number;
    npv: number;
    reasoning: string;
  }>;
  summary: {
    totalStores: number;
    totalInvestment: number;
    budgetRemaining: number;
    averageROI: number;
    averagePayback: number;
    networkCannibalization: number;
    expectedAnnualRevenue: number;
  };
  aiInsights: string;
  warnings: string[];
}

export default function PortfolioOptimizerPage() {
  const router = useRouter();
  const [budget, setBudget] = useState(50000000);
  const [mode, setMode] = useState<'maximize_count' | 'maximize_roi' | 'balanced'>('maximize_roi');
  const [minROI, setMinROI] = useState(15);
  const [maxCannibalization, setMaxCannibalization] = useState(10);
  const [regionFilter, setRegionFilter] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/portfolio/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget,
          mode,
          constraints: {
            minROI,
            maxCannibalization,
            regionFilter: regionFilter || undefined
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Optimization failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
    } finally {
      setLoading(false);
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

  const formatNumber = (value: number, decimals: number = 1) => {
    return value.toFixed(decimals);
  };

  return (
    <main>
      <div className="s-wrap">
        <div className="menu-header-section">
          <div>
            <h1 className="s-h1">Expansion Portfolio Optimizer</h1>
            <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
              Optimize store selection for maximum ROI within budget constraints
            </p>
          </div>
          <button onClick={() => router.push('/stores')} className="s-btn s-btn--secondary">
            ← Back to Stores
          </button>
        </div>

        {/* Configuration Panel */}
        <div className="s-panel" style={{ marginBottom: '24px' }}>
          <div className="s-panelCard">
            <div className="s-panelHeader">
              <p className="s-panelT">Configuration</p>
            </div>
            
            <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                  Total Budget
                </label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="s-input"
                  placeholder="50000000"
                  step="1000000"
                />
                <p style={{ fontSize: '11px', color: 'var(--s-muted)', marginTop: '4px' }}>
                  {formatCurrency(budget)}
                </p>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                  Optimization Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                  className="s-select"
                >
                  <option value="maximize_roi">Maximize ROI</option>
                  <option value="maximize_count">Maximize Store Count</option>
                  <option value="balanced">Balanced</option>
                </select>
                <p style={{ fontSize: '11px', color: 'var(--s-muted)', marginTop: '4px' }}>
                  {mode === 'maximize_roi' && 'Focus on highest-return locations'}
                  {mode === 'maximize_count' && 'Get as many stores as possible'}
                  {mode === 'balanced' && 'Balance quantity and quality'}
                </p>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                  Minimum ROI Required (%)
                </label>
                <input
                  type="number"
                  value={minROI}
                  onChange={(e) => setMinROI(Number(e.target.value))}
                  className="s-input"
                  placeholder="15"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                  Max Cannibalization (%)
                </label>
                <input
                  type="number"
                  value={maxCannibalization}
                  onChange={(e) => setMaxCannibalization(Number(e.target.value))}
                  className="s-input"
                  placeholder="10"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--s-muted)', textTransform: 'uppercase', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                  Region Filter (Optional)
                </label>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="s-select"
                >
                  <option value="">All Regions</option>
                  <option value="EMEA">EMEA</option>
                  <option value="AMER">AMER</option>
                  <option value="APAC">APAC</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  onClick={handleOptimize}
                  disabled={loading}
                  className="s-btn s-btn--primary"
                  style={{ width: '100%' }}
                >
                  {loading ? 'Optimizing...' : 'Run Optimization'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#fee', 
            border: '1px solid #fcc',
            borderRadius: '8px',
            marginBottom: '24px',
            color: '#c00'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Summary Panel */}
            <div className="s-panel" style={{ marginBottom: '24px' }}>
              <div className="s-panelCard">
                <div className="s-panelHeader">
                  <p className="s-panelT">Results Summary</p>
                </div>
                
                <div style={{ padding: '32px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ padding: '16px', backgroundColor: 'var(--s-bg-secondary)', borderRadius: '8px' }}>
                      <p style={{ fontSize: '12px', color: 'var(--s-muted)', marginBottom: '8px' }}>Stores Selected</p>
                      <p style={{ fontSize: '32px', fontWeight: '600', color: 'var(--s-text)' }}>
                        {result.summary.totalStores}
                      </p>
                    </div>

                    <div style={{ padding: '16px', backgroundColor: 'var(--s-bg-secondary)', borderRadius: '8px' }}>
                      <p style={{ fontSize: '12px', color: 'var(--s-muted)', marginBottom: '8px' }}>Total Investment</p>
                      <p style={{ fontSize: '28px', fontWeight: '600', color: 'var(--s-text)' }}>
                        {formatCurrency(result.summary.totalInvestment)}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--s-muted)', marginTop: '4px' }}>
                        {formatCurrency(result.summary.budgetRemaining)} under budget
                      </p>
                    </div>

                    <div style={{ padding: '16px', backgroundColor: 'var(--s-bg-secondary)', borderRadius: '8px' }}>
                      <p style={{ fontSize: '12px', color: 'var(--s-muted)', marginBottom: '8px' }}>Average ROI</p>
                      <p style={{ fontSize: '32px', fontWeight: '600', color: '#10b981' }}>
                        {formatNumber(result.summary.averageROI)}%
                      </p>
                    </div>

                    <div style={{ padding: '16px', backgroundColor: 'var(--s-bg-secondary)', borderRadius: '8px' }}>
                      <p style={{ fontSize: '12px', color: 'var(--s-muted)', marginBottom: '8px' }}>Avg Payback</p>
                      <p style={{ fontSize: '32px', fontWeight: '600', color: 'var(--s-text)' }}>
                        {formatNumber(result.summary.averagePayback)} yrs
                      </p>
                    </div>

                    <div style={{ padding: '16px', backgroundColor: 'var(--s-bg-secondary)', borderRadius: '8px' }}>
                      <p style={{ fontSize: '12px', color: 'var(--s-muted)', marginBottom: '8px' }}>Network Cannibalization</p>
                      <p style={{ fontSize: '32px', fontWeight: '600', color: result.summary.networkCannibalization > 8 ? '#ef4444' : '#10b981' }}>
                        {formatNumber(result.summary.networkCannibalization)}%
                      </p>
                    </div>

                    <div style={{ padding: '16px', backgroundColor: 'var(--s-bg-secondary)', borderRadius: '8px' }}>
                      <p style={{ fontSize: '12px', color: 'var(--s-muted)', marginBottom: '8px' }}>Expected Annual Revenue</p>
                      <p style={{ fontSize: '28px', fontWeight: '600', color: 'var(--s-text)' }}>
                        {formatCurrency(result.summary.expectedAnnualRevenue)}
                      </p>
                    </div>
                  </div>

                  {/* AI Insights */}
                  {result.aiInsights && (
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: '#eff6ff', 
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      marginBottom: '16px'
                    }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
                        🤖 AI Insights
                      </p>
                      <p style={{ fontSize: '14px', color: '#1e40af', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {result.aiInsights}
                      </p>
                    </div>
                  )}

                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: '#fef3c7', 
                      border: '1px solid #fcd34d',
                      borderRadius: '8px'
                    }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
                        ⚠️ Warnings
                      </p>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#92400e', fontSize: '13px' }}>
                        {result.warnings.map((warning, i) => (
                          <li key={i} style={{ marginBottom: '4px' }}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Selected Locations Table */}
            <div className="s-panel">
              <div className="s-panelCard">
                <div className="s-panelHeader">
                  <p className="s-panelT">Selected Locations ({result.selectedStores.length})</p>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--s-border)' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--s-muted)' }}>Rank</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--s-muted)' }}>Location</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--s-muted)' }}>ROI</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--s-muted)' }}>Cost</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--s-muted)' }}>Revenue/yr</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--s-muted)' }}>Payback</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--s-muted)' }}>NPV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.selectedStores.map((store) => (
                        <tr key={store.candidateId} style={{ borderBottom: '1px solid var(--s-border)' }}>
                          <td style={{ padding: '12px', fontSize: '14px' }}>#{store.rank}</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '500' }}>{store.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--s-muted)' }}>{store.city}, {store.country}</div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#10b981' }}>
                            {formatNumber(store.roi)}%
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                            {formatCurrency(store.cost)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                            {formatCurrency(store.expectedRevenue)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                            {formatNumber(store.paybackPeriod)} yrs
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                            {formatCurrency(store.npv)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!result && !loading && !error && (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: 'var(--s-muted)'
          }}>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>Configure your optimization parameters above</p>
            <p style={{ fontSize: '14px' }}>Then click "Run Optimization" to find the best portfolio of locations</p>
          </div>
        )}
      </div>
    </main>
  );
}
