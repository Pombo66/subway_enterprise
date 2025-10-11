import { Validator } from '../validation';

/**
 * Factory for creating common validation patterns
 * Reduces code duplication and ensures consistency
 */
export class ValidationFactory {
  /**
   * Creates a validator for store names
   */
  static createStoreNameValidator(): Validator {
    return Validator.create()
      .required('Store name is required')
      .minLength(2, 'Store name must be at least 2 characters')
      .maxLength(100, 'Store name must be no more than 100 characters');
  }

  /**
   * Creates a validator for menu item names
   */
  static createMenuItemNameValidator(): Validator {
    return Validator.create()
      .required('Item name is required')
      .minLength(1, 'Item name cannot be empty')
      .maxLength(80, 'Item name must be no more than 80 characters');
  }

  /**
   * Creates a validator for prices
   */
  static createPriceValidator(maxPrice: number = 999.99): Validator {
    return Validator.create()
      .required('Price is required')
      .decimal('Price must be a valid decimal number')
      .positiveNumber('Price must be greater than 0')
      .maxValue(maxPrice, `Price cannot exceed £${maxPrice}`);
  }

  /**
   * Creates a validator for email addresses
   */
  static createEmailValidator(): Validator {
    return Validator.create()
      .required('Email is required')
      .addRule({
        validate: (value: string) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(value);
        },
        message: 'Please enter a valid email address',
      });
  }

  /**
   * Creates a validator for user roles
   */
  static createUserRoleValidator(): Validator {
    const validRoles = ['ADMIN', 'MANAGER', 'STAFF'];
    return Validator.create()
      .required('Role is required')
      .addRule({
        validate: (value: string) => validRoles.includes(value.toUpperCase()),
        message: `Role must be one of: ${validRoles.join(', ')}`,
      });
  }

  /**
   * Creates a validator for order status
   */
  static createOrderStatusValidator(): Validator {
    const validStatuses = ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
    return Validator.create()
      .required('Status is required')
      .addRule({
        validate: (value: string) => validStatuses.includes(value.toUpperCase()),
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
  }

  /**
   * Creates a validator for JSON strings
   */
  static createJsonValidator(required: boolean = false): Validator {
    const validator = Validator.create();
    
    if (required) {
      validator.required('JSON data is required');
    }
    
    return validator.json('Must be valid JSON format');
  }

  /**
   * Creates a validator for country codes (ISO 2-letter)
   */
  static createCountryCodeValidator(): Validator {
    return Validator.create()
      .required('Country code is required')
      .addRule({
        validate: (value: string) => /^[A-Z]{2}$/.test(value.toUpperCase()),
        message: 'Country code must be a 2-letter ISO code (e.g., GB, FR)',
      });
  }

  /**
   * Creates a validator for phone numbers (basic international format)
   */
  static createPhoneValidator(): Validator {
    return Validator.create()
      .required('Phone number is required')
      .addRule({
        validate: (value: string) => {
          // Basic international phone format validation
          const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
          return phoneRegex.test(value);
        },
        message: 'Please enter a valid phone number',
      });
  }

  /**
   * Creates a validator for percentage values (0-100)
   */
  static createPercentageValidator(): Validator {
    return Validator.create()
      .required('Percentage is required')
      .decimal('Percentage must be a valid number')
      .addRule({
        validate: (value: string) => {
          const num = parseFloat(value);
          return !isNaN(num) && num >= 0 && num <= 100;
        },
        message: 'Percentage must be between 0 and 100',
      });
  }
}