#!/usr/bin/env node

/**
 * Test AI Indicators on Map
 * 
 * This script tests whether AI indicators (gold rings) are properly
 * showing up on expansion suggestions with AI analysis.
 */

console.log('🧪 Testing AI Indicators on Map');
console.log('===============================\n');

// Mock expansion generation to test AI indicators
function generateMockSuggestions(count = 10) {
  const suggestions = [];
  
  for (let i = 0; i < count; i++) {
    const isTopTier = i < Math.ceil(count * 0.2); // Top 20% get AI
    const confidence = Math.max(0.3, 0.95 - (i * 0.05));
    
    suggestions.push({
      id: `suggestion-${i + 1}`,
      lat: 52.5 + (Math.random() - 0.5) * 0.1,
      lng: 13.4 + (Math.random() - 0.5) * 0.1,
      settlementName: `Location ${i + 1}`,
      confidence: confidence,
      band: confidence > 0.8 ? 'HIGH' : confidence > 0.6 ? 'MEDIUM' : 'LOW',
      rationaleText: isTopTier ? 
        `AI-generated rationale for location ${i + 1} with detailed market analysis...` :
        `Deterministic rationale for location ${i + 1} based on standard metrics...`,
      hasAIAnalysis: isTopTier,
      aiProcessingRank: isTopTier ? i + 1 : undefined,
      status: 'NEW'
    });
  }
  
  return suggestions;
}

// Test the mock data
const suggestions = generateMockSuggestions(10);

console.log('📊 Generated Test Suggestions:');
console.log('==============================');

suggestions.forEach((suggestion, index) => {
  const aiIndicator = suggestion.hasAIAnalysis ? '🤖 AI' : '📊 STD';
  const confidencePercent = Math.round(suggestion.confidence * 100);
  
  console.log(`${index + 1}. ${suggestion.settlementName} - ${confidencePercent}% ${aiIndicator}`);
  console.log(`   Band: ${suggestion.band}, Rank: ${suggestion.aiProcessingRank || 'N/A'}`);
  console.log(`   Rationale: "${suggestion.rationaleText.substring(0, 60)}..."`);
  console.log('');
});

// Analyze AI distribution
const aiCount = suggestions.filter(s => s.hasAIAnalysis).length;
const totalCount = suggestions.length;
const aiPercentage = Math.round((aiCount / totalCount) * 100);

console.log('🎯 AI Analysis Distribution:');
console.log('============================');
console.log(`Total Suggestions: ${totalCount}`);
console.log(`AI-Enhanced: ${aiCount} (${aiPercentage}%)`);
console.log(`Deterministic: ${totalCount - aiCount} (${100 - aiPercentage}%)`);

// Test GeoJSON structure for map
console.log('\n🗺️ GeoJSON Structure Test:');
console.log('===========================');

const geojsonData = {
  type: 'FeatureCollection',
  features: suggestions.map(suggestion => ({
    type: 'Feature',
    properties: {
      id: suggestion.id,
      band: suggestion.band,
      confidence: suggestion.confidence,
      status: suggestion.status || 'NEW',
      hasAIAnalysis: suggestion.hasAIAnalysis || false,
      aiProcessingRank: suggestion.aiProcessingRank || null
    },
    geometry: {
      type: 'Point',
      coordinates: [suggestion.lng, suggestion.lat]
    }
  }))
};

console.log(`Generated ${geojsonData.features.length} GeoJSON features`);

// Check AI features specifically
const aiFeatures = geojsonData.features.filter(f => f.properties.hasAIAnalysis === true);
console.log(`AI Features: ${aiFeatures.length}`);

if (aiFeatures.length > 0) {
  console.log('\n🤖 AI Features Sample:');
  aiFeatures.slice(0, 3).forEach((feature, index) => {
    console.log(`${index + 1}. ID: ${feature.properties.id}`);
    console.log(`   hasAIAnalysis: ${feature.properties.hasAIAnalysis}`);
    console.log(`   aiProcessingRank: ${feature.properties.aiProcessingRank}`);
    console.log(`   coordinates: [${feature.geometry.coordinates.join(', ')}]`);
    console.log('');
  });
} else {
  console.log('❌ No AI features found - this indicates a problem!');
}

// Test MapLibre filter expressions
console.log('🔍 MapLibre Filter Test:');
console.log('========================');

// Test the filter that should show AI glow
const aiGlowFilter = ['==', ['get', 'hasAIAnalysis'], true];
console.log('AI Glow Filter:', JSON.stringify(aiGlowFilter));

// Simulate filter evaluation
const matchingFeatures = geojsonData.features.filter(feature => {
  return feature.properties.hasAIAnalysis === true;
});

console.log(`Filter matches ${matchingFeatures.length} features`);

if (matchingFeatures.length > 0) {
  console.log('✅ AI indicators should be visible on map');
  console.log('🔧 If rings are not showing, check:');
  console.log('   1. Layer ordering (glow should be behind main circles)');
  console.log('   2. Z-index conflicts');
  console.log('   3. Opacity settings');
  console.log('   4. Browser console for MapLibre errors');
} else {
  console.log('❌ No AI features to display - check data generation');
}

console.log('\n✅ AI Indicator Test Complete');
console.log('\n💡 Expected Behavior:');
console.log('   • Top 20% of suggestions should have gold rings');
console.log('   • Gold rings should be visible behind purple circles');
console.log('   • AI suggestions should have thicker gold strokes');
console.log('   • Hover should show "AI Analysis" in tooltip');