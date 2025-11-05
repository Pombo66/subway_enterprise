#!/usr/bin/env node

// Test expansion generation without OpenAI (faster)
console.log('🧪 Testing Simple Expansion Generation');
console.log('=====================================');

const testPayload = {
  region: { country: 'Germany' },
  aggression: 25, // Lower aggression for fewer results
  populationBias: 0.5,
  proximityBias: 0.3,
  turnoverBias: 0.2,
  minDistanceM: 800,
  targetCount: 3, // Very small number
  enableAIRationale: false, // Disable OpenAI for speed
  enableMapboxFiltering: false // Disable Mapbox for speed
};

console.log('Test payload:', JSON.stringify(testPayload, null, 2));
console.log('\nMaking API call to http://localhost:3002/api/expansion/generate');
console.log('This should be much faster without OpenAI...');

try {
  const response = await fetch('http://localhost:3002/api/expansion/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testPayload)
  });

  console.log('Response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.log('Error response:', errorText);
  } else {
    const result = await response.json();
    console.log('Success! Generated', result.suggestions?.length || 0, 'suggestions');
    console.log('First suggestion:', result.suggestions?.[0]);
    console.log('Metadata:', result.metadata);
  }

} catch (error) {
  console.log('Request failed:', error.message);
}

console.log('\n✅ Test complete');