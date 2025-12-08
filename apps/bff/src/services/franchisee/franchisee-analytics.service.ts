import { Injectable } from '@nestjs/common';
import { PrismaClient, Franchisee } from '@prisma/client';

export interface PerformanceMetrics {
  revenuePerStore: number;
  growthRate: number;
  storeRetention: number;
  operationalCompliance: number;
  customerSatisfaction: number;
}

export interface TrendData {
  month: string;
  revenue: number;
  storeCount: number;
  avgRevenuePerStore: number;
}

@Injectable()
export class FranchiseeAnalyticsService {
  constructor(private prisma: PrismaClient) {}

  async calculatePerformanceScore(franchiseeId: string): Promise<number> {
    const franchisee = await this.prisma.franchisee.findUnique({
      where: { id: franchiseeId },
      include: {
        stores: {
          include: {
            Orders: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
                },
              },
            },
          },
        },
      },
    });

    if (!franchisee || franchisee.stores.length === 0) return 0;

    const metrics = await this.getPerformanceMetrics(franchiseeId);
    const benchmarks = await this.getBenchmarks();

    // Weighted scoring
    const weights = {
      revenuePerStore: 0.30,
      growthRate: 0.25,
      storeRetention: 0.20,
      operationalCompliance: 0.15,
      customerSatisfaction: 0.10,
    };

    const scores = {
      revenuePerStore: this.normalizeScore(metrics.revenuePerStore, benchmarks.avgRevenue),
      growthRate: this.normalizeScore(metrics.growthRate, benchmarks.avgGrowthRate, true),
      storeRetention: metrics.storeRetention * 100,
      operationalCompliance: metrics.operationalCompliance,
      customerSatisfaction: metrics.customerSatisfaction,
    };

    const totalScore = Object.entries(weights).reduce((total, [key, weight]) => {
      return total + (scores[key as keyof typeof scores] * weight);
    }, 0);

    return Math.round(Math.min(100, Math.max(0, totalScore)));
  }

  async calculateExpansionScore(franchiseeId: string): Promise<number> {
    const franchisee = await this.prisma.franchisee.findUnique({
      where: { id: franchiseeId },
      include: { stores: true },
    });

    if (!franchisee) return 0;

    const performanceScore = franchisee.performanceScore || await this.calculatePerformanceScore(franchiseeId);
    const financialCapacity = await this.assessFinancialCapacity(franchisee);
    const operationalCapacity = await this.assessOperationalCapacity(franchisee);
    const trackRecord = await this.assessTrackRecord(franchisee);
    const marketOpportunity = 75; // Simplified for now

    const weights = {
      performanceScore: 0.35,
      financialCapacity: 0.25,
      operationalCapacity: 0.20,
      trackRecord: 0.15,
      marketOpportunity: 0.05,
    };

    const score = 
      performanceScore * weights.performanceScore +
      financialCapacity * weights.financialCapacity +
      operationalCapacity * weights.operationalCapacity +
      trackRecord * weights.trackRecord +
      marketOpportunity * weights.marketOpportunity;

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  async calculateRiskScore(franchiseeId: string): Promise<number> {
    const franchisee = await this.prisma.franchisee.findUnique({
      where: { id: franchiseeId },
      include: {
        stores: {
          include: {
            Orders: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
                },
              },
            },
          },
        },
      },
    });

    if (!franchisee) return 0;

    const metrics = await this.getPerformanceMetrics(franchiseeId);
    const performanceScore = franchisee.performanceScore || await this.calculatePerformanceScore(franchiseeId);

    let riskScore = 0;

    // Revenue decline
    if (metrics.growthRate < -5) riskScore += 30;
    else if (metrics.growthRate < 0) riskScore += 15;

    // High closure rate
    const closureRate = 1 - metrics.storeRetention;
    if (closureRate > 0.1) riskScore += 25;
    else if (closureRate > 0.05) riskScore += 10;

    // Low performance
    if (performanceScore < 50) riskScore += 20;
    else if (performanceScore < 70) riskScore += 10;

    // Financial stress (simplified)
    if (franchisee.totalRevenue && franchisee.totalRevenue < 100000 * franchisee.totalStores) {
      riskScore += 15;
    }

    // Compliance issues
    if (metrics.operationalCompliance < 70) riskScore += 10;

    return Math.min(100, riskScore);
  }

  async getPerformanceTrends(franchiseeId: string): Promise<TrendData[]> {
    const franchisee = await this.prisma.franchisee.findUnique({
      where: { id: franchiseeId },
      include: {
        stores: {
          include: {
            Orders: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
                },
              },
            },
          },
        },
      },
    });

    if (!franchisee) return [];

    const trends: TrendData[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthRevenue = franchisee.stores.reduce((sum, store) => {
        const storeRevenue = store.Orders
          .filter(o => o.createdAt >= monthStart && o.createdAt <= monthEnd)
          .reduce((orderSum, order) => orderSum + Number(order.total), 0);
        return sum + storeRevenue;
      }, 0);

      const activeStores = franchisee.stores.filter(s => 
        s.status === 'ACTIVE' && 
        (!s.openedAt || s.openedAt <= monthEnd)
      ).length;

      trends.push({
        month: monthStart.toISOString().slice(0, 7),
        revenue: monthRevenue,
        storeCount: activeStores,
        avgRevenuePerStore: activeStores > 0 ? monthRevenue / activeStores : 0,
      });
    }

    return trends;
  }

  private async getPerformanceMetrics(franchiseeId: string): Promise<PerformanceMetrics> {
    const franchisee = await this.prisma.franchisee.findUnique({
      where: { id: franchiseeId },
      include: {
        stores: {
          include: {
            Orders: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
                },
              },
            },
          },
        },
      },
    });

    if (!franchisee || franchisee.stores.length === 0) {
      return {
        revenuePerStore: 0,
        growthRate: 0,
        storeRetention: 1,
        operationalCompliance: 80,
        customerSatisfaction: 75,
      };
    }

    const activeStores = franchisee.stores.filter(s => s.status === 'ACTIVE');
    const totalRevenue = franchisee.stores.reduce((sum, store) => {
      const storeRevenue = store.Orders.reduce((orderSum, order) => {
        return orderSum + Number(order.total);
      }, 0);
      return sum + storeRevenue;
    }, 0);

    const revenuePerStore = activeStores.length > 0 ? totalRevenue / activeStores.length : 0;

    // Calculate growth rate
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const recentRevenue = franchisee.stores.reduce((sum, store) => {
      const storeRevenue = store.Orders
        .filter(o => o.createdAt >= sixMonthsAgo)
        .reduce((orderSum, order) => orderSum + Number(order.total), 0);
      return sum + storeRevenue;
    }, 0);

    const previousRevenue = totalRevenue - recentRevenue;
    const growthRate = previousRevenue > 0 
      ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    const storeRetention = franchisee.totalStores > 0 
      ? activeStores.length / franchisee.totalStores 
      : 1;

    return {
      revenuePerStore,
      growthRate,
      storeRetention,
      operationalCompliance: 80, // Simplified
      customerSatisfaction: 75, // Simplified
    };
  }

  private async getBenchmarks() {
    const allFranchisees = await this.prisma.franchisee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        stores: {
          include: {
            Orders: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
                },
              },
            },
          },
        },
      },
    });

    if (allFranchisees.length === 0) {
      return { avgRevenue: 500000, avgGrowthRate: 10 };
    }

    const revenues = allFranchisees.map(f => {
      const totalRevenue = f.stores.reduce((sum, store) => {
        const storeRevenue = store.Orders.reduce((orderSum, order) => {
          return orderSum + Number(order.total);
        }, 0);
        return sum + storeRevenue;
      }, 0);
      const activeStores = f.stores.filter(s => s.status === 'ACTIVE').length;
      return activeStores > 0 ? totalRevenue / activeStores : 0;
    });

    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;

    return {
      avgRevenue,
      avgGrowthRate: 10, // Simplified
    };
  }

  private normalizeScore(value: number, benchmark: number, allowNegative = false): number {
    if (benchmark === 0) return 50;
    const ratio = value / benchmark;
    const score = ratio * 100;
    return allowNegative ? score : Math.max(0, score);
  }

  private async assessFinancialCapacity(franchisee: Franchisee): Promise<number> {
    // Simplified: based on revenue per store
    if (!franchisee.avgStoreRevenue) return 50;
    
    if (franchisee.avgStoreRevenue > 600000) return 90;
    if (franchisee.avgStoreRevenue > 400000) return 75;
    if (franchisee.avgStoreRevenue > 200000) return 60;
    return 40;
  }

  private async assessOperationalCapacity(franchisee: Franchisee): Promise<number> {
    // Based on current store count and management capability
    if (franchisee.totalStores === 0) return 50;
    if (franchisee.totalStores >= 10) return 90;
    if (franchisee.totalStores >= 5) return 75;
    if (franchisee.totalStores >= 3) return 60;
    return 50;
  }

  private async assessTrackRecord(franchisee: Franchisee): Promise<number> {
    const yearsInBusiness = franchisee.yearsExperience || 
      Math.floor((Date.now() - franchisee.joinedDate.getTime()) / (365 * 24 * 60 * 60 * 1000));
    
    if (yearsInBusiness >= 10) return 90;
    if (yearsInBusiness >= 5) return 75;
    if (yearsInBusiness >= 3) return 60;
    if (yearsInBusiness >= 1) return 50;
    return 30;
  }
}
