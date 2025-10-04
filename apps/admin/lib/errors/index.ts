/**
 * Enhanced error handling with specific error types
 */

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ErrorHandler {
  static async withErrorHandling<T, E extends Error = Error>(
    operation: () => Promise<T>,
    context: string,
    errorHandler?: (error: E) => T | Promise<T>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.error(`${context}:`, error);
      
      if (errorHandler && error instanceof Error) {
        return await errorHandler(error as E);
      }
      
      // Re-throw for specific handling
      throw error;
    }
  }

  static withSyncErrorHandling<T, E extends Error = Error>(
    operation: () => T,
    context: string,
    errorHandler?: (error: E) => T
  ): T {
    try {
      return operation();
    } catch (error) {
      console.error(`${context}:`, error);
      
      if (errorHandler && error instanceof Error) {
        return errorHandler(error as E);
      }
      
      throw error;
    }
  }

  static formatError(error: unknown, defaultMessage: string): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return defaultMessage;
  }

  static isValidationError(error: unknown): error is ValidationError {
    return error instanceof ValidationError;
  }

  static isNetworkError(error: unknown): error is NetworkError {
    return error instanceof NetworkError;
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }
}