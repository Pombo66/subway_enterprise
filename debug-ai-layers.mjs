#!/usr/bin/env node

/**
 * Debug AI Map Layers
 * 
 * This script helps debug why AI glow rings aren't appearing on the map.
 * Run this in browser console to check map layers.
 */

console.log('🔍 AI Layer Debugging Guide');
console.log('===========================\n');

console.log('📋 Browser Console Commands to Run:');
console.log('====================================');

console.log(`
// 1. Check if map instance exists
console.log('Map instance:', window.mapInstance || 'Not found');

// 2. Check map layers (run after generating suggestions)
if (window.mapInstance) {
  const layers = window.mapInstance.getStyle().layers;
  console.log('All layers:', layers.map(l => l.id));
  
  // Look for expansion layers
  const expansionLayers = layers.filter(l => l.id.includes('expansion'));
  console.log('Expansion layers:', expansionLayers.map(l => l.id));
  
  // Check if AI glow layer exists
  const aiGlowLayer = layers.find(l => l.id === 'expansion-suggestions-ai-glow');
  console.log('AI glow layer:', aiGlowLayer ? 'EXISTS' : 'MISSING');
  
  if (aiGlowLayer) {
    console.log('AI glow layer config:', aiGlowLayer);
  }
}

// 3. Check expansion source data
if (window.mapInstance) {
  const source = window.mapInstance.getSource('expansion-suggestions');
  if (source && source._data) {
    const features = source._data.features || [];
    const aiFeatures = features.filter(f => f.properties.hasAIAnalysis === true);
    console.log('Total features:', features.length);
    console.log('AI features:', aiFeatures.length);
    console.log('Sample AI feature:', aiFeatures[0]);
  }
}

// 4. Force layer visibility (if layers exist but not visible)
if (window.mapInstance) {
  try {
    window.mapInstance.setPaintProperty('expansion-suggestions-ai-glow', 'circle-opacity', 0.8);
    window.mapInstance.setPaintProperty('expansion-suggestions-ai-glow', 'circle-radius', 20);
    console.log('✅ Forced AI glow layer to be more visible');
  } catch (e) {
    console.log('❌ Could not modify AI glow layer:', e.message);
  }
}
`);

console.log('\n🔧 Manual Layer Check:');
console.log('======================');

console.log('1. Open browser developer tools (F12)');
console.log('2. Go to Console tab');
console.log('3. Generate expansion suggestions');
console.log('4. Copy and paste the commands above');
console.log('5. Look for these results:');
console.log('   ✅ AI glow layer: EXISTS');
console.log('   ✅ AI features: > 0');
console.log('   ✅ Sample AI feature has hasAIAnalysis: true');

console.log('\n🎯 Expected Layer Structure:');
console.log('============================');
console.log('1. expansion-suggestions-ai-glow (behind, gold, larger radius)');
console.log('2. expansion-suggestions (on top, purple, normal radius)');

console.log('\n🚨 Common Issues:');
console.log('=================');
console.log('❌ AI glow layer MISSING → Layer not being created');
console.log('❌ AI features: 0 → hasAIAnalysis not being set');
console.log('❌ Layer exists but invisible → Opacity/radius too small');
console.log('❌ Wrong layer order → Glow on top instead of behind');

console.log('\n💡 Quick Fixes to Try:');
console.log('======================');
console.log('1. Refresh page and try again');
console.log('2. Check browser console for errors');
console.log('3. Try zooming in closer to see rings');
console.log('4. Check if AI rationale is actually enabled in request');

console.log('\n🔍 Debug Complete - Use browser console commands above!');