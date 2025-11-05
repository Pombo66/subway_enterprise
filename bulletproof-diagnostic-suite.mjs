#!/usr/bin/env node

/**
 * BULLETPROOF DIAGNOSTIC SUITE
 * Comprehensive testing to identify the exact root cause of duplicate AI responses
 */

console.log('🔬 BULLETPROOF DIAGNOSTIC SUITE');
console.log('===============================');
console.log('Comprehensive analysis to identify ALL potential issues\n');

// Test data representing different locations
const testLocations = [
  {
    id: 1, lat: 51.7606, lng: 14.3340, settlementName: 'Cottbus',
    estimatedPopulation: 99678, urbanDensityIndex: 0.65,
    rationale: { proximityGap: 14.2, turnoverGap: 0.75, population: 99678 }
  },
  {
    id: 2, lat: 52.1500, lng: 10.4000, settlementName: 'Salzgitter',
    estimatedPopulation: 104000, urbanDensityIndex: 0.58,
    rationale: { proximityGap: 18.5, turnoverGap: 0.68, population: 104000 }
  },
  {
    id: 3, lat: 49.2500, lng: 11.8000, settlementName: 'Rural Bavaria',
    estimatedPopulation: 8500, urbanDensityIndex: 0.15,
    rationale: { proximityGap: 25.3, turnoverGap: 0.45, population: 8500 }
  }
];

console.log('🧪 TEST 1: DEMOGRAPHIC DATA EXTRACTION');
console.log('======================================');

function extractDemographicData(suggestion) {
  const population = suggestion.estimatedPopulation || suggestion.rationale.population || 0;
  
  let incomeLevel = 'Unknown';
  if (suggestion.urbanDensityIndex > 0.7) {
    incomeLevel = 'High Urban - Above Average';
  } else if (suggestion.urbanDensityIndex > 0.4) {
    incomeLevel = 'Suburban - Average';
  } else if (suggestion.urbanDensityIndex > 0.2) {
    incomeLevel = 'Semi-Rural - Below Average';
  } else {
    incomeLevel = 'Rural - Lower';
  }

  let employmentRate;
  if (suggestion.urbanDensityIndex > 0.6) {
    employmentRate = 85 + Math.random() * 10;
  } else if (suggestion.urbanDensityIndex > 0.3) {
    employmentRate = 75 + Math.random() * 15;
  } else {
    employmentRate = 65 + Math.random() * 20;
  }

  return {
    population: Math.round(population),
    incomeLevel,
    employmentRate: Math.round(employmentRate),
    urbanDensity: suggestion.urbanDensityIndex,
    settlementName: suggestion.settlementName,
    proximityToStores: suggestion.rationale.proximityGap || 0,
    turnoverPotential: suggestion.rationale.turnoverGap || 0
  };
}

// Test demographic extraction
const demographics = testLocations.map(extractDemographicData);
console.log('Demographic extraction results:');
demographics.forEach((demo, index) => {
  console.log(`${index + 1}. ${demo.settlementName}:`);
  console.log(`   Population: ${demo.population.toLocaleString()}`);
  console.log(`   Income: ${demo.incomeLevel}`);
  console.log(`   Employment: ${demo.employmentRate}%`);
});

// Validate uniqueness
const populations = demographics.map(d => d.population);
const incomes = demographics.map(d => d.incomeLevel);
const employmentRates = demographics.map(d => d.employmentRate);

console.log(`\n✅ Unique populations: ${new Set(populations).size}/${populations.length}`);
console.log(`✅ Unique income levels: ${new Set(incomes).size}/${incomes.length}`);
console.log(`✅ Unique employment rates: ${new Set(employmentRates).size}/${employmentRates.length}`);

console.log('\n🧪 TEST 2: AI PROMPT GENERATION');
console.log('===============================');

