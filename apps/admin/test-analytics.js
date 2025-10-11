// Simple test to verify analytics endpoints work
const BFF_BASE = 'http://127.0.0.1:3001';

async function testAnalyticsEndpoints() {
  console.log('Testing analytics endpoints...');
  
  try {
    // Test global scope
    console.log('\n1. Testing global scope:');
    const globalKpis = await fetch(`${BFF_BASE}/kpis?scope=global`);
    const globalDaily = await fetch(`${BFF_BASE}/kpis/daily?scope=global`);
    
    console.log('Global KPIs status:', globalKpis.status);
    console.log('Global Daily status:', globalDaily.status);
    
    if (globalKpis.ok) {
      const kpisData = await globalKpis.json();
      console.log('KPIs data keys:', Object.keys(kpisData));
    }
    
    if (globalDaily.ok) {
      const dailyData = await globalDaily.json();
      console.log('Daily data length:', dailyData.length);
    }
    
    // Test region scope
    console.log('\n2. Testing region scope:');
    const regionKpis = await fetch(`${BFF_BASE}/kpis?scope=region&country=France`);
    const regionDaily = await fetch(`${BFF_BASE}/kpis/daily?scope=region&country=France`);
    
    console.log('Region KPIs status:', regionKpis.status);
    console.log('Region Daily status:', regionDaily.status);
    
    // Test store scope
    console.log('\n3. Testing store scope:');
    const storeKpis = await fetch(`${BFF_BASE}/kpis?scope=store&storeId=store-1`);
    const storeDaily = await fetch(`${BFF_BASE}/kpis/daily?scope=store&storeId=store-1`);
    
    console.log('Store KPIs status:', storeKpis.status);
    console.log('Store Daily status:', storeDaily.status);
    
    console.log('\n✅ Analytics endpoints test completed successfully!');
    
  } catch (error) {
    console.error('❌ Analytics endpoints test failed:', error.message);
  }
}

testAnalyticsEndpoints();