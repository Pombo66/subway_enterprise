import { Controller, Get, Query, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { parseScope, makeWhere } from '../util/scope';

@Controller()
export class KpiController {
  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  @Get('/kpis')
  async kpis(@Query() q: Record<string, unknown>) {
    try {
      const scopeParsed = parseScope(q);
      const filt = makeWhere(scopeParsed) as Record<string, unknown>;
      // Translate generic { store } filter into Prisma relation filters where needed
      const orderWhere: Record<string, unknown> = { ...(filt || {}) };
      if (orderWhere.store) {
        orderWhere.Store = { is: orderWhere.store };
        delete orderWhere.store;
      }
      const menuWhere: Record<string, unknown> = { ...(filt || {}) };
      if (menuWhere.store) {
        menuWhere.Store = { is: menuWhere.store };
        delete menuWhere.store;
      }
      const [ordersToday, revenueAgg, menuCount, pending] = await Promise.all([
        this.prisma.order.count({ where: orderWhere }),
        this.prisma.order.aggregate({ _sum: { total: true }, where: orderWhere }),
        this.prisma.menuItem.count({ where: menuWhere }),
        this.prisma.order.count({ where: { ...orderWhere, status: 'PENDING' } }),
      ]);
      return {
        scopeApplied: scopeParsed,
        ordersToday: ordersToday ?? 0,
        revenueToday: Number(revenueAgg._sum.total ?? 0),
        menuItems: menuCount ?? 0,
        pendingOrders: pending ?? 0,
      };
    } catch (error) {
      console.error('KPIs route error:', error instanceof Error ? error.message : error, error instanceof Error ? error.stack : undefined);
      return {
        cards: [
          { title: "Revenue (24h)", value: 0 },
          { title: "Orders (24h)", value: 0 }
        ],
        daily: [],
        scopeApplied: { scope: 'global' },
        ordersToday: 0,
        revenueToday: 0,
        menuItems: 0,
        pendingOrders: 0,
      };
    }
  }
}
