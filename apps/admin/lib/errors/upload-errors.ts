// Upload-specific error classes
export class UploadError extends Error {
  public readonly code: string;
  public readonly details?: any;
  public readonly timestamp: string;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export class FileParsingError extends UploadError {
  constructor(message: string, details?: any) {
    super(message, 'FILE_PARSING_ERROR', details);
    this.name = 'FileParsingError';
  }
}

export class ValidationError extends UploadError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class GeocodingError extends UploadError {
  constructor(message: string, details?: any) {
    super(message, 'GEOCODING_ERROR', details);
    this.name = 'GeocodingError';
  }
}

export class DatabaseError extends UploadError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

export class FeatureFlagError extends UploadError {
  constructor(message: string, details?: any) {
    super(message, 'FEATURE_FLAG_ERROR', details);
    this.name = 'FeatureFlagError';
  }
}

// Error response utilities
export class ErrorResponseBuilder {
  static buildErrorResponse(error: Error | UploadError): {
    success: false;
    error: string;
    code: string;
    details?: any;
    timestamp: string;
  } {
    if (error instanceof UploadError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        timestamp: error.timestamp
      };
    }

    return {
      success: false,
      error: error.message,
      code: 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    };
  }

  static buildValidationErrorResponse(errors: string[]): {
    success: false;
    error: string;
    code: string;
    details: string[];
    timestamp: string;
  } {
    return {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors,
      timestamp: new Date().toISOString()
    };
  }
}

// Error code constants
export const ERROR_CODES = {
  // File errors
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_CORRUPTED: 'FILE_CORRUPTED',
  FILE_PARSING_ERROR: 'FILE_PARSING_ERROR',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  INVALID_DATA_FORMAT: 'INVALID_DATA_FORMAT',
  TOO_MANY_ROWS: 'TOO_MANY_ROWS',
  
  // Geocoding errors
  GEOCODING_ERROR: 'GEOCODING_ERROR',
  GEOCODING_RATE_LIMIT: 'GEOCODING_RATE_LIMIT',
  GEOCODING_API_ERROR: 'GEOCODING_API_ERROR',
  
  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  
  // Feature flag errors
  FEATURE_FLAG_ERROR: 'FEATURE_FLAG_ERROR',
  UPLOAD_DISABLED: 'UPLOAD_DISABLED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
} as const;

// User-friendly error messages
export const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_FILE_TYPE]: 'Please upload a valid Excel (.xlsx) or CSV file.',
  [ERROR_CODES.FILE_TOO_LARGE]: 'File size exceeds the maximum limit. Please upload a smaller file.',
  [ERROR_CODES.FILE_CORRUPTED]: 'The uploaded file appears to be corrupted. Please try again.',
  [ERROR_CODES.FILE_PARSING_ERROR]: 'Unable to parse the uploaded file. Please check the file format.',
  [ERROR_CODES.VALIDATION_ERROR]: 'Some data in your file is invalid. Please review and correct the errors.',
  [ERROR_CODES.MISSING_REQUIRED_FIELDS]: 'Required fields are missing. Please ensure all mandatory columns are present.',
  [ERROR_CODES.INVALID_DATA_FORMAT]: 'Some data is in an invalid format. Please check your data and try again.',
  [ERROR_CODES.TOO_MANY_ROWS]: 'File contains too many rows. Please split into smaller files.',
  [ERROR_CODES.GEOCODING_ERROR]: 'Unable to geocode some addresses. They will be saved without coordinates.',
  [ERROR_CODES.GEOCODING_RATE_LIMIT]: 'Geocoding rate limit reached. Please try again later.',
  [ERROR_CODES.DATABASE_ERROR]: 'Database error occurred. Please try again.',
  [ERROR_CODES.UPLOAD_DISABLED]: 'File upload feature is currently disabled.',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'You do not have permission to upload files.',
  [ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
} as const;

// Error logging utility
export class ErrorLogger {
  static logError(error: Error | UploadError, context?: any): void {
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context
    };

    if (error instanceof UploadError) {
      logData.error = {
        ...logData.error,
        code: error.code,
        details: error.details
      };
    }

    console.error('Upload Error:', JSON.stringify(logData, null, 2));
  }

  static logWarning(message: string, context?: any): void {
    console.warn('Upload Warning:', {
      timestamp: new Date().toISOString(),
      message,
      context
    });
  }

  static logInfo(message: string, context?: any): void {
    console.info('Upload Info:', {
      timestamp: new Date().toISOString(),
      message,
      context
    });
  }
}