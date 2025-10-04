import { useState, useCallback } from 'react';

export type FormState = 
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'submitting' }
  | { status: 'success'; data?: any }
  | { status: 'error'; error: string };

export interface FormStateActions {
  setIdle: () => void;
  setValidating: () => void;
  setSubmitting: () => void;
  setSuccess: (data?: any) => void;
  setError: (error: string) => void;
  reset: () => void;
}

/**
 * Hook for managing form state with type-safe transitions
 */
export function useFormState(): [FormState, FormStateActions] {
  const [state, setState] = useState<FormState>({ status: 'idle' });

  const actions: FormStateActions = {
    setIdle: useCallback(() => setState({ status: 'idle' }), []),
    setValidating: useCallback(() => setState({ status: 'validating' }), []),
    setSubmitting: useCallback(() => setState({ status: 'submitting' }), []),
    setSuccess: useCallback((data?: any) => setState({ status: 'success', data }), []),
    setError: useCallback((error: string) => setState({ status: 'error', error }), []),
    reset: useCallback(() => setState({ status: 'idle' }), []),
  };

  return [state, actions];
}

/**
 * Helper functions for checking form state
 */
export const FormStateHelpers = {
  isIdle: (state: FormState): state is { status: 'idle' } => state.status === 'idle',
  isValidating: (state: FormState): state is { status: 'validating' } => state.status === 'validating',
  isSubmitting: (state: FormState): state is { status: 'submitting' } => state.status === 'submitting',
  isSuccess: (state: FormState): state is { status: 'success'; data?: any } => state.status === 'success',
  isError: (state: FormState): state is { status: 'error'; error: string } => state.status === 'error',
  isLoading: (state: FormState): boolean => state.status === 'validating' || state.status === 'submitting',
};