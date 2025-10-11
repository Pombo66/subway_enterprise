'use client';

import { useCallback, useMemo, useRef } from 'react';
import { FilterState, FilterOptions, MapFiltersProps } from '../types';
import { MapTelemetryHelpers, safeTrackEvent, getCurrentUserId } from '../telemetry';
import { InlineLoadingIndicator } from './LoadingSkeletons';

/**
 * MapFilters component provides filter controls for the Living Map
 * Implements franchisee, region, and country filtering with debounced updates
 */
export default function MapFilters({ 
  filters, 
  onFiltersChange, 
  availableOptions, 
  loading = false 
}: MapFiltersProps) {
  
  // Keep track of previous filters for telemetry
  const previousFiltersRef = useRef<FilterState>(filters);
  
  // Handle individual filter changes
  const handleFilterChange = useCallback((key: keyof FilterState, value: string | undefined) => {
    const newFilters = { ...filters };
    const oldValue = filters[key];
    
    if (value === '' || value === undefined) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    
    // Track filter change telemetry
    const changedFilters: Partial<FilterState> = {};
    if (oldValue !== value) {
      changedFilters[key] = value;
      
      safeTrackEvent(() => {
        MapTelemetryHelpers.trackMapFilterChanged(
          changedFilters,
          newFilters,
          getCurrentUserId(),
          {
            filterKey: key,
            oldValue,
            newValue: value,
          }
        );
      }, 'map_filter_changed');
    }
    
    previousFiltersRef.current = newFilters;
    onFiltersChange(newFilters);
  }, [filters, onFiltersChange]);

  // Handle filter reset
  const handleReset = useCallback(() => {
    const previousFilters = previousFiltersRef.current;
    const newFilters = {};
    
    // Track filter reset telemetry
    if (Object.keys(previousFilters).length > 0) {
      safeTrackEvent(() => {
        MapTelemetryHelpers.trackMapFilterChanged(
          { reset: true } as any, // Special case for reset
          newFilters,
          getCurrentUserId(),
          {
            action: 'reset_all_filters',
            previousFilterCount: Object.keys(previousFilters).length,
            clearedFilters: previousFilters,
          }
        );
      }, 'map_filter_changed');
    }
    
    previousFiltersRef.current = newFilters;
    onFiltersChange(newFilters);
  }, [onFiltersChange]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some(key => filters[key as keyof FilterState]);
  }, [filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.keys(filters).filter(key => filters[key as keyof FilterState]).length;
  }, [filters]);

  return (
    <div 
      className="map-filters"
      role="region"
      aria-label="Store filters"
    >
      <div className="map-filters-header">
        <div className="map-filters-title">
          <h3 id="filters-heading" className="map-filters-heading">
            Filters
          </h3>
          {activeFilterCount > 0 && (
            <span 
              className="map-filters-count"
              aria-label={`${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} active`}
            >
              {activeFilterCount} active
            </span>
          )}
          {loading && (
            <div style={{ marginLeft: '8px' }} aria-live="polite">
              <InlineLoadingIndicator message="Updating..." />
            </div>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="s-btn map-filters-reset"
            disabled={loading}
            type="button"
            aria-label={`Clear all ${activeFilterCount} active filters`}
            title="Remove all active filters"
          >
            Clear all
          </button>
        )}
      </div>

      <div 
        className="map-filters-controls"
        role="group"
        aria-labelledby="filters-heading"
      >
        {/* Country Filter */}
        <div className="map-filter-group">
          <label 
            className="map-filter-label"
            htmlFor="country-filter"
          >
            Country
          </label>
          <select
            id="country-filter"
            className="s-select map-filter-select"
            value={filters.country || ''}
            onChange={(e) => handleFilterChange('country', e.target.value || undefined)}
            disabled={loading}
            aria-describedby={loading && availableOptions.countries.length === 0 ? 'country-loading' : undefined}
            aria-label={`Filter stores by country. Currently ${filters.country ? `filtered to ${filters.country}` : 'showing all countries'}`}
          >
            <option value="">
              {loading ? 'Loading countries...' : 'All countries'}
            </option>
            {availableOptions.countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
          {loading && availableOptions.countries.length === 0 && (
            <div 
              id="country-loading"
              className="map-filter-loading"
              aria-live="polite"
            >
              <div 
                className="skeleton-text" 
                style={{ width: '100%', height: '14px' }}
                aria-label="Loading country options"
              />
            </div>
          )}
        </div>

        {/* Region Filter */}
        <div className="map-filter-group">
          <label 
            className="map-filter-label"
            htmlFor="region-filter"
          >
            Region
          </label>
          <select
            id="region-filter"
            className="s-select map-filter-select"
            value={filters.region || ''}
            onChange={(e) => handleFilterChange('region', e.target.value || undefined)}
            disabled={loading}
            aria-describedby={loading && availableOptions.regions.length === 0 ? 'region-loading' : undefined}
            aria-label={`Filter stores by region. Currently ${filters.region ? `filtered to ${filters.region}` : 'showing all regions'}`}
          >
            <option value="">
              {loading ? 'Loading regions...' : 'All regions'}
            </option>
            {availableOptions.regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
          {loading && availableOptions.regions.length === 0 && (
            <div 
              id="region-loading"
              className="map-filter-loading"
              aria-live="polite"
            >
              <div 
                className="skeleton-text" 
                style={{ width: '100%', height: '14px' }}
                aria-label="Loading region options"
              />
            </div>
          )}
        </div>

        {/* Franchisee Filter - Currently not supported by API but included for future use */}
        <div className="map-filter-group">
          <label 
            className="map-filter-label"
            htmlFor="franchisee-filter"
          >
            Franchisee
          </label>
          <select
            id="franchisee-filter"
            className="s-select map-filter-select"
            value={filters.franchiseeId || ''}
            onChange={(e) => handleFilterChange('franchiseeId', e.target.value || undefined)}
            disabled={loading || availableOptions.franchisees.length === 0}
            aria-describedby="franchisee-note"
            aria-label={`Filter stores by franchisee. ${availableOptions.franchisees.length === 0 ? 'Currently unavailable' : filters.franchiseeId ? `Currently filtered to ${availableOptions.franchisees.find(f => f.id === filters.franchiseeId)?.name || 'selected franchisee'}` : 'showing all franchisees'}`}
          >
            <option value="">All franchisees</option>
            {availableOptions.franchisees.map((franchisee) => (
              <option key={franchisee.id} value={franchisee.id}>
                {franchisee.name}
              </option>
            ))}
          </select>
          {availableOptions.franchisees.length === 0 && (
            <div 
              id="franchisee-note"
              className="map-filter-note"
              role="status"
            >
              Franchisee filtering not available
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .map-filters {
          background: var(--s-card);
          border: 1px solid var(--s-border);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .map-filters-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .map-filters-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .map-filters-heading {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--s-text);
        }

        .map-filters-count {
          background: var(--s-primary);
          color: var(--s-primary-text);
          font-size: 12px;
          font-weight: 500;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .map-filters-reset {
          background: transparent;
          border: 1px solid var(--s-border);
          color: var(--s-muted);
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .map-filters-reset:hover:not(:disabled) {
          background: var(--s-hover);
          color: var(--s-text);
        }

        .map-filters-reset:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .map-filters-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }

        .map-filter-group {
          flex: 1;
          min-width: 200px;
        }

        .map-filter-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--s-text);
          margin-bottom: 4px;
        }

        .map-filter-select {
          width: 100%;
          margin-top: 4px;
          background: var(--s-card);
          border: 1px solid var(--s-border);
          border-radius: 6px;
          padding: 8px 12px;
          color: var(--s-text);
          font-size: 14px;
          transition: border-color 0.2s ease;
        }

        .map-filter-select:focus {
          outline: 2px solid var(--s-primary);
          outline-offset: 2px;
          border-color: var(--s-primary);
          box-shadow: 0 0 0 2px var(--s-primary-alpha);
        }

        .map-filters-reset:focus {
          outline: 2px solid var(--s-primary);
          outline-offset: 2px;
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .map-filters {
            border: 2px solid;
          }
          
          .map-filter-select {
            border: 2px solid;
          }
          
          .map-filter-select:focus {
            outline: 3px solid;
            outline-offset: 2px;
          }
          
          .map-filters-reset {
            border: 2px solid;
          }
          
          .map-filters-reset:focus {
            outline: 3px solid;
            outline-offset: 2px;
          }
        }

        .map-filter-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: var(--s-disabled);
        }

        .map-filter-note {
          font-size: 12px;
          color: var(--s-muted);
          margin-top: 4px;
          font-style: italic;
        }

        .map-filter-loading {
          margin-top: 8px;
        }

        .skeleton-text {
          background: linear-gradient(90deg, var(--s-bg-secondary) 25%, var(--s-border) 50%, var(--s-bg-secondary) 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s infinite;
          border-radius: 4px;
          height: 14px;
        }

        @keyframes skeleton-loading {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .skeleton-text {
            animation: none;
          }
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .map-filters-controls {
            flex-direction: column;
          }
          
          .map-filter-group {
            min-width: unset;
          }
        }
      `}</style>
    </div>
  );
}