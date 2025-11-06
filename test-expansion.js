/**
 * Test Script for AI Expansion System
 * 
 * This script tests the AI-driven expansion pipeline with real Subway store data.
 * Make sure the BFF server is running on http://localhost:3001
 */

const fetch = require('node-fetch');

const BFF_URL = 'http://localhost:3001';

async function testExpansionSystem() {
  console.log('🚀 Testing AI Expansion System\n');

  // Example: Test expansion for New York City area
  const testRequest = {
    region: 'New York City',
    bounds: {
      north: 40.9176,  // Northern boundary
      south: 40.4774,  // Southern boundary  
      east: -73.7004,  // Eastern boundary
      west: -74.2591   // Western boundary
    },
    existingStores: [
      // Add your actual Subway store coordinates here
      // These are example coordinates - replace with your real data
      { lat: 40.7580, lng: -73.9855, performance: 0.85 }, // Times Square area
      { lat: 40.7484, lng: -73.9857, performance: 0.92 }, // Empire State area
      { lat: 40.7061, lng: -74.0087, performance: 0.78 }  // Financial District
    ],
    targetCandidates: 10,
    businessObjectives: {
      riskTolerance: 'MEDIUM',
      expansionSpeed: 'MODERATE',
      marketPriorities: ['high-density', 'underserved-areas', 'commercial-zones']
    },
    pipelineConfig: {
      enableMarketAnalysis: true,
      enableZoneIdentification: true,
      enableLocationDiscovery: true,
      enableViabilityValidation: true,
      enableStrategicScoring: true,
      qualityThreshold: 0.7
    }
  };

  try {
    console.log('📍 Testing region:', testRequest.region);
    console.log('🏪 Existing stores:', testRequest.existingStores.length);
    console.log('🎯 Target candidates:', testRequest.targetCandidates);
    console.log('\n⏳ Executing AI pipeline...\n');

    const startTime = Date.now();

    const response = await fetch(`${BFF_URL}/ai/pipeline/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRequest)
    });

    const executionTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    console.log('✅ Pipeline execution completed!\n');
    console.log('📊 Results Summary:');
    console.log('─'.repeat(50));
    console.log(`⏱️  Total execution time: ${executionTime}ms`);
    console.log(`🎯 Final candidates: ${result.finalCandidates?.length || 0}`);
    console.log(`📈 Stages executed: ${result.metadata?.stagesExecuted?.length || 0}`);
    console.log(`✅ Successful stages: ${result.metadata?.successfulStages || 0}`);
    console.log(`❌ Failed stages: ${result.metadata?.failedStages || 0}`);
    console.log(`💰 Total cost: $${result.metadata?.totalCost?.toFixed(4) || '0.0000'}`);
    console.log(`🔢 Total tokens: ${result.metadata?.totalTokensUsed || 0}`);
    console.log('─'.repeat(50));

    if (result.finalCandidates && result.finalCandidates.length > 0) {
      console.log('\n📍 Top 3 Location Candidates:');
      result.finalCandidates.slice(0, 3).forEach((candidate, index) => {
        console.log(`\n${index + 1}. Candidate:`);
        console.log(`   Lat: ${candidate.lat}, Lng: ${candidate.lng}`);
        console.log(`   Score: ${candidate.score || 'N/A'}`);
        console.log(`   Rationale: ${candidate.rationale || 'N/A'}`);
      });
    }

    console.log('\n✅ Test completed successfully!');
    return result;

  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testExpansionSystem();
