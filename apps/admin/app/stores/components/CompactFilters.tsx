'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface FilterState {
  region?: string;
  country?: string;
  city?: string;
  status?: string;
  dataQuality?: 'all' | 'incomplete' | 'complete';
}

interface CompactFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  incompleteCount?: number;
}

export default function CompactFilters({ onFiltersChange, incompleteCount = 0 }: CompactFiltersProps) {
  console.log('🎯 CompactFilters component loaded!');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    region: searchParams.get('region') || undefined,
    country: searchParams.get('country') || undefined,
    city: searchParams.get('city') || undefined,
    status: searchParams.get('status') || undefined,
    dataQuality: (searchParams.get('dataQuality') as 'all' | 'incomplete' | 'complete') || 'all',
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    onFiltersChange(newFilters);
    
    // Update URL
    const params = new URLSearchParams();
    if (newFilters.region) params.set('region', newFilters.region);
    if (newFilters.country) params.set('country', newFilters.country);
    if (newFilters.city) params.set('city', newFilters.city);
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.dataQuality && newFilters.dataQuality !== 'all') params.set('dataQuality', newFilters.dataQuality);
    
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : '/stores';
    router.replace(newUrl, { scroll: false });
  };

  const clearFilters = () => {
    const clearedFilters: FilterState = { dataQuality: 'all' };
    updateFilters(clearedFilters);
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => 
    value && value !== 'all' && key !== 'dataQuality'
  ).length + (filters.dataQuality && filters.dataQuality !== 'all' ? 1 : 0);

  return (
    <div className="compact-filters" ref={dropdownRef}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="s-btn s-btn--secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            position: 'relative'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span style={{
              background: 'var(--s-primary)',
              color: 'white',
              borderRadius: '10px',
              padding: '2px 6px',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="s-btn s-btn--ghost"
            style={{ fontSize: '13px', padding: '4px 8px' }}
          >
            Clear all
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="filter-dropdown">
          <div className="filter-section">
            <label className="filter-label">Region</label>
            <select
              value={filters.region || ''}
              onChange={(e) => updateFilters({ ...filters, region: e.target.value || undefined, country: undefined, city: undefined })}
              className="s-select"
            >
              <option value="">All Regions</option>
              <option value="EMEA">EMEA</option>
              <option value="AMER">AMER</option>
              <option value="APAC">APAC</option>
            </select>
          </div>

          <div className="filter-section">
            <label className="filter-label">Country</label>
            <input
              type="text"
              value={filters.country || ''}
              onChange={(e) => updateFilters({ ...filters, country: e.target.value || undefined })}
              placeholder="Enter country..."
              className="s-input"
            />
          </div>

          <div className="filter-section">
            <label className="filter-label">City</label>
            <input
              type="text"
              value={filters.city || ''}
              onChange={(e) => updateFilters({ ...filters, city: e.target.value || undefined })}
              placeholder="Enter city..."
              className="s-input"
            />
          </div>

          <div className="filter-section">
            <label className="filter-label">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => updateFilters({ ...filters, status: e.target.value || undefined })}
              className="s-select"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="Planned">Planned</option>
            </select>
          </div>

          <div className="filter-section">
            <label className="filter-label">Data Quality</label>
            <select
              value={filters.dataQuality || 'all'}
              onChange={(e) => updateFilters({ ...filters, dataQuality: e.target.value as 'all' | 'incomplete' | 'complete' })}
              className="s-select"
            >
              <option value="all">All Stores</option>
              <option value="complete">Complete Data</option>
              <option value="incomplete">
                Missing Coordinates {incompleteCount > 0 && `(${incompleteCount})`}
              </option>
            </select>
          </div>
        </div>
      )}

      <style jsx>{`
        .compact-filters {
          position: relative;
        }

        .filter-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          background: var(--s-card, #ffffff);
          border: 1px solid var(--s-border);
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          min-width: 300px;
          max-width: 400px;
          backdrop-filter: blur(10px);
        }
        
        @supports (backdrop-filter: blur(10px)) {
          .filter-dropdown {
            background: rgba(255, 255, 255, 0.95);
          }
        }
        
        @media (prefers-color-scheme: dark) {
          .filter-dropdown {
            background: rgba(30, 30, 30, 0.95);
          }
        }

        .filter-section {
          margin-bottom: 16px;
        }

        .filter-section:last-child {
          margin-bottom: 0;
        }

        .filter-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--s-text);
          margin-bottom: 6px;
        }

        .s-select,
        .s-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--s-border);
          border-radius: 6px;
          background: var(--s-card);
          color: var(--s-text);
          font-size: 14px;
        }

        .s-select:focus,
        .s-input:focus {
          outline: 2px solid var(--s-primary);
          outline-offset: 0;
          border-color: var(--s-primary);
        }
      `}</style>
    </div>
  );
}
