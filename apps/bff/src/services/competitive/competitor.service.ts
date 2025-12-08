import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface CompetitorFilters {
  brand?: string;
  category?: string;
  country?: string;
  city?: string;
  boundingBox?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  radiusKm?: number;
  centerLat?: number;
  centerLng?: number;
}

@Injectable()
export class CompetitorService {
  constructor(private prisma: PrismaClient) {}

  async getCompetitors(filters: CompetitorFilters = {}) {
    const where: any = {
      isActive: true,
    };

    if (filters.brand) {
      where.brand = filters.brand;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.country) {
      where.country = filters.country;
    }

    if (filters.city) {
      where.city = filters.city;
    }

    if (filters.boundingBox) {
      const { north, south, east, west } = filters.boundingBox;
      where.latitude = { gte: south, lte: north };
      where.longitude = { gte: west, lte: east };
    }

    const competitors = await this.prisma.competitorPlace.findMany({
      where,
      orderBy: { lastVerified: 'desc' },
    });

    // Filter by radius if specified
    if (filters.radiusKm && filters.centerLat && filters.centerLng) {
      return competitors.filter(c => {
        const distance = this.calculateDistance(
          filters.centerLat!,
          filters.centerLng!,
          c.latitude,
          c.longitude
        );
        return distance <= filters.radiusKm!;
      });
    }

    return competitors;
  }

  async getCompetitorById(id: string) {
    return this.prisma.competitorPlace.findUnique({
      where: { id },
    });
  }

  async createCompetitor(data: any) {
    return this.prisma.competitorPlace.create({
      data: {
        ...data,
        sources: JSON.stringify(data.sources || ['manual']),
      },
    });
  }

  async updateCompetitor(id: string, data: any) {
    return this.prisma.competitorPlace.update({
      where: { id },
      data: {
        ...data,
        lastVerified: new Date(),
      },
    });
  }

  async deactivateCompetitor(id: string) {
    return this.prisma.competitorPlace.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getCompetitorStats(filters: CompetitorFilters = {}) {
    const competitors = await this.getCompetitors(filters);

    const byBrand: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    competitors.forEach(c => {
      byBrand[c.brand] = (byBrand[c.brand] || 0) + 1;
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
    });

    return {
      total: competitors.length,
      byBrand,
      byCategory,
      brands: Object.keys(byBrand).sort(),
      categories: Object.keys(byCategory).sort(),
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
