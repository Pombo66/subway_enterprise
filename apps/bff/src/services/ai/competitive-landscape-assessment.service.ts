import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ModelConfigurationManager, AIOperationType } from './model-configuration.service';

export interface CompetitorData {
  id: string;
  lat: number;
  lng: number;
  type: string;
  brand?: string;
  size?: 'SMALL' | 'MEDIUM' | 'LARGE';
  performance?: number;
  pricePoint?: 'LOW' | 'MEDIUM' | 'HIGH';
  serviceType?: string[];
}

export interface CompetitiveAnalysisRequest {
  region: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  existingStores: {
    lat: number;
    lng: number;
    performance?: number;
  }[];
  competitors: CompetitorData[];
  analysisDepth: 'BASIC' | 'DETAILED' | 'COMPREHENSIVE';
}

export interface CompetitiveGap {
  id: string;
  location: {
    lat: number;
    lng: number;
    radius: number;
  };
  gapType: 'GEOGRAPHIC' | 'DEMOGRAPHIC' | 'SERVICE_TYPE' | 'PRICE_POINT';
  severity: number; // 0-1, higher = bigger gap
  estimatedDemand: number;
  nearestCompetitor: {
    distance: number;
    type: string;
    brand?: string;
  };
  reasoning: string;
  opportunityScore: number;
}

export interface CompetitiveAdvantage {
  id: string;
  type: 'LOCATION' | 'PRICING' | 'SERVICE' | 'BRAND' | 'QUALITY';
  description: string;
  strength: number; // 0-1
  sustainability: 'LOW' | 'MEDIUM' | 'HIGH';
  applicableAreas: {
    lat: number;
    lng: number;
    radius: number;
  }[];
}

export interface MarketPositioning {
  competitorDensity: number;
  marketShare: number;
  competitiveIntensity: 'LOW' | 'MEDIUM' | 'HIGH';
  dominantCompetitors: string[];
  underservedSegments: string[];
  pricePositioning: 'PREMIUM' | 'COMPETITIVE' | 'VALUE';
}

export interface CompetitiveLandscapeResult {
  gaps: CompetitiveGap[];
  advantages: CompetitiveAdvantage[];
  positioning: MarketPositioning;
  threats: {
    type: string;
    severity: number;
    description: string;
    mitigation: string[];
  }[];
  opportunities: {
    type: string;
    potential: number;
    description: string;
    requirements: string[];
  }[];
  recommendations: string[];
}

@Injectable()
export class CompetitiveLandscapeAssessmentService {
  private readonly logger = new Logger(CompetitiveLandscapeAssessmentService.name);
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly MAX_TOKENS = 4000;
  private readonly REASONING_EFFORT: 'minimal' | 'low' | 'medium' | 'high' = 'high'; // Competitive analysis needs high reasoning
  private readonly TEXT_VERBOSITY: 'low' | 'medium' | 'high' = 'medium'; // Balanced output
  
  private readonly modelConfigManager: ModelConfigurationManager;

  constructor(private readonly prisma: PrismaClient) {
    this.modelConfigManager = new ModelConfigurationManager();
    this.logger.log('Competitive Landscape Assessment Service initialized');
  }