function generateAIPrompt(location, demographics) {
  return `LOCATION DETAILS:
- Coordinates: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}
- Settlement: ${demographics.settlementName}
- Population: ${demographics.population.toLocaleString()}
- Income Level: ${demographics.incomeLevel}
- Employment Rate: ${demographics.employmentRate}%
- Urban Density: ${demographics.urbanDensity.toFixed(2)}
- Nearest Store Distance: ${demographics.proximityToStores}km

MARKET CONTEXT:
- Settlement Type: ${demographics.urbanDensity > 0.6 ? 'Urban Center' : demographics.urbanDensity > 0.3 ? 'Suburban Area' : 'Rural/Small Town'}
- Economic Profile: ${demographics.incomeLevel}
- Market Gap: ${demographics.proximityToStores}km (${demographics.proximityToStores > 20 ? 'Large' : demographics.proximityToStores > 10 ? 'Moderate' : 'Small'} gap)

Analyze this specific location for Subway expansion potential, focusing on the unique characteristics of ${demographics.settlementName}.`;
}

// Test prompt generation
const prompts = testLocations.map((location, index) => 
  generateAIPrompt(location, demographics[index])
);

console.log('AI Prompt uniqueness test:');
prompts.forEach((prompt, index) => {
  console.log(`${index + 1}. ${testLocations[index].settlementName}: "${prompt.substring(0, 100)}..."`);
});

const uniquePrompts = new Set(prompts);
console.log(`\n✅ Unique prompts: ${uniquePrompts.size}/${prompts.length} ${uniquePrompts.size === prompts.length ? '✅' : '❌'}`);

console.log('\n🧪 TEST 3: OBJECT CREATION AND REFERENCES');
console.log('=========================================');

