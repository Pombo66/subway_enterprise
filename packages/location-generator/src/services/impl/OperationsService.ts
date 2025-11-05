/**
 * Operations monitoring and rate limiting service
 */
export interface OperationalLimits {
  isochrone: {
    concurrency: number;
    ratePerMinute: number;
    timeoutMs: number;
  };
  llm: {
    concurrency: number;
    ratePerMinute: number;
    timeoutMs: number;
    tokenBudget: number;
  };
  candidates: {
    maxPerWindow: number;
    maxTotalCandidates: number;
  };
  processing: {
    maxExecutionTimeMs: number;
    memoryLimitMB: number;
  };
}

export interface OperationalMetrics {
  isochrone: {
    requestsInFlight: number;
    requestsPerMinute: number;
    avgResponseTimeMs: number;
    errorRate: number;
    fallbackRate: number; // % using radial fallback
  };
  llm: {
    requestsInFlight: number;
    requestsPerMinute: number;
    tokensUsed: number;
    tokenBudgetRemaining: number;
    avgResponseTimeMs: number;
    cacheHitRate: number;
    uniquenessMean: number;
    uniqueness5thPercentile: number;
  };
  processing: {
    executionTimeMs: number;
    memoryUsageMB: number;
    candidatesProcessed: number;
    windowsProcessed: number;
  };
  system: {
    timestamp: number;
    uptime: number;
    healthStatus: 'healthy' | 'degraded' | 'critical';
    cacheAvailable: boolean;
    degradedMode: boolean;
  };
}

export interface RateLimiter {
  tryAcquire(): boolean;
  getWaitTimeMs(): number;
  reset(): void;
}

export class OperationsService {
  private metrics: OperationalMetrics;
  private limits: OperationalLimits;
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private requestCounters: Map<string, { count: number; windowStart: number }> = new Map();
  private uniquenessScores: number[] = [];
  private cacheAvailable: boolean = true;
  
  constructor(limits?: Partial<OperationalLimits>) {
    this.limits = {
      isochrone: {
        concurrency: 10,
        ratePerMinute: 300,
        timeoutMs: 30000,
        ...limits?.isochrone
      },
      llm: {
        concurrency: 5,
        ratePerMinute: 60,
        timeoutMs: 30000,
        tokenBudget: 20000,
        ...limits?.llm
      },
      candidates: {
        maxPerWindow: 500,
        maxTotalCandidates: 10000,
        ...limits?.candidates
      },
      processing: {
        maxExecutionTimeMs: 600000, // 10 minutes
        memoryLimitMB: 2048,
        ...limits?.processing
      }
    };

    this.metrics = this.initializeMetrics();
    this.setupRateLimiters();
  }

  /**
   * Check if isochrone request can proceed
   */
  canMakeIsochroneRequest(): { allowed: boolean; waitTimeMs?: number } {
    const concurrencyOk = this.metrics.isochrone.requestsInFlight < this.limits.isochrone.concurrency;
    const rateLimiter = this.rateLimiters.get('isochrone');
    const rateOk = rateLimiter?.tryAcquire() ?? true;
    
    if (concurrencyOk && rateOk) {
      return { allowed: true };
    }
    
    return {
      allowed: false,
      waitTimeMs: rateLimiter?.getWaitTimeMs() ?? 1000
    };
  }

