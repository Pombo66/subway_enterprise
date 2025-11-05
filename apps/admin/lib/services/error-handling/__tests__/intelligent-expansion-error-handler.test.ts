/**
 * Unit tests for Intelligent Expansion Error Handler Service
 */

import { IntelligentExpansionErrorHandler } from '../intelligent-expansion-error-handler.service';

describe('IntelligentExpansionErrorHandler', () => {
  let errorHandler: IntelligentExpansionErrorHandler;

  beforeEach(() => {
    errorHandler = IntelligentExpansionErrorHandler.getInstance();
    errorHandler.reset();
  });

  describe('Error Handling Execution', () => {
    it('should execute successful operations', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          service: 'Test Service',
          operation: 'testOp',
          timestamp: new Date()
        },
        {
          type: 'RETRY',
          description: 'Test retry strategy',
          maxAttempts: 3
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry failed operations', async () => {
      let attempts = 0;
      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve('success after retry');
      });

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          service: 'Test Service',
          operation: 'testOp',
          timestamp: new Date()
        },
        {
          type: 'RETRY',
          description: 'Retry on failure',
          maxAttempts: 3,
          backoffMs: 10 // Short backoff for testing
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('success after retry');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should apply fallback strategy when retries fail', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          service: 'Test Service',
          operation: 'testOp',
          timestamp: new Date()
        },
        {
          type: 'FALLBACK',
          description: 'Use fallback value',
          fallbackValue: 'fallback result'
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('fallback result');
      expect(result.recoveryUsed?.type).toBe('FALLBACK');
    });

    it('should fail when strategy is FAIL', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Critical error'));

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          service: 'Test Service',
          operation: 'testOp',
          timestamp: new Date()
        },
        {
          type: 'FAIL',
          description: 'Cannot recover from this error'
        }
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Critical error');
      expect(result.recoveryUsed?.type).toBe('FAIL');
    });
  });

  describe('AI Service Error Handling', () => {
    it('should handle Context Analysis service errors', async () => {
      const error = new Error('Context analysis failed');

      const result = await errorHandler.handleAIServiceError(
        'Context Analysis',
        'analyzeLocation',
        error
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.recoveryUsed?.type).toBe('FALLBACK');
      expect(result.recoveryUsed?.description).toContain('basic demographic analysis');
    });

    it('should handle Rationale Diversification service errors', async () => {
      const error = new Error('Rationale generation failed');

      const result = await errorHandler.handleAIServiceError(
        'Rationale Diversification',
        'generateRationale',
        error,
        'Custom fallback rationale'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.recoveryUsed?.type).toBe('FALLBACK');
      expect(result.recoveryUsed?.fallbackValue).toBe('Custom fallback rationale');
    });

    it('should handle unknown service errors', async () => {
      const error = new Error('Unknown service error');

      const result = await errorHandler.handleAIServiceError(
        'Unknown Service',
        'unknownOperation',
        error
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.recoveryUsed?.type).toBe('FAIL');
      expect(result.recoveryUsed?.description).toContain('Unknown service');
    });
  });

  describe('OpenAI Error Handling', () => {
    it('should handle rate limit errors with retry', async () => {
      const rateLimitError = new Error('rate_limit exceeded');
      const retryOperation = jest.fn().mockResolvedValue('success after rate limit');

      const result = await errorHandler.handleOpenAIError(
        'generateRationale',
        rateLimitError,
        retryOperation
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('success after rate limit');
    });

    it('should handle timeout errors with retry', async () => {
      const timeoutError = new Error('Request timeout');
      let attempts = 0;
      const retryOperation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          throw timeoutError;
        }
        return Promise.resolve('success after timeout');
      });

      const result = await errorHandler.handleOpenAIError(
        'analyzeViability',
        timeoutError,
        retryOperation
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('success after timeout');
    });

    it('should not retry invalid request errors', async () => {
      const invalidError = new Error('invalid_request - malformed prompt');

      const result = await errorHandler.handleOpenAIError(
        'generateRationale',
        invalidError
      );

      expect(result.success).toBe(false);
      expect(result.recoveryUsed?.type).toBe('FAIL');
    });

    it('should provide fallback for unknown OpenAI errors', async () => {
      const unknownError = new Error('Unknown OpenAI error');

      const result = await errorHandler.handleOpenAIError(
        'rationale_generation',
        unknownError
      );

      expect(result.success).toBe(true);
      expect(result.recoveryUsed?.type).toBe('FALLBACK');
      expect(typeof result.recoveryUsed?.fallbackValue).toBe('string');
    });
  });

  describe('Database Error Handling', () => {
    it('should retry connection errors', async () => {
      const connectionError = new Error('Database connection failed');
      let attempts = 0;
      const retryOperation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          throw connectionError;
        }
        return Promise.resolve('database operation success');
      });

      const result = await errorHandler.handleDatabaseError(
        'findStores',
        connectionError,
        retryOperation
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('database operation success');
    });

    it('should not retry constraint violations', async () => {
      const constraintError = new Error('unique constraint violation');

      const result = await errorHandler.handleDatabaseError(
        'createRecord',
        constraintError
      );

      expect(result.success).toBe(false);
      expect(result.recoveryUsed?.type).toBe('FAIL');
    });

    it('should provide fallback for other database errors', async () => {
      const unknownError = new Error('Unknown database error');

      const result = await errorHandler.handleDatabaseError(
        'queryData',
        unknownError
      );

      expect(result.success).toBe(true);
      expect(result.recoveryUsed?.type).toBe('FALLBACK');
      expect(result.recoveryUsed?.fallbackValue).toBe(null);
    });
  });

  describe('Service Health Tracking', () => {
    it('should track service health status', async () => {
      const error = new Error('Service error');

      // Record some errors
      await errorHandler.handleAIServiceError('Test Service', 'operation1', error);
      await errorHandler.handleAIServiceError('Test Service', 'operation2', error);

      const health = errorHandler.getServiceHealth('Test Service') as any;

      expect(health.service).toBe('Test Service');
      expect(health.errorCount).toBe(2);
      expect(health.successCount).toBe(0);
      expect(health.successRate).toBe(0);
      expect(health.healthy).toBe(false);
      expect(health.status).toBe('DOWN');
    });

    it('should return all service health when no service specified', () => {
      const allHealth = errorHandler.getServiceHealth() as any[];

      expect(Array.isArray(allHealth)).toBe(true);
    });

    it('should return default health for unknown service', () => {
      const health = errorHandler.getServiceHealth('Unknown Service') as any;

      expect(health.service).toBe('Unknown Service');
      expect(health.healthy).toBe(true);
      expect(health.errorCount).toBe(0);
      expect(health.successCount).toBe(0);
      expect(health.successRate).toBe(1.0);
      expect(health.status).toBe('OPERATIONAL');
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after threshold failures', async () => {
      const error = new Error('Repeated failure');

      // Trigger failures to reach threshold (5 failures)
      for (let i = 0; i < 6; i++) {
        await errorHandler.handleAIServiceError('Failing Service', 'operation', error);
      }

      const stats = errorHandler.getErrorStatistics();
      expect(stats.circuitBreakerStatus['Failing Service']).toBe(true);

      // Try to execute operation - should fail immediately due to circuit breaker
      const operation = jest.fn().mockResolvedValue('should not execute');

      const result = await errorHandler.executeWithErrorHandling(
        operation,
        {
          service: 'Failing Service',
          operation: 'testOp',
          timestamp: new Date()
        },
        {
          type: 'RETRY',
          description: 'Should be blocked by circuit breaker'
        }
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Circuit breaker open');
      expect(operation).not.toHaveBeenCalled();
    });
  });

  describe('Error Statistics', () => {
    it('should provide comprehensive error statistics', async () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      await errorHandler.handleAIServiceError('Service A', 'op1', error1);
      await errorHandler.handleAIServiceError('Service A', 'op2', error2);
      await errorHandler.handleAIServiceError('Service B', 'op1', error1);

      const stats = errorHandler.getErrorStatistics();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByService['Service A']).toBe(2);
      expect(stats.errorsByService['Service B']).toBe(1);
      expect(stats.recentErrors.length).toBeGreaterThan(0);
      expect(stats.circuitBreakerStatus).toBeDefined();
    });
  });

  describe('Fallback Response Generation', () => {
    it('should generate appropriate fallback responses', async () => {
      const viabilityError = new Error('Viability analysis failed');
      const result = await errorHandler.handleOpenAIError('viability_analysis', viabilityError);

      expect(result.success).toBe(true);
      expect(result.recoveryUsed?.fallbackValue).toHaveProperty('viabilityAssessment');
      expect(result.recoveryUsed?.fallbackValue).toHaveProperty('numericScores');
    });

    it('should generate basic context analysis fallback', async () => {
      const contextError = new Error('Context analysis failed');
      const result = await errorHandler.handleAIServiceError('Context Analysis', 'analyze', contextError);

      expect(result.recoveryUsed?.fallbackValue).toHaveProperty('marketAssessment');
      expect(result.recoveryUsed?.fallbackValue).toHaveProperty('competitiveAdvantages');
      expect(result.recoveryUsed?.fallbackValue).toHaveProperty('confidenceScore');
    });
  });
});