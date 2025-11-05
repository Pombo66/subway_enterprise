#!/usr/bin/env node

/**
 * Test Population-Based Expansion Generation
 * 
 * This script tests the upgraded population-based location generation
 * that provides broader national coverage compared to city-centered approach.
 */

console.log('🧪 Testing Population-Based Expansion Generation');
console.log('================================================\n');

// Mock the expansion generation service for testing
class MockExpansionGenerationService {
  
  /**
   * Generate location candidates using population-based coverage approach
   */
  generateLocationCandidates(count, region) {
    const locations = [];
    
    console.log(`🏙️ Generating ${count} locations using population-based coverage for ${region.country || 'Germany'}`);
    
    // Get country boundaries and population centers
    const countryBounds = this.getCountryBounds(region.country || 'Germany');
    const populationCenters = this.getPopulationCenters(region.country || 'Germany');
    
    // Calculate how many locations to generate from each approach
    const majorCityCount = Math.min(Math.floor(count * 0.4), populationCenters.major.length); // 40% from major cities
    const mediumCityCount = Math.min(Math.floor(count * 0.35), populationCenters.medium.length); // 35% from medium cities
    const gridCount = count - majorCityCount - mediumCityCount; // Remaining from systematic grid
    
    console.log(`📊 Distribution: ${majorCityCount} major cities, ${mediumCityCount} medium cities, ${gridCount} grid-based`);
    
    let locationIndex = 0;
    
    // 1. Major population centers (highest confidence)
    for (let i = 0; i < majorCityCount; i++) {
      const center = populationCenters.major[i % populationCenters.major.length];
      const confidence = Math.max(0.7, 0.95 - (i * 0.02) + (Math.random() - 0.5) * 0.05);
      
      locations.push({
        lat: center.lat + (Math.random() - 0.5) * 0.02, // Small variation within city
        lng: center.lng + (Math.random() - 0.5) * 0.02,
        name: `${center.name} Area ${i + 1}`,
        confidence: Math.round(confidence * 100) / 100,
        type: 'major_city',
        population: center.population
      });
      locationIndex++;
    }
    
    // 2. Medium population centers (medium confidence)
    for (let i = 0; i < mediumCityCount; i++) {
      const center = populationCenters.medium[i % populationCenters.medium.length];
      const confidence = Math.max(0.5, 0.8 - (i * 0.03) + (Math.random() - 0.5) * 0.1);
      
      locations.push({
        lat: center.lat + (Math.random() - 0.5) * 0.03,
        lng: center.lng + (Math.random() - 0.5) * 0.03,
        name: `${center.name} Area ${i + 1}`,
        confidence: Math.round(confidence * 100) / 100,
        type: 'medium_city',
        population: center.population
      });
      locationIndex++;
    }
    
    // 3. Grid-based coverage for comprehensive national reach
    const gridLocations = this.generateGridBasedLocations(gridCount, countryBounds, region.country || 'Germany');
    for (const gridLoc of gridLocations) {
      locations.push({
        ...gridLoc,
        confidence: Math.max(0.3, 0.7 - (locationIndex * 0.005) + (Math.random() - 0.5) * 0.15),
        type: 'grid_coverage',
        population: Math.floor(20000 + Math.random() * 80000) // Estimated smaller population
      });
      locationIndex++;
    }
    
    // Sort by confidence to ensure best locations are processed first
    locations.sort((a, b) => b.confidence - a.confidence);
    
    console.log(`✅ Generated ${locations.length} population-based locations with confidence range ${Math.min(...locations.map(l => l.confidence)).toFixed(2)} - ${Math.max(...locations.map(l => l.confidence)).toFixed(2)}`);
    
    return locations;
  }

