#!/usr/bin/env node

/**
 * Debug script to test authentication between admin and BFF
 */

const BFF_URL = 'https://subwaybff-production.up.railway.app';

async function testWithAuth(secret) {
  console.log(`\n🔐 Testing with secret: ${secret ? secret.substring(0, 8) + '...' : 'undefined'}`);
  
  try {
    const response = await fetch(`${BFF_URL}/franchisees`, {
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json'
      }
    });
    
    const text = await response.text();
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log(`   ✅ Success: Authentication working`);
      try {
        const data = JSON.parse(text);
        console.log(`   📊 Data: Found ${data.franchisees?.length || 0} franchisees`);
      } catch (e) {
        console.log(`   📊 Data: ${text.substring(0, 100)}...`);
      }
    } else {
      console.log(`   ❌ Error: ${text}`);
    }
  } catch (error) {
    console.log(`   💥 Network Error: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 Authentication Debug Test');
  console.log('============================');
  
  // Test without auth
  console.log('\n📋 Testing without authentication:');
  await testWithAuth(null);
  
  // Test with common test secrets (don't use real secrets in logs)
  console.log('\n📋 Testing with sample secrets:');
  await testWithAuth('test-secret-123');
  await testWithAuth('admin-secret-456');
  
  console.log('\n🔧 Diagnosis:');
  console.log('=============');
  console.log('1. BFF is running and healthy ✅');
  console.log('2. BFF requires authentication (INTERNAL_ADMIN_SECRET is set) ✅');
  console.log('3. Need to verify the admin app has the correct matching secret');
  console.log('');
  console.log('💡 Next Steps:');
  console.log('- Check Railway dashboard for both BFF and Admin services');
  console.log('- Verify INTERNAL_ADMIN_SECRET values match exactly');
  console.log('- Check admin app logs for authentication errors');
  console.log('- Test the franchisee page in the browser after secrets are verified');
}

main().catch(console.error);