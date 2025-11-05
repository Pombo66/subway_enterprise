'use client';

import { useState } from 'react';

export interface LocationData {
  lat: number;
  lng: number;
  confidence: number;
  intensityLevel: string;
  marketPotential: number;
  selected: boolean;
  alternativeIntensities?: Array<{
    level: string;
    wouldBeSelected: boolean;
  }>;
}

export interface RegionData {
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  totalLocations: number;
  selectedLocations: number;
  averageConfidence: number;
  marketSaturation: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface GeographicDistributionVisualizationProps {
  locations: LocationData[];
  regions: RegionData[];
  currentIntensity: string;
  onIntensityChange?: (intensity: string) => void;
}

export default function GeographicDistributionVisualization({
  locations,
  regions,
  currentIntensity,
  onIntensityChange
}: GeographicDistributionVisualizationProps) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'heatmap' | 'distribution' | 'comparison'>('distribution');

  // Calculate distribution metrics
  const distributionMetrics = {
    totalAnalyzed: locations.length,
    totalSelected: locations.filter(l => l.selected).length,
    averageConfidence: locations.reduce((sum, l) => sum + l.confidence, 0) / locations.length,
    intensityDistribution: locations.reduce((acc, l) => {
      acc[l.intensityLevel] = (acc[l.intensityLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  // Calculate regional balance
  const regionalBalance = regions.map(region => {
    const regionLocations = locations.filter(l => 
      l.lat >= region.bounds.south && l.lat <= region.bounds.north &&
      l.lng >= region.bounds.west && l.lng <= region.bounds.east
    );
    
    const selectedInRegion = regionLocations.filter(l => l.selected).length;
    const selectionRate = regionLocations.length > 0 ? (selectedInRegion / regionLocations.length) * 100 : 0;
    
    return {
      ...region,
      locationCount: regionLocations.length,
      selectedCount: selectedInRegion,
      selectionRate,
      avgConfidence: regionLocations.reduce((sum, l) => sum + l.confidence, 0) / regionLocations.length || 0
    };
  });

  const DistributionHeatmap = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '12px',
      marginBottom: '16px'
    }}>
      {regionalBalance.map((region, index) => (
        <div
          key={region.name}
          onClick={() => setSelectedRegion(selectedRegion === region.name ? null : region.name)}
          style={{
            padding: '12px',
            borderRadius: '8px',
            border: selectedRegion === region.name ? '2px solid #3b82f6' : '1px solid #e5e7eb',
            background: selectedRegion === region.name ? '#f0f9ff' : 'white',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
              {region.name}
            </h4>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: region.marketSaturation === 'LOW' ? '#10b981' :
                         region.marketSaturation === 'MEDIUM' ? '#f59e0b' : '#ef4444'
            }} />
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Locations</span>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                {region.selectedCount}/{region.locationCount}
              </span>
            </div>
            <div style={{
              height: '6px',
              background: '#e5e7eb',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(region.selectionRate, 100)}%`,
                background: '#3b82f6',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
            <span>Selection: {region.selectionRate.toFixed(1)}%</span>
            <span>Confidence: {(region.avgConfidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      ))}
    </div>
  );

  const IntensityComparison = () => {
    const intensityLevels = ['Light', 'Moderate', 'Medium', 'High', 'Aggressive'];
    
    return (
      <div style={{
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginBottom: '16px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
          📊 Intensity Level Comparison
        </h4>
        
        {intensityLevels.map((level) => {
          const wouldSelectCount = locations.filter(l => 
            l.alternativeIntensities?.some(alt => alt.level === level && alt.wouldBeSelected)
          ).length;
          
          const percentage = locations.length > 0 ? (wouldSelectCount / locations.length) * 100 : 0;
          const isCurrentLevel = level === currentIntensity;
          
          return (
            <div
              key={level}
              onClick={() => onIntensityChange?.(level)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                marginBottom: '6px',
                borderRadius: '6px',
                background: isCurrentLevel ? '#dbeafe' : 'white',
                border: isCurrentLevel ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                cursor: onIntensityChange ? 'pointer' : 'default',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: isCurrentLevel ? 600 : 500,
                  color: isCurrentLevel ? '#1e40af' : '#1e293b'
                }}>
                  {level} Intensity
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {percentage.toFixed(1)}% of analyzed locations
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: isCurrentLevel ? '#1e40af' : '#374151'
                }}>
                  {wouldSelectCount}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  locations
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const DistributionMetrics = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '12px',
      marginBottom: '16px'
    }}>
      <div style={{
        padding: '12px',
        background: 'white',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6', marginBottom: '4px' }}>
          {distributionMetrics.totalSelected}
        </div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>Selected Locations</div>
      </div>
      
      <div style={{
        padding: '12px',
        background: 'white',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>
          {(distributionMetrics.averageConfidence * 100).toFixed(0)}%
        </div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>Avg Confidence</div>
      </div>
      
      <div style={{
        padding: '12px',
        background: 'white',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#8b5cf6', marginBottom: '4px' }}>
          {regions.length}
        </div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>Regions Covered</div>
      </div>
      
      <div style={{
        padding: '12px',
        background: 'white',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>
          {((distributionMetrics.totalSelected / distributionMetrics.totalAnalyzed) * 100).toFixed(1)}%
        </div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>Selection Rate</div>
      </div>
    </div>
  );

  return (
    <div style={{
      padding: '20px',
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      marginBottom: '16px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
          🗺️ Geographic Distribution Analysis
        </h3>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['distribution', 'heatmap', 'comparison'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: viewMode === mode ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                background: viewMode === mode ? '#f0f9ff' : 'white',
                color: viewMode === mode ? '#1e40af' : '#64748b',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'distribution' && (
        <>
          <DistributionMetrics />
          <DistributionHeatmap />
        </>
      )}

      {viewMode === 'heatmap' && (
        <div style={{
          padding: '20px',
          background: '#f8fafc',
          borderRadius: '6px',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🗺️</div>
          <div style={{ fontSize: '14px', marginBottom: '4px' }}>Interactive Heatmap</div>
          <div style={{ fontSize: '12px' }}>
            Geographic heatmap visualization would be integrated with the main map component
          </div>
        </div>
      )}

      {viewMode === 'comparison' && <IntensityComparison />}

      {selectedRegion && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#f0f9ff',
          borderRadius: '6px',
          border: '1px solid #bae6fd'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
            {selectedRegion} - Detailed Analysis
          </div>
          <div style={{ fontSize: '12px', color: '#374151' }}>
            Click on regions above to see detailed market analysis and location breakdown.
            This would show individual location details, market saturation analysis, and competitive landscape.
          </div>
        </div>
      )}
    </div>
  );
}