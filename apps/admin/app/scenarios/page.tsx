'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ScenarioConfig {
  name: string;
  budget: number;
  targetStores?: number;
  timeline: {
    years: number;
    phasedRollout: boolean;
  };
  strategy: 'maximize_roi' | 'maximize_count' | 'balanced';
  constraints: {
    minROI: number;
    maxCannibalization: number;
    regionFilter?: string;
  };
}

interface ScenarioResult {
  config: ScenarioConfig;
  portfolio: any;
  timeline: {
    years: Array<{
      year: number;
      storesOpened: number;
      investment: number;
      cumulativeStores: number;
      cumulativeInvestment: number;
      annualRevenue: number;
      cumulativeRevenue: number;
      cashFlow: number;
    }>;
    breakEvenMonth: number;
    peakCashRequirement: number;
  };
  riskAssessment: {
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    riskScore: number;
    factors: Array<{
      factor: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      impact: string;
      mitigation: string;
    }>;
    confidenceLevel: number;
  };
  financialProjections: {
    year1Revenue: number;
    year3Revenue: number;
    year5Revenue: number;
    year5ROI: number;
    year5NPV: number;
    paybackPeriod: number;
    irr: number;
  };
  aiRecommendation: string;
}

export default function ScenariosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioResult[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [recommendation, setRecommendation] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleQuickScenario = async (type: 'budget' | 'store_count' | 'timeline' | 'geographic') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/scenarios/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          baseConfig: {}
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Scenario generation failed');
      }

      const data = await response.json();
      setScenarios(data.scenarios);
      setComparison(data.comparison);
      setRecommendation(data.recommendation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scenario generation failed');
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

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return '#10b981';
      case 'MEDIUM': return '#f59e0b';
      case 'HIGH': return '#ef4444';
      default: return 'var(--s-text)';
    }
  };

  return (
    <main>
      <div className="s-wrap">
        <div className="menu-header-section">
          <div>
            <h1 className="s-h1">Executive Scenario Modeling</h1>
            <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
              Compare expansion strategies with AI-powered strategic analysis
            </p>
          </div>
          <button onClick={() => router.push('/stores')} className="s-btn s-btn--secondary">
            ← Back to Stores
          </button>
        </div>

        {/* Quick Scenario Buttons */}
        <div className="s-panel" style={{ marginBottom: '24px' }}>
          <div className="s-panelCard">
            <div className="s-panelHeader">
              <p className="s-panelT">Quick Scenario Analysis</p>
            </div>
            
            <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <button
                onClick={() => handleQuickScenario('budget')}
                disabled={loading}
                className="s-btn s-btn--secondary"
                style={{ padding: '20px', height: 'auto', textAlign: 'left' }}
              >
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Budget Scenarios</div>
                <div style={{ fontSize: '12px', color: 'var(--s-muted)' }}>Compare $25M, $50M, $75M budgets</div>
              </button>

              <button
                onClick={() => handleQuickScenario('store_count')}
                disabled={loading}
                className="s-btn s-btn--secondary"
                style={{ padding: '20px', height: 'auto', textAlign: 'left' }}
              >
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Store Count</div>
                <div style={{ fontSize: '12px', color: 'var(--s-muted)' }}>Compare 25, 50, 75 store targets</div>
              </button>

              <button
                onClick={() => handleQuickScenario('timeline')}
                disabled={loading}
                className="s-btn s-btn--secondary"
                style={{ padding: '20px', height: 'auto', textAlign: 'left' }}
              >
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Timeline</div>
                <div style={{ fontSize: '12px', color: 'var(--s-muted)' }}>Compare 1, 3, 5 year rollouts</div>
              </button>

              <button
                onClick={() => handleQuickScenario('geographic')}
                disabled={loading}
                className="s-btn s-btn--secondary"
                style={{ padding: '20px', height: 'auto', textAlign: 'left' }}
              >
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Geographic</div>
                <div style={{ fontSize: '12px', color: 'var(--s-muted)' }}>Compare EMEA, AMER, Global focus</div>
              </button>
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

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--s-muted)' }}>
            <p style={{ fontSize: '16px' }}>Generating scenarios with GPT-5.1...</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>This may take 30-60 seconds</p>
          </div>
        )}

        {/* AI Recommendation */}
        {recommendation && !loading && (
          <div className="s-panel" style={{ marginBottom: '24px' }}>
            <div className="s-panelCard">
              <div className="s-panelHeader">
                <p className="s-panelT">AI Strategic Recommendation</p>
              </div>
              <div style={{ padding: '32px' }}>
                <div style={{ 
                  padding: '20px', 
                  backgroundColor: '#eff6ff', 
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px'
                }}>
                  <p style={{ fontSize: '14px', color: '#1e40af', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                    {recommendation}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        {scenarios.length > 0 && !loading && (
          <div className="s-panel" style={{ marginBottom: '24px' }}>
            <div className="s-panelCard">
              <div className="s-panelHeader">
                <p className="s-panelT">Scenario Comparison</p>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--s-border)' }}>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--s-muted)' }}>Metric</th>
                      {scenarios.map((scenario, i) => (
                        <th key={i} style={{ padding: '16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--s-muted)' }}>
                          {scenario.config.name}
                          {comparison && comparison.winner === i && (
                            <span style={{ marginLeft: '8px', color: '#10b981' }}>★</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--s-border)' }}>
                      <td style={{ padding: '12px', fontSize: '13px', fontWeight: '500' }}>Total Stores</td>
                      {scenarios.map((s, i) => (
                        <td key={i} style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                          {s.portfolio.selectedStores.length}
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--s-border)' }}>
                      <td style={{ padding: '12px', fontSize: '13px', fontWeight: '500' }}>Total Investment</td>
                      {scenarios.map((s, i) => (
                        <td key={i} style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                          {formatCurrency(s.portfolio.summary.totalInvestment)}
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--s-border)' }}>
                      <td style={{ padding: '12px', fontSize: '13px', fontWeight: '500' }}>Year 1 Revenue</td>
                      {scenarios.map((s, i) => (
                        <td key={i} style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                          {formatCurrency(s.financialProjections.year1Revenue)}
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--s-border)' }}>
                      <td style={{ padding: '12px', fontSize: '13px', fontWeight: '500' }}>Year 5 Revenue</td>
                      {scenarios.map((s, i) => (
                        <td key={i} style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                          {formatCurrency(s.financialProjections.year5Revenue)}
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--s-border)' }}>
                      <td style={{ padding: '12px', fontSize: '13px', fontWeight: '500' }}>Average ROI</td>
                      {scenarios.map((s, i) => (
                        <td key={i} style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#10b981' }}>
                          {formatNumber(s.portfolio.summary.averageROI)}%
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--s-border)' }}>
                      <td style={{ padding: '12px', fontSize: '13px', fontWeight: '500' }}>Payback Period</td>
                      {scenarios.map((s, i) => (
                        <td key={i} style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                          {formatNumber(s.financialProjections.paybackPeriod)} yrs
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--s-border)' }}>
                      <td style={{ padding: '12px', fontSize: '13px', fontWeight: '500' }}>5-Year NPV</td>
                      {scenarios.map((s, i) => (
                        <td key={i} style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                          {formatCurrency(s.financialProjections.year5NPV)}
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--s-border)' }}>
                      <td style={{ padding: '12px', fontSize: '13px', fontWeight: '500' }}>Risk Level</td>
                      {scenarios.map((s, i) => (
                        <td key={i} style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: getRiskColor(s.riskAssessment.overallRisk) }}>
                          {s.riskAssessment.overallRisk}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: '12px', fontSize: '13px', fontWeight: '500' }}>Risk Score</td>
                      {scenarios.map((s, i) => (
                        <td key={i} style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                          {s.riskAssessment.riskScore}/100
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Scenario Cards */}
        {scenarios.length > 0 && !loading && (
          <div style={{ display: 'grid', gap: '24px' }}>
            {scenarios.map((scenario, index) => (
              <div key={index} className="s-panel">
                <div className="s-panelCard">
                  <div className="s-panelHeader">
                    <p className="s-panelT">
                      {scenario.config.name}
                      {comparison && comparison.winner === index && (
                        <span style={{ marginLeft: '12px', color: '#10b981', fontSize: '14px' }}>★ Recommended</span>
                      )}
                    </p>
                  </div>
                  
                  <div style={{ padding: '32px' }}>
                    {/* Key Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                      <div style={{ padding: '16px', backgroundColor: 'var(--s-bg-secondary)', borderRadius: '8px' }}>
                        <p style={{ fontSize: '11px', color: 'var(--s-muted)', marginBottom: '4px' }}>Stores</p>
                        <p style={{ fontSize: '24px', fontWeight: '600' }}>{scenario.portfolio.selectedStores.length}</p>
                      </div>
                      <div style={{ padding: '16px', backgroundColor: 'var(--s-bg-secondary)', borderRadius: '8px' }}>
                        <p style={{ fontSize: '11px', color: 'var(--s-muted)', marginBottom: '4px' }}>Investment</p>
                        <p style={{ fontSize: '20px', fontWeight: '600' }}>{formatCurrency(scenario.portfolio.summary.totalInvestment)}</p>
                      </div>
                      <div style={{ padding: '16px', backgroundColor: 'var(--s-bg-secondary)', borderRadius: '8px' }}>
                        <p style={{ fontSize: '11px', color: 'var(--s-muted)', marginBottom: '4px' }}>Avg ROI</p>
                        <p style={{ fontSize: '24px', fontWeight: '600', color: '#10b981' }}>{formatNumber(scenario.portfolio.summary.averageROI)}%</p>
                      </div>
                      <div style={{ padding: '16px', backgroundColor: 'var(--s-bg-secondary)', borderRadius: '8px' }}>
                        <p style={{ fontSize: '11px', color: 'var(--s-muted)', marginBottom: '4px' }}>Payback</p>
                        <p style={{ fontSize: '24px', fontWeight: '600' }}>{formatNumber(scenario.financialProjections.paybackPeriod)} yrs</p>
                      </div>
                      <div style={{ padding: '16px', backgroundColor: 'var(--s-bg-secondary)', borderRadius: '8px' }}>
                        <p style={{ fontSize: '11px', color: 'var(--s-muted)', marginBottom: '4px' }}>Risk</p>
                        <p style={{ fontSize: '24px', fontWeight: '600', color: getRiskColor(scenario.riskAssessment.overallRisk) }}>
                          {scenario.riskAssessment.overallRisk}
                        </p>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div style={{ marginBottom: '24px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--s-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
                        Timeline Projection
                      </p>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--s-border)' }}>
                              <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px', color: 'var(--s-muted)' }}>Year</th>
                              <th style={{ padding: '8px', textAlign: 'right', fontSize: '11px', color: 'var(--s-muted)' }}>Stores</th>
                              <th style={{ padding: '8px', textAlign: 'right', fontSize: '11px', color: 'var(--s-muted)' }}>Investment</th>
                              <th style={{ padding: '8px', textAlign: 'right', fontSize: '11px', color: 'var(--s-muted)' }}>Revenue</th>
                              <th style={{ padding: '8px', textAlign: 'right', fontSize: '11px', color: 'var(--s-muted)' }}>Cash Flow</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scenario.timeline.years.map((year) => (
                              <tr key={year.year} style={{ borderBottom: '1px solid var(--s-border)' }}>
                                <td style={{ padding: '8px' }}>Year {year.year}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>{year.storesOpened > 0 ? `+${year.storesOpened}` : '-'}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(year.investment)}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(year.annualRevenue)}</td>
                                <td style={{ padding: '8px', textAlign: 'right', color: year.cashFlow >= 0 ? '#10b981' : '#ef4444' }}>
                                  {formatCurrency(year.cashFlow)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--s-muted)', marginTop: '8px' }}>
                        Break-even: Month {scenario.timeline.breakEvenMonth} ({formatNumber(scenario.timeline.breakEvenMonth / 12, 1)} years)
                      </p>
                    </div>

                    {/* Risk Factors */}
                    {scenario.riskAssessment.factors.length > 0 && (
                      <div style={{ marginBottom: '24px' }}>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--s-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
                          Risk Factors
                        </p>
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {scenario.riskAssessment.factors.map((factor, i) => (
                            <div key={i} style={{ 
                              padding: '12px', 
                              backgroundColor: 'var(--s-bg-secondary)', 
                              borderRadius: '6px',
                              borderLeft: `3px solid ${getRiskColor(factor.severity)}`
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600' }}>{factor.factor}</span>
                                <span style={{ fontSize: '11px', color: getRiskColor(factor.severity), fontWeight: '600' }}>
                                  {factor.severity}
                                </span>
                              </div>
                              <p style={{ fontSize: '12px', color: 'var(--s-muted)', marginBottom: '4px' }}>{factor.impact}</p>
                              <p style={{ fontSize: '11px', color: 'var(--s-muted)', fontStyle: 'italic' }}>
                                Mitigation: {factor.mitigation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Recommendation */}
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: '#eff6ff', 
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px'
                    }}>
                      <p style={{ fontSize: '11px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
                        AI ANALYSIS
                      </p>
                      <p style={{ fontSize: '13px', color: '#1e40af', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {scenario.aiRecommendation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {scenarios.length === 0 && !loading && !error && (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: 'var(--s-muted)'
          }}>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>Select a quick scenario above to begin</p>
            <p style={{ fontSize: '14px' }}>AI-powered strategic analysis using GPT-5.1</p>
          </div>
        )}
      </div>
    </main>
  );
}
