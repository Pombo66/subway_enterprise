/**
 * Timeout and Retry Service
 * Implements timeout handling and retry logic with exponential backoff
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 12.1, 12.2, 12.3, 12.4, 12.5
 */

export interface TimeoutConfig {
  rationaleTimeout: number; // 25 seconds for rationale generation
  marketAnalysisTimeout: number; // 90 seconds for market analysis
  defaultTimeout: number; // 30 seconds default
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  jitterFactor: number; // Jitter factor for randomization
  retryableStatusCodes: number[];
}

export interface TimeoutResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  timedOut: boolean;
  duration: number;
  attempts: number;
}

export interface RetryAttempt {
  attemptNumber: number;
  delay: number;
  error?: Error;
  timestamp: Date;
}

export class TimeoutRetryService {
  private readonly timeoutConfig: TimeoutConfig;
  private readonly retryConfig: RetryConfig;
  private readonly logger: (message: string, data?: any) => void;
  private activeControllers = new Map<string, AbortController>();

  constructor(
    timeoutConfig: Partial<TimeoutConfig> = {},
    retryConfig: Partial<RetryConfig> = {},
    logger?: (message: string, data?: any) => void
  ) {
    this.timeoutConfig = {
      rationaleTimeout: 25000, // 25 seconds (Requirement 5.1, 12.1)
      marketAnalysisTimeout: 90000, // 90 seconds (Requirement 12.5)
      defaultTimeout: 30000, // 30 seconds
      ...timeoutConfig
    };

    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      jitterFactor: 0.1, // 10% jitter
      retryableStatusCodes: [429, 500, 502, 503, 504],
      ...retryConfig
    };

