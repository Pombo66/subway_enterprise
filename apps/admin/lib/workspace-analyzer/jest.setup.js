/**
 * Jest setup file for workspace analyzer tests
 */

// Mock file system operations
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  access: jest.fn(),
  mkdir: jest.fn()
}));

// Mock path operations
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => '/' + args.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn((path) => path.split('/').pop()),
  extname: jest.fn((path) => {
    const parts = path.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  }),
  relative: jest.fn((from, to) => to),
  isAbsolute: jest.fn((path) => path.startsWith('/'))
}));

// Mock TypeScript compiler
jest.mock('typescript', () => ({
  createProgram: jest.fn(() => ({
    getSourceFiles: jest.fn(() => []),
    getTypeChecker: jest.fn(() => ({
      getTypeAtLocation: jest.fn(),
      getSymbolAtLocation: jest.fn()
    }))
  })),
  getPreEmitDiagnostics: jest.fn(() => []),
  DiagnosticCategory: {
    Error: 1,
    Warning: 2,
    Message: 3,
    Suggestion: 4
  },
  ScriptTarget: {
    ES2020: 7
  },
  ModuleKind: {
    ESNext: 99
  },
  createSourceFile: jest.fn(() => ({
    fileName: 'test.ts',
    text: '',
    languageVersion: 7
  })),
  SyntaxKind: {
    Identifier: 79,
    StringLiteral: 10,
    NumericLiteral: 8
  }
}));

// Global test utilities
global.createMockFileContent = (type, content) => {
  const mockContents = {
    tsx: `
      import React from 'react';
      ${content}
    `,
    css: `
      :root {
        ${content}
      }
    `,
    ts: `
      ${content}
    `,
    json: JSON.stringify(content || {})
  };
  
  return mockContents[type] || content;
};

global.createMockKPITile = (overrides = {}) => ({
  id: 'test-tile',
  title: 'Test Tile',
  dataSource: 'test.data',
  iconSvg: '<svg></svg>',
  accentColor: 'blue',
  position: { row: 0, col: 0 },
  ...overrides
});

global.createMockStyleToken = (overrides = {}) => ({
  name: '--test-token',
  value: 'test-value',
  type: 'color',
  category: 'color',
  ...overrides
});

global.createMockFeaturePanel = (overrides = {}) => ({
  id: 'test-panel',
  title: 'Test Panel',
  contentType: 'list',
  dataBinding: ['testData'],
  className: 's-panelCard',
  position: { section: 's-panGrid', order: 0 },
  hasEmptyState: true,
  ...overrides
});

// Console output control for tests
const originalConsole = { ...console };

global.suppressConsoleOutput = () => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.info = jest.fn();
};

global.restoreConsoleOutput = () => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
};

// Test timeout helpers
global.withTimeout = (fn, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Test timed out after ${timeout}ms`));
    }, timeout);

    Promise.resolve(fn())
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
};

// Memory usage helpers for performance tests
global.measureMemoryUsage = (fn) => {
  const initialMemory = process.memoryUsage();
  
  return Promise.resolve(fn()).then(result => {
    const finalMemory = process.memoryUsage();
    
    return {
      result,
      memoryUsage: {
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        external: finalMemory.external - initialMemory.external,
        rss: finalMemory.rss - initialMemory.rss
      }
    };
  });
};

// Performance timing helpers
global.measureExecutionTime = async (fn) => {
  const startTime = process.hrtime.bigint();
  const result = await Promise.resolve(fn());
  const endTime = process.hrtime.bigint();
  
  return {
    result,
    executionTime: Number(endTime - startTime) / 1000000 // Convert to milliseconds
  };
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  restoreConsoleOutput();
});