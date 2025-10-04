/**
 * Higher-order component for wrapping components with error boundaries
 */

import React from 'react';
import { TelemetryErrorBoundary } from '../../app/components/TelemetryErrorBoundary';

export function withTelemetryErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  const WrappedComponent = (props: P) => (
    <TelemetryErrorBoundary fallback={fallback}>
      <Component {...props} />
    </TelemetryErrorBoundary>
  );

  WrappedComponent.displayName = `withTelemetryErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Convenience wrapper for form components
export function withFormErrorBoundary<P extends object>(
  Component: React.ComponentType<P>
) {
  return withTelemetryErrorBoundary(
    Component,
    <div className="text-sm text-gray-500 p-4 border border-gray-200 rounded">
      Form temporarily unavailable. Please refresh the page.
    </div>
  );
}

// Convenience wrapper for performance-critical components
export function withPerformanceErrorBoundary<P extends object>(
  Component: React.ComponentType<P>
) {
  return withTelemetryErrorBoundary(
    Component,
    <div className="text-sm text-gray-500">
      Component temporarily unavailable
    </div>
  );
}