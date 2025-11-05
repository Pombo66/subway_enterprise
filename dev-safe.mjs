#!/usr/bin/env node

/**
 * Safe development script - ensures safety checks pass before starting development
 */

import { execSync } from 'child_process';

console.log('🛡️ Starting Safe Development Mode\n');

try {
  // Run safety check first
  console.log('Running safety check...');
  execSync('node safety-check.mjs', { stdio: 'inherit' });
  
  console.log('\n✅ Safety check passed - starting development servers...\n');
  
  // Start development with safety confirmed
  execSync('pnpm dev', { stdio: 'inherit' });
  
} catch (error) {
  if (error.status === 1) {
    console.log('\n❌ Safety check failed - development not started');
    console.log('\nTo fix issues and start safely:');
    console.log('1. Review the safety check output above');
    console.log('2. Fix any issues (stop processes, disable env vars, etc.)');
    console.log('3. Run: node safety-check.mjs');
    console.log('4. When safe, run: node dev-safe.mjs');
    console.log('\nTo enable costs intentionally:');
    console.log('1. Set ENABLE_OPENAI_CALLS=true in .env.local');
    console.log('2. Set ENABLE_JOB_PROCESSING=true in .env.local');
    console.log('3. Run: pnpm dev (costs will be incurred!)');
  } else {
    console.error('Failed to start development:', error);
  }
  process.exit(1);
}