#!/usr/bin/env node

/**
 * Test BFF authentication with a dummy secret
 */

const BFF_URL = 'https://subwaybff-production.up.railway.app';

async function testBFFAuth() {
  console.log('🧪 Testing BFF authentication...');
  
  // Test without auth
  console.log('\n1️⃣ Testing without authentication...');
  try {
    const response = await fetch(`${BFF_URL}/competitive-intelligence/competitors`);
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // Test with dummy auth (should still fail but with different error)
  console.log('\n2️⃣ Testing with dummy authentication...');
  try {
    const response = await fetch(`${BFF_URL}/competitive-intelligence/competitors`, {
      headers: {
        'Authorization': 'Bearer dummy-secret-123'
      }
    });
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testBFFAuth();