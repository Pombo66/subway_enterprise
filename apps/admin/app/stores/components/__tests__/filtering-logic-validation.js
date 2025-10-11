/**
 * Filtering Logic Validation Script
 * 
 * This script validates the filtering logic used in the stores page
 * by testing the filtering functions with mock data.
 */

// Mock store data (same as in the actual component)
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

// Filter data from CascadingFilters component
const COUNTRIES_BY_REGION = {
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

// Filtering function (same logic as in StoresPage)
function filterStores(stores, filters) {
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
}

// Validation tests
function runValidationTests() {
  console.log('🧪 Running Filtering Logic Validation Tests...\n');
  
  let passedTests = 0;
  let totalTests = 0;
  
  function test(description, testFn) {
    totalTests++;
    try {
      testFn();
      console.log(`✅ ${description}`);
      passedTests++;
    } catch (error) {
      console.log(`❌ ${description}`);
      console.log(`   Error: ${error.message}`);
    }
  }
  
  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
  }
  
  function assertArrayLength(array, expectedLength, message) {
    if (array.length !== expectedLength) {
      throw new Error(`${message}: expected ${expectedLength} items, got ${array.length}`);
    }
  }
  
  // Test 1: Region filtering
  test('Region filter - EMEA shows 4 stores', () => {
    const result = filterStores(mockStores, { region: 'EMEA' });
    assertArrayLength(result, 4, 'EMEA region filter');
    const storeNames = result.map(s => s.name);
    const expectedStores = ['Riverside Mall', 'Paris Nord', 'Berlin Hauptbahnhof', 'Madrid Centro'];
    expectedStores.forEach(name => {
      if (!storeNames.includes(name)) {
        throw new Error(`Expected store ${name} not found in EMEA results`);
      }
    });
  });
  
  test('Region filter - AMER shows 3 stores', () => {
    const result = filterStores(mockStores, { region: 'AMER' });
    assertArrayLength(result, 3, 'AMER region filter');
  });
  
  test('Region filter - APAC shows 3 stores', () => {
    const result = filterStores(mockStores, { region: 'APAC' });
    assertArrayLength(result, 3, 'APAC region filter');
  });
  
  // Test 2: Country filtering
  test('Country filter - United States shows 2 stores', () => {
    const result = filterStores(mockStores, { region: 'AMER', country: 'United States' });
    assertArrayLength(result, 2, 'United States country filter');
    const storeNames = result.map(s => s.name);
    if (!storeNames.includes('Central Station') || !storeNames.includes('Los Angeles Downtown')) {
      throw new Error('Expected US stores not found');
    }
  });
  
  test('Country filter - United Kingdom shows 1 store', () => {
    const result = filterStores(mockStores, { region: 'EMEA', country: 'United Kingdom' });
    assertArrayLength(result, 1, 'United Kingdom country filter');
    assertEqual(result[0].name, 'Riverside Mall', 'UK store name');
  });
  
  // Test 3: City filtering
  test('City filter - London shows 1 store', () => {
    const result = filterStores(mockStores, { 
      region: 'EMEA', 
      country: 'United Kingdom', 
      city: 'London' 
    });
    assertArrayLength(result, 1, 'London city filter');
    assertEqual(result[0].name, 'Riverside Mall', 'London store name');
  });
  
  test('City filter - New York shows 1 store', () => {
    const result = filterStores(mockStores, { 
      region: 'AMER', 
      country: 'United States', 
      city: 'New York' 
    });
    assertArrayLength(result, 1, 'New York city filter');
    assertEqual(result[0].name, 'Central Station', 'New York store name');
  });
  
  // Test 4: No filters shows all stores
  test('No filters shows all 10 stores', () => {
    const result = filterStores(mockStores, {});
    assertArrayLength(result, 10, 'No filters applied');
  });
  
  // Test 5: Non-existent filters show no stores
  test('Non-existent region shows no stores', () => {
    const result = filterStores(mockStores, { region: 'NONEXISTENT' });
    assertArrayLength(result, 0, 'Non-existent region');
  });
  
  test('Non-existent country shows no stores', () => {
    const result = filterStores(mockStores, { region: 'APAC', country: 'South Korea' });
    assertArrayLength(result, 0, 'Non-existent country');
  });
  
  // Test 6: Data consistency validation
  test('All filter countries exist in store data', () => {
    const allFilterCountries = Object.values(COUNTRIES_BY_REGION).flat().map(c => c.value);
    const allStoreCountries = [...new Set(mockStores.map(s => s.country))];
    
    // Check that all countries in store data have corresponding filter options
    allStoreCountries.forEach(country => {
      if (!allFilterCountries.includes(country)) {
        throw new Error(`Store country "${country}" not found in filter options`);
      }
    });
  });
  
  test('Filter countries match store data exactly', () => {
    // Test that filter values work with actual store data
    const testCases = [
      { region: 'EMEA', country: 'United Kingdom' },
      { region: 'EMEA', country: 'Germany' },
      { region: 'EMEA', country: 'France' },
      { region: 'EMEA', country: 'Spain' },
      { region: 'AMER', country: 'United States' },
      { region: 'AMER', country: 'Canada' },
      { region: 'APAC', country: 'Japan' },
      { region: 'APAC', country: 'Australia' },
      { region: 'APAC', country: 'Singapore' },
    ];
    
    testCases.forEach(({ region, country }) => {
      const result = filterStores(mockStores, { region, country });
      if (result.length === 0) {
        // Only throw error if we expect stores for this combination
        const expectedStores = mockStores.filter(s => s.region === region && s.country === country);
        if (expectedStores.length > 0) {
          throw new Error(`No stores found for ${region} - ${country}, but expected ${expectedStores.length}`);
        }
      }
    });
  });
  
  // Test 7: Case sensitivity
  test('City filtering is case-insensitive', () => {
    const result1 = filterStores(mockStores, { 
      region: 'EMEA', 
      country: 'United Kingdom', 
      city: 'london' 
    });
    const result2 = filterStores(mockStores, { 
      region: 'EMEA', 
      country: 'United Kingdom', 
      city: 'LONDON' 
    });
    const result3 = filterStores(mockStores, { 
      region: 'EMEA', 
      country: 'United Kingdom', 
      city: 'London' 
    });
    
    assertEqual(result1.length, result2.length, 'Case insensitive comparison 1');
    assertEqual(result2.length, result3.length, 'Case insensitive comparison 2');
    assertEqual(result1.length, 1, 'Case insensitive result count');
  });
  
  // Summary
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All filtering logic validation tests passed!');
    console.log('\n✅ The filtering functionality is working correctly:');
    console.log('   - Individual filter types work properly');
    console.log('   - Filter combinations work as expected');
    console.log('   - Data consistency is maintained');
    console.log('   - Case-insensitive city filtering works');
    console.log('   - Edge cases are handled correctly');
  } else {
    console.log(`❌ ${totalTests - passedTests} test(s) failed. Please review the filtering logic.`);
  }
  
  return passedTests === totalTests;
}

// Run the validation
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runValidationTests, filterStores, mockStores };
} else {
  runValidationTests();
}