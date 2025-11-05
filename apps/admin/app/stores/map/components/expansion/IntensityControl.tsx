'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Lock, Unlock, RotateCcw } from 'lucide-react';
import { IntensityControlProps } from './types';

// Discrete intensity levels: 0 (Light), 25, 50 (Balanced), 75, 100 (Aggressive)
const INTENSITY_LEVELS = [0, 25, 50, 75, 100];
const INTENSITY_LABELS: Record<number, string> = {
  0: 'Light',
  25: '',
  50: 'Balanced',
  75: '',
  100: 'Aggressive'
};

// Debug log to verify new code is loaded
console.log('🎯 IntensityControl loaded with discrete levels:', INTENSITY_LEVELS);

export const IntensityControl: React.FC<IntensityControlProps> = ({
  intensity,
  capacityEstimate,
  targetSuggestions,
  onIntensityChange,
  onRecompute,
  isLocked,
  onLockToggle
}) => {
  // Snap intensity to nearest discrete level
  const snapToLevel = useCallback((value: number): number => {
    return INTENSITY_LEVELS.reduce((prev, curr) => 
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
  }, []);

  const [localIntensity, setLocalIntensity] = useState(snapToLevel(intensity));
  const [isDragging, setIsDragging] = useState(false);

  // Sync local state with prop changes
  useEffect(() => {
    if (!isDragging) {
      setLocalIntensity(snapToLevel(intensity));
    }
  }, [intensity, isDragging, snapToLevel]);

  // Handle slider change with snapping to discrete levels
  const handleSliderChange = useCallback((value: number) => {
    const snappedValue = snapToLevel(value);
    setLocalIntensity(snappedValue);
    
    // Only trigger change if not locked
    if (!isLocked) {
      onIntensityChange(snappedValue);
    }
  }, [onIntensityChange, isLocked, snapToLevel]);

  // Handle mouse events for dragging state
  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Calculate display values
  const displayIntensity = isLocked ? snapToLevel(intensity) : localIntensity;
  const cappedSuggestions = Math.min(targetSuggestions, 300);
  const isCapped = targetSuggestions > 300;

  return (
    <div style={{ 
      background: 'transparent', 
      padding: '0' 
    }} data-design-guard="off">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Zap className="w-4 h-4 text-orange-600" />
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: '500',
            color: 'var(--s-text)',
            margin: 0
          }}>Expansion Intensity</h3>
        </div>
        
        <button
          onClick={onLockToggle}
          style={{
            width: '32px',
            height: '32px',
            padding: '6px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: isLocked ? '#fef3c7' : '#f3f4f6',
            color: isLocked ? '#d97706' : '#6b7280'
          }}
          title={isLocked ? 'Unlock suggestions (allow recomputation)' : 'Lock suggestions (freeze for demos)'}
        >
          {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </button>
      </div>

      {/* Intensity Slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="relative">
          <input
            type="range"
            min="0"
            max="100"
            step="25"
            value={displayIntensity}
            onChange={(e) => handleSliderChange(parseInt(e.target.value))}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            disabled={isLocked}
            className={`w-full h-2 rounded-lg appearance-none cursor-pointer transition-opacity ${
              isLocked 
                ? 'opacity-50 cursor-not-allowed bg-gray-200' 
                : 'bg-gradient-to-r from-blue-200 via-orange-200 to-red-200 hover:opacity-80'
            }`}
            style={{
              background: isLocked 
                ? '#e5e7eb' 
                : `linear-gradient(to right, 
                    #dbeafe 0%, 
                    #fed7aa ${displayIntensity}%, 
                    #e5e7eb ${displayIntensity}%, 
                    #e5e7eb 100%)`
            }}
          />
          
          {/* Discrete level markers */}
          <div style={{
            position: 'absolute',
            top: '-2px',
            left: '0',
            right: '0',
            height: '10px',
            pointerEvents: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            paddingLeft: '0',
            paddingRight: '0'
          }}>
            {INTENSITY_LEVELS.map((level) => (
              <div
                key={level}
                style={{
                  width: '3px',
                  height: '10px',
                  background: displayIntensity === level 
                    ? (isLocked ? '#d97706' : '#ea580c')
                    : '#9ca3af',
                  borderRadius: '2px',
                  transition: 'all 0.2s ease'
                }}
              />
            ))}
          </div>
          
          {/* Intensity labels */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '12px', 
            color: 'var(--s-muted)', 
            marginTop: '8px',
            fontWeight: '500'
          }}>
            {INTENSITY_LEVELS.map((level) => (
              <span 
                key={level}
                style={{ 
                  color: displayIntensity === level 
                    ? (isLocked ? '#d97706' : '#ea580c')
                    : 'var(--s-muted)',
                  fontWeight: displayIntensity === level ? '600' : '500',
                  transition: 'all 0.2s ease',
                  minWidth: '60px',
                  textAlign: level === 0 ? 'left' : level === 100 ? 'right' : 'center'
                }}
              >
                {INTENSITY_LABELS[level]}
              </span>
            ))}
          </div>
        </div>

        {/* Live readouts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--s-muted)' }}>Capacity estimate in scope:</span>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '500', 
              color: 'var(--s-text)' 
            }}>
              {(capacityEstimate || 0).toLocaleString()} sites
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--s-muted)' }}>Selected intensity {displayIntensity}% →</span>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '500', 
              color: 'var(--s-text)' 
            }}>
              Target = {cappedSuggestions.toLocaleString()} suggestions
              {isCapped && (
                <span style={{ color: '#ea580c', marginLeft: '4px' }}>(capped at 300 visible)</span>
              )}
            </span>
          </div>
        </div>

        {/* Lock status indicator */}
        {isLocked && (
          <div style={{ 
            padding: '8px', 
            background: 'var(--s-background)', 
            border: '1px solid var(--s-border)', 
            borderRadius: '6px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock className="w-4 h-4 text-amber-600" />
              <span style={{ 
                fontSize: '12px', 
                color: '#d97706' 
              }}>
                Suggestions locked for demo consistency
              </span>
            </div>
          </div>
        )}

        {/* Recompute button */}
        <button
          onClick={onRecompute}
          disabled={isLocked}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isLocked
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          {isLocked ? 'Recompute (Locked)' : 'Recompute'}
        </button>

        {/* Intensity guide */}
        <div style={{ 
          fontSize: '12px', 
          color: 'var(--s-muted)', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Light (0-25%)</span>
            <span>High-confidence sites only</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Balanced (50%)</span>
            <span>Mix of safe and growth opportunities</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Aggressive (75-100%)</span>
            <span>Maximum expansion potential</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntensityControl;