/**
 * Enhanced form types with better type safety
 */

import { CreateMenuItemData } from '../types';

// More specific error types
export type FormFieldName = keyof CreateMenuItemData | 'general';

export interface FormErrors extends Partial<Record<FormFieldName, string>> {
  general?: string;
}

// Validation result with discriminated union
export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; errors: Partial<Record<keyof T, string>> };

// Form state types
export type FormState = 'idle' | 'submitting' | 'success' | 'error';

export interface FormStateData {
  state: FormState;
  error?: string;
}