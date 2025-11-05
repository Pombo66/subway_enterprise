#!/usr/bin/env node

/**
 * Quick environment variable checker
 */

console.log('🔍 ENVIRONMENT VARIABLE CHECK');
console.log('============================');

console.log('\n📋 Current Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('NEXT_PUBLIC_ENABLE_OPENAI_CALLS:', process.env.NEXT_PUBLIC_ENABLE_OPENAI_CALLS);
console.log('NEXT_PUBLIC_ENABLE_JOB_PROCESSING:', process.env.NEXT_PUBLIC_ENABLE_JOB_PROCESSING);
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET (length: ' + process.env.OPENAI_API_KEY.length + ')' : 'NOT SET');
console.log('MAPBOX_ACCESS_TOKEN:', process.env.MAPBOX_ACCESS_TOKEN ? 'SET (length: ' + process.env.MAPBOX_ACCESS_TOKEN.length + ')' : 'NOT SET');

console.log('\n🎯 Expected Values:');
console.log('NEXT_PUBLIC_ENABLE_OPENAI_CALLS should be: "true"');
console.log('NEXT_PUBLIC_ENABLE_JOB_PROCESSING should be: "true"');

console.log('\n📁 Checking .env files:');
import fs from 'fs';

if (fs.existsSync('.env.local')) {
  console.log('✅ .env.local exists');
  const content = fs.readFileSync('.env.local', 'utf8');
  console.log('   Contains NEXT_PUBLIC_ENABLE_OPENAI_CALLS:', content.includes('NEXT_PUBLIC_ENABLE_OPENAI_CALLS=true'));
  console.log('   Contains NEXT_PUBLIC_ENABLE_JOB_PROCESSING:', content.includes('NEXT_PUBLIC_ENABLE_JOB_PROCESSING=true'));
} else {
  console.log('❌ .env.local does not exist');
}

if (fs.existsSync('.env')) {
  console.log('✅ .env exists');
  const content = fs.readFileSync('.env', 'utf8');
  console.log('   Contains NEXT_PUBLIC_ENABLE_OPENAI_CALLS:', content.includes('NEXT_PUBLIC_ENABLE_OPENAI_CALLS=true'));
  console.log('   Contains NEXT_PUBLIC_ENABLE_JOB_PROCESSING:', content.includes('NEXT_PUBLIC_ENABLE_JOB_PROCESSING=true'));
} else {
  console.log('❌ .env does not exist');
}

console.log('\n💡 If variables show as undefined, restart your dev server with:');
console.log('   pnpm dev');