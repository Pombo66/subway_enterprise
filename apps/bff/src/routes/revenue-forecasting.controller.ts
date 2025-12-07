import { Controller, Get, Post, Param, Query, Body, HttpException, HttpStatus } from '@nestjs/common';
import { RevenueForecastingService } from '../services/forecasting/revenue-forecasting.service';
import { ForecastExplainerService } from '../services/forecasting/forecast-explainer.service';

@Controller()
export class RevenueForecastingController {
  constructor(
    private readonly forecastingService: RevenueForecastingService,
    private readonly explainerService: ForecastExplainerService
  ) {}

  @Get('/forecasts/store/:storeId')
  async getStoreForecast(
    @Param('storeId') storeId: string,
    @Query('horizonMonths') horizonMonths?: string,
    @Query('regenerate') regenerate?: string
  ) {
    try {
      console.log(`📊 Forecast request for store ${storeId}`);

      const horizon = horizonMonths ? parseInt(horizonMonths, 10) : 12;
      const shouldRegenerate = regenerate === 'true';

      // Check if we have existing forecasts
      if (!shouldRegenerate) {
        const existing = await this.forecastingService.getStoreForecast(storeId);
        if (existing) {
          console.log(`✅ Returning cached forecast`);
          return existing;
        }
      }

      // Generate new forecast
      const forecast = await this.forecastingService.forecastStore(storeId, horizon);

      console.log(`✅ Forecast generated successfully`);

      return forecast;
    } catch (error) {
      console.error('❌ Forecast generation failed:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error instanceof Error ? error.message : 'Forecast generation failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('/forecasts/store/:storeId/explain')
  async explainForecast(@Param('storeId') storeId: string) {
    try {
      console.log(`🤖 Explanation request for store ${storeId}`);

      // Get forecast
      let forecast = await this.forecastingService.getStoreForecast(storeId);

      // Generate if doesn't exist
      if (!forecast) {
        forecast = await this.forecastingService.forecastStore(storeId, 12);
      }

      // Generate AI explanation
      const explanation = await this.explainerService.explainForecast(forecast);

      console.log(`✅ Explanation generated successfully`);

      return explanation;
    } catch (error) {
      console.error('❌ Explanation generation failed:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error instanceof Error ? error.message : 'Explanation generation failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('/forecasts/generate')
  async generateForecasts(
    @Body() body: {
      storeId?: string;
      region?: string;
      country?: string;
      horizonMonths?: number;
    }
  ) {
    try {
      console.log(`📊 Batch forecast generation request:`, body);

      const { storeId, region, country, horizonMonths = 12 } = body;

      // If specific store, generate for that store
      if (storeId) {
        const forecast = await this.forecastingService.forecastStore(storeId, horizonMonths);
        return {
          success: true,
          storesProcessed: 1,
          forecasts: [forecast]
        };
      }

      // Otherwise, this would be a batch job (implement later)
      throw new HttpException(
        'Batch forecasting not yet implemented. Please specify a storeId.',
        HttpStatus.NOT_IMPLEMENTED
      );
    } catch (error) {
      console.error('❌ Batch forecast generation failed:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error instanceof Error ? error.message : 'Batch forecast generation failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('/forecasts/health')
  async healthCheck() {
    return {
      status: 'ok',
      service: 'revenue-forecasting',
      timestamp: new Date().toISOString()
    };
  }
}
