#!/usr/bin/env node

/**
 * Diagnostic script to test franchisee API functionality
 */

const BFF_URL = 'https://subwaybff-production.up.railway.app';

async function testEndpoint(path, description) {
  console.log(`\n🔍 Testing: ${description}`);
  console.log(`   URL: ${BFF_URL}${path}`);
  
  try {
    const response = await fetch(`${BFF_URL}${path}`);
    const text = await response.text();
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      try {
        const data = JSON.parse(text);
        console.log(`   ✅ Success: ${JSON.stringify(data).substring(0, 100)}...`);
      } catch (e) {
        console.log(`   ✅ Success: ${text.substring(0, 100)}...`);
      }
    } else {
      console.log(`   ❌ Error: ${text}`);
    }
  } catch (error) {
    console.log(`   💥 Network Error: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Franchisee API Diagnostic Test');
  console.log('==================================');
  
  // Test basic health
  await testEndpoint('/healthz', 'BFF Health Check');
  
  // Test franchisee endpoints (should fail with auth error)
  await testEndpoint('/franchisees', 'List Franchisees (no auth)');
  
  // Test specific franchisee
  await testEndpoint('/franchisees/cmj2v4seo00012qdgdtjuzzbu', 'Get Franchisee (no auth)');
  
  // Test portfolio endpoint
  await testEndpoint('/franchisees/cmj2v4seo00012qdgdtjuzzbu/portfolio', 'Get Portfolio (no auth)');
  
  console.log('\n📋 Summary');
  console.log('===========');
  console.log('- Health endpoint should work (✅)');
  console.log('- Franchisee endpoints should return 401 Unauthorized (expected)');
  console.log('- This confirms the BFF is running but requires authentication');
  console.log('');
  console.log('🔧 Next Steps:');
  console.log('1. Set INTERNAL_ADMIN_SECRET in Railway (both BFF and Admin services)');
  console.log('2. Ensure the secret matches between services');
  console.log('3. Test the admin app after deployment');
}

main().catch(console.error);