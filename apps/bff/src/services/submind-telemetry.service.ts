import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SubMindQueryDto, SubMindResponseDto } from '../dto/submind.dto';

export interface SubMindTelemetryEvent {
  eventType: 'ai.submind.query' | 'ai.submind.rate_limited' | 'ai.submind.error';
  userId?: string;
  sessionId?: string;
  properties: {
    screen?: string;
    scope?: {
      region?: string;
      country?: string;
      storeId?: string;
      franchiseeId?: string;
    };
    latencyMs?: number;
    model?: string;
    tokens?: number;
    errorType?: string;
    clientIp?: string;
    payloadSize?: number;
    timestamp: string;
  };
}

@Injectable()
export class SubMindTelemetryService {
  private readonly logger = new Logger(SubMindTelemetryService.name);
  private sampleCounter = 0;
  private readonly sampleRate = 5; // Sample 1 in 5 requests for payload size

  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  async emitQueryEvent(
    query: SubMindQueryDto,
    response: SubMindResponseDto,
    latencyMs: number,
    clientIp?: string,
    userId?: string,
    sessionId?: string,
  ): Promise<void> {
    try {
      const event: SubMindTelemetryEvent = {
        eventType: 'ai.submind.query',
        userId,
        sessionId,
        properties: {
          screen: query.context?.screen,
          scope: query.context?.scope,
          latencyMs,
          model: 'gpt-5-mini', // Current model being used
          tokens: response.meta?.tokens,
          clientIp: this.hashIp(clientIp),
          timestamp: new Date().toISOString(),
        },
      };

      // Add payload size sampling (1 in 5 requests)
      this.sampleCounter++;
      if (this.sampleCounter % this.sampleRate === 0) {
        event.properties.payloadSize = this.calculatePayloadSize(query, response);
      }

      await this.storeTelemetryEvent(event);
      
      this.logger.debug(`SubMind telemetry event emitted: ${event.eventType}`);
    } catch (error) {
      // Never let telemetry errors break the main flow
      this.logger.error('Failed to emit SubMind telemetry event:', error);
    }
  }

  async emitRateLimitEvent(
    clientIp?: string,
    userId?: string,
    sessionId?: string,
  ): Promise<void> {
    try {
      const event: SubMindTelemetryEvent = {
        eventType: 'ai.submind.rate_limited',
        userId,
        sessionId,
        properties: {
          clientIp: this.hashIp(clientIp),
          timestamp: new Date().toISOString(),
        },
      };

      await this.storeTelemetryEvent(event);
      
      this.logger.debug('SubMind rate limit telemetry event emitted');
    } catch (error) {
      this.logger.error('Failed to emit SubMind rate limit telemetry event:', error);
    }
  }

  async emitErrorEvent(
    errorType: string,
    query?: SubMindQueryDto,
    latencyMs?: number,
    clientIp?: string,
    userId?: string,
    sessionId?: string,
  ): Promise<void> {
    try {
      const event: SubMindTelemetryEvent = {
        eventType: 'ai.submind.error',
        userId,
        sessionId,
        properties: {
          screen: query?.context?.screen,
          scope: query?.context?.scope,
          latencyMs,
          errorType,
          clientIp: this.hashIp(clientIp),
          timestamp: new Date().toISOString(),
        },
      };

      await this.storeTelemetryEvent(event);
      
      this.logger.debug(`SubMind error telemetry event emitted: ${errorType}`);
    } catch (error) {
      this.logger.error('Failed to emit SubMind error telemetry event:', error);
    }
  }

  private async storeTelemetryEvent(event: SubMindTelemetryEvent): Promise<void> {
    await this.prisma.telemetryEvent.create({
      data: {
        eventType: event.eventType,
        userId: event.userId,
        sessionId: event.sessionId,
        properties: JSON.stringify(event.properties),
        timestamp: new Date(),
      },
    });
  }

  private calculatePayloadSize(query: SubMindQueryDto, response: SubMindResponseDto): number {
    try {
      const querySize = JSON.stringify(query).length;
      const responseSize = JSON.stringify(response).length;
      return querySize + responseSize;
    } catch (error) {
      this.logger.warn('Failed to calculate payload size:', error);
      return 0;
    }
  }

  private hashIp(ip?: string): string {
    if (!ip || ip === 'unknown') {
      return 'unknown';
    }

    // Simple hash for IP anonymization
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 8);
  }

  /**
   * Get telemetry statistics for monitoring
   */
  async getStats(timeRangeHours: number = 24): Promise<{
    totalQueries: number;
    averageLatency: number;
    totalTokens: number;
    errorRate: number;
    rateLimitHits: number;
  }> {
    try {
      const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);

      const events = await this.prisma.telemetryEvent.findMany({
        where: {
          eventType: {
            in: ['ai.submind.query', 'ai.submind.error', 'ai.submind.rate_limited'],
          },
          timestamp: {
            gte: since,
          },
        },
      });

      const queryEvents = events.filter(e => e.eventType === 'ai.submind.query');
      const errorEvents = events.filter(e => e.eventType === 'ai.submind.error');
      const rateLimitEvents = events.filter(e => e.eventType === 'ai.submind.rate_limited');

      const totalQueries = queryEvents.length;
      const totalErrors = errorEvents.length;
      const rateLimitHits = rateLimitEvents.length;

      let totalLatency = 0;
      let totalTokens = 0;

      for (const event of queryEvents) {
        try {
          const properties = JSON.parse(event.properties || '{}');
          if (properties.latencyMs) {
            totalLatency += properties.latencyMs;
          }
          if (properties.tokens) {
            totalTokens += properties.tokens;
          }
        } catch (error) {
          // Skip malformed properties
        }
      }

      const averageLatency = totalQueries > 0 ? totalLatency / totalQueries : 0;
      const errorRate = totalQueries > 0 ? totalErrors / totalQueries : 0;

      return {
        totalQueries,
        averageLatency,
        totalTokens,
        errorRate,
        rateLimitHits,
      };
    } catch (error) {
      this.logger.error('Failed to get telemetry stats:', error);
      return {
        totalQueries: 0,
        averageLatency: 0,
        totalTokens: 0,
        errorRate: 0,
        rateLimitHits: 0,
      };
    }
  }
}