/**
 * OpenAI Safety Wrapper
 * Provides rate limiting, retry logic, and error handling for OpenAI API calls
 */

export class OpenAISafetyWrapper {
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY = 1000; // 1 second
  private static readonly MAX_DELAY = 30000; // 30 seconds
  private static readonly JITTER_FACTOR = 0.1;

  /**
   * Make a safe OpenAI API call with retry logic and rate limiting
   */
  static async makeCall<T>(
    apiCall: () => Promise<T>,
    operationType: string,
    identifier: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 OpenAI API call attempt ${attempt}/${this.MAX_RETRIES} for ${operationType}:${identifier}`);
        
        const result = await apiCall();
        
        if (attempt > 1) {
          console.log(`✅ OpenAI API call succeeded on attempt ${attempt} for ${operationType}:${identifier}`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        console.warn(`⚠️  OpenAI API call failed (attempt ${attempt}/${this.MAX_RETRIES}) for ${operationType}:${identifier}:`, error);

        // Don't retry on the last attempt
        if (attempt === this.MAX_RETRIES) {
          break;
        }

        // Check if we should retry based on error type
        if (!this.shouldRetry(error as Error)) {
          console.log(`❌ Non-retryable error for ${operationType}:${identifier}, not retrying`);
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt);
        console.log(`⏳ Waiting ${delay}ms before retry for ${operationType}:${identifier}`);
        
        await this.sleep(delay);
      }
    }

    console.error(`❌ All OpenAI API call attempts failed for ${operationType}:${identifier}`);
    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Determine if an error should trigger a retry
   */
  private static shouldRetry(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    
    // Retry on rate limits
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      return true;
    }
    
    // Retry on temporary server errors
    if (errorMessage.includes('500') || errorMessage.includes('502') || 
        errorMessage.includes('503') || errorMessage.includes('504')) {
      return true;
    }
    
    // Retry on network errors
    if (errorMessage.includes('network') || errorMessage.includes('timeout') ||
        errorMessage.includes('connection') || errorMessage.includes('econnreset')) {
      return true;
    }
    
    // Don't retry on client errors (400, 401, 403, etc.)
    if (errorMessage.includes('400') || errorMessage.includes('401') || 
        errorMessage.includes('403') || errorMessage.includes('invalid')) {
      return false;
    }
    
    // Default to retry for unknown errors
    return true;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private static calculateDelay(attempt: number): number {
    // Exponential backoff: delay = base * 2^(attempt-1)
    const exponentialDelay = this.BASE_DELAY * Math.pow(2, attempt - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = exponentialDelay * this.JITTER_FACTOR * Math.random();
    
    // Cap at maximum delay
    const totalDelay = Math.min(exponentialDelay + jitter, this.MAX_DELAY);
    
    return Math.floor(totalDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}