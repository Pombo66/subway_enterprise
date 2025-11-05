// Error handling classes for Smart Store Importer v1
import { ImportError, GeocodeErrorDetails, GeocodeProvider } from './types';

// Base import error class
export class SmartImportError extends Error implements ImportError {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    retryable: boolean = false,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'SmartImportError';
    this.code = code;
    this.retryable = retryable;
    this.context = context;
    this.timestamp = new Date();

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SmartImportError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      retryable: this.retryable,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

// Auto-mapping specific errors
export class AutoMappingError extends SmartImportError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'AUTO_MAPPING_ERROR', false, context);
    this.name = 'AutoMappingError';
  }
}

// Country inference specific errors
export class CountryInferenceError extends SmartImportError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'COUNTRY_INFERENCE_ERROR', false, context);
    this.name = 'CountryInferenceError';
  }
}

// Geocoding specific errors
export class GeocodeError extends SmartImportError {
  public readonly provider?: GeocodeProvider;
  public readonly statusCode?: number;
  public readonly address?: string;

  constructor(
    message: string,
    code: string,
    retryable: boolean = false,
    provider?: GeocodeProvider,
    statusCode?: number,
    address?: string,
    context?: Record<string, any>
  ) {
    super(message, code, retryable, context);
    this.name = 'GeocodeError';
    this.provider = provider;
    this.statusCode = statusCode;
    this.address = address;
  }

  static fromDetails(details: GeocodeErrorDetails, address?: string): GeocodeError {
    return new GeocodeError(
      details.error,
      'GEOCODE_ERROR',
      details.retryable,
      details.provider,
      details.statusCode,
      address
    );
  }
}

// Rate limiting errors
export class RateLimitError extends GeocodeError {
  public readonly retryAfter?: number; // seconds

  constructor(
    message: string,
    provider: GeocodeProvider,
    retryAfter?: number,
    context?: Record<string, any>
  ) {
    super(message, 'RATE_LIMIT_ERROR', true, provider, 429, undefined, context);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// Network/timeout errors
export class NetworkError extends GeocodeError {
  constructor(
    message: string,
    provider: GeocodeProvider,
    statusCode?: number,
    context?: Record<string, any>
  ) {
    super(message, 'NETWORK_ERROR', true, provider, statusCode, undefined, context);
    this.name = 'NetworkError';
  }
}

// Address normalization errors
export class AddressNormalizationError extends SmartImportError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'ADDRESS_NORMALIZATION_ERROR', false, context);
    this.name = 'AddressNormalizationError';
  }
}

// Configuration errors
export class ConfigurationError extends SmartImportError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONFIGURATION_ERROR', false, context);
    this.name = 'ConfigurationError';
  }
}

// Error categorization utilities
export class ErrorHandler {
  /**
   * Determines if an error is retryable based on its type and properties
   */
  static isRetryable(error: Error): boolean {
    if (error instanceof SmartImportError) {
      return error.retryable;
    }

    // Handle standard HTTP errors
    if ('status' in error || 'statusCode' in error) {
      const status = (error as any).status || (error as any).statusCode;
      return status >= 500 || status === 429 || status === 408; // Server errors, rate limits, timeouts
    }

    // Handle network errors
    if (error.message.includes('ECONNRESET') || 
        error.message.includes('ETIMEDOUT') || 
        error.message.includes('ENOTFOUND')) {
      return true;
    }

    return false;
  }

  /**
   * Categorizes errors for telemetry and logging
   */
  static categorizeError(error: Error): {
    category: 'network' | 'rate_limit' | 'validation' | 'configuration' | 'unknown';
    severity: 'low' | 'medium' | 'high';
    retryable: boolean;
  } {
    if (error instanceof RateLimitError) {
      return { category: 'rate_limit', severity: 'medium', retryable: true };
    }

    if (error instanceof NetworkError) {
      return { category: 'network', severity: 'medium', retryable: true };
    }

    if (error instanceof ConfigurationError) {
      return { category: 'configuration', severity: 'high', retryable: false };
    }

    if (error instanceof AutoMappingError || error instanceof CountryInferenceError) {
      return { category: 'validation', severity: 'low', retryable: false };
    }

    if (error instanceof GeocodeError) {
      const severity = error.retryable ? 'medium' : 'high';
      return { category: 'network', severity, retryable: error.retryable };
    }

    return { category: 'unknown', severity: 'medium', retryable: this.isRetryable(error) };
  }

  /**
   * Creates a user-friendly error message
   */
  static getUserFriendlyMessage(error: Error): string {
    if (error instanceof RateLimitError) {
      return `Geocoding service is temporarily busy. Please try again in a few moments.`;
    }

    if (error instanceof NetworkError) {
      return `Network connection issue. Please check your internet connection and try again.`;
    }

    if (error instanceof GeocodeError) {
      if (error.address) {
        return `Unable to find coordinates for address: ${error.address}`;
      }
      return `Geocoding service is currently unavailable. Please try again later.`;
    }

    if (error instanceof AutoMappingError) {
      return `Unable to automatically map spreadsheet columns. Please review and adjust the field mappings manually.`;
    }

    if (error instanceof CountryInferenceError) {
      return `Unable to automatically detect country. Please select the country manually.`;
    }

    if (error instanceof AddressNormalizationError) {
      return `Address normalization failed, but import will continue with original addresses.`;
    }

    if (error instanceof ConfigurationError) {
      return `System configuration issue. Please contact your administrator.`;
    }

    return error.message || 'An unexpected error occurred during import.';
  }

  /**
   * Logs error with appropriate level and context
   */
  static logError(error: Error, context?: Record<string, any>): void {
    const { category, severity } = this.categorizeError(error);
    const logContext = {
      ...context,
      category,
      severity,
      retryable: this.isRetryable(error),
      timestamp: new Date().toISOString(),
    };

    if (error instanceof SmartImportError) {
      logContext.code = error.code;
      logContext.context = error.context;
    }

    switch (severity) {
      case 'high':
        console.error('Smart Import Error (High):', error.message, logContext);
        break;
      case 'medium':
        console.warn('Smart Import Error (Medium):', error.message, logContext);
        break;
      case 'low':
        console.info('Smart Import Error (Low):', error.message, logContext);
        break;
    }
  }
}

// Exponential backoff utility
export class ExponentialBackoff {
  private attempt: number = 0;
  private readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly maxDelay: number;
  private readonly jitterFactor: number;

  constructor(
    maxRetries: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 30000,
    jitterFactor: number = 0.1
  ) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
    this.jitterFactor = jitterFactor;
  }

  /**
   * Calculate delay for current attempt
   */
  getDelay(): number {
    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(2, this.attempt),
      this.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = exponentialDelay * this.jitterFactor * Math.random();
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Wait for the calculated delay
   */
  async wait(): Promise<void> {
    const delay = this.getDelay();
    await new Promise(resolve => setTimeout(resolve, delay));
    this.attempt++;
  }

  /**
   * Check if we should retry
   */
  shouldRetry(): boolean {
    return this.attempt < this.maxRetries;
  }

  /**
   * Reset attempt counter
   */
  reset(): void {
    this.attempt = 0;
  }

  /**
   * Get current attempt number
   */
  getCurrentAttempt(): number {
    return this.attempt;
  }
}

// Error aggregation for batch operations
export class ErrorAggregator {
  private errors: Array<{ error: Error; context?: Record<string, any> }> = [];

  add(error: Error, context?: Record<string, any>): void {
    this.errors.push({ error, context });
  }

  getErrors(): Array<{ error: Error; context?: Record<string, any> }> {
    return [...this.errors];
  }

  getErrorCount(): number {
    return this.errors.length;
  }

  getRetryableErrors(): Array<{ error: Error; context?: Record<string, any> }> {
    return this.errors.filter(({ error }) => ErrorHandler.isRetryable(error));
  }

  getNonRetryableErrors(): Array<{ error: Error; context?: Record<string, any> }> {
    return this.errors.filter(({ error }) => !ErrorHandler.isRetryable(error));
  }

  clear(): void {
    this.errors = [];
  }

  isEmpty(): boolean {
    return this.errors.length === 0;
  }

  /**
   * Generate summary for UI display
   */
  getSummary(): {
    total: number;
    retryable: number;
    nonRetryable: number;
    categories: Record<string, number>;
  } {
    const categories: Record<string, number> = {};
    let retryable = 0;
    let nonRetryable = 0;

    this.errors.forEach(({ error }) => {
      const { category } = ErrorHandler.categorizeError(error);
      categories[category] = (categories[category] || 0) + 1;

      if (ErrorHandler.isRetryable(error)) {
        retryable++;
      } else {
        nonRetryable++;
      }
    });

    return {
      total: this.errors.length,
      retryable,
      nonRetryable,
      categories,
    };
  }
}