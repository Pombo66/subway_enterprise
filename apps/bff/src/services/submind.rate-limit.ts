import { Injectable, OnModuleDestroy } from '@nestjs/common';

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
  windowStart: number;
}

interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
  resetTime: number;
}

@Injectable()
export class SubMindRateLimitService implements OnModuleDestroy {
  private buckets = new Map<string, RateLimitBucket>();
  private readonly maxTokens: number;
  private readonly windowMs: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Default: 10 requests per 60 seconds
    this.maxTokens = parseInt(process.env.SUBMIND_RATE_LIMIT_REQUESTS || '10', 10);
    this.windowMs = parseInt(process.env.SUBMIND_RATE_LIMIT_WINDOW || '60', 10) * 1000;
    
    // Set up periodic cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  checkRateLimit(ip: string): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(ip);

    if (!bucket) {
      // Create new bucket for this IP
      bucket = {
        tokens: this.maxTokens - 1, // Consume one token immediately
        lastRefill: now,
        windowStart: now,
      };
      this.buckets.set(ip, bucket);
      
      return {
        allowed: true,
        remainingTokens: bucket.tokens,
        resetTime: now + this.windowMs,
      };
    }

    // Check if window has expired
    if (now - bucket.windowStart >= this.windowMs) {
      // Reset the bucket for new window
      bucket.tokens = this.maxTokens - 1; // Consume one token immediately
      bucket.windowStart = now;
      bucket.lastRefill = now;
      
      return {
        allowed: true,
        remainingTokens: bucket.tokens,
        resetTime: now + this.windowMs,
      };
    }

    // Check if we have tokens available
    if (bucket.tokens > 0) {
      bucket.tokens--;
      bucket.lastRefill = now;
      
      return {
        allowed: true,
        remainingTokens: bucket.tokens,
        resetTime: bucket.windowStart + this.windowMs,
      };
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remainingTokens: 0,
      resetTime: bucket.windowStart + this.windowMs,
    };
  }

  // Clean up old buckets periodically to prevent memory leaks
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs * 2; // Keep buckets for 2 windows

    for (const [ip, bucket] of this.buckets.entries()) {
      if (bucket.windowStart < cutoff) {
        this.buckets.delete(ip);
      }
    }
  }
}