import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface CannibalizationImpact {
  affectedStores: Array<{
    storeId: string;
    storeName: string;
    currentRevenue: number;
    projectedLoss: number;
    lossPercentage: number;
    distance: number;
    marketOverlap: number;
  }>;
  totalNetworkLoss: number;
  netGain: number;
  isWorthOpening: boolean;
}

export interface Location {
  latitude: number;
  longitude: number;
  city?: string;
  population?: number;
  medianIncome?: number;
}

export interface Store {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  annualTurnover: number | null;
  cityPopulationBand: string | null;
}

@Injectable()
export class CannibalizationCalculatorService {
  constructor(private readonly prisma: PrismaClient) {}

  async calculateImpact(
    newStore: Location,
    existingStores: Store[],
    estimatedNewStoreRevenue: number
  ): Promise<CannibalizationImpact> {
    const affectedStores = [];

    for (const store of existingStores) {
      // Skip stores without coordinates
      if (!store.latitude || !store.longitude) continue;

      const distance = this.calculateDistance(
        newStore.latitude,
        newStore.longitude,
        store.latitude,
        store.longitude
      );

      // Only consider stores within 10km
      if (distance > 10) continue;

      const marketOverlap = this.calculateMarketOverlap(newStore, store);
      const projectedLoss = this.calculateRevenueLoss(
        store.annualTurnover || 0,
        distance,
        marketOverlap
      );

      if (projectedLoss > 0) {
        affectedStores.push({
          storeId: store.id,
          storeName: store.name,
          currentRevenue: store.annualTurnover || 0,
          projectedLoss,
          lossPercentage: ((projectedLoss / (store.annualTurnover || 1)) * 100),
          distance,
          marketOverlap
        });
      }
    }

    const totalNetworkLoss = affectedStores.reduce((sum, s) => sum + s.projectedLoss, 0);
    const netGain = estimatedNewStoreRevenue - totalNetworkLoss;

    return {
      affectedStores,
      totalNetworkLoss,
      netGain,
      isWorthOpening: netGain > 0
    };
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Haversine formula for distance between two points on Earth
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateMarketOverlap(newStore: Location, existingStore: Store): number {
    // Market overlap based on demographic similarity
    let overlap = 0.5; // Base overlap

    // Same city = higher overlap
    if (newStore.city && existingStore.city && newStore.city === existingStore.city) {
      overlap += 0.3;
    }

    // Similar population bands = higher overlap
    if (newStore.population && existingStore.cityPopulationBand) {
      const newStorePopBand = this.getPopulationBand(newStore.population);
      if (newStorePopBand === existingStore.cityPopulationBand) {
        overlap += 0.2;
      }
    }

    return Math.min(overlap, 1.0);
  }

  private getPopulationBand(population: number): string {
    if (population < 50000) return 'small';
    if (population < 200000) return 'medium';
    if (population < 500000) return 'large';
    return 'major';
  }

  private calculateRevenueLoss(
    storeRevenue: number,
    distance: number,
    marketOverlap: number
  ): number {
    // Cannibalization model: revenue loss decreases with distance
    const baseCannibalization = 0.40; // 40% at 0km
    const decayRate = 0.15; // per km

    // Exponential decay with distance
    const distanceFactor = Math.exp(-decayRate * distance);

    // Calculate loss
    const loss = storeRevenue * baseCannibalization * distanceFactor * marketOverlap;

    return Math.round(loss);
  }

  async calculateNetworkCannibalization(
    selectedStores: Array<{ latitude: number; longitude: number; estimatedRevenue: number }>,
    existingStores: Store[]
  ): Promise<number> {
    // Calculate total cannibalization across all selected stores
    let totalCannibalization = 0;

    for (const newStore of selectedStores) {
      const impact = await this.calculateImpact(
        newStore,
        existingStores,
        newStore.estimatedRevenue
      );
      totalCannibalization += impact.totalNetworkLoss;
    }

    return totalCannibalization;
  }
}
