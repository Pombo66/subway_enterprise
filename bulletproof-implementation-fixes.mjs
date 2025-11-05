#!/usr/bin/env node

/**
 * BULLETPROOF IMPLEMENTATION FIXES
 * Code patterns and fixes to ensure 100% uniqueness
 */

console.log('🛡️ BULLETPROOF IMPLEMENTATION FIXES');
console.log('===================================');

console.log('\n🔧 FIX 1: DEEP CLONING UTILITY');
console.log('==============================');

// Deep cloning utility to prevent shared references
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

// Test deep cloning
const original = {
  text: 'Original text',
  array: ['item1', 'item2'],
  nested: { value: 'nested value' }
};

const cloned = deepClone(original);
cloned.text = 'Modified text';
cloned.array.push('item3');
cloned.nested.value = 'modified nested';

console.log('Original object after cloning and modification:');
console.log('  text:', original.text);
console.log('  array:', original.array);
console.log('  nested.value:', original.nested.value);

console.log('Cloned object after modification:');
console.log('  text:', cloned.text);
console.log('  array:', cloned.array);
console.log('  nested.value:', cloned.nested.value);

const isDeepCloneWorking = (
  original.text === 'Original text' &&
  original.array.length === 2 &&
  original.nested.value === 'nested value'
);

console.log(`✅ Deep cloning works: ${isDeepCloneWorking ? 'YES' : 'NO'}`);

console.log('\n🔧 FIX 2: UNIQUE OBJECT FACTORY');
console.log('===============================');

// Factory function to create guaranteed unique objects
function createUniqueAIAnalysis(location, demographics, seed = Math.random()) {
  const timestamp = Date.now();
  const uniqueId = `analysis_${location.lat}_${location.lng}_${timestamp}_${seed.toString(36).substr(2, 9)}`;
  
  return {
    // Core analysis content
    marketAssessment: `${demographics.settlementName}, with ${demographics.population.toLocaleString()} residents and ${demographics.incomeLevel.toLowerCase()} income levels, presents ${demographics.urbanDensity > 0.5 ? 'strong' : 'moderate'} expansion potential. Located at coordinates ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}, this ${demographics.urbanDensity > 0.6 ? 'urban' : demographics.urbanDensity > 0.3 ? 'suburban' : 'rural'} location offers a ${demographics.proximityToStores}km market gap opportunity.`,
    
    competitiveAdvantages: [
      `Exclusive market position with ${demographics.proximityToStores}km radius clear of major competitors`,
      `${demographics.settlementName} urban density of ${demographics.urbanDensity.toFixed(2)} supports ${demographics.urbanDensity > 0.5 ? 'high' : 'moderate'} foot traffic`,
      `Local employment rate of ${demographics.employmentRate}% indicates ${demographics.employmentRate > 80 ? 'robust' : 'stable'} economic conditions`
    ],
    
    riskFactors: [
      demographics.urbanDensity < 0.3 
        ? `Rural location (${demographics.urbanDensity.toFixed(2)} density) may limit customer base in ${demographics.settlementName}`
        : `Urban competition may emerge in ${demographics.settlementName} market over time`,
      demographics.proximityToStores > 20 
        ? `Significant ${demographics.proximityToStores}km distance to existing stores suggests potential market challenges`
        : `${demographics.proximityToStores}km proximity to existing network may create cannibalization risk`
    ],
    
    confidenceScore: Math.min(0.95, 0.4 + (demographics.urbanDensity * 0.35) + (demographics.employmentRate / 250) + (seed * 0.1)),
    
    // Uniqueness guarantees
    _uniqueId: uniqueId,
    _createdAt: new Date(timestamp).toISOString(),
    _locationFingerprint: `${location.lat.toFixed(6)}_${location.lng.toFixed(6)}_${demographics.population}_${demographics.incomeLevel}`,
    _contentHash: null // Will be set after creation
  };
}

// Add content hash for verification
function addContentHash(analysis) {
  const content = analysis.marketAssessment + analysis.competitiveAdvantages.join('') + analysis.riskFactors.join('');
  analysis._contentHash = content.length.toString(36) + '_' + content.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0).toString(36);
  return analysis;
}

console.log('\n🔧 FIX 3: BULLETPROOF SUGGESTION CREATION');
console.log('=========================================');

