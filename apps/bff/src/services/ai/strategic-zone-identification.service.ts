import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ModelConfigurationManager, AIOperationType } from './model-configuration.service';
import { MarketAnalysis, StrategicZone } from '../../types/market-analysis.types';

export interface ZoneIdentificationRequest {
  marketAnalysis: MarketAnalysis;
  maxZones?: number;
  minPriority?: number;
  focusAreas?: {
    lat: number;
    lng: number;
    radius: number;
    weight: number;
  }[];
}

export interface ZoneCluster {
  id: string;
  centroid: { lat: number; lng: number };
  zones: StrategicZone[];
  totalPriority: number;
  averageRevenue: number;
  riskProfile: 'LOW' | 'MEDIUM' | 'HIGH';
}

@Injectable()
export class StrategicZoneIdentificationService {
  private readonly logger = new Logger(StrategicZoneIdentificationService.name);
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly MAX_TOKENS = 3000;
  private readonly TEMPERATURE = 0.2; // Very low temperature for consistent zone identification
  
  private readonly modelConfigManager: ModelConfigurationManager;

  constructor(private readonly prisma: PrismaClient) {
    this.modelConfigManager = new ModelConfigurationManager();
    this.logger.log('Strategic Zone Identification Service initialized');
  }

  /**
   * Identify high-potential expansion zones based on market analysis
   */
  async identifyStrategicZones(request: ZoneIdentificationRequest): Promise<StrategicZone[]> {
    this.logger.log(`Identifying strategic zones for region: ${request.marketAnalysis.region}`);

    try {
      // Use AI to enhance zone identification
      const enhancedZones = await this.enhanceZoneIdentification(request);
      
      // Apply prioritization algorithms
      const prioritizedZones = this.prioritizeZones(enhancedZones, request);
      
      // Calculate zone boundaries with geographic clustering
      const zonesWithBoundaries = await this.calculateZoneBoundaries(prioritizedZones, request);
      
      // Add reasoning and opportunity classification
      const finalZones = await this.addZoneReasoning(zonesWithBoundaries, request);

      this.logger.log(`Identified ${finalZones.length} strategic zones with AI enhancement`);
      return finalZones;

    } catch (error) {
      // Graceful degradation: Fall back to deterministic zone identification
      this.logger.warn(
        `AI zone identification failed, falling back to deterministic zones: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      
      try {
        const deterministicZones = this.generateDeterministicZones(request);
        this.logger.log(`Generated ${deterministicZones.length} deterministic zones as fallback`);
        return deterministicZones;
      } catch (fallbackError) {
        this.logger.error('Deterministic zone generation also failed:', fallbackError);
        throw new Error(`Zone identification failed completely: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Generate deterministic zones without AI (fallback)
   */
  private generateDeterministicZones(request: ZoneIdentificationRequest): StrategicZone[] {
    const { marketAnalysis } = request;
    
    // Use existing zones from market analysis or create default zones
    if (marketAnalysis.strategicZones && marketAnalysis.strategicZones.length > 0) {
      return marketAnalysis.strategicZones;
    }
    
    // Create default zones based on market analysis data
    const defaultZones: StrategicZone[] = [];
    
    // Calculate center point from market analysis
    const centerLat = marketAnalysis.region ? 0 : 0; // Default center
    const centerLng = marketAnalysis.region ? 0 : 0;
    
    // High opportunity zone (if market has low saturation)
    if (marketAnalysis.marketSaturation.level === 'LOW') {
      defaultZones.push({
        id: 'default-high-opportunity',
        name: 'High Opportunity Zone',
        boundary: this.createCircularBoundary({ lat: centerLat, lng: centerLng }, 5),
        priority: 8,
        expectedStores: 3,
        revenueProjection: 600000,
        riskLevel: 'LOW',
        reasoning: 'High growth potential market with strong fundamentals',
        opportunityType: 'HIGH_GROWTH',
        keyFactors: ['Low competition', 'High demand']
      });
    }
    
    // Balanced zone (always include)
    defaultZones.push({
      id: 'default-balanced',
      name: 'Balanced Expansion Zone',
      boundary: this.createCircularBoundary({ lat: centerLat, lng: centerLng }, 5),
      priority: 6,
      expectedStores: 2,
      revenueProjection: 500000,
      riskLevel: 'MEDIUM',
      reasoning: 'Balanced risk-reward profile for steady expansion',
      opportunityType: 'DEMOGRAPHIC_MATCH',
      keyFactors: ['Moderate competition', 'Stable market']
    });
    
    // Conservative zone (if market has high saturation)
    if (marketAnalysis.marketSaturation.level === 'HIGH' || marketAnalysis.marketSaturation.level === 'OVERSATURATED') {
      defaultZones.push({
        id: 'default-conservative',
        name: 'Conservative Zone',
        boundary: this.createCircularBoundary({ lat: centerLat, lng: centerLng }, 5),
        priority: 4,
        expectedStores: 1,
        revenueProjection: 400000,
        riskLevel: 'HIGH',
        reasoning: 'Lower risk approach in saturated market',
        opportunityType: 'COMPETITIVE_ADVANTAGE',
        keyFactors: ['High competition', 'Market saturation']
      });
    }
    
    return defaultZones;
  }

  /**
   * Enhance zone identification using AI analysis
   */
  private async enhanceZoneIdentification(request: ZoneIdentificationRequest): Promise<StrategicZone[]> {
    if (!this.OPENAI_API_KEY) {
      this.logger.warn('OPENAI_API_KEY not configured, using basic zone identification');
      return request.marketAnalysis.strategicZones;
    }

    const model = this.modelConfigManager.getModelForOperation(AIOperationType.MARKET_ANALYSIS);
    const prompt = this.buildZoneEnhancementPrompt(request);

    // Import JSON schema for response format
    const { EnhancedZonesJSONSchema } = await import('@subway/shared-ai');
    
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input: `System: You are a strategic expansion analyst specializing in identifying optimal zones for restaurant expansion. Focus on geographic clustering, market opportunities, and risk assessment. Always respond with valid JSON matching the provided schema.\n\nUser: ${prompt}`,
        max_output_tokens: this.MAX_TOKENS,
        reasoning: { effort: 'high' }, // Strategic zone identification needs high reasoning
        text: { 
          verbosity: 'medium', // Balanced output for strategic analysis
          format: {
            type: 'json_schema',
            name: EnhancedZonesJSONSchema.name,
            schema: EnhancedZonesJSONSchema.schema
          }
        }
      })
    });

