import { Controller, Post, Body, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { z } from 'zod';
import { 
  GooglePlacesNearbyService, 
  NearbyCompetitorsRequest,
  NearbyCompetitorsResponse 
} from '../services/competitive/google-places-nearby.service';

/**
 * Request validation schema
 */
const NearbyCompetitorsRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusKm: z.number().min(0.1).max(50).default(5),
  brands: z.array(z.string()).optional()
});

/**
 * Simple in-memory rate limiter
 */
class RateLimiter {
  private requests = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this key
    let timestamps = this.requests.get(key) || [];
    
    // Filter to only requests within the window
    timestamps = timestamps.filter(t => t > windowStart);
    
    // Check if under limit
    if (timestamps.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    timestamps.push(now);
    this.requests.set(key, timestamps);
    
    return true;
  }

  // Cleanup old entries periodically
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [key, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter(t => t > windowStart);
      if (valid.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, valid);
      }
    }
  }
}

/**
 * Competitors Nearby Controller
 * 
 * Provides on-demand competitor discovery via Google Places API.
 * 
 * POST /competitors/nearby
 * - Fetches competitors within radius of a location
 * - Rate limited to 10 requests per minute per session
 * - Returns results with summary statistics
 */
@Controller('competitors')
export class CompetitorsNearbyController {
  private readonly logger = new Logger(CompetitorsNearbyController.name);
  private readonly rateLimiter = new RateLimiter(60000, 10); // 10 requests per minute

  constructor(private readonly googlePlacesNearbyService: GooglePlacesNearbyService) {
    // Cleanup rate limiter every 5 minutes
    setInterval(() => this.rateLimiter.cleanup(), 5 * 60 * 1000);
  }

  /**
   * POST /competitors/nearby
   * 
   * Fetch nearby competitors for a location using Google Places API.
   * Results are cached for 30 minutes to reduce API costs.
   */
  @Post('nearby')
  async getNearbyCompetitors(
    @Body() body: unknown
  ): Promise<NearbyCompetitorsResponse> {
    // Validate request body
    const parseResult = NearbyCompetitorsRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      this.logger.warn('Invalid request body:', parseResult.error.errors);
      throw new HttpException(
        {
          message: 'Invalid request parameters',
          errors: parseResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const request: NearbyCompetitorsRequest = {
      lat: parseResult.data.lat,
      lng: parseResult.data.lng,
      radiusKm: parseResult.data.radiusKm ?? 5,
      brands: parseResult.data.brands
    };
    
    // Rate limiting - use a simple session key based on coordinates
    // In production, this would use actual session/user ID
    const rateLimitKey = `${Math.round(request.lat * 10)}:${Math.round(request.lng * 10)}`;
    
    if (!this.rateLimiter.isAllowed(rateLimitKey)) {
      this.logger.warn(`Rate limit exceeded for key: ${rateLimitKey}`);
      throw new HttpException(
        {
          message: 'Too many requests. Please wait a moment before trying again.',
          retryAfterSeconds: 60
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    try {
      this.logger.log(`Fetching nearby competitors: ${request.lat},${request.lng} radius ${request.radiusKm}km`);
      
      const response = await this.googlePlacesNearbyService.getNearbyCompetitors(request);
      
      this.logger.log(`Returned ${response.results.length} competitors (cached: ${response.cached})`);
      
      return response;
      
    } catch (error: any) {
      this.logger.error('Failed to fetch nearby competitors:', error);
      
      if (error.message?.includes('API key not configured')) {
        throw new HttpException(
          { message: 'Competitor service unavailable' },
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }
      
      if (error.message?.includes('rate limit')) {
        throw new HttpException(
          { message: 'External API rate limit exceeded. Please try again later.' },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
      
      throw new HttpException(
        { message: 'Failed to fetch competitor data' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
