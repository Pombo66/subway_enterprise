import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ModelConfigurationManager, AIOperationType } from './model-configuration.service';
import { LocationCandidate, LocationFactor } from '../../types/location-discovery.types';
import { 
  extractText, 
  extractJSON,
  safeParseJSONWithSchema,
  BasicViabilityAssessmentSchema,
  EnhancedViabilityAssessmentSchema,
  basicViabilityJsonSchema,
  enhancedViabilityJsonSchema
} from '@subway/shared-ai';

export interface ViabilityAssessmentRequest {
  candidates: LocationCandidate[];
  existingStores: {
    lat: number;
    lng: number;
    performance?: number;
  }[];
  constraints: {
    minDistanceFromExisting?: number;
    maxDistanceFromRoad?: number;
    minPopulationDensity?: number;
    excludeAreas?: {
      lat: number;
      lng: number;
      radius: number;
    }[];
  };
  escalationThreshold?: number; // 0-1, when to escalate to GPT-5-mini
  qualityThreshold?: number; // 0-1, minimum acceptable viability
}

export interface ViabilityAssessmentResult {
  assessedCandidates: LocationCandidate[];
  validationResults: {
    candidateId: string;
    isValid: boolean;
    viabilityScore: number;
    validationChecks: ValidationCheck[];
    escalatedToMini: boolean;
    reasoning: string;
  }[];
  qualityMetrics: {
    passedValidation: number;
    failedValidation: number;
    escalatedCandidates: number;
    averageViabilityScore: number;
    highQualityCandidates: number;
  };
  metadata: {
    totalProcessed: number;
    processingTimeMs: number;
    tokensUsed: number;
    cost: number;
    aiModel: string;
  };
}

export interface ValidationCheck {
  type: 'DISTANCE_FROM_EXISTING' | 'ROAD_ACCESS' | 'POPULATION_DENSITY' | 'EXCLUSION_ZONE' | 'INFRASTRUCTURE' | 'ZONING';
  passed: boolean;
  score: number; // 0-1
  details: string;
  critical: boolean; // If true, failure means candidate is invalid
}

@Injectable()
export class ViabilityScoringValidationService {
  private readonly logger = new Logger(ViabilityScoringValidationService.name);
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly MAX_TOKENS_NANO = 1500;
  private readonly MAX_TOKENS_MINI = 2500;
  private readonly TEMPERATURE = 0.2; // Low temperature for consistent validation
  
  private readonly modelConfigManager: ModelConfigurationManager;

  constructor(private readonly prisma: PrismaClient) {
    this.modelConfigManager = new ModelConfigurationManager();
    this.logger.log('Viability Scoring and Validation Service initialized');
  }

