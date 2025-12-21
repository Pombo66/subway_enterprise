import { Controller, Get, Post, Body, Param, Query, Logger, HttpStatus, HttpException } from '@nestjs/common';
import { CompetitorService, CompetitorFilters } from '../services/competitive/competitor.service';
import { CompetitiveAnalysisService, CompetitiveAnalysisRequest } from '../services/competitive/competitive-analysis.service';
import { GooglePlacesService } from '../services/competitive/google-places.service';
import { MapboxCompetitorsService, MapboxCompetitorRequest } from '../services/competitive/mapbox-competitors.service';
import { PrismaClient } from '@prisma/client';

/**
 * Controller for competitive intelligence features.
 * 
 * NOTE: Several endpoints in this controller are deprecated.
 * Use the new on-demand competitor system instead:
 * - POST /api/competitors/nearby - Fetch competitors on-demand for a specific location
 * 
 * @see CompetitorsNearbyController
 */
@Controller('competitive-intelligence')
export class CompetitiveIntelligenceController {
  private readonly logger = new Logger(CompetitiveIntelligenceController.name);

  constructor(
    private competitorService: CompetitorService,
    private competitiveAnalysisService: CompetitiveAnalysisService,
    private googlePlacesService: GooglePlacesService,
    private mapboxCompetitorsService: MapboxCompetitorsService,
    private prisma: PrismaClient
  ) {}

  /**
   * @deprecated Use POST /api/competitors/nearby instead.
   * This endpoint queries the database and auto-fetches from Mapbox, which is deprecated.
   * The new system uses Google Places API for on-demand discovery.
   */
  @Get('competitors')
  async getCompetitors(
    @Query('brand') brand?: string,
    @Query('category') category?: string,
    @Query('country') country?: string,
    @Query('city') city?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string
  ) {
    this.logger.warn('⚠️ DEPRECATED: GET /competitive-intelligence/competitors called. Use POST /api/competitors/nearby instead.');
    
    const filters: CompetitorFilters = {};

    if (brand) filters.brand = brand;
    if (category) filters.category = category;
    if (country) filters.country = country;
    if (city) filters.city = city;

    if (lat && lng && radius) {
      filters.centerLat = parseFloat(lat);
      filters.centerLng = parseFloat(lng);
      filters.radiusKm = parseFloat(radius);
    }

    // First, try to get competitors from database
    let competitors = await this.competitorService.getCompetitors(filters);

    // If no competitors in database for this viewport, auto-fetch from Mapbox
    // This creates the "Google Maps-like" experience where POIs just appear
    if (competitors.length === 0 && lat && lng) {
      console.log('🏢 No competitors in database for viewport, auto-fetching from Mapbox...');
      
      try {
        const radiusMeters = (parseFloat(radius || '10') * 1000); // Convert km to meters
        const result = await this.mapboxCompetitorsService.refreshCompetitors({
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          radiusMeters: Math.min(radiusMeters, 5000), // Cap at 5km for Mapbox API
        });
        
        console.log(`🏢 Auto-fetched ${result.found} competitors from Mapbox, added ${result.added} new`);
        
        // Re-query database to get the newly added competitors
        competitors = await this.competitorService.getCompetitors(filters);
      } catch (error) {
        console.error('🏢 Auto-fetch from Mapbox failed:', error);
        // Continue with empty results - user can manually refresh
      }
    }

    return {
      success: true,
      count: competitors.length,
      competitors,
    };
  }

  @Get('competitors/:id')
  async getCompetitorById(@Param('id') id: string) {
    const competitor = await this.competitorService.getCompetitorById(id);

    if (!competitor) {
      return {
        success: false,
        error: 'Competitor not found',
      };
    }

    return {
      success: true,
      competitor,
    };
  }

  @Post('competitors')
  async createCompetitor(@Body() data: any) {
    const competitor = await this.competitorService.createCompetitor(data);

    return {
      success: true,
      competitor,
    };
  }

  @Get('competitors/stats')
  async getCompetitorStats(
    @Query('country') country?: string,
    @Query('region') region?: string
  ) {
    const filters: CompetitorFilters = {};
    if (country) filters.country = country;

    const stats = await this.competitorService.getCompetitorStats(filters);

    return {
      success: true,
      stats,
    };
  }

  /**
   * @deprecated This endpoint is deprecated and returns 410 Gone.
   * Use POST /api/competitors/nearby instead for on-demand competitor discovery.
   * 
   * The new system:
   * - Uses Google Places API instead of Mapbox Tilequery
   * - Does not persist data to database
   * - Provides better accuracy and coverage
   */
  @Post('competitors/refresh')
  async refreshCompetitors(@Body() request: MapboxCompetitorRequest) {
    this.logger.warn('⚠️ DEPRECATED: POST /competitive-intelligence/competitors/refresh called. Returning 410 Gone.');
    
    throw new HttpException(
      {
        success: false,
        error: 'This endpoint is deprecated',
        message: 'The competitor refresh endpoint has been deprecated. Use POST /api/competitors/nearby instead for on-demand competitor discovery.',
        migration: {
          newEndpoint: 'POST /api/competitors/nearby',
          documentation: 'The new system uses Google Places API for on-demand competitor discovery with in-memory caching.',
          example: {
            url: '/api/competitors/nearby',
            method: 'POST',
            body: {
              lat: request.latitude,
              lng: request.longitude,
              radiusKm: 5,
              brands: ["McDonald's", "Burger King", "KFC", "Domino's", "Starbucks"]
            }
          }
        }
      },
      HttpStatus.GONE
    );
  }

  @Post('analyze')
  async analyzeCompetition(@Body() request: CompetitiveAnalysisRequest) {
    try {
      const analysis = await this.competitiveAnalysisService.analyzeCompetition(request);

      return {
        success: true,
        analysis,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('analysis/store/:storeId')
  async getStoreCompetitiveAnalysis(
    @Param('storeId') storeId: string,
    @Query('radius') radius?: string
  ) {
    try {
      const analysis = await this.competitiveAnalysisService.analyzeCompetition({
        storeId,
        radiusKm: radius ? parseFloat(radius) : 5,
      });

      return {
        success: true,
        analysis,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('analysis/location')
  async getLocationCompetitiveAnalysis(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string
  ) {
    try {
      const analysis = await this.competitiveAnalysisService.analyzeCompetition({
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        radiusKm: radius ? parseFloat(radius) : 5,
      });

      return {
        success: true,
        analysis,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
