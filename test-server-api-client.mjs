#!/usr/bin/env node

/**
 * Test the server-api-client functionality directly
 * This simulates what the admin API routes should be doing
 */

// We can't import the server-api-client directly since it's server-only
// But we can simulate what it does

const BFF_BASE_URL = 'https://subwaybff-production.up.railway.app';

async function testServerApiClient() {
  console.log('🧪 Testing server-api-client simulation...');
  
  // Simulate what the server-api-client does
  async function simulateGetFromBff(path) {
    const url = `${BFF_BASE_URL}${path}`;
    const headers = new Headers();
    
    headers.set('Content-Type', 'application/json');
    
    // This is where the INTERNAL_ADMIN_SECRET would be added
    // Since we don't have it, we'll see the same 401 error
    console.log('Making request to:', url);
    console.log('Headers:', Object.fromEntries(headers.entries()));
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (err) {
      console.error('Failed to parse JSON:', text);
      throw err;
    }
    
    if (!response.ok) {
      console.error('BFF error response:', {
        url,
        status: response.status,
        statusText: response.statusText,
        data,
      });
      throw new Error(`BFF request failed: ${response.status} ${response.statusText}`);
    }
    
    return data;
  }
  
  // Test 1: Try stores endpoint (should work with proper auth)
  console.log('\n1️⃣ Testing stores endpoint simulation...');
  try {
    await simulateGetFromBff('/stores');
    console.log('✅ Stores endpoint would work with proper auth');
  } catch (error) {
    console.log('❌ Stores endpoint failed (expected):', error.message);
  }
  
  // Test 2: Try competitive intelligence endpoint
  console.log('\n2️⃣ Testing competitive intelligence endpoint simulation...');
  try {
    await simulateGetFromBff('/competitive-intelligence/competitors');
    console.log('✅ Competitive intelligence endpoint would work with proper auth');
  } catch (error) {
    console.log('❌ Competitive intelligence endpoint failed (expected):', error.message);
  }
  
  console.log('\n📝 Summary:');
  console.log('- Both endpoints require authentication (401 errors)');
  console.log('- The issue is likely that INTERNAL_ADMIN_SECRET is not properly configured');
  console.log('- Or there is a deployment/caching issue preventing the new code from running');
}

testServerApiClient();