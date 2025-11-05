import '@testing-library/jest-dom';

// Mock environment variables
process.env.NEXT_PUBLIC_ALLOW_UPLOAD = 'true';
process.env.ADMIN_ALLOW_UPLOAD = 'true';
process.env.DATABASE_URL = 'file:./test.db';

// Mock fetch globally
global.fetch = jest.fn();

// Mock File and FormData for Node.js environment
if (typeof File === 'undefined') {
  global.File = class File {
    name: string;
    type: string;
    size: number;
    content: any;

    constructor(content: any[], name: string, options: { type?: string } = {}) {
      this.content = content;
      this.name = name;
      this.type = options.type || '';
      this.size = content.reduce((size, chunk) => size + chunk.length, 0);
    }

    arrayBuffer() {
      return Promise.resolve(new ArrayBuffer(this.size));
    }
  } as any;
}

if (typeof FormData === 'undefined') {
  global.FormData = class FormData {
    private data: Map<string, any> = new Map();

    append(key: string, value: any) {
      this.data.set(key, value);
    }

    get(key: string) {
      return this.data.get(key);
    }

    has(key: string) {
      return this.data.has(key);
    }
  } as any;
}

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('React does not recognize'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('componentWillReceiveProps')) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});