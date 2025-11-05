'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface FilterState {
  region?: string;
  country?: string;
  city?: string;
  status?: string;
  dataQuality?: 'all' | 'incomplete' | 'complete';
}

interface CascadingFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
}

// Mock data for regions, countries, and cities
// In a real implementation, this would come from the API
const REGIONS = [
  { value: 'EMEA', label: 'EMEA' },
  { value: 'AMER', label: 'AMER' },
  { value: 'APAC', label: 'APAC' },
];

const COUNTRIES_BY_REGION: Record<string, Array<{ value: string; label: string }>> = {
  EMEA: [
    { value: 'United Kingdom', label: 'United Kingdom' },
    { value: 'Germany', label: 'Germany' },
    { value: 'France', label: 'France' },
    { value: 'Italy', label: 'Italy' },
    { value: 'Spain', label: 'Spain' },
  ],
  AMER: [
    { value: 'United States', label: 'United States' },
    { value: 'Canada', label: 'Canada' },
    { value: 'Mexico', label: 'Mexico' },
    { value: 'Brazil', label: 'Brazil' },
  ],
  APAC: [
    { value: 'Japan', label: 'Japan' },
    { value: 'Australia', label: 'Australia' },
    { value: 'Singapore', label: 'Singapore' },
    { value: 'South Korea', label: 'South Korea' },
  ],
};

const CITIES_BY_COUNTRY: Record<string, Array<{ value: string; label: string }>> = {
  'United Kingdom': [
    { value: 'London', label: 'London' },
    { value: 'Manchester', label: 'Manchester' },
    { value: 'Birmingham', label: 'Birmingham' },
  ],
  'United States': [
    { value: 'New York', label: 'New York' },
    { value: 'Los Angeles', label: 'Los Angeles' },
    { value: 'Chicago', label: 'Chicago' },
  ],
  'Germany': [
    { value: 'Berlin', label: 'Berlin' },
    { value: 'Munich', label: 'Munich' },
    { value: 'Hamburg', label: 'Hamburg' },
  ],
  'Japan': [
    { value: 'Tokyo', label: 'Tokyo' },
    { value: 'Osaka', label: 'Osaka' },
    { value: 'Kyoto', label: 'Kyoto' },
  ],
  'France': [
    { value: 'Paris', label: 'Paris' },
    { value: 'Lyon', label: 'Lyon' },
    { value: 'Marseille', label: 'Marseille' },
  ],
  'Australia': [
    { value: 'Sydney', label: 'Sydney' },
    { value: 'Melbourne', label: 'Melbourne' },
    { value: 'Brisbane', label: 'Brisbane' },
  ],
  'Spain': [
    { value: 'Madrid', label: 'Madrid' },
    { value: 'Barcelona', label: 'Barcelona' },
    { value: 'Valencia', label: 'Valencia' },
  ],
  'Singapore': [
    { value: 'Singapore', label: 'Singapore' },
  ],
  'Canada': [
    { value: 'Toronto', label: 'Toronto' },
    { value: 'Vancouver', label: 'Vancouver' },
    { value: 'Montreal', label: 'Montreal' },
  ],
  // Add more cities as needed
};

export default function CascadingFilters({ onFiltersChange }: CascadingFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FilterState>({
    region: searchParams.get('region') || '',
    country: searchParams.get('country') || '',
    city: searchParams.get('city') || '',
    status: searchParams.get('status') || '',
    dataQuality: (searchParams.get('dataQuality') as 'all' | 'incomplete' | 'complete') || 'all',
  });

  // Get available countries based on selected region
  const availableCountries = filters.region
    ? COUNTRIES_BY_REGION[filters.region] || []
    : [];

  // Get available cities based on selected country
  const availableCities = filters.country
    ? CITIES_BY_COUNTRY[filters.country] || []
    : [];

  // Update URL query parameters when filters change
  const updateQueryParams = (newFilters: FilterState) => {
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

  // Handle region change
  const handleRegionChange = (region: string) => {
    const newFilters: FilterState = {
      region: region || undefined,
      country: undefined, // Reset country when region changes
      city: undefined, // Reset city when region changes
    };

    setFilters(newFilters);
    updateQueryParams(newFilters);
    onFiltersChange(newFilters);
  };

  // Handle country change
  const handleCountryChange = (country: string) => {
    const newFilters: FilterState = {
      ...filters,
      country: country || undefined,
      city: undefined, // Reset city when country changes
    };

    setFilters(newFilters);
    updateQueryParams(newFilters);
    onFiltersChange(newFilters);
  };

  // Handle city change
  const handleCityChange = (city: string) => {
    const newFilters: FilterState = {
      ...filters,
      city: city || undefined,
    };

    setFilters(newFilters);
    updateQueryParams(newFilters);
    onFiltersChange(newFilters);
  };

  // Handle status change
  const handleStatusChange = (status: string) => {
    const newFilters: FilterState = {
      ...filters,
      status: status || undefined,
    };

    setFilters(newFilters);
    updateQueryParams(newFilters);
    onFiltersChange(newFilters);
  };

  // Handle data quality change
  const handleDataQualityChange = (quality: string) => {
    const newFilters: FilterState = {
      ...filters,
      dataQuality: (quality as 'all' | 'incomplete' | 'complete') || 'all',
    };

    setFilters(newFilters);
    updateQueryParams(newFilters);
    onFiltersChange(newFilters);
  };

  // Initialize filters from URL on component mount - ONLY ONCE
  // Do NOT call onFiltersChange here - let parent handle initial data load
  useEffect(() => {
    const initialFilters: FilterState = {
      region: searchParams.get('region') || undefined,
      country: searchParams.get('country') || undefined,
      city: searchParams.get('city') || undefined,
      status: searchParams.get('status') || undefined,
    };

    setFilters(initialFilters);
    // Removed onFiltersChange call to prevent duplicate API calls
    // Parent component handles initial data load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array - only run on mount, not when searchParams changes

  return (
    <div className="cascading-filters">
      {/* Region Filter */}
      <select
        value={filters.region || ''}
        onChange={(e) => handleRegionChange(e.target.value)}
        className="s-select"
      >
        <option value="">All Regions</option>
        {REGIONS.map((region) => (
          <option key={region.value} value={region.value}>
            {region.label}
          </option>
        ))}
      </select>

      {/* Country Filter */}
      <select
        value={filters.country || ''}
        onChange={(e) => handleCountryChange(e.target.value)}
        className="s-select"
        disabled={!filters.region}
      >
        <option value="">All Countries</option>
        {availableCountries.map((country) => (
          <option key={country.value} value={country.value}>
            {country.label}
          </option>
        ))}
      </select>

      {/* City Filter */}
      <select
        value={filters.city || ''}
        onChange={(e) => handleCityChange(e.target.value)}
        className="s-select"
        disabled={!filters.country}
      >
        <option value="">All Cities</option>
        {availableCities.map((city) => (
          <option key={city.value} value={city.value}>
            {city.label}
          </option>
        ))}
      </select>

      {/* Status Filter */}
      <select
        value={filters.status || ''}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="s-select"
      >
        <option value="">All Statuses</option>
        <option value="Open">Open</option>
        <option value="Closed">Closed</option>
        <option value="Planned">Planned</option>
      </select>

      {/* Data Quality Filter */}
      <select
        value={filters.dataQuality || 'all'}
        onChange={(e) => handleDataQualityChange(e.target.value)}
        className="s-select"
      >
        <option value="all">All Stores</option>
        <option value="complete">Complete Data</option>
        <option value="incomplete">Missing Coordinates</option>
      </select>
    </div>
  );
}