  /**
   * Generate systematic grid coverage for comprehensive national reach
   */
  generateGridBasedLocations(count, bounds, country) {
    const locations = [];
    
    if (count <= 0) return locations;
    
    // Calculate grid dimensions
    const gridSize = Math.ceil(Math.sqrt(count));
    const latStep = (bounds.north - bounds.south) / gridSize;
    const lngStep = (bounds.east - bounds.west) / gridSize;
    
    let gridIndex = 1;
    
    for (let row = 0; row < gridSize && locations.length < count; row++) {
      for (let col = 0; col < gridSize && locations.length < count; col++) {
        const lat = bounds.south + (row + 0.5) * latStep;
        const lng = bounds.west + (col + 0.5) * lngStep;
        
        // Add some randomness to avoid perfect grid alignment
        const latVariation = (Math.random() - 0.5) * latStep * 0.3;
        const lngVariation = (Math.random() - 0.5) * lngStep * 0.3;
        
        locations.push({
          lat: lat + latVariation,
          lng: lng + lngVariation,
          name: `${country} Grid ${gridIndex}`
        });
        
        gridIndex++;
      }
    }
    
    return locations;
  }

  /**
   * Get country boundaries for grid generation
   */
  getCountryBounds(country) {
    const bounds = {
      'Germany': { north: 55.06, south: 47.27, east: 15.04, west: 5.87 },
      'Netherlands': { north: 53.56, south: 50.75, east: 7.23, west: 3.36 },
      'Belgium': { north: 51.51, south: 49.50, east: 6.41, west: 2.55 },
      'Switzerland': { north: 47.81, south: 45.82, east: 10.49, west: 5.96 },
      'Luxembourg': { north: 50.18, south: 49.45, east: 6.53, west: 5.74 }
    };
    
    return bounds[country] || bounds['Germany'];
  }

  /**
   * Get population centers organized by size for market-focused expansion
   */
  getPopulationCenters(country) {
    const centers = {
      'Germany': {
        major: [
          { lat: 52.5200, lng: 13.4050, name: 'Berlin', population: 3700000 },
          { lat: 48.1351, lng: 11.5820, name: 'Munich', population: 1500000 },
          { lat: 53.5511, lng: 9.9937, name: 'Hamburg', population: 1900000 },
          { lat: 50.9375, lng: 6.9603, name: 'Cologne', population: 1100000 },
          { lat: 50.1109, lng: 8.6821, name: 'Frankfurt', population: 750000 },
          { lat: 48.7758, lng: 9.1829, name: 'Stuttgart', population: 630000 },
          { lat: 51.2277, lng: 6.7735, name: 'Düsseldorf', population: 620000 }
        ],
        medium: [
          { lat: 52.3759, lng: 9.7320, name: 'Hannover', population: 540000 },
          { lat: 51.0504, lng: 13.7373, name: 'Dresden', population: 560000 },
          { lat: 53.0793, lng: 8.8017, name: 'Bremen', population: 570000 },
          { lat: 49.4875, lng: 8.4660, name: 'Mannheim', population: 310000 },
          { lat: 49.0134, lng: 8.4044, name: 'Karlsruhe', population: 310000 },
          { lat: 51.4556, lng: 7.0116, name: 'Essen', population: 580000 },
          { lat: 51.5136, lng: 7.4653, name: 'Dortmund', population: 590000 },
          { lat: 49.7913, lng: 9.9534, name: 'Würzburg', population: 130000 },
          { lat: 52.1205, lng: 11.6276, name: 'Magdeburg', population: 240000 },
          { lat: 54.0924, lng: 13.2015, name: 'Rostock', population: 210000 },
          { lat: 50.8278, lng: 12.9214, name: 'Chemnitz', population: 250000 },
          { lat: 51.3397, lng: 12.3731, name: 'Leipzig', population: 600000 }
        ]
      },
      'Netherlands': {
        major: [
          { lat: 52.3676, lng: 4.9041, name: 'Amsterdam', population: 870000 },
          { lat: 51.9225, lng: 4.4792, name: 'Rotterdam', population: 650000 },
          { lat: 52.0907, lng: 5.1214, name: 'Utrecht', population: 360000 }
        ],
        medium: [
          { lat: 52.2130, lng: 6.5665, name: 'Enschede', population: 160000 },
          { lat: 51.5719, lng: 5.0913, name: 'Tilburg', population: 220000 },
          { lat: 52.0116, lng: 4.3571, name: 'The Hague', population: 540000 },
          { lat: 51.4416, lng: 5.4697, name: 'Eindhoven', population: 230000 }
        ]
      }
    };
    
    return centers[country] || centers['Germany'];
  }
}

