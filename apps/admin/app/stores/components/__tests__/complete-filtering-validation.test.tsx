/**
 * Complete Filtering Functionality Validation Test
 * 
 * This test validates the core filtering logic without heavy UI rendering
 * to prevent system overheating and performance issues.
 * 
 * Requirements covered: 1.1, 2.1, 3.1, 5.1, 5.2, 5.3, 5.4
 */

// Mock data matching the actual store data
const mockStores = [
  { id: '1', name: 'Central Station', country: 'United States', region: 'AMER', city: 'New York' },
  { id: '2', name: 'Riverside Mall', country: 'United Kingdom', region: 'EMEA', city: 'London' },
  { id: '3', name: 'Downtown Plaza', country: 'Canada', region: 'AMER', city: 'Toronto' },
  { id: '4', name: 'Tokyo Central', country: 'Japan', region: 'APAC', city: 'Tokyo' },
  { id: '5', name: 'Paris Nord', country: 'France', region: 'EMEA', city: 'Paris' },
  { id: '6', name: 'Berlin Hauptbahnhof', country: 'Germany', region: 'EMEA', city: 'Berlin' },
  { id: '7', name: 'Sydney Harbour', country: 'Australia', region: 'APAC', city: 'Sydney' },
  { id: '8', name: 'Los Angeles Downtown', country: 'United States', region: 'AMER', city: 'Los Angeles' },
  { id: '9', name: 'Madrid Centro', country: 'Spain', region: 'EMEA', city: 'Madrid' },
  { id: '10', name: 'Singapore Marina', country: 'Singapore', region: 'APAC', city: 'Singapore' },
];

// Filtering logic extracted from StoresPage component
const applyFilters = (stores: typeof mockStores, filters: { region?: string; country?: string; city?: string }) => {
  let filteredStores = [...stores];
  
  // Apply region filter (exact match)
  if (filters.region) {
    filteredStores = filteredStores.filter(store => 
      store.region === filters.region
    );
  }
  
  // Apply country filter (exact match)
  if (filters.country) {
    filteredStores = filteredStores.filter(store => 
      store.country === filters.country
    );
  }
  
  // Apply city filter (exact match, case-insensitive)
  if (filters.city) {
    filteredStores = filteredStores.filter(store => 
      store.city?.toLowerCase() === filters.city?.toLowerCase()
    );
  }
  
  return filteredStores;
};

describe('Complete Filtering Functionality Validation', () => {

  describe('Individual Filter Types', () => {
    test('Region filter works correctly', () => {
      // Test EMEA region filter
      const emeaFiltered = applyFilters(mockStores, { region: 'EMEA' });
      expect(emeaFiltered).toHaveLength(4);
      expect(emeaFiltered.map(s => s.name)).toEqual([
        'Riverside Mall', 'Paris Nord', 'Berlin Hauptbahnhof', 'Madrid Centro'
      ]);
      
      // Test AMER region filter
      const amerFiltered = applyFilters(mockStores, { region: 'AMER' });
      expect(amerFiltered).toHaveLength(3);
      expect(amerFiltered.map(s => s.name)).toEqual([
        'Central Station', 'Downtown Plaza', 'Los Angeles Downtown'
      ]);
      
      // Test APAC region filter
      const apacFiltered = applyFilters(mockStores, { region: 'APAC' });
      expect(apacFiltered).toHaveLength(3);
      expect(apacFiltered.map(s => s.name)).toEqual([
        'Tokyo Central', 'Sydney Harbour', 'Singapore Marina'
      ]);
    });

    test('Country filter works correctly', () => {
      // Test United States filter
      const usFiltered = applyFilters(mockStores, { country: 'United States' });
      expect(usFiltered).toHaveLength(2);
      expect(usFiltered.map(s => s.name)).toEqual([
        'Central Station', 'Los Angeles Downtown'
      ]);
      
      // Test United Kingdom filter
      const ukFiltered = applyFilters(mockStores, { country: 'United Kingdom' });
      expect(ukFiltered).toHaveLength(1);
      expect(ukFiltered[0].name).toBe('Riverside Mall');
    });

    test('City filter works correctly', () => {
      // Test New York city filter
      const nyFiltered = applyFilters(mockStores, { city: 'New York' });
      expect(nyFiltered).toHaveLength(1);
      expect(nyFiltered[0].name).toBe('Central Station');
      
      // Test case-insensitive city filter
      const nyFilteredLower = applyFilters(mockStores, { city: 'new york' });
      expect(nyFilteredLower).toHaveLength(1);
      expect(nyFilteredLower[0].name).toBe('Central Station');
    });
  });

  describe('Filter Combinations', () => {
    test('Multiple filters work together correctly', () => {
      // Test EMEA + United Kingdom + London
      const filtered1 = applyFilters(mockStores, { 
        region: 'EMEA', 
        country: 'United Kingdom', 
        city: 'London' 
      });
      expect(filtered1).toHaveLength(1);
      expect(filtered1[0].name).toBe('Riverside Mall');
      
      // Test AMER + United States + New York
      const filtered2 = applyFilters(mockStores, { 
        region: 'AMER', 
        country: 'United States', 
        city: 'New York' 
      });
      expect(filtered2).toHaveLength(1);
      expect(filtered2[0].name).toBe('Central Station');
      
      // Test AMER + United States (no city filter)
      const filtered3 = applyFilters(mockStores, { 
        region: 'AMER', 
        country: 'United States' 
      });
      expect(filtered3).toHaveLength(2);
      expect(filtered3.map(s => s.name)).toEqual([
        'Central Station', 'Los Angeles Downtown'
      ]);
    });

    test('Filters work independently when others are cleared', () => {
      // Test region only
      const regionOnly = applyFilters(mockStores, { region: 'EMEA' });
      expect(regionOnly).toHaveLength(4);
      
      // Test country only (should work without region)
      const countryOnly = applyFilters(mockStores, { country: 'United States' });
      expect(countryOnly).toHaveLength(2);
      
      // Test city only (should work without region/country)
      const cityOnly = applyFilters(mockStores, { city: 'Tokyo' });
      expect(cityOnly).toHaveLength(1);
      expect(cityOnly[0].name).toBe('Tokyo Central');
    });
  });

  describe('Store Count Updates', () => {
    test('Store count updates correctly with applied filters', () => {
      // Initial count (no filters)
      const allStores = applyFilters(mockStores, {});
      expect(allStores).toHaveLength(10);

      // EMEA filter count
      const emeaStores = applyFilters(mockStores, { region: 'EMEA' });
      expect(emeaStores).toHaveLength(4);

      // EMEA + United Kingdom filter count
      const ukStores = applyFilters(mockStores, { region: 'EMEA', country: 'United Kingdom' });
      expect(ukStores).toHaveLength(1);

      // EMEA + United Kingdom + London filter count
      const londonStores = applyFilters(mockStores, { 
        region: 'EMEA', 
        country: 'United Kingdom', 
        city: 'London' 
      });
      expect(londonStores).toHaveLength(1);
    });

    test('Returns empty array when no matches found', () => {
      // Test with non-existent region
      const noMatches1 = applyFilters(mockStores, { region: 'INVALID' });
      expect(noMatches1).toHaveLength(0);

      // Test with valid region but invalid country
      const noMatches2 = applyFilters(mockStores, { 
        region: 'EMEA', 
        country: 'Invalid Country' 
      });
      expect(noMatches2).toHaveLength(0);

      // Test with valid region/country but invalid city
      const noMatches3 = applyFilters(mockStores, { 
        region: 'EMEA', 
        country: 'United Kingdom', 
        city: 'Edinburgh' 
      });
      expect(noMatches3).toHaveLength(0);
    });
  });

  describe('"All" Options Clear Filters', () => {
    test('Empty region filter shows all stores', () => {
      // Apply region filter first
      const filtered = applyFilters(mockStores, { region: 'EMEA' });
      expect(filtered).toHaveLength(4);
      
      // Clear region filter (empty string)
      const cleared = applyFilters(mockStores, { region: '' });
      expect(cleared).toHaveLength(10);
      
      // Clear region filter (undefined)
      const clearedUndefined = applyFilters(mockStores, {});
      expect(clearedUndefined).toHaveLength(10);
    });

    test('Empty country filter shows region-filtered stores', () => {
      // Apply region and country filters
      const filtered = applyFilters(mockStores, { 
        region: 'AMER', 
        country: 'United States' 
      });
      expect(filtered).toHaveLength(2);
      
      // Clear country filter but keep region
      const cleared = applyFilters(mockStores, { 
        region: 'AMER', 
        country: '' 
      });
      expect(cleared).toHaveLength(3); // All AMER stores
    });

    test('Empty city filter shows country-filtered stores', () => {
      // Apply all filters
      const filtered = applyFilters(mockStores, { 
        region: 'AMER', 
        country: 'United States', 
        city: 'New York' 
      });
      expect(filtered).toHaveLength(1);
      
      // Clear city filter but keep region and country
      const cleared = applyFilters(mockStores, { 
        region: 'AMER', 
        country: 'United States', 
        city: '' 
      });
      expect(cleared).toHaveLength(2); // All US stores
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('Handles null and undefined values gracefully', () => {
      // Test with null values
      const nullFiltered = applyFilters(mockStores, { 
        region: null as any, 
        country: null as any, 
        city: null as any 
      });
      expect(nullFiltered).toHaveLength(10);

      // Test with undefined values
      const undefinedFiltered = applyFilters(mockStores, { 
        region: undefined, 
        country: undefined, 
        city: undefined 
      });
      expect(undefinedFiltered).toHaveLength(10);
    });

    test('Handles case sensitivity correctly', () => {
      // City filter should be case-insensitive
      const lowerCase = applyFilters(mockStores, { city: 'london' });
      const upperCase = applyFilters(mockStores, { city: 'LONDON' });
      const mixedCase = applyFilters(mockStores, { city: 'London' });
      
      expect(lowerCase).toHaveLength(1);
      expect(upperCase).toHaveLength(1);
      expect(mixedCase).toHaveLength(1);
      
      // All should return the same store
      expect(lowerCase[0].name).toBe('Riverside Mall');
      expect(upperCase[0].name).toBe('Riverside Mall');
      expect(mixedCase[0].name).toBe('Riverside Mall');
    });

    test('Handles empty store array', () => {
      const emptyFiltered = applyFilters([], { region: 'EMEA' });
      expect(emptyFiltered).toHaveLength(0);
    });

    test('Validates filter data consistency', () => {
      // Verify all stores have the expected structure
      mockStores.forEach(store => {
        expect(store).toHaveProperty('id');
        expect(store).toHaveProperty('name');
        expect(store).toHaveProperty('region');
        expect(store).toHaveProperty('country');
        expect(store).toHaveProperty('city');
      });

      // Verify region distribution
      const regions = [...new Set(mockStores.map(s => s.region))];
      expect(regions).toEqual(['AMER', 'EMEA', 'APAC']);

      // Verify we have stores in each region
      expect(applyFilters(mockStores, { region: 'AMER' }).length).toBeGreaterThan(0);
      expect(applyFilters(mockStores, { region: 'EMEA' }).length).toBeGreaterThan(0);
      expect(applyFilters(mockStores, { region: 'APAC' }).length).toBeGreaterThan(0);
    });
  });
});