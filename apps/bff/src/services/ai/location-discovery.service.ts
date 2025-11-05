import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import { ModelConfigurationManager, AIOperationType } from './model-configuration.service';
import { ILocationDiscoveryService } from '../../interfaces/location-discovery.interface';
import {
  LocationDiscoveryRequest,
  LocationDiscoveryResult,
  LocationCandidate,
  LocationFactor,
  BatchGenerationRequest,
  BatchGenerationResult
} from '../../types/location-discovery.types';

@Injectable()
export class LocationDiscoveryService implements ILocationDiscoveryService {
  private readonly logger = new Logger(LocationDiscoveryService.name);
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly MAX_TOKENS = 8000; // Generous limit for location discovery
  private readonly TEMPERATURE = 0.4; // Slightly higher for creative location discovery
  private readonly DEFAULT_BATCH_SIZE = 50;
  
  private readonly modelConfigManager: ModelConfigurationManager;
  
  // Service statistics
  private totalCandidatesGenerated = 0;
  private totalBatchesProcessed = 0;
  private totalGenerationTime = 0;
  private totalTokensUsed = 0;
  private totalCost = 0;
  private qualityScores: number[] = [];

  constructor(private readonly prisma: PrismaClient) {
    this.modelConfigManager = new ModelConfigurationManager();
    this.logger.log('Location Discovery Service initialized with GPT-5-nano');
  }