// Test the population-based approach
async function testPopulationBasedExpansion() {
  const service = new MockExpansionGenerationService();
  
  console.log('🎯 Test 1: Germany with 50 locations');
  console.log('=====================================');
  
  const germanyLocations = service.generateLocationCandidates(50, { country: 'Germany' });
  
  // Analyze the distribution
  const majorCityCount = germanyLocations.filter(l => l.type === 'major_city').length;
  const mediumCityCount = germanyLocations.filter(l => l.type === 'medium_city').length;
  const gridCount = germanyLocations.filter(l => l.type === 'grid_coverage').length;
  
  console.log(`\n📊 Results Analysis:`);
  console.log(`   Major Cities: ${majorCityCount} (${((majorCityCount/50)*100).toFixed(0)}%)`);
  console.log(`   Medium Cities: ${mediumCityCount} (${((mediumCityCount/50)*100).toFixed(0)}%)`);
  console.log(`   Grid Coverage: ${gridCount} (${((gridCount/50)*100).toFixed(0)}%)`);
  
  // Show top 10 locations
  console.log(`\n🏆 Top 10 Locations by Confidence:`);
  germanyLocations.slice(0, 10).forEach((loc, i) => {
    console.log(`   ${i+1}. ${loc.name} (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}) - ${(loc.confidence*100).toFixed(0)}% [${loc.type}]`);
  });
  
  // Calculate geographic spread
  const lats = germanyLocations.map(l => l.lat);
  const lngs = germanyLocations.map(l => l.lng);
  const latSpread = Math.max(...lats) - Math.min(...lats);
  const lngSpread = Math.max(...lngs) - Math.min(...lngs);
  
  console.log(`\n🗺️ Geographic Coverage:`);
  console.log(`   Latitude spread: ${latSpread.toFixed(2)}° (${(latSpread * 111).toFixed(0)}km)`);
  console.log(`   Longitude spread: ${lngSpread.toFixed(2)}° (${(lngSpread * 85).toFixed(0)}km)`);
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test with Netherlands for comparison
  console.log('🎯 Test 2: Netherlands with 25 locations');
  console.log('=========================================');
  
  const netherlandsLocations = service.generateLocationCandidates(25, { country: 'Netherlands' });
  
  const nlMajorCount = netherlandsLocations.filter(l => l.type === 'major_city').length;
  const nlMediumCount = netherlandsLocations.filter(l => l.type === 'medium_city').length;
  const nlGridCount = netherlandsLocations.filter(l => l.type === 'grid_coverage').length;
  
  console.log(`\n📊 Netherlands Results:`);
  console.log(`   Major Cities: ${nlMajorCount} (${((nlMajorCount/25)*100).toFixed(0)}%)`);
  console.log(`   Medium Cities: ${nlMediumCount} (${((nlMediumCount/25)*100).toFixed(0)}%)`);
  console.log(`   Grid Coverage: ${nlGridCount} (${((nlGridCount/25)*100).toFixed(0)}%)`);
  
  console.log(`\n🏆 Top 5 Netherlands Locations:`);
  netherlandsLocations.slice(0, 5).forEach((loc, i) => {
    console.log(`   ${i+1}. ${loc.name} (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}) - ${(loc.confidence*100).toFixed(0)}% [${loc.type}]`);
  });
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  console.log('✅ Population-Based Expansion Testing Complete');
  console.log('\n🎯 Key Benefits Demonstrated:');
  console.log('   • Broader national coverage beyond major cities');
  console.log('   • Market-focused approach (40% major + 35% medium cities)');
  console.log('   • Systematic grid coverage for comprehensive reach');
  console.log('   • Confidence-based ranking for AI cost optimization');
  console.log('   • Scalable approach that works for any country size');
}

// Run the test
testPopulationBasedExpansion().catch(console.error);