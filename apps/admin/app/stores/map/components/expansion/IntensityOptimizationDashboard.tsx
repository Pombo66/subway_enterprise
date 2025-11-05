'use client';

import { useState, useEffect } from 'react';

export interface IntensityAnalysisData {
  currentIntensity: {
    level: string;
    targetStores: number;
    actualSelected: number;
    selectionQuality: number;
    distributionBalance: number;
  };
  marketAnalysis: {
    totalAnalyzed: number;
    highPotentialCount: number;
    selectionReasoning: string;
    marketSaturationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  alternativeIntensities: Array<{
    name: string;
    targetCount: number;
    wouldSelectCount: number;
    description: string;
    qualityScore: number;
    distributionScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  aiQualityValidation: {
    overallScore: number;
    passed: boolean;
    intensityValidation: {
      selectionQuality: number;
      prioritizationAccuracy: number;
    };
    distributionValidation: {
      distributionBalance: number;
      concentrationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    recommendations: string[];
  };
  performanceMetrics: {
    generationTime: number;
    aiAnalysisTime: number;
    cacheHitRate: number;
    apiCallsUsed: number;
    tokensConsumed: number;
  };
}

export interface IntensityOptimizationDashboardProps {
  analysisData: IntensityAnalysisData;
  onIntensityChange: (intensity: string) => void;
  onRefreshAnalysis: () => Promise<void>;
  loading?: boolean;
}

export default function IntensityOptimizationDashboard({
  analysisData,
  onIntensityChange,
  onRefreshAnalysis,
  loading = false
}: IntensityOptimizationDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'alternatives' | 'quality' | 'performance'>('overview');
  const [showRecommendations, setShowRecommendations] = useState(true);

  const { currentIntensity, marketAnalysis, alternativeIntensities, aiQualityValidation, performanceMetrics } = analysisData;

  // Calculate optimization score
  const optimizationScore = (
    (currentIntensity.selectionQuality * 0.4) +
    (currentIntensity.distributionBalance * 0.3) +
    (aiQualityValidation.overallScore * 0.3)
  ) * 100;

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getRiskColor = (risk: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (risk) {
      case 'LOW': return '#10b981';
      case 'MEDIUM': return '#f59e0b';
      case 'HIGH': return '#ef4444';
    }
  };

  const OverviewTab = () => (
    <div>
      {/* Current Intensity Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          padding: '16px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6', marginBottom: '4px' }}>
            {currentIntensity.level}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Current Intensity</div>
          <div style={{ fontSize: '14px', color: '#374151' }}>
            {currentIntensity.actualSelected}/{currentIntensity.targetStores} stores
          </div>
        </div>

        <div style={{
          padding: '16px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: 700,
            color: getScoreColor(optimizationScore),
            marginBottom: '4px'
          }}>
            {optimizationScore.toFixed(0)}%
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Optimization Score</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Quality + Distribution + AI Validation
          </div>
        </div>

        <div style={{
          padding: '16px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: 700,
            color: getRiskColor(marketAnalysis.marketSaturationRisk),
            marginBottom: '4px'
          }}>
            {marketAnalysis.marketSaturationRisk}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Market Risk</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Saturation Assessment
          </div>
        </div>

        <div style={{
          padding: '16px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', marginBottom: '4px' }}>
            {marketAnalysis.highPotentialCount}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>High Potential</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            AI-Identified Locations
          </div>
        </div>
      </div>

      {/* Market Analysis */}
      <div style={{
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
          🧠 AI Market Analysis
        </h4>
        <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5', marginBottom: '12px' }}>
          {marketAnalysis.selectionReasoning}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
          <span>Total Analyzed: {marketAnalysis.totalAnalyzed.toLocaleString()}</span>
          <span>High Potential: {marketAnalysis.highPotentialCount.toLocaleString()}</span>
          <span>Selection Rate: {((currentIntensity.actualSelected / marketAnalysis.totalAnalyzed) * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Quality Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px'
      }}>
        <div style={{
          padding: '16px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
            📊 Selection Quality
          </h4>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>AI Selection Quality</span>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                {(currentIntensity.selectionQuality * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{
              height: '6px',
              background: '#e5e7eb',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${currentIntensity.selectionQuality * 100}%`,
                background: getScoreColor(currentIntensity.selectionQuality * 100),
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Prioritization Accuracy</span>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                {(aiQualityValidation.intensityValidation.prioritizationAccuracy * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{
              height: '6px',
              background: '#e5e7eb',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${aiQualityValidation.intensityValidation.prioritizationAccuracy * 100}%`,
                background: getScoreColor(aiQualityValidation.intensityValidation.prioritizationAccuracy * 100),
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        </div>

        <div style={{
          padding: '16px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
            🗺️ Distribution Balance
          </h4>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Geographic Balance</span>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                {(currentIntensity.distributionBalance * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{
              height: '6px',
              background: '#e5e7eb',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${currentIntensity.distributionBalance * 100}%`,
                background: getScoreColor(currentIntensity.distributionBalance * 100),
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: '#64748b'
          }}>
            <span>Concentration Risk:</span>
            <span style={{
              color: getRiskColor(aiQualityValidation.distributionValidation.concentrationRisk),
              fontWeight: 600
            }}>
              {aiQualityValidation.distributionValidation.concentrationRisk}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const AlternativesTab = () => (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
          🎯 Alternative Intensity Scenarios
        </h4>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
          Compare different intensity levels to optimize your expansion strategy
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {alternativeIntensities.map((alt, index) => {
          const isCurrentLevel = alt.name === currentIntensity.level;
          const overallScore = (alt.qualityScore + alt.distributionScore) / 2 * 100;
          
          return (
            <div
              key={index}
              onClick={() => !isCurrentLevel && onIntensityChange(alt.name)}
              style={{
                padding: '16px',
                borderRadius: '8px',
                border: isCurrentLevel ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                background: isCurrentLevel ? '#f0f9ff' : 'white',
                cursor: isCurrentLevel ? 'default' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: isCurrentLevel ? '#1e40af' : '#1e293b',
                    marginBottom: '4px'
                  }}>
                    {alt.name} Intensity
                    {isCurrentLevel && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '12px',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        background: '#3b82f6',
                        color: 'white'
                      }}>
                        CURRENT
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                    {alt.description}
                  </div>
                  <div style={{ fontSize: '12px', color: '#374151' }}>
                    Would select <strong>{alt.wouldSelectCount}</strong> of {alt.targetCount} target locations
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: getScoreColor(overallScore),
                    marginBottom: '2px'
                  }}>
                    {overallScore.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Overall Score
                  </div>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: getScoreColor(alt.qualityScore * 100),
                    marginBottom: '2px'
                  }}>
                    {(alt.qualityScore * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Quality</div>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: getScoreColor(alt.distributionScore * 100),
                    marginBottom: '2px'
                  }}>
                    {(alt.distributionScore * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Distribution</div>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: getRiskColor(alt.riskLevel),
                    marginBottom: '2px'
                  }}>
                    {alt.riskLevel}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Risk</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const QualityTab = () => (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
          🔍 AI Quality Validation
        </h4>
        <div style={{
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 600,
          background: aiQualityValidation.passed ? '#dcfce7' : '#fee2e2',
          color: aiQualityValidation.passed ? '#166534' : '#991b1b'
        }}>
          {aiQualityValidation.passed ? '✅ PASSED' : '❌ NEEDS IMPROVEMENT'}
        </div>
      </div>

      <div style={{
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
            Overall Quality Score
          </span>
          <span style={{
            fontSize: '20px',
            fontWeight: 700,
            color: getScoreColor(aiQualityValidation.overallScore * 100)
          }}>
            {(aiQualityValidation.overallScore * 100).toFixed(0)}%
          </span>
        </div>
        <div style={{
          height: '8px',
          background: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${aiQualityValidation.overallScore * 100}%`,
            background: getScoreColor(aiQualityValidation.overallScore * 100),
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Detailed Validation Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{
          padding: '16px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
            Intensity Validation
          </h5>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Selection Quality</span>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                {(aiQualityValidation.intensityValidation.selectionQuality * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{
              height: '4px',
              background: '#e5e7eb',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${aiQualityValidation.intensityValidation.selectionQuality * 100}%`,
                background: '#3b82f6'
              }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Prioritization Accuracy</span>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                {(aiQualityValidation.intensityValidation.prioritizationAccuracy * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{
              height: '4px',
              background: '#e5e7eb',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${aiQualityValidation.intensityValidation.prioritizationAccuracy * 100}%`,
                background: '#10b981'
              }} />
            </div>
          </div>
        </div>

        <div style={{
          padding: '16px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
            Distribution Validation
          </h5>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Distribution Balance</span>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                {(aiQualityValidation.distributionValidation.distributionBalance * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{
              height: '4px',
              background: '#e5e7eb',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${aiQualityValidation.distributionValidation.distributionBalance * 100}%`,
                background: '#8b5cf6'
              }} />
            </div>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Concentration Risk</span>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: getRiskColor(aiQualityValidation.distributionValidation.concentrationRisk)
            }}>
              {aiQualityValidation.distributionValidation.concentrationRisk}
            </span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {aiQualityValidation.recommendations.length > 0 && (
        <div style={{
          padding: '16px',
          background: '#fefce8',
          borderRadius: '8px',
          border: '1px solid #fde047'
        }}>
          <h5 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#713f12' }}>
            💡 AI Recommendations
          </h5>
          <ul style={{ margin: 0, paddingLeft: '16px' }}>
            {aiQualityValidation.recommendations.map((rec, index) => (
              <li key={index} style={{ fontSize: '12px', color: '#374151', marginBottom: '4px' }}>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const PerformanceTab = () => (
    <div>
      <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
        ⚡ Performance Metrics
      </h4>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{
          padding: '16px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6', marginBottom: '4px' }}>
            {(performanceMetrics.generationTime / 1000).toFixed(1)}s
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Total Generation Time</div>
        </div>

        <div style={{
          padding: '16px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>
            {(performanceMetrics.aiAnalysisTime / 1000).toFixed(1)}s
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>AI Analysis Time</div>
        </div>

        <div style={{
          padding: '16px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#8b5cf6', marginBottom: '4px' }}>
            {(performanceMetrics.cacheHitRate * 100).toFixed(0)}%
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Cache Hit Rate</div>
        </div>

        <div style={{
          padding: '16px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>
            {performanceMetrics.apiCallsUsed}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>API Calls Used</div>
        </div>

        <div style={{
          padding: '16px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444', marginBottom: '4px' }}>
            {performanceMetrics.tokensConsumed.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Tokens Consumed</div>
        </div>
      </div>

      {/* Performance Analysis */}
      <div style={{
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
          Performance Analysis
        </h5>
        <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.5' }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>Generation Efficiency:</strong> {performanceMetrics.generationTime < 60000 ? 'Excellent' : 'Good'} - 
            Analysis completed in {(performanceMetrics.generationTime / 1000).toFixed(1)} seconds
          </p>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>Cache Performance:</strong> {performanceMetrics.cacheHitRate > 0.7 ? 'Optimal' : 'Needs Improvement'} - 
            {(performanceMetrics.cacheHitRate * 100).toFixed(0)}% cache hit rate reduces API costs
          </p>
          <p style={{ margin: 0 }}>
            <strong>Resource Usage:</strong> {performanceMetrics.tokensConsumed} tokens consumed across {performanceMetrics.apiCallsUsed} API calls
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '20px',
      right: '20px',
      bottom: '20px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      border: '1px solid #e5e7eb',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
            🎯 Intensity Optimization Dashboard
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
            AI-powered analysis and optimization for expansion intensity levels
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={onRefreshAnalysis}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              background: 'white',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '🔄 Analyzing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        padding: '0 20px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        gap: '24px'
      }}>
        {[
          { key: 'overview', label: '📊 Overview', icon: '📊' },
          { key: 'alternatives', label: '🎯 Alternatives', icon: '🎯' },
          { key: 'quality', label: '🔍 Quality', icon: '🔍' },
          { key: 'performance', label: '⚡ Performance', icon: '⚡' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '12px 0',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: 500,
              color: activeTab === tab.key ? '#3b82f6' : '#64748b',
              borderBottom: activeTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflow: 'auto'
      }}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'alternatives' && <AlternativesTab />}
        {activeTab === 'quality' && <QualityTab />}
        {activeTab === 'performance' && <PerformanceTab />}
      </div>

      {/* Recommendations Footer */}
      {showRecommendations && aiQualityValidation.recommendations.length > 0 && (
        <div style={{
          padding: '16px 20px',
          background: '#fefce8',
          borderTop: '1px solid #fde047',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#713f12', marginBottom: '4px' }}>
              💡 Key Recommendations:
            </div>
            <div style={{ fontSize: '12px', color: '#374151' }}>
              {aiQualityValidation.recommendations.slice(0, 2).join(' • ')}
            </div>
          </div>
          <button
            onClick={() => setShowRecommendations(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '16px',
              color: '#713f12',
              cursor: 'pointer',
              padding: '0 0 0 12px'
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}