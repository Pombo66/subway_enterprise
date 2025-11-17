'use client';

import { useState, useEffect, useMemo } from 'react';

export interface ExpansionParams {
  region: {
    country?: string;
    state?: string;
  };
  aggression: number;
  populationBias?: number;
  proximityBias?: number;
  turnoverBias?: number;
  minDistanceM?: number;
  seed: number;
  model?: 'gpt-5.1' | 'gpt-5-mini'; // Model selection (always gpt-5.1 in UI)
}

export interface ExpansionControlsProps {
  onGenerate: (params: ExpansionParams) => Promise<void>;
  onSaveScenario: (label: string, params: ExpansionParams) => Promise<void>;
  onLoadScenario: (scenarioId: string) => Promise<void>;
  onExpandScenario?: (targetCount: number) => Promise<void>;
  loading: boolean;
  scenarios: Array<{
    id: string;
    label: string;
    createdAt: Date;
  }>;
  currentScenario?: {
    id: string;
    label: string;
    seed: number;
    suggestionCount: number;
    statusCounts?: {
      approved: number;
      pending: number;
      rejected: number;
      hold: number;
    };
  } | null;
}

export default function ExpansionControls({
  onGenerate,
  onSaveScenario,
  onLoadScenario,
  onExpandScenario,
  loading,
  scenarios,
  currentScenario
}: ExpansionControlsProps) {
  console.log('🎯 ExpansionControls loaded with discrete intensity levels (0, 25, 50, 75, 100)');
  
  const [country, setCountry] = useState('Germany');
  const [aggression, setAggression] = useState(50); // Changed default to 50 (Balanced)
  const model = 'gpt-5.1'; // Always use GPT-5.1 (premium model)
  // Use proven defaults - no need to expose these to users
  const populationBias = 0.5;
  const proximityBias = 0.3;
  const turnoverBias = 0.2;
  const minDistance = 800;
  const [seed] = useState(Date.now());
  const [errors, setErrors] = useState<string[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [scenarioLabel, setScenarioLabel] = useState('');
  const [targetCount, setTargetCount] = useState(10);

  // Simplified validation - only check what users can control
  useEffect(() => {
    const newErrors: string[] = [];
    // No validation needed for hardcoded defaults
    setErrors(newErrors);
  }, []);

  const handleGenerate = async () => {
    if (errors.length > 0) return;

    const params: ExpansionParams = {
      region: { country },
      aggression,
      populationBias,
      proximityBias,
      turnoverBias,
      minDistanceM: minDistance,
      seed,
      model
    };

    await onGenerate(params);
  };

  const handleSave = async () => {
    if (!scenarioLabel.trim()) return;

    const params: ExpansionParams = {
      region: { country },
      aggression,
      seed
    };

    await onSaveScenario(scenarioLabel, params);
    setShowSaveDialog(false);
    setScenarioLabel('');
  };

  // Market drivers now use proven defaults (Pop: 50%, Proximity: 30%, Sales: 20%)

  return (
    <div className="expansion-controls" style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      width: '320px',
      background: 'var(--s-panel, white)',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      border: '1px solid var(--s-border, #e5e7eb)',
      padding: '20px',
      zIndex: 1000,
      maxHeight: 'calc(100% - 32px)',
      overflowY: 'auto'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
        Expansion Controls
      </h3>

      {/* Region Selector */}
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="region-select" style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
          📍 Region
        </label>
        <select
          id="region-select"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          disabled={loading}
          aria-label="Select region for expansion analysis"
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            color: '#1f2937',
            fontSize: '14px'
          }}
        >
          <option value="Germany">Germany</option>
          <option value="Belgium">Belgium</option>
          <option value="France">France</option>
          <option value="Netherlands">Netherlands</option>
        </select>
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

      {/* Expansion Intensity */}
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="expansion-intensity" style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
          🎯 Expansion Intensity
        </label>
        <div style={{ fontSize: '13px', color: 'var(--s-muted, #666)', marginBottom: '8px' }}>
          How bold should the expansion model be?
        </div>
        <div style={{ position: 'relative' }}>
          {/* Tick marks - positioned behind the slider */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '0',
            right: '0',
            height: '0',
            display: 'flex',
            justifyContent: 'space-between',
            pointerEvents: 'none',
            transform: 'translateY(-50%)',
            padding: '0 8px',
            zIndex: 0
          }}>
            {[0, 25, 50, 75, 100].map((value) => (
              <div
                key={value}
                style={{
                  width: '2px',
                  height: '4px',
                  backgroundColor: 'white',
                  boxShadow: '0 0 2px rgba(0,0,0,0.3)',
                  borderRadius: '1px',
                  transform: 'translateY(2px)'
                }}
              />
            ))}
          </div>
          <input
            id="expansion-intensity"
            type="range"
            min="0"
            max="100"
            step="25"
            value={aggression}
            onChange={(e) => setAggression(parseInt(e.target.value))}
            disabled={loading}
            aria-label="Expansion intensity from light to aggressive"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={aggression}
            style={{ width: '100%', position: 'relative', zIndex: 1 }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginTop: '4px' }}>
          <span>Light</span>
          <span>Balanced</span>
          <span>Aggressive</span>
        </div>
      </div>

      {/* Market drivers and spacing use proven defaults - no UI needed */}

      {/* Errors */}
      {errors.length > 0 && (
        <div 
          role="alert"
          aria-live="polite"
          style={{
            marginBottom: '16px',
            padding: '8px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#c00'
          }}
        >
          {errors.map((error, i) => (
            <div key={i}>{error}</div>
          ))}
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={loading || errors.length > 0}
        style={{
          width: '100%',
          padding: '12px',
          background: errors.length > 0 || loading ? '#ccc' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: errors.length > 0 || loading ? 'not-allowed' : 'pointer',
          marginBottom: '8px'
        }}
      >
        {loading ? 'Generating...' : 'Generate Expansion Plan'}
      </button>

      {/* Save Scenario Button */}
      <button
        onClick={() => setShowSaveDialog(true)}
        disabled={loading}
        style={{
          width: '100%',
          padding: '10px',
          background: 'white',
          color: '#0070f3',
          border: '1px solid #0070f3',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '8px'
        }}
      >
        Save Scenario
      </button>

      {/* Scenario Controls */}
      {currentScenario && (
        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid var(--s-border, #e5e7eb)'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
            📊 Scenario Controls
          </div>

          {/* Current Scenario Info */}
          <div style={{
            marginBottom: '12px',
            padding: '8px',
            background: 'var(--s-panel-alt, #f9fafb)',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{currentScenario.label}</div>
            <div style={{ color: 'var(--s-muted, #666)' }}>Seed: {currentScenario.seed}</div>
            <div style={{ color: 'var(--s-muted, #666)' }}>Suggestions: {currentScenario.suggestionCount}</div>
            {currentScenario.statusCounts && (
              <div style={{ marginTop: '4px', display: 'flex', gap: '8px', fontSize: '11px' }}>
                <span>✅ {currentScenario.statusCounts.approved}</span>
                <span>⚠️ {currentScenario.statusCounts.hold}</span>
                <span>❌ {currentScenario.statusCounts.rejected}</span>
              </div>
            )}
          </div>

          {/* Target Count Selector */}
          <div style={{ marginBottom: '8px' }}>
            <label htmlFor="target-count" style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
              Target Count:
            </label>
            <select
              id="target-count"
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value))}
              disabled={loading}
              style={{
                width: '100%',
                padding: '6px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontSize: '13px'
              }}
            >
              <option value={10}>10 sites</option>
              <option value={30}>30 sites</option>
              <option value={50}>50 sites</option>
              <option value={100}>100 sites</option>
              <option value={200}>200 sites</option>
            </select>
          </div>

          {/* Expand Model Button */}
          {onExpandScenario && (
            <button
              onClick={() => onExpandScenario(targetCount)}
              disabled={loading || currentScenario.suggestionCount >= 200}
              style={{
                width: '100%',
                padding: '10px',
                background: currentScenario.suggestionCount >= 200 ? '#ccc' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: currentScenario.suggestionCount >= 200 || loading ? 'not-allowed' : 'pointer',
                marginBottom: '8px'
              }}
            >
              {currentScenario.suggestionCount >= 200 ? 'Max Suggestions Reached' : 'Expand Model'}
            </button>
          )}
        </div>
      )}

      {/* Load Scenario */}
      {scenarios.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
            Load Scenario
          </label>
          <select
            onChange={(e) => e.target.value && onLoadScenario(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
          >
            <option value="">Select a scenario...</option>
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Expansion Legend */}
      <div style={{
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid var(--s-border, #e5e7eb)'
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          Expansion Legend
          <div
            title="All expansion points are generated by Subway AI. Colour intensity reflects confidence and data completeness."
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#0070f3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
              color: 'white',
              cursor: 'help'
            }}
          >
            ?
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* High Confidence Suggestion */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: '#8b5cf6',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                flexShrink: 0
              }} />
              {/* Centered Yellow Dot */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '6px',
                height: '6px',
                background: '#f59e0b',
                border: '1px solid white',
                borderRadius: '50%',
                boxShadow: '0 0 4px rgba(245, 158, 11, 0.6)'
              }} />
            </div>
            <span style={{ 
              fontSize: '13px',
              lineHeight: '1.3',
              fontWeight: 500
            }}>
              High confidence (&gt;75%)
            </span>
          </div>

          {/* Standard Suggestion */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#8b5cf6',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              flexShrink: 0
            }} />
            <span style={{ 
              fontSize: '13px',
              lineHeight: '1.3',
              fontWeight: 500
            }}>
              Standard confidence (≤75%)
            </span>
          </div>
        </div>

        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid var(--s-border, #e5e7eb)',
          fontSize: '11px',
          color: 'var(--s-muted, #666)',
          lineHeight: '1.5'
        }}>
          All expansion suggestions are AI-generated based on population density, proximity to existing stores, and sales potential.
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--s-panel, white)',
            padding: '24px',
            borderRadius: '12px',
            width: '400px',
            maxWidth: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid var(--s-border, #e5e7eb)'
          }}>
            <h4 style={{ 
              margin: '0 0 8px 0',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--s-text, #1f2937)'
            }}>
              Save Scenario
            </h4>
            <p style={{
              margin: '0 0 16px 0',
              fontSize: '13px',
              color: 'var(--s-muted, #6b7280)',
              lineHeight: '1.5'
            }}>
              Save your expansion suggestions to review or share later
            </p>
            <input
              type="text"
              placeholder="Enter scenario name (e.g., 'Q4 2025 Expansion')..."
              value={scenarioLabel}
              onChange={(e) => setScenarioLabel(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--s-border, #d1d5db)',
                marginBottom: '20px',
                fontSize: '14px',
                color: 'var(--s-text, #1f2937)',
                background: 'var(--s-panel, white)',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#0070f3'}
              onBlur={(e) => e.target.style.borderColor = 'var(--s-border, #d1d5db)'}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setScenarioLabel('');
                }}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid var(--s-border, #d1d5db)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--s-text, #374151)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--s-panel-alt, #f9fafb)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!scenarioLabel.trim()}
                style={{
                  padding: '10px 20px',
                  background: scenarioLabel.trim() ? '#0070f3' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: scenarioLabel.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  opacity: scenarioLabel.trim() ? 1 : 0.6
                }}
                onMouseEnter={(e) => {
                  if (scenarioLabel.trim()) {
                    e.currentTarget.style.background = '#0051cc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (scenarioLabel.trim()) {
                    e.currentTarget.style.background = '#0070f3';
                  }
                }}
              >
                Save Scenario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
