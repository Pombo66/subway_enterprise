import { Injectable } from '@nestjs/common';
import { PrismaClient, Franchisee, Store } from '@prisma/client';

export interface CreateFranchiseeDto {
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  taxId?: string;
  joinedDate: Date;
  yearsExperience?: number;
  previousIndustry?: string;
}

export interface UpdateFranchiseeDto {
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  taxId?: string;
  yearsExperience?: number;
  previousIndustry?: string;
  status?: string;
}

export interface FranchiseeFilters {
  status?: string;
  minStores?: number;
  maxStores?: number;
  expansionReady?: boolean;
  sortBy?: 'performanceScore' | 'expansionScore' | 'totalStores' | 'totalRevenue';
  sortOrder?: 'asc' | 'desc';
}

export interface FranchiseeWithStores extends Franchisee {
  stores: Store[];
}

export interface FranchiseePortfolio {
  franchisee: Franchisee;
  stores: Store[];
  metrics: {
    totalRevenue: number;
    avgRevenuePerStore: number;
    activeStores: number;
    totalStores: number;
    revenueGrowth: number;
  };
}

@Injectable()
export class FranchiseeService {
  constructor(private prisma: PrismaClient) {}

  async createFranchisee(data: CreateFranchiseeDto): Promise<Franchisee> {
    return this.prisma.franchisee.create({
      data: {
        ...data,
        totalStores: 0,
        activeStores: 0,
      },
    });
  }

  async getFranchisee(id: string): Promise<FranchiseeWithStores | null> {
    return this.prisma.franchisee.findUnique({
      where: { id },
      include: {
        stores: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async listFranchisees(filters: FranchiseeFilters = {}): Promise<Franchisee[]> {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.minStores !== undefined) {
      where.totalStores = { ...where.totalStores, gte: filters.minStores };
    }

    if (filters.maxStores !== undefined) {
      where.totalStores = { ...where.totalStores, lte: filters.maxStores };
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy.performanceScore = 'desc';
    }

    return this.prisma.franchisee.findMany({
      where,
      orderBy,
    });
  }

  async updateFranchisee(id: string, data: UpdateFranchiseeDto): Promise<Franchisee> {
    return this.prisma.franchisee.update({
      where: { id },
      data,
    });
  }

  async assignStore(franchiseeId: string, storeId: string): Promise<void> {
    await this.prisma.store.update({
      where: { id: storeId },
      data: { franchiseeId },
    });

    // Recalculate franchisee metrics
    await this.recalculateMetrics(franchiseeId);
  }

  async unassignStore(storeId: string): Promise<void> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { franchiseeId: true },
    });

    if (store?.franchiseeId) {
      await this.prisma.store.update({
        where: { id: storeId },
        data: { franchiseeId: null },
      });

      await this.recalculateMetrics(store.franchiseeId);
    }
  }

  async getFranchiseePortfolio(id: string): Promise<FranchiseePortfolio | null> {
    const franchisee = await this.prisma.franchisee.findUnique({
      where: { id },
      include: {
        stores: {
          include: {
            Orders: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
                },
              },
            },
          },
        },
      },
    });

    if (!franchisee) return null;

    // Calculate metrics
    const totalRevenue = franchisee.stores.reduce((sum, store) => {
      const storeRevenue = store.Orders.reduce((orderSum, order) => {
        return orderSum + Number(order.total);
      }, 0);
      return sum + storeRevenue;
    }, 0);

    const activeStores = franchisee.stores.filter(s => s.status === 'ACTIVE').length;
    const avgRevenuePerStore = activeStores > 0 ? totalRevenue / activeStores : 0;

    // Calculate revenue growth (compare last 6 months vs previous 6 months)
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const recentRevenue = franchisee.stores.reduce((sum, store) => {
      const storeRevenue = store.Orders
        .filter(o => o.createdAt >= sixMonthsAgo)
        .reduce((orderSum, order) => orderSum + Number(order.total), 0);
      return sum + storeRevenue;
    }, 0);

    const previousRevenue = franchisee.stores.reduce((sum, store) => {
      const storeRevenue = store.Orders
        .filter(o => o.createdAt >= twelveMonthsAgo && o.createdAt < sixMonthsAgo)
        .reduce((orderSum, order) => orderSum + Number(order.total), 0);
      return sum + storeRevenue;
    }, 0);

    const revenueGrowth = previousRevenue > 0 
      ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    return {
      franchisee,
      stores: franchisee.stores,
      metrics: {
        totalRevenue,
        avgRevenuePerStore,
        activeStores,
        totalStores: franchisee.stores.length,
        revenueGrowth,
      },
    };
  }

  async recalculateMetrics(franchiseeId: string): Promise<void> {
    const portfolio = await this.getFranchiseePortfolio(franchiseeId);
    if (!portfolio) return;

    await this.prisma.franchisee.update({
      where: { id: franchiseeId },
      data: {
        totalStores: portfolio.metrics.totalStores,
        activeStores: portfolio.metrics.activeStores,
        totalRevenue: portfolio.metrics.totalRevenue,
        avgStoreRevenue: portfolio.metrics.avgRevenuePerStore,
      },
    });
  }

  async getTopPerformers(limit: number = 10): Promise<Franchisee[]> {
    return this.prisma.franchisee.findMany({
      where: {
        status: 'ACTIVE',
        performanceScore: { not: null },
      },
      orderBy: { performanceScore: 'desc' },
      take: limit,
    });
  }

  async getExpansionCandidates(): Promise<Franchisee[]> {
    return this.prisma.franchisee.findMany({
      where: {
        status: 'ACTIVE',
        expansionScore: { gte: 70 },
      },
      orderBy: { expansionScore: 'desc' },
    });
  }
}
