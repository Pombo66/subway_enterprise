#!/usr/bin/env node

/**
 * Cache Key Investigation
 * Check if multiple locations are using the same cache keys
 */

console.log('🔍 CACHE KEY INVESTIGATION');
console.log('==========================');

// Simulate different locations
const locations = [
  { lat: 51.7606, lng: 14.3340, name: 'Cottbus' },
  { lat: 52.1500, lng: 10.4000, name: 'Salzgitter' },
  { lat: 49.2500, lng: 11.8000, name: 'Rural Bavaria' },
  { lat: 50.1109, lng: 8.6821, name: 'Frankfurt' }
];

console.log('\n📍 TESTING CACHE KEY GENERATION');
console.log('===============================');

// Test different cache key generation methods
function generateCacheKey1(lat, lng) {
  return `${lat.toFixed(4)}_${lng.toFixed(4)}`;
}

function generateCacheKey2(lat, lng) {
  return `${lat.toFixed(6)}_${lng.toFixed(6)}`;
}

function generateCacheKey3(lat, lng) {
  return `${Math.round(lat * 10000)}_${Math.round(lng * 10000)}`;
}

function generateCacheKey4(lat, lng) {
  return `analysis_${lat}_${lng}`;
}

console.log('Method 1: 4 decimal places');
locations.forEach(loc => {
  const key = generateCacheKey1(loc.lat, loc.lng);
  console.log(`  ${loc.name}: ${key}`);
});

console.log('\nMethod 2: 6 decimal places');
locations.forEach(loc => {
  const key = generateCacheKey2(loc.lat, loc.lng);
  console.log(`  ${loc.name}: ${key}`);
});

console.log('\nMethod 3: Rounded integers');
locations.forEach(loc => {
  const key = generateCacheKey3(loc.lat, loc.lng);
  console.log(`  ${loc.name}: ${key}`);
});

console.log('\nMethod 4: String concatenation');
locations.forEach(loc => {
  const key = generateCacheKey4(loc.lat, loc.lng);
  console.log(`  ${loc.name}: ${key}`);
});

console.log('\n🔍 CHECKING FOR COLLISIONS');
console.log('==========================');

const methods = [
  { name: 'Method 1 (4 decimal)', fn: generateCacheKey1 },
  { name: 'Method 2 (6 decimal)', fn: generateCacheKey2 },
  { name: 'Method 3 (rounded)', fn: generateCacheKey3 },
  { name: 'Method 4 (string)', fn: generateCacheKey4 }
];

methods.forEach(method => {
  const keys = locations.map(loc => method.fn(loc.lat, loc.lng));
  const uniqueKeys = new Set(keys);
  
  console.log(`\n${method.name}:`);
  console.log(`  Generated keys: ${keys.length}`);
  console.log(`  Unique keys: ${uniqueKeys.size}`);
  console.log(`  Collisions: ${keys.length - uniqueKeys.size > 0 ? 'YES ⚠️' : 'NO ✅'}`);
  
  if (keys.length !== uniqueKeys.size) {
    console.log(`  🚨 COLLISION DETECTED! Multiple locations sharing keys`);
  }
});

console.log('\n🧪 TESTING SIMILAR COORDINATES');
console.log('==============================');

// Test coordinates that might be rounded to same values
const similarLocations = [
  { lat: 51.76061, lng: 14.33401, name: 'Location A' },
  { lat: 51.76062, lng: 14.33402, name: 'Location B' },
  { lat: 51.76063, lng: 14.33403, name: 'Location C' }
];

console.log('Testing very similar coordinates:');
similarLocations.forEach(loc => {
  console.log(`  ${loc.name}: ${loc.lat}, ${loc.lng}`);
});

methods.forEach(method => {
  const keys = similarLocations.map(loc => method.fn(loc.lat, loc.lng));
  const uniqueKeys = new Set(keys);
  
  console.log(`\n${method.name} with similar coordinates:`);
  keys.forEach((key, index) => {
    console.log(`  ${similarLocations[index].name}: ${key}`);
  });
  console.log(`  Unique keys: ${uniqueKeys.size}/${keys.length} ${uniqueKeys.size === keys.length ? '✅' : '⚠️'}`);
});

console.log('\n🔍 HASH-BASED CACHE KEY TESTING');
console.log('===============================');

function generateHashKey(lat, lng, additionalData = '') {
  const crypto = require('crypto');
  const input = `${lat}_${lng}_${additionalData}`;
  return crypto.createHash('md5').update(input).digest('hex').substring(0, 16);
}

console.log('Hash-based keys (MD5, 16 chars):');
locations.forEach(loc => {
  const key = generateHashKey(loc.lat, loc.lng);
  console.log(`  ${loc.name}: ${key}`);
});

console.log('\n🎯 RECOMMENDATIONS');
console.log('==================');

console.log('\n✅ BEST PRACTICES:');
console.log('  • Use 6+ decimal places for coordinates');
console.log('  • Include additional context in cache key');
console.log('  • Use hash-based keys for consistency');
console.log('  • Add timestamp or session ID for uniqueness');

console.log('\n⚠️  AVOID:');
console.log('  • Rounding coordinates too aggressively');
console.log('  • Using only lat/lng without precision');
console.log('  • String concatenation without delimiters');
console.log('  • Ignoring floating-point precision issues');

console.log('\n🔧 SUGGESTED CACHE KEY FORMAT:');
console.log('  Format: analysis_{lat}_{lng}_{timestamp}_{hash}');
console.log('  Example: analysis_51.760600_14.334000_1699123456_a1b2c3d4');

console.log('\n🚨 NEXT INVESTIGATION STEPS:');
console.log('  1. Check actual cache key generation in codebase');
console.log('  2. Verify if coordinates are being rounded');
console.log('  3. Look for cache key collision in logs');
console.log('  4. Test with cache disabled to confirm theory');