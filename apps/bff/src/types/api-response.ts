// Improved type safety - removed 'any' type
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
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

// Enhanced error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Discriminated union for better type safety
export type ApiResult<T> = 
  | { success: true; data: T }
  | { success: false; error: ApiError };

export class ApiResponseBuilder {
  static success<T>(data: T): ApiResponse<T> {
    return { success: true, data };
  }

  static error(error: string): ApiResponse<never> {
    return { success: false, error };
  }

  static errorWithData<T>(error: string, data: T): ApiResponse<T> {
    return { success: false, error, data };
  }

  static errorWithCode(code: string, message: string, details?: Record<string, unknown>): ApiResponse<never> {
    return { 
      success: false, 
      error: JSON.stringify({ code, message, details })
    };
  }
}