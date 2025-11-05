#!/usr/bin/env node

/**
 * Comprehensive Expansion System Diagnostic
 * Tests all components of the expansion system for consistency and functionality
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔍 EXPANSION SYSTEM DIAGNOSTIC');
console.log('==============================\n');

// Test 1: Check all expansion-related files exist and compile
console.log('📁 1. FILE EXISTENCE CHECK');
const requiredFiles = [
  'apps/admin/app/stores/map/components/ExpansionIntegratedMapPage.tsx',
  'apps/admin/app/stores/map/components/SuggestionMarker.tsx',
  'apps/admin/app/stores/map/components/SuggestionInfoCard.tsx',
  'apps/admin/app/stores/map/components/AIIndicatorLegend.tsx',
  'apps/admin/app/stores/map/components/ExpansionControls.tsx',
  'apps/admin/lib/services/expansion-generation.service.ts',
  'apps/admin/lib/services/openai-rationale.service.ts',
  'apps/admin/app/api/expansion/generate/route.ts',
  'apps/admin/app/api/expansion/jobs/[jobId]/route.ts'
];

let missingFiles = [];
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    missingFiles.push(file);
  }
}

if (missingFiles.length > 0) {
  console.log(`\n🚨 CRITICAL: ${missingFiles.length} required files are missing!`);
  process.exit(1);
}

// Test 2: TypeScript compilation check
console.log('\n🔧 2. TYPESCRIPT COMPILATION CHECK');
try {
  console.log('Checking TypeScript compilation...');
  execSync('pnpm -C apps/admin typecheck', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed:');
  console.log(error.stdout?.toString() || error.message);
}

// Test 3: Check environment variables
console.log('\n🌍 3. ENVIRONMENT VARIABLES CHECK');
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'DATABASE_URL',
  'MAPBOX_ACCESS_TOKEN'
];

const optionalEnvVars = [
  'AI_CANDIDATE_PERCENTAGE',
  'AI_MAX_CANDIDATES',
  'EXPANSION_ENABLE_ENHANCED_AI',
  'OPENAI_COST_LIMIT_GBP'
];

for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar} - configured`);
  } else {
    console.log(`❌ ${envVar} - MISSING (required)`);
  }
}

for (const envVar of optionalEnvVars) {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar} = ${process.env[envVar]}`);
  } else {
    console.log(`⚠️  ${envVar} - not set (using defaults)`);
  }
}

// Test 4: Check AI indicator data flow
console.log('\n🤖 4. AI INDICATOR DATA FLOW CHECK');

// Check ExpansionSuggestion interface
const suggestionMarkerContent = fs.readFileSync('apps/admin/app/stores/map/components/SuggestionMarker.tsx', 'utf8');
const hasAIAnalysisField = suggestionMarkerContent.includes('hasAIAnalysis?:');
const hasAIProcessingRank = suggestionMarkerContent.includes('aiProcessingRank?:');

console.log(`✅ ExpansionSuggestion.hasAIAnalysis: ${hasAIAnalysisField ? 'defined' : 'MISSING'}`);
console.log(`✅ ExpansionSuggestion.aiProcessingRank: ${hasAIProcessingRank ? 'defined' : 'MISSING'}`);

// Check expansion service sets AI indicators
const expansionServiceContent = fs.readFileSync('apps/admin/lib/services/expansion-generation.service.ts', 'utf8');
const setsHasAIAnalysis = expansionServiceContent.includes('hasAIAnalysis: true') && expansionServiceContent.includes('hasAIAnalysis: false');
const setsAIProcessingRank = expansionServiceContent.includes('aiProcessingRank:');

console.log(`✅ Expansion service sets hasAIAnalysis: ${setsHasAIAnalysis ? 'YES' : 'MISSING'}`);
console.log(`✅ Expansion service sets aiProcessingRank: ${setsAIProcessingRank ? 'YES' : 'MISSING'}`);

// Test 5: Check rationale consistency mechanisms
console.log('\n🔄 5. RATIONALE CONSISTENCY CHECK');

const rationaleServiceContent = fs.readFileSync('apps/admin/lib/services/openai-rationale.service.ts', 'utf8');

// Check temperature setting
const temperatureMatch = rationaleServiceContent.match(/TEMPERATURE\s*=\s*([\d.]+)/);
const temperature = temperatureMatch ? parseFloat(temperatureMatch[1]) : null;
console.log(`🌡️  OpenAI Temperature: ${temperature} ${temperature <= 0.3 ? '(good for consistency)' : '(may cause variation)'}`);

// Check caching mechanism
const hasCaching = rationaleServiceContent.includes('getFromCache') && rationaleServiceContent.includes('cacheRationale');
console.log(`💾 Caching mechanism: ${hasCaching ? 'implemented' : 'MISSING'}`);

// Check hash function completeness
const hashFunction = rationaleServiceContent.match(/hashContext\(context: RationaleContext\): string \{[\s\S]*?\}/);
if (hashFunction) {
  const hashContent = hashFunction[0];
  const includesDetailedMetrics = hashContent.includes('nearestStoreKm') || hashContent.includes('tradeAreaPopulation');
  console.log(`🔑 Hash includes detailed metrics: ${includesDetailedMetrics ? 'NO (potential inconsistency)' : 'basic only'}`);
} else {
  console.log(`🔑 Hash function: NOT FOUND`);
}

// Test 6: Check visual indicator implementation
console.log('\n👁️  6. VISUAL INDICATOR IMPLEMENTATION CHECK');

// Check SuggestionMarker visual indicators
const markerHasGoldRing = suggestionMarkerContent.includes('gold') || suggestionMarkerContent.includes('#FFD700');
const markerHasSparkle = suggestionMarkerContent.includes('✨') || suggestionMarkerContent.includes('sparkle');
console.log(`✨ Marker has gold ring: ${markerHasGoldRing ? 'YES' : 'MISSING'}`);
console.log(`✨ Marker has sparkle icon: ${markerHasSparkle ? 'YES' : 'MISSING'}`);

// Check SuggestionInfoCard AI section
const infoCardContent = fs.readFileSync('apps/admin/app/stores/map/components/SuggestionInfoCard.tsx', 'utf8');
const hasAISection = infoCardContent.includes('AI Analysis') || infoCardContent.includes('hasAIAnalysis');
console.log(`📋 Info card has AI section: ${hasAISection ? 'YES' : 'MISSING'}`);

// Check AIIndicatorLegend integration
const mapPageContent = fs.readFileSync('apps/admin/app/stores/map/components/ExpansionIntegratedMapPage.tsx', 'utf8');
const hasLegendImport = mapPageContent.includes('AIIndicatorLegend');
const hasLegendComponent = mapPageContent.includes('<AIIndicatorLegend');
console.log(`🗺️  Map page imports legend: ${hasLegendImport ? 'YES' : 'MISSING'}`);
console.log(`🗺️  Map page renders legend: ${hasLegendComponent ? 'YES' : 'MISSING'}`);

// Test 7: Check cost optimization implementation
console.log('\n💰 7. COST OPTIMIZATION CHECK');

const hasCostLimiting = expansionServiceContent.includes('AI_CANDIDATE_PERCENTAGE') && expansionServiceContent.includes('maxAICandidates');
const hasSkippingLogic = expansionServiceContent.includes('shouldProcessWithAI') && expansionServiceContent.includes('Skipping');
const hasSavingsCalculation = expansionServiceContent.includes('estimatedSavings') && expansionServiceContent.includes('tokensSkipped');

console.log(`💸 Cost limiting implemented: ${hasCostLimiting ? 'YES' : 'MISSING'}`);
console.log(`⏭️  Candidate skipping logic: ${hasSkippingLogic ? 'YES' : 'MISSING'}`);
console.log(`📊 Savings calculation: ${hasSavingsCalculation ? 'YES' : 'MISSING'}`);

// Test 8: Identify potential consistency issues
console.log('\n⚠️  8. POTENTIAL CONSISTENCY ISSUES');

const issues = [];

if (temperature > 0.3) {
  issues.push(`High OpenAI temperature (${temperature}) may cause rationale variation`);
}

if (!hashFunction || !hashFunction[0].includes('nearestStoreKm')) {
  issues.push('Hash function may not include all prompt variables, causing cache misses');
}

if (!expansionServiceContent.includes('seed') && !expansionServiceContent.includes('deterministic')) {
  issues.push('No deterministic seeding mechanism found for location generation');
}

if (expansionServiceContent.includes('Math.random()') && !expansionServiceContent.includes('seedrandom')) {
  issues.push('Uses Math.random() without seeding - may cause non-deterministic results');
}

if (issues.length === 0) {
  console.log('✅ No obvious consistency issues detected');
} else {
  issues.forEach((issue, i) => {
    console.log(`${i + 1}. ⚠️  ${issue}`);
  });
}

// Test 9: Check API route implementations
console.log('\n🌐 9. API ROUTE IMPLEMENTATION CHECK');

const generateRouteContent = fs.readFileSync('apps/admin/app/api/expansion/generate/route.ts', 'utf8');
const jobRouteContent = fs.readFileSync('apps/admin/app/api/expansion/jobs/[jobId]/route.ts', 'utf8');

const hasJobSystem = generateRouteContent.includes('jobId') && jobRouteContent.includes('status');
const hasErrorHandling = generateRouteContent.includes('try') && generateRouteContent.includes('catch');
const hasIdempotency = generateRouteContent.includes('idempotency') || generateRouteContent.includes('Idempotency');

console.log(`🔄 Job system implemented: ${hasJobSystem ? 'YES' : 'MISSING'}`);
console.log(`🛡️  Error handling: ${hasErrorHandling ? 'YES' : 'MISSING'}`);
console.log(`🔑 Idempotency support: ${hasIdempotency ? 'YES' : 'MISSING'}`);

// Summary
console.log('\n📋 DIAGNOSTIC SUMMARY');
console.log('====================');

const totalChecks = 20; // Approximate number of checks
const passedChecks = [
  !missingFiles.length,
  hasAIAnalysisField,
  hasAIProcessingRank,
  setsHasAIAnalysis,
  setsAIProcessingRank,
  hasCaching,
  hasAISection,
  hasLegendImport,
  hasLegendComponent,
  hasCostLimiting,
  hasSkippingLogic,
  hasSavingsCalculation,
  hasJobSystem,
  hasErrorHandling,
  hasIdempotency
].filter(Boolean).length;

console.log(`✅ Passed: ${passedChecks}/${totalChecks} checks`);
console.log(`⚠️  Issues found: ${issues.length}`);

if (issues.length > 0) {
  console.log('\n🔧 RECOMMENDED FIXES:');
  console.log('1. Lower OpenAI temperature to 0.1 for better consistency');
  console.log('2. Update hash function to include all prompt variables');
  console.log('3. Implement deterministic seeding for location generation');
  console.log('4. Add cache warming for frequently accessed locations');
}

console.log('\n✅ Diagnostic complete!');