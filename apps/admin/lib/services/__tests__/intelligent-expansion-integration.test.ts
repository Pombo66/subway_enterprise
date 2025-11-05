/**
 * Integration tests for Intelligent Expansion System
 * Tests the complete AI-enhanced expansion pipeline
 */

import { PrismaClient } from '@prisma/client';
import { ExpansionGenerationService } from '../expansion-generation.service';
import { IntelligentExpansionMonitoringService } from '../../monitoring/intelligent-expansion-monitoring.service';
import { IntelligentExpansionErrorHandler } from '../error-handling/intelligent-expansion-error-handler.service';

// Mock Prisma for testing
const mockPrisma = {
  store: {
    findMany: jest.fn().mockResolvedValue([
      {
        id: 'test-store-1',
        latitude: 52.5200,
        longitude: 13.4050,
        state: 'Berlin',
        country: 'Germany'
      }
    ])
  },
  openAIContextCache: {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({})
  },
  openAIRationaleCache: {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({})
  },
  openAIStrategyCache: {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({})
  }
} as unknown as PrismaClient;

describe('Intelligent Expansion Integration Tests', () => {
  let expansionService: ExpansionGenerationService;
  let monitoringService: IntelligentExpansionMonitoringService;
  let errorHandler: IntelligentExpansionErrorHandler;

  beforeEach(() => {
    // Reset services
    monitoringService = IntelligentExpansionMonitoringService.getInstance();
    monitoringService.reset();
    
    errorHandler = IntelligentExpansionErrorHandler.getInstance();
    errorHandler.reset();
    
    expansionService = new ExpansionGenerationService(mockPrisma);
    
    // Mock environment variables
    process.env.OPENAI_API_KEY = 'mock-api-key';
    process.env.EXPANSION_ENABLE_ENHANCED_AI = 'false'; // Disable for testing
    process.env.EXPANSION_ENABLE_INTENSITY_SCALING = 'false'; // Disable for testing
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Expansion Generation', () => {
    it('should generate expansion suggestions successfully', async () => {
      const params = {
        region: { country: 'Germany' },
        aggression: 50,
        populationBias: 0.5,
        proximityBias: 0.5,
        turnoverBias: 0.5,
        minDistanceM: 1000,
        seed: 12345,
        targetCount: 10,
        enableMapboxFiltering: false,
        enableAIRationale: false
      };

      const result = await expansionService.generate(params);

      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.seed).toBe(12345);
      expect(result.metadata.generationTimeMs).toBeGreaterThan(0);
    }, 30000); // 30 second timeout for integration test
  });

  describe('Performance Monitoring', () => {
    it('should record performance metrics', () => {
      const metrics = {
        totalGenerationTime: 5000,
        candidatesAnalyzed: 100,
        candidatesPerSecond: 20,
        memoryUsageMB: 256,
        aiServicesMetrics: [
          {
            serviceName: 'Test Service',
            apiCalls: 5,
            cacheHits: 3,
            cacheMisses: 2,
            totalTokensUsed: 1000,
            averageResponseTime: 1000,
            errorCount: 0,
            successRate: 1.0
          }
        ]
      };

      monitoringService.recordExpansionPerformance(metrics);
      
      const dashboard = monitoringService.generatePerformanceDashboard();
      
      expect(dashboard).toBeDefined();
      expect(dashboard.totalApiCalls).toBe(5);
      expect(dashboard.totalTokensUsed).toBe(1000);
      expect(dashboard.overallHealth).toBeDefined();
    });

    it('should generate performance alerts for poor metrics', () => {
      const mockService = {
        getCacheStats: () => ({
          apiCalls: 10,
          cacheHits: 1,
          cacheMisses: 9,
          totalTokensUsed: 5000,
          hitRate: 10 // Low hit rate
        })
      };

      const alerts = monitoringService.monitorAIServicePerformance(
        mockService,
        mockService,
        mockService,
        mockService
      );

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.metric === 'cache_hit_rate')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle AI service errors gracefully', async () => {
      const testError = new Error('Test AI service error');
      
      const result = await errorHandler.handleAIServiceError(
        'Test Service',
        'testOperation',
        testError,
        'fallback value'
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBe(testError);
      expect(result.recoveryUsed).toBeDefined();
    });

    it('should track service health status', () => {
      const testError = new Error('Test error');
      
      // Record some errors
      errorHandler.handleAIServiceError('Test Service', 'operation1', testError);
      errorHandler.handleAIServiceError('Test Service', 'operation2', testError);
      
      const health = errorHandler.getServiceHealth('Test Service') as any;
      
      expect(health).toBeDefined();
      expect(health.service).toBe('Test Service');
      expect(health.errorCount).toBeGreaterThan(0);
      expect(health.healthy).toBe(false);
    });

    it('should implement circuit breaker pattern', async () => {
      const testError = new Error('Repeated failure');
      
      // Trigger multiple failures to open circuit breaker
      for (let i = 0; i < 6; i++) {
        await errorHandler.handleAIServiceError('Failing Service', 'operation', testError);
      }
      
      const stats = errorHandler.getErrorStatistics();
      expect(stats.circuitBreakerStatus['Failing Service']).toBe(true);
    });
  });

  describe('Service Integration', () => {
    it('should integrate monitoring and error handling in expansion generation', async () => {
      // Mock a service failure scenario
      const originalConsoleError = console.error;
      console.error = jest.fn(); // Suppress error logs for test
      
      try {
        const params = {
          region: { country: 'InvalidCountry' }, // This should cause some issues
          aggression: 50,
          populationBias: 0.5,
          proximityBias: 0.5,
          turnoverBias: 0.5,
          minDistanceM: 1000,
          seed: 12345,
          targetCount: 5,
          enableMapboxFiltering: false,
          enableAIRationale: false
        };

        const result = await expansionService.generate(params);
        
        // Should still return a result even with errors
        expect(result).toBeDefined();
        expect(result.metadata).toBeDefined();
        
        // Check if performance monitoring was recorded
        const dashboard = monitoringService.generatePerformanceDashboard();
        expect(dashboard).toBeDefined();
        
      } finally {
        console.error = originalConsoleError;
      }
    }, 30000);
  });

  describe('Configuration Validation', () => {
    it('should handle missing OpenAI API key gracefully', async () => {
      delete process.env.OPENAI_API_KEY;
      
      const params = {
        region: { country: 'Germany' },
        aggression: 50,
        populationBias: 0.5,
        proximityBias: 0.5,
        turnoverBias: 0.5,
        minDistanceM: 1000,
        seed: 12345,
        targetCount: 5,
        enableMapboxFiltering: false,
        enableAIRationale: true // This should fail gracefully
      };

      const result = await expansionService.generate(params);
      
      // Should still return a result with fallback behavior
      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
    }, 30000);
  });

  describe('Data Structure Validation', () => {
    it('should return properly structured expansion suggestions', async () => {
      const params = {
        region: { country: 'Germany' },
        aggression: 30,
        populationBias: 0.5,
        proximityBias: 0.5,
        turnoverBias: 0.5,
        minDistanceM: 1000,
        seed: 12345,
        targetCount: 3,
        enableMapboxFiltering: false,
        enableAIRationale: false
      };

      const result = await expansionService.generate(params);
      
      expect(result.suggestions).toBeInstanceOf(Array);
      
      if (result.suggestions.length > 0) {
        const suggestion = result.suggestions[0];
        
        // Check required fields
        expect(typeof suggestion.lat).toBe('number');
        expect(typeof suggestion.lng).toBe('number');
        expect(typeof suggestion.confidence).toBe('number');
        expect(suggestion.rationale).toBeDefined();
        expect(typeof suggestion.rationaleText).toBe('string');
        expect(suggestion.band).toBeDefined();
      }
    }, 30000);
  });
});

