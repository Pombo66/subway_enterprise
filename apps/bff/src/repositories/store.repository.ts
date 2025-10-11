import { Injectable } from '@nestjs/common';
import { PrismaClient, Store } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface StoreFilters {
  region?: string;
  country?: string;
  city?: string;
  storeId?: string;
  limit?: number;
  offset?: number;
}

export interface CreateStoreData {
  name: string;
  country: string;
  region: string;
}

export interface StoreRepository {
  findMany(filters: StoreFilters): Promise<Store[]>;
  findById(id: string): Promise<Store | null>;
  create(data: CreateStoreData): Promise<Store>;
  update(id: string, data: Partial<CreateStoreData>): Promise<Store>;
  delete(id: string): Promise<void>;
  count(filters?: Omit<StoreFilters, 'limit' | 'offset'>): Promise<number>;
}

@Injectable()
export class PrismaStoreRepository extends BaseRepository implements StoreRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findMany(filters: StoreFilters): Promise<Store[]> {
    const where = this.buildWhereClause(filters);
    const pagination = this.buildPaginationOptions(filters.limit, filters.offset);

    return this.prisma.store.findMany({
      where,
      select: {
        id: true,
        name: true,
        country: true,
        region: true,
        city: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      ...pagination,
    });
  }

  async findById(id: string): Promise<Store | null> {
    return this.prisma.store.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        country: true,
        region: true,
        city: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(data: CreateStoreData): Promise<Store> {
    return this.prisma.store.create({
      data,
      select: {
        id: true,
        name: true,
        country: true,
        region: true,
        city: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(id: string, data: Partial<CreateStoreData>): Promise<Store> {
    return this.prisma.store.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        country: true,
        region: true,
        city: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.store.delete({
      where: { id },
    });
  }

  async count(filters?: Omit<StoreFilters, 'limit' | 'offset'>): Promise<number> {
    const where = this.buildWhereClause(filters || {});
    return this.prisma.store.count({ where });
  }

  private buildWhereClause(filters: StoreFilters) {
    const where: Record<string, unknown> = {};

    if (filters.storeId) {
      where.id = filters.storeId;
    }

    if (filters.country) {
      where.country = {
        equals: filters.country,
        mode: 'insensitive',
      };
    }

    if (filters.region) {
      where.region = {
        equals: filters.region,
        mode: 'insensitive',
      };
    }

    if (filters.city) {
      where.city = {
        equals: filters.city,
        mode: 'insensitive',
      };
    }

    return where;
  }
}