import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

interface Store {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  annualTurnover: number | null;
  status: string | null;
  cityPopulationBand: string | null;
  openedAt: Date | null;
}

export interface PeerStore {
  storeId: string;
  storeName: string;
  city: string;
  country: string;
  revenue: number;
  similarity: number;
  selectionReason: string;
  distance?: number;
}

export interface BenchmarkResult {
  targetStore: {
    id: string;
    name: string;
    revenue: number | null;
  };
  peers: PeerStore[];
  peerAverage: number;
  performanceGap: number;
  performanceGapPercent: number;
  percentileRank: number;
  rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  insights: string;
  recommendations: string[];
}

@Injectable()
export class PeerBenchmarkingService {
  private openai: OpenAI;
  private model: string;

  constructor(private prisma: PrismaClient) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = process.env.STORE_ANALYSIS_MODEL || 'gpt-5.1';
  }

  async benchmarkStore(storeId: string): Promise<BenchmarkResult> {
    // Get target store
    const targetStore = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        Orders: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    });

    if (!targetStore) {
      throw new Error('Store not found');
    }

    // Calculate target store revenue
    const targetRevenue = targetStore.Orders.reduce(
      (sum, order) => sum + Number(order.total),
      0
    );

    // Find peer stores
    const peers = await this.findPeerStores(targetStore as any);

    // Calculate benchmarks
    const peerAverage = peers.reduce((sum, p) => sum + p.revenue, 0) / peers.length;
    const performanceGap = targetRevenue - peerAverage;
    const performanceGapPercent = peerAverage > 0 ? (performanceGap / peerAverage) * 100 : 0;

    // Calculate percentile rank
    const allRevenues = [...peers.map(p => p.revenue), targetRevenue].sort((a, b) => a - b);
    const rank = allRevenues.indexOf(targetRevenue);
    const percentileRank = (rank / allRevenues.length) * 100;

    // Determine rating
    let rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    if (percentileRank >= 75) rating = 'EXCELLENT';
    else if (percentileRank >= 50) rating = 'GOOD';
    else if (percentileRank >= 25) rating = 'FAIR';
    else rating = 'POOR';

    // Generate AI insights
    const { insights, recommendations } = await this.generateInsights(
      targetStore,
      targetRevenue,
      peers,
      performanceGap,
      performanceGapPercent,
      percentileRank
    );

    return {
      targetStore: {
        id: targetStore.id,
        name: targetStore.name,
        revenue: targetRevenue,
      },
      peers,
      peerAverage,
      performanceGap,
      performanceGapPercent,
      percentileRank,
      rating,
      insights,
      recommendations,
    };
  }

  private async findPeerStores(targetStore: Store): Promise<PeerStore[]> {
    // Get all stores in same region/country
    const allStores = await this.prisma.store.findMany({
      where: {
        id: { not: targetStore.id },
        status: 'ACTIVE',
        country: targetStore.country,
        annualTurnover: { not: null },
      },
      include: {
        Orders: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    });

    // Calculate similarity scores
    const scoredStores = allStores.map(store => {
      const revenue = store.Orders.reduce((sum, order) => sum + Number(order.total), 0);
      
      let similarity = 0;
      let reasons: string[] = [];

      // Same city population band (40%)
      if (store.cityPopulationBand === targetStore.cityPopulationBand) {
        similarity += 0.4;
        reasons.push('Similar city size');
      }

      // Same region (20%)
      if (store.region === targetStore.region) {
        similarity += 0.2;
        reasons.push('Same region');
      }

      // Similar age (20%)
      if (store.openedAt && targetStore.openedAt) {
        const ageDiff = Math.abs(
          store.openedAt.getTime() - targetStore.openedAt.getTime()
        ) / (365 * 24 * 60 * 60 * 1000);
        if (ageDiff < 2) {
          similarity += 0.2;
          reasons.push('Similar age');
        }
      }

      // Geographic proximity (20%)
      if (store.latitude && store.longitude && targetStore.latitude && targetStore.longitude) {
        const distance = this.calculateDistance(
          targetStore.latitude,
          targetStore.longitude,
          store.latitude,
          store.longitude
        );
        if (distance < 100) {
          similarity += 0.2 * (1 - distance / 100);
          reasons.push('Geographic proximity');
        }
      }

      return {
        storeId: store.id,
        storeName: store.name,
        city: store.city || 'Unknown',
        country: store.country || 'Unknown',
        revenue,
        similarity,
        selectionReason: reasons.join(', ') || 'Same country',
        distance: store.latitude && store.longitude && targetStore.latitude && targetStore.longitude
          ? this.calculateDistance(
              targetStore.latitude,
              targetStore.longitude,
              store.latitude,
              store.longitude
            )
          : undefined,
      };
    });

    // Sort by similarity and take top 10
    return scoredStores
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);
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

  private async generateInsights(
    store: any,
    revenue: number,
    peers: PeerStore[],
    gap: number,
    gapPercent: number,
    percentile: number
  ): Promise<{ insights: string; recommendations: string[] }> {
    const prompt = `You are an elite franchise performance analyst. Analyze this store's performance against its peers.

TARGET STORE:
- Name: ${store.name}
- City: ${store.city || 'Unknown'}
- Country: ${store.country || 'Unknown'}
- Annual Revenue: $${revenue.toFixed(0)}
- Percentile Rank: ${percentile.toFixed(1)}%

PEER COMPARISON:
- Number of Peers: ${peers.length}
- Peer Average Revenue: $${peers.reduce((s, p) => s + p.revenue, 0) / peers.length}
- Performance Gap: $${gap.toFixed(0)} (${gapPercent.toFixed(1)}%)

TOP PEERS:
${peers.slice(0, 5).map(p => `- ${p.storeName} (${p.city}): $${p.revenue.toFixed(0)} - ${p.selectionReason}`).join('\n')}

Provide analysis in JSON format:
{
  "insights": "2-3 sentence strategic assessment of performance vs peers",
  "recommendations": ["rec1", "rec2", "rec3"]
}

Be specific, data-driven, and actionable.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a franchise performance analyst. Provide structured analysis in valid JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content);
      return result;
    } catch (error) {
      console.error('AI insights error:', error);
      
      // Fallback
      return {
        insights: `This store ranks in the ${percentile.toFixed(0)}th percentile among peers, performing ${gapPercent > 0 ? 'above' : 'below'} average by ${Math.abs(gapPercent).toFixed(1)}%.`,
        recommendations: [
          'Review operational practices of top-performing peers',
          'Analyze local market conditions',
          'Assess franchisee performance',
        ],
      };
    }
  }
}
