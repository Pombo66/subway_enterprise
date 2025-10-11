import { BaseError, ValidationError, NetworkError, ApiError } from './base.error';

export type ErrorContext = {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
};

export interface ErrorHandlerOptions {
  logToConsole?: boolean;
  showToUser?: boolean;
  fallbackMessage?: string;
}

/**
 * Centralized error handling utility
 */
export class ErrorHandler {
  /**
   * Handles errors with context and options
   */
  static handle(
    error: unknown,
    context: ErrorContext = {},
    options: ErrorHandlerOptions = {}
  ): {
    message: string;
    shouldShowToUser: boolean;
    errorCode?: string;
  } {
    const {
      logToConsole = true,
      showToUser = true,
      fallbackMessage = 'An unexpected error occurred',
    } = options;

    // Log error with context
    if (logToConsole) {
      console.error('Error occurred:', {
        error,
        context,
        timestamp: new Date().toISOString(),
      });
    }

    // Handle different error types
    if (error instanceof BaseError) {
      return {
        message: error.message,
        shouldShowToUser: showToUser,
        errorCode: error.code,
      };
    }

    if (error instanceof Error) {
      return {
        message: showToUser ? error.message : fallbackMessage,
        shouldShowToUser: showToUser,
      };
    }

    // Handle string errors
    if (typeof error === 'string') {
      return {
        message: showToUser ? error : fallbackMessage,
        shouldShowToUser: showToUser,
      };
    }

    // Unknown error type
    return {
      message: fallbackMessage,
      shouldShowToUser: showToUser,
    };
  }

  /**
   * Wraps async operations with error handling
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext = {},
    options: ErrorHandlerOptions = {}
  ): Promise<{ success: true; data: T } | { success: false; error: string; code?: string }> {
    try {
      const data = await operation();
      return { success: true, data };
    } catch (error) {
      const handled = this.handle(error, context, options);
      return {
        success: false,
        error: handled.message,
        code: handled.errorCode,
      };
    }
  }

  /**
   * Wraps sync operations with error handling
   */
  static withSyncErrorHandling<T>(
    operation: () => T,
    context: ErrorContext = {},
    options: ErrorHandlerOptions = {}
  ): { success: true; data: T } | { success: false; error: string; code?: string } {
    try {
      const data = operation();
      return { success: true, data };
    } catch (error) {
      const handled = this.handle(error, context, options);
      return {
        success: false,
        error: handled.message,
        code: handled.errorCode,
      };
    }
  }

  /**
   * Type guards for error identification
   */
  static isValidationError(error: unknown): error is ValidationError {
    return error instanceof ValidationError;
  }

  static isNetworkError(error: unknown): error is NetworkError {
    return error instanceof NetworkError;
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }

  static isBaseError(error: unknown): error is BaseError {
    return error instanceof BaseError;
  }

  /**
   * Formats error for user display
   */
  static formatForUser(error: unknown): string {
    if (this.isValidationError(error)) {
      return error.message;
    }

    if (this.isNetworkError(error)) {
      if (error.status >= 500) {
        return 'Server error. Please try again later.';
      }
      if (error.status === 404) {
        return 'The requested resource was not found.';
      }
      if (error.status === 403) {
        return 'You do not have permission to perform this action.';
      }
      if (error.status === 401) {
        return 'Please log in to continue.';
      }
      return 'Network error. Please check your connection and try again.';
    }

    if (this.isApiError(error)) {
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Creates error boundary handler for React components
   */
  static createErrorBoundaryHandler(componentName: string) {
    return (error: Error, errorInfo: { componentStack: string }) => {
      this.handle(error, {
        component: componentName,
        action: 'render',
        metadata: { componentStack: errorInfo.componentStack },
      });
    };
  }

  /**
   * Creates form submission error handler
   */
  static createFormErrorHandler(formName: string) {
    return (error: unknown) => {
      return this.handle(error, {
        component: formName,
        action: 'submit',
      });
    };
  }

  /**
   * Creates API call error handler
   */
  static createApiErrorHandler(endpoint: string, method: string = 'GET') {
    return (error: unknown) => {
      return this.handle(error, {
        action: 'api_call',
        metadata: { endpoint, method },
      });
    };
  }
}