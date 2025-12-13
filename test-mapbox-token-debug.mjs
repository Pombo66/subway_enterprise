#!/usr/bin/env node

/**
 * Test Mapbox token configuration and API access
 */

const BFF_URL = 'https://subwaybff-production.up.railway.app';

async function testMapboxToken() {
  console.log('🗺️ MAPBOX TOKEN CONFIGURATION TEST');
  console.log('='.repeat(40));
  
  // Test a location with known QSR presence
  const testLocation = {
    name: 'Times Square, NYC',
    lat: 40.7580,
    lng: -73.9855
  };
  
  console.log(`\n🔍 Testing Mapbox integration for ${testLocation.name}...`);
  
  try {
    // Test the refresh endpoint which uses Mapbox internally
    const response = await fetch(`${BFF_URL}/api/competitive-intelligence/competitors/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will fail auth but we can see Mapbox errors
      },
      body: JSON.stringify({
        latitude: testLocation.lat,
        longitude: testLocation.lng,
        radiusMeters: 1000
      })
    });
    
    const data = await response.json();
    
    if (response.status === 401) {
      console.log('✅ BFF is responding (expected auth error)');
      console.log('❌ Cannot test Mapbox without proper auth token');
      console.log('\n🔧 NEXT STEPS:');
      console.log('1. Check Railway BFF service logs for Mapbox errors');
      console.log('2. Verify MAPBOX_ACCESS_TOKEN is set in Railway BFF environment');
      console.log('3. Check token permissions at https://account.mapbox.com/access-tokens/');
    } else if (response.ok) {
      console.log(`✅ Mapbox integration working: Found ${data.result?.found || 0} competitors`);
      if (data.result?.found === 0) {
        console.log('⚠️ No competitors found - possible token permissions issue');
      }
    } else {
      console.log(`❌ BFF Error ${response.status}:`, data);
    }
    
  } catch (error) {
    console.log(`❌ Network error:`, error.message);
  }
  
  console.log('\n🎯 DEBUGGING CHECKLIST:');
  console.log('□ Railway BFF service has MAPBOX_ACCESS_TOKEN environment variable');
  console.log('□ Token has "maps:read" and "tilesets:read" scopes');
  console.log('□ Token is not expired or rate-limited');
  console.log('□ Check Railway BFF logs for Mapbox API error messages');
  console.log('□ Test token directly: curl "https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/-73.9855,40.7580.json?access_token=YOUR_TOKEN"');
}

testMapboxToken();