'use client';

import React, { Component, ReactNode } from 'react';
import { TelemetryHelpers } from '@/lib/telemetry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class SubMindErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('SubMind Error Boundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Emit telemetry for the error
    TelemetryHelpers.trackError(error, 'SubMind Error Boundary', undefined, {
      component: errorInfo?.componentStack?.split('\n')[1]?.trim() || 'Unknown',
      errorBoundary: 'SubMindErrorBoundary',
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center mb-3">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-sm font-medium text-red-800">SubMind Error</h3>
          </div>
          
          <p className="text-sm text-red-700 mb-4">
            SubMind encountered an unexpected error. This doesn&apos;t affect the rest of the application.
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={this.handleRetry}
              className="text-xs px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
            <a
              href="/docs/submind-setup.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
            >
              Setup Guide
            </a>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4">
              <summary className="text-xs text-red-600 cursor-pointer">Error Details (Development)</summary>
              <pre className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}