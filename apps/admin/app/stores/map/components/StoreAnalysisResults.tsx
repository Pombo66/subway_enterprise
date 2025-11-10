'use client';

export interface StoreAnalysisResult {
  storeId: string;
  storeName: string;
  locationQualityScore: number;
  locationRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  performanceGap: number;
  performanceGapPercent: number;
  primaryFactor: 'LOCATION' | 'FRANCHISEE' | 'MARKET' | 'BALANCED';
  recommendationPriority: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendations: string[];
  estimatedImpact?: number;
}

export interface StoreAnalysisResultsProps {
  analyses: StoreAnalysisResult[];
  onStoreSelect?: (storeId: string) => void;
  selectedStoreId?: string;
}

export default function StoreAnalysisResults({ 
  analyses, 
  onStoreSelect, 
  selectedStoreId 
}: StoreAnalysisResultsProps) {
  if (analyses.length === 0) {
    return null;
  }

  const getPerformanceColor = (gapPercent: number) => {
    if (gapPercent > 10) return '#10b981'; // Green - overperforming
    if (gapPercent > -10) return '#f59e0b'; // Yellow - on target
    if (gapPercent > -25) return '#f97316'; // Orange - underperforming
    return '#ef4444'; // Red - critical
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return '#ef4444';
      case 'MEDIUM': return '#f59e0b';
      case 'LOW': return '#10b981';
      default: return '#6b7280';
    }
  };

  const criticalStores = analyses.filter(a => a.recommendationPriority === 'HIGH').length;
  const opportunityStores = analyses.filter(a => a.performanceGapPercent < -10).length;

  return (
    <div
      style={{
        background: 'var(--s-panel, white)',
        borderRadius: '8px',
        padding: '16px',
        border: '1px solid var(--s-border, #e5e7eb)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginTop: '16px'
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ 
          margin: '0 0 4px 0', 
          fontSize: '16px', 
          fontWeight: 600,
          color: 'var(--s-text, #1f2937)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📊 Analysis Results
        </h3>
        <div style={{ 
          fontSize: '13px', 
          color: 'var(--s-muted, #6b7280)',
          display: 'flex',
          gap: '16px'
        }}>
          <span>🔴 {criticalStores} Critical</span>
          <span>📈 {opportunityStores} Opportunities</span>
          <span>📍 {analyses.length} Total</span>
        </div>
      </div>

      {/* Results List */}
      <div style={{ 
        maxHeight: '400px', 
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {analyses.map((analysis) => (
          <div
            key={analysis.storeId}
            onClick={() => onStoreSelect?.(analysis.storeId)}
            style={{
              padding: '12px',
              border: `1px solid ${selectedStoreId === analysis.storeId ? '#0070f3' : 'var(--s-border, #e5e7eb)'}`,
              borderRadius: '6px',
              cursor: onStoreSelect ? 'pointer' : 'default',
              background: selectedStoreId === analysis.storeId ? '#f0f9ff' : 'var(--s-panel, white)',
              transition: 'all 0.2s'
            }}
          >
            {/* Store Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '8px'
            }}>
              <div>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  color: 'var(--s-text, #1f2937)'
                }}>
                  {analysis.storeName}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: 'var(--s-muted, #6b7280)'
                }}>
                  Location Quality: {analysis.locationQualityScore}/100
                </div>
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '4px'
              }}>
                <div
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'white',
                    background: getPriorityColor(analysis.recommendationPriority)
                  }}
                >
                  {analysis.recommendationPriority}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: getPerformanceColor(analysis.performanceGapPercent)
                  }}
                >
                  {analysis.performanceGapPercent > 0 ? '+' : ''}{analysis.performanceGapPercent.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Key Insights */}
            <div style={{ 
              fontSize: '11px', 
              color: 'var(--s-muted, #6b7280)',
              marginBottom: '8px'
            }}>
              Primary Factor: <strong>{analysis.primaryFactor}</strong>
            </div>

            {/* Top Recommendation */}
            {analysis.recommendations.length > 0 && (
              <div style={{
                fontSize: '11px',
                color: 'var(--s-text-secondary, #4b5563)',
                background: 'var(--s-panel-alt, #f8fafc)',
                padding: '6px 8px',
                borderRadius: '4px',
                lineHeight: '1.3'
              }}>
                💡 {analysis.recommendations[0]}
              </div>
            )}

            {/* Estimated Impact */}
            {analysis.estimatedImpact && analysis.estimatedImpact > 0 && (
              <div style={{
                fontSize: '10px',
                color: '#10b981',
                marginTop: '4px',
                fontWeight: 500
              }}>
                💰 Potential: +€{Math.round(analysis.estimatedImpact / 1000)}k/year
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div style={{
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid var(--s-border, #e5e7eb)',
        fontSize: '11px',
        color: 'var(--s-muted, #6b7280)',
        textAlign: 'center'
      }}>
        Click on stores to view detailed analysis on the map
      </div>
    </div>
  );
}
