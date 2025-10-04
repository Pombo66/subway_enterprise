/**
 * Custom hook for menu item form logic
 */

import { useState, useCallback } from 'react';
import { CreateMenuItemData, FormErrors } from '../types';
import { useFormState, FormStateHelpers } from './useFormState';
import { useMenuItems } from './useMenuItems';
import { useToast } from '../../app/components/ToastProvider';
import { Validator } from '../validation';
import { UI_CONSTANTS, FORM_MESSAGES } from '../constants/ui';
import { ErrorHandler } from '../errors';

const initialFormData: CreateMenuItemData = {
  name: '',
  price: '',
  active: true,
  storeId: ''
};

export const useMenuItemForm = (onSuccess: () => void, onClose: () => void) => {
  const [formData, setFormData] = useState<CreateMenuItemData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formState, formActions] = useFormState();
  const { createMenuItem } = useMenuItems();
  const { showSuccess, showError } = useToast();

  const validateForm = useCallback((data: CreateMenuItemData): FormErrors => {
    const errors: FormErrors = {};
    
    // Validate name
    const nameValidation = Validator.create()
      .required(FORM_MESSAGES.VALIDATION.NAME_REQUIRED)
      .minLength(UI_CONSTANTS.VALIDATION.NAME_MIN_LENGTH, FORM_MESSAGES.VALIDATION.NAME_MIN_LENGTH)
      .maxLength(UI_CONSTANTS.VALIDATION.NAME_MAX_LENGTH, FORM_MESSAGES.VALIDATION.NAME_MAX_LENGTH)
      .validate(data.name);
    
    if (!nameValidation.isValid) {
      errors.name = nameValidation.errors[0];
    }
    
    // Validate price
    const priceValidation = Validator.create()
      .required(FORM_MESSAGES.VALIDATION.PRICE_REQUIRED)
      .decimal(FORM_MESSAGES.VALIDATION.PRICE_DECIMAL)
      .positiveNumber(FORM_MESSAGES.VALIDATION.PRICE_POSITIVE)
      .maxValue(UI_CONSTANTS.VALIDATION.PRICE_MAX_VALUE, FORM_MESSAGES.VALIDATION.PRICE_MAX_VALUE)
      .validate(data.price);
    
    if (!priceValidation.isValid) {
      errors.price = priceValidation.errors[0];
    }
    
    // Validate store selection
    if (!data.storeId) {
      errors.storeId = FORM_MESSAGES.VALIDATION.STORE_REQUIRED;
    }
    
    return errors;
  }, []);

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
      }, UI_CONSTANTS.FORM.REFOCUS_DELAY);
    } else {
      resetForm();
      onClose();
    }
  }, [showSuccess, formActions, onSuccess, resetForm, onClose]);

  const handleError = useCallback((error: unknown) => {
    let errorMessage: string = FORM_MESSAGES.ERROR.CREATION_FAILED;
    
    if (ErrorHandler.isValidationError(error)) {
      setErrors({ [error.field]: error.message });
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    showError(errorMessage);
    formActions.setError(errorMessage);
    setErrors(prev => ({ ...prev, general: errorMessage }));
  }, [showError, formActions]);

  const submitForm = useCallback(async (createAnother: boolean = false, nameInputRef?: React.RefObject<HTMLInputElement>) => {
    formActions.setSubmitting();
    
    if (!handleValidation()) return;

    try {
      await createMenuItem(formData);
      handleSuccess(createAnother, nameInputRef);
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

  return {
    formData,
    setFormData,
    errors,
    setErrors,
    formState,
    validateForm,
    resetForm,
    submitForm,
    handleInputChange,
    isLoading: FormStateHelpers.isLoading(formState)
  };
};