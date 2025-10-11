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
import { StoreService } from './services/store.service';
import { PrismaStoreRepository } from './repositories/store.repository';
import { ConfigService } from './config/config.service';

const prisma = new PrismaClient();

@Module({
  controllers: [
    HealthController,
    KpiController,
    MetricsController,
    OrdersController,
    StoresController,
    MenuController,
    TelemetryController,
    SettingsController,
  ],
  providers: [
    ConfigService,
    { provide: PrismaClient, useValue: prisma },
    PrismaStoreRepository,
    StoreService,
  ],
})
export class AppModule {}
