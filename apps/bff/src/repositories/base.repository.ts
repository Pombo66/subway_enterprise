import { PrismaClient } from '@prisma/client';

export abstract class BaseRepository {
  constructor(protected readonly prisma: PrismaClient) {}

  protected buildPaginationOptions(take?: number, skip?: number) {
    return {
      take: Math.min(take || 50, 100), // Max 100 items
      skip: skip || 0,
    };
  }

  protected buildOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    if (!sortBy) return { createdAt: 'desc' };
    return { [sortBy]: sortOrder };
  }
}