  /**
   * Discover location candidates using strategic zones and AI analysis
   */
  async discoverLocations(request: LocationDiscoveryRequest): Promise<LocationDiscoveryResult> {
    const startTime = Date.now();
    this.logger.log(`Starting location discovery for ${request.targetCount} candidates`);

    try {
      const batchSize = request.batchSize || this.DEFAULT_BATCH_SIZE;
      const allCandidates: LocationCandidate[] = [];
      let totalTokensUsed = 0;
      let batchesProcessed = 0;

      // Process each strategic zone
      for (const zone of request.strategicZones) {
        const candidatesPerZone = Math.ceil(
          (request.targetCount * zone.priority) / 
          request.strategicZones.reduce((sum, z) => sum + z.priority, 0)
        );

        this.logger.log(`Generating ${candidatesPerZone} candidates for zone ${zone.id}`);

        // Generate candidates in batches for this zone
        const batches = Math.ceil(candidatesPerZone / batchSize);
        
        for (let i = 0; i < batches; i++) {
          const batchTargetCount = Math.min(batchSize, candidatesPerZone - (i * batchSize));
          
          if (batchTargetCount <= 0) break;

          const batchRequest: BatchGenerationRequest = {
            zoneId: zone.id,
            zoneBoundary: zone.boundary,
            targetCandidates: batchTargetCount,
            existingStores: request.existingStores,
            constraints: request.constraints || {},
            batchId: `${zone.id}-batch-${i}`
          };

          const batchResult = await this.processBatch(batchRequest);
          allCandidates.push(...batchResult.candidates);
          totalTokensUsed += batchResult.tokensUsed;
          batchesProcessed++;
        }
      }

      // Validate and filter candidates
      const validatedCandidates = await this.validateCandidates(allCandidates);
      const filteredCandidates = this.filterCandidates(
        validatedCandidates,
        request.constraints || {},
        request.qualityThreshold || 0.3
      );

      // Calculate quality metrics
      const qualityMetrics = this.calculateQualityMetrics(filteredCandidates);
      
      const generationTime = Date.now() - startTime;
      this.totalGenerationTime += generationTime;
      this.totalBatchesProcessed += batchesProcessed;
      this.totalCandidatesGenerated += filteredCandidates.length;
      this.totalTokensUsed += totalTokensUsed;

      const totalCost = this.estimateCost(totalTokensUsed);
      this.totalCost += totalCost;

      this.logger.log(`Location discovery completed: ${filteredCandidates.length} candidates in ${generationTime}ms`);

      return {
        candidates: filteredCandidates.slice(0, request.targetCount),
        metadata: {
          totalGenerated: allCandidates.length,
          totalFiltered: filteredCandidates.length,
          averageViabilityScore: filteredCandidates.reduce((sum, c) => sum + c.viabilityScore, 0) / filteredCandidates.length,
          batchesProcessed,
          totalTokensUsed,
          totalCost,
          generationTimeMs: generationTime,
          aiModel: this.modelConfigManager.getModelForOperation(AIOperationType.LOCATION_DISCOVERY)
        },
        qualityMetrics
      };

    } catch (error) {
      this.logger.error('Location discovery failed:', error);
      throw new Error(`Location discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate candidates for a specific strategic zone
   */
  async generateCandidatesForZone(
    zoneId: string,
    zoneBoundary: any,
    targetCount: number,
    constraints: any = {}
  ): Promise<LocationCandidate[]> {
    const batchRequest: BatchGenerationRequest = {
      zoneId,
      zoneBoundary,
      targetCandidates: targetCount,
      existingStores: [],
      constraints,
      batchId: `zone-${zoneId}-${Date.now()}`
    };

    const result = await this.processBatch(batchRequest);
    return result.candidates;
  }

  /**
   * Process batch generation for high-volume candidate discovery
   */
  async processBatch(request: BatchGenerationRequest): Promise<BatchGenerationResult> {
    const startTime = Date.now();
    
    try {
      if (!this.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      const model = this.modelConfigManager.getModelForOperation(AIOperationType.LOCATION_DISCOVERY);
      const prompt = this.buildLocationDiscoveryPrompt(request);

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          input: `System: You are a location discovery specialist for restaurant expansion. Generate viable location candidates within specified zones, focusing on accessibility, foot traffic, and market potential. Always respond with valid JSON.\n\nUser: ${prompt}`,
          max_output_tokens: this.MAX_TOKENS,
          reasoning: { effort: 'low' }, // Location discovery uses low reasoning for speed
          text: { verbosity: 'low' } // Concise output for high-volume generation
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const tokensUsed = data.usage?.total_tokens || 0;
      
      // Debug: Log the actual response structure
      console.log('🔍 Location Discovery OpenAI Response Debug:', {
        hasOutput: !!data.output,
        outputType: Array.isArray(data.output) ? 'array' : typeof data.output,
        outputLength: data.output?.length,
        outputTypes: data.output?.map((item: any) => item.type),
        responsePreview: JSON.stringify(data, null, 2).substring(0, 300)
      });

      // Handle incomplete responses
      if (data.status === 'incomplete') {
        console.warn('⚠️ Location Discovery OpenAI response was incomplete, using partial content');
      }

      // For GPT-5, prefer reasoning output, but fall back to message if reasoning is empty
      let contentOutput = data.output?.find((item: any) => item.type === 'reasoning');
      
      // If reasoning is empty or missing, use message output
      if (!contentOutput || !contentOutput.content || !contentOutput.content[0] || !contentOutput.content[0].text) {
        contentOutput = data.output?.find((item: any) => item.type === 'message');
      }
      
      if (!contentOutput || !contentOutput.content || !contentOutput.content[0] || !contentOutput.content[0].text) {
        throw new Error(`No usable content in OpenAI response. Outputs: ${data.output?.map((o: any) => `${o.type}:${o.content?.length || 0}`).join(', ')}`);
      }
      
      const aiResponse = JSON.parse(contentOutput.content[0].text);
      const candidates = this.parseLocationCandidates(aiResponse, request, model, tokensUsed);
      
      const processingTime = Date.now() - startTime;
      const qualityScore = this.calculateBatchQualityScore(candidates);

      return {
        batchId: request.batchId,
        candidates,
        tokensUsed,
        processingTimeMs: processingTime,
        qualityScore
      };

    } catch (error) {
      this.logger.error(`Batch processing failed for ${request.batchId}:`, error);
      throw error;
    }
  }

  /**
   * Build location discovery prompt for AI
   */
  private buildLocationDiscoveryPrompt(request: BatchGenerationRequest): string {
    const zoneCentroid = this.calculatePolygonCentroid(request.zoneBoundary);
    const zoneArea = this.calculatePolygonArea(request.zoneBoundary);

    return `
Generate ${request.targetCandidates} viable restaurant location candidates within the specified strategic zone.

ZONE INFORMATION:
- Zone ID: ${request.zoneId}
- Zone Centroid: ${zoneCentroid.lat.toFixed(4)}, ${zoneCentroid.lng.toFixed(4)}
- Zone Area: ~${zoneArea.toFixed(2)} km²
- Target Candidates: ${request.targetCandidates}

EXISTING STORES (to avoid):
${request.existingStores.map(store => `- ${store.lat.toFixed(4)}, ${store.lng.toFixed(4)}`).join('\n')}

CONSTRAINTS:
${request.constraints.minDistanceFromExisting ? `- Minimum ${request.constraints.minDistanceFromExisting}m from existing stores` : ''}
${request.constraints.maxDistanceFromRoad ? `- Maximum ${request.constraints.maxDistanceFromRoad}m from roads` : ''}
${request.constraints.minPopulationDensity ? `- Minimum population density: ${request.constraints.minPopulationDensity}` : ''}

Generate location candidates that are:
1. Within the strategic zone boundaries
2. Accessible by road and foot traffic
3. In areas with good visibility and commercial potential
4. Appropriately spaced from existing stores
5. Suitable for restaurant operations

Respond with JSON format:

{
  "candidates": [
    {
      "lat": latitude,
      "lng": longitude,
      "confidence": 0.0-1.0,
      "viabilityScore": 0.0-1.0,
      "reasoning": "brief explanation for location selection",
      "factors": [
        {
          "type": "POPULATION_DENSITY|FOOT_TRAFFIC|ACCESSIBILITY|COMPETITION|DEMOGRAPHICS|INFRASTRUCTURE",
          "score": 0.0-1.0,
          "weight": 0.0-1.0,
          "description": "factor description"
        }
      ]
    }
  ]
}

Focus on realistic, commercially viable locations with good access and visibility.
`;
  }

  /**
   * Parse AI response into LocationCandidate objects
   */
  private parseLocationCandidates(
    aiResponse: any,
    request: BatchGenerationRequest,
    model: string,
    tokensUsed: number
  ): LocationCandidate[] {
    const candidates = aiResponse.candidates || [];
    
    return candidates.map((candidate: any, index: number) => ({
      id: `${request.batchId}-${index}`,
      lat: candidate.lat || 0,
      lng: candidate.lng || 0,
      confidence: candidate.confidence || 0.5,
      viabilityScore: candidate.viabilityScore || 0.5,
      discoveryMethod: 'AI_GENERATED' as const,
      reasoning: candidate.reasoning || 'AI-generated location candidate',
      factors: this.parseLocationFactors(candidate.factors || []),
      metadata: {
        generatedAt: new Date(),
        aiModel: model,
        tokensUsed: Math.ceil(tokensUsed / candidates.length),
        batchId: request.batchId
      }
    }));
  }

  /**
   * Parse location factors from AI response
   */
  private parseLocationFactors(factors: any[]): LocationFactor[] {
    return factors.map(factor => ({
      type: factor.type || 'ACCESSIBILITY',
      score: factor.score || 0.5,
      weight: factor.weight || 0.5,
      description: factor.description || 'Location factor'
    }));
  }

  /**
   * Validate and score location candidates
   */
  async validateCandidates(candidates: LocationCandidate[]): Promise<LocationCandidate[]> {
    // Basic validation - in a real implementation, this would include:
    // - Geographic validation (within bounds)
    // - Infrastructure checks (road access, utilities)
    // - Zoning compliance
    // - Distance from existing stores
    
    return candidates.filter(candidate => {
      // Basic validation rules
      if (candidate.lat === 0 || candidate.lng === 0) return false;
      if (candidate.viabilityScore < 0.1) return false;
      if (candidate.confidence < 0.1) return false;
      
      return true;
    }).map(candidate => ({
      ...candidate,
      // Enhance viability score based on factors
      viabilityScore: this.calculateEnhancedViabilityScore(candidate)
    }));
  }

  /**
   * Calculate enhanced viability score based on factors
   */
  private calculateEnhancedViabilityScore(candidate: LocationCandidate): number {
    if (candidate.factors.length === 0) {
      return candidate.viabilityScore;
    }

    const weightedScore = candidate.factors.reduce((sum, factor) => {
      return sum + (factor.score * factor.weight);
    }, 0);

    const totalWeight = candidate.factors.reduce((sum, factor) => sum + factor.weight, 0);
    
    if (totalWeight === 0) {
      return candidate.viabilityScore;
    }

    // Combine original score with factor-based score
    const factorScore = weightedScore / totalWeight;
    return (candidate.viabilityScore * 0.4) + (factorScore * 0.6);
  }

  /**
   * Filter candidates based on constraints and quality thresholds
   */
  filterCandidates(
    candidates: LocationCandidate[],
    constraints: any,
    qualityThreshold: number
  ): LocationCandidate[] {
    let filtered = candidates.filter(candidate => 
      candidate.viabilityScore >= qualityThreshold
    );

    // Apply distance constraints
    if (constraints.minDistanceFromExisting) {
      filtered = this.applyDistanceConstraints(filtered, constraints.minDistanceFromExisting);
    }

    // Sort by viability score (descending)
    return filtered.sort((a, b) => b.viabilityScore - a.viabilityScore);
  }

  /**
   * Apply distance constraints between candidates
   */
  private applyDistanceConstraints(
    candidates: LocationCandidate[],
    minDistance: number
  ): LocationCandidate[] {
    const filtered: LocationCandidate[] = [];
    
    for (const candidate of candidates) {
      const tooClose = filtered.some(existing => {
        const distance = this.calculateDistance(
          { lat: candidate.lat, lng: candidate.lng },
          { lat: existing.lat, lng: existing.lng }
        );
        return distance < minDistance;
      });

      if (!tooClose) {
        filtered.push(candidate);
      }
    }

    return filtered;
  }

  /**
   * Calculate quality metrics for candidates
   */
  private calculateQualityMetrics(candidates: LocationCandidate[]) {
    const highQuality = candidates.filter(c => c.viabilityScore > 0.8).length;
    const mediumQuality = candidates.filter(c => c.viabilityScore >= 0.5 && c.viabilityScore <= 0.8).length;
    const lowQuality = candidates.filter(c => c.viabilityScore < 0.5).length;
    
    const averageConfidence = candidates.length > 0 
      ? candidates.reduce((sum, c) => sum + c.confidence, 0) / candidates.length 
      : 0;

    // Simple spatial distribution analysis
    const spatialDistribution = this.analyzeSpatialDistribution(candidates);

    return {
      highQualityCandidates: highQuality,
      mediumQualityCandidates: mediumQuality,
      lowQualityCandidates: lowQuality,
      averageConfidence,
      spatialDistribution
    };
  }

  /**
   * Analyze spatial distribution of candidates
   */
  private analyzeSpatialDistribution(candidates: LocationCandidate[]): 'CLUSTERED' | 'DISTRIBUTED' | 'SPARSE' {
    if (candidates.length < 3) return 'SPARSE';

    // Calculate average distance between candidates
    let totalDistance = 0;
    let pairCount = 0;

    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const distance = this.calculateDistance(
          { lat: candidates[i].lat, lng: candidates[i].lng },
          { lat: candidates[j].lat, lng: candidates[j].lng }
        );
        totalDistance += distance;
        pairCount++;
      }
    }

    const averageDistance = totalDistance / pairCount;

    // Simple classification based on average distance
    if (averageDistance < 2000) return 'CLUSTERED'; // < 2km
    if (averageDistance < 10000) return 'DISTRIBUTED'; // 2-10km
    return 'SPARSE'; // > 10km
  }

  /**
   * Calculate batch quality score
   */
  private calculateBatchQualityScore(candidates: LocationCandidate[]): number {
    if (candidates.length === 0) return 0;
    
    const averageViability = candidates.reduce((sum, c) => sum + c.viabilityScore, 0) / candidates.length;
    const averageConfidence = candidates.reduce((sum, c) => sum + c.confidence, 0) / candidates.length;
    
    return (averageViability * 0.7) + (averageConfidence * 0.3);
  }

  /**
   * Calculate polygon centroid
   */
  private calculatePolygonCentroid(boundary: any): { lat: number; lng: number } {
    const coordinates = boundary.coordinates[0];
    const latSum = coordinates.reduce((sum: number, coord: number[]) => sum + coord[1], 0);
    const lngSum = coordinates.reduce((sum: number, coord: number[]) => sum + coord[0], 0);
    
    return {
      lat: latSum / coordinates.length,
      lng: lngSum / coordinates.length
    };
  }

  /**
   * Calculate polygon area (simplified)
   */
  private calculatePolygonArea(boundary: any): number {
    // Simplified area calculation - in reality would use proper geographic calculations
    const coordinates = boundary.coordinates[0];
    if (coordinates.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const [lng1, lat1] = coordinates[i];
      const [lng2, lat2] = coordinates[i + 1];
      area += (lng1 * lat2) - (lng2 * lat1);
    }
    
    // Convert to approximate km² (very rough approximation)
    return Math.abs(area) * 12400; // Rough conversion factor
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
   * Estimate cost based on tokens used
   */
  private estimateCost(tokens: number): number {
    const pricing = this.modelConfigManager.getModelPricing('gpt-5-nano');
    const inputTokens = tokens * 0.7; // Assume 70% input
    const outputTokens = tokens * 0.3; // Assume 30% output
    
    const costUSD = (inputTokens * pricing.inputTokensPerMillion / 1000000) + 
                   (outputTokens * pricing.outputTokensPerMillion / 1000000);
    
    return costUSD * 0.8; // Convert to GBP
  }

  /**
   * Get service performance statistics
   */
  getServiceStats() {
    const averageGenerationTime = this.totalBatchesProcessed > 0 
      ? this.totalGenerationTime / this.totalBatchesProcessed 
      : 0;
    
    const averageQualityScore = this.qualityScores.length > 0
      ? this.qualityScores.reduce((sum, score) => sum + score, 0) / this.qualityScores.length
      : 0;

    return {
      totalCandidatesGenerated: this.totalCandidatesGenerated,
      totalBatchesProcessed: this.totalBatchesProcessed,
      averageGenerationTime: Math.round(averageGenerationTime),
      totalTokensUsed: this.totalTokensUsed,
      totalCost: this.totalCost,
      averageQualityScore: Math.round(averageQualityScore * 100) / 100
    };
  }
}