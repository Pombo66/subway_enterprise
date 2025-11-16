import { Body, Controller, Get, Post, Query, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ExpansionService } from '../services/expansion.service';
import { ExpansionRecommendationsDto, ExpansionRecomputeDto, ScopeExpansionDto, ScopeRecomputeDto, CapacityEstimateDto } from '../dto/expansion.dto';
import { ValidationError } from '../errors/validation.error';
import { validateScopeExpansionParams, validateScope } from '../utils/scopeValidation';
import { CurrentUser } from '../decorators/current-user.decorator';

@Controller()
export class ExpansionController {
  constructor(
    private readonly expansionService: ExpansionService,
    @Inject(PrismaClient) private readonly prisma: PrismaClient
  ) {}

  @Get('/expansion/recommendations')
  async getRecommendations(@Query() query: ExpansionRecommendationsDto) {
    try {
      console.info('GET /expansion/recommendations called', { 
        region: query.region, 
        mode: query.mode, 
        target: query.target,
        limit: query.limit 
      });

      const startTime = Date.now();

      const recommendations = await this.expansionService.getRecommendations({
        region: query.region,
        country: query.country,
        target: query.target ? parseInt(query.target, 10) : undefined,
        mode: query.mode,
        limit: query.limit ? parseInt(query.limit, 10) : undefined
      });

      const latencyMs = Date.now() - startTime;

      // Emit telemetry event
      await this.prisma.telemetryEvent.create({
        data: {
          eventType: 'expansion.recommendations_fetched',
          properties: JSON.stringify({
            region: query.region,
            mode: query.mode,
            target: query.target ? parseInt(query.target, 10) : undefined,
            limit: query.limit ? parseInt(query.limit, 10) : undefined,
            resultCount: recommendations.length,
            latencyMs
          }),
          timestamp: new Date()
        }
      });

      return {
        recommendations,
        metadata: {
          total: recommendations.length,
          region: query.region,
          mode: query.mode,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error in GET /expansion/recommendations:', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('/expansion/recompute')
  async recomputeScores(@Body() body: ExpansionRecomputeDto) {
    try {
      console.info('POST /expansion/recompute called', { region: body.region });

      const startTime = Date.now();

      const result = await this.expansionService.recomputeScores(body.region);

      const latencyMs = Date.now() - startTime;

      // Emit telemetry event
      await this.prisma.telemetryEvent.create({
        data: {
          eventType: 'expansion.scores_recomputed',
          properties: JSON.stringify({
            region: body.region,
            processed: result.processed,
            latencyMs
          }),
          timestamp: new Date()
        }
      });

      return result;
    } catch (error) {
      console.error('Error in POST /expansion/recompute:', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // New scope-aware endpoints
  @Get('/expansion/suggestions')
  async getSuggestionsInScope(@Query() query: ScopeExpansionDto) {
    try {
      console.info('GET /expansion/suggestions called', {
        scopeType: query.scopeType,
        scopeValue: query.scopeValue,
        intensity: query.intensity,
        dataMode: query.dataMode
      });

      const startTime = Date.now();

      // Parse scope from query parameters
      const scope = {
        type: query.scopeType as 'country' | 'state' | 'custom_area',
        value: query.scopeValue,
        polygon: query.scopePolygon ? JSON.parse(query.scopePolygon) : undefined,
        area: query.scopeArea ? parseFloat(query.scopeArea) : undefined
      };

      // Validate scope and parameters
      const validation = validateScopeExpansionParams({
        scope,
        intensity: parseInt(query.intensity, 10),
        dataMode: query.dataMode,
        minDistance: query.minDistance ? parseFloat(query.minDistance) : undefined,
        maxPerCity: query.maxPerCity ? parseInt(query.maxPerCity, 10) : undefined
      });

      if (!validation.isValid) {
        throw new HttpException(validation.error || 'Validation failed', HttpStatus.BAD_REQUEST);
      }

      const suggestions = await this.expansionService.getSuggestionsInScope({
        scope,
        intensity: parseInt(query.intensity, 10),
        dataMode: query.dataMode as 'live' | 'modelled',
        minDistance: query.minDistance ? parseFloat(query.minDistance) : 3.0,
        maxPerCity: query.maxPerCity ? parseInt(query.maxPerCity, 10) : undefined
      });

      const latencyMs = Date.now() - startTime;

      // Emit telemetry event
      await this.prisma.telemetryEvent.create({
        data: {
          eventType: 'expansion.scope_suggestions_fetched',
          properties: JSON.stringify({
            scopeType: query.scopeType,
            scopeValue: query.scopeValue,
            intensity: parseInt(query.intensity, 10),
            dataMode: query.dataMode,
            resultCount: suggestions.length,
            latencyMs
          }),
          timestamp: new Date()
        }
      });

      return {
        suggestions,
        metadata: {
          scope: {
            type: scope.type,
            value: scope.value,
            area: scope.area
          },
          intensity: parseInt(query.intensity, 10),
          targetCount: Math.min(300, Math.round((parseInt(query.intensity, 10) / 100) * suggestions.length)),
          actualCount: suggestions.length,
          cappedAt: 300,
          dataMode: query.dataMode,
          generatedAt: new Date().toISOString(),
          cacheHit: false, // Would be determined by service layer
          intelligenceEnhanced: false // Basic suggestions without intelligence
        }
      };
    } catch (error) {
      console.error('Error in GET /expansion/suggestions:', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('/expansion/suggestions/enhanced')
  async getEnhancedSuggestionsInScope(@Query() query: ScopeExpansionDto) {
    try {
      console.info('GET /expansion/suggestions/enhanced called', {
        scopeType: query.scopeType,
        scopeValue: query.scopeValue,
        intensity: query.intensity,
        dataMode: query.dataMode
      });

      const startTime = Date.now();

      // Parse scope from query parameters
      const scope = {
        type: query.scopeType as 'country' | 'state' | 'custom_area',
        value: query.scopeValue,
        polygon: query.scopePolygon ? JSON.parse(query.scopePolygon) : undefined,
        area: query.scopeArea ? parseFloat(query.scopeArea) : undefined
      };

      // Validate scope and parameters
      const validation = validateScopeExpansionParams({
        scope,
        intensity: parseInt(query.intensity, 10),
        dataMode: query.dataMode,
        minDistance: query.minDistance ? parseFloat(query.minDistance) : undefined,
        maxPerCity: query.maxPerCity ? parseInt(query.maxPerCity, 10) : undefined
      });

      if (!validation.isValid) {
        throw new HttpException(validation.error || 'Validation failed', HttpStatus.BAD_REQUEST);
      }

      // Get intelligence-enhanced suggestions
      const enhancedSuggestions = await this.expansionService.getEnhancedSuggestionsInScope({
        scope,
        intensity: parseInt(query.intensity, 10),
        dataMode: query.dataMode as 'live' | 'modelled',
        minDistance: query.minDistance ? parseFloat(query.minDistance) : 3.0,
        maxPerCity: query.maxPerCity ? parseInt(query.maxPerCity, 10) : undefined
      });

      const latencyMs = Date.now() - startTime;

      // Calculate intelligence metrics for metadata
      const highCredibilityCount = enhancedSuggestions.filter(s => s.credibilityRating === 'HIGH').length;
      const executiveReadyCount = enhancedSuggestions.filter(s => s.executiveReadiness).length;
      const avgIntelligenceScore = enhancedSuggestions.length > 0 
        ? enhancedSuggestions.reduce((sum, s) => sum + s.intelligenceScore, 0) / enhancedSuggestions.length 
        : 0;

      // Emit telemetry event
      await this.prisma.telemetryEvent.create({
        data: {
          eventType: 'expansion.enhanced_suggestions_fetched',
          properties: JSON.stringify({
            scopeType: query.scopeType,
            scopeValue: query.scopeValue,
            intensity: parseInt(query.intensity, 10),
            dataMode: query.dataMode,
            resultCount: enhancedSuggestions.length,
            highCredibilityCount,
            executiveReadyCount,
            avgIntelligenceScore: Number(avgIntelligenceScore.toFixed(3)),
            latencyMs
          }),
          timestamp: new Date()
        }
      });

      return {
        suggestions: enhancedSuggestions,
        metadata: {
          scope: {
            type: scope.type,
            value: scope.value,
            area: scope.area
          },
          intensity: parseInt(query.intensity, 10),
          targetCount: Math.min(300, Math.round((parseInt(query.intensity, 10) / 100) * enhancedSuggestions.length)),
          actualCount: enhancedSuggestions.length,
          cappedAt: 300,
          dataMode: query.dataMode,
          generatedAt: new Date().toISOString(),
          cacheHit: false, // Would be determined by service layer
          intelligenceEnhanced: true,
          intelligenceMetrics: {
            averageIntelligenceScore: Number(avgIntelligenceScore.toFixed(3)),
            highCredibilityCount,
            mediumCredibilityCount: enhancedSuggestions.filter(s => s.credibilityRating === 'MEDIUM').length,
            lowCredibilityCount: enhancedSuggestions.filter(s => s.credibilityRating === 'LOW').length,
            executiveReadyCount,
            dataSourceBreakdown: {
              census: enhancedSuggestions.filter(s => s.demographicProfile?.dataSource === 'census').length,
              commercial: enhancedSuggestions.filter(s => s.demographicProfile?.dataSource === 'commercial').length,
              aiInferred: enhancedSuggestions.filter(s => s.demographicProfile?.dataSource === 'ai_inferred').length
            }
          }
        }
      };
    } catch (error) {
      console.error('Error in GET /expansion/suggestions/enhanced:', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('/expansion/capacity')
  async estimateCapacity(@Query() query: CapacityEstimateDto) {
    try {
      console.info('GET /expansion/capacity called', {
        scopeType: query.scopeType,
        scopeValue: query.scopeValue
      });

      const startTime = Date.now();

      // Parse scope from query parameters
      const scope = {
        type: query.scopeType as 'country' | 'state' | 'custom_area',
        value: query.scopeValue,
        polygon: query.scopePolygon ? JSON.parse(query.scopePolygon) : undefined,
        area: query.scopeArea ? parseFloat(query.scopeArea) : undefined
      };

      // Validate scope
      const validation = validateScope(scope);
      if (!validation.isValid) {
        throw new HttpException(validation.error || 'Validation failed', HttpStatus.BAD_REQUEST);
      }

      const capacity = await this.expansionService.estimateCapacity(scope);

      const latencyMs = Date.now() - startTime;

      // Emit telemetry event
      await this.prisma.telemetryEvent.create({
        data: {
          eventType: 'expansion.capacity_estimated',
          properties: JSON.stringify({
            scopeType: query.scopeType,
            scopeValue: query.scopeValue,
            totalSites: capacity.totalSites,
            availableSites: capacity.availableSites,
            latencyMs
          }),
          timestamp: new Date()
        }
      });

      return {
        ...capacity,
        metadata: {
          scope: {
            type: scope.type,
            value: scope.value,
            area: scope.area
          },
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error in GET /expansion/capacity:', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('/expansion/recompute-scope')
  async recomputeForScope(@Body() body: ScopeRecomputeDto) {
    try {
      console.info('POST /expansion/recompute-scope called', {
        scopeType: body.scopeType,
        scopeValue: body.scopeValue
      });

      const startTime = Date.now();

      // Parse scope from body
      const scope = {
        type: body.scopeType as 'country' | 'state' | 'custom_area',
        value: body.scopeValue,
        polygon: body.scopePolygon ? JSON.parse(body.scopePolygon) : undefined,
        area: body.scopeArea ? parseFloat(body.scopeArea) : undefined
      };

      // Validate scope
      const validation = validateScope(scope);
      if (!validation.isValid) {
        throw new HttpException(validation.error || 'Validation failed', HttpStatus.BAD_REQUEST);
      }

      const result = await this.expansionService.recomputeForScope(scope);

      const latencyMs = Date.now() - startTime;

      // Emit telemetry event
      await this.prisma.telemetryEvent.create({
        data: {
          eventType: 'expansion.scope_recomputed',
          properties: JSON.stringify({
            scopeType: body.scopeType,
            scopeValue: body.scopeValue,
            processed: result.processed,
            latencyMs
          }),
          timestamp: new Date()
        }
      });

      return result;
    } catch (error) {
      console.error('Error in POST /expansion/recompute-scope:', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('/ai/pipeline/execute')
  async executeAIPipeline(@Body() body: {
    region: string;
    bounds?: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
    existingStores: {
      name?: string;
      city?: string;
      lat: number;
      lng: number;
      performance?: number;
      revenue?: number;
    }[];
    targetCandidates: number;
    useSimpleApproach?: boolean;
    model?: 'gpt-5.1' | 'gpt-5-mini'; // Optional model selection
    businessObjectives?: {
      riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
      expansionSpeed: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
      marketPriorities: string[];
    };
  }) {
    try {
      console.info('POST /ai/pipeline/execute called', {
        region: body.region,
        targetCandidates: body.targetCandidates,
        existingStores: body.existingStores.length,
        useSimpleApproach: body.useSimpleApproach
      });

      const startTime = Date.now();

      // Check if simple approach is requested
      if (body.useSimpleApproach) {
        const modelName = body.model || 'gpt-5-mini';
        console.log(`🎯 Using simple single-call expansion approach with ${modelName}`);
        
        const { SimpleExpansionService } = await import('../services/ai/simple-expansion.service');
        const simpleService = new SimpleExpansionService(this.prisma);

        const result = await simpleService.generateSuggestions({
          region: body.region,
          existingStores: body.existingStores.map(store => ({
            name: store.name || 'Unknown',
            city: store.city || 'Unknown',
            lat: store.lat,
            lng: store.lng,
            revenue: store.revenue || store.performance
          })),
          targetCount: body.targetCandidates,
          model: body.model
        });

        const latencyMs = Date.now() - startTime;

        // Emit telemetry event
        await this.prisma.telemetryEvent.create({
          data: {
            eventType: 'ai.simple_expansion_executed',
            properties: JSON.stringify({
              region: body.region,
              model: result.metadata.model,
              targetCandidates: body.targetCandidates,
              suggestionsGenerated: result.suggestions.length,
              tokensUsed: result.metadata.tokensUsed,
              cost: result.metadata.cost,
              latencyMs
            }),
            timestamp: new Date()
          }
        });

        return {
          finalCandidates: result.suggestions.map((s, i) => ({
            id: `simple-${i + 1}`,
            lat: s.lat,
            lng: s.lng,
            name: s.city,
            city: s.city,
            address: s.address,
            viabilityScore: s.confidence,
            confidence: s.confidence,
            rationale: s.rationale,
            estimatedRevenue: s.estimatedRevenue,
            distanceToNearestStore: s.distanceToNearestStore
          })),
          metadata: {
            stagesExecuted: 1,
            totalTokensUsed: result.metadata.tokensUsed,
            totalCost: result.metadata.cost,
            totalProcessingTimeMs: result.metadata.processingTimeMs,
            latencyMs
          },
          analysis: result.analysis // Pass through strategic analysis
        };
      }

      // Import AI Pipeline Controller
      const { AIPipelineController } = await import('../services/ai/ai-pipeline-controller.service');
      const { MarketAnalysisService } = await import('../services/ai/market-analysis.service');
      const { StrategicZoneIdentificationService } = await import('../services/ai/strategic-zone-identification.service');
      const { LocationDiscoveryService } = await import('../services/ai/location-discovery.service');
      const { StrategicZoneGuidedGenerationService } = await import('../services/ai/strategic-zone-guided-generation.service');
      const { ViabilityScoringValidationService } = await import('../services/ai/viability-scoring-validation.service');
      const { StrategicScoringService } = await import('../services/ai/strategic-scoring.service');

      // Initialize AI services in correct dependency order
      const marketAnalysisService = new MarketAnalysisService(this.prisma);
      const zoneIdentificationService = new StrategicZoneIdentificationService(this.prisma);
      const locationDiscoveryService = new LocationDiscoveryService(this.prisma);
      const zoneGuidedGenerationService = new StrategicZoneGuidedGenerationService(this.prisma, locationDiscoveryService);
      const viabilityValidationService = new ViabilityScoringValidationService(this.prisma);
      const strategicScoringService = new StrategicScoringService(this.prisma);

      const pipelineController = new AIPipelineController(
        this.prisma,
        marketAnalysisService,
        zoneIdentificationService,
        locationDiscoveryService,
        zoneGuidedGenerationService,
        viabilityValidationService,
        strategicScoringService
      );

      // Execute AI Pipeline (complex 5-stage approach)
      const pipelineRequest = {
        ...body,
        bounds: body.bounds || { north: 0, south: 0, east: 0, west: 0 },
        businessObjectives: body.businessObjectives || {
          riskTolerance: 'MEDIUM' as const,
          expansionSpeed: 'MODERATE' as const,
          marketPriorities: []
        }
      };
      
      const pipelineResult = await pipelineController.executePipeline(pipelineRequest);

      const latencyMs = Date.now() - startTime;

      // Emit telemetry event
      await this.prisma.telemetryEvent.create({
        data: {
          eventType: 'ai.pipeline_executed',
          properties: JSON.stringify({
            region: body.region,
            targetCandidates: body.targetCandidates,
            finalCandidatesCount: pipelineResult.finalCandidates.length,
            stagesExecuted: pipelineResult.metadata.stagesExecuted,
            totalTokensUsed: pipelineResult.metadata.totalTokensUsed,
            totalCost: pipelineResult.metadata.totalCost,
            latencyMs
          }),
          timestamp: new Date()
        }
      });

      return {
        ...pipelineResult,
        metadata: {
          ...pipelineResult.metadata,
          latencyMs
        }
      };
    } catch (error) {
      console.error('Error in POST /ai/pipeline/execute:', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('/stores/geocode-missing')
  async geocodeMissingStores(@Body() body: { country?: string }) {
    try {
      console.info('POST /stores/geocode-missing called', {
        country: body.country
      });

      const startTime = Date.now();

      // Import GeocodingService dynamically
      const { GeocodingService } = await import('../services/geocoding.service');
      const geocodingService = new GeocodingService(this.prisma);

      // Get count before geocoding
      const missingCount = await geocodingService.getMissingCoordinatesCount(body.country);

      if (missingCount === 0) {
        return {
          message: 'No stores with missing coordinates found',
          processed: 0,
          successful: 0,
          failed: 0,
          results: []
        };
      }

      // Perform geocoding
      const result = await geocodingService.geocodeMissingStores(body.country);

      const latencyMs = Date.now() - startTime;

      // Emit telemetry event
      await this.prisma.telemetryEvent.create({
        data: {
          eventType: 'stores.geocoded',
          properties: JSON.stringify({
            country: body.country,
            processed: result.processed,
            successful: result.successful,
            failed: result.failed,
            latencyMs
          }),
          timestamp: new Date()
        }
      });

      return {
        message: `Geocoded ${result.successful} of ${result.processed} stores`,
        ...result,
        metadata: {
          country: body.country,
          latencyMs
        }
      };

    } catch (error) {
      console.error('Error in POST /stores/geocode-missing:', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('/stores/missing-coordinates')
  async getMissingCoordinatesCount(@Query() query: { country?: string }) {
    try {
      console.info('GET /stores/missing-coordinates called', {
        country: query.country
      });

      // Import GeocodingService dynamically
      const { GeocodingService } = await import('../services/geocoding.service');
      const geocodingService = new GeocodingService(this.prisma);

      const count = await geocodingService.getMissingCoordinatesCount(query.country);

      return {
        count,
        country: query.country || 'all'
      };

    } catch (error) {
      console.error('Error in GET /stores/missing-coordinates:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('/expansion/ai-analysis')
  async getScopeAIAnalysis(@Body() body: {
    scope: {
      type: string;
      value: string;
      area?: number;
    };
    suggestion: {
      lat: number;
      lng: number;
      finalScore: number;
      confidence: number;
      dataMode: string;
      topPOIs: string[];
      nearestSubwayDistance: number;
    };
    reasons?: string[];
  }) {
    try {
      console.info('POST /expansion/ai-analysis called', {
        scopeType: body.scope.type,
        scopeValue: body.scope.value,
        location: `${body.suggestion.lat.toFixed(3)}, ${body.suggestion.lng.toFixed(3)}`
      });

      const startTime = Date.now();

      // Import SubMindService dynamically to avoid circular dependencies
      const { SubMindService } = await import('../services/submind.service');
      const submindService = new SubMindService();

      const analysis = await submindService.processScopeExpansionAnalysis(
        body.scope,
        body.suggestion,
        body.reasons
      );

      const latencyMs = Date.now() - startTime;

      // Emit telemetry event
      await this.prisma.telemetryEvent.create({
        data: {
          eventType: 'expansion.ai_analysis_requested',
          properties: JSON.stringify({
            scopeType: body.scope.type,
            scopeValue: body.scope.value,
            suggestionScore: body.suggestion.finalScore,
            suggestionConfidence: body.suggestion.confidence,
            dataMode: body.suggestion.dataMode,
            hasReasons: !!(body.reasons && body.reasons.length > 0),
            latencyMs
          }),
          timestamp: new Date()
        }
      });

      return {
        analysis,
        metadata: {
          scope: body.scope,
          location: {
            lat: body.suggestion.lat,
            lng: body.suggestion.lng
          },
          generatedAt: new Date().toISOString(),
          latencyMs
        }
      };
    } catch (error) {
      console.error('Error in POST /expansion/ai-analysis:', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}