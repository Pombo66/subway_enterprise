/**
 * Enhanced validation rules for comprehensive form validation
 */

export interface ValidationRule<T = any> {
  validate: (value: T) => boolean;
  message: string;
}

export class EnhancedValidator {
  private rules: ValidationRule[] = [];

  static create(): EnhancedValidator {
    return new EnhancedValidator();
  }

  // Basic validation rules
  required(message: string = 'This field is required'): EnhancedValidator {
    this.rules.push({
      validate: (value: any) => {
        if (typeof value === 'string') return value.trim().length > 0;
        return value !== null && value !== undefined && value !== '';
      },
      message
    });
    return this;
  }

  minLength(min: number, message?: string): EnhancedValidator {
    this.rules.push({
      validate: (value: string) => !value || value.length >= min,
      message: message || `Must be at least ${min} characters`
    });
    return this;
  }

  maxLength(max: number, message?: string): EnhancedValidator {
    this.rules.push({
      validate: (value: string) => !value || value.length <= max,
      message: message || `Must be no more than ${max} characters`
    });
    return this;
  }

  // Enhanced numeric validation
  decimal(message: string = 'Must be a valid decimal number'): EnhancedValidator {
    this.rules.push({
      validate: (value: string) => !value || /^\d+(\.\d{1,2})?$/.test(value),
      message
    });
    return this;
  }

  positiveNumber(message: string = 'Must be a positive number'): EnhancedValidator {
    this.rules.push({
      validate: (value: string) => {
        if (!value) return true;
        const num = parseFloat(value);
        return !isNaN(num) && num > 0;
      },
      message
    });
    return this;
  }

  maxValue(max: number, message?: string): EnhancedValidator {
    this.rules.push({
      validate: (value: string) => {
        if (!value) return true;
        const num = parseFloat(value);
        return !isNaN(num) && num <= max;
      },
      message: message || `Must be no more than ${max}`
    });
    return this;
  }

  minValue(min: number, message?: string): EnhancedValidator {
    this.rules.push({
      validate: (value: string) => {
        if (!value) return true;
        const num = parseFloat(value);
        return !isNaN(num) && num >= min;
      },
      message: message || `Must be at least ${min}`
    });
    return this;
  }

  // String pattern validation
  email(message: string = 'Must be a valid email address'): EnhancedValidator {
    this.rules.push({
      validate: (value: string) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message
    });
    return this;
  }

  phone(message: string = 'Must be a valid phone number'): EnhancedValidator {
    this.rules.push({
      validate: (value: string) => !value || /^\+?[\d\s\-\(\)]{10,}$/.test(value),
      message
    });
    return this;
  }

  url(message: string = 'Must be a valid URL'): EnhancedValidator {
    this.rules.push({
      validate: (value: string) => {
        if (!value) return true;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      message
    });
    return this;
  }

  // Custom pattern validation
  pattern(regex: RegExp, message: string): EnhancedValidator {
    this.rules.push({
      validate: (value: string) => !value || regex.test(value),
      message
    });
    return this;
  }

  // Custom validation function
  custom<T>(validator: (value: T) => boolean, message: string): EnhancedValidator {
    this.rules.push({
      validate: validator,
      message
    });
    return this;
  }

  // Conditional validation
  when<T>(condition: (value: T) => boolean, validator: EnhancedValidator): EnhancedValidator {
    this.rules.push({
      validate: (value: T) => {
        if (!condition(value)) return true;
        const result = validator.validate(value);
        return result.isValid;
      },
      message: 'Conditional validation failed'
    });
    return this;
  }

  // Cross-field validation
  matches<T>(otherValue: T, message: string = 'Values must match'): EnhancedValidator {
    this.rules.push({
      validate: (value: T) => value === otherValue,
      message
    });
    return this;
  }

  // Array validation
  arrayMinLength(min: number, message?: string): EnhancedValidator {
    this.rules.push({
      validate: (value: any[]) => !value || value.length >= min,
      message: message || `Must have at least ${min} items`
    });
    return this;
  }

  arrayMaxLength(max: number, message?: string): EnhancedValidator {
    this.rules.push({
      validate: (value: any[]) => !value || value.length <= max,
      message: message || `Must have no more than ${max} items`
    });
    return this;
  }

  // Date validation
  dateAfter(date: Date, message?: string): EnhancedValidator {
    this.rules.push({
      validate: (value: string | Date) => {
        if (!value) return true;
        const inputDate = typeof value === 'string' ? new Date(value) : value;
        return inputDate > date;
      },
      message: message || `Must be after ${date.toLocaleDateString()}`
    });
    return this;
  }

  dateBefore(date: Date, message?: string): EnhancedValidator {
    this.rules.push({
      validate: (value: string | Date) => {
        if (!value) return true;
        const inputDate = typeof value === 'string' ? new Date(value) : value;
        return inputDate < date;
      },
      message: message || `Must be before ${date.toLocaleDateString()}`
    });
    return this;
  }

  validate<T>(value: T): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of this.rules) {
      if (!rule.validate(value)) {
        errors.push(rule.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Async validation support
  async validateAsync<T>(value: T, asyncRules?: Array<(value: T) => Promise<boolean>>): Promise<{ isValid: boolean; errors: string[] }> {
    const syncResult = this.validate(value);
    
    if (asyncRules && asyncRules.length > 0) {
      const asyncResults = await Promise.all(
        asyncRules.map(rule => rule(value).catch(() => false))
      );
      
      asyncResults.forEach((isValid, index) => {
        if (!isValid) {
          syncResult.errors.push(`Async validation ${index + 1} failed`);
        }
      });
      
      syncResult.isValid = syncResult.errors.length === 0;
    }

    return syncResult;
  }
}