import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

export interface PerformanceCluster {
  id: string;
  name: string;
  description: string;
  storeCount: number;
  avgRevenue: number;
  characteristics: string[];
  stores: Array<{
    id: string;
    name: string;
    city: string;
    revenue: number;
  }>;
}

export interface ClusteringResult {
  clusters: PerformanceCluster[];
  targetStoreCluster: string;
  insights: string;
  patterns: string[];
  recommendations: string[];
}

@Injectable()
export class PerformanceClusteringService {
  private openai: OpenAI;
  private model: string;

  constructor(private prisma: PrismaClient) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = process.env.STORE_ANALYSIS_MODEL || 'gpt-5.2';
  }

  async clusterStores(targetStoreId?: string): Promise<ClusteringResult> {
    // Get all active stores with revenue data
    const stores = await this.prisma.store.findMany({
      where: {
        status: 'ACTIVE',
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

    // Calculate revenue for each store
    const storesWithRevenue = stores.map(store => ({
      id: store.id,
      name: store.name,
      city: store.city || 'Unknown',
      country: store.country || 'Unknown',
      region: store.region || 'Unknown',
      cityPopulationBand: store.cityPopulationBand,
      revenue: store.Orders.reduce((sum, order) => sum + Number(order.total), 0),
      latitude: store.latitude,
      longitude: store.longitude,
    })).filter(s => s.revenue > 0);

    // Perform clustering
    const clusters = this.performClustering(storesWithRevenue);

    // Find target store's cluster
    let targetStoreCluster = 'Unknown';
    if (targetStoreId) {
      for (const cluster of clusters) {
        if (cluster.stores.some(s => s.id === targetStoreId)) {
          targetStoreCluster = cluster.name;
          break;
        }
      }
    }

    // Generate AI insights
    const { insights, patterns, recommendations } = await this.generateClusterInsights(
      clusters,
      targetStoreCluster,
      targetStoreId
    );

    return {
      clusters,
      targetStoreCluster,
      insights,
      patterns,
      recommendations,
    };
  }

  private performClustering(stores: any[]): PerformanceCluster[] {
    if (stores.length === 0) {
      return [];
    }

    // Sort by revenue
    const sorted = [...stores].sort((a, b) => b.revenue - a.revenue);

    // Calculate quartiles
    const q1Index = Math.floor(sorted.length * 0.25);
    const q2Index = Math.floor(sorted.length * 0.5);
    const q3Index = Math.floor(sorted.length * 0.75);

    const q1Revenue = sorted[q1Index].revenue;
    const q2Revenue = sorted[q2Index].revenue;
    const q3Revenue = sorted[q3Index].revenue;

    // Create clusters
    const topPerformers = sorted.filter(s => s.revenue >= q3Revenue);
    const strongPerformers = sorted.filter(s => s.revenue >= q2Revenue && s.revenue < q3Revenue);
    const averagePerformers = sorted.filter(s => s.revenue >= q1Revenue && s.revenue < q2Revenue);
    const underperformers = sorted.filter(s => s.revenue < q1Revenue);

    return [
      {
        id: 'top-performers',
        name: 'Top Performers',
        description: 'Top 25% of stores by revenue',
        storeCount: topPerformers.length,
        avgRevenue: this.average(topPerformers.map(s => s.revenue)),
        characteristics: this.identifyCharacteristics(topPerformers),
        stores: topPerformers.slice(0, 10).map(s => ({
          id: s.id,
          name: s.name,
          city: s.city,
          revenue: s.revenue,
        })),
      },
      {
        id: 'strong-performers',
        name: 'Strong Performers',
        description: '50th-75th percentile',
        storeCount: strongPerformers.length,
        avgRevenue: this.average(strongPerformers.map(s => s.revenue)),
        characteristics: this.identifyCharacteristics(strongPerformers),
        stores: strongPerformers.slice(0, 10).map(s => ({
          id: s.id,
          name: s.name,
          city: s.city,
          revenue: s.revenue,
        })),
      },
      {
        id: 'average-performers',
        name: 'Average Performers',
        description: '25th-50th percentile',
        storeCount: averagePerformers.length,
        avgRevenue: this.average(averagePerformers.map(s => s.revenue)),
        characteristics: this.identifyCharacteristics(averagePerformers),
        stores: averagePerformers.slice(0, 10).map(s => ({
          id: s.id,
          name: s.name,
          city: s.city,
          revenue: s.revenue,
        })),
      },
      {
        id: 'underperformers',
        name: 'Underperformers',
        description: 'Bottom 25% of stores',
        storeCount: underperformers.length,
        avgRevenue: this.average(underperformers.map(s => s.revenue)),
        characteristics: this.identifyCharacteristics(underperformers),
        stores: underperformers.slice(0, 10).map(s => ({
          id: s.id,
          name: s.name,
          city: s.city,
          revenue: s.revenue,
        })),
      },
    ];
  }

  private identifyCharacteristics(stores: any[]): string[] {
    const characteristics: string[] = [];

    // Most common country
    const countries = stores.map(s => s.country);
    const countryMode = this.mode(countries);
    if (countryMode) {
      const countryCount = countries.filter(c => c === countryMode).length;
      if (countryCount / stores.length > 0.5) {
        characteristics.push(`Primarily in ${countryMode}`);
      }
    }

    // Most common region
    const regions = stores.map(s => s.region);
    const regionMode = this.mode(regions);
    if (regionMode) {
      const regionCount = regions.filter(r => r === regionMode).length;
      if (regionCount / stores.length > 0.5) {
        characteristics.push(`Concentrated in ${regionMode}`);
      }
    }

    // Most common city size
    const citySizes = stores.map(s => s.cityPopulationBand).filter(Boolean);
    const citySizeMode = this.mode(citySizes);
    if (citySizeMode) {
      characteristics.push(`Typical city size: ${citySizeMode}`);
    }

    // Geographic spread
    const uniqueCountries = new Set(countries).size;
    if (uniqueCountries > 5) {
      characteristics.push('Geographically diverse');
    } else if (uniqueCountries <= 2) {
      characteristics.push('Geographically concentrated');
    }

    return characteristics.length > 0 ? characteristics : ['Mixed characteristics'];
  }

  private mode(arr: any[]): any {
    const counts: Record<string, number> = {};
    let maxCount = 0;
    let mode: any = null;

    for (const item of arr) {
      if (item) {
        counts[item] = (counts[item] || 0) + 1;
        if (counts[item] > maxCount) {
          maxCount = counts[item];
          mode = item;
        }
      }
    }

    return mode;
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private async generateClusterInsights(
    clusters: PerformanceCluster[],
    targetCluster: string,
    targetStoreId?: string
  ): Promise<{ insights: string; patterns: string[]; recommendations: string[] }> {
    const prompt = `You are an elite franchise network analyst. Analyze these performance clusters.

CLUSTERS:
${clusters.map(c => `
${c.name} (${c.storeCount} stores):
- Avg Revenue: $${c.avgRevenue.toFixed(0)}
- Characteristics: ${c.characteristics.join(', ')}
`).join('\n')}

${targetStoreId ? `TARGET STORE CLUSTER: ${targetCluster}` : ''}

Provide analysis in JSON format:
{
  "insights": "2-3 sentence strategic assessment of network performance patterns",
  "patterns": ["pattern1", "pattern2", "pattern3"],
  "recommendations": ["rec1", "rec2", "rec3"]
}

Focus on actionable insights about what differentiates high performers from underperformers.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a franchise network analyst. Provide structured analysis in valid JSON format.',
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
      console.error('AI clustering insights error:', error);
      
      // Fallback
      return {
        insights: `Network shows ${clusters.length} distinct performance tiers with ${clusters[0].storeCount} top performers averaging $${clusters[0].avgRevenue.toFixed(0)}.`,
        patterns: [
          'Top performers show consistent characteristics',
          'Geographic factors influence performance',
          'Clear performance tiers exist',
        ],
        recommendations: [
          'Study top performer practices',
          'Replicate success factors',
          'Address underperformer issues',
        ],
      };
    }
  }
}
