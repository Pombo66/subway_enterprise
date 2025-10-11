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
        newData: store,
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
        newData: store,
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
}
