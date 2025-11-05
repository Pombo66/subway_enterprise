/**
 * MapErrorBoundary - Comprehensive error handling for map components
 * Provides graceful degradation and fallback UI when map fails
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { StoreWithActivity } from '../types';

interface MapErrorBoundaryProps {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onRecovery?: () => void;
  memoryCleanupCallback?: () => void;
  circuitBreakerThreshold?: number;
  stores?: StoreWithActivity[];
  loading?: boolean;
  onStoreSelect?: (store: any) => void;
  enableFallbackView?: boolean;
}

interface MapErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

/**
 * Error boundary specifically designed for map components
 * Provides fallback UI and error recovery mechanisms
 */
export class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: MapErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<MapErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Map Error Boundary caught error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Emit telemetry
    if (typeof window !== 'undefined' && (window as any).telemetry) {
      (window as any).telemetry.track('map_error_boundary', {
        error: error.message,
        stack: error.stack?.substring(0, 500), // Truncated for privacy
        componentStack: errorInfo.componentStack?.substring(0, 500),
        retryCount: this.state.retryCount,
        timestamp: Date.now()
      });
    }

    // Attempt automatic recovery for certain error types
    this.attemptRecovery(error);
  }

  private attemptRecovery = (error: Error) => {
    const { retryCount } = this.state;
    
    // Don't retry if we've exceeded max attempts
    if (retryCount >= this.maxRetries) {
      console.warn('⚠️ Max retry attempts reached, showing fallback UI');
      return;
    }

    // Check if error is recoverable
    const isRecoverable = this.isRecoverableError(error);
    
    if (isRecoverable) {
      console.log(`🔄 Attempting recovery (${retryCount + 1}/${this.maxRetries})`);
      
      // Clear any existing timeout
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
      }
      
      // Delay recovery to avoid immediate retry loops
      this.retryTimeout = setTimeout(() => {
        this.setState(prevState => ({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: prevState.retryCount + 1
        }));
      }, 2000 * (retryCount + 1)); // Exponential backoff
    }
  };

  private isRecoverableError = (error: Error): boolean => {
    const recoverablePatterns = [
      /network/i,
      /timeout/i,
      /load/i,
      /initialization/i,
      /webgl/i
    ];
    
    return recoverablePatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.name)
    );
  };

  private handleRetry = () => {
    console.log('🔄 Manual retry requested');
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0 // Reset retry count on manual retry
    });
  };

  private handleFallbackToList = () => {
    console.log('📋 Switching to list view fallback');
    
    // Navigate to list view
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'list');
      window.history.pushState({}, '', url.toString());
      window.location.reload();
    }
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      const { error, retryCount } = this.state;
      const { stores = [], fallbackComponent } = this.props;
      
      // Show custom fallback component if provided
      if (fallbackComponent) {
        return fallbackComponent;
      }
      
      // Show default error UI
      return (
        <div className="map-error-boundary">
          <div className="error-content">
            <div className="error-header">
              <div className="error-icon">🗺️</div>
              <div className="error-title">
                <h3>Map Temporarily Unavailable</h3>
                <p>
                  {retryCount >= this.maxRetries 
                    ? 'The map is experiencing technical difficulties.'
                    : 'Attempting to restore map functionality...'
                  }
                </p>
              </div>
            </div>
            
            {error && process.env.NODE_ENV === 'development' && (
              <div className="error-details">
                <details>
                  <summary>Error Details (Development)</summary>
                  <pre>{error.message}</pre>
                  {error.stack && (
                    <pre className="error-stack">{error.stack.substring(0, 500)}</pre>
                  )}
                </details>
              </div>
            )}
            
            <div className="error-actions">
              {retryCount < this.maxRetries ? (
                <button onClick={this.handleRetry} className="retry-button">
                  Try Again
                </button>
              ) : (
                <button onClick={this.handleFallbackToList} className="fallback-button">
                  View Store List
                </button>
              )}
            </div>
            
            {/* Simple store list as fallback */}
            {stores.length > 0 && (
              <div className="fallback-store-list">
                <h4>Available Stores ({stores.length})</h4>
                <div className="store-grid">
                  {stores.slice(0, 12).map(store => (
                    <div key={store.id} className="store-card">
                      <div className="store-name">{store.name}</div>
                      <div className="store-location">{store.country}</div>
                      {store.recentActivity && (
                        <div className="store-activity">🟢 Active</div>
                      )}
                    </div>
                  ))}
                  {stores.length > 12 && (
                    <div className="store-card more-stores">
                      +{stores.length - 12} more stores
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <style jsx>{`
            .map-error-boundary {
              width: 100%;
              height: 600px;
              background: var(--s-panel);
              border: 1px solid var(--s-border);
              border-radius: 8px;
              padding: 32px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
            }
            
            .error-content {
              max-width: 500px;
              width: 100%;
            }
            
            .error-header {
              display: flex;
              align-items: center;
              gap: 16px;
              margin-bottom: 24px;
            }
            
            .error-icon {
              font-size: 48px;
              opacity: 0.6;
            }
            
            .error-title h3 {
              margin: 0 0 8px 0;
              font-size: 18px;
              font-weight: 600;
              color: var(--s-text);
            }
            
            .error-title p {
              margin: 0;
              font-size: 14px;
              color: var(--s-muted);
            }
            
            .error-details {
              margin: 16px 0;
              text-align: left;
            }
            
            .error-details summary {
              cursor: pointer;
              font-size: 12px;
              color: var(--s-muted);
              margin-bottom: 8px;
            }
            
            .error-details pre {
              background: var(--s-surface);
              padding: 8px;
              border-radius: 4px;
              font-size: 11px;
              color: var(--s-text);
              overflow: auto;
              max-height: 100px;
            }
            
            .error-stack {
              margin-top: 8px;
              opacity: 0.7;
            }
            
            .error-actions {
              margin: 24px 0;
            }
            
            .retry-button, .fallback-button {
              background: var(--s-primary);
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: background 0.2s;
            }
            
            .retry-button:hover, .fallback-button:hover {
              background: var(--s-primary-hover);
            }
            
            .fallback-store-list {
              margin-top: 32px;
              text-align: left;
            }
            
            .fallback-store-list h4 {
              margin: 0 0 16px 0;
              font-size: 16px;
              font-weight: 600;
              color: var(--s-text);
            }
            
            .store-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 12px;
            }
            
            .store-card {
              background: var(--s-surface);
              border: 1px solid var(--s-border);
              border-radius: 6px;
              padding: 12px;
            }
            
            .store-name {
              font-weight: 500;
              font-size: 14px;
              color: var(--s-text);
              margin-bottom: 4px;
            }
            
            .store-location {
              font-size: 12px;
              color: var(--s-muted);
              margin-bottom: 4px;
            }
            
            .store-activity {
              font-size: 11px;
              color: #22c55e;
              font-weight: 500;
            }
            
            .more-stores {
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              color: var(--s-muted);
              font-style: italic;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;