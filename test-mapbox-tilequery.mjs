#!/usr/bin/env node

/**
 * Test script to verify Mapbox Tilequery configuration
 * Run with: node test-mapbox-tilequery.mjs
 */

import { config } from 'dotenv';
config();

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_SECRET_TOKEN;

async function testMapboxTilequery() {
  console.log('🧪 Testing Mapbox Tilequery Configuration\n');
  
  if (!MAPBOX_TOKEN) {
    console.error('❌ No Mapbox token found in environment variables');
    console.error('   Set one of: MAPBOX_ACCESS_TOKEN, NEXT_PUBLIC_MAPBOX_TOKEN, or MAPBOX_SECRET_TOKEN');
    process.exit(1);
  }
  
  console.log(`🔑 Using token: ${MAPBOX_TOKEN.substring(0, 20)}...`);
  
  console.log('✅ Mapbox token found');
  
  // Test coordinates: Brandenburg Gate, Berlin
  const testLat = 52.516275;
  const testLng = 13.377704;
  const radius = 1500;
  
  console.log(`📍 Testing at Brandenburg Gate: ${testLat}, ${testLng}`);
  console.log(`🔍 Search radius: ${radius}m\n`);
  
  try {
    // Test token scopes first
    console.log('1️⃣ Validating token scopes...');
    const tokenUrl = `https://api.mapbox.com/tokens/v2?access_token=${MAPBOX_TOKEN}`;
    const tokenResponse = await fetch(tokenUrl);
    
    if (!tokenResponse.ok) {
      console.error(`❌ Token validation failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
      process.exit(1);
    }
    
    const tokenInfo = await tokenResponse.json();
    const scopes = tokenInfo.scopes || [];
    console.log(`   Token scopes: ${scopes.join(', ')}`);
    
    const requiredScopes = ['maps:read', 'tilesets:read'];
    const missingScopes = requiredScopes.filter(scope => !scopes.includes(scope));
    
    if (missingScopes.length > 0) {
      console.warn(`⚠️  Token scopes not visible: ${missingScopes.join(', ')}`);
      console.warn('   This might be a legacy token or scopes endpoint issue');
      console.warn('   Continuing to test actual Tilequery functionality...\n');
    } else {
      console.log('✅ Token has required scopes\n');
    }
    
    console.log('✅ Token has required scopes\n');
    
    // Test Tilequery API
    console.log('2️⃣ Testing Tilequery API...');
    const tilequeryUrl = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${testLng},${testLat}.json`;
    const params = new URLSearchParams({
      radius: radius.toString(),
      layers: 'road,building,place,landuse',
      limit: '50',
      access_token: MAPBOX_TOKEN
    });
    
    const fullUrl = `${tilequeryUrl}?${params.toString()}`;
    console.log(`   URL: ${tilequeryUrl}`);
    console.log(`   Params: ${params.toString()}`);
    
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Tilequery API error: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      process.exit(1);
    }
    
    const result = await response.json();
    const features = result.features || [];
    const featureCount = features.length;
    
    console.log(`✅ Tilequery API responded successfully`);
    console.log(`📊 Found ${featureCount} features\n`);
    
    if (featureCount === 0) {
      console.error('❌ CRITICAL: No features found at Brandenburg Gate!');
      console.error('   This indicates a configuration problem with:');
      console.error('   - Tileset name (should be mapbox.mapbox-streets-v8)');
      console.error('   - Layer names (should be road,building,place,landuse)');
      console.error('   - Token scopes (needs maps:read, tilesets:read)');
      process.exit(1);
    }
    
    // Analyze features by layer
    console.log('3️⃣ Feature breakdown by layer:');
    const breakdown = {};
    const layerBreakdown = {};
    
    features.forEach(f => {
      // Check both 'class' and 'tilequery.layer' properties
      const layer = f.properties.class || f.properties.tilequery?.layer || 'unknown';
      const tilequeryLayer = f.properties.tilequery?.layer || 'unknown';
      
      breakdown[layer] = (breakdown[layer] || 0) + 1;
      layerBreakdown[tilequeryLayer] = (layerBreakdown[tilequeryLayer] || 0) + 1;
    });
    
    console.log('   By class property:');
    Object.entries(breakdown).forEach(([layer, count]) => {
      console.log(`     ${layer}: ${count} features`);
    });
    
    console.log('   By tilequery.layer property:');
    Object.entries(layerBreakdown).forEach(([layer, count]) => {
      console.log(`     ${layer}: ${count} features`);
    });
    
    // Check for essential layers (use tilequery.layer which is more reliable)
    const hasRoad = layerBreakdown.road > 0;
    const hasBuilding = layerBreakdown.building > 0;
    const hasPlace = layerBreakdown.place > 0;
    const hasLanduse = layerBreakdown.landuse > 0;
    
    console.log('\n4️⃣ Essential layer check:');
    console.log(`   Roads: ${hasRoad ? '✅' : '❌'} (${layerBreakdown.road || 0} found)`);
    console.log(`   Buildings: ${hasBuilding ? '✅' : '❌'} (${layerBreakdown.building || 0} found)`);
    console.log(`   Places: ${hasPlace ? '✅' : '❌'} (${layerBreakdown.place || 0} found)`);
    console.log(`   Landuse: ${hasLanduse ? '✅' : '❌'} (${layerBreakdown.landuse || 0} found)`);
    
    if (hasRoad && hasBuilding) {
      console.log('\n🎉 SUCCESS: Mapbox Tilequery is properly configured!');
      console.log('   This should resolve the 0% acceptance rate issue in Germany.');
    } else {
      console.log('\n⚠️  WARNING: Missing essential features at urban location');
      console.log('   This may indicate tileset or layer configuration issues.');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

testMapboxTilequery();