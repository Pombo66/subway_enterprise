import { Controller, Get, Post, Patch, Inject, Query, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { parseScope, makeWhere } from '../util/scope';

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