describe('Monitoring Service Unit Tests', () => {
  let monitoringService: IntelligentExpansionMonitoringService;

  beforeEach(() => {
    monitoringService = IntelligentExpansionMonitoringService.getInstance();
    monitoringService.reset();
  });

  it('should calculate timing metrics correctly', () => {
    const metrics1 = {
      totalGenerationTime: 5000,
      candidatesAnalyzed: 100,
      candidatesPerSecond: 20,
      memoryUsageMB: 256,
      aiServicesMetrics: [],
      intensityOptimizationTime: 1000,
      qualityValidationTime: 500
    };

    const metrics2 = {
      totalGenerationTime: 3000,
      candidatesAnalyzed: 50,
      candidatesPerSecond: 16.7,
      memoryUsageMB: 200,
      aiServicesMetrics: [],
      intensityOptimizationTime: 800,
      qualityValidationTime: 300
    };

    monitoringService.recordExpansionPerformance(metrics1);
    monitoringService.recordExpansionPerformance(metrics2);

    const timingMetrics = monitoringService.getTimingMetrics();

    expect(timingMetrics.averageGenerationTime).toBe(4000);
    expect(timingMetrics.averageIntensityOptimizationTime).toBe(900);
    expect(timingMetrics.averageQualityValidationTime).toBe(400);
  });
});

describe('Error Handler Unit Tests', () => {
  let errorHandler: IntelligentExpansionErrorHandler;

  beforeEach(() => {
    errorHandler = IntelligentExpansionErrorHandler.getInstance();
    errorHandler.reset();
  });

  it('should execute operations with retry logic', async () => {
    let attempts = 0;
    const operation = jest.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary failure');
      }
      return Promise.resolve('success');
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
        backoffMs: 100
      }
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(3);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should apply fallback strategies correctly', async () => {
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
});