// Simulate AI response creation (what should happen)
function createUniqueAIAnalysis(location, demographics) {
  // Create completely unique objects for each location
  return {
    marketAssessment: `${demographics.settlementName}, with ${demographics.population.toLocaleString()} residents and ${demographics.incomeLevel.toLowerCase()} income levels, presents ${demographics.urbanDensity > 0.5 ? 'strong' : 'moderate'} expansion potential. The ${demographics.proximityToStores}km distance to the nearest store creates a ${demographics.proximityToStores > 15 ? 'significant' : 'moderate'} market opportunity.`,
    
    competitiveAdvantages: [
      `No major competitors within ${demographics.proximityToStores}km radius`,
      `${demographics.urbanDensity > 0.5 ? 'High' : 'Moderate'} urban density of ${demographics.urbanDensity.toFixed(2)}`,
      `${demographics.employmentRate}% employment rate indicates ${demographics.employmentRate > 80 ? 'strong' : 'stable'} economic activity`
    ],
    
    riskFactors: [
      demographics.urbanDensity < 0.3 ? 'Lower population density may limit customer base' : 'Urban competition may increase over time',
      demographics.proximityToStores > 20 ? 'Large distance to existing stores may indicate market challenges' : 'Proximity to existing stores may create cannibalization risk'
    ],
    
    confidenceScore: Math.min(0.95, 0.5 + (demographics.urbanDensity * 0.3) + (demographics.employmentRate / 200)),
    
    // Add unique identifiers to detect sharing
    _uniqueId: `analysis_${location.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    _createdAt: new Date().toISOString(),
    _locationHash: `${location.lat}_${location.lng}_${demographics.population}`
  };
}

// Test object creation
const aiAnalyses = testLocations.map((location, index) => 
  createUniqueAIAnalysis(location, demographics[index])
);

console.log('AI Analysis object creation test:');
aiAnalyses.forEach((analysis, index) => {
  console.log(`${index + 1}. ${testLocations[index].settlementName}:`);
  console.log(`   Unique ID: ${analysis._uniqueId}`);
  console.log(`   Market Assessment: "${analysis.marketAssessment.substring(0, 80)}..."`);
  console.log(`   Confidence: ${analysis.confidenceScore.toFixed(2)}`);
});

// Test object reference uniqueness
console.log('\n🔍 Object Reference Uniqueness Test:');
let hasSharedReferences = false;
for (let i = 0; i < aiAnalyses.length; i++) {
  for (let j = i + 1; j < aiAnalyses.length; j++) {
    if (aiAnalyses[i] === aiAnalyses[j]) {
      console.log(`❌ SHARED REFERENCE: Analysis ${i+1} and ${j+1} are the same object!`);
      hasSharedReferences = true;
    }
    if (aiAnalyses[i].competitiveAdvantages === aiAnalyses[j].competitiveAdvantages) {
      console.log(`❌ SHARED ARRAY: Competitive advantages arrays are shared between ${i+1} and ${j+1}!`);
      hasSharedReferences = true;
    }
  }
}

if (!hasSharedReferences) {
  console.log('✅ All objects have unique references');
}

// Test content uniqueness
const marketAssessments = aiAnalyses.map(a => a.marketAssessment);
const uniqueAssessments = new Set(marketAssessments);
console.log(`✅ Unique market assessments: ${uniqueAssessments.size}/${marketAssessments.length} ${uniqueAssessments.size === marketAssessments.length ? '✅' : '❌'}`);

console.log('\n🧪 TEST 4: ENHANCED SUGGESTION CREATION');
console.log('======================================');

// Simulate the enhanced suggestion creation process
function createEnhancedSuggestion(location, demographics, aiAnalysis) {
  // This simulates what happens in the actual code
  const enhancedSuggestion = {
    ...location, // Spread original location
    rationaleText: `Strategic location analysis: ${demographics.settlementName} offers ${aiAnalysis.confidenceScore > 0.8 ? 'excellent' : 'good'} expansion potential with population of ${demographics.population.toLocaleString()} and proximity advantages.`,
    
    locationContext: aiAnalysis, // This could be the problem if aiAnalysis is shared!
    
    aiInsights: {
      marketPotential: aiAnalysis.marketAssessment,
      competitivePosition: `${demographics.settlementName} demonstrates ${aiAnalysis.confidenceScore > 0.8 ? 'strong' : 'moderate'} competitive positioning`,
      recommendations: aiAnalysis.competitiveAdvantages,
      confidenceLevel: aiAnalysis.confidenceScore > 0.8 ? 'HIGH' : aiAnalysis.confidenceScore > 0.6 ? 'MEDIUM' : 'LOW'
    },
    
    hasAIAnalysis: true,
    aiProcessingRank: location.id,
    
    // Add tracking for debugging
    _debugInfo: {
      originalLocationId: location.id,
      aiAnalysisId: aiAnalysis._uniqueId,
      createdAt: new Date().toISOString()
    }
  };
  
  return enhancedSuggestion;
}

// Create enhanced suggestions
const enhancedSuggestions = testLocations.map((location, index) => 
  createEnhancedSuggestion(location, demographics[index], aiAnalyses[index])
);

console.log('Enhanced suggestion creation test:');
enhancedSuggestions.forEach((suggestion, index) => {
  console.log(`${index + 1}. ${suggestion.settlementName}:`);
  console.log(`   Rationale: "${suggestion.rationaleText.substring(0, 60)}..."`);
  console.log(`   Market Potential: "${suggestion.aiInsights.marketPotential.substring(0, 60)}..."`);
  console.log(`   AI Analysis ID: ${suggestion._debugInfo.aiAnalysisId}`);
});

// Test enhanced suggestion uniqueness
console.log('\n🔍 Enhanced Suggestion Uniqueness Test:');
const rationaleTexts = enhancedSuggestions.map(s => s.rationaleText);
const marketPotentials = enhancedSuggestions.map(s => s.aiInsights.marketPotential);

console.log(`✅ Unique rationale texts: ${new Set(rationaleTexts).size}/${rationaleTexts.length}`);
console.log(`✅ Unique market potentials: ${new Set(marketPotentials).size}/${marketPotentials.length}`);

// Test for shared locationContext references
let hasSharedLocationContext = false;
for (let i = 0; i < enhancedSuggestions.length; i++) {
  for (let j = i + 1; j < enhancedSuggestions.length; j++) {
    if (enhancedSuggestions[i].locationContext === enhancedSuggestions[j].locationContext) {
      console.log(`❌ SHARED LOCATION CONTEXT: Suggestions ${i+1} and ${j+1} share locationContext object!`);
      hasSharedLocationContext = true;
    }
  }
}

if (!hasSharedLocationContext) {
  console.log('✅ All locationContext objects are unique');
}

console.log('\n🧪 TEST 5: JSON SERIALIZATION/DESERIALIZATION');
console.log('==============================================');

// Test JSON serialization (what happens when storing to database)
const serialized = JSON.stringify(enhancedSuggestions);
const deserialized = JSON.parse(serialized);

console.log(`Original suggestions: ${enhancedSuggestions.length}`);
console.log(`Serialized length: ${serialized.length} characters`);
console.log(`Deserialized suggestions: ${deserialized.length}`);

// Test if deserialization preserves uniqueness
const deserializedRationales = deserialized.map(s => s.rationaleText);
const deserializedMarketPotentials = deserialized.map(s => s.aiInsights.marketPotential);

console.log(`✅ Deserialized unique rationales: ${new Set(deserializedRationales).size}/${deserializedRationales.length}`);
console.log(`✅ Deserialized unique market potentials: ${new Set(deserializedMarketPotentials).size}/${deserializedMarketPotentials.length}`);

// Check if JSON serialization caused any data loss or duplication
let serializationIssues = false;
for (let i = 0; i < enhancedSuggestions.length; i++) {
  if (enhancedSuggestions[i].rationaleText !== deserialized[i].rationaleText) {
    console.log(`❌ SERIALIZATION ISSUE: Rationale text changed for suggestion ${i+1}`);
    serializationIssues = true;
  }
}

if (!serializationIssues) {
  console.log('✅ JSON serialization preserves data integrity');
}

console.log('\n🎯 DIAGNOSTIC SUMMARY');
console.log('====================');

const results = {
  demographicExtraction: new Set(populations).size === populations.length,
  promptUniqueness: uniquePrompts.size === prompts.length,
  objectReferences: !hasSharedReferences,
  contentUniqueness: uniqueAssessments.size === marketAssessments.length,
  enhancedSuggestionUniqueness: new Set(rationaleTexts).size === rationaleTexts.length,
  locationContextReferences: !hasSharedLocationContext,
  jsonSerialization: !serializationIssues
};

console.log('\n📊 TEST RESULTS:');
Object.entries(results).forEach(([test, passed]) => {
  console.log(`   ${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
});

const allPassed = Object.values(results).every(result => result);
console.log(`\n🎯 OVERALL RESULT: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

if (!allPassed) {
  console.log('\n🚨 FAILED TESTS INDICATE POTENTIAL ROOT CAUSES:');
  Object.entries(results).forEach(([test, passed]) => {
    if (!passed) {
      console.log(`   ❌ ${test} - This could be causing duplicate content`);
    }
  });
}

console.log('\n🔧 RECOMMENDED ACTIONS:');
if (!results.demographicExtraction) {
  console.log('   • Fix demographic data extraction to ensure unique data per location');
}
if (!results.promptUniqueness) {
  console.log('   • Enhance AI prompt generation to create more diverse prompts');
}
if (!results.objectReferences) {
  console.log('   • Implement deep cloning to prevent shared object references');
}
if (!results.contentUniqueness) {
  console.log('   • Increase AI temperature or add more location-specific context');
}
if (!results.enhancedSuggestionUniqueness) {
  console.log('   • Review enhanced suggestion creation logic for shared references');
}
if (!results.locationContextReferences) {
  console.log('   • Ensure locationContext objects are unique for each suggestion');
}
if (!results.jsonSerialization) {
  console.log('   • Review JSON serialization/deserialization process');
}

if (allPassed) {
  console.log('   ✅ All tests passed - the issue may be in the actual implementation');
  console.log('   ✅ Run the diagnostic logging in the real system to identify the problem');
}

console.log('\n🎯 This diagnostic suite tests all major potential root causes.');
console.log('Use the results to focus on the specific areas that need fixing.');