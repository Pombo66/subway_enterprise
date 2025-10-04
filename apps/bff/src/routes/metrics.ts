
import { Controller, Get, Inject, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { parseScope, makeWhere } from '../util/scope';

type DailyPoint = { day: string; orders: number; revenue: number };

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

// build last 7 calendar days (oldest -> newest)
function last7Days(): string[] {
  const days: string[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const t = new Date(d);
    t.setDate(d.getDate() - i);
    days.push(ymd(t));
  }
  return days;
}

@Controller()
export class MetricsController {
  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) { }

  @Get('/kpis/daily')
  async daily(@Query() q: Record<string, any>): Promise<DailyPoint[]> {
    const scope = parseScope(q);
    const whereBase: any = makeWhere(scope);

    // date window: last 7 days inclusive
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    const where: any = {
      ...whereBase,
      createdAt: { gte: start },
    };

    // For region scope, translate makeWhere({ store }) properly for Order relation
    if (where.store) {
      const storeFilter = where.store;
      delete where.store;
      where.Store = { is: storeFilter };
    }

    // Pull minimal fields and aggregate in JS to avoid DB casting issues
    const rows = await this.prisma.order.findMany({
      where,
      select: { createdAt: true, total: true },
    });

    const byDay = new Map<string, { orders: number; revenue: number }>();
    for (const r of rows) {
      const d = ymd(new Date(r.createdAt));
      const cur = byDay.get(d) || { orders: 0, revenue: 0 };
      cur.orders += 1;
      cur.revenue += Number(r.total ?? 0);
      byDay.set(d, cur);
    }

    const days = last7Days();
    return days.map((d) => {
      const v = byDay.get(d) || { orders: 0, revenue: 0 };
      return { day: d, orders: v.orders, revenue: v.revenue };
    });
  }
}
