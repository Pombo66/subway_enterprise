// Confidence badge component for auto-mapping
'use client';

import React from 'react';
import { ConfidenceLevel } from '../../lib/import/types';

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
  reason: string;
  className?: string;
}

export function ConfidenceBadge({ confidence, reason, className = '' }: ConfidenceBadgeProps) {
  const getConfidenceConfig = (level: ConfidenceLevel) => {
    switch (level) {
      case 'high':
        return {
          emoji: '🟢',
          label: 'High',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      case 'medium':
        return {
          emoji: '🟡',
          label: 'Medium',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200'
        };
      case 'low':
        return {
          emoji: '🔴',
          label: 'Low',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200'
        };
    }
  };

  const config = getConfidenceConfig(confidence);

  return (
    <div className={`inline-flex items-center ${className}`}>
      <div
        className={`
          inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border
          ${config.bgColor} ${config.textColor} ${config.borderColor}
        `}
        title={reason}
      >
        <span className="mr-1">{config.emoji}</span>
        <span>{config.label}</span>
      </div>
    </div>
  );
}