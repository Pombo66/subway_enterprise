#!/usr/bin/env node

/**
 * TARGETED COMPETITOR DATA FLOW TEST
 * 
 * This tests the specific data flow that should happen when competitors load
 */

const BFF_URL = 'https://subwaybff-production.up.railway.app';
const ADMIN_URL = 'https://subwayadmin-production.up.railway.app';

// Test coordinates from the image
const TEST_COORDS = {
  lat: 51.4754421,
  lng: 6.8443308,
  zoom: 15.91
};

console.log('🔍 TESTING COMPETITOR DATA FLOW');
console.log('===============================');

async function testBFFHealthEndpoint() {
  console.log('\n1️⃣ Testing BFF Health Endpoint');
  console.log('------------------------------');
  
  // Try different health endpoints
  const healthEndpoints = ['/health', '/api/health', '/'];
  
  for (const endpoint of healthEndpoints) {
    try {
      console.log(`🔍 Trying: ${BFF_URL}${endpoint}`);
      const response = await fetch(`${BFF_URL}${endpoint}`);
      console.log(`📡 Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.text();
        console.log(`✅ Success: ${data}`);
        return true;
      } else {
        const error = await response.text();
        console.log(`❌ Error: ${error}`);
      }
    } catch (error) {
      console.log(`❌ Network Error: ${error.message}`);
    }
  }
  
  return false;
}

async function testBFFCompetitorsDirectly() {
  console.log('\n2️⃣ Testing BFF Competitors Endpoint Directly');
  console.log('--------------------------------------------');
  
  const endpoint = `/competitive-intelligence/competitors?lat=${TEST_COORDS.lat}&lng=${TEST_COORDS.lng}&radius=2`;
  const url = `${BFF_URL}${endpoint}`;
  
  console.log(`🌐 URL: ${url}`);
  
  try {
    const response = await fetch(url);
    console.log(`📡 Status: ${response.status}`);
    console.log(`📡 Headers:`, Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log(`📊 Response: ${data}`);
    
    if (response.ok) {
      try {
        const parsed = JSON.parse(data);
        console.log(`✅ Parsed JSON:`, parsed);
        return parsed;
      } catch (e) {
        console.log(`⚠️ Not JSON: ${data}`);
        return data;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Network Error: ${error.message}`);
    return false;
  }
}

async function testAdminCompetitorsAPI() {
  console.log('\n3️⃣ Testing Admin Competitors API');
  console.log('--------------------------------');
  
  const endpoint = `/api/competitors?lat=${TEST_COORDS.lat}&lng=${TEST_COORDS.lng}&radius=2`;
  const url = `${ADMIN_URL}${endpoint}`;
  
  console.log(`🌐 URL: ${url}`);
  
  try {
    const response = await fetch(url);
    console.log(`📡 Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Admin API Response:`, JSON.stringify(data, null, 2));
      
      if (data.competitors && data.competitors.length > 0) {
        console.log(`🏢 Found ${data.competitors.length} competitors via Admin API`);
        return data;
      } else {
        console.log(`⚠️ Admin API returned 0 competitors`);
        return data;
      }
    } else {
      const error = await response.text();
      console.log(`❌ Admin API Error: ${error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Network Error: ${error.message}`);
    return false;
  }
}

async function testMapboxDirectly() {
  console.log('\n4️⃣ Testing Mapbox Tilequery Directly');
  console.log('------------------------------------');
  
  // We need to get the Mapbox token from Railway environment
  // Let's try to infer it or test without it first
  
  console.log('⚠️ Cannot test Mapbox directly without token');
  console.log('🔍 This would require MAPBOX_ACCESS_TOKEN from Railway environment');
  
  return false;
}

async function testCompetitorRefresh() {
  console.log('\n5️⃣ Testing Competitor Refresh via Admin');
  console.log('---------------------------------------');
  
  const url = `${ADMIN_URL}/api/competitors/refresh`;
  
  console.log(`🔄 URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: TEST_COORDS.lat,
        longitude: TEST_COORDS.lng,
        radiusMeters: 2000
      })
    });
    
    console.log(`📡 Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Refresh Response:`, JSON.stringify(data, null, 2));
      return data;
    } else {
      const error = await response.text();
      console.log(`❌ Refresh Error: ${error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Network Error: ${error.message}`);
    return false;
  }
}

async function runTargetedTest() {
  console.log('🚀 Starting Targeted Competitor Data Flow Test...\n');
  
  const results = {
    bffHealth: await testBFFHealthEndpoint(),
    bffCompetitors: await testBFFCompetitorsDirectly(),
    adminAPI: await testAdminCompetitorsAPI(),
    mapboxDirect: await testMapboxDirectly(),
    competitorRefresh: await testCompetitorRefresh()
  };
  
  console.log('\n📋 TEST RESULTS SUMMARY');
  console.log('=======================');
  
  Object.entries(results).forEach(([test, result]) => {
    const status = result ? '✅' : '❌';
    console.log(`${status} ${test}: ${result ? 'PASS' : 'FAIL'}`);
  });
  
  console.log('\n🔍 ROOT CAUSE ANALYSIS');
  console.log('=====================');
  
  if (!results.bffHealth) {
    console.log('❌ BFF is not responding to any health endpoints');
    console.log('   → Check Railway BFF deployment status');
    console.log('   → Check BFF logs for startup errors');
  }
  
  if (!results.bffCompetitors && results.adminAPI) {
    console.log('❌ BFF competitors endpoint is broken but Admin API works');
    console.log('   → This means Admin API is not actually calling BFF');
    console.log('   → OR Admin API has fallback logic');
  }
  
  if (results.adminAPI && results.adminAPI.competitors && results.adminAPI.competitors.length === 0) {
    console.log('⚠️ Admin API works but returns 0 competitors');
    console.log('   → Either no competitors in database');
    console.log('   → OR Mapbox service is not fetching data');
    console.log('   → OR database query is failing');
  }
  
  if (!results.competitorRefresh) {
    console.log('❌ Competitor refresh is not working');
    console.log('   → This means new competitor data cannot be fetched');
    console.log('   → Mapbox integration is likely broken');
  }
  
  console.log('\n🛠️ IMMEDIATE ACTION ITEMS');
  console.log('=========================');
  
  if (!results.bffHealth) {
    console.log('1. 🚨 CRITICAL: Fix BFF deployment on Railway');
  }
  
  if (!results.bffCompetitors) {
    console.log('2. 🔍 Check BFF competitive-intelligence controller');
    console.log('   - Verify route is registered');
    console.log('   - Check for import/module errors');
  }
  
  if (!results.competitorRefresh) {
    console.log('3. 🗺️ Check Mapbox integration');
    console.log('   - Verify MAPBOX_ACCESS_TOKEN in Railway BFF environment');
    console.log('   - Test MapboxCompetitorsService');
  }
  
  if (results.adminAPI && results.adminAPI.competitors?.length === 0) {
    console.log('4. 📊 Check database state');
    console.log('   - Run competitor refresh to populate data');
    console.log('   - Verify database schema');
  }
}

runTargetedTest().catch(console.error);