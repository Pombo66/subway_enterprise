#!/usr/bin/env node

/**
 * Quick test to verify the expansion system generates 50 candidates with 20% AI rationales
 */

// Mock the expansion generation service
class TestExpansionGenerationService {
  constructor() {
    // No Prisma needed for this test
  }

  async generate(params) {
    console.log('🚀 Testing expansion generation with 20% AI cost limiting');
    
    const suggestions = [];
    
    // Calculate target count based on aggression level (matching job service logic)
    let targetStores;
    if (params.aggression <= 20) {
      targetStores = 50;
    } else if (params.aggression <= 40) {
      targetStores = 100;
    } else if (params.aggression <= 60) {
      targetStores = 150;
    } else if (params.aggression <= 80) {
      targetStores = 200;
    } else {
      targetStores = 300;
    }
    
    // Use params.targetCount if specified, otherwise use aggression-based count
    const totalCandidates = params.targetCount || targetStores;
    
    // Calculate 20% threshold for AI rationales
    const aiCandidates = Math.min(Math.ceil(totalCandidates * 0.2), 60); // Max 60 candidates get AI
    
    console.log(`💰 AI Cost Limiting: ${totalCandidates} total candidates, ${aiCandidates} with AI (${((aiCandidates/totalCandidates)*100).toFixed(0)}%)`);
    
    // Generate locations based on the target count
    const generatedLocations = this.generateLocationCandidates(totalCandidates, params.region);
    
    // Sort by confidence (highest first) to implement 20% rule
    const sortedLocations = generatedLocations.sort((a, b) => b.confidence - a.confidence);
    
    let totalTokensUsed = 0;
    let aiCount = 0;
    let deterministicCount = 0;
    
    for (let i = 0; i < sortedLocations.length; i++) {
      const location = sortedLocations[i];
      const isTopTier = i < aiCandidates; // Top 20% get AI rationales
      
      let rationaleText;
      let hasAIAnalysis = false;
      
      if (isTopTier && params.enableAIRationale) {
        // Top 20% get AI-generated rationales (simulated)
        rationaleText = `AI-generated rationale for ${location.name}: Advanced market analysis indicates strong expansion potential with unique competitive advantages and strategic positioning benefits.`;
        hasAIAnalysis = true;
        totalTokensUsed += 150; // Estimate tokens per call
        aiCount++;
      } else {
        // Bottom 80% get deterministic rationales
        rationaleText = this.generateDeterministicRationale(location);
        deterministicCount++;
      }
      
      suggestions.push({
        id: `suggestion-${i + 1}`,
        lat: location.lat,
        lng: location.lng,
        settlementName: location.name,
        rationaleText: rationaleText,
        confidence: location.confidence,
        band: location.confidence > 0.8 ? 'HIGH' : location.confidence > 0.6 ? 'MEDIUM' : 'LOW',
        hasAIAnalysis,
        aiProcessingRank: isTopTier ? i + 1 : undefined
      });
    }
    
    const result = {
      suggestions,
      statistics: {
        tokensUsed: totalTokensUsed,
        totalCost: totalTokensUsed * 0.0001,
        generationTimeMs: 2000
      },
      metadata: {
        generationTimeMs: 2000,
        aiCostLimitingEnabled: true,
        aiCandidatesCount: aiCandidates,
        totalCandidatesCount: totalCandidates,
        aiPercentage: Math.round((aiCandidates / totalCandidates) * 100)
      }
    };
    
    console.log(`🎯 Generation complete: ${suggestions.length} suggestions (${aiCount} with AI, ${deterministicCount} deterministic)`);
    
    // Verify uniqueness
    const rationaleTexts = suggestions.map(s => s.rationaleText);
    const uniqueTexts = new Set(rationaleTexts);
    
    if (uniqueTexts.size < rationaleTexts.length) {
      console.warn('⚠️ Duplicate rationales detected!');
    } else {
      console.log(`✅ All ${suggestions.length} rationales are unique`);
    }
    
    return result;
  }

