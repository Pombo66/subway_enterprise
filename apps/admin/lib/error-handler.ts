/**
 * Centralized error handling utility
 */

export class ErrorHandler {
  /**
   * Wraps async operations with standardized error handling
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string,
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      console.error(`${context}:`, error);
      return fallback;
    }
  }

  /**
   * Wraps sync operations with error handling
   */
  static withSyncErrorHandling<T>(
    operation: () => T,
    context: string,
    fallback?: T
  ): T | undefined {
    try {
      return operation();
    } catch (error) {
      console.error(`${context}:`, error);
      return fallback;
    }
  }

  /**
   * Formats error messages consistently
   */
  static formatError(error: unknown, defaultMessage: string): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return defaultMessage;
  }
}