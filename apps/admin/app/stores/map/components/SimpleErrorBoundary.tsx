'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * Simple error boundary component for the MapView
 * Provides basic error handling with retry mechanism
 */
export class SimpleErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('MapView Error Boundary caught an error:', {
      error,
      errorInfo,
      retryCount: this.state.retryCount,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        retryCount: this.state.retryCount + 1,
      });

      // Call optional retry handler
      if (this.props.onRetry) {
        this.props.onRetry();
      }
    }
  };

  handleFallbackToList = () => {
    // Navigate to stores list view
    window.location.href = '/stores';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Simple error UI with retry
      return (
        <div style={{ 
          height: '400px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          textAlign: 'center',
          backgroundColor: 'var(--s-bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--s-border)',
        }}>
          <div style={{ 
            fontSize: '48px', 
            color: 'var(--s-error)', 
            marginBottom: '8px' 
          }}>
            🗺️
          </div>
          
          <div>
            <h3 style={{ 
              color: 'var(--s-error)', 
              fontSize: '18px', 
              fontWeight: '600',
              marginBottom: '8px' 
            }}>
              Map Failed to Load
            </h3>
            <p style={{ 
              color: 'var(--s-muted)', 
              fontSize: '14px',
              marginBottom: '16px',
              maxWidth: '400px',
              lineHeight: '1.4'
            }}>
              We encountered an issue loading the interactive map. You can try again or switch to the list view.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {this.state.retryCount < this.maxRetries && (
              <button 
                onClick={this.handleRetry}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--s-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Try Again ({this.maxRetries - this.state.retryCount} attempts left)
              </button>
            )}
            
            <button 
              onClick={this.handleFallbackToList}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--s-secondary)',
                color: 'var(--s-text)',
                border: '1px solid var(--s-border)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Switch to List View
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ 
              marginTop: '24px', 
              padding: '16px', 
              backgroundColor: 'var(--s-bg-tertiary)',
              borderRadius: '4px',
              border: '1px solid var(--s-border)',
              maxWidth: '600px',
              textAlign: 'left',
            }}>
              <summary style={{ 
                cursor: 'pointer', 
                fontWeight: '600',
                marginBottom: '8px',
                color: 'var(--s-muted)'
              }}>
                Error Details (Development)
              </summary>
              <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                <strong>Retry Count:</strong> {this.state.retryCount}/{this.maxRetries}
              </div>
              <pre style={{ 
                fontSize: '12px', 
                color: 'var(--s-error)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Simple hook for error handling in functional components
 */
export function useSimpleErrorHandler() {
  const [errorCount, setErrorCount] = React.useState(0);

  const handleError = React.useCallback((error: Error, context?: string) => {
    console.error(`Map Error (${context || 'unknown'}):`, {
      error,
      errorCount: errorCount + 1,
    });

    setErrorCount(prev => prev + 1);
  }, [errorCount]);

  const resetErrors = React.useCallback(() => {
    setErrorCount(0);
  }, []);

  return { 
    handleError, 
    resetErrors,
    errorCount,
  };
}