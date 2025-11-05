/**
 * Concurrency Manager Service
 * Manages parallel processing with rate limiting and queue management
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

export interface ConcurrencyConfig {
  maxConcurrentRequests: number; // 4 simultaneous requests (Requirement 6.1)
  rateLimitPerMinute: number; // OpenAI API rate limit
  queueTimeout: number; // Maximum time to wait in queue
  batchSize: number; // Batch size for processing
}

export interface QueuedTask<T> {
  id: string;
  operation: () => Promise<T>;
  priority: number;
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: T;
  error?: Error;
}

export interface ConcurrencyStats {
  activeRequests: number;
  queuedRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  throughput: number; // requests per minute
}

export class ConcurrencyManagerService {
  private readonly config: ConcurrencyConfig;
  private readonly logger: (message: string, data?: any) => void;
  
  private activeRequests = new Set<string>();
  private requestQueue: QueuedTask<any>[] = [];
  private completedTasks: QueuedTask<any>[] = [];
  private rateLimitWindow: Date[] = []; // Track requests in current minute
  
  private processingInterval?: NodeJS.Timeout;

  constructor(
    config: Partial<ConcurrencyConfig> = {},
    logger?: (message: string, data?: any) => void
  ) {
    this.config = {
      maxConcurrentRequests: 4, // Requirement 6.1: 4-request limit
      rateLimitPerMinute: 50, // Conservative OpenAI rate limit
      queueTimeout: 300000, // 5 minutes
      batchSize: 10,
      ...config
    };

    this.logger = logger || ((message: string, data?: any) => {
      console.log(`[ConcurrencyManager] ${message}`, data || '');
    });

    // Start processing queue
    this.startProcessing();
  }

  /**
   * Process multiple rationale requests in parallel
   * Requirement 6.1: Process multiple rationale requests in parallel with 4-request limit
   * Requirement 6.2: Implement batching for multiple candidate rationale generation
   */
  async processInParallel<T>(
    operations: Array<() => Promise<T>>,
    options: {
      priority?: number;
      batchSize?: number;
      timeout?: number;
    } = {}
  ): Promise<T[]> {
    const {
      priority = 1,
      batchSize = this.config.batchSize,
      timeout = this.config.queueTimeout
    } = options;

    this.logger('Processing operations in parallel', {
      operationCount: operations.length,
      batchSize,
      priority
    });

    // Split operations into batches
    const batches = this.createBatches(operations, batchSize);
    const results: T[] = [];

    for (const batch of batches) {
      const batchResults = await this.processBatch(batch, priority, timeout);
      results.push(...batchResults);
    }

    this.logger('Parallel processing completed', {
      totalOperations: operations.length,
      batches: batches.length,
      successCount: results.length
    });

    return results;
  }

  /**
   * Queue single operation for processing
   * Requirement 6.3: Add rate limiting to stay within OpenAI API limits
   */
  async queueOperation<T>(
    operation: () => Promise<T>,
    priority: number = 1,
    timeout?: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const taskId = this.generateTaskId();
      const task: QueuedTask<T> = {
        id: taskId,
        operation: async () => {
          try {
            const result = await operation();
            resolve(result);
            return result;
          } catch (error) {
            reject(error);
            throw error;
          }
        },
        priority,
        queuedAt: new Date()
      };

      // Add to queue with priority sorting
      this.requestQueue.push(task);
      this.requestQueue.sort((a, b) => b.priority - a.priority);

      this.logger('Operation queued', {
        taskId,
        priority,
        queueLength: this.requestQueue.length
      });

      // Set timeout if specified
      if (timeout) {
        setTimeout(() => {
          if (!task.completedAt && !task.startedAt) {
            this.removeFromQueue(taskId);
            reject(new Error(`Operation timed out in queue after ${timeout}ms`));
          }
        }, timeout);
      }
    });
  }

  /**
   * Get current concurrency statistics
   * Requirement 6.4: Add queue status monitoring and reporting
   */
  getStats(): ConcurrencyStats {
    const now = Date.now();
    const completedInLastMinute = this.completedTasks.filter(
      task => task.completedAt && (now - task.completedAt.getTime()) < 60000
    );

    const processingTimes = this.completedTasks
      .filter(task => task.startedAt && task.completedAt)
      .map(task => task.completedAt!.getTime() - task.startedAt!.getTime());

    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    return {
      activeRequests: this.activeRequests.size,
      queuedRequests: this.requestQueue.length,
      completedRequests: this.completedTasks.length,
      failedRequests: this.completedTasks.filter(task => task.error).length,
      averageProcessingTime,
      throughput: completedInLastMinute.length // requests per minute
    };
  }

  /**
   * Check if rate limit allows new request
   * Requirement 6.3: Implement rate limiting to stay within OpenAI API constraints
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old entries
    this.rateLimitWindow = this.rateLimitWindow.filter(
      timestamp => timestamp.getTime() > oneMinuteAgo
    );

    // Check if we're under the rate limit
    const canProceed = this.rateLimitWindow.length < this.config.rateLimitPerMinute;
    
    if (!canProceed) {
      this.logger('Rate limit reached, delaying request', {
        requestsInWindow: this.rateLimitWindow.length,
        limit: this.config.rateLimitPerMinute
      });
    }

    return canProceed;
  }

  /**
   * Achieve seconds-level completion for 10 rationales
   * Requirement 6.5: Achieve seconds-level completion for 10 rationales through parallel processing
   */
  async generateMultipleRationales<T>(
    rationaleOperations: Array<() => Promise<T>>,
    targetCompletionTime: number = 10000 // 10 seconds target
  ): Promise<{
    results: T[];
    completionTime: number;
    success: boolean;
  }> {
    const startTime = Date.now();
    
    this.logger('Starting multiple rationale generation', {
      operationCount: rationaleOperations.length,
      targetTime: targetCompletionTime
    });

    try {
      // Use aggressive parallel processing for speed
      const results = await this.processInParallel(rationaleOperations, {
        priority: 10, // High priority
        batchSize: Math.min(rationaleOperations.length, this.config.maxConcurrentRequests),
        timeout: targetCompletionTime
      });

      const completionTime = Date.now() - startTime;
      const success = completionTime <= targetCompletionTime;

      this.logger('Multiple rationale generation completed', {
        operationCount: rationaleOperations.length,
        completionTime,
        targetTime: targetCompletionTime,
        success,
        throughput: (rationaleOperations.length / completionTime) * 1000 // operations per second
      });

      return {
        results,
        completionTime,
        success
      };
    } catch (error) {
      const completionTime = Date.now() - startTime;
      
      this.logger('Multiple rationale generation failed', {
        error: (error as Error).message,
        completionTime
      });

      throw error;
    }
  }

  /**
   * Stop processing and cleanup
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    // Cancel all queued operations
    for (const task of this.requestQueue) {
      if (task.operation) {
        // Mark as cancelled
        task.error = new Error('Processing stopped');
        task.completedAt = new Date();
      }
    }

    this.requestQueue = [];
    this.activeRequests.clear();

    this.logger('Concurrency manager stopped');
  }

  /**
   * Start processing queue
   */
  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 100); // Check every 100ms
  }

  /**
   * Process queued operations
   */
  private async processQueue(): Promise<void> {
    // Check if we can process more requests
    if (this.activeRequests.size >= this.config.maxConcurrentRequests) {
      return;
    }

    // Check rate limiting
    if (!this.canMakeRequest()) {
      return;
    }

    // Get next task from queue
    const task = this.requestQueue.shift();
    if (!task) {
      return;
    }

    // Start processing task
    this.activeRequests.add(task.id);
    task.startedAt = new Date();
    this.rateLimitWindow.push(new Date());

    this.logger('Starting task processing', {
      taskId: task.id,
      queuedFor: task.startedAt.getTime() - task.queuedAt.getTime(),
      activeRequests: this.activeRequests.size
    });

    try {
      task.result = await task.operation();
      task.completedAt = new Date();
      
      this.logger('Task completed successfully', {
        taskId: task.id,
        processingTime: task.completedAt.getTime() - task.startedAt.getTime()
      });
    } catch (error) {
      task.error = error as Error;
      task.completedAt = new Date();
      
      this.logger('Task failed', {
        taskId: task.id,
        error: (error as Error).message
      });
    } finally {
      this.activeRequests.delete(task.id);
      this.completedTasks.push(task);
      
      // Limit completed tasks history
      if (this.completedTasks.length > 1000) {
        this.completedTasks = this.completedTasks.slice(-500);
      }
    }
  }

  /**
   * Process a batch of operations
   */
  private async processBatch<T>(
    operations: Array<() => Promise<T>>,
    priority: number,
    timeout: number
  ): Promise<T[]> {
    const promises = operations.map(operation => 
      this.queueOperation(operation, priority, timeout)
    );

    return Promise.all(promises);
  }

  /**
   * Create batches from operations array
   */
  private createBatches<T>(
    operations: Array<() => Promise<T>>,
    batchSize: number
  ): Array<Array<() => Promise<T>>> {
    const batches: Array<Array<() => Promise<T>>> = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      batches.push(operations.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Remove task from queue
   */
  private removeFromQueue(taskId: string): boolean {
    const index = this.requestQueue.findIndex(task => task.id === taskId);
    if (index !== -1) {
      this.requestQueue.splice(index, 1);
      return true;
    }
    return false;
  }
}