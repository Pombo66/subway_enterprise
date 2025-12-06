import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface StoreContext {
  store: {
    id: string;
    name: string;
    city: string;
    country: string;
    region: string;
    openedAt: Date | null;
    coordinates: { lat: number | null; lng: number | null };
    status: string | null;
  };
  performance: {
    annualRevenue: number | null;
    monthlyAverage: number | null;
    recentOrderCount: number;
    trend: 'improving' | 'declining' | 'stable' | 'unknown';
  };
  location: {
    populationBand: string | null;
    urbanDensity: number | null;
    coordinates: { lat: number | null; lng: number | null };
  };
  network: {
    nearbyStores: Array<{
      id: string;
      distance: number;
      city: string;
      revenue: number | null;
    }>;
    regionalAverage: number;
    regionalMedian: number;
    regionalStoreCount: number;
  };
  franchisee: {
    name: string | null;
    storeCount: number;
    avgPerformance: number | null;
    otherStores: Array<{
      id: string;
      city: string;
      revenue: number | null;
    }>;
  };
}

export interface NetworkContext {
  totalStores: number;
  region?: string;
  stores: Array<{
    id: string;
    city: string;
    revenue: number | null;
    populationBand: string | null;
    franchisee: string | null;
    openedAt: Date | null;
    coordinates: { lat: number | null; lng: number | null };
  }>;
  aggregates: {
    avgRevenue: number;
    medianRevenue: number;
    topPerformers: Array<{ id: string; city: string; revenue: number }>;
    bottomPerformers: Array<{ id: string; city: string; revenue: number }>;
  };
}

/**
 * Store Context Builder Service
 * Gathers comprehensive data about stores for AI analysis
 * Does NOT modify any existing data - read-only service
 */
@Injectable()
export class StoreContextBuilderService {
  private readonly logger = new Logger(StoreContextBuilderService.name);

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Build comprehensive context for a single store
   */
  async buildStoreContext(storeId: string): Promise<StoreContext> {
    this.logger.log(`Building context for store ${storeId}`);

    try {
      // Fetch store with related data
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        include: {
          Orders: {
            take: 100,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!store) {
        throw new Error(`Store ${storeId} not found`);
      }

      // Fetch related data in parallel
      const [nearbyStores, regionalMetrics, franchiseeData] = await Promise.all([
        this.getNearbyStores(store.latitude, store.longitude, 10),
        this.getRegionalMetrics(store.region, store.country),
        this.getFranchiseeData(store.ownerName)
      ]);

      // Calculate performance trend
      const trend = this.calculateTrend(store.Orders);

      return {
        store: {
          id: store.id,
          name: store.name,
          city: store.city || 'Unknown',
          country: store.country || 'Unknown',
          region: store.region || 'Unknown',
          openedAt: store.openedAt,
          coordinates: { lat: store.latitude, lng: store.longitude },
          status: store.status
        },
        performance: {
          annualRevenue: store.annualTurnover,
          monthlyAverage: store.annualTurnover ? store.annualTurnover / 12 : null,
          recentOrderCount: store.Orders.length,
          trend
        },
        location: {
          populationBand: store.cityPopulationBand,
          urbanDensity: null, // TODO: Add when available
          coordinates: { lat: store.latitude, lng: store.longitude }
        },
        network: {
          nearbyStores,
          regionalAverage: regionalMetrics.avgRevenue,
          regionalMedian: regionalMetrics.medianRevenue,
          regionalStoreCount: regionalMetrics.storeCount
        },
        franchisee: franchiseeData
      };
    } catch (error) {
      this.logger.error(`Failed to build context for store ${storeId}:`, error);
      throw error;
    }
  }

  /**
   * Build network-wide context for pattern analysis
   */
  async buildNetworkContext(region?: string): Promise<NetworkContext> {
    this.logger.log(`Building network context${region ? ` for region ${region}` : ''}`);

    try {
      const where: any = {};
      if (region) {
        where.region = region;
      }

      const stores = await this.prisma.store.findMany({
        where,
        select: {
          id: true,
          city: true,
          annualTurnover: true,
          cityPopulationBand: true,
          ownerName: true,
          openedAt: true,
          latitude: true,
          longitude: true
        }
      });

      // Calculate aggregates
      const revenues = stores
        .map(s => s.annualTurnover)
        .filter((r): r is number => r !== null)
        .sort((a, b) => a - b);

      const avgRevenue = revenues.length > 0
        ? revenues.reduce((sum, r) => sum + r, 0) / revenues.length
        : 0;

      const medianRevenue = revenues.length > 0
        ? revenues[Math.floor(revenues.length / 2)]
        : 0;

      // Get top and bottom performers
      const storesWithRevenue = stores
        .filter(s => s.annualTurnover !== null)
        .sort((a, b) => (b.annualTurnover || 0) - (a.annualTurnover || 0));

      const topPerformers = storesWithRevenue.slice(0, 10).map(s => ({
        id: s.id,
        city: s.city || 'Unknown',
        revenue: s.annualTurnover!
      }));

      const bottomPerformers = storesWithRevenue.slice(-10).reverse().map(s => ({
        id: s.id,
        city: s.city || 'Unknown',
        revenue: s.annualTurnover!
      }));

      return {
        totalStores: stores.length,
        region,
        stores: stores.map(s => ({
          id: s.id,
          city: s.city || 'Unknown',
          revenue: s.annualTurnover,
          populationBand: s.cityPopulationBand,
          franchisee: s.ownerName,
          openedAt: s.openedAt,
          coordinates: { lat: s.latitude, lng: s.longitude }
        })),
        aggregates: {
          avgRevenue,
          medianRevenue,
          topPerformers,
          bottomPerformers
        }
      };
    } catch (error) {
      this.logger.error('Failed to build network context:', error);
      throw error;
    }
  }

  /**
   * Get nearby stores using simple distance calculation
   */
  private async getNearbyStores(
    lat: number | null,
    lng: number | null,
    radiusKm: number
  ): Promise<Array<{ id: string; distance: number; city: string; revenue: number | null }>> {
    if (!lat || !lng) {
      return [];
    }

    try {
      // Get all stores and calculate distances
      const allStores = await this.prisma.store.findMany({
        select: {
          id: true,
          city: true,
          latitude: true,
          longitude: true,
          annualTurnover: true
        }
      });

      const nearby = allStores
        .filter(s => s.latitude && s.longitude)
        .map(s => ({
          id: s.id,
          city: s.city || 'Unknown',
          revenue: s.annualTurnover,
          distance: this.calculateDistance(lat, lng, s.latitude!, s.longitude!)
        }))
        .filter(s => s.distance <= radiusKm && s.distance > 0) // Exclude self
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10); // Top 10 nearest

      return nearby;
    } catch (error) {
      this.logger.warn('Failed to get nearby stores:', error);
      return [];
    }
  }

