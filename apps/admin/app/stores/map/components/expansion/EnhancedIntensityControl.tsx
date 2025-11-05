'use client';

import { useState, useEffect } from 'react';

export interface IntensityLevel {
  name: string;
  value: number;
  targetStores: number;
  description: string;
  color: string;
}

export interface MarketPotentialData {
  totalAnalyzed: number;
  highPotentialCount: number;
  selectedCount: number;
  alternativeIntensities: Array<{
    name: string;
    targetCount: number;
    wouldSelectCount: number;
    description: string;
  }>;
}

export interface EnhancedIntensityControlProps {
  currentIntensity: number;
  onIntensityChange: (intensity: number) => void;
  marketPotentialData?: MarketPotentialData;
  loading?: boolean;
  disabled?: boolean;
}

const INTENSITY_LEVELS: IntensityLevel[] = [
  {
    name: 'Light',
    value: 20,
    targetStores: 50,
    description: 'Conservative expansion with highest-confidence locations only',
    color: '#10b981'
  },
  {
    name: 'Moderate',
    value: 40,
    targetStores: 100,
    description: 'Balanced approach with good market coverage',
    color: '#3b82f6'
  },
  {
    name: 'Medium',
    value: 60,
    targetStores: 150,
    description: 'Standard expansion with strategic market positioning',
    color: '#8b5cf6'
  },
  {
    name: 'High',
    value: 80,
    targetStores: 200,
    description: 'Aggressive growth with comprehensive market coverage',
    color: '#f59e0b'
  },
  {
    name: 'Aggressive',
    value: 100,
    targetStores: 300,
    description: 'Maximum expansion with full market penetration',
    color: '#ef4444'
  }
];

export default function EnhancedIntensityControl({
  currentIntensity,
  onIntensityChange,
  marketPotentialData,
  loading = false,
  disabled = false
}: EnhancedIntensityControlProps) {
  const [selectedLevel, setSelectedLevel] = useState<IntensityLevel | null>(null);
  const [showMarketAnalysis, setShowMarketAnalysis] = useState(false);

  // Find the current intensity level
  useEffect(() => {
    const level = INTENSITY_LEVELS.find(l => 
      Math.abs(l.value - currentIntensity) <= 10
    ) || INTENSITY_LEVELS.find(l => l.value >= currentIntensity) || INTENSITY_LEVELS[2];
    setSelectedLevel(level);
  }, [currentIntensity]);

  const handleLevelSelect = (level: IntensityLevel) => {
    setSelectedLevel(level);
    onIntensityChange(level.value);
  };

  const MarketPotentialVisualization = () => {
    if (!marketPotentialData) return null;

    const { totalAnalyzed, highPotentialCount, selectedCount, alternativeIntensities } = marketPotentialData;
    const selectionRate = totalAnalyzed > 0 ? (selectedCount / totalAnalyzed) * 100 : 0;
    const highPotentialRate = totalAnalyzed > 0 ? (highPotentialCount / totalAnalyzed) * 100 : 0;

    return (
      <div style={{
        marginTop: '16px',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
            🧠 AI Market Analysis
          </h4>
          <button
            onClick={() => setShowMarketAnalysis(!showMarketAnalysis)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '12px',
              color: '#0369a1',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {showMarketAnalysis ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {/* Market Overview */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Market Locations Analyzed</span>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{totalAnalyzed.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>High Potential Locations</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>
              {highPotentialCount.toLocaleString()} ({highPotentialRate.toFixed(1)}%)
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Selected at Current Intensity</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#0369a1' }}>
              {selectedCount.toLocaleString()} ({selectionRate.toFixed(1)}%)
            </span>
          </div>

          {/* Selection Progress Bar */}
          <div style={{
            height: '8px',
            background: '#e2e8f0',
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(highPotentialRate, 100)}%`,
              background: '#10b981',
              position: 'absolute',
              left: 0
            }} />
            <div style={{
              height: '100%',
              width: `${Math.min(selectionRate, 100)}%`,
              background: '#0369a1',
              position: 'absolute',
              left: 0
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#64748b' }}>
            <span>🟢 High Potential</span>
            <span>🔵 Selected</span>
          </div>
        </div>

        {/* Alternative Intensity Analysis */}
        {showMarketAnalysis && alternativeIntensities.length > 0 && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#1e293b' }}>
              Alternative Intensity Scenarios:
            </div>
            {alternativeIntensities.map((alt, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                background: alt.name === selectedLevel?.name ? '#dbeafe' : 'white',
                borderRadius: '4px',
                marginBottom: '4px',
                border: alt.name === selectedLevel?.name ? '1px solid #3b82f6' : '1px solid #e5e7eb'
              }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#1e293b' }}>
                    {alt.name} ({alt.targetCount} stores)
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {alt.description}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0369a1' }}>
                    {alt.wouldSelectCount}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    locations
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <label style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
          🎯 AI Expansion Intensity
        </label>
        {selectedLevel && (
          <div style={{
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 500,
            background: selectedLevel.color + '20',
            color: selectedLevel.color,
            border: `1px solid ${selectedLevel.color}40`
          }}>
            {selectedLevel.name} ({selectedLevel.targetStores} stores)
          </div>
        )}
      </div>

      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
        AI-powered intensity scaling automatically selects the optimal number of locations based on market potential analysis.
      </div>

      {/* Intensity Level Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '16px' }}>
        {INTENSITY_LEVELS.map((level) => (
          <button
            key={level.name}
            onClick={() => handleLevelSelect(level)}
            disabled={disabled || loading}
            style={{
              padding: '12px 8px',
              borderRadius: '6px',
              border: selectedLevel?.name === level.name ? `2px solid ${level.color}` : '1px solid #e5e7eb',
              background: selectedLevel?.name === level.name ? level.color + '10' : 'white',
              cursor: disabled || loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: disabled || loading ? 0.6 : 1
            }}
          >
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: level.color,
              margin: '0 auto 6px',
              opacity: selectedLevel?.name === level.name ? 1 : 0.6
            }} />
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: selectedLevel?.name === level.name ? level.color : '#64748b',
              marginBottom: '2px'
            }}>
              {level.name}
            </div>
            <div style={{
              fontSize: '10px',
              color: '#64748b'
            }}>
              {level.targetStores}
            </div>
          </button>
        ))}
      </div>

      {/* Selected Level Description */}
      {selectedLevel && (
        <div style={{
          padding: '12px',
          background: selectedLevel.color + '08',
          borderRadius: '6px',
          border: `1px solid ${selectedLevel.color}20`,
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.4' }}>
            <strong>{selectedLevel.name} Intensity:</strong> {selectedLevel.description}
          </div>
        </div>
      )}

      {/* Traditional Slider (for fine-tuning) */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Fine-tune intensity:</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{currentIntensity}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={currentIntensity}
          onChange={(e) => onIntensityChange(parseInt(e.target.value))}
          disabled={disabled || loading}
          style={{
            width: '100%',
            opacity: disabled || loading ? 0.6 : 1
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
          <span>Conservative</span>
          <span>Balanced</span>
          <span>Aggressive</span>
        </div>
      </div>

      {/* Market Potential Visualization */}
      <MarketPotentialVisualization />

      {loading && (
        <div style={{
          marginTop: '12px',
          padding: '8px',
          background: '#f0f9ff',
          borderRadius: '4px',
          border: '1px solid #bae6fd',
          fontSize: '12px',
          color: '#0369a1',
          textAlign: 'center'
        }}>
          🤖 AI analyzing market potential...
        </div>
      )}
    </div>
  );
}