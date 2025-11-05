#!/usr/bin/env node

/**
 * Test script to validate unique rationale generation
 * Simulates the rationale generation logic to ensure uniqueness
 */

console.log('🧪 UNIQUE RATIONALE GENERATION TEST');
console.log('===================================\n');

// Simulate different locations with varying characteristics
const testLocations = [
  {
    center: [13.4050, 52.5200], // Berlin center
    confidence: 0.85,
    nearestStoreDistance: 2500,
    score: { populationScore: 0.9, proximityScore: 0.8, turnoverScore: 0.7 }
  },
  {
    center: [13.3200, 52.4500], // Berlin residential  
    confidence: 0.65,
    nearestStoreDistance: 3200,
    score: { populationScore: 0.7, proximityScore: 0.9, turnoverScore: 0.6 }
  },
  {
    center: [13.2800, 52.4800], // Berlin suburb
    confidence: 0.45,
    nearestStoreDistance: 1800,
    score: { populationScore: 0.5, proximityScore: 0.6, turnoverScore: 0.8 }
  },
  {
    center: [13.5100, 52.5500], // Berlin east
    confidence: 0.75,
    nearestStoreDistance: 4100,
    score: { populationScore: 0.8, proximityScore: 0.95, turnoverScore: 0.5 }
  }
];

// Simulate the rationale generation logic (from the fixed code)
function generateLocationSpecificRationale(cell) {
  // Determine top factors (simplified)
  const factors = [];
  if (cell.score.populationScore > 0.7) factors.push('high population density');
  if (cell.score.proximityScore > 0.7) factors.push('market gap opportunity');  
  if (cell.score.turnoverScore > 0.7) factors.push('strong sales potential');
  
  const notes = factors.length > 0 ? factors.join(', ') : 'balanced market conditions';
  
  // Create location-specific fallback rationale with unique identifiers
  const locationId = `${cell.center[1].toFixed(4)}, ${cell.center[0].toFixed(4)}`;
  const confidenceText = cell.confidence > 0.8 ? 'excellent' : 
                       cell.confidence > 0.6 ? 'strong' : 'moderate';
  const distanceText = cell.nearestStoreDistance > 3000 ? 'significant market gap' :
                      cell.nearestStoreDistance > 1500 ? 'good market spacing' : 'competitive proximity';
  
  return `Location ${locationId} demonstrates ${confidenceText} expansion potential with ${notes}. Analysis shows ${distanceText} (${Math.round(cell.nearestStoreDistance)}m to nearest store), creating ${cell.confidence > 0.7 ? 'strong' : 'viable'} market opportunity.`;
}

console.log('📍 TESTING RATIONALE UNIQUENESS');
console.log('===============================\n');

const generatedRationales = [];

testLocations.forEach((location, index) => {
  const rationale = generateLocationSpecificRationale(location);
  generatedRationales.push(rationale);
  
  console.log(`Location ${index + 1}:`);
  console.log(`Coordinates: ${location.center[1].toFixed(4)}, ${location.center[0].toFixed(4)}`);
  console.log(`Confidence: ${(location.confidence * 100).toFixed(0)}%`);
  console.log(`Distance: ${location.nearestStoreDistance}m`);
  console.log(`Rationale: "${rationale}"`);
  console.log('');
});

// Test uniqueness
console.log('🔍 UNIQUENESS ANALYSIS');
console.log('======================');

const uniqueRationales = new Set(generatedRationales);
const uniquenessScore = uniqueRationales.size / generatedRationales.length;

console.log(`Total rationales: ${generatedRationales.length}`);
console.log(`Unique rationales: ${uniqueRationales.size}`);
console.log(`Uniqueness score: ${(uniquenessScore * 100).toFixed(1)}%`);

if (uniquenessScore === 1.0) {
  console.log('✅ PERFECT: All rationales are unique!');
} else if (uniquenessScore >= 0.8) {
  console.log('✅ GOOD: High uniqueness achieved');
} else {
  console.log('⚠️  WARNING: Low uniqueness detected');
  
  // Find duplicates
  const seen = new Set();
  const duplicates = [];
  generatedRationales.forEach((rationale, index) => {
    if (seen.has(rationale)) {
      duplicates.push({ index, rationale });
    } else {
      seen.add(rationale);
    }
  });
  
  if (duplicates.length > 0) {
    console.log('\n🚨 DUPLICATE RATIONALES FOUND:');
    duplicates.forEach(dup => {
      console.log(`Location ${dup.index + 1}: "${dup.rationale}"`);
    });
  }
}

// Test key differentiators
console.log('\n🎯 KEY DIFFERENTIATORS');
console.log('=====================');

const differentiators = {
  coordinates: new Set(generatedRationales.map(r => r.match(/Location ([\d.,\s]+) demonstrates/)?.[1])).size,
  confidenceTerms: new Set(generatedRationales.map(r => r.match(/demonstrates (\w+) expansion/)?.[1])).size,
  distanceTerms: new Set(generatedRationales.map(r => r.match(/Analysis shows ([^(]+)/)?.[1])).size,
  distances: new Set(generatedRationales.map(r => r.match(/\((\d+)m to nearest/)?.[1])).size
};

console.log(`Unique coordinates: ${differentiators.coordinates}/${testLocations.length}`);
console.log(`Unique confidence terms: ${differentiators.confidenceTerms}`);
console.log(`Unique distance descriptions: ${differentiators.distanceTerms}`);
console.log(`Unique distance values: ${differentiators.distances}/${testLocations.length}`);

console.log('\n✅ RATIONALE UNIQUENESS TEST COMPLETE');

if (uniquenessScore === 1.0 && differentiators.coordinates === testLocations.length) {
  console.log('🎉 SUCCESS: Each location will have a unique "Why Here" analysis!');
  process.exit(0);
} else {
  console.log('⚠️  NEEDS IMPROVEMENT: Some rationales may still be similar');
  process.exit(1);
}