'use client';

import React from 'react';

export interface ExpansionSuggestion {
  id: string;
  lat: number;
  lng: number;
  confidence: number;
  band: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  rationale: {
    population: number;
    proximityGap: number;
    turnoverGap: number;
    notes: string;
  };
  rationaleText: string;
  status?: string;
  // AI Enhancement Indicator
  hasAIAnalysis?: boolean;
  aiProcessingRank?: number; // Rank among all candidates (1 = highest scoring)
  // Enhanced AI data
  locationContext?: {
    marketAssessment: string;
    competitiveAdvantages: string[];
    riskFactors: string[];
    confidenceScore: number;
  };
  placementScore?: {
    viabilityAssessment: string;
    numericScores: {
      viability: number;
      competition: number;
      accessibility: number;
      marketPotential: number;
    };
  };
  aiInsights?: {
    marketPotential: string;
    competitivePosition: string;
    riskAssessment: string[];
    recommendations: string[];
    confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  intensityMetadata?: {
    originalRanking: number;
    selectedAtIntensity: string;
    alternativeIntensities: Array<{
      level: string;
      wouldBeSelected: boolean;
      ranking: number;
    }>;
    geographicPriority: number;
    marketSaturationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

export interface SuggestionMarkerProps {
  suggestion: ExpansionSuggestion;
  onClick: () => void;
  selected: boolean;
}

const SuggestionMarker = React.memo(({ suggestion, onClick, selected }: SuggestionMarkerProps) => {
  const getColor = (band: string) => {
    switch (band) {
      case 'HIGH':
        return '#8b5cf6'; // purple
      case 'MEDIUM':
        return '#8b5cf6'; // purple (consistent with expansion theme)
      case 'LOW':
        return '#92400e'; // brown
      case 'INSUFFICIENT_DATA':
        return '#000000'; // black
      default:
        return '#666666';
    }
  };

  const color = getColor(suggestion.band);
  const size = selected ? 16 : 12;
  const isHighConfidence = suggestion.confidence > 0.75;

  // Create title with confidence indicator
  const confidencePercent = (suggestion.confidence * 100).toFixed(0);
  const title = isHighConfidence
    ? `✨ High Confidence (${confidencePercent}%) - ${suggestion.band}`
    : `${suggestion.band} confidence - ${confidencePercent}%`;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        transform: 'translate(-50%, -50%)',
        cursor: 'pointer',
        zIndex: selected ? 1000 : 100
      }}
      title={title}
    >
      {/* Main Marker */}
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: color,
          border: selected ? '3px solid white' : '2px solid white',
          borderRadius: '50%',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          transition: 'all 0.2s ease',
          position: 'relative'
        }}
      >
        {/* High Confidence Badge - Centered */}
        {isHighConfidence && (
          <div
            style={{
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
            }}
          />
        )}
      </div>
      
      {/* CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
          }
          50% {
            box-shadow: 0 0 16px rgba(245, 158, 11, 0.8);
          }
          100% {
            box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
          }
        }
      `}</style>
    </div>
  );
}, (prev, next) => 
  prev.suggestion.id === next.suggestion.id &&
  prev.selected === next.selected &&
  prev.suggestion.confidence === next.suggestion.confidence
);

SuggestionMarker.displayName = 'SuggestionMarker';

export default SuggestionMarker;
