/**
 * Additional test utilities and helpers
 */

import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { ToastProvider } from '../../app/components/ToastProvider';

// Mock implementations
export const createMockRepository = <T>() => ({
  create: jest.fn<Promise<T>, [any]>(),
  findMany: jest.fn<Promise<T[]>, [any?]>(),
  findById: jest.fn<Promise<T | null>, [string]>(),
  update: jest.fn<Promise<T>, [string, any]>(),
  delete: jest.fn<Promise<void>, [string]>()
});

export const createMockFormActions = () => ({
  setIdle: jest.fn(),
  setSubmitting: jest.fn(),
  setSuccess: jest.fn(),
  setError: jest.fn()
});

export const createMockToast = () => ({
  showToast: jest.fn(),
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showInfo: jest.fn(),
  removeToast: jest.fn(),
  clearAllToasts: jest.fn()
});

// Test providers wrapper
interface TestProvidersProps {
  children: ReactNode;
}

const TestProviders = ({ children }: TestProvidersProps) => {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
};

// Custom render function with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => {
  return render(ui, { wrapper: TestProviders, ...options });
};

// Test data factories
export const createTestMenuItem = (overrides?: any) => ({
  id: 'test-item-1',
  name: 'Test Menu Item',
  price: 12.99,
  active: true,
  storeId: 'test-store-1',
  Store: {
    id: 'test-store-1',
    name: 'Test Store',
    country: 'US',
    region: 'AMER'
  },
  ...overrides
});

export const createTestStore = (overrides?: any) => ({
  id: 'test-store-1',
  name: 'Test Store',
  country: 'US',
  region: 'AMER',
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createTestFormData = (overrides?: any) => ({
  name: 'Test Item',
  price: '12.99',
  active: true,
  storeId: 'test-store-1',
  ...overrides
});

// Async test utilities
export const waitForAsync = (ms: number = 0): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const flushPromises = (): Promise<void> => {
  return new Promise(resolve => setImmediate(resolve));
};

// Form testing utilities
export const fillFormField = (element: HTMLElement, value: string) => {
  const event = { target: { value } };
  element.dispatchEvent(new Event('change', { bubbles: true }));
  (element as any).value = value;
};

export const submitForm = (form: HTMLFormElement) => {
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
};

// Error simulation utilities
export const createNetworkError = (status: number = 500, message: string = 'Network Error') => {
  const error = new Error(message);
  (error as any).status = status;
  return error;
};

export const createValidationError = (field: string, message: string) => {
  const error = new Error(message);
  (error as any).field = field;
  error.name = 'ValidationError';
  return error;
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };