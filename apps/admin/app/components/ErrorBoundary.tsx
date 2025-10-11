'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorHandler } from '@/lib/types/error.types';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Enhanced error boundary with better error handling and user-friendly fallbacks
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({ errorInfo });
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { message } = ErrorHandler.parseError(this.state.error);

      // Default error UI
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <svg 
                className="mx-auto h-12 w-12 text-red-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Something went wrong
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              {message}
            </p>
            
            <div className="flex justify-center space-x-3">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try again
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Reload page
              </button>
            </div>
            
            {this.props.showDetails && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer">
                  Technical details
                </summary>
                <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  showDetails?: boolean
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback} showDetails={showDetails}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Specialized error boundaries for different use cases
export function withFormErrorBoundary<P extends object>(
  Component: React.ComponentType<P>
) {
  return withErrorBoundary(
    Component,
    <div className="p-4 border border-red-200 rounded-md bg-red-50">
      <p className="text-sm text-red-600">
        There was an error with this form. Please refresh the page and try again.
      </p>
    </div>
  );
}

export function withTableErrorBoundary<P extends object>(
  Component: React.ComponentType<P>
) {
  return withErrorBoundary(
    Component,
    <div className="p-8 text-center">
      <p className="text-sm text-gray-500">
        Unable to load data. Please refresh the page.
      </p>
    </div>
  );
}