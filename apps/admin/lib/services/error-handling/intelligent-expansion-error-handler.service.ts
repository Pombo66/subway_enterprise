/**
 * Intelligent Expansion Error Handler Service
 * Provides comprehensive error handling, fallback mechanisms, and graceful degradation
 */

export interface ErrorContext {
  service: string;
  operation: string;
  input?: any;
  timestamp: Date;
  userId?: string;
  requestId?: string;
}

export interface ErrorRecoveryStrategy {
  type: 'FALLBACK' | 'RETRY' | 'SKIP' | 'FAIL';
  description: string;
  maxAttempts?: number;
  backoffMs?: number;
  fallbackValue?: any;
}

export interface ErrorHandlingResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  recoveryUsed?: ErrorRecoveryStrategy;
  attempts: number;
  totalTime: number;
}

export interface ServiceHealthStatus {
  service: string;
  healthy: boolean;
  lastError?: Date;
  errorCount: number;
  successCount: number;
  successRate: number;
  status: 'OPERATIONAL' | 'DEGRADED' | 'FAILING' | 'DOWN';
}

export class IntelligentExpansionErrorHandler {
  private static instance: IntelligentExpansionErrorHandler;
  private errorHistory: Map<string, Error[]> = new Map();
  private serviceHealth: Map<string, ServiceHealthStatus> = new Map();
  private circuitBreakers: Map<string, { isOpen: boolean; lastFailure: Date; failureCount: number }> = new Map();
  
  // Error handling configuration
  private readonly CONFIG = {
    MAX_RETRY_ATTEMPTS: 3,
    CIRCUIT_BREAKER_THRESHOLD: 5,
    CIRCUIT_BREAKER_TIMEOUT_MS: 60000, // 1 minute
    ERROR_HISTORY_LIMIT: 100,
    HEALTH_CHECK_WINDOW_MS: 300000 // 5 minutes
  };

  private constructor() {
    console.log('🛡️ Intelligent Expansion Error Handler initialized');
  }

  public static getInstance(): IntelligentExpansionErrorHandler {
    if (!IntelligentExpansionErrorHandler.instance) {
      IntelligentExpansionErrorHandler.instance = new IntelligentExpansionErrorHandler();
    }
    return IntelligentExpansionErrorHandler.instance;
  }

  /**
   * Execute operation with comprehensive error handling
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    strategy: ErrorRecoveryStrategy
  ): Promise<ErrorHandlingResult<T>> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | undefined;

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(context.service)) {
      return {
        success: false,
        error: new Error(`Circuit breaker open for ${context.service}`),
        attempts: 0,
        totalTime: Date.now() - startTime
      };
    }

    const maxAttempts = strategy.maxAttempts || this.CONFIG.MAX_RETRY_ATTEMPTS;

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        console.log(`🔄 Executing ${context.service}.${context.operation} (attempt ${attempts}/${maxAttempts})`);
        
        const result = await operation();
        
        // Record success
        this.recordSuccess(context.service);
        
        return {
          success: true,
          data: result,
          attempts,
          totalTime: Date.now() - startTime
        };
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ ${context.service}.${context.operation} failed (attempt ${attempts}):`, error);
        
        // Record error
        this.recordError(context.service, lastError, context);
        
        // Check if we should retry
        if (attempts < maxAttempts && this.shouldRetry(lastError, strategy)) {
          const backoffTime = this.calculateBackoff(attempts, strategy.backoffMs);
          console.log(`   Retrying in ${backoffTime}ms...`);
          await this.sleep(backoffTime);
          continue;
        }
        
        break;
      }
    }

    // All attempts failed, apply recovery strategy
    return this.applyRecoveryStrategy(lastError!, context, strategy, attempts, Date.now() - startTime);
  }

  /**
   * Handle AI service errors with specific fallback strategies
   */
  async handleAIServiceError<T>(
    serviceName: string,
    operation: string,
    error: Error,
    fallbackValue?: T
  ): Promise<ErrorHandlingResult<T>> {
    console.error(`❌ AI Service Error in ${serviceName}.${operation}:`, error);
    
    const context: ErrorContext = {
      service: serviceName,
      operation,
      timestamp: new Date()
    };

    this.recordError(serviceName, error, context);

    // Determine fallback strategy based on service and error type
    const strategy = this.determineAIServiceFallbackStrategy(serviceName, error, fallbackValue);
    
    return {
      success: false,
      error,
      recoveryUsed: strategy,
      attempts: 1,
      totalTime: 0
    };
  }

