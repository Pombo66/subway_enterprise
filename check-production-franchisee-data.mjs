#!/usr/bin/env node

// Check production franchisee data via admin API
async function checkProductionData() {
  try {
    console.log('🔍 Checking production franchisee data...\n');

    // Check stores via admin API (which handles auth)
    const storesResponse = await fetch('https://subwaybff-production.up.railway.app/api/stores?limit=10', {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!storesResponse.ok) {
      console.log('❌ Stores API error:', storesResponse.status, storesResponse.statusText);
      
      // Try via localhost if we're running locally
      console.log('🔄 Trying localhost admin API...');
      const localResponse = await fetch('http://localhost:3002/api/stores?limit=10');
      
      if (!localResponse.ok) {
        console.log('❌ Local API also failed:', localResponse.status);
        console.log('💡 Need to check production data differently');
        return;
      }
      
      const localData = await localResponse.json();
      console.log('📊 Local stores data:', JSON.stringify(localData, null, 2));
      return;
    }

    const storesData = await storesResponse.json();
    console.log('📊 Production stores sample:');
    
    if (storesData.success && storesData.data && storesData.data.stores) {
      const stores = storesData.data.stores.slice(0, 5);
      stores.forEach(store => {
        console.log(`  - ${store.name} | Owner: "${store.ownerName || 'NULL'}" | FranchiseeId: ${store.franchiseeId || 'NULL'} | ${store.city}, ${store.country}`);
      });
      
      const storesWithOwners = storesData.data.stores.filter(s => s.ownerName).length;
      const storesWithFranchisees = storesData.data.stores.filter(s => s.franchiseeId).length;
      
      console.log(`\n📈 Summary from sample:`);
      console.log(`  - Stores with ownerName: ${storesWithOwners}/${storesData.data.stores.length}`);
      console.log(`  - Stores with franchiseeId: ${storesWithFranchisees}/${storesData.data.stores.length}`);
    } else {
      console.log('❌ Unexpected stores response format:', storesData);
    }

    // Check franchisees
    console.log('\n👥 Checking franchisees...');
    const franchiseesResponse = await fetch('https://subwaybff-production.up.railway.app/api/franchisees');
    
    if (!franchiseesResponse.ok) {
      console.log('❌ Franchisees API error:', franchiseesResponse.status, franchiseesResponse.statusText);
      return;
    }

    const franchiseesData = await franchiseesResponse.json();
    console.log('📊 Franchisees data:', JSON.stringify(franchiseesData, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkProductionData();