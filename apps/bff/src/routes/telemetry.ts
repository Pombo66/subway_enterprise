import { Body, Controller, Post, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateTelemetryEventDto } from '../dto/telemetry.dto';

@Controller()
export class TelemetryController {
  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  @Post('/telemetry')
  @HttpCode(HttpStatus.CREATED)
  async createEvent(@Body() body: CreateTelemetryEventDto) {
    // Basic validation
    if (!body.eventType || typeof body.eventType !== 'string' || !body.eventType.trim()) {
      return { 
        ok: false, 
        error: 'eventType is required and must be a non-empty string' 
      };
    }

    try {
      const event = await this.prisma.telemetryEvent.create({
        data: {
          eventType: body.eventType.trim(),
          userId: body.userId,
          sessionId: body.sessionId,
          properties: body.properties,
          timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
        },
        select: {
          id: true,
          eventType: true,
          timestamp: true,
        },
      });

      return { ok: true, event };
    } catch (error) {
      return { 
        ok: false, 
        error: 'Failed to create telemetry event',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}