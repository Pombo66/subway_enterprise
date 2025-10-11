/**
 * Jest configuration for workspace analyzer tests
 */

module.exports = {
  displayName: 'workspace-analyzer',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/__tests__/**/*.test.{js,ts}',
    '<rootDir>/**/*.test.{js,ts}'
  ],
  
  // Transform TypeScript files
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        target: 'es2020',
        lib: ['es2020'],
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        skipLibCheck: true,
        strict: true
      }
    }]
  },
  
  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Module name mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../../$1',
    '^~/(.*)$': '<rootDir>/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
    '!**/dist/**',
    '!jest.config.js',
    '!jest.setup.js'
  ],
  
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: '<rootDir>/coverage',
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true
};