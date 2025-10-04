import { useState, useEffect } from 'react';
import { ValidationResult } from '../validation';

/**
 * Hook for debounced validation to improve performance
 */
export function useDebouncedValidation(
  value: string,
  validator: (value: string) => ValidationResult,
  delay: number = 300
): ValidationResult {
  const [result, setResult] = useState<ValidationResult>({ isValid: true, errors: [] });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value) {
        setResult(validator(value));
      } else {
        setResult({ isValid: true, errors: [] });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [value, validator, delay]);

  return result;
}

/**
 * Generic debounced value hook
 */
export function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}