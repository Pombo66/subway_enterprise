/**
 * RequestCoordinator - Manages API request coordination, cancellation, and deduplication
 * Prevents race conditions and coordinates polling with user interactions
 */

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  priority?: 'low' | 'normal' | 'high';
  deduplicationKey?: string;
  abortSignal?: AbortSignal;
}

export interface RequestResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  fromCache?: boolean;
  requestId: string;
  duration: number;
}

interface PendingRequest<T> {
  promise: Promise<RequestResult<T>>;
  abortController: AbortController;
  timestamp: number;
  priority: 'low' | 'normal' | 'high';
  deduplicationKey?: string;
  requestId: string;
}

interface RequestCache<T> {
  result: RequestResult<T>;
  timestamp: number;
  ttl: number;
}

/**
 * RequestCoordinator manages API requests with coordination and cancellation
 */
export class RequestCoordinator {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private requestCache: Map<string, RequestCache<any>> = new Map();
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue: boolean = false;
  private abortController: AbortController = new AbortController();
  
  // Configuration
  private maxConcurrentRequests: number = 5;
  private defaultTimeout: number = 30000;
  private defaultCacheTTL: number = 30000; // 30 seconds
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: {
    maxConcurrentRequests?: number;
    defaultTimeout?: number;
    defaultCacheTTL?: number;
  } = {}) {
    this.maxConcurrentRequests = options.maxConcurrentRequests ?? 5;
    this.defaultTimeout = options.defaultTimeout ?? 30000;
    this.defaultCacheTTL = options.defaultCacheTTL ?? 30000;

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRequests();
    }, 10000); // Cleanup every 10 seconds
  }

  /**
   * Execute a request with coordination and cancellation
   */
  async executeRequest<T>(
    requestFn: (abortSignal: AbortSignal) => Promise<T>,
    options: RequestOptions = {}
  ): Promise<RequestResult<T>> {
    const requestId = this.generateRequestId();
    const deduplicationKey = options.deduplicationKey;
    const priority = options.priority ?? 'normal';
    const timeout = options.timeout ?? this.defaultTimeout;

    // Check for existing request with same deduplication key
    if (deduplicationKey) {
      const existingRequest = this.findExistingRequest(deduplicationKey);
      if (existingRequest) {
        console.log('🔄 Reusing existing request:', deduplicationKey);
        return existingRequest.promise;
      }

      // Check cache
      const cachedResult = this.getCachedResult<T>(deduplicationKey);
      if (cachedResult) {
        console.log('📦 Using cached result:', deduplicationKey);
        return cachedResult;
      }
    }

    // Create abort controller for this request
    const requestAbortController = new AbortController();
    
    // Link to parent abort signal if provided
    if (options.abortSignal) {
      const parentAbortHandler = () => requestAbortController.abort();
      if (options.abortSignal.aborted) {
        requestAbortController.abort();
      } else {
        options.abortSignal.addEventListener('abort', parentAbortHandler, { once: true });
      }
    }

    // Link to coordinator abort signal
    const coordinatorAbortHandler = () => requestAbortController.abort();
    if (this.abortController.signal.aborted) {
      requestAbortController.abort();
    } else {
      this.abortController.signal.addEventListener('abort', coordinatorAbortHandler, { once: true });
    }

    // Create the request promise
    const requestPromise = this.createRequestPromise(
      requestFn,
      requestAbortController,
      timeout,
      requestId
    );

    // Store pending request
    const pendingRequest: PendingRequest<T> = {
      promise: requestPromise,
      abortController: requestAbortController,
      timestamp: Date.now(),
      priority,
      deduplicationKey,
      requestId,
    };

    this.pendingRequests.set(requestId, pendingRequest);

    // Clean up when request completes
    requestPromise.finally(() => {
      this.pendingRequests.delete(requestId);
    });

    // Queue or execute immediately based on concurrency
    if (this.pendingRequests.size > this.maxConcurrentRequests) {
      return this.queueRequest(() => requestPromise);
    }

    return requestPromise;
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    this.pendingRequests.forEach(request => {
      request.abortController.abort();
    });
    this.pendingRequests.clear();
    this.requestQueue = [];
  }

  /**
   * Cancel requests by deduplication key
   */
  cancelRequestsByKey(deduplicationKey: string): void {
    const requestsToCancel = Array.from(this.pendingRequests.values())
      .filter(request => request.deduplicationKey === deduplicationKey);

    requestsToCancel.forEach(request => {
      request.abortController.abort();
      this.pendingRequests.delete(request.requestId);
    });
  }

  /**
   * Get statistics about pending requests
   */
  getStats(): {
    pendingRequests: number;
    queuedRequests: number;
    cacheSize: number;
    requestsByPriority: Record<string, number>;
  } {
    const requestsByPriority = { low: 0, normal: 0, high: 0 };
    
    this.pendingRequests.forEach(request => {
      requestsByPriority[request.priority]++;
    });

    return {
      pendingRequests: this.pendingRequests.size,
      queuedRequests: this.requestQueue.length,
      cacheSize: this.requestCache.size,
      requestsByPriority,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.requestCache.clear();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Abort all pending requests
    this.abortController.abort();
    this.cancelAllRequests();

    // Clear cache
    this.clearCache();

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Create a request promise with timeout and error handling
   */
  private async createRequestPromise<T>(
    requestFn: (abortSignal: AbortSignal) => Promise<T>,
    abortController: AbortController,
    timeout: number,
    requestId: string
  ): Promise<RequestResult<T>> {
    const startTime = Date.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Request timeout after ${timeout}ms`));
        }, timeout);

        // Clear timeout if request is aborted
        const abortHandler = () => {
          clearTimeout(timeoutId);
          reject(new Error('Request was cancelled'));
        };

        if (abortController.signal.aborted) {
          clearTimeout(timeoutId);
          reject(new Error('Request was cancelled'));
          return;
        }

        abortController.signal.addEventListener('abort', abortHandler, { once: true });
      });

      // Race between request and timeout
      const result = await Promise.race([
        requestFn(abortController.signal),
        timeoutPromise,
      ]);

      const duration = Date.now() - startTime;

      const successResult: RequestResult<T> = {
        success: true,
        data: result,
        requestId,
        duration,
      };

      return successResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      const errorResult: RequestResult<T> = {
        success: false,
        error: errorMessage,
        requestId,
        duration,
      };

      return errorResult;
    }
  }

  /**
   * Queue a request when at max concurrency
   */
  private async queueRequest<T>(requestFn: () => Promise<RequestResult<T>>): Promise<RequestResult<T>> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.requestQueue.length > 0 && this.pendingRequests.size < this.maxConcurrentRequests) {
        const requestFn = this.requestQueue.shift();
        if (requestFn) {
          // Execute without awaiting to allow concurrent processing
          requestFn().catch(error => {
            console.warn('Queued request failed:', error);
          });
        }
      }
    } finally {
      this.isProcessingQueue = false;

      // Continue processing if there are more requests
      if (this.requestQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  /**
   * Find existing request by deduplication key
   */
  private findExistingRequest(deduplicationKey: string): PendingRequest<any> | null {
    for (const request of this.pendingRequests.values()) {
      if (request.deduplicationKey === deduplicationKey && !request.abortController.signal.aborted) {
        return request;
      }
    }
    return null;
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult<T>(key: string): RequestResult<T> | null {
    const cached = this.requestCache.get(key);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.requestCache.delete(key);
      return null;
    }

    return {
      ...cached.result,
      fromCache: true,
    };
  }

  /**
   * Cache a successful result
   */
  private cacheResult<T>(key: string, result: RequestResult<T>, ttl: number = this.defaultCacheTTL): void {
    if (result.success) {
      this.requestCache.set(key, {
        result: { ...result },
        timestamp: Date.now(),
        ttl,
      });
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up expired requests and cache entries
   */
  private cleanupExpiredRequests(): void {
    const now = Date.now();

    // Clean up expired cache entries
    for (const [key, cached] of this.requestCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.requestCache.delete(key);
      }
    }

    // Clean up stale pending requests (older than 5 minutes)
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    for (const [requestId, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > staleThreshold) {
        request.abortController.abort();
        this.pendingRequests.delete(requestId);
      }
    }
  }
}

/**
 * Default request coordinator instance
 */
export const defaultRequestCoordinator = new RequestCoordinator();