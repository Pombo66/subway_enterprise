#!/usr/bin/env node

/**
 * Test BFF competitive intelligence endpoints directly with proper auth
 */

const BFF_URL = 'https://subwaybff-production.up.railway.app';

// We need to simulate the proper auth that the admin service would send
// Since we don't have the actual secret, let's test if the endpoint structure is correct

async function testBFFCompetitive() {
  console.log('🧪 Testing BFF competitive intelligence endpoints...');
  
  // Test 1: Check if endpoint exists (should get 401 but not 404)
  console.log('\n1️⃣ Testing endpoint existence...');
  try {
    const response = await fetch(`${BFF_URL}/competitive-intelligence/competitors`);
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    if (response.status === 404) {
      console.log('❌ Endpoint not found - routing issue');
    } else if (response.status === 401) {
      console.log('✅ Endpoint exists - authentication required');
    } else {
      console.log('🤔 Unexpected status:', response.status);
    }
    
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // Test 2: Check refresh endpoint
  console.log('\n2️⃣ Testing refresh endpoint existence...');
  try {
    const response = await fetch(`${BFF_URL}/competitive-intelligence/competitors/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: 52.5200,
        longitude: 13.4050,
        radiusMeters: 1000
      })
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    if (response.status === 404) {
      console.log('❌ Refresh endpoint not found - routing issue');
    } else if (response.status === 401) {
      console.log('✅ Refresh endpoint exists - authentication required');
    } else {
      console.log('🤔 Unexpected status:', response.status);
    }
    
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // Test 3: Check if competitive intelligence controller is registered
  console.log('\n3️⃣ Testing other BFF endpoints for comparison...');
  try {
    const response = await fetch(`${BFF_URL}/stores`);
    console.log('Stores endpoint status:', response.status);
    
    if (response.status === 401) {
      console.log('✅ Stores endpoint also requires auth - consistent behavior');
    } else {
      console.log('🤔 Stores endpoint status different:', response.status);
    }
  } catch (error) {
    console.error('Stores test error:', error.message);
  }
}

testBFFCompetitive();