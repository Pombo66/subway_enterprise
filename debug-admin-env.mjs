#!/usr/bin/env node

/**
 * Debug script to check admin environment configuration
 */

console.log('🔍 Admin Environment Debug');
console.log('========================');

console.log('Environment Variables:');
console.log('- NEXT_PUBLIC_BFF_URL:', process.env.NEXT_PUBLIC_BFF_URL || 'NOT SET');
console.log('- INTERNAL_ADMIN_SECRET:', process.env.INTERNAL_ADMIN_SECRET ? 'SET (length: ' + process.env.INTERNAL_ADMIN_SECRET.length + ')' : 'NOT SET');

// Test a simple admin API call to see what headers are being sent
const ADMIN_URL = process.env.ADMIN_URL || 'https://subwayadmin-production.up.railway.app';

async function testAdminAPI() {
  try {
    console.log('\n🧪 Testing admin API with debug info...');
    
    const testRequest = {
      latitude: 52.5200,
      longitude: 13.4050,
      radiusMeters: 1000
    };
    
    console.log('Request body:', testRequest);
    
    const response = await fetch(`${ADMIN_URL}/api/competitors/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response data:', data);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAdminAPI();