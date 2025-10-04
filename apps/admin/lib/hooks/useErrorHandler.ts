/**
 * Centralized error handling hook
 */

import { useCallback } from 'react';
import { useToast } from '../../app/components/ToastProvider';
import { ErrorHandler, ValidationError, NetworkError, ApiError } from '../errors';

export const useErrorHandler = () => {
  const { showError } = useToast();
  
  const handleError = useCallback((error: unknown, context?: string): string => {
    let errorMessage: string;
    
    if (ErrorHandler.isValidationError(error)) {
      errorMessage = error.message;
    } else if (ErrorHandler.isNetworkError(error)) {
      errorMessage = error.status >= 500 
        ? 'Server error. Please try again later.'
        : 'Network error. Please check your connection.';
    } else if (ErrorHandler.isApiError(error)) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = 'An unexpected error occurred';
    }
    
    // Sanitize error message for security
    errorMessage = sanitizeErrorMessage(errorMessage);
    
    if (context) {
      console.error(`${context}:`, error);
    }
    
    showError(errorMessage);
    return errorMessage;
  }, [showError]);
  
  const handleAsyncError = useCallback(async <T>(
    operation: () => Promise<T>,
    context: string,
    fallbackValue?: T
  ): Promise<T | undefined> => {
    try {
      return await operation();
    } catch (error) {
      handleError(error, context);
      return fallbackValue;
    }
  }, [handleError]);
  
  return { 
    handleError, 
    handleAsyncError 
  };
};

// Security: Sanitize error messages to prevent XSS
const sanitizeErrorMessage = (message: string): string => {
  return message
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .substring(0, 200) // Limit length
    .trim();
};