/**
 * Validation utilities for form inputs and data
 */

export interface ValidationRule<T = string> {
  validate: (value: T) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Common validation rules
export const ValidationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value: string) => Boolean(value?.trim()),
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value: string) => value.length >= min,
    message: message || `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value: string) => value.length <= max,
    message: message || `Must be no more than ${max} characters`,
  }),

  decimal: (message = 'Must be a valid decimal number'): ValidationRule => ({
    validate: (value: string) => /^\d+(\.\d{1,2})?$/.test(value),
    message,
  }),

  positiveNumber: (message = 'Must be greater than 0'): ValidationRule => ({
    validate: (value: string) => {
      const num = parseFloat(value);
      return !isNaN(num) && num > 0;
    },
    message,
  }),

  maxValue: (max: number, message?: string): ValidationRule => ({
    validate: (value: string) => {
      const num = parseFloat(value);
      return !isNaN(num) && num <= max;
    },
    message: message || `Must be no more than ${max}`,
  }),

  json: (message = 'Must be valid JSON'): ValidationRule => ({
    validate: (value: string) => {
      if (!value.trim()) return true; // Empty is valid
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),
} as const;

// Strategy pattern interface for validation
export interface ValidationStrategy {
  validate(value: string): ValidationResult;
}

// Composite validator using Strategy pattern
export class CompositeValidator implements ValidationStrategy {
  private strategies: ValidationStrategy[] = [];

  add(strategy: ValidationStrategy): this {
    this.strategies.push(strategy);
    return this;
  }

  validate(value: string): ValidationResult {
    for (const strategy of this.strategies) {
      const result = strategy.validate(value);
      if (!result.isValid) return result;
    }
    return { isValid: true, errors: [] };
  }
}

// Individual validation strategies
export class RequiredValidator implements ValidationStrategy {
  constructor(private message: string = 'This field is required') {}

  validate(value: string): ValidationResult {
    const rule = ValidationRules.required(this.message);
    return {
      isValid: rule.validate(value),
      errors: rule.validate(value) ? [] : [rule.message]
    };
  }
}

export class MinLengthValidator implements ValidationStrategy {
  constructor(private min: number, private message?: string) {}

  validate(value: string): ValidationResult {
    const rule = ValidationRules.minLength(this.min, this.message);
    return {
      isValid: rule.validate(value),
      errors: rule.validate(value) ? [] : [rule.message]
    };
  }
}

export class DecimalValidator implements ValidationStrategy {
  constructor(private message?: string) {}

  validate(value: string): ValidationResult {
    const rule = ValidationRules.decimal(this.message);
    return {
      isValid: rule.validate(value),
      errors: rule.validate(value) ? [] : [rule.message]
    };
  }
}

// Validator class for chaining rules (backward compatibility)
export class Validator {
  private rules: ValidationRule[] = [];

  static create() {
    return new Validator();
  }

  addRule(rule: ValidationRule): this {
    this.rules.push(rule);
    return this;
  }

  required(message?: string): this {
    return this.addRule(ValidationRules.required(message));
  }

  minLength(min: number, message?: string): this {
    return this.addRule(ValidationRules.minLength(min, message));
  }

  maxLength(max: number, message?: string): this {
    return this.addRule(ValidationRules.maxLength(max, message));
  }

  decimal(message?: string): this {
    return this.addRule(ValidationRules.decimal(message));
  }

  positiveNumber(message?: string): this {
    return this.addRule(ValidationRules.positiveNumber(message));
  }

  maxValue(max: number, message?: string): this {
    return this.addRule(ValidationRules.maxValue(max, message));
  }

  json(message?: string): this {
    return this.addRule(ValidationRules.json(message));
  }

  validate(value: string): ValidationResult {
    const errors: string[] = [];

    for (const rule of this.rules) {
      if (!rule.validate(value)) {
        errors.push(rule.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Convenience function for quick validation
export function validateField(value: string, ...rules: ValidationRule[]): ValidationResult {
  const validator = Validator.create();
  rules.forEach(rule => validator.addRule(rule));
  return validator.validate(value);
}