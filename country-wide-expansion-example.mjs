#!/usr/bin/env node

/**
 * Example of true country-wide expansion analysis
 */

class CountryWideExpansionService {
  
  // Country bounding boxes for grid generation
  getCountryBounds(country) {
    const bounds = {
      'Germany': {
        north: 55.0584, south: 47.2701, 
        east: 15.0419, west: 5.8663,
        name: 'Germany'
      },
      'Netherlands': {
        north: 53.5104, south: 50.7503,
        east: 7.0929, west: 3.3316,
        name: 'Netherlands'  
      },
      'Belgium': {
        north: 51.4750, south: 49.4969,
        east: 6.4078, west: 2.5447,
        name: 'Belgium'
      }
    };
    
    return bounds[country] || bounds['Germany'];
  }

  // Generate systematic grid across country
  generateCountryWideGrid(country, targetCount) {
    const bounds = this.getCountryBounds(country);
    const locations = [];
    
    // Calculate grid dimensions
    const latRange = bounds.north - bounds.south;
    const lngRange = bounds.east - bounds.west;
    
    // Determine grid size (roughly square grid)
    const gridSize = Math.ceil(Math.sqrt(targetCount));
    const latStep = latRange / gridSize;
    const lngStep = lngRange / gridSize;
    
    console.log(`🗺️ Generating ${gridSize}x${gridSize} grid for ${country}`);
    console.log(`   Bounds: ${bounds.south.toFixed(2)}°N to ${bounds.north.toFixed(2)}°N, ${bounds.west.toFixed(2)}°E to ${bounds.east.toFixed(2)}°E`);
    
    let locationCount = 0;
    
    for (let i = 0; i < gridSize && locationCount < targetCount; i++) {
      for (let j = 0; j < gridSize && locationCount < targetCount; j++) {
        const lat = bounds.south + (i + 0.5) * latStep;
        const lng = bounds.west + (j + 0.5) * lngStep;
        
        // Add some randomization to avoid perfect grid
        const latJitter = (Math.random() - 0.5) * latStep * 0.3;
        const lngJitter = (Math.random() - 0.5) * lngStep * 0.3;
        
        const finalLat = lat + latJitter;
        const finalLng = lng + lngJitter;
        
        // Generate confidence based on distance from major cities
        const confidence = this.calculateLocationConfidence(finalLat, finalLng, country);
        
        locations.push({
          id: `grid-${i}-${j}`,
          lat: finalLat,
          lng: finalLng,
          name: `${country} Grid ${i+1}-${j+1}`,
          confidence: confidence,
          type: 'grid-based',
          gridPosition: { row: i, col: j }
        });
        
        locationCount++;
      }
    }
    
    return locations;
  }

  // Calculate confidence based on proximity to population centers
  calculateLocationConfidence(lat, lng, country) {
    // Major population centers by country
    const populationCenters = {
      'Germany': [
        { lat: 52.5200, lng: 13.4050, population: 3700000 }, // Berlin
        { lat: 48.1351, lng: 11.5820, population: 1500000 }, // Munich
        { lat: 50.1109, lng: 8.6821, population: 750000 },  // Frankfurt
        { lat: 53.5511, lng: 9.9937, population: 1900000 }, // Hamburg
        { lat: 51.2277, lng: 6.7735, population: 650000 }   // Düsseldorf
      ],
      'Netherlands': [
        { lat: 52.3676, lng: 4.9041, population: 900000 },  // Amsterdam
        { lat: 51.9225, lng: 4.4792, population: 650000 },  // Rotterdam
        { lat: 52.0907, lng: 5.1214, population: 360000 }   // Utrecht
      ]
    };
    
    const centers = populationCenters[country] || populationCenters['Germany'];
    let maxScore = 0;
    
    for (const center of centers) {
      // Calculate distance in degrees (rough approximation)
      const distance = Math.sqrt(
        Math.pow(lat - center.lat, 2) + 
        Math.pow(lng - center.lng, 2)
      );
      
      // Score based on inverse distance and population
      const populationWeight = Math.log(center.population / 100000);
      const distanceScore = Math.max(0, 1 - (distance / 2)); // 2 degrees = ~200km
      const score = distanceScore * populationWeight * 0.2;
      
      maxScore = Math.max(maxScore, score);
    }
    
    // Add base confidence and randomization
    const baseConfidence = 0.3 + maxScore;
    const randomFactor = (Math.random() - 0.5) * 0.2;
    
    return Math.max(0.2, Math.min(0.95, baseConfidence + randomFactor));
  }

