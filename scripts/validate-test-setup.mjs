#!/usr/bin/env node

/**
 * Test Setup Validation Script
 * 
 * Validates that all testing infrastructure is properly configured
 * and ready for comprehensive testing of the navigation consolidation feature.
 */

import { existsSync, readFileSync } from 'fs'
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

function checkFile(filePath, description) {
  const exists = existsSync(filePath)
  const status = exists ? `${colors.green}✓` : `${colors.red}✗`
  log(`${status} ${description}: ${filePath}${colors.reset}`)
  return exists
}

function checkPackageScript(packagePath, scriptName, description) {
  if (!existsSync(packagePath)) {
    log(`${colors.red}✗ ${description}: Package not found${colors.reset}`)
    return false
  }
  
  try {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
    const hasScript = pkg.scripts && pkg.scripts[scriptName]
    const status = hasScript ? `${colors.green}✓` : `${colors.red}✗`
    log(`${status} ${description}: ${scriptName}${colors.reset}`)
    return hasScript
  } catch (error) {
    log(`${colors.red}✗ ${description}: Error reading package.json${colors.reset}`)
    return false
  }
}

function validateTestInfrastructure() {
  log(`${colors.bright}${colors.magenta}Test Infrastructure Validation${colors.reset}`)
  log(`${colors.bright}===============================${colors.reset}\n`)
  
  let allValid = true
  
  // Core configuration files
  log(`${colors.cyan}Core Configuration Files:${colors.reset}`)
  allValid = allValid && checkFile('apps/admin/jest.config.js', 'Admin Jest config')
  allValid = allValid && checkFile('apps/admin/jest.setup.js', 'Admin Jest setup')
  allValid = allValid && checkFile('apps/admin/playwright.config.ts', 'Admin Playwright config')
  allValid = allValid && checkFile('apps/bff/jest.config.js', 'BFF Jest config')
  allValid = allValid && checkFile('apps/bff/jest.integration.config.js', 'BFF Integration config')
  allValid = allValid && checkFile('apps/bff/test/setup.ts', 'BFF Test setup')
  
  // Test directories
  log(`\n${colors.cyan}Test Directories:${colors.reset}`)
  allValid = allValid && checkFile('apps/admin/app/components/__tests__', 'Admin component tests')
  allValid = allValid && checkFile('apps/admin/lib/__tests__', 'Admin lib tests')
  allValid = allValid && checkFile('apps/admin/e2e', 'Admin E2E tests')
  allValid = allValid && checkFile('apps/bff/test', 'BFF test directory')
  allValid = allValid && checkFile('apps/bff/test/integration', 'BFF integration tests')
  
  // Package scripts
  log(`\n${colors.cyan}Package Scripts:${colors.reset}`)
  allValid = allValid && checkPackageScript('package.json', 'test:all', 'Root test:all script')
  allValid = allValid && checkPackageScript('package.json', 'test:unit', 'Root test:unit script')
  allValid = allValid && checkPackageScript('package.json', 'test:integration', 'Root test:integration script')
  allValid = allValid && checkPackageScript('package.json', 'test:e2e', 'Root test:e2e script')
  allValid = allValid && checkPackageScript('apps/admin/package.json', 'test', 'Admin test script')
  allValid = allValid && checkPackageScript('apps/admin/package.json', 'test:e2e', 'Admin E2E script')
  allValid = allValid && checkPackageScript('apps/bff/package.json', 'test', 'BFF test script')
  allValid = allValid && checkPackageScript('apps/bff/package.json', 'test:integration', 'BFF integration script')
  
  // Test utilities and helpers
  log(`\n${colors.cyan}Test Utilities:${colors.reset}`)
  allValid = allValid && checkFile('apps/admin/lib/test-utils', 'Admin test utilities')
  allValid = allValid && checkFile('scripts/test-runner.mjs', 'Test runner script')
  allValid = allValid && checkFile('scripts/validate-test-setup.mjs', 'Test validation script')
  
  // Documentation
  log(`\n${colors.cyan}Documentation:${colors.reset}`)
  allValid = allValid && checkFile('apps/admin/docs/testing-strategy.md', 'Testing strategy document')
  
  return allValid
}

