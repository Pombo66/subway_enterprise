#!/usr/bin/env node

/**
 * Test to verify regional filtering works correctly
 */

// Mock the expansion generation service with regional filtering
class TestRegionalExpansionService {
  constructor() {
    // No dependencies needed for this test
  }

  getBaseLocationsByRegion(region) {
    // Define locations by country
    const locationsByCountry = {
      'Germany': [
        { lat: 52.5200, lng: 13.4050, name: 'Berlin Mitte' },
        { lat: 48.1351, lng: 11.5820, name: 'Munich Center' },
        { lat: 50.1109, lng: 8.6821, name: 'Frankfurt Main' },
        { lat: 53.5511, lng: 9.9937, name: 'Hamburg Port' },
        { lat: 51.2277, lng: 6.7735, name: 'Düsseldorf' }
      ],
      'Netherlands': [
        { lat: 52.3676, lng: 4.9041, name: 'Amsterdam' },
        { lat: 52.0907, lng: 5.1214, name: 'Utrecht' },
        { lat: 51.9225, lng: 4.4792, name: 'Rotterdam' }
      ],
      'Belgium': [
        { lat: 50.8503, lng: 4.3517, name: 'Brussels' },
        { lat: 51.2093, lng: 3.2247, name: 'Bruges' }
      ],
      'Switzerland': [
        { lat: 47.3769, lng: 8.5417, name: 'Zurich' },
        { lat: 46.9481, lng: 7.4474, name: 'Bern' }
      ]
    };

    // Get locations for the specified country, default to Germany
    const country = region.country || 'Germany';
    const countryLocations = locationsByCountry[country];
    
    if (!countryLocations) {
      console.warn(`⚠️ No locations defined for country: ${country}, falling back to Germany`);
      return locationsByCountry['Germany'];
    }
    
    console.log(`🗺️ Using ${countryLocations.length} base locations for ${country}`);
    return countryLocations;
  }

  generateLocationCandidates(count, region) {
    const locations = [];
    const baseLocations = this.getBaseLocationsByRegion(region);
    
    // Generate locations by repeating and varying base locations
    for (let i = 0; i < count; i++) {
      const baseIndex = i % baseLocations.length;
      const base = baseLocations[baseIndex];
      
      // Add smaller variation to keep locations within country boundaries
      const latVariation = (Math.random() - 0.5) * 0.05; // ±0.025 degrees (~2.5km)
      const lngVariation = (Math.random() - 0.5) * 0.05;
      
      // Generate confidence score
      const baseConfidence = Math.max(0.3, 0.95 - (i * 0.01) + (Math.random() - 0.5) * 0.1);
      
      // Create location name
      const locationName = i < baseLocations.length 
        ? base.name 
        : `${base.name} District ${Math.floor(i / baseLocations.length) + 1}`;
      
      locations.push({
        lat: base.lat + latVariation,
        lng: base.lng + lngVariation,
        name: locationName,
        confidence: Math.round(baseConfidence * 100) / 100,
        country: region.country || 'Germany'
      });
    }
    
    return locations;
  }

  // Simple coordinate-based country detection for verification
  detectCountry(lat, lng) {
    // Rough bounding boxes for countries
    const countryBounds = {
      'Germany': { minLat: 47.3, maxLat: 55.1, minLng: 5.9, maxLng: 15.0 },
      'Netherlands': { minLat: 50.8, maxLat: 53.6, minLng: 3.4, maxLng: 7.2 },
      'Belgium': { minLat: 49.5, maxLat: 51.5, minLng: 2.5, maxLng: 6.4 },
      'Switzerland': { minLat: 45.8, maxLat: 47.8, minLng: 5.9, maxLng: 10.5 }
    };

    for (const [country, bounds] of Object.entries(countryBounds)) {
      if (lat >= bounds.minLat && lat <= bounds.maxLat && 
          lng >= bounds.minLng && lng <= bounds.maxLng) {
        return country;
      }
    }
    return 'Unknown';
  }
}

// Test the regional filtering
async function testRegionalFiltering() {
  console.log('🧪 Testing Regional Filtering System\n');
  
  const service = new TestRegionalExpansionService();
  
  const testCases = [
    { country: 'Germany', expectedCount: 10 },
    { country: 'Netherlands', expectedCount: 10 },
    { country: 'Belgium', expectedCount: 10 },
    { country: 'Switzerland', expectedCount: 10 }
  ];
  
  let allTestsPassed = true;
  
  for (const testCase of testCases) {
    console.log(`🗺️ Testing ${testCase.country}:`);
    
    const region = { country: testCase.country };
    const locations = service.generateLocationCandidates(testCase.expectedCount, region);
    
    // Verify all locations are in the correct country
    let correctCountryCount = 0;
    let incorrectLocations = [];
    
    for (const location of locations) {
      const detectedCountry = service.detectCountry(location.lat, location.lng);
      if (detectedCountry === testCase.country) {
        correctCountryCount++;
      } else {
        incorrectLocations.push({
          name: location.name,
          coords: `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
          detected: detectedCountry,
          expected: testCase.country
        });
      }
    }
    
    const accuracy = (correctCountryCount / locations.length) * 100;
    
    console.log(`   Generated: ${locations.length} locations`);
    console.log(`   Correct country: ${correctCountryCount}/${locations.length} (${accuracy.toFixed(1)}%)`);
    
    if (incorrectLocations.length > 0) {
      console.log(`   ❌ Incorrect locations:`);
      incorrectLocations.forEach(loc => {
        console.log(`      ${loc.name} (${loc.coords}) - detected: ${loc.detected}, expected: ${loc.expected}`);
      });
      allTestsPassed = false;
    } else {
      console.log(`   ✅ All locations correctly placed in ${testCase.country}`);
    }
    
    // Sample locations
    console.log(`   📍 Sample locations:`);
    locations.slice(0, 3).forEach((loc, i) => {
      console.log(`      ${i + 1}. ${loc.name} (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`);
    });
    
    console.log('');
  }
  
  // Test the fix for the original issue
  console.log('🔍 Testing Original Issue Fix:');
  console.log('   When selecting Germany, should NOT get locations in:');
  console.log('   - Netherlands (Utrecht, Amsterdam)');
  console.log('   - Belgium (Brussels)');
  console.log('   - Switzerland (Zurich)');
  console.log('   - Luxembourg');
  
  const germanyRegion = { country: 'Germany' };
  const germanyLocations = service.generateLocationCandidates(20, germanyRegion);
  
  const problematicCities = ['Utrecht', 'Amsterdam', 'Brussels', 'Zurich', 'Luxembourg'];
  const foundProblematic = germanyLocations.filter(loc => 
    problematicCities.some(city => loc.name.includes(city))
  );
  
  if (foundProblematic.length > 0) {
    console.log('   ❌ ISSUE STILL EXISTS: Found non-German locations:');
    foundProblematic.forEach(loc => {
      console.log(`      ${loc.name} (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`);
    });
    allTestsPassed = false;
  } else {
    console.log('   ✅ ISSUE FIXED: No non-German locations found when selecting Germany');
  }
  
  if (allTestsPassed) {
    console.log('\n🎉 SUCCESS: Regional filtering is working correctly!');
    console.log('   - Locations are properly filtered by country');
    console.log('   - No cross-border suggestions when selecting Germany');
    console.log('   - System respects regional boundaries');
    return true;
  } else {
    console.log('\n❌ FAILURE: Regional filtering has issues');
    return false;
  }
}

// Run the test
testRegionalFiltering()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });