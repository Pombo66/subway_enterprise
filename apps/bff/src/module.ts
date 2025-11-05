import { Module } from '@nestjs/common';
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
// import { GeocodeController } from './routes/geocode';
import { StoreService } from './services/store.service';
import { ExpansionService } from './services/expansion.service';
import { SubMindService } from './services/submind.service';
import { SubMindRateLimitService } from './services/submind.rate-limit';
import { SubMindTelemetryService } from './services/submind-telemetry.service';
// import { GeocodeService } from './services/geocode.service';
import { PrismaStoreRepository } from './repositories/store.repository';
import { ConfigService } from './config/config.service';
import { IntelligenceModule, LocationIntelligenceService, GeographicValidationService } from './services/intelligence/intelligence.module';

const prisma = new PrismaClient();

@Module({
  imports: [IntelligenceModule],
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
    // GeocodeController,
  ],
  providers: [
    ConfigService,
    { provide: PrismaClient, useValue: prisma },
    PrismaStoreRepository,
    StoreService,
    {
      provide: ExpansionService,
      useFactory: (prisma: PrismaClient, intelligenceService: LocationIntelligenceService, geoValidationService: GeographicValidationService) => {
        return new ExpansionService(prisma, intelligenceService, geoValidationService);
      },
      inject: [PrismaClient, LocationIntelligenceService, GeographicValidationService],
    },
    SubMindService,
    SubMindRateLimitService,
    SubMindTelemetryService,
    // GeocodeService,
  ],
})
export class AppModule {}
