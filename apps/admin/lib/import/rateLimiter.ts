// Rate limiting functionality for Smart Store Importer v1
import { ErrorHandler } from './errors';

/**
 * Token bucket rate limiter implementation
 * Allows burst requests up to bucket size, then enforces steady rate
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly tokensPerSecond: number;
  private readonly bucketSize: number;
  private readonly refillInterval: number;

  constructor(tokensPerSecond: number, bucketSize?: number) {
    this.tokensPerSecond = tokensPerSecond;
    this.bucketSize = bucketSize || Math.max(tokensPerSecond * 2, 5); // Default to 2x rate or minimum 5
    this.tokens = this.bucketSize; // Start with full bucket
    this.lastRefill = Date.now();
    this.refillInterval = 1000 / tokensPerSecond; // Milliseconds between token additions
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    
    if (timePassed >= this.refillInterval) {
      const tokensToAdd = Math.floor(timePassed / this.refillInterval);
      this.tokens = Math.min(this.bucketSize, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Acquire a token (async to allow waiting)
   * Returns immediately if token available, otherwise waits
   */
  async acquire(): Promise<void> {
    this.refillTokens();
    
    if (this.tokens > 0) {
      this.tokens--;
      return;
    }
    
    // Wait for next token to be available
    const waitTime = this.refillInterval - (Date.now() - this.lastRefill);
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.acquire(); // Recursive call after waiting
    }
  }

  /**
   * Try to acquire a token without waiting
   * Returns true if successful, false if no tokens available
   */
  tryAcquire(): boolean {
    this.refillTokens();
    
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    
    return false;
  }

  /**
   * Get number of available tokens
   */
  getAvailableTokens(): number {
    this.refillTokens();
    return this.tokens;
  }

  /**
   * Get time until next token is available (in milliseconds)
   */
  getTimeUntilNextToken(): number {
    this.refillTokens();
    
    if (this.tokens > 0) {
      return 0;
    }
    
    return this.refillInterval - (Date.now() - this.lastRefill);
  }

  /**
   * Reset the rate limiter (useful for testing)
   */
  reset(): void {
    this.tokens = this.bucketSize;
    this.lastRefill = Date.now();
  }

  /**
   * Get current configuration
   */
  getConfig(): {
    tokensPerSecond: number;
    bucketSize: number;
    currentTokens: number;
  } {
    this.refillTokens();
    return {
      tokensPerSecond: this.tokensPerSecond,
      bucketSize: this.bucketSize,
      currentTokens: this.tokens,
    };
  }
}

/**
 * Rate limiter manager for multiple providers
 */
export class RateLimiterManager {
  private limiters: Map<string, TokenBucketRateLimiter> = new Map();

  /**
   * Get or create rate limiter for a provider
   */
  getLimiter(providerId: string, tokensPerSecond: number, bucketSize?: number): TokenBucketRateLimiter {
    if (!this.limiters.has(providerId)) {
      this.limiters.set(providerId, new TokenBucketRateLimiter(tokensPerSecond, bucketSize));
    }
    return this.limiters.get(providerId)!;
  }

  /**
   * Acquire token for specific provider
   */
  async acquireToken(providerId: string): Promise<void> {
    const limiter = this.limiters.get(providerId);
    if (!limiter) {
      throw new Error(`No rate limiter configured for provider: ${providerId}`);
    }
    
    try {
      await limiter.acquire();
    } catch (error) {
      ErrorHandler.logError(error, { context: 'acquireToken', providerId });
      throw error;
    }
  }

  /**
   * Try to acquire token without waiting
   */
  tryAcquireToken(providerId: string): boolean {
    const limiter = this.limiters.get(providerId);
    if (!limiter) {
      return false;
    }
    
    return limiter.tryAcquire();
  }

  /**
   * Get status for all rate limiters
   */
  getStatus(): Record<string, {
    tokensPerSecond: number;
    bucketSize: number;
    currentTokens: number;
    timeUntilNextToken: number;
  }> {
    const status: Record<string, any> = {};
    
    for (const [providerId, limiter] of this.limiters) {
      const config = limiter.getConfig();
      status[providerId] = {
        ...config,
        timeUntilNextToken: limiter.getTimeUntilNextToken(),
      };
    }
    
    return status;
  }

  /**
   * Reset all rate limiters
   */
  resetAll(): void {
    for (const limiter of this.limiters.values()) {
      limiter.reset();
    }
  }

  /**
   * Remove rate limiter for a provider
   */
  removeLimiter(providerId: string): void {
    this.limiters.delete(providerId);
  }
}

// Global rate limiter manager instance
export const rateLimiterManager = new RateLimiterManager();