// Country inference display component
'use client';

import React, { useState } from 'react';
import { CountryInference, COUNTRY_INFO } from '../../lib/import/types';
import { Edit2, Check, X } from 'lucide-react';

interface CountryInferenceDisplayProps {
  inference: CountryInference;
  editable?: boolean;
  onCountryChange?: (country: string) => void;
}

export function CountryInferenceDisplay({ 
  inference, 
  editable = true, 
  onCountryChange 
}: CountryInferenceDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(inference.country);

  const handleSave = () => {
    if (onCountryChange && selectedCountry !== inference.country) {
      onCountryChange(selectedCountry);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setSelectedCountry(inference.country);
    setIsEditing(false);
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(COUNTRY_INFO).map(([code, info]) => (
            <option key={code} value={code}>
              {info.flag} {info.name}
            </option>
          ))}
        </select>
        
        <button
          onClick={handleSave}
          className="p-1 text-green-600 hover:text-green-700 transition-colors"
          title="Save changes"
        >
          <Check className="h-4 w-4" />
        </button>
        
        <button
          onClick={handleCancel}
          className="p-1 text-gray-600 hover:text-gray-700 transition-colors"
          title="Cancel changes"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md border border-blue-200">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">Detected:</span>
        <span className="text-sm font-medium text-gray-900">
          {inference.flagEmoji} {COUNTRY_INFO[inference.countryCode || inference.country]?.name || inference.country}
        </span>
        <span className={`text-xs ${getConfidenceColor(inference.confidence)}`}>
          ({inference.confidence} confidence)
        </span>
      </div>
      
      {editable && (
        <button
          onClick={() => setIsEditing(true)}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="Edit country selection"
        >
          <Edit2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}