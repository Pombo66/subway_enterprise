import { PrismaClient } from '@prisma/client';

export abstract class BaseRepository {
  constructor(protected readonly prisma: PrismaClient) {}

  protected buildPaginationOptions(take?: number, skip?: number) {
    return {
      take: Math.min(take || 50, 5000), // Max 5000 items (increased for store listings)
      skip: skip || 0,
    };
  }

  protected buildOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    if (!sortBy) return { createdAt: 'desc' };
    return { [sortBy]: sortOrder };
  }
}