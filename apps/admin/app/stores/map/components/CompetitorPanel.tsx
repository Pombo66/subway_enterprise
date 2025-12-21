'use client';

import { useState, useCallback } from 'react';
import { MapPin, Loader2, AlertCircle, Eye, EyeOff, Building2 } from 'lucide-react';

/**
 * Competitor result from the API
 */
export interface CompetitorResult {
  brand: string;
  lat: number;
  lng: number;
  distanceM: number;
  placeName?: string;
}

/**
 * Brand summary statistics
 */
export interface BrandSummary {
  count: number;
  nearestM: number | null;
}

/**
 * Full response from nearby competitors API
 */
export interface NearbyCompetitorsResponse {
  center: { lat: number; lng: number };
  radiusKm: number;
  brands: string[];
  results: CompetitorResult[];
  summary: {
    total: number;
    byBrand: Record<string, BrandSummary>;
  };
  source: 'google_places';
  cached: boolean;
}

/**
 * Props for CompetitorPanel component
 */
export interface CompetitorPanelProps {
  selectedLocation: { lat: number; lng: number } | null;
  onCompetitorsLoaded: (results: CompetitorResult[], response: NearbyCompetitorsResponse) => void;
  onCompetitorsCleared: () => void;
  disabled?: boolean;
}

/**
 * Brand colors for display
 */
const BRAND_COLORS: Record<string, string> = {
  "McDonald's": '#FFC72C',
  "Burger King": '#D62300',
  "KFC": '#F40027',
  "Domino's": '#006491',
  "Starbucks": '#00704A'
};

/**
 * Format distance for display
 */
function formatDistance(meters: number | null): string {
  if (meters === null) return '-';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * CompetitorPanel Component
 * 
 * Provides UI controls for on-demand competitor discovery.
 * Features:
 * - "Show competitors (5km)" button
 * - Loading state with spinner
 * - Error handling with user-friendly messages
 * - Summary display with counts and nearest distances
 * - Toggle to hide competitors
 */
export function CompetitorPanel({
  selectedLocation,
  onCompetitorsLoaded,
  onCompetitorsCleared,
  disabled = false
}: CompetitorPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [summary, setSummary] = useState<NearbyCompetitorsResponse['summary'] | null>(null);
  const [cached, setCached] = useState(false);

  /**
   * Fetch nearby competitors from API
   */
  const handleShowCompetitors = useCallback(async () => {
    if (!selectedLocation) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/competitors/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          radiusKm: 5
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment.');
        }
        if (response.status === 503) {
          throw new Error('Competitor service temporarily unavailable.');
        }
        
        throw new Error(errorData.error || 'Failed to load competitors');
      }

      const data: NearbyCompetitorsResponse = await response.json();
      
      setSummary(data.summary);
      setCached(data.cached);
      setShowCompetitors(true);
      onCompetitorsLoaded(data.results, data);

      console.log(`🏢 Loaded ${data.results.length} competitors (cached: ${data.cached})`);

    } catch (err: any) {
      console.error('Failed to fetch competitors:', err);
      setError(err.message || 'Failed to load competitors');
    } finally {
      setLoading(false);
    }
  }, [selectedLocation, onCompetitorsLoaded]);

  /**
   * Hide competitors and clear overlay
   */
  const handleHideCompetitors = useCallback(() => {
    setShowCompetitors(false);
    setSummary(null);
    setCached(false);
    onCompetitorsCleared();
  }, [onCompetitorsCleared]);

  // Don't render if no location selected
  if (!selectedLocation) return null;

  return (
    <div className="competitor-panel" style={{ marginTop: '16px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        marginBottom: '12px',
        color: '#9ca3af',
        fontSize: '12px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        <Building2 size={14} />
        Competitor Analysis
      </div>

      {/* Error State */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          padding: '10px 12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          marginBottom: '12px'
        }}>
          <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', color: '#fca5a5' }}>{error}</div>
        </div>
      )}

      {/* Show/Hide Button */}
      {!showCompetitors ? (
        <button
          onClick={handleShowCompetitors}
          disabled={loading || disabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '10px 16px',
            background: loading ? '#374151' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: loading || disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            transition: 'background 0.2s'
          }}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              Loading competitors...
            </>
          ) : (
            <>
              <Eye size={16} />
              Show competitors (5km)
            </>
          )}
        </button>
      ) : (
        <button
          onClick={handleHideCompetitors}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '10px 16px',
            background: '#374151',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
        >
          <EyeOff size={16} />
          Hide competitors
        </button>
      )}

      {/* Summary Display */}
      {showCompetitors && summary && (
        <div style={{ marginTop: '12px' }}>
          {/* Total Count */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '8px',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '13px', color: '#93c5fd' }}>
              Total competitors within 5km
            </span>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#60a5fa' }}>
              {summary.total}
            </span>
          </div>

          {/* By Brand */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            {Object.entries(summary.byBrand).map(([brand, stats]) => (
              <div
                key={brand}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: 'rgba(55, 65, 81, 0.5)',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: BRAND_COLORS[brand] || '#6B7280'
                    }}
                  />
                  <span style={{ color: '#d1d5db' }}>{brand}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ 
                    color: stats.count > 0 ? '#fbbf24' : '#6b7280',
                    fontWeight: stats.count > 0 ? 500 : 400
                  }}>
                    {stats.count}
                  </span>
                  <span style={{ 
                    color: '#9ca3af', 
                    fontSize: '12px',
                    minWidth: '50px',
                    textAlign: 'right'
                  }}>
                    {stats.nearestM !== null ? formatDistance(stats.nearestM) : '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Cache indicator */}
          {cached && (
            <div style={{
              marginTop: '8px',
              fontSize: '11px',
              color: '#6b7280',
              textAlign: 'center'
            }}>
              ⚡ Cached result
            </div>
          )}
        </div>
      )}

      {/* Inline styles for animation */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default CompetitorPanel;
