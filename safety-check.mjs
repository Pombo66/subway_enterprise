#!/usr/bin/env node

/**
 * Safety check script - run before development to ensure no costs will be incurred
 */

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🛡️ Development Safety Check\n');

let allSafe = true;

// Check 1: Environment variables
console.log('1️⃣ Checking environment variables...');
const envPath = 'apps/admin/.env.local';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  const openaiEnabled = envContent.includes('ENABLE_OPENAI_CALLS=true');
  const jobProcessingEnabled = envContent.includes('ENABLE_JOB_PROCESSING=true');
  
  if (openaiEnabled) {
    console.log('❌ ENABLE_OPENAI_CALLS=true found in .env.local');
    allSafe = false;
  } else {
    console.log('✅ ENABLE_OPENAI_CALLS is disabled or not set');
  }
  
  if (jobProcessingEnabled) {
    console.log('❌ ENABLE_JOB_PROCESSING=true found in .env.local');
    allSafe = false;
  } else {
    console.log('✅ ENABLE_JOB_PROCESSING is disabled or not set');
  }
} else {
  console.log('⚠️  .env.local not found - using defaults (should be safe)');
}

// Check 2: Running processes
console.log('\n2️⃣ Checking for running processes...');
try {
  const processes = execSync('ps aux | grep -E "(node|pnpm)" | grep -v grep', { encoding: 'utf-8' });
  const relevantProcesses = processes.split('\n').filter(line => 
    line.includes('pnpm dev') || 
    line.includes('next dev') || 
    line.includes('nest start')
  );
  
  if (relevantProcesses.length > 0) {
    console.log('❌ Development servers are running:');
    relevantProcesses.forEach(proc => console.log(`   ${proc.trim()}`));
    allSafe = false;
  } else {
    console.log('✅ No development servers running');
  }
} catch (error) {
  console.log('✅ No relevant processes found');
}

// Check 3: Database jobs
console.log('\n3️⃣ Checking database for running jobs...');
try {
  const result = execSync(
    'cd packages/db && sqlite3 prisma/dev.db "SELECT COUNT(*) FROM ExpansionJob WHERE status IN (\'queued\', \'running\');"',
    { encoding: 'utf-8' }
  );
  
  const runningJobs = parseInt(result.trim());
  if (runningJobs > 0) {
    console.log(`❌ ${runningJobs} jobs are still running in database`);
    allSafe = false;
  } else {
    console.log('✅ No running jobs in database');
  }
} catch (error) {
  console.log('⚠️  Could not check database (may not exist yet)');
}

// Check 4: Port usage
console.log('\n4️⃣ Checking ports 3001 and 3002...');
try {
  const portCheck = execSync('lsof -ti:3001,3002', { encoding: 'utf-8' });
  if (portCheck.trim()) {
    console.log('❌ Ports 3001 or 3002 are in use');
    allSafe = false;
  } else {
    console.log('✅ Ports 3001 and 3002 are free');
  }
} catch (error) {
  console.log('✅ Ports 3001 and 3002 are free');
}

// Check 5: Cost log
console.log('\n5️⃣ Checking cost log...');
const costLogPath = 'openai-costs.log';
if (fs.existsSync(costLogPath)) {
  const logContent = fs.readFileSync(costLogPath, 'utf-8');
  const lines = logContent.trim().split('\n').filter(line => line.trim());
  
  if (lines.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    let todaysCost = 0;
    let totalCost = 0;
    
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        totalCost += entry.cost;
        if (entry.timestamp.startsWith(today)) {
          todaysCost += entry.cost;
        }
      } catch (e) {
        // Skip invalid lines
      }
    }
    
    console.log(`📊 Total costs logged: £${totalCost.toFixed(4)}`);
    console.log(`📊 Today's costs: £${todaysCost.toFixed(4)}`);
    
    if (todaysCost > 1.00) {
      console.log('⚠️  Significant costs incurred today');
    }
  } else {
    console.log('✅ No costs logged yet');
  }
} else {
  console.log('✅ No cost log file found');
}

// Final verdict
console.log('\n' + '='.repeat(50));
if (allSafe) {
  console.log('✅ SAFE TO DEVELOP');
  console.log('   No API costs will be incurred');
  console.log('   You can run: pnpm dev');
} else {
  console.log('❌ NOT SAFE - POTENTIAL COSTS');
  console.log('   Fix the issues above before developing');
  console.log('   Or you may incur unexpected API charges');
}
console.log('='.repeat(50));

process.exit(allSafe ? 0 : 1);