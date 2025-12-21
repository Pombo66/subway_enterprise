#!/usr/bin/env node

/**
 * DEEP DIVE COMPETITOR SYSTEM DIAGNOSIS
 * 
 * This script will systematically test every part of the competitor pipeline:
 * 1. Frontend API calls
 * 2. Backend Mapbox service
 * 3. Database storage
 * 4. Map rendering
 * 5. Data flow end-to-end
 */

// Using built-in fetch (Node.js 18+)

const BFF_URL = 'https://subwaybff-production.up.railway.app';
const ADMIN_URL = 'https://subwayadmin-production.up.railway.app';

// Test coordinates where we can see McDonald's on the map
const TEST_COORDINATES = {
  // From the image - appears to be in Germany
  lat: 51.4754421,
  lng: 6.8443308,
  zoom: 15.91
};

console.log('🔍 DEEP DIVE COMPETITOR SYSTEM DIAGNOSIS');
console.log('==========================================');
console.log(`📍 Test Location: ${TEST_COORDINATES.lat}, ${TEST_COORDINATES.lng}`);
console.log(`🔍 Zoom Level: ${TEST_COORDINATES.zoom}`);
console.log('');

async function testBFFHealth() {
  console.log('1️⃣ TESTING BFF HEALTH');
  console.log('---------------------');
  
  try {
    const response = await fetch(`${BFF_URL}/health`);
    const data = await response.json();
    
    console.log('✅ BFF Health Status:', response.status);
    console.log('📊 Health Data:', JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ BFF Health Check Failed:', error.message);
    return false;
  }
}

async function testMapboxService() {
  console.log('\n2️⃣ TESTING MAPBOX COMPETITORS SERVICE');
  console.log('------------------------------------');
  
  try {
    // Test the BFF competitive intelligence endpoint directly
    const url = `${BFF_URL}/competitive-intelligence/competitors?lat=${TEST_COORDINATES.lat}&lng=${TEST_COORDINATES.lng}&radius=2`;
    console.log('🌐 Testing URL:', url);
    
    const response = await fetch(url);
    console.log('📡 Response Status:', response.status);
    console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ BFF Competitors API Error:', errorText);
      return false;
    }
    
    const data = await response.json();
    console.log('✅ BFF Competitors Response:', JSON.stringify(data, null, 2));
    
    if (data.competitors && data.competitors.length > 0) {
      console.log(`🏢 Found ${data.competitors.length} competitors via BFF`);
      data.competitors.slice(0, 3).forEach((comp, i) => {
        console.log(`   ${i + 1}. ${comp.brand} - ${comp.name} (${comp.latitude}, ${comp.longitude})`);
      });
    } else {
      console.log('⚠️ No competitors returned from BFF');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Mapbox Service Test Failed:', error.message);
    return false;
  }
}

async function testMapboxRefresh() {
  console.log('\n3️⃣ TESTING MAPBOX REFRESH ENDPOINT');
  console.log('----------------------------------');
  
  try {
    const url = `${BFF_URL}/competitive-intelligence/competitors/refresh`;
    console.log('🔄 Testing Refresh URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: TEST_COORDINATES.lat,
        longitude: TEST_COORDINATES.lng,
        radiusMeters: 2000
      })
    });
    
    console.log('📡 Refresh Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Refresh API Error:', errorText);
      return false;
    }
    
    const data = await response.json();
    console.log('✅ Refresh Response:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Mapbox Refresh Test Failed:', error.message);
    return false;
  }
}

async function testAdminAPI() {
  console.log('\n4️⃣ TESTING ADMIN API ENDPOINTS');
  console.log('------------------------------');
  
  try {
    // Test the admin competitors endpoint
    const url = `${ADMIN_URL}/api/competitors?lat=${TEST_COORDINATES.lat}&lng=${TEST_COORDINATES.lng}&radius=2`;
    console.log('🌐 Testing Admin URL:', url);
    
    const response = await fetch(url);
    console.log('📡 Admin Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Admin API Error:', errorText);
      return false;
    }
    
    const data = await response.json();
    console.log('✅ Admin API Response:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Admin API Test Failed:', error.message);
    return false;
  }
}

