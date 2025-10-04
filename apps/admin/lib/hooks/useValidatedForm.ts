/**
 * Hook for form validation with debouncing
 */

import { useState, useEffect, useMemo } from 'react';
import { debounce } from '../utils/debounce';
import { UI_CONSTANTS } from '../constants/ui';
import { FormErrors } from '../types/form';

export const useValidatedForm = <T>(
  initialData: T,
  validator: (data: T) => FormErrors
) => {
  const [formData, setFormData] = useState<T>(initialData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isValidating, setIsValidating] = useState(false);

  // Debounced validation to improve performance
  const debouncedValidate = useMemo(
    () => debounce((data: T) => {
      setIsValidating(true);
      const validationErrors = validator(data);
      setErrors(validationErrors);
      setIsValidating(false);
    }, UI_CONSTANTS.FORM.VALIDATION_DEBOUNCE),
    [validator]
  );

  useEffect(() => {
    debouncedValidate(formData);
    return () => debouncedValidate.cancel();
  }, [formData, debouncedValidate]);

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  return { 
    formData, 
    setFormData, 
    errors, 
    setErrors,
    isValidating, 
    isValid 
  };
};