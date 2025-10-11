'use client';

import { useCallback } from 'react';
import { useToast } from '@/app/components/ToastProvider';
import { ErrorHandler, ValidationError } from '../types/error.types';

interface UseErrorHandlerOptions {
  showToast?: boolean;
  logErrors?: boolean;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { showToast = true, logErrors = true } = options;
  const toast = useToast();

  const handleError = useCallback((error: unknown, context?: string) => {
    if (logErrors) {
      console.error(`Error${context ? ` in ${context}` : ''}:`, error);
    }

    const { message, details } = ErrorHandler.parseError(error);

    if (showToast) {
      if (details && details.length > 0) {
        // Show validation errors
        const fieldMessages = details.map(d => `${d.field}: ${d.message}`).join(', ');
        toast.showError(`${message}. ${fieldMessages}`);
      } else {
        // Show general error
        toast.showError(message);
      }
    }

    return { message, details };
  }, [showToast, logErrors, toast]);

  const handleApiError = useCallback(async <T>(
    apiCall: () => Promise<T>,
    context?: string,
    options?: {
      showSuccessToast?: boolean;
      successMessage?: string;
      suppressErrorToast?: boolean;
    }
  ): Promise<{ success: true; data: T } | { success: false; error: string; details?: ValidationError[] }> => {
    try {
      const data = await apiCall();
      
      if (options?.showSuccessToast && options?.successMessage) {
        toast.showSuccess(options.successMessage);
      }
      
      return { success: true, data };
    } catch (error) {
      if (logErrors) {
        console.error(`Error${context ? ` in ${context}` : ''}:`, error);
      }

      const { message, details } = ErrorHandler.parseError(error);

      if (showToast && !options?.suppressErrorToast) {
        if (details && details.length > 0) {
          // Show validation errors
          const fieldMessages = details.map(d => `${d.field}: ${d.message}`).join(', ');
          toast.showError(`${message}. ${fieldMessages}`);
        } else {
          // Show general error
          toast.showError(message);
        }
      }
      
      return { success: false, error: message, details };
    }
  }, [showToast, logErrors, toast]);

  const handleFormError = useCallback((error: unknown, context?: string) => {
    const { message, details } = ErrorHandler.parseError(error);
    
    if (logErrors) {
      console.error(`Form error${context ? ` in ${context}` : ''}:`, error);
    }

    // For form errors, we typically don't show toast notifications
    // as the errors are displayed inline with the form fields
    return { message, details };
  }, [logErrors]);

  const createErrorHandler = useCallback((context: string) => {
    return (error: unknown) => handleError(error, context);
  }, [handleError]);

  const createApiErrorHandler = useCallback(<T>(context: string) => {
    return (apiCall: () => Promise<T>, options?: {
      showSuccessToast?: boolean;
      successMessage?: string;
      suppressErrorToast?: boolean;
    }) => handleApiError(apiCall, context, options);
  }, [handleApiError]);

  return {
    handleError,
    handleApiError,
    handleFormError,
    createErrorHandler,
    createApiErrorHandler,
  };
}