    if (!response.ok) {
      this.logger.warn(`AI enhancement failed, using basic zones: ${response.status}`);
      return request.marketAnalysis.strategicZones;
    }

    const data = await response.json();
    
    // Use extractText utility to handle various response formats
    const { extractText, safeParseJSONWithSchema, extractJSON, EnhancedZonesResponseSchema } = await import('@subway/shared-ai');
    
    try {
      const textContent = extractText(data);
      const jsonContent = extractJSON(textContent);
      const parseResult = safeParseJSONWithSchema(jsonContent, EnhancedZonesResponseSchema);
      
      if (!parseResult.success) {
        this.logger.warn(`Schema validation failed: ${parseResult.error}`);
        return request.marketAnalysis.strategicZones;
      }
      
      return this.parseEnhancedZones(parseResult.data, request);
    } catch (error) {
      this.logger.warn(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Fall back to basic zones
      return request.marketAnalysis.strategicZones;
    }
  }

  /**
   * Build prompt for AI zone enhancement
   */
  private buildZoneEnhancementPrompt(request: ZoneIdentificationRequest): string {
    const { marketAnalysis, maxZones = 10, minPriority = 5 } = request;

    return `
Enhance strategic zone identification for restaurant expansion based on market analysis.

MARKET ANALYSIS SUMMARY:
- Region: ${marketAnalysis.region}
- Market Saturation: ${marketAnalysis.marketSaturation.level} (${marketAnalysis.marketSaturation.score})
- Growth Opportunities: ${marketAnalysis.growthOpportunities.length}
- Competitive Gaps: ${marketAnalysis.competitiveGaps.length}
- Current Strategic Zones: ${marketAnalysis.strategicZones.length}

EXISTING STRATEGIC ZONES:
${marketAnalysis.strategicZones.map(zone => `
- ${zone.name}: Priority ${zone.priority}, Type: ${zone.opportunityType}
  Revenue Projection: $${zone.revenueProjection.toLocaleString()}
  Risk: ${zone.riskLevel}
  Key Factors: ${zone.keyFactors.join(', ')}
`).join('')}

GROWTH OPPORTUNITIES:
${marketAnalysis.growthOpportunities.map(opp => `
- ${opp.type}: ${opp.priority} priority
  Description: ${opp.description}
  Revenue Potential: $${opp.potentialRevenue.toLocaleString()}
  ${opp.location ? `Location: ${opp.location.lat}, ${opp.location.lng}` : ''}
`).join('')}

COMPETITIVE GAPS:
${marketAnalysis.competitiveGaps.map(gap => `
- ${gap.gapType}: Severity ${gap.severity}
  Location: ${gap.location.lat}, ${gap.location.lng} (${gap.location.radius}m radius)
  Estimated Demand: ${gap.estimatedDemand}
`).join('')}

REQUIREMENTS:
- Maximum zones: ${maxZones}
- Minimum priority: ${minPriority}
- Focus on geographic clustering and market opportunities

Please enhance the strategic zone identification and provide up to ${maxZones} optimized zones in JSON format:

{
  "enhancedZones": [
    {
      "name": "descriptive zone name",
      "priority": 1-10,
      "opportunityType": "HIGH_GROWTH|UNDERSERVED|COMPETITIVE_ADVANTAGE|DEMOGRAPHIC_MATCH",
      "expectedStores": number,
      "revenueProjection": annual_revenue,
      "riskLevel": "LOW|MEDIUM|HIGH",
      "reasoning": "detailed strategic reasoning",
      "keyFactors": ["factor1", "factor2", "factor3"],
      "centerPoint": {"lat": number, "lng": number},
      "radiusKm": number,
      "marketOpportunities": ["opportunity1", "opportunity2"],
      "competitiveAdvantages": ["advantage1", "advantage2"]
    }
  ],
  "zoneClusters": [
    {
      "name": "cluster name",
      "zones": ["zone1", "zone2"],
      "synergies": ["synergy1", "synergy2"],
      "totalPotential": combined_revenue
    }
  ]
}

Focus on zones with the highest strategic value, considering market gaps, growth opportunities, and competitive positioning.
`;
  }

