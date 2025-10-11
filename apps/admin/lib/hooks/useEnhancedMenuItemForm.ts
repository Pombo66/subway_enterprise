/**
 * Enhanced menu item form hook with all improvements integrated
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { CreateMenuItemData } from '../types';
import { FormErrors } from '../types/form';
import { useFormState, FormStateHelpers } from './useFormState';
import { useMenuItems } from './useMenuItems';
import { useToast } from '../../app/components/ToastProvider';
import { MenuItemValidationStrategy, ValidationContext } from '../validation/strategies';
import { UI_CONFIG, FORM_MESSAGES } from '../config/enhanced-constants';
import { ErrorHandler } from '../errors';
import { performanceMonitor } from '../monitoring/performance';
import { debounce } from '../utils/debounce';
import { CreateMenuItemCommand } from '../commands/menu-item.commands';
import { ApiMenuItemRepository } from '../repositories/menu-item.repository';
import { useErrorHandler } from './useErrorHandler';

const initialFormData: CreateMenuItemData = {
  name: '',
  price: '',
  active: true,
  storeId: ''
};

export const useEnhancedMenuItemForm = (onSuccess: () => void, onClose: () => void) => {
  const [formData, setFormData] = useState<CreateMenuItemData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isValidating, setIsValidating] = useState(false);
  const [formState, formActions] = useFormState();
  const { createMenuItem } = useMenuItems();
  const { showSuccess, showError } = useToast();
  const repository = useRef(new ApiMenuItemRepository());

  // Validation using Strategy Pattern
  const validationContext = useRef(new ValidationContext(new MenuItemValidationStrategy()));
  const { handleError: handleValidationError } = useErrorHandler();
  
  const validateForm = useCallback((data: CreateMenuItemData): FormErrors => {
    const result = validationContext.current.validate(data);
    
    if (result.success) {
      return {};
    }
    
    return result.errors as FormErrors;
  }, []);

  // Debounced validation for better performance
  const debouncedValidate = useCallback(
    debounce((data: CreateMenuItemData) => {
      setIsValidating(true);
      performanceMonitor.measureSync('form.validation', () => {
        const validationErrors = validateForm(data);
        setErrors(validationErrors);
        setIsValidating(false);
      });
    }, UI_CONFIG.form.validationDebounce),
    [validateForm]
  );

  // Validate on form data changes
  useEffect(() => {
    if (formData.name || formData.price || formData.storeId) {
      debouncedValidate(formData);
    }
    return () => debouncedValidate.cancel();
  }, [formData, debouncedValidate]);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
    formActions.setIdle();
  }, [formActions]);

  const handleValidation = useCallback(() => {
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      formActions.setError('Validation failed');
      return false;
    }
    setErrors({});
    return true;
  }, [formData, validateForm, formActions]);

  const handleSuccess = useCallback((createAnother: boolean, nameInputRef?: React.RefObject<HTMLInputElement>) => {
    showSuccess(FORM_MESSAGES.SUCCESS.ITEM_CREATED);
    formActions.setSuccess();
    onSuccess();

    if (createAnother) {
      resetForm();
      setTimeout(() => {
        nameInputRef?.current?.focus();
      }, UI_CONFIG.form.refocusDelay);
    } else {
      resetForm();
      onClose();
    }
  }, [showSuccess, formActions, onSuccess, resetForm, onClose]);

  const handleError = useCallback((error: unknown) => {
    const errorMessage = handleValidationError(error, 'Menu item form');
    
    if (ErrorHandler.isValidationError(error)) {
      setErrors({ [error.field]: error.message });
    } else {
      formActions.setError(errorMessage.message);
      setErrors(prev => ({ ...prev, general: errorMessage.message }));
    }
  }, [handleValidationError, formActions]);

  // Command pattern implementation
  const submitWithCommand = useCallback(async (createAnother: boolean = false, nameInputRef?: React.RefObject<HTMLInputElement>) => {
    formActions.setSubmitting();
    
    if (!handleValidation()) return;

    const command = new CreateMenuItemCommand(
      formData,
      repository.current,
      () => handleSuccess(createAnother, nameInputRef),
      (error) => handleError(new Error(error))
    );

    try {
      await performanceMonitor.measureAsync('form.submit', async () => {
        await command.execute();
      });
    } catch (error) {
      handleError(error);
    }
  }, [formData, handleValidation, handleSuccess, handleError, formActions]);

  // Standard submission (backward compatibility)
  const submitForm = useCallback(async (createAnother: boolean = false, nameInputRef?: React.RefObject<HTMLInputElement>) => {
    formActions.setSubmitting();
    
    if (!handleValidation()) return;

    try {
      await performanceMonitor.measureAsync('form.submit', async () => {
        await createMenuItem(formData);
        handleSuccess(createAnother, nameInputRef);
      });
    } catch (error) {
      handleError(error);
    }
  }, [formData, createMenuItem, handleValidation, handleSuccess, handleError, formActions]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Clear field error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  }, [errors]);

  // Form state helpers
  const isValid = useCallback(() => {
    return Object.keys(errors).length === 0 && !isValidating;
  }, [errors, isValidating]);

  const canSubmit = useCallback(() => {
    return isValid() && !FormStateHelpers.isLoading(formState) && formData.name && formData.price && formData.storeId;
  }, [isValid, formState, formData]);

  return {
    // Form data
    formData,
    setFormData,
    errors,
    setErrors,
    
    // Form state
    formState,
    isLoading: FormStateHelpers.isLoading(formState),
    isValidating,
    isValid: isValid(),
    canSubmit: canSubmit(),
    
    // Form actions
    validateForm,
    resetForm,
    submitForm,
    submitWithCommand,
    handleInputChange,
    
    // Utilities
    performanceMonitor
  };
};