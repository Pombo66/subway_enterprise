import { ErrorHandler, ValidationError, ApiError, ValidationErrorResponse } from '../error.types';

describe('ErrorHandler', () => {
  describe('isValidationError', () => {
    test('should identify valid validation error object', () => {
      const validationError: ValidationErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: [
          { field: 'name', message: 'Name is required', code: 'required' },
        ],
        timestamp: '2024-01-01T00:00:00Z',
      };

      expect(ErrorHandler.isValidationError(validationError)).toBe(true);
    });

    test('should identify valid validation error from JSON string', () => {
      const validationError: ValidationErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: [
          { field: 'email', message: 'Invalid email', code: 'invalid_email' },
        ],
        timestamp: '2024-01-01T00:00:00Z',
      };

      const jsonString = JSON.stringify(validationError);
      expect(ErrorHandler.isValidationError(jsonString)).toBe(true);
    });

    test('should reject invalid validation error object', () => {
      const invalidError = {
        code: 'OTHER_ERROR',
        message: 'Some error',
        errors: [],
        timestamp: '2024-01-01T00:00:00Z',
      };

      expect(ErrorHandler.isValidationError(invalidError)).toBe(false);
    });

    test('should reject malformed JSON string', () => {
      const malformedJson = '{ invalid json }';
      expect(ErrorHandler.isValidationError(malformedJson)).toBe(false);
    });

    test('should reject non-validation error types', () => {
      expect(ErrorHandler.isValidationError('simple string')).toBe(false);
      expect(ErrorHandler.isValidationError(new Error('test'))).toBe(false);
      expect(ErrorHandler.isValidationError(null)).toBe(false);
      expect(ErrorHandler.isValidationError(undefined)).toBe(false);
    });
  });

  describe('isApiError', () => {
    test('should identify valid API error object', () => {
      const apiError: ApiError = {
        code: 'API_ERROR',
        message: 'API request failed',
        timestamp: '2024-01-01T00:00:00Z',
      };

      expect(ErrorHandler.isApiError(apiError)).toBe(true);
    });

    test('should identify valid API error from JSON string', () => {
      const apiError: ApiError = {
        code: 'NETWORK_ERROR',
        message: 'Network request failed',
        details: { status: 500 },
        timestamp: '2024-01-01T00:00:00Z',
      };

      const jsonString = JSON.stringify(apiError);
      expect(ErrorHandler.isApiError(jsonString)).toBe(true);
    });

    test('should reject invalid API error object', () => {
      const invalidError = {
        message: 'Some error',
        // missing required fields
      };

      expect(ErrorHandler.isApiError(invalidError)).toBe(false);
    });

    test('should reject malformed JSON string', () => {
      const malformedJson = '{ invalid: json }';
      expect(ErrorHandler.isApiError(malformedJson)).toBe(false);
    });
  });

  describe('parseError', () => {
    test('should parse validation error object', () => {
      const validationError: ValidationErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: [
          { field: 'name', message: 'Name is required', code: 'required' },
          { field: 'email', message: 'Invalid email', code: 'invalid_email' },
        ],
        timestamp: '2024-01-01T00:00:00Z',
      };

      const result = ErrorHandler.parseError(validationError);

      expect(result).toEqual({
        message: 'Validation failed',
        details: [
          { field: 'name', message: 'Name is required', code: 'required' },
          { field: 'email', message: 'Invalid email', code: 'invalid_email' },
        ],
      });
    });

    test('should parse validation error from JSON string', () => {
      const validationError: ValidationErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Form validation failed',
        errors: [
          { field: 'password', message: 'Password too short', code: 'min_length' },
        ],
        timestamp: '2024-01-01T00:00:00Z',
      };

      const jsonString = JSON.stringify(validationError);
      const result = ErrorHandler.parseError(jsonString);

      expect(result).toEqual({
        message: 'Form validation failed',
        details: [
          { field: 'password', message: 'Password too short', code: 'min_length' },
        ],
      });
    });

    test('should parse API error object', () => {
      const apiError: ApiError = {
        code: 'API_ERROR',
        message: 'Server error occurred',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const result = ErrorHandler.parseError(apiError);

      expect(result).toEqual({
        message: 'Server error occurred',
      });
    });

    test('should parse API error from JSON string', () => {
      const apiError: ApiError = {
        code: 'NETWORK_ERROR',
        message: 'Connection timeout',
        details: { timeout: 5000 },
        timestamp: '2024-01-01T00:00:00Z',
      };

      const jsonString = JSON.stringify(apiError);
      const result = ErrorHandler.parseError(jsonString);

      expect(result).toEqual({
        message: 'Connection timeout',
      });
    });

    test('should parse string errors', () => {
      const result = ErrorHandler.parseError('Simple error message');

      expect(result).toEqual({
        message: 'Simple error message',
      });
    });

    test('should parse Error objects', () => {
      const error = new Error('JavaScript error');
      const result = ErrorHandler.parseError(error);

      expect(result).toEqual({
        message: 'JavaScript error',
      });
    });

    test('should handle unknown error types', () => {
      const result = ErrorHandler.parseError({ unknown: 'error type' });

      expect(result).toEqual({
        message: 'An unexpected error occurred',
      });
    });

    test('should handle null and undefined', () => {
      expect(ErrorHandler.parseError(null)).toEqual({
        message: 'An unexpected error occurred',
      });

      expect(ErrorHandler.parseError(undefined)).toEqual({
        message: 'An unexpected error occurred',
      });
    });
  });

  describe('getFieldError', () => {
    const errors: ValidationError[] = [
      { field: 'name', message: 'Name is required', code: 'required' },
      { field: 'email', message: 'Invalid email format', code: 'invalid_email' },
      { field: 'age', message: 'Must be at least 18', code: 'min_value' },
    ];

    test('should return error message for existing field', () => {
      const result = ErrorHandler.getFieldError(errors, 'name');
      expect(result).toBe('Name is required');
    });

    test('should return undefined for non-existing field', () => {
      const result = ErrorHandler.getFieldError(errors, 'nonexistent');
      expect(result).toBeUndefined();
    });

    test('should handle empty errors array', () => {
      const result = ErrorHandler.getFieldError([], 'name');
      expect(result).toBeUndefined();
    });

    test('should return first error for field with multiple errors', () => {
      const errorsWithDuplicates: ValidationError[] = [
        { field: 'password', message: 'Password is required', code: 'required' },
        { field: 'password', message: 'Password too short', code: 'min_length' },
      ];

      const result = ErrorHandler.getFieldError(errorsWithDuplicates, 'password');
      expect(result).toBe('Password is required');
    });
  });

  describe('hasFieldError', () => {
    const errors: ValidationError[] = [
      { field: 'name', message: 'Name is required', code: 'required' },
      { field: 'email', message: 'Invalid email format', code: 'invalid_email' },
    ];

    test('should return true for existing field error', () => {
      expect(ErrorHandler.hasFieldError(errors, 'name')).toBe(true);
      expect(ErrorHandler.hasFieldError(errors, 'email')).toBe(true);
    });

    test('should return false for non-existing field error', () => {
      expect(ErrorHandler.hasFieldError(errors, 'nonexistent')).toBe(false);
    });

    test('should handle empty errors array', () => {
      expect(ErrorHandler.hasFieldError([], 'name')).toBe(false);
    });

    test('should handle multiple errors for same field', () => {
      const errorsWithDuplicates: ValidationError[] = [
        { field: 'password', message: 'Password is required', code: 'required' },
        { field: 'password', message: 'Password too short', code: 'min_length' },
      ];

      expect(ErrorHandler.hasFieldError(errorsWithDuplicates, 'password')).toBe(true);
    });
  });
});