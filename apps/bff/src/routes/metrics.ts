import { Controller, Get, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

type DailyPoint = { day: string; orders: number; revenue: number };

@Controller()
export class MetricsController {
  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  // Returns the last 7 calendar days, padding missing days with zeros
  @Get('/kpis/daily')
  async daily(): Promise<DailyPoint[]> {
    const rows = await this.prisma.$queryRaw<
      { day: Date; orders: number | null; revenue: unknown }[]
    >`
      WITH days AS (
        SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day')::date AS day
      ),
      agg AS (
        SELECT
          date_trunc('day', "createdAt")::date AS day,
          COUNT(*)::int AS orders,
          COALESCE(SUM("total"), 0) AS revenue
        FROM "Order"
        WHERE "createdAt" >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY 1
      )
      SELECT d.day, a.orders, a.revenue
      FROM days d
      LEFT JOIN agg a ON a.day = d.day
      ORDER BY d.day;
    `;

    return rows.map(r => ({
      day: r.day.toISOString().slice(0, 10),
      orders: Number(r.orders ?? 0),
      revenue: Number((r.revenue as any) ?? 0),
    }));
  }
}