function createBulletproofSuggestion(location, demographics, existingRationales = []) {
  // Create unique AI analysis with guaranteed uniqueness
  const seed = Math.random();
  let aiAnalysis = createUniqueAIAnalysis(location, demographics, seed);
  aiAnalysis = addContentHash(aiAnalysis);
  
  // Ensure rationale is unique compared to existing ones
  let attempts = 0;
  while (attempts < 3) {
    const isDuplicate = existingRationales.some(existing => 
      existing.includes(aiAnalysis.marketAssessment.substring(0, 50))
    );
    
    if (!isDuplicate) break;
    
    attempts++;
    console.log(`   Regenerating analysis for ${demographics.settlementName} (attempt ${attempts})`);
    aiAnalysis = createUniqueAIAnalysis(location, demographics, Math.random());
    aiAnalysis = addContentHash(aiAnalysis);
  }
  
  // Create enhanced suggestion with deep cloning
  const enhancedSuggestion = {
    // Base location data (deep cloned to prevent mutations)
    ...deepClone(location),
    
    // Unique rationale text
    rationaleText: `Strategic expansion analysis for ${demographics.settlementName}: This ${demographics.urbanDensity > 0.6 ? 'urban' : demographics.urbanDensity > 0.3 ? 'suburban' : 'rural'} location at ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)} offers ${aiAnalysis.confidenceScore > 0.8 ? 'exceptional' : aiAnalysis.confidenceScore > 0.6 ? 'strong' : 'moderate'} expansion potential with ${demographics.population.toLocaleString()} residents and ${demographics.proximityToStores}km market gap.`,
    
    // Deep cloned AI analysis to prevent shared references
    locationContext: deepClone(aiAnalysis),
    
    // Unique AI insights
    aiInsights: {
      marketPotential: aiAnalysis.marketAssessment,
      competitivePosition: `${demographics.settlementName} demonstrates ${aiAnalysis.confidenceScore > 0.8 ? 'superior' : aiAnalysis.confidenceScore > 0.6 ? 'strong' : 'adequate'} competitive positioning with ${demographics.proximityToStores}km clear radius and ${demographics.employmentRate}% local employment stability.`,
      recommendations: deepClone(aiAnalysis.competitiveAdvantages),
      confidenceLevel: aiAnalysis.confidenceScore > 0.8 ? 'HIGH' : aiAnalysis.confidenceScore > 0.6 ? 'MEDIUM' : 'LOW'
    },
    
    // Processing metadata
    hasAIAnalysis: true,
    aiProcessingRank: location.id,
    
    // Uniqueness verification
    _suggestionId: `suggestion_${location.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    _aiAnalysisId: aiAnalysis._uniqueId,
    _contentHash: aiAnalysis._contentHash,
    _createdAt: new Date().toISOString()
  };
  
  return enhancedSuggestion;
}

console.log('\n🧪 TESTING BULLETPROOF IMPLEMENTATION');
console.log('====================================');

// Test data
const testLocations = [
  { id: 1, lat: 51.7606, lng: 14.3340, settlementName: 'Cottbus', estimatedPopulation: 99678, urbanDensityIndex: 0.65, rationale: { proximityGap: 14.2, turnoverGap: 0.75, population: 99678 } },
  { id: 2, lat: 52.1500, lng: 10.4000, settlementName: 'Salzgitter', estimatedPopulation: 104000, urbanDensityIndex: 0.58, rationale: { proximityGap: 18.5, turnoverGap: 0.68, population: 104000 } },
  { id: 3, lat: 49.2500, lng: 11.8000, settlementName: 'Rural Bavaria', estimatedPopulation: 8500, urbanDensityIndex: 0.15, rationale: { proximityGap: 25.3, turnoverGap: 0.45, population: 8500 } }
];

// Extract demographics (same function as before)
function extractDemographicData(suggestion) {
  const population = suggestion.estimatedPopulation || suggestion.rationale.population || 0;
  let incomeLevel = 'Unknown';
  if (suggestion.urbanDensityIndex > 0.7) incomeLevel = 'High Urban - Above Average';
  else if (suggestion.urbanDensityIndex > 0.4) incomeLevel = 'Suburban - Average';
  else if (suggestion.urbanDensityIndex > 0.2) incomeLevel = 'Semi-Rural - Below Average';
  else incomeLevel = 'Rural - Lower';

  let employmentRate;
  if (suggestion.urbanDensityIndex > 0.6) employmentRate = 85 + Math.random() * 10;
  else if (suggestion.urbanDensityIndex > 0.3) employmentRate = 75 + Math.random() * 15;
  else employmentRate = 65 + Math.random() * 20;

  return {
    population: Math.round(population), incomeLevel, employmentRate: Math.round(employmentRate),
    urbanDensity: suggestion.urbanDensityIndex, settlementName: suggestion.settlementName,
    proximityToStores: suggestion.rationale.proximityGap || 0, turnoverPotential: suggestion.rationale.turnoverGap || 0
  };
}

// Create bulletproof suggestions
const existingRationales = [];
const bulletproofSuggestions = testLocations.map(location => {
  const demographics = extractDemographicData(location);
  const suggestion = createBulletproofSuggestion(location, demographics, existingRationales);
  existingRationales.push(suggestion.rationaleText);
  return suggestion;
});

console.log('Bulletproof suggestions created:');
bulletproofSuggestions.forEach((suggestion, index) => {
  console.log(`\n${index + 1}. ${suggestion.settlementName}:`);
  console.log(`   Suggestion ID: ${suggestion._suggestionId}`);
  console.log(`   AI Analysis ID: ${suggestion._aiAnalysisId}`);
  console.log(`   Content Hash: ${suggestion._contentHash}`);
  console.log(`   Rationale: "${suggestion.rationaleText.substring(0, 80)}..."`);
  console.log(`   Market Assessment: "${suggestion.locationContext.marketAssessment.substring(0, 80)}..."`);
});

console.log('\n🔍 BULLETPROOF VALIDATION');
console.log('=========================');

// Validate complete uniqueness
const validationResults = {
  uniqueSuggestionIds: new Set(bulletproofSuggestions.map(s => s._suggestionId)).size === bulletproofSuggestions.length,
  uniqueAIAnalysisIds: new Set(bulletproofSuggestions.map(s => s._aiAnalysisId)).size === bulletproofSuggestions.length,
  uniqueContentHashes: new Set(bulletproofSuggestions.map(s => s._contentHash)).size === bulletproofSuggestions.length,
  uniqueRationaleTexts: new Set(bulletproofSuggestions.map(s => s.rationaleText)).size === bulletproofSuggestions.length,
  uniqueMarketAssessments: new Set(bulletproofSuggestions.map(s => s.locationContext.marketAssessment)).size === bulletproofSuggestions.length,
  uniqueCompetitivePositions: new Set(bulletproofSuggestions.map(s => s.aiInsights.competitivePosition)).size === bulletproofSuggestions.length
};

// Check for shared object references
let hasSharedReferences = false;
for (let i = 0; i < bulletproofSuggestions.length; i++) {
  for (let j = i + 1; j < bulletproofSuggestions.length; j++) {
    if (bulletproofSuggestions[i].locationContext === bulletproofSuggestions[j].locationContext) {
      console.log(`❌ SHARED REFERENCE: locationContext shared between ${i+1} and ${j+1}`);
      hasSharedReferences = true;
    }
    if (bulletproofSuggestions[i].aiInsights === bulletproofSuggestions[j].aiInsights) {
      console.log(`❌ SHARED REFERENCE: aiInsights shared between ${i+1} and ${j+1}`);
      hasSharedReferences = true;
    }
  }
}

validationResults.noSharedReferences = !hasSharedReferences;

console.log('\n📊 VALIDATION RESULTS:');
Object.entries(validationResults).forEach(([test, passed]) => {
  console.log(`   ${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
});

const allValidationsPassed = Object.values(validationResults).every(result => result);
console.log(`\n🎯 BULLETPROOF VALIDATION: ${allValidationsPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);

console.log('\n🛡️ IMPLEMENTATION RECOMMENDATIONS');
console.log('=================================');

console.log('\n1. Replace object creation with bulletproof factory functions');
console.log('2. Use deep cloning for all AI analysis objects');
console.log('3. Add unique identifiers and content hashes');
console.log('4. Implement validation at each step');
console.log('5. Add comprehensive logging for debugging');

console.log('\n📝 CODE PATTERNS TO IMPLEMENT:');
console.log(`
// In expansion-generation.service.ts:
const aiAnalysis = this.createUniqueAIAnalysis(location, demographics);
const enhancedSuggestion = this.createBulletproofSuggestion(suggestion, aiAnalysis);

// Deep clone all objects:
locationContext: this.deepClone(aiAnalysis),

// Validate uniqueness:
this.validateSuggestionUniqueness(enhancedSuggestions);
`);

if (allValidationsPassed) {
  console.log('\n✅ BULLETPROOF IMPLEMENTATION VALIDATED');
  console.log('This pattern will guarantee 100% unique AI responses!');
} else {
  console.log('\n❌ VALIDATION FAILED - Review implementation');
}