    this.logger = logger || ((message: string, data?: any) => {
      console.log(`[TimeoutRetry] ${message}`, data || '');
    });
  }

  /**
   * Execute operation with timeout and retry logic
   * Requirements: 5.1, 5.2, 5.3, 5.4, 12.1, 12.2, 12.3, 12.4
   */
  async executeWithTimeoutAndRetry<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    operationType: 'rationale' | 'market_analysis' | 'default',
    operationId?: string
  ): Promise<TimeoutResult<T>> {
    const timeout = this.getTimeoutForOperation(operationType);
    const startTime = Date.now();
    let lastError: Error | undefined;
    const attempts: RetryAttempt[] = [];

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      const controller = new AbortController();
      const controllerId = operationId || `${operationType}_${Date.now()}_${attempt}`;
      
      this.activeControllers.set(controllerId, controller);

      try {
        // Set up timeout
        const timeoutId = setTimeout(() => {
          controller.abort();
          this.logger('Operation timed out', {
            operationType,
            timeout,
            attempt,
            operationId: controllerId
          });
        }, timeout);

        // Execute operation with timeout
        const result = await operation(controller.signal);
        
        // Clear timeout and cleanup
        clearTimeout(timeoutId);
        this.activeControllers.delete(controllerId);

        const duration = Date.now() - startTime;
        
        this.logger('Operation completed successfully', {
          operationType,
          duration,
          attempts: attempt,
          operationId: controllerId
        });

        return {
          success: true,
          data: result,
          timedOut: false,
          duration,
          attempts: attempt
        };

      } catch (error) {
        this.activeControllers.delete(controllerId);
        
        const isTimeout = error instanceof Error && 
          (error.name === 'AbortError' || controller.signal.aborted);
        
        const attemptInfo: RetryAttempt = {
          attemptNumber: attempt,
          delay: 0,
          error: error as Error,
          timestamp: new Date()
        };

        attempts.push(attemptInfo);
        lastError = error as Error;

        this.logger('Operation attempt failed', {
          operationType,
          attempt,
          isTimeout,
          error: (error as Error).message,
          operationId: controllerId
        });

        // If this was the last attempt, don't retry
        if (attempt === this.retryConfig.maxAttempts) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error as Error)) {
          this.logger('Error is not retryable, stopping attempts', {
            error: (error as Error).message
          });
          break;
        }

        // Calculate delay with jittered exponential backoff (Requirement 5.2, 12.2)
        const delay = this.calculateRetryDelay(attempt);
        attemptInfo.delay = delay;

        this.logger('Retrying operation after delay', {
          operationType,
          attempt: attempt + 1,
          delay,
          operationId: controllerId
        });

        // Wait before retry
        await this.sleep(delay);
      }
    }

    const duration = Date.now() - startTime;
    const timedOut = lastError?.name === 'AbortError';

    return {
      success: false,
      error: lastError,
      timedOut,
      duration,
      attempts: attempts.length
    };
  }

  /**
   * Handle rate limit responses with Retry-After header
   * Requirement 5.3, 5.4: Honor Retry-After headers from rate limit responses
   */
  async handleRateLimit(response: Response): Promise<number> {
    const retryAfter = response.headers.get('Retry-After');
    
    if (retryAfter) {
      const delay = parseInt(retryAfter, 10) * 1000; // Convert seconds to milliseconds
      
      this.logger('Rate limit detected, honoring Retry-After header', {
        retryAfterSeconds: parseInt(retryAfter, 10),
        delayMs: delay
      });

      return Math.min(delay, this.retryConfig.maxDelay);
    }

    // Default rate limit delay if no Retry-After header
    const defaultDelay = 5000; // 5 seconds
    this.logger('Rate limit detected, using default delay', {
      delayMs: defaultDelay
    });

    return defaultDelay;
  }

  /**
   * Cancel active operation
   */
  cancelOperation(operationId: string): boolean {
    const controller = this.activeControllers.get(operationId);
    
    if (controller) {
      controller.abort();
      this.activeControllers.delete(operationId);
      
      this.logger('Operation cancelled', { operationId });
      return true;
    }

    return false;
  }

  /**
   * Cancel all active operations
   */
  cancelAllOperations(): number {
    const count = this.activeControllers.size;
    
    for (const [id, controller] of this.activeControllers.entries()) {
      controller.abort();
    }
    
    this.activeControllers.clear();
    
    this.logger('All operations cancelled', { count });
    return count;
  }

  /**
   * Get timeout statistics
   */
  getTimeoutStats(): TimeoutStats {
    return {
      activeOperations: this.activeControllers.size,
      timeoutConfig: { ...this.timeoutConfig },
      retryConfig: { ...this.retryConfig }
    };
  }

  /**
   * Get timeout for specific operation type
   */
  private getTimeoutForOperation(operationType: string): number {
    switch (operationType) {
      case 'rationale':
        return this.timeoutConfig.rationaleTimeout;
      case 'market_analysis':
        return this.timeoutConfig.marketAnalysisTimeout;
      default:
        return this.timeoutConfig.defaultTimeout;
    }
  }

  /**
   * Calculate retry delay with jittered exponential backoff
   * Requirement 5.2: Implement jittered exponential backoff for failed requests
   */
  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: baseDelay * 2^(attempt-1)
    const exponentialDelay = this.retryConfig.baseDelay * Math.pow(2, attempt - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = exponentialDelay * this.retryConfig.jitterFactor * Math.random();
    const delayWithJitter = exponentialDelay + jitter;
    
    // Cap at maximum delay
    return Math.min(delayWithJitter, this.retryConfig.maxDelay);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    // Network errors are generally retryable
    if (error.name === 'NetworkError' || error.name === 'TimeoutError') {
      return true;
    }

    // AbortError (timeout) is retryable
    if (error.name === 'AbortError') {
      return true;
    }

    // Check for HTTP status codes in error message (basic implementation)
    const statusMatch = error.message.match(/status (\d+)/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      return this.retryConfig.retryableStatusCodes.includes(status);
    }

    // Default to not retryable for unknown errors
    return false;
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export interface TimeoutStats {
  activeOperations: number;
  timeoutConfig: TimeoutConfig;
  retryConfig: RetryConfig;
}

/**
 * Timeout wrapper for simple operations
 * Requirement 12.1: Add 25-second timeouts for rationale generation API calls
 */
export class TimeoutWrapper {
  static async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationName: string = 'operation'
  ): Promise<T> {
    const controller = new AbortController();
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        controller.abort();
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      controller.abort(); // Cleanup
    }
  }

  /**
   * Create timeout for rationale generation (25 seconds)
   */
  static async rationaleTimeout<T>(promise: Promise<T>): Promise<T> {
    return this.withTimeout(promise, 25000, 'rationale generation');
  }

  /**
   * Create timeout for market analysis (90 seconds)
   */
  static async marketAnalysisTimeout<T>(promise: Promise<T>): Promise<T> {
    return this.withTimeout(promise, 90000, 'market analysis');
  }
}