import { Controller, Get, Post, Patch, Inject, Query, Body, Param, HttpException, HttpStatus, UseInterceptors } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { parseScope, makeWhere } from '../util/scope';
import { ErrorInterceptor } from '../interceptors/error.interceptor';

interface CreateOrderDto {
  storeId: string;
  userId?: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
  }>;
}

interface UpdateOrderStatusDto {
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
}

@Controller()
@UseInterceptors(ErrorInterceptor)
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
  async getById(@Param('id') id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        updatedAt: true,
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
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            subtotal: true,
            MenuItem: {
              select: {
                id: true,
                name: true,
                price: true,
              }
            }
          }
        }
      },
    });

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    return {
      ...order,
      total: Number(order.total ?? 0),
      items: order.items.map(item => ({
        ...item,
        price: Number(item.price),
        subtotal: Number(item.subtotal),
        MenuItem: {
          ...item.MenuItem,
          price: Number(item.MenuItem.price),
        }
      }))
    };
  }

  @Post('/orders/create')
  async create(@Body() dto: CreateOrderDto) {
    try {
      // Validate store exists
      const store = await this.prisma.store.findUnique({
        where: { id: dto.storeId }
      });

      if (!store) {
        throw new HttpException('Store not found', HttpStatus.BAD_REQUEST);
      }

      // Validate and fetch menu items
      const menuItems = await this.prisma.menuItem.findMany({
        where: {
          id: { in: dto.items.map(item => item.menuItemId) },
          storeId: dto.storeId,
          active: true
        }
      });

      if (menuItems.length !== dto.items.length) {
        throw new HttpException('One or more menu items not found or inactive', HttpStatus.BAD_REQUEST);
      }

      // Calculate order total
      let total = 0;
      const orderItems = dto.items.map(item => {
        const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
        if (!menuItem) {
          throw new HttpException(`Menu item ${item.menuItemId} not found`, HttpStatus.BAD_REQUEST);
        }

        const price = Number(menuItem.price);
        const subtotal = price * item.quantity;
        total += subtotal;

        return {
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: menuItem.price,
          subtotal: subtotal
        };
      });

      // Create order with items
      const order = await this.prisma.order.create({
        data: {
          storeId: dto.storeId,
          userId: dto.userId,
          total: total,
          status: 'PENDING',
          items: {
            create: orderItems
          }
        },
        include: {
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
              email: true
            }
          },
          items: {
            include: {
              MenuItem: {
                select: {
                  id: true,
                  name: true,
                  price: true
                }
              }
            }
          }
        }
      });

      // Emit telemetry event
      await this.prisma.telemetryEvent.create({
        data: {
          eventType: 'order.created',
          userId: dto.userId || 'guest',
          properties: JSON.stringify({
            orderId: order.id,
            storeId: dto.storeId,
            total: total,
            itemCount: dto.items.length
          })
        }
      });

      return {
        ...order,
        total: Number(order.total),
        items: order.items.map(item => ({
          ...item,
          price: Number(item.price),
          subtotal: Number(item.subtotal),
          MenuItem: {
            ...item.MenuItem,
            price: Number(item.MenuItem.price)
          }
        }))
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error creating order:', error);
      throw new HttpException('Failed to create order', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('/orders/analytics/summary')
  async getAnalyticsSummary(@Query() q: Record<string, unknown>) {
    try {
      const w = makeWhere(parseScope(q)) as Record<string, unknown>;
      const where: Record<string, unknown> = { ...(w || {}) };

      // Handle store filtering
      if (where.store) {
        where.Store = { is: where.store };
        delete where.store;
      }

      // Handle date range
      if (q.dateRange && q.dateRange !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (q.dateRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90days':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }

        where.createdAt = { gte: startDate };
      }

      // Get summary statistics
      const [totalOrders, totalRevenue, ordersByStatus, recentOrders] = await Promise.all([
        this.prisma.order.count({ where }),
        this.prisma.order.aggregate({
          where,
          _sum: { total: true }
        }),
        this.prisma.order.groupBy({
          by: ['status'],
          where,
          _count: true
        }),
        this.prisma.order.findMany({
          where,
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            total: true,
            status: true,
            createdAt: true,
            Store: {
              select: { name: true, region: true }
            }
          }
        })
      ]);

      const avgOrderValue = totalOrders > 0 
        ? Number(totalRevenue._sum.total || 0) / totalOrders 
        : 0;

      return {
        totalOrders,
        totalRevenue: Number(totalRevenue._sum.total || 0),
        avgOrderValue,
        ordersByStatus: ordersByStatus.map(s => ({
          status: s.status,
          count: s._count
        })),
        recentOrders: recentOrders.map(o => ({
          ...o,
          total: Number(o.total)
        }))
      };
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      throw new HttpException('Failed to fetch analytics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('/orders/analytics/trends')
  async getAnalyticsTrends(@Query() q: Record<string, unknown>) {
    try {
      const w = makeWhere(parseScope(q)) as Record<string, unknown>;
      const where: Record<string, unknown> = { ...(w || {}) };

      // Handle store filtering
      if (where.store) {
        where.Store = { is: where.store };
        delete where.store;
      }

      // Default to last 30 days
      const days = q.days ? parseInt(String(q.days), 10) : 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: startDate };

      // Get orders grouped by date
      const orders = await this.prisma.order.findMany({
        where,
        select: {
          createdAt: true,
          total: true,
          status: true
        },
        orderBy: { createdAt: 'asc' }
      });

      // Group by date
      const dailyData: Record<string, { date: string; orders: number; revenue: number }> = {};
      
      orders.forEach(order => {
        const date = order.createdAt.toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { date, orders: 0, revenue: 0 };
        }
        dailyData[date].orders++;
        dailyData[date].revenue += Number(order.total);
      });

      const trends = Object.values(dailyData).sort((a, b) => 
        a.date.localeCompare(b.date)
      );

      return { trends };
    } catch (error) {
      console.error('Error fetching analytics trends:', error);
      throw new HttpException('Failed to fetch trends', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('/orders/analytics/stores')
  async getStorePerformance(@Query() q: Record<string, unknown>) {
    try {
      const w = makeWhere(parseScope(q)) as Record<string, unknown>;
      const where: Record<string, unknown> = { ...(w || {}) };

      // Handle date range
      if (q.dateRange && q.dateRange !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (q.dateRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }

        where.createdAt = { gte: startDate };
      }

      // Get orders grouped by store
      const storeOrders = await this.prisma.order.groupBy({
        by: ['storeId'],
        where,
        _count: true,
        _sum: { total: true }
      });

      // Get store details
      const storeIds = storeOrders.map(s => s.storeId);
      const stores = await this.prisma.store.findMany({
        where: { id: { in: storeIds } },
        select: {
          id: true,
          name: true,
          region: true,
          country: true,
          city: true
        }
      });

      const storeMap = new Map(stores.map(s => [s.id, s]));

      const performance = storeOrders.map(so => {
        const store = storeMap.get(so.storeId);
        const revenue = Number(so._sum.total || 0);
        const avgOrderValue = so._count > 0 ? revenue / so._count : 0;

        return {
          storeId: so.storeId,
          storeName: store?.name || 'Unknown',
          region: store?.region || 'Unknown',
          country: store?.country || 'Unknown',
          city: store?.city || 'Unknown',
          orderCount: so._count,
          totalRevenue: revenue,
          avgOrderValue
        };
      }).sort((a, b) => b.totalRevenue - a.totalRevenue);

      return { stores: performance };
    } catch (error) {
      console.error('Error fetching store performance:', error);
      throw new HttpException('Failed to fetch store performance', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('/orders/analytics/peak-hours')
  async getPeakHours(@Query() q: Record<string, unknown>) {
    try {
      const w = makeWhere(parseScope(q)) as Record<string, unknown>;
      const where: Record<string, unknown> = { ...(w || {}) };

      // Handle store filtering
      if (where.store) {
        where.Store = { is: where.store };
        delete where.store;
      }

      // Default to last 30 days
      const days = q.days ? parseInt(String(q.days), 10) : 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: startDate };

      const orders = await this.prisma.order.findMany({
        where,
        select: { createdAt: true }
      });

      // Group by hour
      const hourlyData: Record<number, number> = {};
      for (let i = 0; i < 24; i++) {
        hourlyData[i] = 0;
      }

      orders.forEach(order => {
        const hour = order.createdAt.getHours();
        hourlyData[hour]++;
      });

      const peakHours = Object.entries(hourlyData).map(([hour, count]) => ({
        hour: parseInt(hour),
        orderCount: count
      })).sort((a, b) => b.orderCount - a.orderCount);

      return { peakHours };
    } catch (error) {
      console.error('Error fetching peak hours:', error);
      throw new HttpException('Failed to fetch peak hours', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch('/orders/:id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    try {
      // Validate order exists
      const existingOrder = await this.prisma.order.findUnique({
        where: { id }
      });

      if (!existingOrder) {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }

      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        'PENDING': ['PREPARING', 'CANCELLED'],
        'PREPARING': ['READY', 'CANCELLED'],
        'READY': ['COMPLETED', 'CANCELLED'],
        'COMPLETED': [],
        'CANCELLED': []
      };

      const allowedStatuses = validTransitions[existingOrder.status] || [];
      if (!allowedStatuses.includes(dto.status)) {
        throw new HttpException(
          `Cannot transition from ${existingOrder.status} to ${dto.status}`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Update order status
      const order = await this.prisma.order.update({
        where: { id },
        data: { status: dto.status },
        include: {
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
              email: true
            }
          },
          items: {
            include: {
              MenuItem: {
                select: {
                  id: true,
                  name: true,
                  price: true
                }
              }
            }
          }
        }
      });

      // Emit telemetry event
      await this.prisma.telemetryEvent.create({
        data: {
          eventType: 'order.status_updated',
          userId: order.userId || 'system',
          properties: JSON.stringify({
            orderId: id,
            oldStatus: existingOrder.status,
            newStatus: dto.status
          })
        }
      });

      return {
        ...order,
        total: Number(order.total),
        items: order.items.map(item => ({
          ...item,
          price: Number(item.price),
          subtotal: Number(item.subtotal),
          MenuItem: {
            ...item.MenuItem,
            price: Number(item.MenuItem.price)
          }
        }))
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error updating order status:', error);
      throw new HttpException('Failed to update order status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
