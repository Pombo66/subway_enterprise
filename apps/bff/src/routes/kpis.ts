import { Controller, Get, Query, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { parseScope, makeWhere } from '../util/scope';

@Controller()
export class KpiController {
  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  @Get('/kpis')
  async kpis(@Query() q: Record<string, any>) {
    const scopeParsed = parseScope(q);
    const filt = makeWhere(scopeParsed) as any;
    // Translate generic { store } filter into Prisma relation filters where needed
    const orderWhere: any = { ...(filt || {}) };
    if (orderWhere.store) {
      orderWhere.Store = { is: orderWhere.store };
      delete orderWhere.store;
    }
    const menuWhere: any = { ...(filt || {}) };
    if (menuWhere.store) {
      menuWhere.Store = { is: menuWhere.store };
      delete menuWhere.store;
    }
    const [ordersToday, revenueAgg, menuCount, pending] = await Promise.all([
      this.prisma.order.count({ where: orderWhere }),
      this.prisma.order.aggregate({ _sum: { total: true }, where: orderWhere }),
      this.prisma.menuItem.count({ where: menuWhere }),
      this.prisma.order.count({ where: { ...orderWhere, status: 'PENDING' as any } }),
    ]);
    return {
      scopeApplied: scopeParsed,
      ordersToday,
      revenueToday: Number(revenueAgg._sum.total ?? 0),
      menuItems: menuCount,
      pendingOrders: pending,
    };
  }
}
