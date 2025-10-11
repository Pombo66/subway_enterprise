#!/usr/bin/env node

/**
 * Test script for the Subway UI codemod
 * This validates that the codemod works correctly on test files
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runTest() {
  console.log('🧪 Testing Subway UI Codemod');
  console.log('============================\n');

  const testFile = path.join(__dirname, 'test-codemod.tsx');
  
  // Create backup of test file
  const originalContent = fs.readFileSync(testFile, 'utf8');
  
  try {
    // Run dry run first
    console.log('1. Running dry run...');
    const dryRunOutput = execSync(
      `ts-node scripts/codemods/add-subway-classes.ts --include="${testFile}"`,
      { encoding: 'utf8', cwd: process.cwd() }
    );
    console.log(dryRunOutput);

    // Run with --write
    console.log('\n2. Running with --write...');
    const writeOutput = execSync(
      `ts-node scripts/codemods/add-subway-classes.ts --write --include="${testFile}"`,
      { encoding: 'utf8', cwd: process.cwd() }
    );
    console.log(writeOutput);

    // Show the changes
    console.log('\n3. File changes:');
    const modifiedContent = fs.readFileSync(testFile, 'utf8');
    
    // Simple diff display
    const originalLines = originalContent.split('\n');
    const modifiedLines = modifiedContent.split('\n');
    
    for (let i = 0; i < Math.max(originalLines.length, modifiedLines.length); i++) {
      const original = originalLines[i] || '';
      const modified = modifiedLines[i] || '';
      
      if (original !== modified) {
        console.log(`Line ${i + 1}:`);
        console.log(`  - ${original}`);
        console.log(`  + ${modified}`);
      }
    }

    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    // Restore original content
    fs.writeFileSync(testFile, originalContent);
    console.log('\n🔄 Test file restored to original state.');
  }
}

if (require.main === module) {
  runTest();
}