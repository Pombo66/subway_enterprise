// Core infrastructure exports for store upload feature

// Validation schemas and types
export * from '../validation/store-upload';
export * from '../types/store-upload';

// Error handling
export * from '../errors/upload-errors';

// Configuration
export * from '../config/upload-config';

// Re-export commonly used utilities
export { z } from 'zod';

// Constants
export const UPLOAD_CONSTANTS = {
  MAX_PREVIEW_ROWS: 10,
  DEFAULT_BATCH_SIZE: 20,
  DEFAULT_DELAY_MS: 250,
  SUPPORTED_EXTENSIONS: ['.xlsx', '.csv'],
  MIME_TYPES: {
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    XLS: 'application/vnd.ms-excel',
    CSV: 'text/csv',
    CSV_ALT: 'application/csv'
  }
} as const;

// Utility functions
export function isValidFileType(file: File): boolean {
  const validMimeTypes = Object.values(UPLOAD_CONSTANTS.MIME_TYPES);
  const validExtensions = UPLOAD_CONSTANTS.SUPPORTED_EXTENSIONS;
  
  const hasValidMimeType = validMimeTypes.includes(file.type as any);
  const hasValidExtension = validExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );
  
  return hasValidMimeType || hasValidExtension;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function generateUploadId(): string {
  return `upload-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Type guards
export function isUploadError(error: any): error is UploadError {
  return error instanceof Error && 'code' in error && 'timestamp' in error;
}

export function isValidationResult(result: any): result is import('../validation/store-upload').ValidationResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    typeof result.isValid === 'boolean' &&
    Array.isArray(result.errors) &&
    Array.isArray(result.warnings)
  );
}