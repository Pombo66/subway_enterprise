'use client';

import React, { useEffect, useRef } from 'react';
import { MapPin, TrendingUp, Shield, Building, Send, MessageSquare, X } from 'lucide-react';
import { ExpansionSuggestion } from './types';

interface SuggestionPopoverProps {
  suggestion: ExpansionSuggestion | null;
  position: { x: number; y: number };
  onSendToPipeline: (suggestion: ExpansionSuggestion) => void;
  onAskSubMind: (suggestion: ExpansionSuggestion) => void;
  onClose?: () => void;
  className?: string;
}

export const SuggestionPopover: React.FC<SuggestionPopoverProps> = ({
  suggestion,
  position,
  onSendToPipeline,
  onAskSubMind,
  onClose,
  className = ''
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    if (suggestion) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [suggestion, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    if (suggestion) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [suggestion, onClose]);

  if (!suggestion) {
    return null;
  }

  // Calculate popover position to stay within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 320), // Popover width ~300px + margin
    y: Math.max(20, Math.min(position.y, window.innerHeight - 400)) // Popover height ~380px + margin
  };

  // Generate store name and locality from coordinates (simplified)
  const storeName = `Subway ${suggestion.lat.toFixed(3)}°N`;
  const locality = `${suggestion.lng.toFixed(3)}°${suggestion.lng >= 0 ? 'E' : 'W'}`;

  // Format score breakdown
  const scoreBreakdown = {
    demand: Math.round(suggestion.demandScore * 100),
    cannibalization: Math.round(suggestion.cannibalizationPenalty * 100),
    opsFit: Math.round(suggestion.opsFitScore * 100)
  };

  // Get confidence level
  const getConfidenceLevel = (confidence: number): { level: string; color: string } => {
    if (confidence >= 0.8) return { level: 'High', color: 'text-green-600' };
    if (confidence >= 0.6) return { level: 'Medium', color: 'text-yellow-600' };
    return { level: 'Low', color: 'text-red-600' };
  };

  const confidenceInfo = getConfidenceLevel(suggestion.confidence);

  return (
    <div
      ref={popoverRef}
      className={`fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 ${className}`}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        maxHeight: '400px',
        overflowY: 'auto'
      }}
      data-design-guard="off"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            {storeName}
          </h3>
          <p className="text-xs text-gray-600 mt-1">{locality}</p>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Data Mode Badge */}
      <div className="mb-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          suggestion.dataMode === 'live' 
            ? 'bg-red-100 text-red-700' 
            : 'bg-blue-100 text-blue-700'
        }`}>
          <span className="text-sm">
            {suggestion.dataMode === 'live' ? '🔴' : '📘'}
          </span>
          {suggestion.dataMode === 'live' ? 'Live Data' : 'Modelled'}
        </span>
      </div>

      {/* Score Breakdown */}
      <div className="space-y-3 mb-4">
        <h4 className="text-xs font-medium text-gray-700 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          Score Breakdown
        </h4>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Demand</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${scoreBreakdown.demand}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-900 w-8">
                {scoreBreakdown.demand}%
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Cannibalization</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${scoreBreakdown.cannibalization}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-900 w-8">
                {scoreBreakdown.cannibalization}%
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Ops Fit</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${scoreBreakdown.opsFit}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-900 w-8">
                {scoreBreakdown.opsFit}%
              </span>
            </div>
          </div>
        </div>

        {/* Overall Score */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Overall Score</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">
                {Math.round(suggestion.finalScore * 100)}%
              </span>
              <span className={`text-xs font-medium ${confidenceInfo.color}`}>
                {confidenceInfo.level} Confidence
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Distance Info */}
      <div className="mb-4 p-2 bg-gray-50 rounded-md">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Nearest Subway
          </span>
          <span className="text-xs font-medium text-gray-900">
            {suggestion.nearestSubwayDistance.toFixed(1)} km away
          </span>
        </div>
      </div>

      {/* Top POIs */}
      {suggestion.topPOIs.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Building className="w-3 h-3" />
            Nearby Points of Interest
          </h4>
          <div className="space-y-1">
            {suggestion.topPOIs.slice(0, 3).map((poi, index) => (
              <div key={index} className="text-xs text-gray-600 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                {poi}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <button
          onClick={() => onSendToPipeline(suggestion)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <Send className="w-3 h-3" />
          Send to Pipeline
        </button>
        
        <button
          onClick={() => onAskSubMind(suggestion)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 text-white text-xs font-medium rounded-md hover:bg-teal-700 transition-colors"
        >
          <MessageSquare className="w-3 h-3" />
          Ask SubMind
        </button>
      </div>

      {/* Metadata */}
      <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Model: {suggestion.modelVersion}</span>
          <span>
            {new Date(suggestion.dataSnapshotDate).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SuggestionPopover;