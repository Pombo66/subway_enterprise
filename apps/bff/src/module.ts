import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { HealthController } from './routes/health';
import { KpiController } from './routes/kpis';
import { MetricsController } from './routes/metrics';
import { StoresController } from './routes/stores';
import { OrdersController } from './routes/orders';
import { MenuController } from './routes/menu';
import { TelemetryController } from './routes/telemetry';

const prisma = new PrismaClient();

@Module({
  controllers: [HealthController, KpiController, MetricsController, OrdersController, StoresController, MenuController, TelemetryController],
  providers: [{ provide: PrismaClient, useValue: prisma }],
})
export class AppModule {}