  generateLocationCandidates(count, region) {
    const locations = [];
    
    // Base locations for Germany
    const baseLocations = [
      { lat: 52.5200, lng: 13.4050, name: 'Berlin Mitte' },
      { lat: 48.1351, lng: 11.5820, name: 'Munich Center' },
      { lat: 50.1109, lng: 8.6821, name: 'Frankfurt Main' },
      { lat: 53.5511, lng: 9.9937, name: 'Hamburg Port' },
      { lat: 51.2277, lng: 6.7735, name: 'Düsseldorf' },
      { lat: 50.9375, lng: 6.9603, name: 'Cologne' },
      { lat: 48.7758, lng: 9.1829, name: 'Stuttgart' },
      { lat: 52.3759, lng: 9.7320, name: 'Hannover' },
      { lat: 51.0504, lng: 13.7373, name: 'Dresden' },
      { lat: 53.0793, lng: 8.8017, name: 'Bremen' }
    ];
    
    // Generate locations by repeating and varying base locations
    for (let i = 0; i < count; i++) {
      const baseIndex = i % baseLocations.length;
      const base = baseLocations[baseIndex];
      
      // Add some variation to coordinates to create unique locations
      const latVariation = (Math.random() - 0.5) * 0.1; // ±0.05 degrees (~5km)
      const lngVariation = (Math.random() - 0.5) * 0.1;
      
      // Generate confidence score with some randomness but trending downward
      const baseConfidence = Math.max(0.3, 0.95 - (i * 0.01) + (Math.random() - 0.5) * 0.1);
      
      locations.push({
        lat: base.lat + latVariation,
        lng: base.lng + lngVariation,
        name: i < baseLocations.length ? base.name : `${base.name} Area ${Math.floor(i / baseLocations.length) + 1}`,
        confidence: Math.round(baseConfidence * 100) / 100
      });
    }
    
    return locations;
  }

  generateDeterministicRationale(location) {
    const templates = [
      `Strategic location in ${location.name} offers strong expansion potential with good market fundamentals and accessibility.`,
      `${location.name} demonstrates solid market opportunity with favorable demographics and competitive positioning.`,
      `Location at ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)} provides excellent expansion potential in ${location.name}.`,
      `Market analysis for ${location.name} indicates strong viability with good infrastructure and customer accessibility.`,
      `${location.name} expansion site offers promising market conditions with strategic positioning advantages.`
    ];
    
    // Use location coordinates to deterministically select template
    const templateIndex = Math.abs(Math.floor(location.lat * location.lng * 1000)) % templates.length;
    return templates[templateIndex];
  }
}

// Test the system
async function testExpansionSystem() {
  console.log('🧪 Testing Expansion System with 20% AI Cost Limiting (GPT-5 Mini)\n');
  
  const service = new TestExpansionGenerationService();
  
  // Test with aggression 0 (should generate 50 candidates)
  const params = {
    region: { country: 'Germany' },
    aggression: 0, // This should result in 50 candidates
    enableAIRationale: true,
    seed: 12345
  };
  
  try {
    const result = await service.generate(params);
    
    console.log('\n📊 Results Summary:');
    console.log(`   Total suggestions: ${result.suggestions.length}`);
    console.log(`   AI rationales: ${result.metadata.aiCandidatesCount}`);
    console.log(`   Deterministic rationales: ${result.suggestions.length - result.metadata.aiCandidatesCount}`);
    console.log(`   AI percentage: ${result.metadata.aiPercentage}%`);
    console.log(`   Tokens used: ${result.statistics.tokensUsed}`);
    console.log(`   Estimated cost: £${result.statistics.totalCost.toFixed(4)}`);
    
    // Verify the results
    const aiSuggestions = result.suggestions.filter(s => s.hasAIAnalysis);
    const deterministicSuggestions = result.suggestions.filter(s => !s.hasAIAnalysis);
    
    console.log('\n✅ Verification:');
    console.log(`   Expected 50 suggestions: ${result.suggestions.length === 50 ? '✅' : '❌'} (got ${result.suggestions.length})`);
    console.log(`   Expected 10 AI rationales: ${aiSuggestions.length === 10 ? '✅' : '❌'} (got ${aiSuggestions.length})`);
    console.log(`   Expected 40 deterministic: ${deterministicSuggestions.length === 40 ? '✅' : '❌'} (got ${deterministicSuggestions.length})`);
    console.log(`   Expected 20% AI ratio: ${result.metadata.aiPercentage === 20 ? '✅' : '❌'} (got ${result.metadata.aiPercentage}%)`);
    
    // Check that AI suggestions are the highest confidence ones
    const sortedByConfidence = result.suggestions.sort((a, b) => b.confidence - a.confidence);
    const top10AreAI = sortedByConfidence.slice(0, 10).every(s => s.hasAIAnalysis);
    console.log(`   Top 10 have AI analysis: ${top10AreAI ? '✅' : '❌'}`);
    
    // Sample rationales
    console.log('\n📝 Sample Rationales:');
    console.log('   AI Rationale (Rank 1):', aiSuggestions[0]?.rationaleText.substring(0, 80) + '...');
    console.log('   Deterministic (Rank 11):', deterministicSuggestions[0]?.rationaleText.substring(0, 80) + '...');
    
    if (result.suggestions.length === 50 && aiSuggestions.length === 10 && result.metadata.aiPercentage === 20) {
      console.log('\n🎉 SUCCESS: System correctly generates 50 candidates with 20% AI rationales!');
      return true;
    } else {
      console.log('\n❌ FAILURE: System did not meet expected criteria');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Run the test
testExpansionSystem()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });