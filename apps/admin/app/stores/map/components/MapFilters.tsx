'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { FilterState, MapFiltersProps } from '../types';
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
  
  // State for collapsible visibility section
  const [showVisibilityToggles, setShowVisibilityToggles] = useState(true);
  
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

        {/* Franchisee Filter */}
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
            disabled={loading}
            aria-label={`Filter stores by franchisee. Currently ${filters.franchiseeId ? `filtered to selected franchisee` : 'showing all franchisees'}`}
          >
            <option value="">
              {loading ? 'Loading franchisees...' : 'All franchisees'}
            </option>
            {availableOptions.franchisees?.map((franchisee) => (
              <option key={franchisee.id} value={franchisee.id}>
                {franchisee.name}
              </option>
            ))}
          </select>
        </div>

        {/* Competitor Filters - Always Available */}
        <div className="map-filter-group">
          <label 
            className="map-filter-label"
            htmlFor="competitor-brand-filter"
          >
            Competitor Brand
          </label>
          <select
            id="competitor-brand-filter"
            className="s-select map-filter-select"
            value={filters.competitorBrand || ''}
            onChange={(e) => handleFilterChange('competitorBrand', e.target.value || undefined)}
            disabled={loading}
            aria-label={`Filter competitors by brand. Currently ${filters.competitorBrand ? `filtered to ${filters.competitorBrand}` : 'showing all brands'}`}
          >
            <option value="">All competitor brands</option>
            {availableOptions.competitorBrands?.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>

        <div className="map-filter-group">
          <label 
            className="map-filter-label"
            htmlFor="competitor-category-filter"
          >
            Competitor Category
          </label>
          <select
            id="competitor-category-filter"
            className="s-select map-filter-select"
            value={filters.competitorCategory || ''}
            onChange={(e) => handleFilterChange('competitorCategory', e.target.value || undefined)}
            disabled={loading}
            aria-label={`Filter competitors by category. Currently ${filters.competitorCategory ? `filtered to ${filters.competitorCategory}` : 'showing all categories'}`}
          >
            <option value="">All competitor types</option>
            {availableOptions.competitorCategories?.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Visibility Toggles */}
        <div className="map-filter-group map-filter-group-full">
          <div 
            className="map-filter-label-toggle"
            onClick={() => setShowVisibilityToggles(!showVisibilityToggles)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <label className="map-filter-label" style={{ cursor: 'pointer', margin: 0 }}>
              Store Types
            </label>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="currentColor"
              style={{ 
                transform: showVisibilityToggles ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            >
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </div>
          {showVisibilityToggles && (
            <div className="map-filter-checkboxes">
            <label className="map-filter-checkbox-label">
              <input
                type="checkbox"
                checked={filters.statusFilters?.showOpen !== false}
                onChange={(e) => {
                  const newFilters = {
                    ...filters,
                    statusFilters: {
                      ...filters.statusFilters,
                      showOpen: e.target.checked
                    }
                  };
                  onFiltersChange(newFilters);
                }}
                disabled={loading}
                className="map-filter-checkbox"
              />
              <span className="map-filter-checkbox-text">
                <span className="status-indicator status-open"></span>
                Open Stores
              </span>
            </label>

            <label className="map-filter-checkbox-label">
              <input
                type="checkbox"
                checked={filters.statusFilters?.showClosed !== false}
                onChange={(e) => {
                  const newFilters = {
                    ...filters,
                    statusFilters: {
                      ...filters.statusFilters,
                      showClosed: e.target.checked
                    }
                  };
                  onFiltersChange(newFilters);
                }}
                disabled={loading}
                className="map-filter-checkbox"
              />
              <span className="map-filter-checkbox-text">
                <span className="status-indicator status-closed"></span>
                Closed Stores
              </span>
            </label>

            <label className="map-filter-checkbox-label">
              <input
                type="checkbox"
                checked={filters.statusFilters?.showPlanned !== false}
                onChange={(e) => {
                  const newFilters = {
                    ...filters,
                    statusFilters: {
                      ...filters.statusFilters,
                      showPlanned: e.target.checked
                    }
                  };
                  onFiltersChange(newFilters);
                }}
                disabled={loading}
                className="map-filter-checkbox"
              />
              <span className="map-filter-checkbox-text">
                <span className="status-indicator status-planned"></span>
                Planned Stores
              </span>
            </label>

            <label className="map-filter-checkbox-label">
              <input
                type="checkbox"
                checked={filters.statusFilters?.showExpansions !== false}
                onChange={(e) => {
                  const newFilters = {
                    ...filters,
                    statusFilters: {
                      ...filters.statusFilters,
                      showExpansions: e.target.checked
                    }
                  };
                  onFiltersChange(newFilters);
                }}
                disabled={loading}
                className="map-filter-checkbox"
              />
              <span className="map-filter-checkbox-text">
                <span className="status-indicator status-expansion"></span>
                Expansion Suggestions
              </span>
            </label>


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

        .map-filter-group-full {
          flex: 1 1 100%;
          min-width: 100%;
        }

        .map-filter-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--s-text);
          margin-bottom: 8px;
        }

        .map-filter-checkboxes {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 16px;
          padding: 8px 0;
        }

        .map-filter-checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }

        .map-filter-checkbox-label:hover {
          background: var(--s-hover);
        }

        .map-filter-checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--s-primary);
        }

        .map-filter-checkbox:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .map-filter-checkbox-text {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--s-text);
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
        }

        .status-open {
          background: #10b981;
        }

        .status-closed {
          background: #6b7280;
        }

        .status-planned {
          background: #f59e0b;
        }

        .status-expansion {
          background: #8b5cf6;
        }

        .status-competitors {
          background: #ef4444;
        }

        .map-filter-competitors-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .map-filter-discovery-info {
          padding: 12px;
          background: var(--s-bg-secondary, #f8f9fa);
          border: 1px solid var(--s-border);
          border-radius: 6px;
          margin-bottom: 8px;
        }

        .discovery-status {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .discovery-text {
          font-size: 14px;
          font-weight: 500;
          color: var(--s-text);
        }

        .map-filter-refresh-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: var(--s-bg-secondary, #f8f9fa);
          border: 1px solid var(--s-border);
          border-radius: 6px;
        }

        .map-filter-refresh-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--s-primary, #0066cc);
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          align-self: flex-start;
        }

        .map-filter-refresh-button:hover:not(:disabled) {
          background: var(--s-primary-dark, #0052a3);
          transform: translateY(-1px);
        }

        .map-filter-refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .refresh-icon {
          font-size: 16px;
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