  /**
   * Check if LLM request can proceed
   */
  canMakeLLMRequest(estimatedTokens: number = 1000): { allowed: boolean; reason?: string; waitTimeMs?: number } {
    const concurrencyOk = this.metrics.llm.requestsInFlight < this.limits.llm.concurrency;
    const rateLimiter = this.rateLimiters.get('llm');
    const rateOk = rateLimiter?.tryAcquire() ?? true;
    const budgetOk = this.metrics.llm.tokensUsed + estimatedTokens <= this.limits.llm.tokenBudget;
    
    if (!budgetOk) {
      return { allowed: false, reason: 'Token budget exceeded' };
    }
    
    if (!concurrencyOk) {
      return { allowed: false, reason: 'Concurrency limit reached' };
    }
    
    if (!rateOk) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded',
        waitTimeMs: rateLimiter?.getWaitTimeMs() ?? 1000
      };
    }
    
    return { allowed: true };
  }

  /**
   * Record isochrone request start
   */
  recordIsochroneStart(): string {
    const requestId = `iso_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.metrics.isochrone.requestsInFlight++;
    this.incrementCounter('isochrone');
    return requestId;
  }

  /**
   * Record isochrone request completion
   */
  recordIsochroneComplete(requestId: string, responseTimeMs: number, success: boolean, usedFallback: boolean): void {
    this.metrics.isochrone.requestsInFlight = Math.max(0, this.metrics.isochrone.requestsInFlight - 1);
    this.updateAverageResponseTime('isochrone', responseTimeMs);
    
    if (!success) {
      this.metrics.isochrone.errorRate = this.updateErrorRate('isochrone', false);
    }
    
    if (usedFallback) {
      this.metrics.isochrone.fallbackRate = this.updateFallbackRate(true);
    }
  }

  /**
   * Record LLM request start
   */
  recordLLMStart(): string {
    const requestId = `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.metrics.llm.requestsInFlight++;
    this.incrementCounter('llm');
    return requestId;
  }

  /**
   * Record LLM request completion
   */
  recordLLMComplete(requestId: string, responseTimeMs: number, tokensUsed: number, cacheHit: boolean): void {
    this.metrics.llm.requestsInFlight = Math.max(0, this.metrics.llm.requestsInFlight - 1);
    this.metrics.llm.tokensUsed += tokensUsed;
    this.updateAverageResponseTime('llm', responseTimeMs);
    
    if (cacheHit) {
      this.metrics.llm.cacheHitRate = this.updateCacheHitRate(true);
    }
  }

  /**
   * Update processing metrics
   */
  updateProcessingMetrics(executionTimeMs: number, memoryUsageMB: number, candidatesProcessed: number, windowsProcessed: number): void {
    this.metrics.processing = {
      executionTimeMs,
      memoryUsageMB,
      candidatesProcessed,
      windowsProcessed
    };
    
    // Update health status based on metrics
    this.updateHealthStatus();
  }

  /**
   * Get current operational metrics
   */
  getMetrics(): OperationalMetrics {
    this.updateRateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get operational limits
   */
  getLimits(): OperationalLimits {
    return { ...this.limits };
  }

  /**
   * Check if system is healthy
   */
  isHealthy(): boolean {
    return this.metrics.system.healthStatus === 'healthy';
  }

  /**
   * Get health status with details
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check execution time
    if (this.metrics.processing.executionTimeMs > this.limits.processing.maxExecutionTimeMs * 0.8) {
      issues.push('Processing time approaching limit');
      recommendations.push('Consider reducing candidate pool or increasing timeout');
    }
    
    // Check memory usage
    if (this.metrics.processing.memoryUsageMB > this.limits.processing.memoryLimitMB * 0.8) {
      issues.push('Memory usage high');
      recommendations.push('Optimize data structures or increase memory limit');
    }
    
    // Check error rates
    if (this.metrics.isochrone.errorRate > 0.1) {
      issues.push('High isochrone error rate');
      recommendations.push('Check isochrone service availability');
    }
    
    // Check fallback rate
    if (this.metrics.isochrone.fallbackRate > 0.5) {
      issues.push('High radial fallback usage');
      recommendations.push('Investigate isochrone service performance');
    }
    
    // Check token budget
    if (this.metrics.llm.tokenBudgetRemaining < 1000) {
      issues.push('LLM token budget nearly exhausted');
      recommendations.push('Increase token budget or reduce AI usage level');
    }

    // Check cache availability
    if (!this.metrics.system.cacheAvailable) {
      issues.push('Cache system unavailable - running in degraded mode');
      recommendations.push('Check cache service health and restart if needed');
    }

    // Check uniqueness scores
    if (this.uniquenessScores.length >= 10) {
      const alert = this.checkUniquenessAlert();
      if (alert.alert) {
        issues.push('Low rationale uniqueness detected');
        recommendations.push('Check for prompt drift or cache corruption');
      }
    }
    
    return {
      status: this.metrics.system.healthStatus,
      issues,
      recommendations
    };
  }

  /**
   * Record uniqueness scores for monitoring
   */
  recordUniquenessScores(scores: number[]): void {
    this.uniquenessScores.push(...scores);
    
    // Keep only recent scores (last 1000 to prevent memory bloat)
    if (this.uniquenessScores.length > 1000) {
      this.uniquenessScores = this.uniquenessScores.slice(-1000);
    }
    
    // Calculate mean and 5th percentile
    if (this.uniquenessScores.length > 0) {
      const sorted = [...this.uniquenessScores].sort((a, b) => a - b);
      
      // Mean
      this.metrics.llm.uniquenessMean = sorted.reduce((sum, score) => sum + score, 0) / sorted.length;
      
      // 5th percentile
      const p5Index = Math.floor(sorted.length * 0.05);
      this.metrics.llm.uniqueness5thPercentile = sorted[p5Index] || sorted[0];
    }
  }

  /**
   * Check for uniqueness alerts (prompt drift detection)
   */
  checkUniquenessAlert(): { alert: boolean; message?: string } {
    const { uniquenessMean, uniqueness5thPercentile } = this.metrics.llm;
    
    // Need at least 10 scores to make a meaningful assessment
    if (this.uniquenessScores.length < 10) {
      return { alert: false };
    }
    
    // Alert thresholds
    const MEAN_THRESHOLD = 0.3; // Alert if mean uniqueness drops below 30%
    const P5_THRESHOLD = 0.1;   // Alert if 5th percentile drops below 10%
    
    if (uniquenessMean < MEAN_THRESHOLD || uniqueness5thPercentile < P5_THRESHOLD) {
      return {
        alert: true,
        message: `Uniqueness degraded: mean=${(uniquenessMean * 100).toFixed(1)}%, p5=${(uniqueness5thPercentile * 100).toFixed(1)}% (possible prompt drift or cache miss)`
      };
    }
    
    return { alert: false };
  }

  /**
   * Set cache availability status
   */
  setCacheAvailable(available: boolean): void {
    this.cacheAvailable = available;
    this.metrics.system.cacheAvailable = available;
    this.metrics.system.degradedMode = !available;
  }

  /**
   * Check if cache is available
   */
  isCacheAvailable(): boolean {
    return this.cacheAvailable;
  }

  /**
   * Reset operational metrics
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.rateLimiters.forEach(limiter => limiter.reset());
    this.requestCounters.clear();
    this.uniquenessScores = [];
    this.cacheAvailable = true;
  }

  /**
   * Initialize metrics structure
   */
  private initializeMetrics(): OperationalMetrics {
    return {
      isochrone: {
        requestsInFlight: 0,
        requestsPerMinute: 0,
        avgResponseTimeMs: 0,
        errorRate: 0,
        fallbackRate: 0
      },
      llm: {
        requestsInFlight: 0,
        requestsPerMinute: 0,
        tokensUsed: 0,
        tokenBudgetRemaining: this.limits.llm.tokenBudget,
        avgResponseTimeMs: 0,
        cacheHitRate: 0,
        uniquenessMean: 0,
        uniqueness5thPercentile: 0
      },
      processing: {
        executionTimeMs: 0,
        memoryUsageMB: 0,
        candidatesProcessed: 0,
        windowsProcessed: 0
      },
      system: {
        timestamp: Date.now(),
        uptime: 0,
        healthStatus: 'healthy',
        cacheAvailable: true,
        degradedMode: false
      }
    };
  }

  /**
   * Setup rate limiters
   */
  private setupRateLimiters(): void {
    this.rateLimiters.set('isochrone', new TokenBucketRateLimiter(
      this.limits.isochrone.ratePerMinute,
      60000 // 1 minute window
    ));
    
    this.rateLimiters.set('llm', new TokenBucketRateLimiter(
      this.limits.llm.ratePerMinute,
      60000 // 1 minute window
    ));
  }

  /**
   * Increment request counter
   */
  private incrementCounter(service: string): void {
    const now = Date.now();
    const counter = this.requestCounters.get(service) || { count: 0, windowStart: now };
    
    // Reset if window expired
    if (now - counter.windowStart > 60000) {
      counter.count = 0;
      counter.windowStart = now;
    }
    
    counter.count++;
    this.requestCounters.set(service, counter);
  }

  /**
   * Update rate metrics
   */
  private updateRateMetrics(): void {
    const now = Date.now();
    
    // Update isochrone rate
    const isoCounter = this.requestCounters.get('isochrone');
    if (isoCounter && now - isoCounter.windowStart <= 60000) {
      this.metrics.isochrone.requestsPerMinute = isoCounter.count;
    }
    
    // Update LLM rate
    const llmCounter = this.requestCounters.get('llm');
    if (llmCounter && now - llmCounter.windowStart <= 60000) {
      this.metrics.llm.requestsPerMinute = llmCounter.count;
    }
    
    // Update token budget remaining
    this.metrics.llm.tokenBudgetRemaining = Math.max(0, this.limits.llm.tokenBudget - this.metrics.llm.tokensUsed);
    
    // Update system metrics
    this.metrics.system.timestamp = now;
    this.metrics.system.uptime = now - (this.metrics.system.timestamp || now);
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(service: 'isochrone' | 'llm', responseTimeMs: number): void {
    const current = service === 'isochrone' ? this.metrics.isochrone.avgResponseTimeMs : this.metrics.llm.avgResponseTimeMs;
    const updated = current === 0 ? responseTimeMs : (current * 0.9 + responseTimeMs * 0.1); // Exponential moving average
    
    if (service === 'isochrone') {
      this.metrics.isochrone.avgResponseTimeMs = updated;
    } else {
      this.metrics.llm.avgResponseTimeMs = updated;
    }
  }

  /**
   * Update error rate
   */
  private updateErrorRate(service: string, success: boolean): number {
    // Simple exponential moving average
    const current = this.metrics.isochrone.errorRate;
    return success ? current * 0.95 : Math.min(1, current * 0.95 + 0.05);
  }

  /**
   * Update fallback rate
   */
  private updateFallbackRate(usedFallback: boolean): number {
    const current = this.metrics.isochrone.fallbackRate;
    return usedFallback ? Math.min(1, current * 0.95 + 0.05) : current * 0.95;
  }

  /**
   * Update cache hit rate
   */
  private updateCacheHitRate(cacheHit: boolean): number {
    const current = this.metrics.llm.cacheHitRate;
    return cacheHit ? Math.min(1, current * 0.95 + 0.05) : current * 0.95;
  }

  /**
   * Update health status based on current metrics
   */
  private updateHealthStatus(): void {
    const issues = this.getHealthStatus().issues;
    
    if (issues.length === 0) {
      this.metrics.system.healthStatus = 'healthy';
    } else if (issues.length <= 2) {
      this.metrics.system.healthStatus = 'degraded';
    } else {
      this.metrics.system.healthStatus = 'critical';
    }
  }
}

/**
 * Token bucket rate limiter implementation
 */
class TokenBucketRateLimiter implements RateLimiter {
  private tokens: number;
  private lastRefill: number;
  
  constructor(
    private maxTokens: number,
    private refillIntervalMs: number
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  tryAcquire(): boolean {
    this.refill();
    
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    
    return false;
  }

  getWaitTimeMs(): number {
    this.refill();
    
    if (this.tokens > 0) {
      return 0;
    }
    
    // Calculate time until next token is available
    const timeSinceLastRefill = Date.now() - this.lastRefill;
    const timeUntilNextRefill = this.refillIntervalMs - timeSinceLastRefill;
    return Math.max(0, timeUntilNextRefill);
  }

  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    
    if (timePassed >= this.refillIntervalMs) {
      this.tokens = this.maxTokens;
      this.lastRefill = now;
    }
  }
}