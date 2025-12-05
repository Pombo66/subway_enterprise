import { Body, Controller, Get, Post, Put, Delete, Query, Param, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { StoreService } from '../services/store.service';
import { CreateStoreDto, UpdateStoreDto, StoreQueryDto } from '../dto/store.dto';
import { ValidationError } from '../errors/validation.error';
import { parseScope } from '../util/scope';
import { createAuditUtil } from '../util/audit.util';

@Controller()
export class StoresController {
  constructor(
    private readonly storeService: StoreService,
    @Inject(PrismaClient) private readonly prisma: PrismaClient
  ) {}

  @Get('/stores')
  async list(@Query() query: StoreQueryDto) {
    try {
      const scope = parseScope(query as Record<string, unknown>);
      const filters = {
        region: scope.region,
        country: scope.country,
        city: query.city,
        status: query.status,
        storeId: scope.storeId,
        limit: query.take ? Number(query.take) : undefined,
        offset: query.skip ? Number(query.skip) : undefined,
      };

      const stores = await this.storeService.getStores(filters);
      return stores;
    } catch (error) {
      console.error('Error in GET /stores:', error);
      if (error instanceof ValidationError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('/stores')
  async create(@Body() createStoreDto: CreateStoreDto) {
    try {
      const store = await this.storeService.createStore(createStoreDto);
      
      // Create audit trail
      const auditUtil = createAuditUtil(this.prisma);
      await auditUtil.createAuditEntryWithTelemetry({
        actor: 'system', // In a real app, this would come from the authenticated user
        entity: 'Store',
        entityId: store.id,
        action: 'CREATE',
        newData: store as any,
        metadata: { source: 'admin_dashboard' }
      }, {
        eventType: 'store_created',
        properties: {
          storeId: store.id,
          storeName: store.name,
          region: store.region,
          country: store.country,
          city: store.city
        }
      });
      
      return { ok: true, store };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { ok: false, error: error.message };
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('/stores/:id')
  async update(@Param('id') id: string, @Body() updateStoreDto: UpdateStoreDto) {
    try {
      // Get existing store for audit trail
      const existingStore = await this.prisma.store.findUnique({
        where: { id }
      });

      const store = await this.storeService.updateStore(id, updateStoreDto);
      
      // Create audit trail
      const auditUtil = createAuditUtil(this.prisma);
      await auditUtil.createAuditEntryWithTelemetry({
        actor: 'system', // In a real app, this would come from the authenticated user
        entity: 'Store',
        entityId: id,
        action: 'UPDATE',
        oldData: existingStore || undefined,
        newData: store as any,
        metadata: { source: 'admin_dashboard' }
      }, {
        eventType: 'store_updated',
        properties: {
          storeId: id,
          storeName: store.name,
          updatedFields: Object.keys(updateStoreDto)
        }
      });
      
      return { ok: true, store };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { ok: false, error: error.message };
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('/stores/:id')
  async delete(@Param('id') id: string) {
    try {
      // Get existing store for audit trail
      const existingStore = await this.prisma.store.findUnique({
        where: { id }
      });

      await this.storeService.deleteStore(id);
      
      // Create audit trail
      const auditUtil = createAuditUtil(this.prisma);
      await auditUtil.createAuditEntryWithTelemetry({
        actor: 'system', // In a real app, this would come from the authenticated user
        entity: 'Store',
        entityId: id,
        action: 'DELETE',
        oldData: existingStore || undefined,
        metadata: { source: 'admin_dashboard' }
      }, {
        eventType: 'store_deleted',
        properties: {
          storeId: id,
          storeName: existingStore?.name
        }
      });
      
      return { ok: true };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { ok: false, error: error.message };
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('/stores/:id')
  async getById(@Param('id') id: string) {
    try {
      const store = await this.storeService.getStoreById(id);
      if (!store) {
        throw new HttpException('Store not found', HttpStatus.NOT_FOUND);
      }
      return store;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Store Orders
  @Get('/stores/:id/orders')
  async getStoreOrders(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string
  ) {
    try {
      const where: any = { storeId: id };
      if (status) {
        where.status = status;
      }

      const orders = await this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              MenuItem: true
            }
          },
          User: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit) : 50
      });

      return orders;
    } catch (error) {
      console.error('Error fetching store orders:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Store Performance Analytics
  @Get('/stores/:id/performance')
  async getStorePerformance(@Param('id') id: string, @Query('days') days?: string) {
    try {
      const daysAgo = days ? parseInt(days) : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Get order statistics
      const orders = await this.prisma.order.findMany({
        where: {
          storeId: id,
          createdAt: { gte: startDate }
        },
        select: {
          id: true,
          total: true,
          status: true,
          createdAt: true
        }
      });

      // Calculate metrics
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Status breakdown
      const statusBreakdown = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Daily trends
      const dailyTrends = orders.reduce((acc, order) => {
        const date = order.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, orders: 0, revenue: 0 };
        }
        acc[date].orders++;
        acc[date].revenue += Number(order.total);
        return acc;
      }, {} as Record<string, { date: string; orders: number; revenue: number }>);

      return {
        summary: {
          totalOrders,
          totalRevenue,
          avgOrderValue,
          statusBreakdown
        },
        trends: Object.values(dailyTrends).sort((a, b) => a.date.localeCompare(b.date))
      };
    } catch (error) {
      console.error('Error fetching store performance:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Store Staff Management
  @Get('/stores/:id/staff')
  async getStoreStaff(@Param('id') id: string) {
    try {
      const staff = await this.prisma.storeStaff.findMany({
        where: { storeId: id },
        include: {
          User: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              active: true
            }
          }
        },
        orderBy: { assignedAt: 'desc' }
      });

      return staff;
    } catch (error) {
      console.error('Error fetching store staff:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('/stores/:id/staff')
  async assignStaff(@Param('id') id: string, @Body() body: { userId: string; role?: string }) {
    try {
      // Check if store exists
      const store = await this.prisma.store.findUnique({ where: { id } });
      if (!store) {
        throw new HttpException('Store not found', HttpStatus.NOT_FOUND);
      }

      // Check if user exists
      const user = await this.prisma.user.findUnique({ where: { id: body.userId } });
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Create or update assignment
      const assignment = await this.prisma.storeStaff.upsert({
        where: {
          storeId_userId: {
            storeId: id,
            userId: body.userId
          }
        },
        create: {
          storeId: id,
          userId: body.userId,
          role: body.role || 'STAFF'
        },
        update: {
          role: body.role || 'STAFF'
        },
        include: {
          User: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      });

      return { ok: true, assignment };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error assigning staff:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('/stores/:id/staff/:userId')
  async removeStaff(@Param('id') id: string, @Param('userId') userId: string) {
    try {
      await this.prisma.storeStaff.delete({
        where: {
          storeId_userId: {
            storeId: id,
            userId
          }
        }
      });

      return { ok: true };
    } catch (error) {
      console.error('Error removing staff:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Store Photos
  @Get('/stores/:id/photos')
  async getStorePhotos(@Param('id') id: string) {
    try {
      const photos = await this.prisma.storePhoto.findMany({
        where: { storeId: id },
        orderBy: { sortOrder: 'asc' }
      });

      return photos;
    } catch (error) {
      console.error('Error fetching store photos:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('/stores/:id/photos')
  async addStorePhoto(@Param('id') id: string, @Body() body: { url: string; caption?: string }) {
    try {
      // Get max sort order
      const maxOrder = await this.prisma.storePhoto.findFirst({
        where: { storeId: id },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true }
      });

      const photo = await this.prisma.storePhoto.create({
        data: {
          storeId: id,
          url: body.url,
          caption: body.caption,
          sortOrder: (maxOrder?.sortOrder || 0) + 1
        }
      });

      return { ok: true, photo };
    } catch (error) {
      console.error('Error adding store photo:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('/stores/:id/photos/:photoId')
  async deleteStorePhoto(@Param('id') id: string, @Param('photoId') photoId: string) {
    try {
      await this.prisma.storePhoto.delete({
        where: { id: photoId, storeId: id }
      });

      return { ok: true };
    } catch (error) {
      console.error('Error deleting store photo:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Operating Hours
  @Get('/stores/:id/hours')
  async getStoreHours(@Param('id') id: string) {
    try {
      const store = await this.prisma.store.findUnique({
        where: { id },
        select: { operatingHours: true }
      });

      if (!store) {
        throw new HttpException('Store not found', HttpStatus.NOT_FOUND);
      }

      return {
        operatingHours: store.operatingHours ? JSON.parse(store.operatingHours) : null
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error fetching store hours:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('/stores/:id/hours')
  async updateStoreHours(@Param('id') id: string, @Body() body: { operatingHours: any }) {
    try {
      const store = await this.prisma.store.update({
        where: { id },
        data: {
          operatingHours: JSON.stringify(body.operatingHours)
        }
      });

      return { ok: true, operatingHours: JSON.parse(store.operatingHours || '{}') };
    } catch (error) {
      console.error('Error updating store hours:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
