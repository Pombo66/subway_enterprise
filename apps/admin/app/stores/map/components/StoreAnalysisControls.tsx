'use client';

import { useState } from 'react';

export interface StoreAnalysisParams {
  region?: string;
  storeIds?: string[];
  model?: 'gpt-5.1' | 'gpt-5-mini';
  analysisType?: 'performance' | 'location' | 'comprehensive';
}

export interface StoreAnalysisControlsProps {
  onAnalyze: (params: StoreAnalysisParams) => Promise<void>;
  loading: boolean;
  selectedStoreIds?: string[];
  currentRegion?: string;
}

export default function StoreAnalysisControls({
  onAnalyze,
  loading,
  selectedStoreIds = [],
  currentRegion = 'Germany'
}: StoreAnalysisControlsProps) {
  const model = 'gpt-5.1'; // Always use GPT-5.1 (premium model)
  const [analysisType, setAnalysisType] = useState<'performance' | 'location' | 'comprehensive'>('performance');
  const [analysisScope, setAnalysisScope] = useState<'region' | 'selected'>('region');

  const handleAnalyze = async () => {
    const params: StoreAnalysisParams = {
      model,
      analysisType
    };

    if (analysisScope === 'selected' && selectedStoreIds.length > 0) {
      params.storeIds = selectedStoreIds;
    } else {
      params.region = currentRegion;
    }

    await onAnalyze(params);
  };

  const canAnalyzeSelected = selectedStoreIds.length > 0;
  const storeCount = analysisScope === 'selected' ? selectedStoreIds.length : 'All';

  return (
    <div
      style={{
        background: 'var(--s-panel, white)',
        borderRadius: '8px',
        padding: '16px',
        border: '1px solid var(--s-border, #e5e7eb)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
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
          🔍 Store Performance Analysis
        </h3>
        <p style={{ 
          margin: 0, 
          fontSize: '13px', 
          color: 'var(--s-muted, #6b7280)',
          lineHeight: '1.4'
        }}>
          AI-powered analysis of store locations and performance
        </p>
      </div>

      {/* Analysis Scope */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
          📍 Analysis Scope
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setAnalysisScope('region')}
            disabled={loading}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: analysisScope === 'region' ? '#0070f3' : 'transparent',
              color: analysisScope === 'region' ? 'white' : 'var(--s-text, #374151)',
              border: analysisScope === 'region' ? 'none' : '1px solid var(--s-border, #d1d5db)',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            Entire {currentRegion}
          </button>
          <button
            onClick={() => setAnalysisScope('selected')}
            disabled={loading || !canAnalyzeSelected}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: analysisScope === 'selected' ? '#0070f3' : 'transparent',
              color: analysisScope === 'selected' ? 'white' : canAnalyzeSelected ? 'var(--s-text, #374151)' : 'var(--s-muted, #9ca3af)',
              border: analysisScope === 'selected' ? 'none' : '1px solid var(--s-border, #d1d5db)',
              borderRadius: '4px',
              cursor: loading || !canAnalyzeSelected ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.2s',
              opacity: canAnalyzeSelected ? 1 : 0.6
            }}
          >
            Selected ({selectedStoreIds.length})
          </button>
        </div>
        {analysisScope === 'selected' && !canAnalyzeSelected && (
          <div style={{ 
            marginTop: '4px', 
            fontSize: '11px', 
            color: 'var(--s-muted, #9ca3af)' 
          }}>
            Select stores on the map to analyze specific locations
          </div>
        )}
      </div>

      {/* AI Powered Badge */}
      <div style={{ 
        marginBottom: '16px',
        padding: '8px 12px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}>
        <div style={{ 
          fontSize: '13px', 
          fontWeight: 600,
          color: 'white',
          letterSpacing: '0.3px'
        }}>
          AI Powered
        </div>
      </div>

      {/* Analysis Type */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
          📊 Analysis Type
        </label>
        <select
          value={analysisType}
          onChange={(e) => setAnalysisType(e.target.value as any)}
          disabled={loading}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid var(--s-border, #d1d5db)',
            color: 'var(--s-text, #1f2937)',
            fontSize: '13px',
            background: 'var(--s-panel, white)'
          }}
        >
          <option value="performance">Performance Analysis (Location + Franchisee)</option>
          <option value="location">Location Quality Only</option>
          <option value="comprehensive">Comprehensive (All Factors)</option>
        </select>
      </div>

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={loading || (analysisScope === 'selected' && !canAnalyzeSelected)}
        style={{
          width: '100%',
          padding: '12px',
          background: loading ? '#9ca3af' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        {loading ? (
          <>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTop: '2px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            Analyzing {storeCount} stores...
          </>
        ) : (
          <>
            🔍 Analyze {storeCount} stores
          </>
        )}
      </button>

      {/* Info */}
      <div style={{
        marginTop: '12px',
        padding: '8px 12px',
        background: 'var(--s-panel-alt, #f8fafc)',
        borderRadius: '4px',
        fontSize: '11px',
        color: 'var(--s-muted, #6b7280)',
        lineHeight: '1.4'
      }}>
        💡 Analysis evaluates location quality, performance gaps, and provides actionable recommendations for improvement.
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
