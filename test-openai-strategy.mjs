#!/usr/bin/env node

/**
 * Test script to verify OpenAI Strategy Layer integration
 */

// Load environment variables
import { config } from 'dotenv';
config();

console.log('🧪 Testing OpenAI Strategy Layer Integration...\n');

// Test 1: Check environment variables
console.log('1. Environment Variables:');
console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Configured (length: ' + process.env.OPENAI_API_KEY.length + ')' : '❌ Missing'}`);
console.log(`   EXPANSION_OPENAI_ENABLED: ${process.env.EXPANSION_OPENAI_ENABLED || 'not set (defaults to true)'}`);
console.log(`   EXPANSION_OPENAI_MODEL: ${process.env.EXPANSION_OPENAI_MODEL || 'not set (defaults to gpt-4)'}`);
console.log(`   EXPANSION_OPENAI_TEMPERATURE: ${process.env.EXPANSION_OPENAI_TEMPERATURE || 'not set (defaults to 0.3)'}`);
console.log(`   EXPANSION_MAX_CANDIDATES_PER_REGION: ${process.env.EXPANSION_MAX_CANDIDATES_PER_REGION || 'not set'}`);
console.log(`   EXPANSION_MAX_CANDIDATES: ${process.env.EXPANSION_MAX_CANDIDATES || 'not set'}`);
console.log('');

// Test 2: Mock API test
console.log('2. API Configuration:');
if (process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here' || process.env.OPENAI_API_KEY === 'mock') {
  console.log('   🧪 Mock mode detected - will use simulated AI responses');
} else if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
  console.log('   🔑 Real OpenAI API key detected - will use actual AI responses');
} else {
  console.log('   ⚠️  No valid OpenAI API key - will fallback to deterministic selection');
}
console.log('');

console.log('✅ Environment test completed!');
console.log('\n💡 To test the full integration:');
console.log('   1. Open the expansion predictor in your browser');
console.log('   2. Generate expansion suggestions for Germany');
console.log('   3. Check the browser console or server logs for:');
console.log('      - "🤖 Using OpenAI Strategy Layer for intelligent location selection..."');
console.log('      - "🧪 Using mock OpenAI response for development" (if using mock key)');
console.log('      - "⚠️ OpenAI API key not configured, falling back to deterministic selection"');
console.log('');
console.log('   If you see geometric patterns (vertical lines), the OpenAI layer is not active.');
console.log('   If you see scattered, strategic locations, the OpenAI layer is working!');