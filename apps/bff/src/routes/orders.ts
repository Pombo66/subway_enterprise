import { Controller, Get, Inject, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { parseScope, makeWhere } from '../util/scope';

@Controller()
export class OrdersController {
  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  @Get('/orders/recent')
  async recent(@Query() q: Record<string, any>) {
    const w = makeWhere(parseScope(q)) as any;
    const where: any = { ...(w || {}) };
    if (where.store) {
      where.Store = { is: where.store };
      delete where.store;
    }
    const rows = await this.prisma.order.findMany({
      where,
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        Store: { select: { id: true, name: true, region: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    return rows.map(r => ({ ...r, total: Number(r.total ?? 0) }));
  }
}
