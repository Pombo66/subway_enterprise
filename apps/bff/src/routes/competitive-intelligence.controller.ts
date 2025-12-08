import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { CompetitorService, CompetitorFilters } from '../services/competitive/competitor.service';
import { CompetitiveAnalysisService, CompetitiveAnalysisRequest } from '../services/competitive/competitive-analysis.service';
import { GooglePlacesService, PlaceSearchRequest } from '../services/competitive/google-places.service';
import { PrismaClient } from '@prisma/client';

@Controller('competitive-intelligence')
export class CompetitiveIntelligenceController {
  constructor(
    private competitorService: CompetitorService,
    private competitiveAnalysisService: CompetitiveAnalysisService,
    private googlePlacesService: GooglePlacesService,
    private prisma: PrismaClient
  ) {}

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

    const competitors = await this.competitorService.getCompetitors(filters);

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

  @Post('competitors/refresh')
  async refreshCompetitors(@Body() request: PlaceSearchRequest) {
    // Create refresh job
    const job = await this.prisma.competitorRefreshJob.create({
      data: {
        region: request.latitude && request.longitude 
          ? `${request.latitude},${request.longitude}` 
          : undefined,
        sources: JSON.stringify(['google']),
        categories: JSON.stringify(request.categories || ['restaurant']),
        status: 'running',
        startedAt: new Date(),
      },
    });

    try {
      // Refresh from Google Places
      const result = await this.googlePlacesService.refreshCompetitors(request);

      // Update job
      await this.prisma.competitorRefreshJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          placesFound: result.found,
          placesAdded: result.added,
          placesUpdated: result.updated,
          googleApiCalls: 1,
        },
      });

      return {
        success: true,
        jobId: job.id,
        result,
      };
    } catch (error: any) {
      // Update job with error
      await this.prisma.competitorRefreshJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: error.message,
        },
      });

      return {
        success: false,
        error: error.message,
      };
    }
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
