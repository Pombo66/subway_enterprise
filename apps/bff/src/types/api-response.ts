// Enhanced API response types with comprehensive error handling
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Enhanced error types with validation support
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationErrorResponse extends ApiError {
  code: 'VALIDATION_ERROR';
  errors: ValidationError[];
}

// Discriminated union for better type safety
export type ApiResult<T> = 
  | { success: true; data: T; timestamp: string }
  | { success: false; error: ApiError };

export class ApiResponseBuilder {
  static success<T>(data: T): ApiResponse<T> {
    return { 
      success: true, 
      data,
      timestamp: new Date().toISOString()
    };
  }

  static error(error: string): ApiResponse<never> {
    return { 
      success: false, 
      error,
      timestamp: new Date().toISOString()
    };
  }

  static errorWithData<T>(error: string, data: T): ApiResponse<T> {
    return { 
      success: false, 
      error, 
      data,
      timestamp: new Date().toISOString()
    };
  }

  static errorWithCode(code: string, message: string, details?: Record<string, unknown>): ApiResponse<never> {
    const errorObj: ApiError = {
      code,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    return { 
      success: false, 
      error: JSON.stringify(errorObj),
      timestamp: new Date().toISOString()
    };
  }

  static validationError(message: string, errors: ValidationError[]): ApiResponse<never> {
    const errorObj: ValidationErrorResponse = {
      code: 'VALIDATION_ERROR',
      message,
      errors,
      timestamp: new Date().toISOString()
    };
    
    return { 
      success: false, 
      error: JSON.stringify(errorObj),
      timestamp: new Date().toISOString()
    };
  }

  static notFound(resource: string, id?: string): ApiResponse<never> {
    return this.errorWithCode(
      'NOT_FOUND',
      `${resource} not found${id ? ` with ID: ${id}` : ''}`,
      { resource, id }
    );
  }

  static forbidden(action: string, resource?: string): ApiResponse<never> {
    return this.errorWithCode(
      'FORBIDDEN',
      `Not authorized to ${action}${resource ? ` ${resource}` : ''}`,
      { action, resource }
    );
  }

  static conflict(message: string, details?: Record<string, unknown>): ApiResponse<never> {
    return this.errorWithCode('CONFLICT', message, details);
  }

  static internalError(message: string = 'Internal server error'): ApiResponse<never> {
    return this.errorWithCode('INTERNAL_ERROR', message);
  }
}