#!/usr/bin/env node

/**
 * Test script to verify competitor functionality through admin API
 * This tests the flow: Browser -> Admin API -> BFF API -> Mapbox -> Database
 */

const ADMIN_URL = process.env.ADMIN_URL || 'https://subwayadmin-production.up.railway.app';

async function testAdminCompetitorAPI() {
  console.log('🧪 Testing competitor functionality through admin API...');
  console.log('🔗 Admin URL:', ADMIN_URL);
  
  try {
    console.log('\n1️⃣ Testing admin competitor GET endpoint...');
    const getResponse = await fetch(`${ADMIN_URL}/api/competitors`);
    
    if (!getResponse.ok) {
      const errorData = await getResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Admin GET competitors failed:', getResponse.status, errorData);
      return;
    }
    
    const competitorsData = await getResponse.json();
    console.log('✅ Retrieved competitors via admin API:', {
      success: competitorsData.success,
      count: competitorsData.count,
      sampleCompetitors: competitorsData.competitors?.slice(0, 3).map(c => ({
        name: c.name,
        brand: c.brand,
        category: c.category,
        location: `${c.latitude}, ${c.longitude}`
      }))
    });
    
    console.log('\n2️⃣ Testing admin competitor refresh endpoint...');
    // Test coordinates (Berlin, Germany - should have lots of QSR competitors)
    const testRequest = {
      latitude: 52.5200,
      longitude: 13.4050,
      radiusMeters: 2000
    };
    
    console.log('📍 Test location:', testRequest);
    
    const refreshResponse = await fetch(`${ADMIN_URL}/api/competitors/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest)
    });
    
    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Admin refresh failed:', refreshResponse.status, errorData);
      return;
    }
    
    const refreshResult = await refreshResponse.json();
    console.log('✅ Admin refresh successful:', refreshResult);
    
    console.log('\n🎉 Admin competitor API test completed successfully!');
    console.log('📊 Summary:');
    console.log(`   • Refresh found: ${refreshResult.result?.found || 0} competitors`);
    console.log(`   • Added: ${refreshResult.result?.added || 0} new competitors`);
    console.log(`   • Updated: ${refreshResult.result?.updated || 0} existing competitors`);
    console.log(`   • Total in database: ${competitorsData.count || 0} competitors`);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testAdminCompetitorAPI();