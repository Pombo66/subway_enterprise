import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaClient } from '@prisma/client';
import { HealthController } from './routes/health';
import { KpiController } from './routes/kpis';
import { MetricsController } from './routes/metrics';
import { StoresController } from './routes/stores';
import { OrdersController } from './routes/orders';
import { MenuController } from './routes/menu';
import { TelemetryController } from './routes/telemetry';
import { SettingsController } from './routes/settings';
import { SubMindController } from './routes/submind.controller';
import { ExpansionController } from './routes/expansion.controller';
import { AIIntelligenceController } from './routes/ai-intelligence.controller';
import { PortfolioOptimizerController } from './routes/portfolio-optimizer.controller';
import { ScenarioModelingController } from './routes/scenario-modeling.controller';
import { RevenueForecastingController } from './routes/revenue-forecasting.controller';
// import { GeocodeController } from './routes/geocode';
import { StoreService } from './services/store.service';
import { PortfolioOptimizerService } from './services/portfolio/portfolio-optimizer.service';
import { ROICalculatorService } from './services/portfolio/roi-calculator.service';
import { CannibalizationCalculatorService } from './services/portfolio/cannibalization-calculator.service';
import { ScenarioModelingService } from './services/scenario/scenario-modeling.service';
import { RevenueForecastingService } from './services/forecasting/revenue-forecasting.service';
import { ForecastExplainerService } from './services/forecasting/forecast-explainer.service';
import { ExpansionService } from './services/expansion.service';
import { AIPipelineController } from './services/ai/ai-pipeline-controller.service';
import { MarketAnalysisService } from './services/ai/market-analysis.service';
import { StrategicZoneIdentificationService } from './services/ai/strategic-zone-identification.service';
import { LocationDiscoveryService } from './services/ai/location-discovery.service';
import { StrategicZoneGuidedGenerationService } from './services/ai/strategic-zone-guided-generation.service';
import { ViabilityScoringValidationService } from './services/ai/viability-scoring-validation.service';
import { StrategicScoringService } from './services/ai/strategic-scoring.service';
import { ModelConfigurationManager } from './services/ai/model-configuration.service';
import { SubMindService } from './services/submind.service';
import { SubMindRateLimitService } from './services/submind.rate-limit';
import { SubMindTelemetryService } from './services/submind-telemetry.service';
import { ExpansionJobWorkerService } from './services/expansion-job-worker.service';
// import { GeocodeService } from './services/geocode.service';
import { PrismaStoreRepository } from './repositories/store.repository';
import { ConfigService } from './config/config.service';
import { AuthGuard } from './guards/auth.guard';
import { IntelligenceModule, LocationIntelligenceService, GeographicValidationService } from './services/intelligence/intelligence.module';

const prisma = new PrismaClient();

@Module({
  imports: [
    IntelligenceModule,
    // Rate limiting: 100 requests per minute per IP
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 100, // 100 requests
    }]),
  ],
  controllers: [
    HealthController,
    KpiController,
    MetricsController,
    OrdersController,
    StoresController,
    MenuController,
    TelemetryController,
    SettingsController,
    SubMindController,
    ExpansionController,
    AIIntelligenceController,
    PortfolioOptimizerController,
    ScenarioModelingController,
    RevenueForecastingController,
    // GeocodeController,
  ],
  providers: [
    ConfigService,
    { provide: PrismaClient, useValue: prisma },
    PrismaStoreRepository,
    StoreService,
    // AI Pipeline Services
    ModelConfigurationManager,
    MarketAnalysisService,
    StrategicZoneIdentificationService,
    LocationDiscoveryService,
    StrategicZoneGuidedGenerationService,
    ViabilityScoringValidationService,
    StrategicScoringService,
    AIPipelineController,
    {
      provide: ExpansionService,
      useFactory: (prisma: PrismaClient, locationIntelligenceService: LocationIntelligenceService, geographicValidationService: GeographicValidationService) => {
        return new ExpansionService(prisma, locationIntelligenceService, geographicValidationService);
      },
      inject: [PrismaClient, LocationIntelligenceService, GeographicValidationService],
    },
    SubMindService,
    SubMindRateLimitService,
    SubMindTelemetryService,
    ExpansionJobWorkerService, // Background worker for expansion jobs
    // Portfolio Optimizer Services
    PortfolioOptimizerService,
    ROICalculatorService,
    CannibalizationCalculatorService,
    // Scenario Modeling Services
    ScenarioModelingService,
    // Revenue Forecasting Services
    RevenueForecastingService,
    ForecastExplainerService,
    // GeocodeService,
    // Apply authentication globally
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
