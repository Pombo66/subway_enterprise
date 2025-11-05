#!/usr/bin/env node

/**
 * Test AI Demo Mode
 * 
 * This script tests the demo mode where AI indicators are shown
 * even without a valid OpenAI API key for visual testing.
 */

console.log('🎭 Testing AI Demo Mode');
console.log('======================\n');

// Simulate the expansion generation logic
function simulateExpansionGeneration(totalCandidates = 50) {
  const suggestions = [];
  const aiCandidates = Math.min(Math.ceil(totalCandidates * 0.2), 60); // Top 20%
  
  console.log(`📊 Generating ${totalCandidates} suggestions with ${aiCandidates} AI indicators`);
  
  for (let i = 0; i < totalCandidates; i++) {
    const isTopTier = i < aiCandidates;
    const confidence = Math.max(0.3, 0.95 - (i * 0.01) + (Math.random() - 0.5) * 0.1);
    
    // Simulate the logic from expansion-generation.service.ts
    let hasAIAnalysis = false;
    let rationaleType = '';
    
    const enableAIRationale = false; // Simulate no API key
    
    if (isTopTier && enableAIRationale) {
      // Real AI rationale (would require API key)
      hasAIAnalysis = true;
      rationaleType = '🤖 Real AI';
    } else if (isTopTier) {
      // DEMO MODE: Top 20% get AI indicators even without API key
      hasAIAnalysis = true;
      rationaleType = '🎭 Demo AI';
    } else {
      // Deterministic rationale
      hasAIAnalysis = false;
      rationaleType = '📊 Standard';
    }
    
    suggestions.push({
      id: `suggestion-${i + 1}`,
      rank: i + 1,
      confidence: Math.round(confidence * 100) / 100,
      hasAIAnalysis,
      rationaleType,
      isTopTier
    });
  }
  
  return suggestions;
}

// Test the simulation
const suggestions = simulateExpansionGeneration(50);

console.log('\n🎯 Results Analysis:');
console.log('===================');

const aiSuggestions = suggestions.filter(s => s.hasAIAnalysis);
const topTierSuggestions = suggestions.filter(s => s.isTopTier);

console.log(`Total Suggestions: ${suggestions.length}`);
console.log(`Top Tier (20%): ${topTierSuggestions.length}`);
console.log(`AI Indicators: ${aiSuggestions.length}`);
console.log(`AI Percentage: ${Math.round((aiSuggestions.length / suggestions.length) * 100)}%`);

console.log('\n🏆 Top 10 Suggestions:');
console.log('=====================');

suggestions.slice(0, 10).forEach(suggestion => {
  const indicator = suggestion.hasAIAnalysis ? '🟡' : '🟣';
  console.log(`${indicator} ${suggestion.id} - ${(suggestion.confidence * 100).toFixed(0)}% - ${suggestion.rationaleType}`);
});

console.log('\n🗺️ Map Layer Test:');
console.log('==================');

// Simulate GeoJSON features for map
const geoJsonFeatures = suggestions.slice(0, 10).map(suggestion => ({
  type: 'Feature',
  properties: {
    id: suggestion.id,
    hasAIAnalysis: suggestion.hasAIAnalysis,
    confidence: suggestion.confidence
  },
  geometry: {
    type: 'Point',
    coordinates: [13.4 + Math.random() * 0.1, 52.5 + Math.random() * 0.1]
  }
}));

const aiFeatures = geoJsonFeatures.filter(f => f.properties.hasAIAnalysis === true);

console.log(`Generated ${geoJsonFeatures.length} GeoJSON features`);
console.log(`AI Features: ${aiFeatures.length}`);

if (aiFeatures.length > 0) {
  console.log('\n🤖 AI Features for Map:');
  aiFeatures.forEach((feature, index) => {
    console.log(`${index + 1}. ${feature.properties.id} - hasAIAnalysis: ${feature.properties.hasAIAnalysis}`);
  });
  
  console.log('\n✅ Expected Map Behavior:');
  console.log('• Gold glow rings should appear behind AI features');
  console.log('• Gold strokes should be visible on AI suggestion borders');
  console.log('• AI features should be slightly larger than standard ones');
  console.log('• All suggestions should be purple (#8b5cf6)');
} else {
  console.log('\n❌ No AI features - rings will not appear');
}

console.log('\n🎭 Demo Mode Summary:');
console.log('====================');
console.log('✅ AI indicators enabled without API key');
console.log('✅ Top 20% of suggestions get gold rings');
console.log('✅ Visual distinction between AI and standard analysis');
console.log('✅ No actual AI API calls made (cost-free demo)');

console.log('\n💡 To see rings on map:');
console.log('1. Generate expansion suggestions');
console.log('2. Look for gold glows behind highest-confidence purple markers');
console.log('3. Check browser console for "🎭 DEMO AI indicator" logs');