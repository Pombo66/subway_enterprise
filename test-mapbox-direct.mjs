#!/usr/bin/env node

/**
 * Test Mapbox Tilequery API directly to see what's happening
 */

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

async function testMapboxDirect() {
  console.log('🗺️ Testing Mapbox Tilequery API directly...');
  console.log('Token available:', MAPBOX_TOKEN ? `Yes (${MAPBOX_TOKEN.substring(0, 10)}...)` : 'No');
  
  if (!MAPBOX_TOKEN) {
    console.log('❌ No Mapbox token available for testing');
    return;
  }
  
  // Test coordinates: Berlin, Germany (should have lots of QSR competitors)
  const lat = 52.5200;
  const lng = 13.4050;
  const radius = 2000;
  
  const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json?radius=${radius}&layers=poi_label&limit=50&access_token=${MAPBOX_TOKEN}`;
  
  console.log('🔗 Testing URL:', url.replace(MAPBOX_TOKEN, '[TOKEN]'));
  
  try {
    const response = await fetch(url);
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Response received');
    console.log('📊 Features found:', data.features?.length || 0);
    
    if (data.features && data.features.length > 0) {
      console.log('🏢 Sample POI features:');
      data.features.slice(0, 10).forEach((feature, i) => {
        const props = feature.properties || {};
        console.log(`  ${i + 1}. ${props.name || props.name_en || 'Unnamed'} (${props.class || 'unknown class'})`);
      });
      
      // Check for QSR competitors
      const qsrCompetitors = ['McDonald\'s', 'KFC', 'Burger King', 'Starbucks', 'Pizza Hut'];
      const foundCompetitors = data.features.filter(feature => {
        const name = feature.properties?.name || feature.properties?.name_en || '';
        return qsrCompetitors.some(brand => name.toLowerCase().includes(brand.toLowerCase()));
      });
      
      console.log(`🎯 QSR competitors found: ${foundCompetitors.length}`);
      foundCompetitors.forEach(comp => {
        console.log(`  - ${comp.properties.name || comp.properties.name_en}`);
      });
    } else {
      console.log('❌ No POI features found in response');
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testMapboxDirect();