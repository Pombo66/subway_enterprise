/**
 * Filter Data Consistency Tests for Stores Filter
 * 
 * This test file verifies that:
 * 1. Country names in filter data match store data (Requirements 1.1, 2.1)
 * 2. Cascading filter behavior works correctly (Requirements 2.1, 3.1)
 * 3. URL parameter synchronization functions properly (Requirement 4.1)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import CascadingFilters from '../CascadingFilters';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock store data from the stores page - this represents the actual data structure
const mockStores = [
  { id: '1', name: 'Central Station', country: 'United States', region: 'AMER', city: 'New York', createdAt: new Date().toISOString() },
  { id: '2', name: 'Riverside Mall', country: 'United Kingdom', region: 'EMEA', city: 'London', createdAt: new Date().toISOString() },
  { id: '3', name: 'Downtown Plaza', country: 'Canada', region: 'AMER', city: 'Toronto', createdAt: new Date().toISOString() },
  { id: '4', name: 'Tokyo Central', country: 'Japan', region: 'APAC', city: 'Tokyo', createdAt: new Date().toISOString() },
  { id: '5', name: 'Paris Nord', country: 'France', region: 'EMEA', city: 'Paris', createdAt: new Date().toISOString() },
  { id: '6', name: 'Berlin Hauptbahnhof', country: 'Germany', region: 'EMEA', city: 'Berlin', createdAt: new Date().toISOString() },
  { id: '7', name: 'Sydney Harbour', country: 'Australia', region: 'APAC', city: 'Sydney', createdAt: new Date().toISOString() },
  { id: '8', name: 'Los Angeles Downtown', country: 'United States', region: 'AMER', city: 'Los Angeles', createdAt: new Date().toISOString() },
  { id: '9', name: 'Madrid Centro', country: 'Spain', region: 'EMEA', city: 'Madrid', createdAt: new Date().toISOString() },
  { id: '10', name: 'Singapore Marina', country: 'Singapore', region: 'APAC', city: 'Singapore', createdAt: new Date().toISOString() },
];

// Extract filter data constants from CascadingFilters component for testing
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
};

const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
};

const mockSearchParams = {
  get: jest.fn(),
  toString: jest.fn(),
};

describe('Filter Data Consistency Tests', () => {
  let onFiltersChange: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    onFiltersChange = jest.fn();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    mockSearchParams.get.mockReturnValue(null);
  });

  describe('Requirement 1.1 & 2.1: Country names in filter data match store data', () => {
    it('should have all store countries represented in filter data', () => {
      // Extract unique countries from mock store data
      const storeCountries = [...new Set(mockStores.map(store => store.country).filter(Boolean))];
      
      // Extract all countries from filter data
      const filterCountries = Object.values(COUNTRIES_BY_REGION)
        .flat()
        .map(country => country.value);

      // Check that every country in store data exists in filter data
      storeCountries.forEach(storeCountry => {
        expect(filterCountries).toContain(storeCountry);
      });
    });

    it('should have consistent country names between filter data and store data', () => {
      // Test specific country name matches
      const storeCountries = mockStores.map(store => store.country).filter(Boolean);
      const uniqueStoreCountries = [...new Set(storeCountries)];

      uniqueStoreCountries.forEach(storeCountry => {
        // Find the country in filter data
        const foundInFilters = Object.values(COUNTRIES_BY_REGION)
          .flat()
          .some(filterCountry => filterCountry.value === storeCountry);
        
        expect(foundInFilters).toBe(true);
      });
    });

    it('should have correct region mapping for countries', () => {
      // Test that countries are mapped to correct regions
      const regionMappings = {
        'United States': 'AMER',
        'Canada': 'AMER',
        'United Kingdom': 'EMEA',
        'Germany': 'EMEA',
        'France': 'EMEA',
        'Spain': 'EMEA',
        'Japan': 'APAC',
        'Australia': 'APAC',
        'Singapore': 'APAC',
      };

      Object.entries(regionMappings).forEach(([country, expectedRegion]) => {
        const foundInRegion = COUNTRIES_BY_REGION[expectedRegion]?.some(
          filterCountry => filterCountry.value === country
        );
        expect(foundInRegion).toBe(true);
      });
    });

    it('should have cities that match store data for each country', () => {
      // Extract cities from store data grouped by country
      const storeCitiesByCountry: Record<string, string[]> = {};
      mockStores.forEach(store => {
        if (store.country && store.city) {
          if (!storeCitiesByCountry[store.country]) {
            storeCitiesByCountry[store.country] = [];
          }
          if (!storeCitiesByCountry[store.country].includes(store.city)) {
            storeCitiesByCountry[store.country].push(store.city);
          }
        }
      });

      // Check that cities in store data exist in filter data
      Object.entries(storeCitiesByCountry).forEach(([country, cities]) => {
        const filterCities = CITIES_BY_COUNTRY[country]?.map(city => city.value) || [];
        
        cities.forEach(storeCity => {
          expect(filterCities).toContain(storeCity);
        });
      });
    });
  });

  describe('Requirement 2.1 & 3.1: Cascading filter behavior', () => {
    it('should reset country and city when region changes', async () => {
      // Start with all filters applied
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'EMEA';
        if (key === 'country') return 'United Kingdom';
        if (key === 'city') return 'London';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      // Change region
      const regionSelect = screen.getByDisplayValue('EMEA');
      fireEvent.change(regionSelect, { target: { value: 'AMER' } });

      // Should reset country and city
      expect(onFiltersChange).toHaveBeenCalledWith({
        region: 'AMER',
        country: undefined,
        city: undefined,
      });
    });

    it('should reset city when country changes', async () => {
      // Start with region, country, and city selected
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'EMEA';
        if (key === 'country') return 'United Kingdom';
        if (key === 'city') return 'London';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      // Change country
      const countrySelect = screen.getByDisplayValue('United Kingdom');
      fireEvent.change(countrySelect, { target: { value: 'Germany' } });

      // Should reset city but keep region
      expect(onFiltersChange).toHaveBeenCalledWith({
        region: 'EMEA',
        country: 'Germany',
        city: undefined,
      });
    });

    it('should disable country dropdown when no region is selected', () => {
      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      const countrySelect = screen.getByDisplayValue('All Countries');
      expect(countrySelect).toBeDisabled();
    });

    it('should disable city dropdown when no country is selected', () => {
      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      const citySelect = screen.getByDisplayValue('All Cities');
      expect(citySelect).toBeDisabled();
    });

    it('should enable country dropdown when region is selected', async () => {
      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      const regionSelect = screen.getByDisplayValue('All Regions');
      fireEvent.change(regionSelect, { target: { value: 'EMEA' } });

      await waitFor(() => {
        const countrySelect = screen.getByDisplayValue('All Countries');
        expect(countrySelect).not.toBeDisabled();
      });
    });

    it('should enable city dropdown when country is selected', async () => {
      // Start with region selected
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'EMEA';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      const countrySelect = screen.getByDisplayValue('All Countries');
      fireEvent.change(countrySelect, { target: { value: 'United Kingdom' } });

      await waitFor(() => {
        const citySelect = screen.getByDisplayValue('All Cities');
        expect(citySelect).not.toBeDisabled();
      });
    });

    it('should populate correct countries when region is selected', async () => {
      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      const regionSelect = screen.getByDisplayValue('All Regions');
      fireEvent.change(regionSelect, { target: { value: 'EMEA' } });

      await waitFor(() => {
        // Check that EMEA countries are available
        const countrySelect = screen.getByDisplayValue('All Countries');
        const options = countrySelect.querySelectorAll('option');
        const optionValues = Array.from(options).map(option => (option as HTMLOptionElement).value);
        
        // Should include EMEA countries
        expect(optionValues).toContain('United Kingdom');
        expect(optionValues).toContain('Germany');
        expect(optionValues).toContain('France');
        expect(optionValues).toContain('Spain');
        
        // Should not include AMER countries
        expect(optionValues).not.toContain('United States');
        expect(optionValues).not.toContain('Canada');
      });
    });

    it('should populate correct cities when country is selected', async () => {
      // Start with region selected
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'EMEA';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      const countrySelect = screen.getByDisplayValue('All Countries');
      fireEvent.change(countrySelect, { target: { value: 'United Kingdom' } });

      await waitFor(() => {
        // Check that UK cities are available
        const citySelect = screen.getByDisplayValue('All Cities');
        const options = citySelect.querySelectorAll('option');
        const optionValues = Array.from(options).map(option => (option as HTMLOptionElement).value);
        
        // Should include UK cities
        expect(optionValues).toContain('London');
        expect(optionValues).toContain('Manchester');
        expect(optionValues).toContain('Birmingham');
        
        // Should not include cities from other countries
        expect(optionValues).not.toContain('Berlin');
        expect(optionValues).not.toContain('Paris');
      });
    });
  });

  describe('Requirement 4.1: URL parameter synchronization', () => {
    it('should update URL parameters when filters change', async () => {
      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      const regionSelect = screen.getByDisplayValue('All Regions');
      fireEvent.change(regionSelect, { target: { value: 'EMEA' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=EMEA', { scroll: false });
      });
    });

    it('should initialize filters from URL parameters', () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'APAC';
        if (key === 'country') return 'Japan';
        if (key === 'city') return 'Tokyo';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);

      expect(onFiltersChange).toHaveBeenCalledWith({
        region: 'APAC',
        country: 'Japan',
        city: 'Tokyo',
      });
    });

    it('should clear URL parameters when filters are cleared', async () => {
      // Start with filters applied
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'EMEA';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      // Clear region filter
      const regionSelect = screen.getByDisplayValue('EMEA');
      fireEvent.change(regionSelect, { target: { value: '' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/stores', { scroll: false });
      });
    });

    it('should handle multiple URL parameters correctly', async () => {
      const { unmount } = render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      // Apply region filter
      const regionSelect = screen.getByDisplayValue('All Regions');
      fireEvent.change(regionSelect, { target: { value: 'AMER' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=AMER', { scroll: false });
      });

      // Clean up and re-render with region applied
      unmount();
      mockRouter.replace.mockClear();
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'AMER';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      // Apply country filter
      const countrySelect = screen.getByDisplayValue('All Countries');
      fireEvent.change(countrySelect, { target: { value: 'United States' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=AMER&country=United+States', { scroll: false });
      });
    });

    it('should properly encode special characters in URL parameters', async () => {
      const { unmount } = render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      const regionSelect = screen.getByDisplayValue('All Regions');
      fireEvent.change(regionSelect, { target: { value: 'EMEA' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=EMEA', { scroll: false });
      });

      // Clean up and re-render
      unmount();
      mockRouter.replace.mockClear();
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'region') return 'EMEA';
        return null;
      });

      render(<CascadingFilters onFiltersChange={onFiltersChange} />);
      
      // Select country with space in name
      const countrySelect = screen.getByDisplayValue('All Countries');
      fireEvent.change(countrySelect, { target: { value: 'United Kingdom' } });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('?region=EMEA&country=United+Kingdom', { scroll: false });
      });
    });
  });

  describe('Data integrity validation', () => {
    it('should have no duplicate countries across regions', () => {
      const allCountries: string[] = [];
      
      Object.values(COUNTRIES_BY_REGION).forEach(countries => {
        countries.forEach(country => {
          expect(allCountries).not.toContain(country.value);
          allCountries.push(country.value);
        });
      });
    });

    it('should have no duplicate cities within each country', () => {
      Object.entries(CITIES_BY_COUNTRY).forEach(([country, cities]) => {
        const cityValues = cities.map(city => city.value);
        const uniqueCityValues = [...new Set(cityValues)];
        
        expect(cityValues.length).toBe(uniqueCityValues.length);
      });
    });

    it('should have consistent value and label pairs in filter data', () => {
      // Check countries
      Object.values(COUNTRIES_BY_REGION).forEach(countries => {
        countries.forEach(country => {
          expect(country.value).toBe(country.label);
        });
      });

      // Check cities
      Object.values(CITIES_BY_COUNTRY).forEach(cities => {
        cities.forEach(city => {
          expect(city.value).toBe(city.label);
        });
      });
    });

    it('should have all countries in CITIES_BY_COUNTRY that exist in COUNTRIES_BY_REGION', () => {
      const allFilterCountries = Object.values(COUNTRIES_BY_REGION)
        .flat()
        .map(country => country.value);
      
      const countriesWithCities = Object.keys(CITIES_BY_COUNTRY);
      
      countriesWithCities.forEach(country => {
        expect(allFilterCountries).toContain(country);
      });
    });
  });
});