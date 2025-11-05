#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

console.log('🔧 Fixing remaining OpenAI API issues...');

// Find all TypeScript files that might contain OpenAI API calls
const files = await glob('apps/**/*.ts', { ignore: ['**/node_modules/**', '**/*.d.ts'] });

let totalFiles = 0;
let fixedFiles = 0;

for (const file of files) {
  try {
    const content = readFileSync(file, 'utf8');
    
    // Check if file needs fixing
    if (!content.includes('api.openai.com/v1/responses') && 
        !content.includes('data.output.content') &&
        !content.includes('result.output.content')) {
      continue;
    }
    
    totalFiles++;
    console.log(`📝 Processing: ${file}`);
    
    let newContent = content;
    let hasChanges = false;
    
    // Fix 1: Replace wrong endpoint
    if (newContent.includes('api.openai.com/v1/responses')) {
      newContent = newContent.replace(
        /https:\/\/api\.openai\.com\/v1\/responses/g,
        'https://api.openai.com/v1/chat/completions'
      );
      hasChanges = true;
      console.log(`  ✅ Fixed endpoint in ${file}`);
    }
    
    // Fix 2: Fix response parsing - data.output.content to data.choices[0].message.content
    if (newContent.includes('data.output.content')) {
      newContent = newContent.replace(
        /data\.output\.content/g,
        'data.choices[0].message.content'
      );
      hasChanges = true;
      console.log(`  ✅ Fixed data.output.content parsing in ${file}`);
    }
    
    // Fix 3: Fix response parsing - result.output.content to result.choices[0].message.content
    if (newContent.includes('result.output.content')) {
      newContent = newContent.replace(
        /result\.output\.content/g,
        'result.choices[0].message.content'
      );
      hasChanges = true;
      console.log(`  ✅ Fixed result.output.content parsing in ${file}`);
    }
    
    // Fix 4: Fix response validation - data.output to data.choices
    if (newContent.includes('!data.output')) {
      newContent = newContent.replace(
        /if\s*\(\s*!data\.output\s*\|\|\s*!data\.output\.content\s*\)/g,
        'if (!data.choices || data.choices.length === 0)'
      );
      hasChanges = true;
      console.log(`  ✅ Fixed response validation in ${file}`);
    }
    
    if (hasChanges) {
      writeFileSync(file, newContent, 'utf8');
      fixedFiles++;
      console.log(`✅ Fixed: ${file}`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

console.log(`\n🎉 Remaining OpenAI fixes complete!`);
console.log(`📊 Files processed: ${totalFiles}`);
console.log(`✅ Files fixed: ${fixedFiles}`);