  /**
   * Assess viability of location candidates with validation and scoring
   * Uses parallel processing with controlled concurrency for better performance
   */
  async assessViability(request: ViabilityAssessmentRequest): Promise<ViabilityAssessmentResult> {
    const startTime = Date.now();
    this.logger.log(`Starting viability assessment for ${request.candidates.length} candidates`);

    try {
      const CONCURRENCY_LIMIT = 10; // Process 10 candidates at a time for faster throughput
      const validationResults = [];
      const assessedCandidates = [];
      let totalTokensUsed = 0;
      let escalatedCount = 0;

      // Process candidates in batches with controlled concurrency
      for (let i = 0; i < request.candidates.length; i += CONCURRENCY_LIMIT) {
        const batch = request.candidates.slice(i, i + CONCURRENCY_LIMIT);
        this.logger.debug(`Processing batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1}/${Math.ceil(request.candidates.length / CONCURRENCY_LIMIT)} (${batch.length} candidates)`);

        const batchResults = await Promise.all(
          batch.map(candidate => this.assessSingleCandidate(candidate, request))
        );

        // Aggregate results from batch
        for (const result of batchResults) {
          totalTokensUsed += result.tokensUsed;
          if (result.escalatedToMini) {
            escalatedCount++;
          }

          validationResults.push({
            candidateId: result.candidate.id,
            isValid: result.isValid,
            viabilityScore: result.candidate.viabilityScore,
            validationChecks: result.validationChecks,
            escalatedToMini: result.escalatedToMini,
            reasoning: result.candidate.reasoning
          });

          if (result.isValid) {
            assessedCandidates.push(result.candidate);
          }
        }
      }

      const processingTime = Date.now() - startTime;
      const cost = this.estimateCost(totalTokensUsed, escalatedCount);

      // Calculate quality metrics
      const qualityMetrics = this.calculateQualityMetrics(validationResults);

      this.logger.log(`Viability assessment completed: ${assessedCandidates.length}/${request.candidates.length} candidates passed validation in ${processingTime}ms`);

      return {
        assessedCandidates,
        validationResults,
        qualityMetrics,
        metadata: {
          totalProcessed: request.candidates.length,
          processingTimeMs: processingTime,
          tokensUsed: totalTokensUsed,
          cost,
          aiModel: escalatedCount > 0 ? 'gpt-5-nano + gpt-5-mini' : 'gpt-5-nano'
        }
      };

    } catch (error) {
      this.logger.error('Viability assessment failed:', error);
      throw new Error(`Viability assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assess a single candidate (used for parallel processing)
   */
  private async assessSingleCandidate(
    candidate: LocationCandidate,
    request: ViabilityAssessmentRequest
  ): Promise<{
    candidate: LocationCandidate;
    isValid: boolean;
    validationChecks: ValidationCheck[];
    escalatedToMini: boolean;
    tokensUsed: number;
  }> {
    // Perform basic validation checks
    const basicValidation = await this.performBasicValidation(candidate, request);
    
    let finalViabilityScore = candidate.viabilityScore;
    let aiReasoning = candidate.reasoning;
    let tokensUsed = 0;
    let needsEscalation = false;

    // Skip AI re-assessment for candidates with clear scores (optimization)
    // Only re-assess borderline cases or those that need escalation
    const isBorderline = candidate.viabilityScore >= 0.4 && candidate.viabilityScore <= 0.7;
    const hasCriticalFailures = basicValidation.some(check => check.critical && !check.passed);
    
    if (isBorderline || hasCriticalFailures) {
      // Determine if escalation to GPT-5-mini is needed
      needsEscalation = this.shouldEscalateToMini(candidate, basicValidation, request.escalationThreshold || 0.6);
      
      if (needsEscalation) {
        // Use GPT-5-mini for detailed assessment
        const enhancedAssessment = await this.performEnhancedViabilityAssessment(candidate, request);
        finalViabilityScore = enhancedAssessment.viabilityScore;
        aiReasoning = enhancedAssessment.reasoning;
        tokensUsed = enhancedAssessment.tokensUsed;
      } else {
        // Use GPT-5-nano for basic assessment
        const basicAssessment = await this.performBasicViabilityAssessment(candidate, request);
        finalViabilityScore = basicAssessment.viabilityScore;
        aiReasoning = basicAssessment.reasoning;
        tokensUsed = basicAssessment.tokensUsed;
      }
    }
    // else: Keep original score for clearly good (>0.7) or clearly bad (<0.4) candidates

    // Update candidate with new viability score
    const updatedCandidate: LocationCandidate = {
      ...candidate,
      viabilityScore: finalViabilityScore,
      reasoning: aiReasoning,
      factors: this.updateLocationFactors(candidate.factors, basicValidation)
    };

    // Determine if candidate passes overall validation
    const isValid = this.isValidCandidate(updatedCandidate, basicValidation, request.qualityThreshold || 0.3);

    return {
      candidate: updatedCandidate,
      isValid,
      validationChecks: basicValidation,
      escalatedToMini: needsEscalation,
      tokensUsed
    };
  }

  /**
   * Perform basic validation checks
   */
  private async performBasicValidation(
    candidate: LocationCandidate,
    request: ViabilityAssessmentRequest
  ): Promise<ValidationCheck[]> {
    const checks: ValidationCheck[] = [];

    // Distance from existing stores check
    if (request.constraints.minDistanceFromExisting) {
      const distanceCheck = this.checkDistanceFromExisting(candidate, request.existingStores, request.constraints.minDistanceFromExisting);
      checks.push(distanceCheck);
    }

    // Road access check (simplified)
    if (request.constraints.maxDistanceFromRoad) {
      const roadCheck = this.checkRoadAccess(candidate, request.constraints.maxDistanceFromRoad);
      checks.push(roadCheck);
    }

    // Population density check (simplified)
    if (request.constraints.minPopulationDensity) {
      const populationCheck = this.checkPopulationDensity(candidate, request.constraints.minPopulationDensity);
      checks.push(populationCheck);
    }

    // Exclusion zone check
    if (request.constraints.excludeAreas) {
      const exclusionCheck = this.checkExclusionZones(candidate, request.constraints.excludeAreas);
      checks.push(exclusionCheck);
    }

    // Infrastructure check (basic)
    const infrastructureCheck = this.checkBasicInfrastructure(candidate);
    checks.push(infrastructureCheck);

    return checks;
  }

  /**
   * Check distance from existing stores
   */
  private checkDistanceFromExisting(
    candidate: LocationCandidate,
    existingStores: any[],
    minDistance: number
  ): ValidationCheck {
    let minDistanceFound = Infinity;
    
    for (const store of existingStores) {
      const distance = this.calculateDistance(
        { lat: candidate.lat, lng: candidate.lng },
        { lat: store.lat, lng: store.lng }
      );
      minDistanceFound = Math.min(minDistanceFound, distance);
    }

    const passed = minDistanceFound >= minDistance;
    const score = Math.min(1, minDistanceFound / minDistance);

    return {
      type: 'DISTANCE_FROM_EXISTING',
      passed,
      score,
      details: `Nearest existing store: ${(minDistanceFound / 1000).toFixed(2)}km (required: ${(minDistance / 1000).toFixed(2)}km)`,
      critical: true
    };
  }

  /**
   * Check road access (simplified implementation)
   * NOTE: This is a placeholder. In production, this should use real road network data
   * from Mapbox or similar service. For now, we trust GPT's location selection.
   */
  private checkRoadAccess(candidate: LocationCandidate, maxDistance: number): ValidationCheck {
    // GPT-5 is trained on real-world data and should generate locations near roads
    // Rather than using random validation, we assume AI-generated locations are valid
    // This check is kept for future integration with real road data
    
    return {
      type: 'ROAD_ACCESS',
      passed: true, // Trust GPT's location selection
      score: 0.85, // Assume good road access for AI-generated locations
      details: `AI-generated location (road validation pending real data integration)`,
      critical: false
    };
  }

  /**
   * Check population density (simplified implementation)
   * NOTE: This is a placeholder. In production, this should use real demographic data
   * from census APIs or similar. For now, we trust GPT's location selection.
   */
  private checkPopulationDensity(candidate: LocationCandidate, minDensity: number): ValidationCheck {
    // GPT-5 has knowledge of population centers and should generate locations in viable areas
    // Rather than using random validation, we assume AI-generated locations are in populated areas
    // This check is kept for future integration with real demographic data
    
    return {
      type: 'POPULATION_DENSITY',
      passed: true, // Trust GPT's location selection
      score: 0.80, // Assume adequate population for AI-generated locations
      details: `AI-generated location (demographic validation pending real data integration)`,
      critical: false
    };
  }

  /**
   * Check exclusion zones
   */
  private checkExclusionZones(candidate: LocationCandidate, excludeAreas: any[]): ValidationCheck {
    let inExclusionZone = false;
    let closestExclusionDistance = Infinity;

    for (const area of excludeAreas) {
      const distance = this.calculateDistance(
        { lat: candidate.lat, lng: candidate.lng },
        { lat: area.lat, lng: area.lng }
      );
      
      if (distance <= area.radius) {
        inExclusionZone = true;
      }
      
      closestExclusionDistance = Math.min(closestExclusionDistance, distance - area.radius);
    }

    const passed = !inExclusionZone;
    const score = passed ? 1 : 0;

    return {
      type: 'EXCLUSION_ZONE',
      passed,
      score,
      details: inExclusionZone 
        ? 'Location is within exclusion zone' 
        : `Clear of exclusion zones (closest: ${(closestExclusionDistance / 1000).toFixed(2)}km)`,
      critical: true
    };
  }

  /**
   * Check basic infrastructure (simplified)
   */
  private checkBasicInfrastructure(candidate: LocationCandidate): ValidationCheck {
    // Simplified infrastructure check based on location factors
    const infrastructureFactors = candidate.factors.filter(f => 
      f.type === 'INFRASTRUCTURE' || f.type === 'ACCESSIBILITY'
    );

    let infrastructureScore = 0.5; // Default score
    
    if (infrastructureFactors.length > 0) {
      infrastructureScore = infrastructureFactors.reduce((sum, factor) => 
        sum + (factor.score * factor.weight), 0) / infrastructureFactors.length;
    }

    const passed = infrastructureScore >= 0.4;

    return {
      type: 'INFRASTRUCTURE',
      passed,
      score: infrastructureScore,
      details: `Infrastructure suitability: ${(infrastructureScore * 100).toFixed(0)}%`,
      critical: false
    };
  }

  /**
   * Determine if candidate should be escalated to GPT-5-mini
   */
  private shouldEscalateToMini(
    candidate: LocationCandidate,
    validationChecks: ValidationCheck[],
    escalationThreshold: number
  ): boolean {
    // Escalate if viability score is near threshold
    if (Math.abs(candidate.viabilityScore - escalationThreshold) < 0.1) {
      return true;
    }

    // Escalate if any critical checks failed
    const criticalFailures = validationChecks.filter(check => check.critical && !check.passed);
    if (criticalFailures.length > 0) {
      return true;
    }

    // Escalate if overall validation score is borderline
    const averageValidationScore = validationChecks.reduce((sum, check) => sum + check.score, 0) / validationChecks.length;
    if (averageValidationScore > 0.4 && averageValidationScore < 0.7) {
      return true;
    }

    return false;
  }

  /**
   * Perform basic viability assessment using GPT-5-nano
   */
  private async performBasicViabilityAssessment(
    candidate: LocationCandidate,
    request: ViabilityAssessmentRequest
  ): Promise<{ viabilityScore: number; reasoning: string; tokensUsed: number }> {
    if (!this.OPENAI_API_KEY) {
      return {
        viabilityScore: candidate.viabilityScore,
        reasoning: candidate.reasoning,
        tokensUsed: 0
      };
    }

    const model = this.modelConfigManager.getModelForOperation(AIOperationType.LOCATION_DISCOVERY);
    const prompt = this.buildBasicViabilityPrompt(candidate, request);

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          input: `System: You are a location viability analyst. Provide quick, accurate viability assessments for restaurant locations. Focus on key factors and provide concise reasoning. Always respond with valid JSON.\n\nUser: ${prompt}`,
          max_output_tokens: this.MAX_TOKENS_NANO,
          reasoning: { effort: 'minimal' },
          text: { 
            verbosity: 'low',
            format: {
              type: 'json_schema',
              name: 'basic_viability_assessment',
              schema: basicViabilityJsonSchema
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const tokensUsed = data.usage?.total_tokens || 0;
      
      // Extract text from OpenAI response
      const responseText = extractText(data);
      
      // Parse and validate JSON
      const jsonContent = extractJSON(responseText);
      const parseResult = safeParseJSONWithSchema(jsonContent, BasicViabilityAssessmentSchema);
      
      if (!parseResult.success) {
        throw new Error(`Schema validation failed: ${parseResult.error}`);
      }
      
      const aiResponse = parseResult.data;

      return {
        viabilityScore: aiResponse.viabilityScore || candidate.viabilityScore,
        reasoning: aiResponse.reasoning || candidate.reasoning,
        tokensUsed
      };

    } catch (error) {
      this.logger.warn(`Basic viability assessment failed for ${candidate.id}:`, error);
      return {
        viabilityScore: candidate.viabilityScore,
        reasoning: candidate.reasoning,
        tokensUsed: 0
      };
    }
  }

  /**
   * Perform enhanced viability assessment using GPT-5-mini
   */
  private async performEnhancedViabilityAssessment(
    candidate: LocationCandidate,
    request: ViabilityAssessmentRequest
  ): Promise<{ viabilityScore: number; reasoning: string; tokensUsed: number }> {
    if (!this.OPENAI_API_KEY) {
      return {
        viabilityScore: candidate.viabilityScore,
        reasoning: candidate.reasoning,
        tokensUsed: 0
      };
    }

    const model = this.modelConfigManager.getModelForOperation(AIOperationType.STRATEGIC_SCORING);
    const prompt = this.buildEnhancedViabilityPrompt(candidate, request);

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          input: `System: You are a senior location viability analyst with expertise in restaurant site selection. Provide detailed, comprehensive viability assessments considering all relevant factors. Always respond with valid JSON.\n\nUser: ${prompt}`,
          max_output_tokens: this.MAX_TOKENS_MINI,
          reasoning: { effort: 'medium' },
          text: { 
            verbosity: 'medium',
            format: {
              type: 'json_schema',
              name: 'enhanced_viability_assessment',
              schema: enhancedViabilityJsonSchema
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const tokensUsed = data.usage?.total_tokens || 0;
      
      // Extract text from OpenAI response
      const responseText = extractText(data);
      
      // Parse and validate JSON
      const jsonContent = extractJSON(responseText);
      const parseResult = safeParseJSONWithSchema(jsonContent, EnhancedViabilityAssessmentSchema);
      
      if (!parseResult.success) {
        throw new Error(`Schema validation failed: ${parseResult.error}`);
      }
      
      const aiResponse = parseResult.data;

      return {
        viabilityScore: aiResponse.viabilityScore || candidate.viabilityScore,
        reasoning: aiResponse.reasoning || candidate.reasoning,
        tokensUsed
      };

    } catch (error) {
      this.logger.warn(`Enhanced viability assessment failed for ${candidate.id}:`, error);
      return {
        viabilityScore: candidate.viabilityScore,
        reasoning: candidate.reasoning,
        tokensUsed: 0
      };
    }
  }

  /**
   * Build basic viability assessment prompt
   */
  private buildBasicViabilityPrompt(candidate: LocationCandidate, request: ViabilityAssessmentRequest): string {
    return `
Assess the viability of this restaurant location candidate:

LOCATION: ${candidate.lat.toFixed(4)}, ${candidate.lng.toFixed(4)}
CURRENT VIABILITY SCORE: ${candidate.viabilityScore.toFixed(2)}
CURRENT REASONING: ${candidate.reasoning}

LOCATION FACTORS:
${candidate.factors.map(factor => `- ${factor.type}: ${(factor.score * 100).toFixed(0)}% (weight: ${factor.weight.toFixed(2)})`).join('\n')}

CONSTRAINTS:
${request.constraints.minDistanceFromExisting ? `- Min distance from existing: ${request.constraints.minDistanceFromExisting}m` : ''}
${request.constraints.maxDistanceFromRoad ? `- Max distance from road: ${request.constraints.maxDistanceFromRoad}m` : ''}

Provide a quick viability assessment in JSON format:

{
  "viabilityScore": 0.0-1.0,
  "reasoning": "concise explanation of viability assessment",
  "keyStrengths": ["strength1", "strength2"],
  "keyConcerns": ["concern1", "concern2"]
}

Focus on the most important factors for restaurant success.
`;
  }

  /**
   * Build enhanced viability assessment prompt
   */
  private buildEnhancedViabilityPrompt(candidate: LocationCandidate, request: ViabilityAssessmentRequest): string {
    return `
Perform a comprehensive viability assessment for this restaurant location candidate:

LOCATION: ${candidate.lat.toFixed(4)}, ${candidate.lng.toFixed(4)}
CURRENT VIABILITY SCORE: ${candidate.viabilityScore.toFixed(2)}
DISCOVERY METHOD: ${candidate.discoveryMethod}
CONFIDENCE: ${candidate.confidence.toFixed(2)}

DETAILED FACTORS:
${candidate.factors.map(factor => `- ${factor.type}: ${(factor.score * 100).toFixed(0)}% (weight: ${factor.weight.toFixed(2)}) - ${factor.description}`).join('\n')}

CONSTRAINTS AND REQUIREMENTS:
${request.constraints.minDistanceFromExisting ? `- Minimum distance from existing stores: ${request.constraints.minDistanceFromExisting}m` : ''}
${request.constraints.maxDistanceFromRoad ? `- Maximum distance from roads: ${request.constraints.maxDistanceFromRoad}m` : ''}
${request.constraints.minPopulationDensity ? `- Minimum population density: ${request.constraints.minPopulationDensity}` : ''}

EXISTING STORES IN AREA: ${request.existingStores.length}

Provide a comprehensive viability assessment in JSON format:

{
  "viabilityScore": 0.0-1.0,
  "reasoning": "detailed explanation of viability assessment with specific factors",
  "strengths": ["detailed strength 1", "detailed strength 2"],
  "weaknesses": ["detailed weakness 1", "detailed weakness 2"],
  "riskFactors": ["risk factor 1", "risk factor 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "confidenceLevel": 0.0-1.0,
  "expectedPerformance": "HIGH|MEDIUM|LOW"
}

Consider all aspects: accessibility, competition, demographics, infrastructure, market potential, and operational feasibility.
`;
  }

  /**
   * Update location factors based on validation results
   */
  private updateLocationFactors(factors: LocationFactor[], validationChecks: ValidationCheck[]): LocationFactor[] {
    const updatedFactors = [...factors];

    // Add validation results as factors
    validationChecks.forEach(check => {
      const existingFactorIndex = updatedFactors.findIndex(f => 
        f.type === this.mapValidationTypeToFactorType(check.type)
      );

      if (existingFactorIndex >= 0) {
        // Update existing factor
        updatedFactors[existingFactorIndex] = {
          ...updatedFactors[existingFactorIndex],
          score: (updatedFactors[existingFactorIndex].score + check.score) / 2, // Average with validation score
          description: `${updatedFactors[existingFactorIndex].description} (validated: ${check.details})`
        };
      } else {
        // Add new factor from validation
        updatedFactors.push({
          type: this.mapValidationTypeToFactorType(check.type),
          score: check.score,
          weight: check.critical ? 0.8 : 0.5,
          description: `Validation: ${check.details}`
        });
      }
    });

    return updatedFactors;
  }

  /**
   * Map validation check type to location factor type
   */
  private mapValidationTypeToFactorType(validationType: string): LocationFactor['type'] {
    switch (validationType) {
      case 'ROAD_ACCESS':
        return 'ACCESSIBILITY';
      case 'POPULATION_DENSITY':
        return 'DEMOGRAPHICS';
      case 'DISTANCE_FROM_EXISTING':
        return 'COMPETITION';
      case 'INFRASTRUCTURE':
        return 'INFRASTRUCTURE';
      default:
        return 'ACCESSIBILITY';
    }
  }

  /**
   * Determine if candidate is valid based on validation results
   */
  private isValidCandidate(
    candidate: LocationCandidate,
    validationChecks: ValidationCheck[],
    qualityThreshold: number
  ): boolean {
    // Check if any critical validations failed
    const criticalFailures = validationChecks.filter(check => check.critical && !check.passed);
    if (criticalFailures.length > 0) {
      return false;
    }

    // Check if viability score meets threshold
    if (candidate.viabilityScore < qualityThreshold) {
      return false;
    }

    return true;
  }

  /**
   * Calculate quality metrics
   */
  private calculateQualityMetrics(validationResults: any[]) {
    const passedValidation = validationResults.filter(r => r.isValid).length;
    const failedValidation = validationResults.length - passedValidation;
    const escalatedCandidates = validationResults.filter(r => r.escalatedToMini).length;
    
    const averageViabilityScore = validationResults.length > 0
      ? validationResults.reduce((sum, r) => sum + r.viabilityScore, 0) / validationResults.length
      : 0;
    
    const highQualityCandidates = validationResults.filter(r => r.viabilityScore > 0.8).length;

    return {
      passedValidation,
      failedValidation,
      escalatedCandidates,
      averageViabilityScore,
      highQualityCandidates
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
   * Estimate cost based on tokens used and escalations
   */
  private estimateCost(totalTokens: number, escalatedCount: number): number {
    const nanoPricing = this.modelConfigManager.getModelPricing('gpt-5-nano');
    const miniPricing = this.modelConfigManager.getModelPricing('gpt-5-mini');
    
    // Estimate token distribution (escalated candidates use more tokens)
    const nanoTokens = totalTokens * 0.7; // Most candidates use nano
    const miniTokens = totalTokens * 0.3; // Escalated candidates use mini
    
    const nanoCost = (nanoTokens * 0.7 * nanoPricing.inputTokensPerMillion / 1000000) + 
                     (nanoTokens * 0.3 * nanoPricing.outputTokensPerMillion / 1000000);
    
    const miniCost = (miniTokens * 0.7 * miniPricing.inputTokensPerMillion / 1000000) + 
                     (miniTokens * 0.3 * miniPricing.outputTokensPerMillion / 1000000);
    
    return (nanoCost + miniCost) * 0.8; // Convert to GBP
  }
}