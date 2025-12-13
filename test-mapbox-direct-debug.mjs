#!/usr/bin/env node

/**
 * Direct Mapbox Tilequery API test to debug competitor discovery
 */

const BFF_URL = 'https://subwaybff-production.up.railway.app';

async function testMapboxDirect() {
  console.log('🗺️ DIRECT MAPBOX TILEQUERY API TEST');
  console.log('='.repeat(40));
  
  // Test locations with known QSR presence
  const testLocations = [
    { name: 'Times Square, NYC', lat: 40.7580, lng: -73.9855 },
    { name: 'Piccadilly Circus, London', lat: 51.5100, lng: -0.1347 },
    { name: 'Alexanderplatz, Berlin', lat: 52.5219, lng: 13.4132 },
    { name: 'Champs-Élysées, Paris', lat: 48.8738, lng: 2.2950 }
  ];
  
  for (const location of testLocations) {
    console.log(`\n🔍 Testing ${location.name}...`);
    
    try {
      // Call BFF service to test Mapbox integration
      const response = await fetch(`${BFF_URL}/api/competitive-intelligence/competitors/nearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token' // This will fail auth but we can see Mapbox errors
        },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
          radiusMeters: 1000
        })
      });
      
      const data = await response.json();
      
      if (response.status === 401) {
        console.log('✅ Expected auth error - BFF is responding');
      } else if (response.ok) {
        console.log(`✅ Found ${data.competitors?.length || 0} competitors`);
        if (data.competitors?.length > 0) {
          console.log('🏢 Sample competitors:', data.competitors.slice(0, 3).map(c => ({
            name: c.name,
            brand: c.brand,
            category: c.category
          })));
        }
      } else {
        console.log(`❌ Error ${response.status}:`, data);
      }
      
    } catch (error) {
      console.log(`❌ Network error:`, error.message);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n🔧 DEBUGGING RECOMMENDATIONS:');
  console.log('1. Check Railway BFF logs for Mapbox API errors');
  console.log('2. Verify MAPBOX_ACCESS_TOKEN is set in Railway BFF service');
  console.log('3. Check token permissions at https://account.mapbox.com/access-tokens/');
  console.log('4. Required scopes: maps:read, tilesets:read');
  console.log('5. Test token directly: https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/');
}

testMapboxDirect();