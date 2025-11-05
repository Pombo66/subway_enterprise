#!/usr/bin/env node

// Test expansion generation with debug output
console.log('🧪 Testing Expansion Generation Debug');
console.log('====================================');

const testPayload = {
  region: { country: 'Germany' },
  aggression: 50,
  populationBias: 0.5,
  proximityBias: 0.3,
  turnoverBias: 0.2,
  minDistanceM: 800,
  targetCount: 5
};

console.log('Test payload:', JSON.stringify(testPayload, null, 2));
console.log('\nMaking API call to http://localhost:3002/api/expansion/generate');
console.log('Check the server logs for detailed debug output...');

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
  }

} catch (error) {
  console.log('Request failed:', error.message);
}

console.log('\n✅ Test complete - check server logs for debug details');