  // Alternative: Population-density based sampling
  generatePopulationBasedLocations(country, targetCount) {
    // This would use real population density data
    // For demo, we'll simulate it
    console.log(`📊 Generating population-density based locations for ${country}`);
    
    const bounds = this.getCountryBounds(country);
    const locations = [];
    
    // Simulate population density hotspots
    const densityHotspots = this.getPopulationHotspots(country);
    
    for (let i = 0; i < targetCount; i++) {
      // Weighted random selection based on population density
      const hotspot = this.selectWeightedHotspot(densityHotspots);
      
      // Generate location near hotspot
      const latOffset = (Math.random() - 0.5) * hotspot.radius;
      const lngOffset = (Math.random() - 0.5) * hotspot.radius;
      
      const lat = hotspot.lat + latOffset;
      const lng = hotspot.lng + lngOffset;
      
      // Ensure within country bounds
      const clampedLat = Math.max(bounds.south, Math.min(bounds.north, lat));
      const clampedLng = Math.max(bounds.west, Math.min(bounds.east, lng));
      
      locations.push({
        id: `pop-${i}`,
        lat: clampedLat,
        lng: clampedLng,
        name: `${hotspot.name} Area ${i + 1}`,
        confidence: hotspot.density * 0.8 + Math.random() * 0.2,
        type: 'population-based',
        nearestCity: hotspot.name
      });
    }
    
    return locations;
  }

  getPopulationHotspots(country) {
    const hotspots = {
      'Germany': [
        { lat: 52.5200, lng: 13.4050, name: 'Berlin', density: 0.9, radius: 0.5 },
        { lat: 48.1351, lng: 11.5820, name: 'Munich', density: 0.85, radius: 0.3 },
        { lat: 50.1109, lng: 8.6821, name: 'Frankfurt', density: 0.8, radius: 0.25 },
        { lat: 53.5511, lng: 9.9937, name: 'Hamburg', density: 0.85, radius: 0.3 },
        { lat: 51.2277, lng: 6.7735, name: 'Düsseldorf', density: 0.75, radius: 0.2 },
        { lat: 50.9375, lng: 6.9603, name: 'Cologne', density: 0.8, radius: 0.25 },
        { lat: 48.7758, lng: 9.1829, name: 'Stuttgart', density: 0.7, radius: 0.2 }
      ]
    };
    
    return hotspots[country] || hotspots['Germany'];
  }

  selectWeightedHotspot(hotspots) {
    const totalWeight = hotspots.reduce((sum, h) => sum + h.density, 0);
    let random = Math.random() * totalWeight;
    
    for (const hotspot of hotspots) {
      random -= hotspot.density;
      if (random <= 0) {
        return hotspot;
      }
    }
    
    return hotspots[0]; // Fallback
  }
}

// Test both approaches
async function testCountryWideApproaches() {
  console.log('🧪 Testing Country-Wide Expansion Approaches\n');
  
  const service = new CountryWideExpansionService();
  const country = 'Germany';
  const targetCount = 20;
  
  console.log('📊 Approach 1: Systematic Grid Coverage');
  const gridLocations = service.generateCountryWideGrid(country, targetCount);
  
  console.log(`   Generated ${gridLocations.length} grid-based locations:`);
  gridLocations.slice(0, 5).forEach((loc, i) => {
    console.log(`   ${i + 1}. ${loc.name} (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}) - ${(loc.confidence * 100).toFixed(0)}%`);
  });
  
  console.log('\n📊 Approach 2: Population-Density Based');
  const popLocations = service.generatePopulationBasedLocations(country, targetCount);
  
  console.log(`   Generated ${popLocations.length} population-based locations:`);
  popLocations.slice(0, 5).forEach((loc, i) => {
    console.log(`   ${i + 1}. ${loc.name} (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}) - ${(loc.confidence * 100).toFixed(0)}%`);
  });
  
  console.log('\n🎯 Coverage Comparison:');
  
  // Calculate coverage spread
  const gridSpread = calculateSpread(gridLocations);
  const popSpread = calculateSpread(popLocations);
  
  console.log(`   Grid approach: ${gridSpread.toFixed(2)}° average spread (more uniform)`);
  console.log(`   Population approach: ${popSpread.toFixed(2)}° average spread (clustered around cities)`);
  
  console.log('\n📋 Recommendations:');
  console.log('   🏙️  Grid Approach: Best for comprehensive national coverage');
  console.log('   👥 Population Approach: Best for market-driven expansion');
  console.log('   🎯 Current City-Based: Best for quick major-city analysis');
}

function calculateSpread(locations) {
  if (locations.length < 2) return 0;
  
  let totalDistance = 0;
  let comparisons = 0;
  
  for (let i = 0; i < locations.length; i++) {
    for (let j = i + 1; j < locations.length; j++) {
      const distance = Math.sqrt(
        Math.pow(locations[i].lat - locations[j].lat, 2) +
        Math.pow(locations[i].lng - locations[j].lng, 2)
      );
      totalDistance += distance;
      comparisons++;
    }
  }
  
  return totalDistance / comparisons;
}

// Run the test
testCountryWideApproaches()
  .then(() => {
    console.log('\n✅ Country-wide analysis approaches demonstrated');
  })
  .catch(error => {
    console.error('Test failed:', error);
  });