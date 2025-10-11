/**
 * Simple test utilities
 */

import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { ToastProvider } from '../../app/components/ToastProvider';

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

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };