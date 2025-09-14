import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { HealthController } from './routes/health';
import { KpiController } from './routes/kpis';
import { MetricsController } from './routes/metrics';

const prisma = new PrismaClient();

@Module({
  controllers: [HealthController, KpiController, MetricsController],
  providers: [{ provide: PrismaClient, useValue: prisma }],
})
export class AppModule {}
