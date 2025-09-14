import { Controller, Get, Query, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Controller()
export class KpiController {
  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  @Get('/kpis')
  async kpis(@Query('storeId') storeId?: string) {
    const where: any = storeId ? { storeId } : {};
    const [ordersToday, revenueAgg, menuItems, pendingOrders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({ _sum: { total: true }, where }),
      this.prisma.menuItem.count({ where }),
      this.prisma.order.count({ where: { ...where, status: 'PENDING' } }),
    ]);
    return {
      ordersToday,
      revenueToday: Number(revenueAgg._sum.total ?? 0),
      menuItems,
      pendingOrders,
    };
  }
}
