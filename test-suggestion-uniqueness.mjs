#!/usr/bin/env node

/**
 * Test Suggestion Data Uniqueness
 * Check if suggestions have unique AI analysis data or shared references
 */

console.log('🔍 SUGGESTION DATA UNIQUENESS TEST');
console.log('==================================');

// Simulate the issue: shared object references
console.log('\n🚨 SIMULATING SHARED REFERENCE ISSUE');
console.log('====================================');

// This is what might be happening - shared object reference
const sharedAIAnalysis = {
  marketAssessment: "The location is in a rural or semi-urban area with limited data...",
  competitiveAdvantages: ["No major competitors within 5km", "Potential first-mover advantage"],
  riskFactors: ["Unknown population density", "Limited accessibility data"]
};

const suggestions = [
  {
    id: 1,
    lat: 51.7606,
    lng: 14.3340,
    name: 'Cottbus',
    locationContext: sharedAIAnalysis, // SHARED REFERENCE!
    aiInsights: {
      marketPotential: sharedAIAnalysis.marketAssessment,
      competitivePosition: "Standard competitive analysis"
    }
  },
  {
    id: 2,
    lat: 52.1500,
    lng: 10.4000,
    name: 'Salzgitter',
    locationContext: sharedAIAnalysis, // SAME SHARED REFERENCE!
    aiInsights: {
      marketPotential: sharedAIAnalysis.marketAssessment,
      competitivePosition: "Standard competitive analysis"
    }
  }
];

console.log('Suggestion 1 Market Assessment:');
console.log(`"${suggestions[0].locationContext.marketAssessment}"`);

console.log('\nSuggestion 2 Market Assessment:');
console.log(`"${suggestions[1].locationContext.marketAssessment}"`);

console.log('\n🔍 REFERENCE EQUALITY CHECK:');
console.log(`Same object reference: ${suggestions[0].locationContext === suggestions[1].locationContext}`);
console.log(`Same market assessment: ${suggestions[0].locationContext.marketAssessment === suggestions[1].locationContext.marketAssessment}`);

console.log('\n✅ CORRECT APPROACH - UNIQUE OBJECTS');
console.log('===================================');

// This is how it should be done - unique objects
const uniqueSuggestions = [
  {
    id: 1,
    lat: 51.7606,
    lng: 14.3340,
    name: 'Cottbus',
    locationContext: {
      marketAssessment: "Cottbus, with 99,678 residents and suburban income levels, presents strong expansion potential...",
      competitiveAdvantages: ["No competitors within 14.2km", "Strong urban density of 0.65"],
      riskFactors: ["Moderate employment rate", "Seasonal tourism fluctuations"]
    },
    aiInsights: {
      marketPotential: "Cottbus demonstrates strong market potential with population of 99,678...",
      competitivePosition: "Excellent positioning with 14.2km gap to nearest competitor"
    }
  },
  {
    id: 2,
    lat: 52.1500,
    lng: 10.4000,
    name: 'Salzgitter',
    locationContext: {
      marketAssessment: "Salzgitter's 104,000 population and moderate urban density create viable market conditions...",
      competitiveAdvantages: ["Large population base", "Industrial employment stability"],
      riskFactors: ["Lower urban density", "Industrial area limitations"]
    },
    aiInsights: {
      marketPotential: "Salzgitter offers solid expansion opportunity with 104,000 residents...",
      competitivePosition: "Good market positioning with established industrial workforce"
    }
  }
];

console.log('Unique Suggestion 1 Market Assessment:');
console.log(`"${uniqueSuggestions[0].locationContext.marketAssessment}"`);

console.log('\nUnique Suggestion 2 Market Assessment:');
console.log(`"${uniqueSuggestions[1].locationContext.marketAssessment}"`);

console.log('\n🔍 UNIQUENESS CHECK:');
console.log(`Same object reference: ${uniqueSuggestions[0].locationContext === uniqueSuggestions[1].locationContext}`);
console.log(`Same market assessment: ${uniqueSuggestions[0].locationContext.marketAssessment === uniqueSuggestions[1].locationContext.marketAssessment}`);

console.log('\n🎯 POTENTIAL ROOT CAUSES IN CODEBASE');
console.log('====================================');

const potentialIssues = [
  {
    issue: 'Shared AI Response Object',
    description: 'All suggestions reference the same AI analysis object',
    code: 'const aiAnalysis = await getAIAnalysis(); suggestions.forEach(s => s.analysis = aiAnalysis);',
    fix: 'Generate unique AI analysis for each suggestion'
  },
  {
    issue: 'Cache Returning Same Object',
    description: 'Cache returns same object reference for different locations',
    code: 'const cached = cache.get(key); return cached; // Same object for all',
    fix: 'Deep clone cached objects or ensure unique cache keys'
  },
  {
    issue: 'Database Constraint Issue',
    description: 'Only one AI analysis record exists, referenced by all suggestions',
    code: 'SELECT * FROM ai_analysis WHERE job_id = ?; // Returns same record',
    fix: 'Ensure unique AI analysis records per location'
  },
  {
    issue: 'Object Mutation After Creation',
    description: 'AI analysis objects are modified after assignment',
    code: 'suggestions.forEach(s => { s.analysis.text = "generic"; });',
    fix: 'Use immutable objects or deep cloning'
  }
];

potentialIssues.forEach((issue, index) => {
  console.log(`\n${index + 1}. ${issue.issue}`);
  console.log(`   Description: ${issue.description}`);
  console.log(`   Problematic Code: ${issue.code}`);
  console.log(`   Fix: ${issue.fix}`);
});

console.log('\n🔧 DEBUGGING STEPS');
console.log('==================');

console.log('\n1. Check Object References:');
console.log('   • Log suggestion.locationContext === otherSuggestion.locationContext');
console.log('   • Verify each suggestion has unique AI analysis objects');

console.log('\n2. Check Database Records:');
console.log('   • Count AI analysis records per job');
console.log('   • Verify foreign key relationships');

console.log('\n3. Check Cache Behavior:');
console.log('   • Log cache keys being generated');
console.log('   • Verify cache returns unique objects');

console.log('\n4. Check AI Service Calls:');
console.log('   • Verify unique API calls per location');
console.log('   • Check if responses are actually different');

console.log('\n🎯 IMMEDIATE DIAGNOSTIC');
console.log('=======================');

console.log('\nAdd this logging to expansion-generation.service.ts:');
console.log('```typescript');
console.log('console.log(`AI Analysis for ${suggestion.name}:`);');
console.log('console.log(`  Market Assessment: ${contextAnalysis.marketAssessment.substring(0, 50)}...`);');
console.log('console.log(`  Object Reference: ${contextAnalysis}`);');
console.log('```');

console.log('\nThis will reveal if:');
console.log('• Different locations get different AI analysis text');
console.log('• Object references are unique or shared');
console.log('• The issue is in generation, storage, or retrieval');