function validateTestDependencies() {
  log(`\n${colors.cyan}Test Dependencies:${colors.reset}`)
  
  let allValid = true
  
  // Check admin dependencies
  try {
    const adminPkg = JSON.parse(readFileSync('apps/admin/package.json', 'utf8'))
    const adminDeps = { ...adminPkg.dependencies, ...adminPkg.devDependencies }
    
    const requiredAdminDeps = [
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
      '@playwright/test',
      'jest',
      'jest-environment-jsdom'
    ]
    
    requiredAdminDeps.forEach(dep => {
      const hasDepency = adminDeps[dep]
      const status = hasDepency ? `${colors.green}✓` : `${colors.red}✗`
      log(`${status} Admin dependency: ${dep}${colors.reset}`)
      allValid = allValid && hasDepency
    })
  } catch (error) {
    log(`${colors.red}✗ Error checking admin dependencies${colors.reset}`)
    allValid = false
  }
  
  // Check BFF dependencies
  try {
    const bffPkg = JSON.parse(readFileSync('apps/bff/package.json', 'utf8'))
    const bffDeps = { ...bffPkg.dependencies, ...bffPkg.devDependencies }
    
    const requiredBffDeps = [
      '@nestjs/testing',
      'jest',
      'supertest',
      'ts-jest'
    ]
    
    requiredBffDeps.forEach(dep => {
      const hasDepency = bffDeps[dep]
      const status = hasDepency ? `${colors.green}✓` : `${colors.red}✗`
      log(`${status} BFF dependency: ${dep}${colors.reset}`)
      allValid = allValid && hasDepency
    })
  } catch (error) {
    log(`${colors.red}✗ Error checking BFF dependencies${colors.reset}`)
    allValid = false
  }
  
  return allValid
}

function validateExistingTests() {
  log(`\n${colors.cyan}Existing Test Files:${colors.reset}`)
  
  let testCount = 0
  
  // Admin tests
  const adminTests = [
    'apps/admin/app/components/__tests__/TabNavigation.test.tsx',
    'apps/admin/lib/__tests__/telemetry.test.ts',
    'apps/admin/e2e/consolidated-modifier-workflow.e2e.spec.ts',
    'apps/admin/e2e/menu-modifiers.e2e.spec.ts'
  ]
  
  adminTests.forEach(testFile => {
    if (checkFile(testFile, 'Admin test')) {
      testCount++
    }
  })
  
  // BFF tests
  const bffTests = [
    'apps/bff/test/basic.test.ts',
    'apps/bff/test/integration/menu-modifiers.integration.test.ts',
    'apps/bff/test/integration/menu-pricing.integration.test.ts',
    'apps/bff/test/integration/settings.integration.test.ts',
    'apps/bff/test/integration/telemetry.integration.test.ts'
  ]
  
  bffTests.forEach(testFile => {
    if (checkFile(testFile, 'BFF test')) {
      testCount++
    }
  })
  
  log(`\n${colors.blue}Total existing test files: ${testCount}${colors.reset}`)
  return testCount > 0
}

function generateRecommendations(infrastructureValid, dependenciesValid, testsExist) {
  log(`\n${colors.bright}${colors.yellow}Recommendations:${colors.reset}`)
  
  if (!infrastructureValid) {
    log(`${colors.red}• Fix missing test infrastructure files${colors.reset}`)
    log(`${colors.yellow}  Run: pnpm install to ensure all dependencies are available${colors.reset}`)
  }
  
  if (!dependenciesValid) {
    log(`${colors.red}• Install missing test dependencies${colors.reset}`)
    log(`${colors.yellow}  Run: pnpm install in workspace root${colors.reset}`)
  }
  
  if (!testsExist) {
    log(`${colors.yellow}• Consider implementing the optional test suites (16.1, 16.2, 16.3)${colors.reset}`)
  }
  
  if (infrastructureValid && dependenciesValid) {
    log(`${colors.green}• Test infrastructure is ready for implementation${colors.reset}`)
    log(`${colors.green}• Use 'pnpm test:all' to run comprehensive test suite${colors.reset}`)
    log(`${colors.green}• Use 'pnpm test:unit', 'pnpm test:integration', or 'pnpm test:e2e' for specific test types${colors.reset}`)
  }
}

function main() {
  const infrastructureValid = validateTestInfrastructure()
  const dependenciesValid = validateTestDependencies()
  const testsExist = validateExistingTests()
  
  log(`\n${colors.bright}=== VALIDATION SUMMARY ===${colors.reset}`)
  log(`Infrastructure: ${infrastructureValid ? colors.green + '✓ VALID' : colors.red + '✗ INVALID'}${colors.reset}`)
  log(`Dependencies:   ${dependenciesValid ? colors.green + '✓ VALID' : colors.red + '✗ INVALID'}${colors.reset}`)
  log(`Existing Tests: ${testsExist ? colors.green + '✓ FOUND' : colors.yellow + '⚠ MINIMAL'}${colors.reset}`)
  
  generateRecommendations(infrastructureValid, dependenciesValid, testsExist)
  
  const overallValid = infrastructureValid && dependenciesValid
  
  if (overallValid) {
    log(`\n${colors.green}${colors.bright}🎉 Test setup validation passed!${colors.reset}`)
  } else {
    log(`\n${colors.red}${colors.bright}❌ Test setup validation failed. Please address the issues above.${colors.reset}`)
  }
  
  process.exit(overallValid ? 0 : 1)
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}