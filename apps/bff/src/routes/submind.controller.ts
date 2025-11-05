import { 
  Body, 
  Controller, 
  Post, 
  HttpCode, 
  HttpStatus, 
  BadRequestException, 
  ServiceUnavailableException,
  InternalServerErrorException,
  Req,
  Logger,
  HttpException,
} from '@nestjs/common';
import { Request } from 'express';
import { SubMindService } from '../services/submind.service';
import { SubMindRateLimitService } from '../services/submind.rate-limit';
import { SubMindTelemetryService } from '../services/submind-telemetry.service';
import { SubMindQueryDto, SubMindResponseDto, SubMindErrorDto } from '../dto/submind.dto';
import { SubMindSecurityUtil } from '../util/submind-security.util';

@Controller()
export class SubMindController {
  private readonly logger = new Logger(SubMindController.name);

  constructor(
    private readonly subMindService: SubMindService,
    private readonly rateLimitService: SubMindRateLimitService,
    private readonly telemetryService: SubMindTelemetryService,
  ) {}

  @Post('/ai/submind/query')
  @HttpCode(HttpStatus.OK)
  async query(@Body() body: SubMindQueryDto, @Req() req: Request): Promise<SubMindResponseDto | SubMindErrorDto> {
    const startTime = Date.now();
    
    try {
      // Check if service is enabled
      if (!this.subMindService.isServiceEnabled()) {
        throw new ServiceUnavailableException({
          error: 'AI disabled - missing API key',
          code: 'AI_DISABLED',
        });
      }

      // Get client IP for rate limiting
      const clientIp = this.getClientIp(req);
      
      // Check rate limit
      const rateLimitResult = this.rateLimitService.checkRateLimit(clientIp);
      if (!rateLimitResult.allowed) {
        // Emit rate limit telemetry
        await this.telemetryService.emitRateLimitEvent(clientIp);
        
        const retryAfterSeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
        throw new HttpException({
          error: 'rate_limited',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: retryAfterSeconds,
        }, HttpStatus.TOO_MANY_REQUESTS);
      }

      // Validate input
      this.validateQueryInput(body);

      // Process the query
      const response = await this.subMindService.processQuery(body);
      
      // Emit successful query telemetry
      await this.telemetryService.emitQueryEvent(
        body,
        response,
        Date.now() - startTime,
        clientIp,
      );

      return response;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.logger.error(`SubMind query failed after ${latencyMs}ms:`, error);

      // Emit error telemetry
      let errorType = 'UNKNOWN_ERROR';
      if (error instanceof ServiceUnavailableException) {
        errorType = 'AI_DISABLED';
      } else if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        errorType = 'RATE_LIMITED';
      } else if (error instanceof BadRequestException) {
        errorType = 'VALIDATION_ERROR';
      } else if (error instanceof Error && error.message.includes('AI processing failed')) {
        errorType = 'AI_SERVICE_ERROR';
      }

      await this.telemetryService.emitErrorEvent(
        errorType,
        body,
        latencyMs,
        this.getClientIp(req),
      );

      if (error instanceof ServiceUnavailableException || 
          error instanceof HttpException || 
          error instanceof BadRequestException) {
        throw error;
      }

      // Handle service errors
      if (error instanceof Error && error.message.includes('AI disabled')) {
        throw new ServiceUnavailableException({
          error: 'AI disabled - missing API key',
          code: 'AI_DISABLED',
        });
      }

      if (error instanceof Error && error.message.includes('AI processing failed')) {
        throw new InternalServerErrorException({
          error: 'AI service temporarily unavailable',
          code: 'AI_SERVICE_ERROR',
        });
      }

      // Generic error
      throw new InternalServerErrorException({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  private validateQueryInput(body: SubMindQueryDto): void {
    if (!body.prompt || typeof body.prompt !== 'string') {
      throw new BadRequestException({
        error: 'prompt is required and must be a string',
        code: 'INVALID_PROMPT',
      });
    }

    if (body.prompt.trim().length === 0) {
      throw new BadRequestException({
        error: 'prompt cannot be empty',
        code: 'EMPTY_PROMPT',
      });
    }

    if (body.prompt.length > 4000) {
      throw new BadRequestException({
        error: 'prompt exceeds maximum length of 4000 characters',
        code: 'PROMPT_TOO_LONG',
      });
    }

    // Validate context if provided
    if (body.context) {
      if (body.context.screen && typeof body.context.screen !== 'string') {
        throw new BadRequestException({
          error: 'context.screen must be a string',
          code: 'INVALID_CONTEXT',
        });
      }

      if (body.context.scope) {
        const scope = body.context.scope;
        const stringFields = ['region', 'country', 'storeId', 'franchiseeId'];
        
        for (const field of stringFields) {
          const fieldValue = scope[field as keyof typeof scope];
          if (fieldValue && typeof fieldValue !== 'string') {
            throw new BadRequestException({
              error: `context.scope.${field} must be a string`,
              code: 'INVALID_SCOPE',
            });
          }
        }
      }
    }
  }

  private getClientIp(req: Request): string {
    // Use security utility for safe IP extraction
    const ipFromHeaders = SubMindSecurityUtil.extractClientIp(req.headers);
    if (ipFromHeaders !== 'unknown') {
      return ipFromHeaders;
    }

    // Fall back to connection remote address
    const connectionIp = req.connection.remoteAddress || req.socket.remoteAddress;
    if (connectionIp && SubMindSecurityUtil.isValidIp(connectionIp)) {
      return connectionIp;
    }

    return 'unknown';
  }

  @Post('/ai/submind/expansion')
  @HttpCode(HttpStatus.OK)
  async expansionAnalysis(
    @Body() body: { region: string; reasons: string[] }, 
    @Req() req: Request
  ): Promise<SubMindResponseDto | SubMindErrorDto> {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!body.region || typeof body.region !== 'string') {
        throw new BadRequestException({
          error: 'region is required and must be a string',
          code: 'INVALID_REGION',
        });
      }

      if (!body.reasons || !Array.isArray(body.reasons)) {
        throw new BadRequestException({
          error: 'reasons must be an array',
          code: 'INVALID_REASONS',
        });
      }

      // Get client IP for rate limiting
      const clientIp = this.getClientIp(req);
      
      // Check rate limit
      const rateLimitResult = this.rateLimitService.checkRateLimit(clientIp);
      if (!rateLimitResult.allowed) {
        await this.telemetryService.emitRateLimitEvent(clientIp);
        
        const retryAfterSeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
        throw new HttpException({
          error: 'rate_limited',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: retryAfterSeconds,
        }, HttpStatus.TOO_MANY_REQUESTS);
      }

      // Process expansion analysis
      const response = await this.subMindService.processExpansionAnalysis(body.region, body.reasons);
      
      // Emit telemetry
      await this.telemetryService.emitQueryEvent(
        {
          prompt: `Expansion analysis for ${body.region}`,
          context: {
            screen: 'expansion',
            scope: { region: body.region },
            selection: { reasons: body.reasons }
          }
        },
        response,
        Date.now() - startTime,
        clientIp,
      );

      return response;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.logger.error(`Expansion analysis failed after ${latencyMs}ms:`, error);

      // Handle known errors
      if (error instanceof HttpException || error instanceof BadRequestException) {
        throw error;
      }

      // Generic error
      throw new InternalServerErrorException({
        error: 'Expansion analysis failed',
        code: 'EXPANSION_ANALYSIS_ERROR',
      });
    }
  }

}