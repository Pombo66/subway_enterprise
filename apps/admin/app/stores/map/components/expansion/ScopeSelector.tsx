'use client';

import React, { useState } from 'react';
import { Globe, MapPin, Square, X } from 'lucide-react';
import { ScopeSelectorProps } from './types';

// Country and state data
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'SG', name: 'Singapore' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'HK', name: 'Hong Kong' }
];

const US_STATES = [
  { code: 'CA', name: 'California' },
  { code: 'NY', name: 'New York' },
  { code: 'TX', name: 'Texas' },
  { code: 'FL', name: 'Florida' },
  { code: 'IL', name: 'Illinois' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'OH', name: 'Ohio' },
  { code: 'GA', name: 'Georgia' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'MI', name: 'Michigan' }
];

export const ScopeSelector: React.FC<ScopeSelectorProps> = ({
  selectedScope,
  onScopeChange,
  onCustomAreaDraw,
  onCustomAreaClear
}) => {
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  const handleScopeTypeChange = (type: 'country' | 'state' | 'custom_area') => {
    if (type === 'custom_area') {
      setIsDrawingMode(true);
      onScopeChange({
        type: 'custom_area',
        value: 'custom',
        polygon: undefined,
        area: undefined
      });
    } else {
      setIsDrawingMode(false);
      onScopeChange({
        type,
        value: '',
        polygon: undefined,
        area: undefined
      });
    }
  };

  const handleValueChange = (value: string) => {
    onScopeChange({
      ...selectedScope,
      value
    });
  };

  const handleCustomAreaClear = () => {
    setIsDrawingMode(false);
    onCustomAreaClear();
    onScopeChange({
      type: 'country',
      value: '',
      polygon: undefined,
      area: undefined
    });
  };

  const formatArea = (area: number): string => {
    if (area >= 1000000) {
      return `${(area / 1000000).toFixed(1)}M km²`;
    } else if (area >= 1000) {
      return `${(area / 1000).toFixed(0)}K km²`;
    } else {
      return `${area.toFixed(0)} km²`;
    }
  };

  return (
    <div style={{ 
      background: 'transparent', 
      padding: '0' 
    }} data-design-guard="off">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-medium text-gray-900">Scope Selection</h3>
      </div>

      {/* Scope Type Selector */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => handleScopeTypeChange('country')}
            className={`flex-1 px-3 py-2 text-xs rounded-md border transition-colors ${
              selectedScope.type === 'country'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Globe className="w-3 h-3 inline mr-1" />
            Country
          </button>
          <button
            onClick={() => handleScopeTypeChange('state')}
            className={`flex-1 px-3 py-2 text-xs rounded-md border transition-colors ${
              selectedScope.type === 'state'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <MapPin className="w-3 h-3 inline mr-1" />
            US State
          </button>
          <button
            onClick={() => handleScopeTypeChange('custom_area')}
            className={`flex-1 px-3 py-2 text-xs rounded-md border transition-colors ${
              selectedScope.type === 'custom_area'
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Square className="w-3 h-3 inline mr-1" />
            Custom Area
          </button>
        </div>

        {/* Country Dropdown */}
        {selectedScope.type === 'country' && (
          <select
            value={selectedScope.value}
            onChange={(e) => handleValueChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a country...</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        )}

        {/* US State Dropdown */}
        {selectedScope.type === 'state' && (
          <select
            value={selectedScope.value}
            onChange={(e) => handleValueChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a US state...</option>
            {US_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        )}

        {/* Custom Area Controls */}
        {selectedScope.type === 'custom_area' && (
          <div className="space-y-2">
            {isDrawingMode && !selectedScope.polygon && (
              <div style={{ 
                padding: '12px', 
                background: 'var(--s-background)', 
                border: '1px solid var(--s-border)', 
                borderRadius: '6px' 
              }}>
                <p className="text-xs text-amber-700 mb-2">
                  Click on the map to start drawing your custom area polygon.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCustomAreaClear}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {selectedScope.polygon && selectedScope.area && (
              <div style={{ 
                padding: '12px', 
                background: 'var(--s-background)', 
                border: '2px solid var(--s-primary)', 
                borderRadius: '6px' 
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-amber-800">
                      Scope: Custom Area ({formatArea(selectedScope.area)})
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Gold outline visible on map
                    </p>
                  </div>
                  <button
                    onClick={handleCustomAreaClear}
                    className="p-1 text-amber-600 hover:text-amber-800 transition-colors"
                    title="Clear custom area"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setIsDrawingMode(true)}
                    className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
                  >
                    Draw New Polygon
                  </button>
                  <button
                    onClick={handleCustomAreaClear}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                  >
                    Clear Polygon
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selected Scope Display */}
        {selectedScope.value && selectedScope.type !== 'custom_area' && (
          <div style={{ 
            padding: '8px', 
            background: 'var(--s-background)', 
            border: '1px solid var(--s-border)', 
            borderRadius: '6px' 
          }}>
            <p className="text-xs text-blue-700">
              <strong>Selected Scope:</strong>{' '}
              {selectedScope.type === 'country'
                ? COUNTRIES.find(c => c.code === selectedScope.value)?.name
                : US_STATES.find(s => s.code === selectedScope.value)?.name
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScopeSelector;