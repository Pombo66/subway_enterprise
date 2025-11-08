'use client';

import { ExpansionSuggestion } from './SuggestionMarker';

export interface SuggestionInfoCardProps {
  suggestion: ExpansionSuggestion;
  onClose: () => void;
  onStatusChange: (status: 'NEW' | 'APPROVED' | 'REJECTED' | 'HOLD') => Promise<void>;
  nearestStoreDistance?: number;
}

export default function SuggestionInfoCard({
  suggestion,
  onClose,
  onStatusChange,
  nearestStoreDistance
}: SuggestionInfoCardProps) {
  const handleStatusChange = async (status: 'NEW' | 'APPROVED' | 'REJECTED' | 'HOLD') => {
    await onStatusChange(status);
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '20px',
      width: '400px',
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      zIndex: 1001,
      maxHeight: 'calc(100vh - 40px)',
      overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1f2937' }}>
          Why here?
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666',
            padding: 0,
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {/* AI Analysis Indicator */}
        <div style={{ marginBottom: '16px' }}>
          {suggestion.hasAIAnalysis ? (
            <div style={{
              padding: '12px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderRadius: '8px',
              border: '2px solid #f59e0b',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#f59e0b',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px'
                }}>
                  🤖
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#92400e' }}>
                    AI-Enhanced Analysis
                  </div>
                  <div style={{ fontSize: '12px', color: '#a16207' }}>
                    Top {suggestion.aiProcessingRank || '20'}% candidate - Full AI insights available
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#a16207', fontStyle: 'italic' }}>
                This location received comprehensive AI analysis including market assessment, 
                competitive advantages, and strategic insights.
              </div>
            </div>
          ) : (
            <div style={{
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '2px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#64748b',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px'
                }}>
                  📊
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                    Standard Analysis
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Deterministic analysis with cost-optimized rationale
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                This location uses our proven algorithmic analysis. 
                AI insights are reserved for the top 20% highest-scoring candidates.
              </div>
            </div>
          )}
        </div>

        {/* Confidence Score */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            Confidence Score
          </div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#0070f3' }}>
            {(suggestion.confidence * 100).toFixed(0)}%
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-block',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              background: suggestion.band === 'HIGH' ? '#d1fae5' :
                         suggestion.band === 'MEDIUM' ? '#e9d5ff' :
                         suggestion.band === 'LOW' ? '#fed7aa' : '#f3f4f6',
              color: suggestion.band === 'HIGH' ? '#065f46' :
                     suggestion.band === 'MEDIUM' ? '#6b21a8' :
                     suggestion.band === 'LOW' ? '#92400e' : '#374151'
            }}>
              {suggestion.band}
            </div>
            {suggestion.intensityMetadata && (
              <div style={{
                display: 'inline-block',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
                background: '#f0f9ff',
                color: '#0369a1'
              }}>
                🎯 {suggestion.intensityMetadata.selectedAtIntensity} Intensity
              </div>
            )}
            {suggestion.aiInsights && (
              <div style={{
                display: 'inline-block',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
                background: suggestion.aiInsights.confidenceLevel === 'HIGH' ? '#ecfdf5' :
                           suggestion.aiInsights.confidenceLevel === 'MEDIUM' ? '#fef3c7' : '#fef2f2',
                color: suggestion.aiInsights.confidenceLevel === 'HIGH' ? '#047857' :
                       suggestion.aiInsights.confidenceLevel === 'MEDIUM' ? '#92400e' : '#dc2626'
              }}>
                🤖 AI {suggestion.aiInsights.confidenceLevel}
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            Location
          </div>
          <div style={{ fontSize: '14px', color: '#1f2937' }}>
            {suggestion.lat.toFixed(4)}, {suggestion.lng.toFixed(4)}
          </div>
        </div>

        {/* AI Potential Ranking */}
        {suggestion.intensityMetadata && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1f2937' }}>
              🎯 AI Market Potential Ranking
            </div>
            <div style={{
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>Market Ranking</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#0369a1' }}>
                  #{suggestion.intensityMetadata.originalRanking}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>Geographic Priority</span>
                <span style={{ fontSize: '12px', fontWeight: 500 }}>
                  {(suggestion.intensityMetadata.geographicPriority * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>Market Saturation Risk</span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: suggestion.intensityMetadata.marketSaturationRisk === 'LOW' ? '#047857' :
                         suggestion.intensityMetadata.marketSaturationRisk === 'MEDIUM' ? '#92400e' : '#dc2626'
                }}>
                  {suggestion.intensityMetadata.marketSaturationRisk}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                Selected at <strong>{suggestion.intensityMetadata.selectedAtIntensity}</strong> intensity level
              </div>
            </div>
          </div>
        )}

        {/* Distance to Nearest Store */}
        {nearestStoreDistance && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              Distance to Nearest Store
            </div>
            <div style={{ fontSize: '14px', color: '#1f2937' }}>
              {Math.round(nearestStoreDistance)}m
            </div>
          </div>
        )}

        {/* Factor Breakdown */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1f2937' }}>
            Factor Breakdown
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#666' }}>Population</span>
              <span style={{ fontSize: '12px', fontWeight: 500 }}>
                {(suggestion.rationale.population * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{
              height: '6px',
              background: '#eee',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${suggestion.rationale.population * 100}%`,
                background: '#14b8a6',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#666' }}>Proximity Gap</span>
              <span style={{ fontSize: '12px', fontWeight: 500 }}>
                {(suggestion.rationale.proximityGap * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{
              height: '6px',
              background: '#eee',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${suggestion.rationale.proximityGap * 100}%`,
                background: '#a855f7',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#666' }}>Turnover Potential</span>
              <span style={{ fontSize: '12px', fontWeight: 500 }}>
                {(suggestion.rationale.turnoverGap * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{
              height: '6px',
              background: '#eee',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${suggestion.rationale.turnoverGap * 100}%`,
                background: '#f59e0b',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        </div>

        {/* Alternative Intensity Levels */}
        {suggestion.intensityMetadata?.alternativeIntensities && suggestion.intensityMetadata.alternativeIntensities.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1f2937' }}>
              📊 Alternative Intensity Analysis
            </div>
            <div style={{
              padding: '12px',
              background: '#fefce8',
              borderRadius: '6px',
              border: '1px solid #fde047'
            }}>
              <div style={{ fontSize: '12px', color: '#713f12', marginBottom: '8px' }}>
                Would this location be selected at other intensity levels?
              </div>
              {suggestion.intensityMetadata.alternativeIntensities.map((alt, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                  padding: '4px 0'
                }}>
                  <span style={{ fontSize: '12px', color: '#374151' }}>
                    {alt.level} (#{alt.ranking})
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    background: alt.wouldBeSelected ? '#dcfce7' : '#fee2e2',
                    color: alt.wouldBeSelected ? '#166534' : '#991b1b'
                  }}>
                    {alt.wouldBeSelected ? '✅ Selected' : '❌ Not Selected'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Market Assessment */}
        {suggestion.locationContext && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1f2937' }}>
              🏪 Market Assessment
            </div>
            <div style={{
              fontSize: '13px',
              lineHeight: '1.5',
              color: '#374151',
              padding: '12px',
              background: '#f0fdf4',
              borderRadius: '6px',
              border: '1px solid #bbf7d0'
            }}>
              {suggestion.locationContext.marketAssessment}
            </div>
            {suggestion.locationContext.competitiveAdvantages.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '12px', color: '#166534', fontWeight: 500, marginBottom: '4px' }}>
                  ✅ Competitive Advantages:
                </div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#374151' }}>
                  {suggestion.locationContext.competitiveAdvantages.map((advantage, index) => (
                    <li key={index} style={{ marginBottom: '2px' }}>{advantage}</li>
                  ))}
                </ul>
              </div>
            )}
            {suggestion.locationContext.riskFactors.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 500, marginBottom: '4px' }}>
                  ⚠️ Risk Factors:
                </div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#374151' }}>
                  {suggestion.locationContext.riskFactors.map((risk, index) => (
                    <li key={index} style={{ marginBottom: '2px' }}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* AI Placement Scores */}
        {suggestion.placementScore && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1f2937' }}>
              📈 AI Placement Analysis
            </div>
            <div style={{
              fontSize: '13px',
              lineHeight: '1.5',
              color: '#374151',
              padding: '12px',
              background: '#faf5ff',
              borderRadius: '6px',
              border: '1px solid #e9d5ff',
              marginBottom: '8px'
            }}>
              {suggestion.placementScore.viabilityAssessment}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {Object.entries(suggestion.placementScore.numericScores).map(([key, value]) => (
                <div key={key} style={{
                  padding: '8px',
                  background: '#f8fafc',
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                    {(value * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Insights */}
        {suggestion.aiInsights && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1f2937' }}>
              🧠 AI Strategic Insights
            </div>
            <div style={{
              padding: '12px',
              background: '#f0f9ff',
              borderRadius: '6px',
              border: '1px solid #bae6fd'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: 500, marginBottom: '4px' }}>
                  Market Potential:
                </div>
                <div style={{ fontSize: '12px', color: '#374151' }}>
                  {suggestion.aiInsights.marketPotential}
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: 500, marginBottom: '4px' }}>
                  Competitive Position:
                </div>
                <div style={{ fontSize: '12px', color: '#374151' }}>
                  {suggestion.aiInsights.competitivePosition}
                </div>
              </div>
              {suggestion.aiInsights.recommendations.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: 500, marginBottom: '4px' }}>
                    💡 Recommendations:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#374151' }}>
                    {suggestion.aiInsights.recommendations.map((rec, index) => (
                      <li key={index} style={{ marginBottom: '2px' }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Rationale */}
        {suggestion.rationaleText && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🤖 Why this location?</span>
            </div>
            <div style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#374151',
              padding: '12px',
              background: '#f0f9ff',
              borderRadius: '4px',
              borderLeft: '3px solid #0ea5e9'
            }}>
              {suggestion.rationaleText}
            </div>
          </div>
        )}

        {/* Rationale Text (fallback) */}
        {!suggestion.rationaleText && suggestion.rationale?.notes && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1f2937' }}>
              Analysis
            </div>
            <div style={{
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#374151',
              padding: '12px',
              background: '#f9fafb',
              borderRadius: '4px'
            }}>
              {suggestion.rationale.notes}
            </div>
          </div>
        )}

        {/* Status */}
        {suggestion.status && suggestion.status !== 'NEW' && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              Status
            </div>
            <div style={{
              display: 'inline-block',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              background: suggestion.status === 'APPROVED' ? '#d1fae5' :
                         suggestion.status === 'REJECTED' ? '#fee2e2' :
                         suggestion.status === 'HOLD' ? '#fef3c7' : '#e0e7ff',
              color: suggestion.status === 'APPROVED' ? '#065f46' :
                     suggestion.status === 'REJECTED' ? '#991b1b' :
                     suggestion.status === 'HOLD' ? '#92400e' : '#3730a3'
            }}>
              {suggestion.status === 'APPROVED' ? '✅ Approved' :
               suggestion.status === 'REJECTED' ? '❌ Rejected' :
               suggestion.status === 'HOLD' ? '⚠️ Hold' : suggestion.status}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleStatusChange('APPROVED')}
              disabled={suggestion.status === 'APPROVED'}
              style={{
                flex: 1,
                padding: '10px',
                background: suggestion.status === 'APPROVED' ? '#d1fae5' : '#10b981',
                color: suggestion.status === 'APPROVED' ? '#065f46' : 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: suggestion.status === 'APPROVED' ? 'not-allowed' : 'pointer',
                opacity: suggestion.status === 'APPROVED' ? 0.7 : 1
              }}
            >
              ✅ Approve
            </button>
            <button
              onClick={() => handleStatusChange('HOLD')}
              disabled={suggestion.status === 'HOLD'}
              style={{
                flex: 1,
                padding: '10px',
                background: suggestion.status === 'HOLD' ? '#fef3c7' : '#f59e0b',
                color: suggestion.status === 'HOLD' ? '#92400e' : 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: suggestion.status === 'HOLD' ? 'not-allowed' : 'pointer',
                opacity: suggestion.status === 'HOLD' ? 0.7 : 1
              }}
            >
              ⚠️ Hold
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleStatusChange('REJECTED')}
              disabled={suggestion.status === 'REJECTED'}
              style={{
                flex: 1,
                padding: '10px',
                background: suggestion.status === 'REJECTED' ? '#fee2e2' : '#ef4444',
                color: suggestion.status === 'REJECTED' ? '#991b1b' : 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: suggestion.status === 'REJECTED' ? 'not-allowed' : 'pointer',
                opacity: suggestion.status === 'REJECTED' ? 0.7 : 1
              }}
            >
              ❌ Reject
            </button>
            <button
              onClick={() => handleStatusChange('NEW')}
              disabled={suggestion.status === 'NEW'}
              style={{
                flex: 1,
                padding: '10px',
                background: 'white',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: suggestion.status === 'NEW' ? 'not-allowed' : 'pointer',
                opacity: suggestion.status === 'NEW' ? 0.7 : 1
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
