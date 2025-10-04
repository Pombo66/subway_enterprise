/**
 * @deprecated Use apps/admin/lib/config/index.ts instead
 * This file is kept for backward compatibility
 */

export const UI_CONSTANTS = {
  DRAWER: {
    ANIMATION_DURATION: 300,
    WIDTH: 'w-96',
    Z_INDEX_BACKDROP: 'z-40',
    Z_INDEX_DRAWER: 'z-50',
  },
  FORM: {
    AUTO_FOCUS_DELAY: 300,
    VALIDATION_DEBOUNCE: 300,
    REFOCUS_DELAY: 100,
  },
  TOAST: {
    DEFAULT_DURATION: 5000,
    SUCCESS_DURATION: 3000,
    ERROR_DURATION: 7000,
  },
  VALIDATION: {
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 100,
    PRICE_MAX_VALUE: 999.99,
  },
} as const;

export const FORM_MESSAGES = {
  VALIDATION: {
    NAME_REQUIRED: 'Item name is required',
    NAME_MIN_LENGTH: `Item name must be at least ${UI_CONSTANTS.VALIDATION.NAME_MIN_LENGTH} characters`,
    NAME_MAX_LENGTH: `Item name cannot exceed ${UI_CONSTANTS.VALIDATION.NAME_MAX_LENGTH} characters`,
    PRICE_REQUIRED: 'Price is required',
    PRICE_DECIMAL: 'Price must be a valid decimal (e.g., 12.99)',
    PRICE_POSITIVE: 'Price must be greater than 0',
    PRICE_MAX_VALUE: `Price cannot exceed $${UI_CONSTANTS.VALIDATION.PRICE_MAX_VALUE}`,
    STORE_REQUIRED: 'Store selection is required',
  },
  SUCCESS: {
    ITEM_CREATED: 'Menu item created successfully!',
  },
  ERROR: {
    CREATION_FAILED: 'Failed to create menu item. Please try again.',
  },
} as const;import { U
I_CONFIG, FORM_MESSAGES } from '../config/enhanced-constants';

// Re-export for backward compatibility
export const UI_CONSTANTS = UI_CONFIG;
export { FORM_MESSAGES };