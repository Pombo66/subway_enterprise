/**
 * Validation strategies using Strategy Pattern
 */

import { CreateMenuItemData } from '../types';
import { ValidationResult } from '../types/form';
import { FORM_MESSAGES } from '../config/enhanced-constants';

export interface ValidationStrategy<T> {
  validate(data: T): ValidationResult<T>;
}

export class MenuItemValidationStrategy implements ValidationStrategy<CreateMenuItemData> {
  validate(data: CreateMenuItemData): ValidationResult<CreateMenuItemData> {
    const errors: Partial<Record<keyof CreateMenuItemData, string>> = {};
    
    // Name validation
    if (!data.name?.trim()) {
      errors.name = FORM_MESSAGES.VALIDATION.NAME_REQUIRED;
    } else {
      const name = data.name.trim();
      if (name.length < 2) {
        errors.name = FORM_MESSAGES.VALIDATION.NAME_MIN_LENGTH;
      } else if (name.length > 100) {
        errors.name = FORM_MESSAGES.VALIDATION.NAME_MAX_LENGTH;
      } else if (!/^[a-zA-Z0-9\s\-&']+$/.test(name)) {
        errors.name = 'Name can only contain letters, numbers, spaces, hyphens, ampersands, and apostrophes';
      } else if (name.includes('  ')) {
        errors.name = 'Name cannot contain consecutive spaces';
      }
    }
    
    // Price validation
    if (!data.price?.trim()) {
      errors.price = FORM_MESSAGES.VALIDATION.PRICE_REQUIRED;
    } else {
      const price = parseFloat(data.price);
      if (isNaN(price)) {
        errors.price = FORM_MESSAGES.VALIDATION.PRICE_DECIMAL;
      } else if (price <= 0) {
        errors.price = FORM_MESSAGES.VALIDATION.PRICE_POSITIVE;
      } else if (price > 999.99) {
        errors.price = FORM_MESSAGES.VALIDATION.PRICE_MAX_VALUE;
      } else if (price < 0.01) {
        errors.price = 'Price must be at least $0.01';
      } else if ((price * 100) % 1 !== 0) {
        errors.price = 'Price can have at most 2 decimal places';
      }
    }
    
    // Store validation
    if (!data.storeId) {
      errors.storeId = FORM_MESSAGES.VALIDATION.STORE_REQUIRED;
    }
    
    const hasErrors = Object.keys(errors).length > 0;
    
    return hasErrors 
      ? { success: false, errors }
      : { success: true, data };
  }
}

export class ValidationContext<T> {
  constructor(private strategy: ValidationStrategy<T>) {}
  
  validate(data: T): ValidationResult<T> {
    return this.strategy.validate(data);
  }
  
  setStrategy(strategy: ValidationStrategy<T>): void {
    this.strategy = strategy;
  }
}