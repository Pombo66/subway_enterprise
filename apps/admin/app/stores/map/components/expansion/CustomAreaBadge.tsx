'use client';

import React from 'react';
import { MapPin, X } from 'lucide-react';
import { formatArea } from './utils/areaCalculation';

interface CustomAreaBadgeProps {
  name: string;
  area: number; // km²
  onClear?: () => void;
  className?: string;
}

export const CustomAreaBadge: React.FC<CustomAreaBadgeProps> = ({
  name,
  area,
  onClear,
  className = ''
}) => {
  return (
    <div 
      className={`inline-flex items-center gap-2 px-3 py-2 bg-amber-50 border-2 border-amber-300 rounded-lg shadow-sm ${className}`}
      data-design-guard="off"
    >
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500" />
        <MapPin className="w-4 h-4 text-amber-700" />
        <span className="text-sm font-medium text-amber-800">
          Scope: {name} ({formatArea(area)})
        </span>
      </div>
      
      {onClear && (
        <button
          onClick={onClear}
          className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded transition-colors"
          title="Clear custom area"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default CustomAreaBadge;