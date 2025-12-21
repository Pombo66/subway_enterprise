#!/usr/bin/env node

/**
 * TEST COMPETITOR DATABASE ISSUE
 * 
 * This will test the exact database query that's failing
 */

const BFF_URL = 'https://subwaybff-production.up.railway.app';

console.log('🔍 TESTING COMPETITOR DATABASE QUERY ISSUE');
console.log('==========================================');

async function testCompetitorStats() {
  console.log('\n1️⃣ Testing Competitor Stats (should show total count)');
  console.log('----------------------------------------------------');
  
  try {
    const response = await fetch(`${BFF_URL}/competitive-intelligence/competitors/stats`);
    console.log(`📡 Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Stats Response:', JSON.stringify(data, null, 2));
      
      if (data.stats && data.stats.total > 0) {
        console.log(`🏢 Database has ${data.stats.total} competitors total`);
        return data.stats.total;
      } else {
        console.log('⚠️ Stats show 0 competitors in database');
        return 0;
      }
    } else {
      const error = await response.text();
      console.log(`❌ Stats Error: ${error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Network Error: ${error.message}`);
    return false;
  }
}

async function testCompetitorQuery() {
  console.log('\n2️⃣ Testing Competitor Query (with isActive filter)');
  console.log('--------------------------------------------------');
  
  // Test with a very wide radius to catch any competitors
  const endpoint = `/competitive-intelligence/competitors?lat=51.4754421&lng=6.8443308&radius=100`;
  const url = `${BFF_URL}${endpoint}`;
  
  console.log(`🌐 URL: ${url}`);
  
  try {
    const response = await fetch(url);
    console.log(`📡 Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Query Response:', JSON.stringify(data, null, 2));
      
      if (data.competitors && data.competitors.length > 0) {
        console.log(`🏢 Query returned ${data.competitors.length} competitors`);
        return data.competitors.length;
      } else {
        console.log('⚠️ Query returned 0 competitors (isActive filter issue?)');
        return 0;
      }
    } else {
      const error = await response.text();
      console.log(`❌ Query Error: ${error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Network Error: ${error.message}`);
    return false;
  }
}

async function runDatabaseTest() {
  console.log('🚀 Starting Database Issue Test...\n');
  
  const statsCount = await testCompetitorStats();
  const queryCount = await testCompetitorQuery();
  
  console.log('\n📋 DATABASE DIAGNOSIS');
  console.log('====================');
  
  if (statsCount === false || queryCount === false) {
    console.log('❌ CRITICAL: Cannot access BFF endpoints');
    console.log('   → BFF is not responding or has auth issues');
    return;
  }
  
  if (statsCount > 0 && queryCount === 0) {
    console.log('🎯 FOUND THE BUG!');
    console.log(`   → Database has ${statsCount} competitors`);
    console.log('   → But query returns 0 competitors');
    console.log('   → This means the isActive filter is excluding all records');
    console.log('');
    console.log('🛠️ LIKELY CAUSES:');
    console.log('   1. Mapbox service not setting isActive=true when creating');
    console.log('   2. Default value not working in Prisma schema');
    console.log('   3. Database migration issue with isActive column');
    console.log('');
    console.log('🔧 FIXES TO TRY:');
    console.log('   1. Update Mapbox service to explicitly set isActive: true');
    console.log('   2. Check database records manually');
    console.log('   3. Run database migration to fix existing records');
  } else if (statsCount === 0) {
    console.log('⚠️ Database is empty - no competitors stored');
    console.log('   → Refresh operation may have failed silently');
    console.log('   → Check Mapbox token and service implementation');
  } else if (statsCount > 0 && queryCount > 0) {
    console.log('✅ Database and query both work!');
    console.log('   → The issue must be in the frontend map rendering');
  } else {
    console.log('❓ Unexpected result combination');
    console.log(`   → Stats: ${statsCount}, Query: ${queryCount}`);
  }
}

runDatabaseTest().catch(console.error);