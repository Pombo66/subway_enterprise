'use client';

import { useState } from 'react';

export interface StrategicAnalysisPanelProps {
  analysis: {
    marketGaps: string;
    recommendations: string;
  };
  onClose: () => void;
}

export default function StrategicAnalysisPanel({ analysis, onClose }: StrategicAnalysisPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        width: '500px',
        maxHeight: '600px',
        background: 'var(--s-panel, white)',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        border: '1px solid var(--s-border, #e5e7eb)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--s-border, #e5e7eb)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>📊</span>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            Strategic Analysis
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '14px'
            }}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '−' : '+'}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '14px'
            }}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div
          style={{
            padding: '16px',
            overflowY: 'auto',
            flex: 1,
            background: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
            color: '#ffffff'
          }}
        >
          {/* Market Gaps */}
          <div style={{ marginBottom: '20px' }}>
            <h4
              style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                fontWeight: 600,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span style={{ fontSize: '16px' }}>🎯</span>
              Market Gaps Identified
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                lineHeight: '1.6',
                color: '#ffffff',
                whiteSpace: 'pre-wrap'
              }}
            >
              {analysis.marketGaps}
            </p>
          </div>

          {/* Recommendations */}
          <div>
            <h4
              style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                fontWeight: 600,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span style={{ fontSize: '16px' }}>💡</span>
              Strategic Recommendations
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                lineHeight: '1.6',
                color: '#ffffff',
                whiteSpace: 'pre-wrap'
              }}
            >
              {analysis.recommendations}
            </p>
          </div>

          {/* Footer Note */}
          <div
            style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.7)',
              fontStyle: 'italic'
            }}
          >
            AI-generated strategic analysis based on existing store network and market conditions
          </div>
        </div>
      )}
    </div>
  );
}
