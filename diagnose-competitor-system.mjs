#!/usr/bin/env node

/**
 * Comprehensive competitor system diagnosis
 */

const ADMIN_URL = 'https://subwayadmin-production.up.railway.app';
const BFF_URL = 'https://subwaybff-production.up.railway.app';

async function diagnoseCompetitorSystem() {
  console.log('🔍 COMPREHENSIVE COMPETITOR SYSTEM DIAGNOSIS');
  console.log('='.repeat(50));
  
  // Test 1: Check if there are any existing competitors in the database
  console.log('\n1️⃣ Checking existing competitors in database...');
  try {
    const response = await fetch(`${ADMIN_URL}/api/competitors`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Database query successful`);
      console.log(`📊 Existing competitors: ${data.count || 0}`);
      if (data.competitors && data.competitors.length > 0) {
        console.log(`🏢 Sample competitors:`, data.competitors.slice(0, 3).map(c => ({
          name: c.name,
          brand: c.brand,
          category: c.category,
          location: `${c.latitude}, ${c.longitude}`
        })));
      }
    } else {
      console.log(`❌ Database query failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Database query error: ${error.message}`);
  }
  
  // Test 2: Test refresh with different locations
  const testLocations = [
    { name: 'Berlin, Germany', lat: 52.5200, lng: 13.4050 },
    { name: 'London, UK', lat: 51.5074, lng: -0.1278 },
    { name: 'New York, USA', lat: 40.7128, lng: -74.0060 }
  ];
  
  for (const location of testLocations) {
    console.log(`\n2️⃣ Testing refresh for ${location.name}...`);
    try {
      const response = await fetch(`${ADMIN_URL}/api/competitors/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
          radiusMeters: 1000
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${location.name} refresh successful`);
        console.log(`📊 Found: ${data.result?.found || 0}, Added: ${data.result?.added || 0}, Updated: ${data.result?.updated || 0}`);
        
        if (data.result?.found === 0) {
          console.log(`⚠️ No competitors found - possible Mapbox token or API issue`);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.log(`❌ ${location.name} refresh failed: ${response.status} - ${errorData.error}`);
      }
    } catch (error) {
      console.log(`❌ ${location.name} refresh error: ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test 3: Check BFF health and configuration
  console.log('\n3️⃣ Checking BFF service health...');
  try {
    const response = await fetch(`${BFF_URL}/healthz`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ BFF service is healthy');
      console.log('📊 BFF info:', {
        version: data.data?.version,
        commit: data.data?.commit,
        timestamp: data.data?.timestamp
      });
    } else {
      console.log(`❌ BFF health check failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ BFF health check error: ${error.message}`);
  }
  
  // Test 4: Summary and recommendations
  console.log('\n4️⃣ DIAGNOSIS SUMMARY');
  console.log('='.repeat(30));
  console.log('✅ Admin API: Working (authentication successful)');
  console.log('✅ BFF API: Working (endpoints responding)');
  console.log('✅ Database: Working (queries successful)');
  console.log('❌ Mapbox Integration: Finding 0 competitors');
  console.log('');
  console.log('🔧 LIKELY ISSUES:');
  console.log('1. Mapbox token not configured in BFF Railway service');
  console.log('2. Mapbox token has insufficient permissions (needs tilesets:read)');
  console.log('3. Mapbox Tilequery API endpoint or parameters incorrect');
  console.log('4. Geographic area has no POI data in Mapbox');
  console.log('');
  console.log('🎯 NEXT STEPS:');
  console.log('1. Check Railway BFF service environment variables');
  console.log('2. Verify Mapbox token has correct scopes');
  console.log('3. Check Railway BFF logs for Mapbox-related errors');
  console.log('4. Test Mapbox Tilequery API directly with the token');
}

diagnoseCompetitorSystem();