  /**
   * Parse AI-enhanced zones
   */
  private parseEnhancedZones(aiResponse: any, request: ZoneIdentificationRequest): StrategicZone[] {
    const enhancedZones = aiResponse.enhancedZones || [];
    
    return enhancedZones.map((zone: any, index: number) => ({
      id: `enhanced-zone-${index}`,
      name: zone.name || `Enhanced Zone ${index + 1}`,
      boundary: this.createCircularBoundary(
        zone.centerPoint || { lat: 0, lng: 0 },
        zone.radiusKm || 5
      ),
      priority: zone.priority || 5,
      opportunityType: zone.opportunityType || 'HIGH_GROWTH',
      expectedStores: zone.expectedStores || 1,
      revenueProjection: zone.revenueProjection || 500000,
      riskLevel: zone.riskLevel || 'MEDIUM',
      reasoning: zone.reasoning || 'Enhanced strategic zone identified',
      keyFactors: [
        ...(zone.keyFactors || []),
        ...(zone.marketOpportunities || []),
        ...(zone.competitiveAdvantages || [])
      ]
    }));
  }

  /**
   * Create circular boundary from center point and radius
   */
  private createCircularBoundary(
    center: { lat: number; lng: number },
    radiusKm: number
  ): { type: 'Polygon'; coordinates: number[][][] } {
    const points = 16; // Number of points to approximate circle
    const coordinates: number[][] = [];
    
    for (let i = 0; i < points; i++) {
      const angle = (i * 2 * Math.PI) / points;
      const lat = center.lat + (radiusKm / 111) * Math.cos(angle); // ~111 km per degree
      const lng = center.lng + (radiusKm / (111 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);
      coordinates.push([lng, lat]);
    }
    
    // Close the polygon
    coordinates.push(coordinates[0]);

    return {
      type: 'Polygon',
      coordinates: [coordinates]
    };
  }

  /**
   * Prioritize zones based on multiple factors
   */
  private prioritizeZones(zones: StrategicZone[], request: ZoneIdentificationRequest): StrategicZone[] {
    const { minPriority = 5, focusAreas = [] } = request;

    // Filter by minimum priority
    let filteredZones = zones.filter(zone => zone.priority >= minPriority);

    // Apply focus area weighting if provided
    if (focusAreas.length > 0) {
      filteredZones = filteredZones.map(zone => {
        const zoneCentroid = this.calculateZoneCentroid(zone);
        let focusWeight = 1;

        focusAreas.forEach(focus => {
          const distance = this.calculateDistance(zoneCentroid, focus);
          if (distance <= focus.radius) {
            focusWeight *= focus.weight;
          }
        });

        return {
          ...zone,
          priority: Math.min(10, zone.priority * focusWeight)
        };
      });
    }

    // Sort by priority (descending) and revenue projection
    return filteredZones.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.revenueProjection - a.revenueProjection;
    });
  }

  /**
   * Calculate zone boundaries with geographic clustering
   */
  private async calculateZoneBoundaries(
    zones: StrategicZone[],
    request: ZoneIdentificationRequest
  ): Promise<StrategicZone[]> {
    // Group nearby zones into clusters
    const clusters = this.clusterZones(zones);
    
    // Optimize boundaries to avoid overlap
    return this.optimizeBoundaries(zones, clusters);
  }

  /**
   * Cluster zones based on geographic proximity
   */
  private clusterZones(zones: StrategicZone[]): ZoneCluster[] {
    const clusters: ZoneCluster[] = [];
    const processed = new Set<string>();

    zones.forEach(zone => {
      if (processed.has(zone.id)) return;

      const cluster: ZoneCluster = {
        id: `cluster-${clusters.length}`,
        centroid: this.calculateZoneCentroid(zone),
        zones: [zone],
        totalPriority: zone.priority,
        averageRevenue: zone.revenueProjection,
        riskProfile: zone.riskLevel
      };

      // Find nearby zones to cluster
      zones.forEach(otherZone => {
        if (otherZone.id !== zone.id && !processed.has(otherZone.id)) {
          const distance = this.calculateDistance(
            this.calculateZoneCentroid(zone),
            this.calculateZoneCentroid(otherZone)
          );

          // Cluster zones within 10km of each other
          if (distance <= 10000) {
            cluster.zones.push(otherZone);
            cluster.totalPriority += otherZone.priority;
            processed.add(otherZone.id);
          }
        }
      });

      cluster.averageRevenue = cluster.zones.reduce((sum, z) => sum + z.revenueProjection, 0) / cluster.zones.length;
      processed.add(zone.id);
      clusters.push(cluster);
    });

    return clusters;
  }

  /**
   * Optimize zone boundaries to avoid overlap
   */
  private optimizeBoundaries(zones: StrategicZone[], clusters: ZoneCluster[]): StrategicZone[] {
    // Simple implementation - ensure minimum distance between zone centroids
    const optimizedZones: StrategicZone[] = [];
    const minDistance = 5000; // 5km minimum distance

    zones.forEach(zone => {
      const zoneCentroid = this.calculateZoneCentroid(zone);
      let tooClose = false;

      optimizedZones.forEach(existingZone => {
        const existingCentroid = this.calculateZoneCentroid(existingZone);
        const distance = this.calculateDistance(zoneCentroid, existingCentroid);
        
        if (distance < minDistance) {
          tooClose = true;
        }
      });

      if (!tooClose) {
        optimizedZones.push(zone);
      }
    });

    return optimizedZones;
  }

  /**
   * Add detailed reasoning and opportunity classification
   */
  private async addZoneReasoning(
    zones: StrategicZone[],
    request: ZoneIdentificationRequest
  ): Promise<StrategicZone[]> {
    return zones.map(zone => ({
      ...zone,
      reasoning: this.generateZoneReasoning(zone, request.marketAnalysis),
      keyFactors: this.identifyKeyFactors(zone, request.marketAnalysis)
    }));
  }

  /**
   * Generate detailed reasoning for a zone
   */
  private generateZoneReasoning(zone: StrategicZone, analysis: MarketAnalysis): string {
    const reasons: string[] = [];

    // Market saturation reasoning
    if (analysis.marketSaturation.level === 'LOW') {
      reasons.push('Located in underserved market with low competition');
    }

    // Growth opportunity alignment
    const nearbyOpportunities = analysis.growthOpportunities.filter(opp => 
      opp.location && this.isPointInZone(opp.location, zone)
    );
    
    if (nearbyOpportunities.length > 0) {
      reasons.push(`Aligned with ${nearbyOpportunities.length} identified growth opportunities`);
    }

    // Competitive gap coverage
    const coveredGaps = analysis.competitiveGaps.filter(gap => 
      this.isPointInZone(gap.location, zone)
    );
    
    if (coveredGaps.length > 0) {
      reasons.push(`Addresses ${coveredGaps.length} competitive gaps in the market`);
    }

    // Revenue potential
    if (zone.revenueProjection > 600000) {
      reasons.push('High revenue potential based on market analysis');
    }

    return reasons.join('. ') || 'Strategic zone identified through market analysis';
  }

  /**
   * Identify key factors for a zone
   */
  private identifyKeyFactors(zone: StrategicZone, analysis: MarketAnalysis): string[] {
    const factors: string[] = [...zone.keyFactors];

    // Add market-specific factors
    if (analysis.marketSaturation.level === 'LOW') {
      factors.push('Low market saturation');
    }

    // Add demographic factors
    const relevantInsights = analysis.demographicInsights.filter(insight => 
      insight.impact === 'POSITIVE' && insight.strength > 0.7
    );
    
    relevantInsights.forEach(insight => {
      factors.push(`Positive ${insight.category.toLowerCase().replace('_', ' ')}`);
    });

    // Remove duplicates and limit to top 5
    return [...new Set(factors)].slice(0, 5);
  }

  /**
   * Calculate centroid of a zone
   */
  private calculateZoneCentroid(zone: StrategicZone): { lat: number; lng: number } {
    const coordinates = zone.boundary.coordinates[0];
    const latSum = coordinates.reduce((sum, coord) => sum + coord[1], 0);
    const lngSum = coordinates.reduce((sum, coord) => sum + coord[0], 0);
    
    return {
      lat: latSum / coordinates.length,
      lng: lngSum / coordinates.length
    };
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

  /**
   * Check if a point is within a zone
   */
  private isPointInZone(
    point: { lat: number; lng: number },
    zone: StrategicZone
  ): boolean {
    // Simplified point-in-polygon check
    const centroid = this.calculateZoneCentroid(zone);
    const distance = this.calculateDistance(point, centroid);
    
    // Assume zone radius of ~5km for simplified check
    return distance <= 5000;
  }

  /**
   * Get clusters of strategic zones
   */
  async getZoneClusters(zones: StrategicZone[]): Promise<ZoneCluster[]> {
    return this.clusterZones(zones);
  }
}