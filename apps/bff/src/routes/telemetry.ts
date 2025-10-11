import { Body, Controller, Post, Get, Param, Inject, HttpCode, HttpStatus, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateTelemetryEventDto } from '../dto/telemetry.dto';

@Controller()
export class TelemetryController {
  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  @Post('/telemetry')
  @HttpCode(HttpStatus.OK)
  async createEvent(@Body() body: CreateTelemetryEventDto) {
    // Basic validation
    if (!body.eventType || typeof body.eventType !== 'string' || !body.eventType.trim()) {
      throw new BadRequestException({ 
        success: false, 
        error: 'eventType is required and must be a non-empty string - validation failed' 
      });
    }

    try {
      await this.prisma.telemetryEvent.create({
        data: {
          eventType: body.eventType.trim(),
          userId: body.userId,
          sessionId: body.sessionId,
          properties: body.properties ? JSON.stringify(body.properties) : null,
          timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: 'Failed to record telemetry event'
      };
    }
  }

  @Get('/feature-flags')
  async getFeatureFlags() {
    try {
      const flags = await this.prisma.featureFlag.findMany();
      return flags;
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }

  @Get('/feature-flags/:key')
  async getFeatureFlag(@Param('key') key: string) {
    try {
      const flag = await this.prisma.featureFlag.findUnique({
        where: { key },
      });
      return flag || null;
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }
}