import { Controller, Get, Inject, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { parseScope, makeWhere } from '../util/scope';

@Controller()
export class OrdersController {
  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  @Get('/orders/recent')
  async recent(@Query() q: Record<string, unknown>) {
    const w = makeWhere(parseScope(q)) as Record<string, unknown>;
    const where: Record<string, unknown> = { ...(w || {}) };
    
    // Handle store filtering
    if (where.store) {
      where.Store = { is: where.store };
      delete where.store;
    }

    // Handle status filtering
    if (q.status && q.status !== 'ALL') {
      where.status = q.status;
    }

    // Handle date range filtering
    if (q.dateRange && q.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (q.dateRange) {
        case 'hour':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '4hours':
          startDate = new Date(now.getTime() - 4 * 60 * 60 * 1000);
          break;
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // All time
      }

      where.createdAt = {
        gte: startDate,
      };
    }

    // Handle search filtering
    if (q.search) {
      const searchTerm = String(q.search).toLowerCase();
      where.OR = [
        { id: { contains: searchTerm } },
        { Store: { name: { contains: searchTerm } } },
        { User: { email: { contains: searchTerm } } },
      ];
    }

    // Handle pagination
    const page = q.page ? parseInt(String(q.page), 10) : 1;
    const limit = q.limit ? parseInt(String(q.limit), 10) : 10;
    const skip = (page - 1) * limit;

    const [orders, totalCount] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: {
          id: true,
          total: true,
          status: true,
          createdAt: true,
          Store: { 
            select: { 
              id: true, 
              name: true, 
              region: true, 
              country: true, 
              city: true 
            } 
          },
          User: {
            select: {
              id: true,
              email: true,
            }
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map(order => ({ 
        ...order, 
        total: Number(order.total ?? 0) 
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    };
  }

  @Get('/orders/:id')
  async getById(@Query('id') id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        Store: { 
          select: { 
            id: true, 
            name: true, 
            region: true, 
            country: true, 
            city: true 
          } 
        },
        User: {
          select: {
            id: true,
            email: true,
          }
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    return {
      ...order,
      total: Number(order.total ?? 0),
    };
  }
}