async function testMapboxTokens() {
  console.log('\n5️⃣ TESTING MAPBOX TOKEN CONFIGURATION');
  console.log('------------------------------------');
  
  // Test if we can access Mapbox Tilequery directly
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_ACCESS_TOKEN;
  
  if (!MAPBOX_TOKEN) {
    console.error('❌ No Mapbox token found in environment');
    return false;
  }
  
  console.log('🔑 Mapbox Token Found:', MAPBOX_TOKEN.substring(0, 10) + '...');
  console.log('🔑 Token Type:', MAPBOX_TOKEN.startsWith('pk.') ? 'Public' : 'Invalid');
  
  try {
    // Test Mapbox Tilequery API directly
    const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${TEST_COORDINATES.lng},${TEST_COORDINATES.lat}.json?radius=2000&layers=poi_label&limit=50&access_token=${MAPBOX_TOKEN}`;
    
    console.log('🗺️ Testing Mapbox Tilequery directly...');
    
    const response = await fetch(url);
    console.log('📡 Mapbox Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Mapbox API Error:', errorText);
      return false;
    }
    
    const data = await response.json();
    console.log('✅ Mapbox Tilequery Response Features:', data.features?.length || 0);
    
    if (data.features && data.features.length > 0) {
      console.log('🏢 Sample POI Features:');
      data.features.slice(0, 5).forEach((feature, i) => {
        const name = feature.properties?.name || 'Unknown';
        const coords = feature.geometry?.coordinates || [];
        console.log(`   ${i + 1}. ${name} (${coords[1]}, ${coords[0]})`);
      });
      
      // Look for QSR competitors specifically
      const qsrCompetitors = data.features.filter(f => {
        const name = f.properties?.name?.toLowerCase() || '';
        return name.includes('mcdonald') || name.includes('kfc') || name.includes('burger king') || 
               name.includes('subway') || name.includes('starbucks');
      });
      
      console.log(`🍔 QSR Competitors Found: ${qsrCompetitors.length}`);
      qsrCompetitors.forEach((comp, i) => {
        const name = comp.properties?.name || 'Unknown';
        const coords = comp.geometry?.coordinates || [];
        console.log(`   ${i + 1}. ${name} (${coords[1]}, ${coords[0]})`);
      });
    }
    
    return data;
  } catch (error) {
    console.error('❌ Mapbox Token Test Failed:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n6️⃣ TESTING DATABASE COMPETITOR STORAGE');
  console.log('-------------------------------------');
  
  try {
    // We can't directly access the database, but we can test via BFF
    const url = `${BFF_URL}/competitive-intelligence/competitors/stats`;
    console.log('📊 Testing Competitor Stats:', url);
    
    const response = await fetch(url);
    console.log('📡 Stats Response Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Competitor Stats:', JSON.stringify(data, null, 2));
      return data;
    } else {
      const errorText = await response.text();
      console.log('⚠️ Stats API Response:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Database Test Failed:', error.message);
    return false;
  }
}

async function runFullDiagnosis() {
  console.log('🚀 Starting Full Competitor System Diagnosis...\n');
  
  const results = {
    bffHealth: await testBFFHealth(),
    mapboxService: await testMapboxService(),
    mapboxRefresh: await testMapboxRefresh(),
    adminAPI: await testAdminAPI(),
    mapboxTokens: await testMapboxTokens(),
    database: await testDatabaseConnection()
  };
  
  console.log('\n📋 DIAGNOSIS SUMMARY');
  console.log('===================');
  
  Object.entries(results).forEach(([test, result]) => {
    const status = result ? '✅' : '❌';
    console.log(`${status} ${test}: ${result ? 'PASS' : 'FAIL'}`);
  });
  
  console.log('\n🔍 ANALYSIS');
  console.log('===========');
  
  if (!results.bffHealth) {
    console.log('❌ CRITICAL: BFF is not responding - this will break everything');
  }
  
  if (!results.mapboxTokens) {
    console.log('❌ CRITICAL: Mapbox token issue - competitors cannot be fetched');
  }
  
  if (!results.mapboxService) {
    console.log('❌ CRITICAL: Mapbox service is not working - no competitor data');
  }
  
  if (!results.adminAPI) {
    console.log('❌ CRITICAL: Admin API is not working - frontend cannot get data');
  }
  
  if (results.bffHealth && results.mapboxTokens && !results.mapboxService) {
    console.log('🔍 LIKELY ISSUE: Mapbox service implementation problem');
  }
  
  if (results.mapboxService && !results.adminAPI) {
    console.log('🔍 LIKELY ISSUE: Admin API routing or authentication problem');
  }
  
  console.log('\n🛠️ NEXT STEPS');
  console.log('=============');
  
  if (!results.bffHealth) {
    console.log('1. Check Railway BFF deployment status');
    console.log('2. Check BFF logs for errors');
  }
  
  if (!results.mapboxTokens) {
    console.log('1. Verify MAPBOX_ACCESS_TOKEN in Railway BFF environment');
    console.log('2. Verify NEXT_PUBLIC_MAPBOX_TOKEN in Railway Admin environment');
  }
  
  if (!results.mapboxService) {
    console.log('1. Check MapboxCompetitorsService implementation');
    console.log('2. Check competitive-intelligence controller routing');
    console.log('3. Check BFF module imports');
  }
  
  if (!results.adminAPI) {
    console.log('1. Check admin API route implementation');
    console.log('2. Check CORS configuration');
    console.log('3. Check admin-to-BFF communication');
  }
}

// Run the diagnosis
runFullDiagnosis().catch(console.error);