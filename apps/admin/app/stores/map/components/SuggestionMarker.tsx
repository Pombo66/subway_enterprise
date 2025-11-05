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
  const hasAI = suggestion.hasAIAnalysis;

  // Create title with AI indicator
  const baseTitle = `${suggestion.band} confidence - ${(suggestion.confidence * 100).toFixed(0)}%`;
  const aiTitle = hasAI 
    ? `🤖 AI Enhanced (Top ${suggestion.aiProcessingRank || '20'}%) - ${baseTitle}`
    : `📊 Standard Analysis - ${baseTitle}`;

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
      title={aiTitle}
    >
      {/* AI Enhancement Ring */}
      {hasAI && (
        <div
          style={{
            position: 'absolute',
            top: '-3px',
            left: '-3px',
            width: `${size + 6}px`,
            height: `${size + 6}px`,
            border: '2px solid #FFD700', // true gold ring for AI
            borderRadius: '50%',
            animation: selected ? 'pulse 2s infinite' : 'none',
            boxShadow: '0 0 12px rgba(255, 215, 0, 0.6)'
          }}
        />
      )}
      
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
        {/* AI Badge */}
        {hasAI && (
          <div
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '8px',
              height: '8px',
              background: '#f59e0b',
              border: '1px solid white',
              borderRadius: '50%',
              fontSize: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold'
            }}
          >
            ✨
          </div>
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
  prev.suggestion.hasAIAnalysis === next.suggestion.hasAIAnalysis
);

SuggestionMarker.displayName = 'SuggestionMarker';

export default SuggestionMarker;