  /**
   * Perform comprehensive competitive landscape assessment
   */
  async assessCompetitiveLandscape(request: CompetitiveAnalysisRequest): Promise<CompetitiveLandscapeResult> {
    this.logger.log(`Assessing competitive landscape for region: ${request.region}`);

    try {
      // Analyze competitor proximity and density
      const proximityAnalysis = await this.analyzeCompetitorProximity(request);
      
      // Identify competitive gaps
      const gaps = await this.identifyCompetitiveGaps(request, proximityAnalysis);
      
      // Assess competitive advantages
      const advantages = await this.identifyCompetitiveAdvantages(request);
      
      // Analyze market positioning
      const positioning = await this.analyzeMarketPositioning(request);
      
      // Use AI for enhanced competitive analysis
      const aiEnhancedAnalysis = await this.performAICompetitiveAnalysis(request, {
        gaps,
        advantages,
        positioning
      });

      this.logger.log(`Competitive assessment completed for ${request.region}`);
      
      return {
        gaps: aiEnhancedAnalysis.gaps || gaps,
        advantages: aiEnhancedAnalysis.advantages || advantages,
        positioning: aiEnhancedAnalysis.positioning || positioning,
        threats: aiEnhancedAnalysis.threats || [],
        opportunities: aiEnhancedAnalysis.opportunities || [],
        recommendations: aiEnhancedAnalysis.recommendations || []
      };

    } catch (error) {
      this.logger.error('Competitive landscape assessment failed:', error);
      throw new Error(`Competitive assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze competitor proximity and density patterns
   */
  private async analyzeCompetitorProximity(request: CompetitiveAnalysisRequest) {
    const { existingStores, competitors, bounds } = request;
    
    const proximityData = existingStores.map(store => {
      const nearbyCompetitors = competitors.filter(comp => {
        const distance = this.calculateDistance(
          { lat: store.lat, lng: store.lng },
          { lat: comp.lat, lng: comp.lng }
        );
        return distance <= 2000; // Within 2km
      });

      const closestCompetitor = competitors.reduce((closest, comp) => {
        const distance = this.calculateDistance(
          { lat: store.lat, lng: store.lng },
          { lat: comp.lat, lng: comp.lng }
        );
        
        if (!closest || distance < closest.distance) {
          return { competitor: comp, distance };
        }
        return closest;
      }, null as { competitor: CompetitorData; distance: number } | null);

      return {
        store,
        nearbyCompetitors,
        closestCompetitor,
        competitorDensity: nearbyCompetitors.length
      };
    });

    return proximityData;
  }

  /**
   * Identify competitive gaps in the market
   */
  private async identifyCompetitiveGaps(
    request: CompetitiveAnalysisRequest,
    proximityAnalysis: any[]
  ): Promise<CompetitiveGap[]> {
    const gaps: CompetitiveGap[] = [];
    const { bounds, competitors } = request;

    // Create a grid to analyze coverage
    const gridSize = 0.01; // ~1km grid
    const latSteps = Math.ceil((bounds.north - bounds.south) / gridSize);
    const lngSteps = Math.ceil((bounds.east - bounds.west) / gridSize);

    for (let i = 0; i < latSteps; i++) {
      for (let j = 0; j < lngSteps; j++) {
        const lat = bounds.south + (i * gridSize);
        const lng = bounds.west + (j * gridSize);
        
        // Find nearest competitor
        const nearestCompetitor = competitors.reduce((nearest, comp) => {
          const distance = this.calculateDistance({ lat, lng }, { lat: comp.lat, lng: comp.lng });
          
          if (!nearest || distance < nearest.distance) {
            return { competitor: comp, distance };
          }
          return nearest;
        }, null as { competitor: CompetitorData; distance: number } | null);

        // If nearest competitor is far away, it's a potential gap
        if (nearestCompetitor && nearestCompetitor.distance > 3000) { // 3km threshold
          const severity = Math.min(1, nearestCompetitor.distance / 10000); // Max severity at 10km
          
          gaps.push({
            id: `gap-${i}-${j}`,
            location: { lat, lng, radius: 1000 },
            gapType: 'GEOGRAPHIC',
            severity,
            estimatedDemand: this.estimateDemandForLocation({ lat, lng }),
            nearestCompetitor: {
              distance: nearestCompetitor.distance,
              type: nearestCompetitor.competitor.type,
              brand: nearestCompetitor.competitor.brand
            },
            reasoning: `Geographic gap with nearest competitor ${(nearestCompetitor.distance / 1000).toFixed(1)}km away`,
            opportunityScore: severity * 0.8 // Adjust based on other factors
          });
        }
      }
    }

    // Filter and prioritize gaps
    return gaps
      .filter(gap => gap.severity > 0.3) // Only significant gaps
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, 20); // Top 20 gaps
  }

  /**
   * Identify competitive advantages
   */
  private async identifyCompetitiveAdvantages(request: CompetitiveAnalysisRequest): Promise<CompetitiveAdvantage[]> {
    const advantages: CompetitiveAdvantage[] = [];
    const { competitors } = request;

    // Analyze competitor types and identify potential advantages
    const competitorTypes = [...new Set(competitors.map(c => c.type))];
    const competitorBrands = [...new Set(competitors.map(c => c.brand).filter(Boolean))];

    // Location advantages (areas with low competition)
    const lowCompetitionAreas = this.identifyLowCompetitionAreas(request);
    if (lowCompetitionAreas.length > 0) {
      advantages.push({
        id: 'location-advantage',
        type: 'LOCATION',
        description: 'Strategic positioning in underserved areas with limited competition',
        strength: 0.8,
        sustainability: 'HIGH',
        applicableAreas: lowCompetitionAreas
      });
    }

    // Service differentiation opportunities
    const serviceGaps = this.identifyServiceGaps(competitors);
    if (serviceGaps.length > 0) {
      advantages.push({
        id: 'service-advantage',
        type: 'SERVICE',
        description: `Opportunity to differentiate through ${serviceGaps.join(', ')}`,
        strength: 0.6,
        sustainability: 'MEDIUM',
        applicableAreas: [{ lat: request.bounds.north, lng: request.bounds.east, radius: 10000 }]
      });
    }

    return advantages;
  }

  /**
   * Analyze market positioning
   */
  private async analyzeMarketPositioning(request: CompetitiveAnalysisRequest): Promise<MarketPositioning> {
    const { competitors, existingStores, bounds } = request;
    
    const area = this.calculateArea(bounds);
    const competitorDensity = competitors.length / area;
    
    // Calculate market share (simplified)
    const totalStores = competitors.length + existingStores.length;
    const marketShare = totalStores > 0 ? existingStores.length / totalStores : 0;

    // Determine competitive intensity
    let competitiveIntensity: 'LOW' | 'MEDIUM' | 'HIGH';
    if (competitorDensity < 0.1) {
      competitiveIntensity = 'LOW';
    } else if (competitorDensity < 0.5) {
      competitiveIntensity = 'MEDIUM';
    } else {
      competitiveIntensity = 'HIGH';
    }

    // Identify dominant competitors
    const brandCounts = competitors.reduce((counts, comp) => {
      const brand = comp.brand || comp.type;
      counts[brand] = (counts[brand] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const dominantCompetitors = Object.entries(brandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([brand]) => brand);

    return {
      competitorDensity,
      marketShare,
      competitiveIntensity,
      dominantCompetitors,
      underservedSegments: ['fast-casual', 'healthy options'], // Simplified
      pricePositioning: 'COMPETITIVE' // Simplified
    };
  }

  /**
   * Perform AI-enhanced competitive analysis
   */
  private async performAICompetitiveAnalysis(
    request: CompetitiveAnalysisRequest,
    basicAnalysis: any
  ): Promise<Partial<CompetitiveLandscapeResult>> {
    if (!this.OPENAI_API_KEY) {
      this.logger.warn('OPENAI_API_KEY not configured, using basic analysis');
      return {};
    }

    const model = this.modelConfigManager.getModelForOperation(AIOperationType.MARKET_ANALYSIS);
    const prompt = this.buildCompetitiveAnalysisPrompt(request, basicAnalysis);

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          input: `System: You are a competitive intelligence analyst specializing in restaurant market analysis. Provide detailed competitive assessments with actionable insights and strategic recommendations. Always respond with valid JSON.\n\nUser: ${prompt}`,
          max_output_tokens: this.MAX_TOKENS,
          reasoning: { effort: this.REASONING_EFFORT },
          text: { verbosity: this.TEXT_VERBOSITY }
        })
      });

      if (!response.ok) {
        this.logger.warn(`AI competitive analysis failed: ${response.status}`);
        return {};
      }

      const data = await response.json();
      // Find the message output (type: "message")
    const messageOutput = data.output.find((item: any) => item.type === 'message');
    if (!messageOutput || !messageOutput.content || !messageOutput.content[0]) {
      throw new Error('No message content in OpenAI response');
    }
    
    const aiResponse = JSON.parse(messageOutput.content[0].text);
      
      return this.parseAICompetitiveAnalysis(aiResponse);

    } catch (error) {
      this.logger.error('AI competitive analysis error:', error);
      return {};
    }
  }

  /**
   * Build prompt for AI competitive analysis
   */
  private buildCompetitiveAnalysisPrompt(request: CompetitiveAnalysisRequest, basicAnalysis: any): string {
    return `
Perform enhanced competitive landscape analysis for restaurant expansion.

REGION: ${request.region}
ANALYSIS DEPTH: ${request.analysisDepth}

EXISTING STORES: ${request.existingStores.length}
COMPETITORS: ${request.competitors.length}

COMPETITOR BREAKDOWN:
${request.competitors.map(comp => `
- ${comp.type}${comp.brand ? ` (${comp.brand})` : ''}: ${comp.lat}, ${comp.lng}
  Size: ${comp.size || 'Unknown'}, Price: ${comp.pricePoint || 'Unknown'}
`).join('')}

BASIC ANALYSIS RESULTS:
- Market Share: ${(basicAnalysis.positioning.marketShare * 100).toFixed(1)}%
- Competitive Intensity: ${basicAnalysis.positioning.competitiveIntensity}
- Competitor Density: ${basicAnalysis.positioning.competitorDensity.toFixed(2)} per km²
- Dominant Competitors: ${basicAnalysis.positioning.dominantCompetitors.join(', ')}
- Identified Gaps: ${basicAnalysis.gaps.length}

Please provide enhanced competitive analysis in JSON format:

{
  "threats": [
    {
      "type": "threat_category",
      "severity": 0.0-1.0,
      "description": "detailed threat description",
      "mitigation": ["strategy1", "strategy2"]
    }
  ],
  "opportunities": [
    {
      "type": "opportunity_category",
      "potential": 0.0-1.0,
      "description": "detailed opportunity description",
      "requirements": ["requirement1", "requirement2"]
    }
  ],
  "recommendations": [
    "strategic recommendation 1",
    "strategic recommendation 2"
  ],
  "enhancedGaps": [
    {
      "gapType": "GEOGRAPHIC|DEMOGRAPHIC|SERVICE_TYPE|PRICE_POINT",
      "priority": "HIGH|MEDIUM|LOW",
      "description": "gap description",
      "actionableSteps": ["step1", "step2"]
    }
  ],
  "competitiveAdvantages": [
    {
      "type": "LOCATION|PRICING|SERVICE|BRAND|QUALITY",
      "description": "advantage description",
      "sustainability": "LOW|MEDIUM|HIGH",
      "implementation": ["step1", "step2"]
    }
  ]
}

Focus on actionable insights and specific strategic recommendations for market entry and expansion.
`;
  }

  /**
   * Parse AI competitive analysis response
   */
  private parseAICompetitiveAnalysis(aiResponse: any): Partial<CompetitiveLandscapeResult> {
    return {
      threats: aiResponse.threats || [],
      opportunities: aiResponse.opportunities || [],
      recommendations: aiResponse.recommendations || []
    };
  }

  /**
   * Identify areas with low competition
   */
  private identifyLowCompetitionAreas(request: CompetitiveAnalysisRequest) {
    const { bounds, competitors } = request;
    const lowCompetitionAreas: { lat: number; lng: number; radius: number }[] = [];

    // Simple grid-based analysis
    const gridSize = 0.02; // ~2km grid
    const latSteps = Math.ceil((bounds.north - bounds.south) / gridSize);
    const lngSteps = Math.ceil((bounds.east - bounds.west) / gridSize);

    for (let i = 0; i < latSteps; i++) {
      for (let j = 0; j < lngSteps; j++) {
        const lat = bounds.south + (i * gridSize);
        const lng = bounds.west + (j * gridSize);
        
        const nearbyCompetitors = competitors.filter(comp => {
          const distance = this.calculateDistance({ lat, lng }, { lat: comp.lat, lng: comp.lng });
          return distance <= 3000; // Within 3km
        });

        if (nearbyCompetitors.length <= 1) {
          lowCompetitionAreas.push({ lat, lng, radius: 2000 });
        }
      }
    }

    return lowCompetitionAreas.slice(0, 10); // Top 10 areas
  }

  /**
   * Identify service gaps in the market
   */
  private identifyServiceGaps(competitors: CompetitorData[]): string[] {
    const serviceTypes = competitors.flatMap(c => c.serviceType || []);
    const commonServices = ['fast-food', 'casual-dining', 'delivery', 'drive-through'];
    
    return commonServices.filter(service => 
      !serviceTypes.includes(service)
    );
  }

  /**
   * Estimate demand for a location (simplified)
   */
  private estimateDemandForLocation(location: { lat: number; lng: number }): number {
    // Simplified demand estimation
    // In a real implementation, this would use demographic data, foot traffic, etc.
    return Math.floor(Math.random() * 1000) + 500; // 500-1500 daily customers
  }

  /**
   * Calculate area of bounds in km²
   */
  private calculateArea(bounds: { north: number; south: number; east: number; west: number }): number {
    const latDiff = bounds.north - bounds.south;
    const lngDiff = bounds.east - bounds.west;
    
    // Rough approximation: 1 degree ≈ 111 km
    const latKm = latDiff * 111;
    const lngKm = lngDiff * 111 * Math.cos((bounds.north + bounds.south) / 2 * Math.PI / 180);
    
    return latKm * lngKm;
  }

  /**
   * Calculate distance between two points in meters
   */
  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}