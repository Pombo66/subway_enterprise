#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Navigation Consolidation Feature
 * 
 * This script provides a unified interface to run all tests across the monorepo
 * including unit tests, integration tests, and E2E tests.
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function runCommand(command, description, options = {}) {
  log(`\n${colors.cyan}Running: ${description}${colors.reset}`)
  log(`${colors.yellow}Command: ${command}${colors.reset}`)
  
  try {
    const result = execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
      ...options
    })
    log(`${colors.green}✓ ${description} completed successfully${colors.reset}`)
    return true
  } catch (error) {
    log(`${colors.red}✗ ${description} failed${colors.reset}`)
    if (options.continueOnError) {
      return false
    }
    process.exit(1)
  }
}

function checkPrerequisites() {
  log(`${colors.bright}Checking prerequisites...${colors.reset}`)
  
  // Check if we're in the right directory
  if (!existsSync('package.json') || !existsSync('pnpm-workspace.yaml')) {
    log(`${colors.red}Error: Please run this script from the workspace root${colors.reset}`)
    process.exit(1)
  }
  
  // Check if dependencies are installed
  if (!existsSync('node_modules')) {
    log(`${colors.yellow}Installing dependencies...${colors.reset}`)
    runCommand('pnpm install', 'Install dependencies')
  }
  
  log(`${colors.green}✓ Prerequisites check passed${colors.reset}`)
}

function runUnitTests() {
  log(`\n${colors.bright}=== UNIT TESTS ===${colors.reset}`)
  
  let success = true
  
  // Admin unit tests
  if (existsSync('apps/admin/package.json')) {
    success &= runCommand(
      'pnpm -C apps/admin test -- --passWithNoTests',
      'Admin unit tests',
      { continueOnError: true }
    )
  }
  
  // BFF unit tests
  if (existsSync('apps/bff/package.json')) {
    success &= runCommand(
      'pnpm -C apps/bff test -- --passWithNoTests',
      'BFF unit tests',
      { continueOnError: true }
    )
  }
  
  return success
}

function runIntegrationTests() {
  log(`\n${colors.bright}=== INTEGRATION TESTS ===${colors.reset}`)
  
  let success = true
  
  // BFF integration tests
  if (existsSync('apps/bff/jest.integration.config.js')) {
    success &= runCommand(
      'pnpm -C apps/bff test:integration -- --passWithNoTests',
      'BFF integration tests',
      { continueOnError: true }
    )
  }
  
  return success
}

function runE2ETests() {
  log(`\n${colors.bright}=== E2E TESTS ===${colors.reset}`)
  
  let success = true
  
  // Check if Playwright is configured
  if (existsSync('apps/admin/playwright.config.ts')) {
    // Start services if needed
    log(`${colors.yellow}Note: E2E tests require running services (BFF + Admin)${colors.reset}`)
    log(`${colors.yellow}Make sure to run 'pnpm dev:all' in a separate terminal${colors.reset}`)
    
    success &= runCommand(
      'pnpm -C apps/admin test:e2e --reporter=list',
      'Playwright E2E tests',
      { continueOnError: true }
    )
  }
  
  return success
}

function runLinting() {
  log(`\n${colors.bright}=== LINTING ===${colors.reset}`)
  
  return runCommand(
    'pnpm lint',
    'ESLint checks',
    { continueOnError: true }
  )
}

function runTypeChecking() {
  log(`\n${colors.bright}=== TYPE CHECKING ===${colors.reset}`)
  
  return runCommand(
    'pnpm typecheck',
    'TypeScript type checking',
    { continueOnError: true }
  )
}

function generateTestReport(results) {
  log(`\n${colors.bright}=== TEST SUMMARY ===${colors.reset}`)
  
  const { unit, integration, e2e, lint, typecheck } = results
  
  log(`Unit Tests:        ${unit ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`)
  log(`Integration Tests: ${integration ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`)
  log(`E2E Tests:         ${e2e ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`)
  log(`Linting:           ${lint ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`)
  log(`Type Checking:     ${typecheck ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`)
  
  const allPassed = unit && integration && e2e && lint && typecheck
  
  if (allPassed) {
    log(`\n${colors.green}${colors.bright}🎉 All tests passed!${colors.reset}`)
  } else {
    log(`\n${colors.red}${colors.bright}❌ Some tests failed. Please review the output above.${colors.reset}`)
  }
  
  return allPassed
}

function main() {
  const args = process.argv.slice(2)
  const testType = args[0]
  
  log(`${colors.bright}${colors.magenta}Navigation Consolidation Test Runner${colors.reset}`)
  log(`${colors.bright}=====================================${colors.reset}`)
  
  checkPrerequisites()
  
  let results = {
    unit: true,
    integration: true,
    e2e: true,
    lint: true,
    typecheck: true
  }
  
  switch (testType) {
    case 'unit':
      results.unit = runUnitTests()
      break
      
    case 'integration':
      results.integration = runIntegrationTests()
      break
      
    case 'e2e':
      results.e2e = runE2ETests()
      break
      
    case 'lint':
      results.lint = runLinting()
      break
      
    case 'typecheck':
      results.typecheck = runTypeChecking()
      break
      
    case 'all':
    default:
      results.unit = runUnitTests()
      results.integration = runIntegrationTests()
      results.e2e = runE2ETests()
      results.lint = runLinting()
      results.typecheck = runTypeChecking()
      break
  }
  
  const success = generateTestReport(results)
  process.exit(success ? 0 : 1)
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { runUnitTests, runIntegrationTests, runE2ETests, runLinting, runTypeChecking }