  /**
   * Get regional metrics
   */
  private async getRegionalMetrics(
    region: string | null,
    country: string | null
  ): Promise<{ avgRevenue: number; medianRevenue: number; storeCount: number }> {
    try {
      const where: any = {};
      if (region) where.region = region;
      if (country) where.country = country;

      const stores = await this.prisma.store.findMany({
        where,
        select: { annualTurnover: true }
      });

      const revenues = stores
        .map(s => s.annualTurnover)
        .filter((r): r is number => r !== null)
        .sort((a, b) => a - b);

      const avgRevenue = revenues.length > 0
        ? revenues.reduce((sum, r) => sum + r, 0) / revenues.length
        : 0;

      const medianRevenue = revenues.length > 0
        ? revenues[Math.floor(revenues.length / 2)]
        : 0;

      return {
        avgRevenue,
        medianRevenue,
        storeCount: stores.length
      };
    } catch (error) {
      this.logger.warn('Failed to get regional metrics:', error);
      return { avgRevenue: 0, medianRevenue: 0, storeCount: 0 };
    }
  }

  /**
   * Get franchisee data
   */
  private async getFranchiseeData(ownerName: string | null): Promise<{
    name: string | null;
    storeCount: number;
    avgPerformance: number | null;
    otherStores: Array<{ id: string; city: string; revenue: number | null }>;
  }> {
    if (!ownerName) {
      return {
        name: null,
        storeCount: 0,
        avgPerformance: null,
        otherStores: []
      };
    }

    try {
      const stores = await this.prisma.store.findMany({
        where: { ownerName },
        select: {
          id: true,
          city: true,
          annualTurnover: true
        }
      });

      const revenues = stores
        .map(s => s.annualTurnover)
        .filter((r): r is number => r !== null);

      const avgPerformance = revenues.length > 0
        ? revenues.reduce((sum, r) => sum + r, 0) / revenues.length
        : null;

      return {
        name: ownerName,
        storeCount: stores.length,
        avgPerformance,
        otherStores: stores.map(s => ({
          id: s.id,
          city: s.city || 'Unknown',
          revenue: s.annualTurnover
        }))
      };
    } catch (error) {
      this.logger.warn('Failed to get franchisee data:', error);
      return {
        name: ownerName,
        storeCount: 0,
        avgPerformance: null,
        otherStores: []
      };
    }
  }

  /**
   * Calculate performance trend from recent orders
   */
  private calculateTrend(orders: any[]): 'improving' | 'declining' | 'stable' | 'unknown' {
    if (orders.length < 10) {
      return 'unknown';
    }

    // Split orders into two halves
    const midpoint = Math.floor(orders.length / 2);
    const recentHalf = orders.slice(0, midpoint);
    const olderHalf = orders.slice(midpoint);

    const recentAvg = recentHalf.reduce((sum, o) => sum + Number(o.total), 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((sum, o) => sum + Number(o.total), 0) / olderHalf.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
