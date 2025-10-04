'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary specifically for telemetry components
 * Ensures telemetry failures don't break the main application
 */
export class TelemetryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error but don't throw to avoid breaking the app
    console.warn('Telemetry component error:', error, errorInfo);
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI or nothing to gracefully degrade
      return this.props.fallback || (
        <div className="text-xs text-gray-400 p-2">
          Telemetry tools unavailable
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping telemetry components
export function withTelemetryErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <TelemetryErrorBoundary fallback={fallback}>
        <Component {...props} />
      </TelemetryErrorBoundary>
    );
  };
}