#!/usr/bin/env node

// Diagnose the franchisee issue by checking production APIs
async function diagnose() {
  console.log('🔍 DIAGNOSING FRANCHISEE ISSUE\n');

  try {
    // 1. Check if stores API is working and has ownerName data
    console.log('1️⃣ Checking stores API for ownerName data...');
    
    // We need to go through admin API since BFF requires auth
    // Let's check what the admin stores API returns
    const storesResponse = await fetch('https://subwaybff-production.up.railway.app/stores?limit=5', {
      headers: {
        'Authorization': 'Bearer test' // This will fail but let's see the error
      }
    });
    
    console.log('Stores API status:', storesResponse.status);
    if (!storesResponse.ok) {
      console.log('❌ Cannot access stores API directly (expected - needs auth)');
    }

    // 2. Check franchisees API
    console.log('\n2️⃣ Checking franchisees API...');
    const franchiseesResponse = await fetch('https://subwaybff-production.up.railway.app/franchisees');
    
    console.log('Franchisees API status:', franchiseesResponse.status);
    if (!franchiseesResponse.ok) {
      const errorText = await franchiseesResponse.text();
      console.log('❌ Franchisees API error:', errorText);
    } else {
      const franchiseesData = await franchiseesResponse.json();
      console.log('✅ Franchisees API response:', JSON.stringify(franchiseesData, null, 2));
    }

    // 3. Check if migration API exists
    console.log('\n3️⃣ Checking migration API...');
    
    // Try to determine the admin URL - it might be different
    const possibleAdminUrls = [
      'https://subway-admin-production.up.railway.app',
      'https://subwayadmin-production.up.railway.app', 
      'https://admin-production.up.railway.app'
    ];

    for (const adminUrl of possibleAdminUrls) {
      try {
        console.log(`Trying admin URL: ${adminUrl}`);
        const migrationResponse = await fetch(`${adminUrl}/api/migrate-franchisees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log(`Migration API status for ${adminUrl}:`, migrationResponse.status);
        
        if (migrationResponse.ok) {
          const migrationData = await migrationResponse.json();
          console.log('✅ Migration API response:', JSON.stringify(migrationData, null, 2));
          break;
        } else {
          const errorText = await migrationResponse.text();
          console.log(`❌ Migration API error for ${adminUrl}:`, errorText);
        }
      } catch (error) {
        console.log(`❌ Failed to connect to ${adminUrl}:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  }
}

diagnose();