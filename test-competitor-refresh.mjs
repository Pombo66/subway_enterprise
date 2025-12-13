#!/usr/bin/env node

/**
 * Test script to verify competitor refresh functionality
 * This tests the complete flow: Admin API -> BFF API -> Mapbox -> Database
 */

const BFF_URL = process.env.NEXT_PUBLIC_BFF_URL || 'https://subwaybff-production.up.railway.app';

async function testCompetitorRefresh() {
  console.log('🧪 Testing competitor refresh functionality...');
  console.log('🔗 BFF URL:', BFF_URL);
  
  // Test coordinates (Berlin, Germany - should have lots of QSR competitors)
  const testRequest = {
    latitude: 52.5200,
    longitude: 13.4050,
    radiusMeters: 2000
  };
  
  console.log('📍 Test location:', testRequest);
  
  try {
    console.log('\n1️⃣ Testing BFF competitor refresh endpoint...');
    const response = await fetch(`${BFF_URL}/competitive-intelligence/competitors/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ BFF refresh failed:', response.status, errorData);
      return;
    }
    
    const refreshResult = await response.json();
    console.log('✅ BFF refresh successful:', refreshResult);
    
    console.log('\n2️⃣ Testing competitor data retrieval...');
    const getResponse = await fetch(`${BFF_URL}/competitive-intelligence/competitors`);
    
    if (!getResponse.ok) {
      const errorData = await getResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Get competitors failed:', getResponse.status, errorData);
      return;
    }
    
    const competitorsData = await getResponse.json();
    console.log('✅ Retrieved competitors:', {
      success: competitorsData.success,
      count: competitorsData.count,
      sampleCompetitors: competitorsData.competitors?.slice(0, 3).map(c => ({
        name: c.name,
        brand: c.brand,
        category: c.category,
        location: `${c.latitude}, ${c.longitude}`
      }))
    });
    
    console.log('\n🎉 Competitor refresh test completed successfully!');
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
testCompetitorRefresh();