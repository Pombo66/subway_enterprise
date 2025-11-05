/**
 * Service interfaces for intelligent expansion placement system
 * Defines contracts for AI-driven context analysis, rationale diversification, and placement intelligence
 */

import {
  AIContextAnalysis,
  ContextualInsights,
  LocationData,
  CompetitorData,
  DemographicData,
  AccessibilityData,
  UniqueRationale,
  DiversityReport,
  RationaleCandidate,
  AIPlacementScore,
  AIPatternAnalysis,
  OptimizedPlacement,
  PlacementConstraints,
  ExpansionCandidate,
  RegionData,
  AIRankedLocations,
  IntensityOptimizedSelection,
  SaturationAnalysis,
  ExpansionIntensity,
  MarketConditions,
  GeographicConstraints
} from '../types/intelligent-expansion.types';

import { RationaleContext } from '../openai-rationale.service';

/**
 * OpenAI Context Analysis Service Interface
 * Provides AI-driven location context analysis with unique insights for each location
 */
export interface IOpenAIContextAnalysisService {
  /**
   * Analyze individual location with AI using unique coordinates and context
   */
  analyzeIndividualLocationWithAI(
    lat: number,
    lng: number,
    locationSpecificData: LocationData,
    nearbyCompetitors: CompetitorData[],
    localDemographics: DemographicData
  ): Promise<AIContextAnalysis>;

  /**
   * Generate unique contextual insights for specific location
   */
  generateUniqueContextualInsights(
    uniqueLocationData: LocationData,
    locationSpecificCompetitors: CompetitorData[],
    individualAccessibilityData: AccessibilityData
  ): Promise<ContextualInsights>;

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    apiCalls: number;
    totalTokensUsed: number;
  };
}

/**
 * OpenAI Rationale Diversification Service Interface
 * Extends existing rationale service with diversity enforcement and uniqueness validation
 */
export interface IOpenAIRationaleDiversificationService {
  /**
   * Generate location-specific rationale with uniqueness enforcement
   */
  generateLocationSpecificRationale(
    individualLocationContext: RationaleContext,
    existingRationales: string[],
    uniqueLocationInsights: ContextualInsights,
    locationCoordinates: { lat: number; lng: number }
  ): Promise<UniqueRationale>;

  /**
   * Validate diversity of individual location rationales
   */
  validateIndividualRationaleDiversity(
    locationSpecificRationales: string[]
  ): Promise<DiversityReport>;

  /**
   * Enforce location uniqueness using AI analysis
   */
  enforceLocationUniquenessWithAI(
    individualCandidates: RationaleCandidate[],
    targetCount: number
  ): Promise<UniqueRationale[]>;

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    apiCalls: number;
    totalTokensUsed: number;
  };
}

/**
 * OpenAI Placement Intelligence Service Interface
 * Provides AI-driven placement analysis and pattern detection
 */
export interface IOpenAIPlacementIntelligenceService {
  /**
   * Evaluate location viability using AI analysis
   */
  evaluateLocationViabilityWithAI(
    candidate: ExpansionCandidate,
    contextualData: LocationData,
    existingStores: Array<{ id: string; latitude: number; longitude: number; state: string }>
  ): Promise<AIPlacementScore>;

  /**
   * Detect placement patterns using AI analysis
   */
  detectPlacementPatternsWithAI(
    candidates: ExpansionCandidate[],
    regionData: RegionData
  ): Promise<AIPatternAnalysis>;

  /**
   * Optimize placement using AI recommendations
   */
  optimizePlacementWithAI(
    candidates: ExpansionCandidate[],
    targetCount: number,
    constraints: PlacementConstraints
  ): Promise<OptimizedPlacement>;

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    apiCalls: number;
    totalTokensUsed: number;
  };
}

/**
 * OpenAI Expansion Intensity Service Interface
 * Provides AI-driven intensity scaling and market potential analysis
 */
export interface IOpenAIExpansionIntensityService {
  /**
   * Rank locations by market potential using AI analysis
   */
  rankLocationsByPotentialWithAI(
    allCandidates: ExpansionCandidate[],
    regionData: RegionData,
    marketConditions: MarketConditions
  ): Promise<AIRankedLocations>;

  /**
   * Select optimal locations for specific intensity level
   */
  selectOptimalLocationsForIntensity(
    rankedLocations: AIRankedLocations,
    intensityLevel: ExpansionIntensity,
    geographicConstraints: GeographicConstraints
  ): Promise<IntensityOptimizedSelection>;

  /**
   * Analyze market saturation using AI
   */
  analyzeMarketSaturationWithAI(
    highPotentialLocations: ExpansionCandidate[],
    existingStores: Array<{ id: string; latitude: number; longitude: number; state: string }>,
    targetIntensity: ExpansionIntensity
  ): Promise<SaturationAnalysis>;

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    apiCalls: number;
    totalTokensUsed: number;
  };
}