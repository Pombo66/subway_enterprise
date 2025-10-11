# Admin Regression Audit Test Suite

This directory contains comprehensive tests for the admin regression audit system. The test suite validates all components from workspace analysis to codemod generation and PR creation.

## Test Structure

### Unit Tests (Jest)

#### Component Structure Extraction Tests
- **File**: `component-structure-extraction.test.ts`
- **Coverage**: Requirements 1.1, 1.2, 1.3
- **Tests**:
  - KPI grid parsing with various component structures
  - CSS grid template extraction from className and style attributes
  - Icon SVG and styling token extraction from component markup
  - Feature panel detection with complex component hierarchies
  - Styling token extraction from different CSS formats

#### Integration Tests
- **File**: `regression-detection-integration.test.ts`
- **Coverage**: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
- **Tests**:
  - End-to-end workflow from workspace analysis to codemod generation
  - Safety checks properly preserve new features
  - Error handling for missing files and invalid component structures
  - Performance and scalability with large codebases
  - Data validation and integrity checks

#### Codemod Validation Tests
- **File**: `codemod-validation.test.ts`
- **Coverage**: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
- **Tests**:
  - Generated code compiles and maintains TypeScript safety
  - Restored components integrate properly with existing data layer
  - Styling improvements are correctly applied without breaking existing styles
  - Feature panel restoration with graceful empty states
  - New feature preservation during restoration process

### Integration Tests (Custom Test Runner)

#### Comprehensive Test Runner
- **File**: `test-runner.ts`
- **Purpose**: Orchestrates all test suites and provides detailed reporting
- **Features**:
  - Runs all test suites in correct order
  - Provides detailed timing and error reporting
  - Validates requirements coverage
  - Supports targeted test execution

## Running Tests

### Jest Tests (Unit/Integration)

```bash
# Run all workspace analyzer tests
pnpm test:workspace-analyzer

# Run with watch mode
pnpm test:workspace-analyzer:watch

# Run with coverage report
pnpm test:workspace-analyzer:coverage
```

### Custom Test Runner (End-to-End)

```bash
# Run all regression audit tests
pnpm test:regression-audit

# Run only core infrastructure tests
pnpm test:regression-audit:core

# Run only safety validation tests
pnpm test:regression-audit:safety

# Run only PR generation tests
pnpm test:regression-audit:pr
```

### Individual Test Files

```bash
# Run specific test file
npx jest lib/workspace-analyzer/__tests__/component-structure-extraction.test.ts

# Run with TypeScript directly
npx tsx lib/workspace-analyzer/component-structure-test.ts
```

## Test Configuration

### Jest Configuration
- **File**: `jest.config.js`
- **Environment**: Node.js
- **Coverage**: 80% threshold for branches, functions, lines, statements
- **Timeout**: 30 seconds for integration tests
- **Mocking**: File system operations, TypeScript compiler API

### Setup Files
- **File**: `jest.setup.js`
- **Mocks**: fs/promises, path, typescript
- **Utilities**: Mock data factories, performance helpers, memory measurement

## Test Data and Mocking

### Mock Data Factories

```typescript
// Create mock KPI tile
const mockTile = createMockKPITile({
  id: 'custom-tile',
  title: 'Custom Tile',
  dataSource: 'custom.data'
});

// Create mock style token
const mockToken = createMockStyleToken({
  name: '--custom-token',
  value: '#ffffff',
  type: 'color'
});

// Create mock feature panel
const mockPanel = createMockFeaturePanel({
  id: 'custom-panel',
  title: 'Custom Panel',
  contentType: 'chart'
});
```

### Performance Testing

```typescript
// Measure memory usage
const { result, memoryUsage } = await measureMemoryUsage(() => {
  return heavyOperation();
});

// Measure execution time
const { result, executionTime } = await measureExecutionTime(() => {
  return timeIntensiveOperation();
});
```

## Requirements Coverage

