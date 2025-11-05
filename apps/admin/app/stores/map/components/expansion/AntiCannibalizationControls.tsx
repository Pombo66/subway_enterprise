'use client';

import React, { useState, useCallback } from 'react';
import { Shield, Building } from 'lucide-react';

interface AntiCannibalizationControlsProps {
  minDistance: number; // km
  maxPerCity?: number;
  onMinDistanceChange: (distance: number) => void;
  onMaxPerCityChange: (max: number | undefined) => void;
  className?: string;
}

export const AntiCannibalizationControls: React.FC<AntiCannibalizationControlsProps> = ({
  minDistance,
  maxPerCity,
  onMinDistanceChange,
  onMaxPerCityChange,
  className = ''
}) => {
  const [localMinDistance, setLocalMinDistance] = useState(minDistance);
  const [localMaxPerCity, setLocalMaxPerCity] = useState(maxPerCity || '');
  const [maxPerCityEnabled, setMaxPerCityEnabled] = useState(!!maxPerCity);

  // Handle min distance change with validation
  const handleMinDistanceChange = useCallback((value: number) => {
    const clampedValue = Math.max(0, Math.min(50, value)); // 0-50km range
    setLocalMinDistance(clampedValue);
    onMinDistanceChange(clampedValue);
  }, [onMinDistanceChange]);

  // Handle max per city change
  const handleMaxPerCityChange = useCallback((value: string) => {
    setLocalMaxPerCity(value);

    if (value === '' || !maxPerCityEnabled) {
      onMaxPerCityChange(undefined);
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue > 0) {
        onMaxPerCityChange(Math.min(100, numValue)); // Cap at 100
      }
    }
  }, [maxPerCityEnabled, onMaxPerCityChange]);

  // Toggle max per city control
  const handleMaxPerCityToggle = useCallback((enabled: boolean) => {
    setMaxPerCityEnabled(enabled);
    if (!enabled) {
      setLocalMaxPerCity('');
      onMaxPerCityChange(undefined);
    } else if (localMaxPerCity) {
      const numValue = parseInt(localMaxPerCity.toString(), 10);
      if (!isNaN(numValue) && numValue > 0) {
        onMaxPerCityChange(numValue);
      }
    }
  }, [localMaxPerCity, onMaxPerCityChange]);

  return (
    <div className={className} style={{
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
          <Shield className="w-4 h-4 text-green-600" />
          <h3 style={{
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--s-text)',
            margin: 0
          }}>Anti-Cannibalization Controls</h3>
        </div>

        {/* Invisible spacer to match IntensityControl lock button exactly */}
        <div style={{
          width: '32px',
          height: '32px',
          padding: '6px',
          borderRadius: '6px'
        }}></div>
      </div>

      {/* Minimum Distance Control - positioned to align with IntensityControl slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="relative">
          <input
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={localMinDistance}
            onChange={(e) => handleMinDistanceChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 rounded-lg appearance-none cursor-pointer"
          />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: 'var(--s-muted)',
            marginTop: '4px'
          }}>
            <span>0 km</span>
            <span style={{
              fontWeight: '500',
              color: 'var(--s-text)'
            }}>
              {localMinDistance.toFixed(1)} km
            </span>
            <span>20 km</span>
          </div>
        </div>

        <p style={{
          fontSize: '12px',
          color: 'var(--s-muted)',
          margin: 0
        }}>
          Minimum distance from existing Subway stores to avoid cannibalization
        </p>
      </div>

      <div className="space-y-4 mt-6">

        {/* Max Per City Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label style={{
              fontSize: '14px',
              color: 'var(--s-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Building className="w-3 h-3" />
              Max Per City
            </label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={maxPerCityEnabled}
                onChange={(e) => handleMaxPerCityToggle(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: 'var(--s-primary)'
                }}
              />
              <span style={{ fontSize: '12px', color: 'var(--s-muted)' }}>Enable</span>
            </div>
          </div>

          {maxPerCityEnabled && (
            <div className="space-y-2">
              <input
                type="number"
                min="1"
                max="100"
                value={localMaxPerCity}
                onChange={(e) => handleMaxPerCityChange(e.target.value)}
                placeholder="e.g., 5"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '14px',
                  background: 'var(--s-background)',
                  color: 'var(--s-text)',
                  border: '1px solid var(--s-border)',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
              <p style={{
                fontSize: '12px',
                color: 'var(--s-muted)',
                margin: 0
              }}>
                Maximum number of suggestions per city (optional)
              </p>
            </div>
          )}

          {!maxPerCityEnabled && (
            <p style={{
              fontSize: '12px',
              color: 'var(--s-muted)',
              fontStyle: 'italic',
              margin: 0
            }}>
              No city-level limit (suggestions distributed by score)
            </p>
          )}
        </div>

        {/* Impact Summary */}
        <div style={{
          padding: '12px',
          background: 'var(--s-background)',
          border: '1px solid var(--s-border)',
          borderRadius: '6px'
        }}>
          <h4 style={{
            fontSize: '12px',
            fontWeight: '500',
            color: 'var(--s-text)',
            marginBottom: '4px',
            margin: '0 0 4px 0'
          }}>Impact Summary</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--s-muted)' }}>Min distance filter:</span>
              <span style={{
                fontSize: '12px',
                fontWeight: '500',
                color: 'var(--s-text)'
              }}>
                {localMinDistance === 0 ? 'Disabled' : `≥${localMinDistance}km from existing stores`}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--s-muted)' }}>City limit:</span>
              <span style={{
                fontSize: '12px',
                fontWeight: '500',
                color: 'var(--s-text)'
              }}>
                {maxPerCityEnabled && localMaxPerCity
                  ? `Max ${localMaxPerCity} per city`
                  : 'No limit'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Presets */}
        <div className="space-y-2">
          <h4 style={{
            fontSize: '12px',
            fontWeight: '500',
            color: 'var(--s-text)',
            margin: 0
          }}>Quick Presets</h4>
          <div className="flex gap-2">
            <button
              onClick={() => {
                handleMinDistanceChange(1.5);
                handleMaxPerCityToggle(false);
              }}
              className="flex-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              Aggressive (1.5km)
            </button>
            <button
              onClick={() => {
                handleMinDistanceChange(3.0);
                handleMaxPerCityToggle(false);
              }}
              className="flex-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
            >
              Balanced (3km)
            </button>
            <button
              onClick={() => {
                handleMinDistanceChange(5.0);
                setMaxPerCityEnabled(true);
                setLocalMaxPerCity('3');
                onMaxPerCityChange(3);
              }}
              className="flex-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
            >
              Conservative (5km, max 3/city)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AntiCannibalizationControls;