export interface RateLimitConfig {
  requestsPerSecond: number;
  burstLimit: number;
  retryAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitoringWindowMs: number;
}

export interface RateLimitStats {
  totalRequests: number;
  successfulRequests: number;
  rateLimitedRequests: number;
  failedRequests: number;
  averageWaitTime: number;
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

export class APIRateLimiter {
  private requestQueue: Array<{ timestamp: number; resolve: () => void }> = [];
  private lastRequestTime = 0;
  private totalRequests = 0;
  private successfulRequests = 0;
  private rateLimitedRequests = 0;
  private failedRequests = 0;
  private totalWaitTime = 0;

  constructor(private readonly config: RateLimitConfig) {
    console.log(`🚦 APIRateLimiter initialized: ${config.requestsPerSecond} req/sec, ${config.retryAttempts} retries`);
  }

  /**
   * Execute API call with rate limiting
   * Implements requirement 16 for API rate limiting
   */
  async executeWithLimit<T>(apiCall: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    this.totalRequests++;

    try {
      // Wait for rate limit slot
      await this.waitForSlot();
      
      // Execute with retry logic
      const result = await this.executeWithRetry(apiCall);
      
      this.successfulRequests++;
      this.totalWaitTime += Date.now() - startTime;
      
      return result;
      
    } catch (error) {
      this.failedRequests++;
      this.totalWaitTime += Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Wait for available rate limit slot
   */
  private async waitForSlot(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / this.config.requestsPerSecond;

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      this.rateLimitedRequests++;
      
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms`);
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Execute API call with exponential backoff retry
   */
  private async executeWithRetry<T>(apiCall: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await apiCall();
        
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.config.retryAttempts) {
          break; // Final attempt failed
        }
        
        // Calculate exponential backoff delay
        const delay = Math.min(
          this.config.baseDelayMs * Math.pow(2, attempt),
          this.config.maxDelayMs
        );
        
        console.log(`🔄 Retry attempt ${attempt + 1}/${this.config.retryAttempts} after ${delay}ms delay`);
        await this.sleep(delay);
      }
    }
    
    throw lastError || new Error('API call failed after all retry attempts');
  }

  /**
   * Get rate limiting statistics
   */
  getStats(): RateLimitStats {
    const averageWaitTime = this.totalRequests > 0 ? this.totalWaitTime / this.totalRequests : 0;
    
    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      rateLimitedRequests: this.rateLimitedRequests,
      failedRequests: this.failedRequests,
      averageWaitTime: Math.round(averageWaitTime),
      circuitBreakerState: 'CLOSED' // Simplified for now
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.rateLimitedRequests = 0;
    this.failedRequests = 0;
    this.totalWaitTime = 0;
    console.log('📊 Rate limiter statistics reset');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private successCount = 0;

  constructor(private readonly config: CircuitBreakerConfig) {
    console.log(`🔌 CircuitBreaker initialized: ${config.failureThreshold} failure threshold`);
  }

  /**
   * Execute operation with circuit breaker pattern
   * Implements requirement 16 for circuit breaker resilience
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        console.log('🔌 Circuit breaker: OPEN -> HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN - operation rejected');
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= 3) { // Require 3 successes to close
          this.state = 'CLOSED';
          this.failureCount = 0;
          console.log('🔌 Circuit breaker: HALF_OPEN -> CLOSED');
        }
      } else if (this.state === 'CLOSED') {
        this.failureCount = 0; // Reset failure count on success
      }
      
      return result;
      
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.state === 'CLOSED' && this.failureCount >= this.config.failureThreshold) {
        this.state = 'OPEN';
        console.log('🔌 Circuit breaker: CLOSED -> OPEN');
      } else if (this.state === 'HALF_OPEN') {
        this.state = 'OPEN';
        console.log('🔌 Circuit breaker: HALF_OPEN -> OPEN');
      }
      
      throw error;
    }
  }

  /**
   * Get circuit breaker state
   */
  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    console.log('🔌 Circuit breaker manually reset to CLOSED');
  }
}

export class ResilientAPIClient {
  private rateLimiter: APIRateLimiter;
  private circuitBreaker: CircuitBreaker;

  constructor(
    rateLimitConfig: RateLimitConfig,
    circuitBreakerConfig: CircuitBreakerConfig
  ) {
    this.rateLimiter = new APIRateLimiter(rateLimitConfig);
    this.circuitBreaker = new CircuitBreaker(circuitBreakerConfig);
    console.log('🛡️ ResilientAPIClient initialized with rate limiting and circuit breaker');
  }

  /**
   * Execute API call with full resilience (rate limiting + circuit breaker)
   */
  async execute<T>(apiCall: () => Promise<T>): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      return this.rateLimiter.executeWithLimit(apiCall);
    });
  }

  /**
   * Get comprehensive resilience statistics
   */
  getStats() {
    return {
      rateLimiter: this.rateLimiter.getStats(),
      circuitBreaker: this.circuitBreaker.getStats()
    };
  }

  /**
   * Reset all statistics
   */
  resetStats(): void {
    this.rateLimiter.resetStats();
    this.circuitBreaker.reset();
  }
}

// Pre-configured rate limiters for common APIs
export const OSMRateLimiter = new APIRateLimiter({
  requestsPerSecond: 1,
  burstLimit: 5,
  retryAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000
});

export const DemographicAPIRateLimiter = new APIRateLimiter({
  requestsPerSecond: 2,
  burstLimit: 10,
  retryAttempts: 2,
  baseDelayMs: 500,
  maxDelayMs: 5000
});

export const OSMCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 60000, // 1 minute
  monitoringWindowMs: 300000 // 5 minutes
});

export const ResilientOSMClient = new ResilientAPIClient(
  {
    requestsPerSecond: 1,
    burstLimit: 5,
    retryAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000
  },
  {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    monitoringWindowMs: 300000
  }
);