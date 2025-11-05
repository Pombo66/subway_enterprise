// Geocoding API controller for BFF
import { 
  Body, 
  Controller, 
  Post, 
  Get, 
  Query,
  HttpException, 
  HttpStatus, 
  Logger,
  ValidationPipe,
  UsePipes
} from '@nestjs/common';
import { GeocodeService } from '../services/geocode.service';
import { 
  GeocodeRequestDto, 
  GeocodeResponseDto, 
  GeocodeProvider 
} from '../dto/geocode.dto';

@Controller()
export class GeocodeController {
  private readonly logger = new Logger(GeocodeController.name);

  constructor(private readonly geocodeService: GeocodeService) {}

  /**
   * Batch geocode multiple addresses
   * POST /import/geocode
   */
  @Post('/import/geocode')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async batchGeocode(@Body() request: GeocodeRequestDto): Promise<GeocodeResponseDto> {
    try {
      this.logger.log(`Received batch geocode request for ${request.rows.length} rows`);

      // Validate request size
      if (request.rows.length === 0) {
        throw new HttpException('No rows provided for geocoding', HttpStatus.BAD_REQUEST);
      }

      if (request.rows.length > 50) {
        throw new HttpException('Batch size too large (maximum 50 rows)', HttpStatus.BAD_REQUEST);
      }

      // Validate that all rows have required fields
      for (const row of request.rows) {
        if (!row.id || !row.country) {
          throw new HttpException(
            `Row missing required fields: id and country are required`, 
            HttpStatus.BAD_REQUEST
          );
        }

        // At least one of address or city must be provided
        if (!row.address && !row.city) {
          throw new HttpException(
            `Row ${row.id} missing address information: at least address or city must be provided`,
            HttpStatus.BAD_REQUEST
          );
        }
      }

      const startTime = Date.now();
      const result = await this.geocodeService.batchGeocode(request);
      const duration = Date.now() - startTime;

      this.logger.log(`Batch geocode completed in ${duration}ms for ${request.rows.length} rows`);

      return result;

    } catch (error) {
      this.logger.error('Error in batch geocode:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Internal server error during geocoding',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Test geocoding provider connectivity
   * GET /import/geocode/test
   */
  @Get('/import/geocode/test')
  async testProvider(@Query('provider') provider?: string) {
    try {
      // Default to nominatim if no provider specified
      const geocodeProvider = provider === 'google' ? GeocodeProvider.GOOGLE : GeocodeProvider.NOMINATIM;
      
      this.logger.log(`Testing geocoding provider: ${geocodeProvider}`);

      const result = await this.geocodeService.testProvider(geocodeProvider);

      return {
        provider: geocodeProvider,
        ...result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Error testing geocoding provider:', error);
      
      throw new HttpException(
        'Error testing geocoding provider',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get geocoding service status and configuration
   * GET /import/geocode/status
   */
  @Get('/import/geocode/status')
  async getStatus() {
    try {
      const nominatimConfigured = !!(process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org');
      const googleConfigured = !!process.env.GOOGLE_MAPS_API_KEY;

      return {
        providers: {
          nominatim: {
            available: true,
            configured: nominatimConfigured,
            baseUrl: process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org'
          },
          google: {
            available: googleConfigured,
            configured: googleConfigured,
            hasApiKey: googleConfigured
          }
        },
        limits: {
          maxBatchSize: 50,
          timeoutMs: parseInt(process.env.GEOCODE_TIMEOUT_MS || '10000', 10)
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Error getting geocoding status:', error);
      
      throw new HttpException(
        'Error retrieving geocoding status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Health check endpoint for geocoding service
   * GET /import/geocode/health
   */
  @Get('/import/geocode/health')
  async healthCheck() {
    try {
      // Test both providers if configured
      const tests = [];
      
      if (process.env.NOMINATIM_URL || true) { // Nominatim is always available
        tests.push(this.geocodeService.testProvider(GeocodeProvider.NOMINATIM));
      }
      
      if (process.env.GOOGLE_MAPS_API_KEY) {
        tests.push(this.geocodeService.testProvider(GeocodeProvider.GOOGLE));
      }

      const results = await Promise.allSettled(tests);
      
      const health = {
        status: 'healthy',
        providers: {} as Record<string, any>,
        timestamp: new Date().toISOString()
      };

      // Process Nominatim result
      if (results[0]) {
        const nominatimResult = results[0].status === 'fulfilled' ? results[0].value : null;
        health.providers.nominatim = nominatimResult || { success: false, message: 'Test failed' };
      }

      // Process Google result
      if (results[1]) {
        const googleResult = results[1].status === 'fulfilled' ? results[1].value : null;
        health.providers.google = googleResult || { success: false, message: 'Test failed' };
      }

      // Determine overall health
      const allProvidersHealthy = Object.values(health.providers).every(
        (provider: any) => provider.success
      );

      if (!allProvidersHealthy) {
        health.status = 'degraded';
      }

      return health;

    } catch (error) {
      this.logger.error('Error in geocoding health check:', error);
      
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }
}