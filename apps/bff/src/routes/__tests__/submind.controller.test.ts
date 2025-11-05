import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { SubMindController } from '../submind.controller';
import { SubMindService } from '../../services/submind.service';
import { SubMindRateLimitService } from '../../services/submind.rate-limit';
import { SubMindTelemetryService } from '../../services/submind-telemetry.service';
import { SubMindQueryDto } from '../../dto/submind.dto';

describe('SubMindController', () => {
  let controller: SubMindController;
  let subMindService: jest.Mocked<SubMindService>;
  let rateLimitService: jest.Mocked<SubMindRateLimitService>;
  let telemetryService: jest.Mocked<SubMindTelemetryService>;

  beforeEach(async () => {
    const mockSubMindService = {
      isServiceEnabled: jest.fn(),
      processQuery: jest.fn(),
    };

    const mockRateLimitService = {
      checkRateLimit: jest.fn(),
    };

    const mockTelemetryService = {
      emitQueryEvent: jest.fn(),
      emitRateLimitEvent: jest.fn(),
      emitErrorEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubMindController],
      providers: [
        {
          provide: SubMindService,
          useValue: mockSubMindService,
        },
        {
          provide: SubMindRateLimitService,
          useValue: mockRateLimitService,
        },
        {
          provide: SubMindTelemetryService,
          useValue: mockTelemetryService,
        },
      ],
    }).compile();

    controller = module.get<SubMindController>(SubMindController);
    subMindService = module.get(SubMindService);
    rateLimitService = module.get(SubMindRateLimitService);
    telemetryService = module.get(SubMindTelemetryService);
  });

  describe('query', () => {
    const mockRequest = {
      headers: {},
      connection: { remoteAddress: '192.168.1.1' },
      socket: { remoteAddress: '192.168.1.1' },
    } as any;

    it('should process query successfully', async () => {
      const queryDto: SubMindQueryDto = {
        prompt: 'What are the current KPIs?',
      };

      const mockResponse = {
        message: 'Here are the current KPIs...',
        meta: { tokens: 50, latencyMs: 1200 },
      };

      subMindService.isServiceEnabled.mockReturnValue(true);
      rateLimitService.checkRateLimit.mockReturnValue({
        allowed: true,
        remainingTokens: 9,
        resetTime: Date.now() + 60000,
      });
      subMindService.processQuery.mockResolvedValue(mockResponse);

      const result = await controller.query(queryDto, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(subMindService.processQuery).toHaveBeenCalledWith(queryDto);
      expect(telemetryService.emitQueryEvent).toHaveBeenCalledWith(
        queryDto,
        mockResponse,
        expect.any(Number),
        '192.168.1.1'
      );
    });

    it('should return 503 when service is disabled', async () => {
      const queryDto: SubMindQueryDto = {
        prompt: 'Test query',
      };

      subMindService.isServiceEnabled.mockReturnValue(false);

      await expect(controller.query(queryDto, mockRequest)).rejects.toMatchObject({
        response: {
          error: 'AI disabled - missing API key',
          code: 'AI_DISABLED',
        },
        status: HttpStatus.SERVICE_UNAVAILABLE,
      });

      expect(telemetryService.emitErrorEvent).toHaveBeenCalledWith(
        'AI_DISABLED',
        queryDto,
        expect.any(Number),
        '192.168.1.1'
      );
    });

    it('should return 429 when rate limited', async () => {
      const queryDto: SubMindQueryDto = {
        prompt: 'Test query',
      };

      subMindService.isServiceEnabled.mockReturnValue(true);
      rateLimitService.checkRateLimit.mockReturnValue({
        allowed: false,
        remainingTokens: 0,
        resetTime: Date.now() + 30000,
      });

      await expect(controller.query(queryDto, mockRequest)).rejects.toMatchObject({
        response: {
          error: 'rate_limited',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: expect.any(Number),
        },
        status: HttpStatus.TOO_MANY_REQUESTS,
      });

      expect(telemetryService.emitRateLimitEvent).toHaveBeenCalledWith('192.168.1.1');
    });

    it('should validate prompt input', async () => {
      const invalidQueries = [
        { prompt: '' },
        { prompt: '   ' },
        { prompt: null },
        { prompt: undefined },
        { prompt: 'A'.repeat(4001) }, // Too long
      ];

      subMindService.isServiceEnabled.mockReturnValue(true);
      rateLimitService.checkRateLimit.mockReturnValue({
        allowed: true,
        remainingTokens: 9,
        resetTime: Date.now() + 60000,
      });

      for (const query of invalidQueries) {
        await expect(controller.query(query as any, mockRequest)).rejects.toMatchObject({
          status: HttpStatus.BAD_REQUEST,
        });
      }
    });

    it('should validate context input', async () => {
      const invalidQueries = [
        {
          prompt: 'Valid prompt',
          context: {
            screen: 123, // Should be string
          },
        },
        {
          prompt: 'Valid prompt',
          context: {
            scope: {
              region: 123, // Should be string
            },
          },
        },
      ];

      subMindService.isServiceEnabled.mockReturnValue(true);
      rateLimitService.checkRateLimit.mockReturnValue({
        allowed: true,
        remainingTokens: 9,
        resetTime: Date.now() + 60000,
      });

      for (const query of invalidQueries) {
        await expect(controller.query(query as any, mockRequest)).rejects.toMatchObject({
          status: HttpStatus.BAD_REQUEST,
        });
      }
    });

    it('should extract client IP from headers', async () => {
      const queryDto: SubMindQueryDto = {
        prompt: 'Test query',
      };

      const requestWithHeaders = {
        headers: {
          'x-forwarded-for': '203.0.113.1, 192.168.1.1',
          'x-real-ip': '203.0.113.2',
        },
        connection: { remoteAddress: '192.168.1.1' },
        socket: { remoteAddress: '192.168.1.1' },
      } as any;

      subMindService.isServiceEnabled.mockReturnValue(true);
      rateLimitService.checkRateLimit.mockReturnValue({
        allowed: true,
        remainingTokens: 9,
        resetTime: Date.now() + 60000,
      });
      subMindService.processQuery.mockResolvedValue({
        message: 'Response',
        meta: { tokens: 10, latencyMs: 500 },
      });

      await controller.query(queryDto, requestWithHeaders);

      // Should use first IP from x-forwarded-for
      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith('203.0.113.1');
    });

    it('should handle service errors gracefully', async () => {
      const queryDto: SubMindQueryDto = {
        prompt: 'Test query',
      };

      subMindService.isServiceEnabled.mockReturnValue(true);
      rateLimitService.checkRateLimit.mockReturnValue({
        allowed: true,
        remainingTokens: 9,
        resetTime: Date.now() + 60000,
      });
      subMindService.processQuery.mockRejectedValue(new Error('AI processing failed: OpenAI error'));

      await expect(controller.query(queryDto, mockRequest)).rejects.toMatchObject({
        response: {
          error: 'AI service temporarily unavailable',
          code: 'AI_SERVICE_ERROR',
        },
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });

      expect(telemetryService.emitErrorEvent).toHaveBeenCalledWith(
        'AI_SERVICE_ERROR',
        queryDto,
        expect.any(Number),
        '192.168.1.1'
      );
    });

    it('should handle unknown errors', async () => {
      const queryDto: SubMindQueryDto = {
        prompt: 'Test query',
      };

      subMindService.isServiceEnabled.mockReturnValue(true);
      rateLimitService.checkRateLimit.mockReturnValue({
        allowed: true,
        remainingTokens: 9,
        resetTime: Date.now() + 60000,
      });
      subMindService.processQuery.mockRejectedValue(new Error('Unknown error'));

      await expect(controller.query(queryDto, mockRequest)).rejects.toMatchObject({
        response: {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });

      expect(telemetryService.emitErrorEvent).toHaveBeenCalledWith(
        'UNKNOWN_ERROR',
        queryDto,
        expect.any(Number),
        '192.168.1.1'
      );
    });

    it('should handle requests with context', async () => {
      const queryDto: SubMindQueryDto = {
        prompt: 'Explain the dashboard',
        context: {
          screen: 'dashboard',
          scope: {
            region: 'EMEA',
            country: 'UK',
          },
        },
      };

      const mockResponse = {
        message: 'Dashboard explanation...',
        meta: { tokens: 75, latencyMs: 1500 },
      };

      subMindService.isServiceEnabled.mockReturnValue(true);
      rateLimitService.checkRateLimit.mockReturnValue({
        allowed: true,
        remainingTokens: 8,
        resetTime: Date.now() + 60000,
      });
      subMindService.processQuery.mockResolvedValue(mockResponse);

      const result = await controller.query(queryDto, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(subMindService.processQuery).toHaveBeenCalledWith(queryDto);
    });
  });

  describe('IP extraction', () => {
    it('should handle missing headers gracefully', async () => {
      const queryDto: SubMindQueryDto = {
        prompt: 'Test query',
      };

      const requestWithoutHeaders = {
        headers: {},
        connection: {},
        socket: {},
      } as any;

      subMindService.isServiceEnabled.mockReturnValue(true);
      rateLimitService.checkRateLimit.mockReturnValue({
        allowed: true,
        remainingTokens: 9,
        resetTime: Date.now() + 60000,
      });
      subMindService.processQuery.mockResolvedValue({
        message: 'Response',
        meta: { tokens: 10, latencyMs: 500 },
      });

      await controller.query(queryDto, requestWithoutHeaders);

      // Should fall back to 'unknown'
      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith('unknown');
    });
  });
});