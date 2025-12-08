import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { CompetitorService } from './competitor.service';

export interface CompetitiveAnalysisRequest {
  storeId?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  region?: string;
}

export interface CompetitiveAnalysisResult {
  totalCompetitors: number;
  competitorsByBrand: Record<string, number>;
  competitorsByCategory: Record<string, number>;
  marketSaturation: number;
  competitivePressure: number;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  nearestCompetitor: string | null;
  nearestDistance: number | null;
  dominantCompetitor: string | null;
  aiSummary: string;
  strategicRecommendations: string[];
  competitors: any[];
}

@Injectable()
export class CompetitiveAnalysisService {
  private openai: OpenAI;
  private model: string;

  constructor(
    private prisma: PrismaClient,
    private competitorService: CompetitorService
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = process.env.COMPETITIVE_ANALYSIS_MODEL || 'gpt-5.1';
  }

  async analyzeCompetition(request: CompetitiveAnalysisRequest): Promise<CompetitiveAnalysisResult> {
    let latitude = request.latitude;
    let longitude = request.longitude;
    const radiusKm = request.radiusKm || 5;

    // If storeId provided, get store location
    if (request.storeId) {
      const store = await this.prisma.store.findUnique({
        where: { id: request.storeId },
      });
      if (store && store.latitude && store.longitude) {
        latitude = store.latitude;
        longitude = store.longitude;
      }
    }

    if (!latitude || !longitude) {
      throw new Error('Location required for competitive analysis');
    }

    // Get competitors in radius
    const competitors = await this.competitorService.getCompetitors({
      centerLat: latitude,
      centerLng: longitude,
      radiusKm,
    });

    // Calculate metrics
    const byBrand: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const distances: Array<{ brand: string; distance: number }> = [];

    competitors.forEach(c => {
      byBrand[c.brand] = (byBrand[c.brand] || 0) + 1;
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;

      const distance = this.calculateDistance(latitude!, longitude!, c.latitude, c.longitude);
      distances.push({ brand: c.brand, distance });
    });

    // Find nearest competitor
    distances.sort((a, b) => a.distance - b.distance);
    const nearest = distances[0];

    // Find dominant competitor
    const dominantBrand = Object.entries(byBrand).sort((a, b) => b[1] - a[1])[0];

    // Calculate saturation and pressure
    const marketSaturation = this.calculateSaturation(competitors.length, radiusKm);
    const competitivePressure = this.calculatePressure(competitors, latitude, longitude);
    const threatLevel = this.calculateThreatLevel(marketSaturation, competitivePressure);

    // Generate AI insights
    const { aiSummary, strategicRecommendations } = await this.generateAIInsights(
      competitors,
      byBrand,
      byCategory,
      marketSaturation,
      competitivePressure,
      threatLevel,
      nearest
    );

    // Save analysis
    await this.saveAnalysis({
      storeId: request.storeId,
      region: request.region,
      latitude,
      longitude,
      radiusKm,
      totalCompetitors: competitors.length,
      competitorsByBrand: JSON.stringify(byBrand),
      competitorsByCategory: JSON.stringify(byCategory),
      marketSaturation,
      competitivePressure,
      threatLevel,
      nearestCompetitor: nearest?.brand,
      nearestDistance: nearest?.distance,
      dominantCompetitor: dominantBrand?.[0],
      aiSummary,
      strategicRecommendations: JSON.stringify(strategicRecommendations),
    });

    return {
      totalCompetitors: competitors.length,
      competitorsByBrand: byBrand,
      competitorsByCategory: byCategory,
      marketSaturation,
      competitivePressure,
      threatLevel,
      nearestCompetitor: nearest?.brand || null,
      nearestDistance: nearest?.distance || null,
      dominantCompetitor: dominantBrand?.[0] || null,
      aiSummary,
      strategicRecommendations,
      competitors,
    };
  }

  private calculateSaturation(competitorCount: number, radiusKm: number): number {
    // Saturation based on competitor density
    // Assume 1 competitor per 2 km² is moderate saturation
    const area = Math.PI * radiusKm * radiusKm;
    const density = competitorCount / area;
    const saturation = Math.min(100, density * 200); // Scale to 0-100
    return Math.round(saturation);
  }

  private calculatePressure(competitors: any[], lat: number, lng: number): number {
    // Pressure based on proximity and count
    let pressure = 0;

    competitors.forEach(c => {
      const distance = this.calculateDistance(lat, lng, c.latitude, c.longitude);
      // Closer competitors create more pressure
      const proximityFactor = Math.max(0, 1 - distance / 5); // Max pressure within 5km
      pressure += proximityFactor * 10;
    });

    return Math.min(100, Math.round(pressure));
  }

  private calculateThreatLevel(
    saturation: number,
    pressure: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
    const combined = (saturation + pressure) / 2;

    if (combined >= 75) return 'EXTREME';
    if (combined >= 50) return 'HIGH';
    if (combined >= 25) return 'MEDIUM';
    return 'LOW';
  }

  private async generateAIInsights(
    competitors: any[],
    byBrand: Record<string, number>,
    byCategory: Record<string, number>,
    saturation: number,
    pressure: number,
    threatLevel: string,
    nearest: any
  ): Promise<{ aiSummary: string; strategicRecommendations: string[] }> {
    const prompt = `You are an elite competitive intelligence analyst for franchise operations.

COMPETITIVE LANDSCAPE:
- Total Competitors: ${competitors.length}
- Market Saturation: ${saturation}/100
- Competitive Pressure: ${pressure}/100
- Threat Level: ${threatLevel}
- Nearest Competitor: ${nearest?.brand || 'None'} (${nearest?.distance?.toFixed(2) || 'N/A'} km)

COMPETITORS BY BRAND:
${Object.entries(byBrand).map(([brand, count]) => `- ${brand}: ${count}`).join('\n')}

COMPETITORS BY CATEGORY:
${Object.entries(byCategory).map(([cat, count]) => `- ${cat}: ${count}`).join('\n')}

Provide strategic analysis in JSON format:
{
  "aiSummary": "2-3 sentence assessment of competitive landscape and strategic position",
  "strategicRecommendations": ["rec1", "rec2", "rec3"]
}

Focus on actionable competitive strategy and market positioning.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a competitive intelligence analyst. Provide structured analysis in valid JSON format.',
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
      console.error('AI competitive insights error:', error);

      // Fallback
      return {
        aiSummary: `Market shows ${threatLevel.toLowerCase()} competitive threat with ${competitors.length} competitors in the area. ${saturation > 50 ? 'High saturation detected.' : 'Moderate competition levels.'}`,
        strategicRecommendations: [
          'Monitor competitor expansion plans',
          'Differentiate through service quality',
          'Focus on underserved customer segments',
        ],
      };
    }
  }

  private async saveAnalysis(data: any) {
    return this.prisma.competitiveAnalysis.create({
      data: {
        ...data,
        model: this.model,
      },
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
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
