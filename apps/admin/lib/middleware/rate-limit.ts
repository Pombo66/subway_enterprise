interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // Clean up expired entries
    if (entry && entry.resetTime < now) {
      this.requests.delete(identifier);
    }

    const currentEntry = this.requests.get(identifier);

    if (!currentEntry) {
      // First request in window
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      };
    }

    if (currentEntry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: currentEntry.resetTime
      };
    }

    // Increment count
    currentEntry.count++;
    this.requests.set(identifier, currentEntry);

    return {
      allowed: true,
      remaining: this.maxRequests - currentEntry.count,
      resetTime: currentEntry.resetTime
    };
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

// Singleton instance
export const expansionRateLimiter = new RateLimiter(
  parseInt(process.env.EXPANSION_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  parseInt(process.env.EXPANSION_RATE_LIMIT_MAX || '10') // 10 requests
);