  /**
   * Handle OpenAI API errors with specific recovery strategies
   */
  async handleOpenAIError(
    operation: string,
    error: Error,
    retryOperation?: () => Promise<any>
  ): Promise<ErrorHandlingResult> {
    console.error(`❌ OpenAI API Error in ${operation}:`, error);
    
    const context: ErrorContext = {
      service: 'OpenAI',
      operation,
      timestamp: new Date()
    };

    // Determine recovery strategy based on error type
    let strategy: ErrorRecoveryStrategy;
    
    if (error.message.includes('rate_limit')) {
      strategy = {
        type: 'RETRY',
        description: 'Rate limit exceeded - retry with exponential backoff',
        maxAttempts: 3,
        backoffMs: 2000
      };
    } else if (error.message.includes('timeout')) {
      strategy = {
        type: 'RETRY',
        description: 'Request timeout - retry with increased timeout',
        maxAttempts: 2,
        backoffMs: 1000
      };
    } else if (error.message.includes('invalid_request')) {
      strategy = {
        type: 'FAIL',
        description: 'Invalid request - cannot recover'
      };
    } else {
      strategy = {
        type: 'FALLBACK',
        description: 'Unknown OpenAI error - use fallback response',
        fallbackValue: this.generateFallbackAIResponse(operation)
      };
    }

    if (strategy.type === 'RETRY' && retryOperation) {
      return this.executeWithErrorHandling(retryOperation, context, strategy);
    }

    return this.applyRecoveryStrategy(error, context, strategy, 1, 0);
  }

  /**
   * Handle database errors with connection recovery
   */
  async handleDatabaseError(
    operation: string,
    error: Error,
    retryOperation?: () => Promise<any>
  ): Promise<ErrorHandlingResult> {
    console.error(`❌ Database Error in ${operation}:`, error);
    
    const context: ErrorContext = {
      service: 'Database',
      operation,
      timestamp: new Date()
    };

    let strategy: ErrorRecoveryStrategy;
    
    if (error.message.includes('connection') || error.message.includes('timeout')) {
      strategy = {
        type: 'RETRY',
        description: 'Database connection issue - retry with backoff',
        maxAttempts: 3,
        backoffMs: 1000
      };
    } else if (error.message.includes('constraint') || error.message.includes('unique')) {
      strategy = {
        type: 'FAIL',
        description: 'Data constraint violation - cannot recover'
      };
    } else {
      strategy = {
        type: 'FALLBACK',
        description: 'Database error - use cached or default data',
        fallbackValue: null
      };
    }

    if (strategy.type === 'RETRY' && retryOperation) {
      return this.executeWithErrorHandling(retryOperation, context, strategy);
    }

    return this.applyRecoveryStrategy(error, context, strategy, 1, 0);
  }

  /**
   * Get service health status
   */
  getServiceHealth(serviceName?: string): ServiceHealthStatus | ServiceHealthStatus[] {
    if (serviceName) {
      return this.serviceHealth.get(serviceName) || {
        service: serviceName,
        healthy: true,
        errorCount: 0,
        successCount: 0,
        successRate: 1.0,
        status: 'OPERATIONAL'
      };
    }

    return Array.from(this.serviceHealth.values());
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByService: Record<string, number>;
    recentErrors: Array<{ service: string; error: string; timestamp: Date }>;
    circuitBreakerStatus: Record<string, boolean>;
  } {
    const totalErrors = Array.from(this.errorHistory.values())
      .reduce((sum, errors) => sum + errors.length, 0);

    const errorsByService: Record<string, number> = {};
    this.errorHistory.forEach((errors, service) => {
      errorsByService[service] = errors.length;
    });

    const recentErrors = Array.from(this.errorHistory.entries())
      .flatMap(([service, errors]) => 
        errors.slice(-5).map(error => ({
          service,
          error: error.message,
          timestamp: new Date() // Would need to store timestamp with error
        }))
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);

    const circuitBreakerStatus: Record<string, boolean> = {};
    this.circuitBreakers.forEach((status, service) => {
      circuitBreakerStatus[service] = status.isOpen;
    });

    return {
      totalErrors,
      errorsByService,
      recentErrors,
      circuitBreakerStatus
    };
  }

