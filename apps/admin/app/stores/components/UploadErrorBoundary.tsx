'use client';

import React, { Component, ReactNode } from 'react';
import { ErrorLogger } from '../../../lib/errors/upload-errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export default class UploadErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error
    ErrorLogger.logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'UploadErrorBoundary'
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="upload-error-boundary">
          <div className="error-content">
            <div className="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h3 className="error-title">Upload Error</h3>
            <p className="error-message">
              Something went wrong with the upload feature. Please try again.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <pre className="error-stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className="error-actions">
              <button 
                onClick={this.handleRetry}
                className="retry-button"
              >
                Try Again
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="reload-button"
              >
                Reload Page
              </button>
            </div>
          </div>

          <style jsx>{`
            .upload-error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 200px;
              padding: 24px;
              background: var(--s-bg-secondary);
              border: 1px solid var(--s-border);
              border-radius: 8px;
            }

            .error-content {
              text-align: center;
              max-width: 400px;
            }

            .error-icon {
              color: var(--s-error, #dc3545);
              margin-bottom: 16px;
            }

            .error-title {
              font-size: 18px;
              font-weight: 600;
              color: var(--s-text);
              margin: 0 0 8px 0;
            }

            .error-message {
              font-size: 14px;
              color: var(--s-muted);
              margin: 0 0 24px 0;
              line-height: 1.5;
            }

            .error-details {
              text-align: left;
              margin: 16px 0;
              padding: 12px;
              background: var(--s-bg);
              border: 1px solid var(--s-border);
              border-radius: 4px;
            }

            .error-details summary {
              cursor: pointer;
              font-weight: 500;
              margin-bottom: 8px;
            }

            .error-stack {
              font-size: 12px;
              color: var(--s-muted);
              white-space: pre-wrap;
              overflow-x: auto;
              margin: 0;
            }

            .error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
            }

            .retry-button,
            .reload-button {
              padding: 8px 16px;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
              border: none;
            }

            .retry-button {
              background: var(--s-primary);
              color: white;
            }

            .retry-button:hover {
              background: var(--s-primary-dark, #0056b3);
            }

            .reload-button {
              background: var(--s-bg-secondary);
              color: var(--s-text);
              border: 1px solid var(--s-border);
            }

            .reload-button:hover {
              background: var(--s-border);
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}