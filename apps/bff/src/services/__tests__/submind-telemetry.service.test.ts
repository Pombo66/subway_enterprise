import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { SubMindTelemetryService } from '../submind-telemetry.service';
import { SubMindQueryDto, SubMindResponseDto } from '../../dto/submind.dto';

describe('SubMindTelemetryService', () => {
  let service: SubMindTelemetryService;
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(async () => {
    const mockPrisma = {
      telemetryEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubMindTelemetryService,
        {
          provide: PrismaClient,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<SubMindTelemetryService>(SubMindTelemetryService);
    prisma = module.get(PrismaClient);
  });

  describe('emitQueryEvent', () => {
    it('should emit query event successfully', async () => {
      const query: SubMindQueryDto = {
        prompt: 'Test query',
        context: {
          screen: 'dashboard',
          scope: {
            region: 'EMEA',
            country: 'UK',
          },
        },
      };

      const response: SubMindResponseDto = {
        message: 'Test response',
        meta: {
          tokens: 50,
          latencyMs: 1200,
        },
      };

      prisma.telemetryEvent.create.mockResolvedValue({} as any);

      await service.emitQueryEvent(query, response, 1200, '192.168.1.1', 'user-123', 'session-456');

      expect(prisma.telemetryEvent.create).toHaveBeenCalledWith({
        data: {
          eventType: 'ai.submind.query',
          userId: 'user-123',
          sessionId: 'session-456',
          properties: JSON.stringify({
            screen: 'dashboard',
            scope: {
              region: 'EMEA',
              country: 'UK',
            },
            latencyMs: 1200,
            model: 'gpt-5-mini',
            tokens: 50,
            clientIp: expect.any(String), // Hashed IP
            timestamp: expect.any(String),
          }),
          timestamp: expect.any(Date),
        },
      });
    });

    it('should include payload size for sampled requests', async () => {
      const query: SubMindQueryDto = {
        prompt: 'Test query',
      };

      const response: SubMindResponseDto = {
        message: 'Test response',
      };

      prisma.telemetryEvent.create.mockResolvedValue({} as any);

      // Emit 5 events to trigger sampling (every 5th request)
      for (let i = 0; i < 5; i++) {
        await service.emitQueryEvent(query, response, 1000);
      }

      // Check the 5th call (should include payload size)
      const fifthCall = prisma.telemetryEvent.create.mock.calls[4];
      const properties = JSON.parse(fifthCall[0].data.properties);
      expect(properties.payloadSize).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      const query: SubMindQueryDto = {
        prompt: 'Test query',
      };

      const response: SubMindResponseDto = {
        message: 'Test response',
      };

      prisma.telemetryEvent.create.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(service.emitQueryEvent(query, response, 1000)).resolves.not.toThrow();
    });

    it('should hash IP addresses', async () => {
      const query: SubMindQueryDto = {
        prompt: 'Test query',
      };

      const response: SubMindResponseDto = {
        message: 'Test response',
      };

      prisma.telemetryEvent.create.mockResolvedValue({} as any);

      await service.emitQueryEvent(query, response, 1000, '192.168.1.1');

      const call = prisma.telemetryEvent.create.mock.calls[0];
      const properties = JSON.parse(call[0].data.properties);
      
      // IP should be hashed, not the original
      expect(properties.clientIp).not.toBe('192.168.1.1');
      expect(properties.clientIp).toHaveLength(8); // SHA256 substring
    });
  });

  describe('emitRateLimitEvent', () => {
    it('should emit rate limit event', async () => {
      prisma.telemetryEvent.create.mockResolvedValue({} as any);

      await service.emitRateLimitEvent('192.168.1.1', 'user-123', 'session-456');

      expect(prisma.telemetryEvent.create).toHaveBeenCalledWith({
        data: {
          eventType: 'ai.submind.rate_limited',
          userId: 'user-123',
          sessionId: 'session-456',
          properties: JSON.stringify({
            clientIp: expect.any(String),
            timestamp: expect.any(String),
          }),
          timestamp: expect.any(Date),
        },
      });
    });

    it('should handle errors gracefully', async () => {
      prisma.telemetryEvent.create.mockRejectedValue(new Error('Database error'));

      await expect(service.emitRateLimitEvent('192.168.1.1')).resolves.not.toThrow();
    });
  });

  describe('emitErrorEvent', () => {
    it('should emit error event with query context', async () => {
      const query: SubMindQueryDto = {
        prompt: 'Test query',
        context: {
          screen: 'dashboard',
        },
      };

      prisma.telemetryEvent.create.mockResolvedValue({} as any);

      await service.emitErrorEvent('AI_SERVICE_ERROR', query, 1500, '192.168.1.1', 'user-123');

      expect(prisma.telemetryEvent.create).toHaveBeenCalledWith({
        data: {
          eventType: 'ai.submind.error',
          userId: 'user-123',
          sessionId: undefined,
          properties: JSON.stringify({
            screen: 'dashboard',
            scope: undefined,
            latencyMs: 1500,
            errorType: 'AI_SERVICE_ERROR',
            clientIp: expect.any(String),
            timestamp: expect.any(String),
          }),
          timestamp: expect.any(Date),
        },
      });
    });

    it('should emit error event without query context', async () => {
      prisma.telemetryEvent.create.mockResolvedValue({} as any);

      await service.emitErrorEvent('RATE_LIMITED', undefined, undefined, '192.168.1.1');

      expect(prisma.telemetryEvent.create).toHaveBeenCalledWith({
        data: {
          eventType: 'ai.submind.error',
          userId: undefined,
          sessionId: undefined,
          properties: JSON.stringify({
            screen: undefined,
            scope: undefined,
            latencyMs: undefined,
            errorType: 'RATE_LIMITED',
            clientIp: expect.any(String),
            timestamp: expect.any(String),
          }),
          timestamp: expect.any(Date),
        },
      });
    });
  });

  describe('getStats', () => {
    it('should calculate statistics correctly', async () => {
      const mockEvents = [
        {
          eventType: 'ai.submind.query',
          properties: JSON.stringify({ latencyMs: 1000, tokens: 50 }),
        },
        {
          eventType: 'ai.submind.query',
          properties: JSON.stringify({ latencyMs: 2000, tokens: 75 }),
        },
        {
          eventType: 'ai.submind.error',
          properties: JSON.stringify({ errorType: 'VALIDATION_ERROR' }),
        },
        {
          eventType: 'ai.submind.rate_limited',
          properties: JSON.stringify({}),
        },
      ];

      prisma.telemetryEvent.findMany.mockResolvedValue(mockEvents as any);

      const stats = await service.getStats(24);

      expect(stats).toEqual({
        totalQueries: 2,
        averageLatency: 1500, // (1000 + 2000) / 2
        totalTokens: 125, // 50 + 75
        errorRate: 0.5, // 1 error / 2 queries
        rateLimitHits: 1,
      });

      expect(prisma.telemetryEvent.findMany).toHaveBeenCalledWith({
        where: {
          eventType: {
            in: ['ai.submind.query', 'ai.submind.error', 'ai.submind.rate_limited'],
          },
          timestamp: {
            gte: expect.any(Date),
          },
        },
      });
    });

    it('should handle empty results', async () => {
      prisma.telemetryEvent.findMany.mockResolvedValue([]);

      const stats = await service.getStats();

      expect(stats).toEqual({
        totalQueries: 0,
        averageLatency: 0,
        totalTokens: 0,
        errorRate: 0,
        rateLimitHits: 0,
      });
    });

    it('should handle malformed properties gracefully', async () => {
      const mockEvents = [
        {
          eventType: 'ai.submind.query',
          properties: 'invalid json',
        },
        {
          eventType: 'ai.submind.query',
          properties: JSON.stringify({ latencyMs: 1000, tokens: 50 }),
        },
      ];

      prisma.telemetryEvent.findMany.mockResolvedValue(mockEvents as any);

      const stats = await service.getStats();

      // Should only count the valid event
      expect(stats.totalQueries).toBe(1);
      expect(stats.averageLatency).toBe(1000);
      expect(stats.totalTokens).toBe(50);
    });

    it('should handle database errors', async () => {
      prisma.telemetryEvent.findMany.mockRejectedValue(new Error('Database error'));

      const stats = await service.getStats();

      expect(stats).toEqual({
        totalQueries: 0,
        averageLatency: 0,
        totalTokens: 0,
        errorRate: 0,
        rateLimitHits: 0,
      });
    });
  });

  describe('IP hashing', () => {
    it('should handle unknown IPs', async () => {
      const query: SubMindQueryDto = { prompt: 'Test' };
      const response: SubMindResponseDto = { message: 'Test' };

      prisma.telemetryEvent.create.mockResolvedValue({} as any);

      await service.emitQueryEvent(query, response, 1000, 'unknown');

      const call = prisma.telemetryEvent.create.mock.calls[0];
      const properties = JSON.parse(call[0].data.properties);
      
      expect(properties.clientIp).toBe('unknown');
    });

    it('should hash valid IPs consistently', async () => {
      const query: SubMindQueryDto = { prompt: 'Test' };
      const response: SubMindResponseDto = { message: 'Test' };

      prisma.telemetryEvent.create.mockResolvedValue({} as any);

      // Emit two events with same IP
      await service.emitQueryEvent(query, response, 1000, '192.168.1.1');
      await service.emitQueryEvent(query, response, 1000, '192.168.1.1');

      const call1 = prisma.telemetryEvent.create.mock.calls[0];
      const call2 = prisma.telemetryEvent.create.mock.calls[1];
      
      const properties1 = JSON.parse(call1[0].data.properties);
      const properties2 = JSON.parse(call2[0].data.properties);
      
      // Should hash to same value
      expect(properties1.clientIp).toBe(properties2.clientIp);
      expect(properties1.clientIp).not.toBe('192.168.1.1');
    });
  });
});