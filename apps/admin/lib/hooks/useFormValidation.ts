'use client';

import { useState, useCallback } from 'react';
import { z } from 'zod';
import { ValidationError, ErrorHandler } from '../types/error.types';

interface UseFormValidationOptions<T> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void>;
  onError?: (error: unknown) => void;
}

interface FormState {
  isSubmitting: boolean;
  errors: ValidationError[];
  submitError: string | null;
}

export function useFormValidation<T>({ 
  schema, 
  onSubmit, 
  onError 
}: UseFormValidationOptions<T>) {
  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    errors: [],
    submitError: null,
  });

  const validateField = useCallback((fieldName: string, value: unknown) => {
    try {
      // For field-level validation, we'll validate the entire form
      // and only show errors for the specific field
      const testData = { [fieldName]: value };
      schema.parse(testData);
      
      // Remove any existing errors for this field
      setFormState(prev => ({
        ...prev,
        errors: prev.errors.filter(err => err.field !== fieldName),
      }));
      
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.filter(err => 
          err.path.join('.') === fieldName
        );
        
        if (fieldErrors.length > 0) {
          const validationErrors: ValidationError[] = fieldErrors.map(err => ({
            field: fieldName,
            message: err.message,
            code: err.code,
          }));
          
          setFormState(prev => ({
            ...prev,
            errors: [
              ...prev.errors.filter(err => err.field !== fieldName),
              ...validationErrors,
            ],
          }));
        }
      }
      return false;
    }
  }, [schema]);

  const validateForm = useCallback((data: Record<string, unknown>) => {
    try {
      const validatedData = schema.parse(data);
      setFormState(prev => ({ ...prev, errors: [], submitError: null }));
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors: ValidationError[] = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        setFormState(prev => ({
          ...prev,
          errors: validationErrors,
          submitError: null,
        }));
        
        return { success: false, errors: validationErrors };
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      setFormState(prev => ({
        ...prev,
        submitError: errorMessage,
        errors: [],
      }));
      
      return { success: false, error: errorMessage };
    }
  }, [schema]);

  const handleSubmit = useCallback(async (data: Record<string, unknown>) => {
    setFormState(prev => ({ ...prev, isSubmitting: true, submitError: null }));
    
    try {
      const validation = validateForm(data);
      if (!validation.success) {
        return;
      }
      
      await onSubmit(validation.data as T);
      
      // Clear form state on successful submission
      setFormState({
        isSubmitting: false,
        errors: [],
        submitError: null,
      });
    } catch (error) {
      console.error('Form submission error:', error);
      
      const { message, details } = ErrorHandler.parseError(error);
      
      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        submitError: message,
        errors: details || [],
      }));
      
      onError?.(error);
    }
  }, [validateForm, onSubmit, onError]);

  const clearErrors = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      errors: [],
      submitError: null,
    }));
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setFormState(prev => ({
      ...prev,
      errors: prev.errors.filter(err => err.field !== fieldName),
    }));
  }, []);

  const getFieldError = useCallback((fieldName: string) => {
    return ErrorHandler.getFieldError(formState.errors, fieldName);
  }, [formState.errors]);

  const hasFieldError = useCallback((fieldName: string) => {
    return ErrorHandler.hasFieldError(formState.errors, fieldName);
  }, [formState.errors]);

  return {
    // State
    isSubmitting: formState.isSubmitting,
    errors: formState.errors,
    submitError: formState.submitError,
    
    // Actions
    validateField,
    validateForm,
    handleSubmit,
    clearErrors,
    clearFieldError,
    
    // Utilities
    getFieldError,
    hasFieldError,
  };
}