'use client';

import { useState, useEffect } from 'react';

export type AnalyticsScope = 'global' | 'region' | 'store';

export interface AnalyticsFilters {
  scope: AnalyticsScope;
  storeId?: string;
  country?: string;
  region?: string;
  dateRange?: 'last7days' | 'last30days' | 'last90days';
  compareEnabled?: boolean;
}

interface AnalyticsFiltersProps {
  filters: AnalyticsFilters;
  onChange: (filters: AnalyticsFilters) => void;
}

export default function AnalyticsFilters({ filters, onChange }: AnalyticsFiltersProps) {
  const [localFilters, setLocalFilters] = useState<AnalyticsFilters>(filters);

  // Update local state when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Live update - trigger onChange immediately when filters change
  const handleFilterChange = (newFilters: AnalyticsFilters) => {
    setLocalFilters(newFilters);
    onChange(newFilters);
  };

  const handleScopeChange = (scope: AnalyticsScope) => {
    const newFilters: AnalyticsFilters = { 
      scope, 
      // Reset other filters when scope changes
      storeId: undefined, 
      country: undefined, 
      region: undefined 
    };
    handleFilterChange(newFilters);
  };

  const handleCountryChange = (country: string) => {
    handleFilterChange({ 
      ...localFilters, 
      country: country || undefined 
    });
  };

  const handleRegionChange = (region: string) => {
    handleFilterChange({ 
      ...localFilters, 
      region: region || undefined 
    });
  };

  const handleStoreIdChange = (storeId: string) => {
    handleFilterChange({ 
      ...localFilters, 
      storeId: storeId || undefined 
    });
  };

  const handleDateRangeChange = (dateRange: string) => {
    handleFilterChange({ 
      ...localFilters, 
      dateRange: dateRange as 'last7days' | 'last30days' | 'last90days'
    });
  };

  const handleCompareToggle = (compareEnabled: boolean) => {
    handleFilterChange({ 
      ...localFilters, 
      compareEnabled 
    });
  };

  return (
    <div className="filters-section">
      <div className="cascading-filters">
        <label style={{ fontSize: '14px', color: 'var(--s-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Scope
          <select 
            className="s-select"
            value={localFilters.scope}
            onChange={(e) => handleScopeChange(e.target.value as AnalyticsScope)}
          >
            <option value="global">Global</option>
            <option value="region">Region</option>
            <option value="store">Store</option>
          </select>
        </label>

        <label style={{ fontSize: '14px', color: 'var(--s-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Time Range
          <select 
            className="s-select"
            value={localFilters.dateRange || 'last7days'}
            onChange={(e) => handleDateRangeChange(e.target.value)}
          >
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="last90days">Last 90 Days</option>
          </select>
        </label>

        <label style={{ fontSize: '14px', color: 'var(--s-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input 
            type="checkbox"
            checked={localFilters.compareEnabled || false}
            onChange={(e) => handleCompareToggle(e.target.checked)}
            style={{ margin: 0 }}
          />
          Compare Periods
        </label>

        {localFilters.scope === 'region' && (
          <>
            <input 
              placeholder="Country (e.g. France)" 
              className="s-input"
              value={localFilters.country || ''} 
              onChange={(e) => handleCountryChange(e.target.value)}
            />
            <input 
              placeholder="Region (e.g. EMEA)" 
              className="s-input"
              value={localFilters.region || ''} 
              onChange={(e) => handleRegionChange(e.target.value)}
            />
          </>
        )}

        {localFilters.scope === 'store' && (
          <input 
            placeholder="Store ID" 
            className="s-input"
            value={localFilters.storeId || ''} 
            onChange={(e) => handleStoreIdChange(e.target.value)}
          />
        )}
      </div>

      <div className="filter-status">
        <div>
          {localFilters.scope === 'global' && 'Showing global data'}
          {localFilters.scope === 'region' && (
            localFilters.country || localFilters.region 
              ? `Filtered by: ${[localFilters.country, localFilters.region].filter(Boolean).join(', ')}`
              : 'Enter region filters'
          )}
          {localFilters.scope === 'store' && (
            localFilters.storeId 
              ? `Store: ${localFilters.storeId}`
              : 'Enter store ID'
          )}
        </div>
        <div style={{ fontSize: '12px', opacity: 0.7 }}>
          {localFilters.dateRange === 'last7days' && 'Last 7 days'}
          {localFilters.dateRange === 'last30days' && 'Last 30 days'}
          {localFilters.dateRange === 'last90days' && 'Last 90 days'}
          {localFilters.compareEnabled && ' • Comparison enabled'}
        </div>
      </div>
    </div>
  );
}