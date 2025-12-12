#!/usr/bin/env node

// Test the franchisee migration API
async function testMigration() {
  try {
    console.log('🚀 Testing franchisee migration API...\n');
    
    // Call the migration API endpoint (admin service)
    const response = await fetch('https://subway-admin-production.up.railway.app/api/migrate-franchisees', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log('❌ Migration API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error details:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Migration completed!');
    console.log('📊 Results:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error calling migration API:', error.message);
  }
}

testMigration();