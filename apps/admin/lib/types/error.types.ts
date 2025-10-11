import { z } from 'zod';

// Error type schemas
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string(),
});

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  timestamp: z.string(),
});

export const ValidationErrorResponseSchema = z.object({
  code: z.literal('VALIDATION_ERROR'),
  message: z.string(),
  errors: z.array(ValidationErrorSchema),
  timestamp: z.string(),
});

// Type exports
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ValidationErrorResponse = z.infer<typeof ValidationErrorResponseSchema>;

// Error handling utilities
export class ErrorHandler {
  static isValidationError(error: unknown): error is ValidationErrorResponse {
    if (typeof error === 'string') {
      try {
        const parsed = JSON.parse(error);
        return ValidationErrorResponseSchema.safeParse(parsed).success;
      } catch {
        return false;
      }
    }
    return ValidationErrorResponseSchema.safeParse(error).success;
  }

  static isApiError(error: unknown): error is ApiError {
    if (typeof error === 'string') {
      try {
        const parsed = JSON.parse(error);
        return ApiErrorSchema.safeParse(parsed).success;
      } catch {
        return false;
      }
    }
    return ApiErrorSchema.safeParse(error).success;
  }

  static parseError(error: unknown): { message: string; details?: ValidationError[] } {
    // Handle validation errors
    if (this.isValidationError(error)) {
      const validationError = typeof error === 'string' ? JSON.parse(error) : error;
      return {
        message: validationError.message,
        details: validationError.errors,
      };
    }

    // Handle API errors
    if (this.isApiError(error)) {
      const apiError = typeof error === 'string' ? JSON.parse(error) : error;
      return {
        message: apiError.message,
      };
    }

    // Handle string errors
    if (typeof error === 'string') {
      return { message: error };
    }

    // Handle Error objects
    if (error instanceof Error) {
      return { message: error.message };
    }

    // Fallback for unknown error types
    return { message: 'An unexpected error occurred' };
  }

  static getFieldError(errors: ValidationError[], fieldName: string): string | undefined {
    const error = errors.find(err => err.field === fieldName);
    return error?.message;
  }

  static hasFieldError(errors: ValidationError[], fieldName: string): boolean {
    return errors.some(err => err.field === fieldName);
  }
}