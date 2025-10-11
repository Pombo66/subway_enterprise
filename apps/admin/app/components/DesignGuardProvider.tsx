'use client';

import { ReactNode } from 'react';
import { useDesignGuard } from '../hooks/useDesignGuard';

/**
 * Design Guard Provider Component
 * 
 * Wraps the application to enable design consistency validation.
 * Only activates in non-production environments when enabled prop is true.
 * 
 * @param enabled - Whether to enable design guard validation
 * @param children - Child components to wrap
 */
interface DesignGuardProviderProps {
  enabled: boolean;
  children: ReactNode;
}

export default function DesignGuardProvider({ enabled, children }: DesignGuardProviderProps) {
  // Initialize the design guard hook
  useDesignGuard({ enabled });

  // This provider doesn't render any UI, just enables the hook
  return <>{children}</>;
}

/**
 * Export the provider for easy importing
 */
export { DesignGuardProvider };