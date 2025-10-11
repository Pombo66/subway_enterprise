'use client';

import React, { Component, ReactNode } from 'react';
import { MapTelemetryHelpers, safeTrackEvent, getCurrentUserId } from '../telemetry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

/**
 * Error boundary component specifically designed for the MapView
 * Provides graceful degradation and retry mechanisms for map failures
 */
export class MapErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('MapView Error Boundary caught an error:', error, errorInfo);

    // Track error telemetry
    safeTrackEvent(() => {
      MapTelemetryHelpers.trackMapError(error, getCurrentUserId(), {
        componentStack: errorInfo.componentStack,
        errorBoundary: 'MapErrorBoundary',
        retryCount: this.state.retryCount,
      });
    }, 'map_error');

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      // Track retry attempt
      safeTrackEvent(() => {
        MapTelemetryHelpers.trackMapRetry(this.state.retryCount + 1, getCurrentUserId(), {
          errorMessage: this.state.error?.message,
        });
      }, 'map_retry');

      // Reset error state and increment retry count
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1,
      });
    }
  };

  handleFallbackToList = () => {
    // Track fallback navigation
    safeTrackEvent(() => {
      MapTelemetryHelpers.trackMapFallback(getCurrentUserId(), {
        errorMessage: this.state.error?.message,
        retryCount: this.state.retryCount,
      });
    }, 'map_fallback');

    // Navigate to stores list view
    window.location.href = '/stores';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="s-panel">
          <div className="s-panelCard">
            <div style={{ 
              height: '400px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '16px',
              textAlign: 'center',
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
                    className="s-btn btn-primary"
                  >
                    Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                  </button>
                )}
                
                <button 
                  onClick={this.handleFallbackToList}
                  className="s-btn btn-secondary"
                >
                  Switch to List View
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details style={{ 
                  marginTop: '24px', 
                  padding: '16px', 
                  backgroundColor: 'var(--s-bg-secondary)',
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
                  <pre style={{ 
                    fontSize: '12px', 
                    color: 'var(--s-error)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version of the error boundary for functional components
 * Note: This is a simplified version - full error boundaries require class components
 */
export function useMapErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: string) => {
    console.error(`Map Error (${context || 'unknown'}):`, error);
    
    // Track error telemetry
    safeTrackEvent(() => {
      MapTelemetryHelpers.trackMapError(error, getCurrentUserId(), {
        context: context || 'hook',
        timestamp: new Date().toISOString(),
      });
    }, 'map_error');
  }, []);

  return { handleError };
}