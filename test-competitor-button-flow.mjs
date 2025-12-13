#!/usr/bin/env node

/**
 * Test the complete competitor refresh flow
 */

const ADMIN_URL = 'https://subwayadmin-production.up.railway.app';

async function testCompetitorFlow() {
  console.log('🔍 TESTING COMPETITOR REFRESH FLOW');
  console.log('='.repeat(40));
  
  // Test 1: Check if competitors API endpoint works
  console.log('\n1️⃣ Testing competitors GET endpoint...');
  try {
    const response = await fetch(`${ADMIN_URL}/api/competitors`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ GET /api/competitors works: ${data.count || 0} competitors`);
    } else {
      console.log(`❌ GET /api/competitors failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ GET /api/competitors error: ${error.message}`);
  }
  
  // Test 2: Check if refresh endpoint works
  console.log('\n2️⃣ Testing competitors refresh endpoint...');
  try {
    const response = await fetch(`${ADMIN_URL}/api/competitors/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: 52.5200, // Berlin
        longitude: 13.4050,
        radiusMeters: 1000
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ POST /api/competitors/refresh works`);
      console.log(`📊 Result: Found ${data.result?.found || 0}, Added ${data.result?.added || 0}, Updated ${data.result?.updated || 0}`);
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Unknown' }));
      console.log(`❌ POST /api/competitors/refresh failed: ${response.status} - ${errorData.error}`);
    }
  } catch (error) {
    console.log(`❌ POST /api/competitors/refresh error: ${error.message}`);
  }
  
  // Test 3: Check competitors after refresh
  console.log('\n3️⃣ Checking competitors after refresh...');
  try {
    const response = await fetch(`${ADMIN_URL}/api/competitors`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ After refresh: ${data.count || 0} competitors total`);
      if (data.competitors && data.competitors.length > 0) {
        console.log(`🏢 Sample: ${data.competitors[0].name} (${data.competitors[0].brand})`);
      }
    }
  } catch (error) {
    console.log(`❌ Post-refresh check error: ${error.message}`);
  }
  
  console.log('\n🎯 DEBUGGING CHECKLIST:');
  console.log('□ Check browser console for JavaScript errors');
  console.log('□ Verify zoom level is >= 12');
  console.log('□ Check if confirmation dialog appears');
  console.log('□ Look for API calls in Network tab');
  console.log('□ Verify Mapbox token in Railway BFF service');
}

testCompetitorFlow();