  /**
   * Reset error handling state (for testing)
   */
  reset(): void {
    this.errorHistory.clear();
    this.serviceHealth.clear();
    this.circuitBreakers.clear();
    console.log('🔄 Error handler state reset');
  }

  /**
   * Record successful operation
   */
  private recordSuccess(serviceName: string): void {
    const health = this.serviceHealth.get(serviceName) || {
      service: serviceName,
      healthy: true,
      errorCount: 0,
      successCount: 0,
      successRate: 1.0,
      status: 'OPERATIONAL' as const
    };

    health.successCount++;
    health.successRate = health.successCount / (health.successCount + health.errorCount);
    health.healthy = health.successRate > 0.9;
    health.status = this.determineServiceStatus(health);

    this.serviceHealth.set(serviceName, health);

    // Reset circuit breaker on success
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      circuitBreaker.failureCount = 0;
      circuitBreaker.isOpen = false;
    }
  }

  /**
   * Record error for a service
   */
  private recordError(serviceName: string, error: Error, context: ErrorContext): void {
    // Add to error history
    if (!this.errorHistory.has(serviceName)) {
      this.errorHistory.set(serviceName, []);
    }
    
    const errors = this.errorHistory.get(serviceName)!;
    errors.push(error);
    
    // Keep only recent errors
    if (errors.length > this.CONFIG.ERROR_HISTORY_LIMIT) {
      errors.splice(0, errors.length - this.CONFIG.ERROR_HISTORY_LIMIT);
    }

    // Update service health
    const health = this.serviceHealth.get(serviceName) || {
      service: serviceName,
      healthy: true,
      errorCount: 0,
      successCount: 0,
      successRate: 1.0,
      status: 'OPERATIONAL' as const
    };

    health.errorCount++;
    health.lastError = new Date();
    health.successRate = health.successCount / (health.successCount + health.errorCount);
    health.healthy = health.successRate > 0.9;
    health.status = this.determineServiceStatus(health);

    this.serviceHealth.set(serviceName, health);

    // Update circuit breaker
    this.updateCircuitBreaker(serviceName);
  }

  /**
   * Check if circuit breaker is open for a service
   */
  private isCircuitBreakerOpen(serviceName: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (!circuitBreaker) return false;

    if (circuitBreaker.isOpen) {
      // Check if timeout has passed
      const timeoutPassed = Date.now() - circuitBreaker.lastFailure.getTime() > this.CONFIG.CIRCUIT_BREAKER_TIMEOUT_MS;
      if (timeoutPassed) {
        circuitBreaker.isOpen = false;
        circuitBreaker.failureCount = 0;
        console.log(`🔄 Circuit breaker reset for ${serviceName}`);
      }
    }

    return circuitBreaker.isOpen;
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(serviceName: string): void {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, {
        isOpen: false,
        lastFailure: new Date(),
        failureCount: 0
      });
    }

    const circuitBreaker = this.circuitBreakers.get(serviceName)!;
    circuitBreaker.failureCount++;
    circuitBreaker.lastFailure = new Date();

    if (circuitBreaker.failureCount >= this.CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
      circuitBreaker.isOpen = true;
      console.warn(`🚨 Circuit breaker opened for ${serviceName} after ${circuitBreaker.failureCount} failures`);
    }
  }

  /**
   * Determine if operation should be retried
   */
  private shouldRetry(error: Error, strategy: ErrorRecoveryStrategy): boolean {
    if (strategy.type !== 'RETRY') return false;
    
    // Don't retry certain types of errors
    const nonRetryableErrors = [
      'invalid_request',
      'authentication',
      'authorization',
      'constraint',
      'validation'
    ];
    
    return !nonRetryableErrors.some(errorType => 
      error.message.toLowerCase().includes(errorType)
    );
  }

  /**
   * Calculate backoff time for retries
   */
  private calculateBackoff(attempt: number, baseBackoffMs = 1000): number {
    // Exponential backoff with jitter
    const exponentialBackoff = Math.pow(2, attempt - 1) * baseBackoffMs;
    const jitter = Math.random() * 0.1 * exponentialBackoff;
    return Math.min(exponentialBackoff + jitter, 30000); // Max 30 seconds
  }

  /**
   * Apply recovery strategy
   */
  private applyRecoveryStrategy<T>(
    error: Error,
    context: ErrorContext,
    strategy: ErrorRecoveryStrategy,
    attempts: number,
    totalTime: number
  ): ErrorHandlingResult<T> {
    console.log(`🛡️ Applying recovery strategy: ${strategy.type} - ${strategy.description}`);

    switch (strategy.type) {
      case 'FALLBACK':
        return {
          success: true,
          data: strategy.fallbackValue,
          error,
          recoveryUsed: strategy,
          attempts,
          totalTime
        };

      case 'SKIP':
        return {
          success: true,
          data: undefined,
          error,
          recoveryUsed: strategy,
          attempts,
          totalTime
        };

      case 'FAIL':
      default:
        return {
          success: false,
          error,
          recoveryUsed: strategy,
          attempts,
          totalTime
        };
    }
  }

  /**
   * Determine AI service fallback strategy
   */
  private determineAIServiceFallbackStrategy<T>(
    serviceName: string,
    error: Error,
    fallbackValue?: T
  ): ErrorRecoveryStrategy {
    switch (serviceName) {
      case 'Context Analysis':
        return {
          type: 'FALLBACK',
          description: 'Use basic demographic analysis',
          fallbackValue: fallbackValue || this.generateBasicContextAnalysis()
        };

      case 'Rationale Diversification':
        return {
          type: 'FALLBACK',
          description: 'Use standard rationale generation',
          fallbackValue: fallbackValue || 'Standard location analysis applied'
        };

      case 'Expansion Intensity':
        return {
          type: 'FALLBACK',
          description: 'Use deterministic intensity selection',
          fallbackValue: fallbackValue || { selectedLocations: [], selectionReasoning: 'Deterministic selection used' }
        };

      case 'Placement Intelligence':
        return {
          type: 'FALLBACK',
          description: 'Use basic viability scoring',
          fallbackValue: fallbackValue || this.generateBasicViabilityScore()
        };

      default:
        return {
          type: 'FAIL',
          description: 'Unknown service - cannot provide fallback'
        };
    }
  }

  /**
   * Generate fallback AI response
   */
  private generateFallbackAIResponse(operation: string): any {
    switch (operation) {
      case 'rationale_generation':
        return 'Location selected based on population density, proximity to existing stores, and local market factors.';
      
      case 'viability_analysis':
        return {
          viabilityAssessment: 'Basic viability analysis completed',
          numericScores: { viability: 0.7, competition: 0.6, accessibility: 0.7, marketPotential: 0.7 }
        };
      
      case 'pattern_detection':
        return {
          patternDetection: 'Pattern analysis unavailable - using fallback',
          geometricIssues: []
        };
      
      default:
        return { message: 'Fallback response - AI analysis unavailable' };
    }
  }

  /**
   * Generate basic context analysis fallback
   */
  private generateBasicContextAnalysis(): any {
    return {
      marketAssessment: 'Basic market analysis - detailed AI assessment unavailable',
      competitiveAdvantages: ['Location accessibility', 'Population density'],
      riskFactors: ['Market competition'],
      demographicInsights: 'Standard demographic profile',
      accessibilityAnalysis: 'Basic accessibility assessment',
      uniqueSellingPoints: ['Strategic location'],
      confidenceScore: 0.6
    };
  }

  /**
   * Generate basic viability score fallback
   */
  private generateBasicViabilityScore(): any {
    return {
      viabilityAssessment: 'Basic viability assessment - detailed AI analysis unavailable',
      competitiveAnalysis: 'Standard competitive analysis',
      accessibilityInsights: 'Basic accessibility evaluation',
      marketPotentialAnalysis: 'Standard market potential assessment',
      riskAssessment: ['Limited analysis available'],
      aiConfidenceReasoning: 'Fallback analysis used',
      numericScores: {
        viability: 0.7,
        competition: 0.6,
        accessibility: 0.7,
        marketPotential: 0.7
      }
    };
  }

  /**
   * Determine service status based on health metrics
   */
  private determineServiceStatus(health: ServiceHealthStatus): 'OPERATIONAL' | 'DEGRADED' | 'FAILING' | 'DOWN' {
    if (health.successRate >= 0.95) return 'OPERATIONAL';
    if (health.successRate >= 0.8) return 'DEGRADED';
    if (health.successRate >= 0.5) return 'FAILING';
    return 'DOWN';
  }

  /**
   * Sleep utility for backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}