### Requirement 1: Component Structure Extraction
- ✅ 1.1: KPI grid parsing with various component structures
- ✅ 1.2: CSS grid template extraction from className and style attributes  
- ✅ 1.3: Icon SVG and styling token extraction from component markup

### Requirement 2: Regression Detection Integration
- ✅ 2.1: End-to-end workflow from workspace analysis to codemod generation
- ✅ 2.2: Safety checks properly preserve new features
- ✅ 2.3: Error handling for missing files and invalid component structures
- ✅ 2.4: Feature panel detection with complex component hierarchies
- ✅ 2.5: Component hierarchy and layout relationship mapping

### Requirement 3: Codemod Validation
- ✅ 3.1: Generated code compiles and maintains TypeScript safety
- ✅ 3.2: Restored components integrate properly with existing data layer
- ✅ 3.3: Styling improvements are correctly applied without breaking existing styles
- ✅ 3.4: Feature panel restoration with graceful empty states
- ✅ 3.5: New feature preservation during restoration process

## Test Categories

### Core Infrastructure Tests
- Component structure extraction
- Regression detection engine
- Codemod generation system

### Safety Validation Tests
- TypeScript validator
- Feature preservation validator
- Safety checker
- Safety validation system

### PR Generation Tests
- Change validator
- Violations report generator
- Preview PR builder

## Debugging Tests

### Console Output Control

```typescript
// Suppress console output during tests
suppressConsoleOutput();

// Restore console output
restoreConsoleOutput();
```

### Error Handling

All tests include comprehensive error handling and provide meaningful error messages for debugging. Failed tests will show:

- Test suite name and duration
- Specific error message and stack trace
- Requirements coverage status
- Recommendations for fixes

## Performance Benchmarks

### Expected Performance Thresholds

- **Component Structure Extraction**: < 1 second for typical admin app
- **Regression Detection**: < 2 seconds for full analysis
- **Codemod Generation**: < 1 second for typical regression report
- **Memory Usage**: < 100MB increase for large datasets
- **Test Suite Execution**: < 30 seconds for full suite

### Scalability Testing

Tests validate performance with:
- 50+ KPI tiles
- 100+ styling tokens
- 20+ feature panels
- Large SVG icons and complex CSS

## Continuous Integration

### Test Execution Order

1. **Unit Tests**: Fast, isolated component tests
2. **Integration Tests**: Cross-component interaction tests
3. **End-to-End Tests**: Full workflow validation
4. **Performance Tests**: Scalability and memory validation

### Coverage Requirements

- **Minimum Coverage**: 80% for all metrics
- **Critical Paths**: 95% coverage for core functionality
- **Error Handling**: 100% coverage for error scenarios

## Troubleshooting

### Common Issues

1. **Mock File System Errors**
   - Ensure `jest.setup.js` is properly configured
   - Check that file system operations are mocked

2. **TypeScript Compilation Errors**
   - Verify `ts-jest` configuration in `jest.config.js`
   - Check TypeScript version compatibility

3. **Memory Leaks in Tests**
   - Use `measureMemoryUsage` helper to identify leaks
   - Ensure proper cleanup in `afterEach` hooks

4. **Timeout Issues**
   - Increase timeout in `jest.config.js` if needed
   - Use `withTimeout` helper for long-running operations

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* pnpm test:workspace-analyzer

# Run specific test with verbose output
npx jest --verbose lib/workspace-analyzer/__tests__/component-structure-extraction.test.ts
```

## Contributing

When adding new tests:

1. Follow the existing naming conventions
2. Include appropriate mocking for external dependencies
3. Add performance benchmarks for new functionality
4. Update requirements coverage documentation
5. Ensure tests are deterministic and don't rely on external state

## Test Maintenance

### Regular Tasks

- Review and update performance thresholds quarterly
- Update mock data to reflect current admin app structure
- Validate test coverage meets requirements
- Update documentation for new test scenarios

### Version Updates

When updating dependencies:
- Verify Jest and ts-jest compatibility
- Update TypeScript mocks if compiler API changes
- Test performance benchmarks after updates
- Update coverage thresholds if needed