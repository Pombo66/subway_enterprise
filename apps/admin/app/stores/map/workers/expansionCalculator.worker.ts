/**
 * Web Worker for expansion score calculations with deterministic seeding
 * Runs off the main thread to prevent UI blocking during complex calculations
 */

import { ScopeSelection, ExpansionSuggestion } from '../components/expansion/types';

// Message types for worker communication
interface CalculateMessage {
  type: 'CALCULATE_SUGGESTIONS';
  payload: {
    scope: ScopeSelection;
    intensity: number;
    dataMode: 'live' | 'modelled';
    modelVersion: string;
    minDistance: number;
    maxPerCity?: number;
    candidateSites: CandidateSite[];
  };
}

interface CandidateSite {
  lat: number;
  lng: number;
  withinScope: boolean;
  subwayDensity: number;
  populationDensity: number;
  poiDensity: number;
  infrastructureScore: number;
  nearestSubwayDistance: number;
  population: number;
  footfallIndex: number;
  incomeIndex: number;
  competitorIdx: number;
}

interface CalculationResult {
  type: 'CALCULATION_COMPLETE';
  payload: {
    suggestions: ExpansionSuggestion[];
    metadata: {
      totalCandidates: number;
      filteredCandidates: number;
      calculationTimeMs: number;
      cacheKey: string;
    };
  };
}

interface CalculationError {
  type: 'CALCULATION_ERROR';
  payload: {
    error: string;
    details?: any;
  };
}

type WorkerMessage = CalculateMessage;
type WorkerResponse = CalculationResult | CalculationError;

/**
 * Simple hash function for deterministic seeding
 * Based on djb2 algorithm for consistent results
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Generate deterministic seed from coordinates and context
 */
function generateDeterministicSeed(
  lat: number, 
  lng: number, 
  scope: string, 
  modelVersion: string
): number {
  const seedString = `${lat.toFixed(6)}_${lng.toFixed(6)}_${scope}_${modelVersion}`;
  return hashString(seedString);
}

/**
 * Seeded random number generator for deterministic results
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  nextFloat(min: number = 0, max: number = 1): number {
    return min + (max - min) * this.next();
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat(min, max + 1));
  }
}

/**
 * Calculate expansion score for a candidate site
 */
function calculateExpansionScore(
  candidate: CandidateSite,
  scope: ScopeSelection,
  modelVersion: string,
  dataMode: 'live' | 'modelled'
): number {
  // Generate deterministic seed
  const scopeString = scope.type === 'custom_area' ? 'custom' : scope.value;
  const seed = generateDeterministicSeed(candidate.lat, candidate.lng, scopeString, modelVersion);
  const rng = new SeededRandom(seed);

  // Normalize input values to 0-1 range
  const populationNorm = Math.min(candidate.population / 200000, 1.0);
  const footfallNorm = Math.max(0, Math.min(1, candidate.footfallIndex));
  const incomeNorm = Math.max(0, Math.min(1, candidate.incomeIndex));
  const competitorNorm = Math.max(0, Math.min(1, candidate.competitorIdx));
  
  // Calculate demand score (weighted combination)
  const demandScore = populationNorm * 0.5 + footfallNorm * 0.3 + incomeNorm * 0.2;
  
  // Calculate penalties
  const cannibalizationPenalty = candidate.nearestSubwayDistance > 0 
    ? Math.min(1, 3.0 / candidate.nearestSubwayDistance) // Stronger penalty for closer stores
    : 1.0;
  
  const competitionPenalty = competitorNorm * 0.4;
  
  // Calculate ops fit score (infrastructure and accessibility)
  const opsFitScore = Math.max(0, Math.min(1, candidate.infrastructureScore));
  
  // Base expansion score calculation
  const demandWeight = 0.6;
  const cannibalizationWeight = 0.25;
  const competitionWeight = 0.15;
  
  let baseScore = demandWeight * demandScore - 
                  cannibalizationWeight * cannibalizationPenalty - 
                  competitionWeight * competitionPenalty;
  
  // Apply ops fit multiplier
  baseScore *= (0.5 + 0.5 * opsFitScore);
  
  // Add deterministic noise for tie-breaking (small amount)
  const tieBreaker = rng.nextFloat(-0.001, 0.001);
  
  // Clamp final score to valid range
  const finalScore = Math.max(0, Math.min(1, baseScore + tieBreaker));
  
  return finalScore;
}

/**
 * Calculate confidence score based on data quality
 */
function calculateConfidence(candidate: CandidateSite, dataMode: 'live' | 'modelled'): number {
  // Base confidence depends on data mode
  let baseConfidence = dataMode === 'live' ? 0.85 : 0.75;
  
  // Adjust based on data completeness and consistency
  const dataVariance = Math.abs(candidate.footfallIndex - candidate.incomeIndex) + 
                      Math.abs(candidate.populationDensity - candidate.poiDensity);
  
  const variancePenalty = Math.min(0.3, dataVariance / 2);
  
  // Distance to existing stores affects confidence
  const distanceBonus = candidate.nearestSubwayDistance > 2 ? 0.1 : 0;
  
  const confidence = Math.max(0.3, Math.min(0.95, 
    baseConfidence - variancePenalty + distanceBonus
  ));
  
  return confidence;
}

/**
 * Apply anti-cannibalization filter
 */
function applyCannibalizationFilter(
  candidates: CandidateSite[], 
  minDistance: number
): CandidateSite[] {
  return candidates.filter(candidate => 
    candidate.nearestSubwayDistance >= minDistance
  );
}

/**
 * Generate cache key for deterministic results
 */
function generateCacheKey(
  scope: ScopeSelection,
  intensity: number,
  modelVersion: string,
  dataMode: 'live' | 'modelled'
): string {
  const scopeKey = scope.type === 'custom_area' 
    ? `custom_${hashString(JSON.stringify(scope.polygon))}`
    : `${scope.type}_${scope.value}`;
  
  return hashString(`${scopeKey}_${intensity}_${modelVersion}_${dataMode}`).toString();
}

/**
 * Main calculation function
 */
function calculateSuggestions(payload: CalculateMessage['payload']): ExpansionSuggestion[] {
  const startTime = performance.now();
  
  const {
    scope,
    intensity,
    dataMode,
    modelVersion,
    minDistance,
    maxPerCity,
    candidateSites
  } = payload;

  // Filter candidates within scope and apply anti-cannibalization
  let filteredCandidates = candidateSites.filter(site => site.withinScope);
  filteredCandidates = applyCannibalizationFilter(filteredCandidates, minDistance);

  // Calculate scores for all candidates
  const scoredCandidates = filteredCandidates.map(candidate => {
    const finalScore = calculateExpansionScore(candidate, scope, modelVersion, dataMode);
    const confidence = calculateConfidence(candidate, dataMode);
    
    return {
      candidate,
      finalScore,
      confidence
    };
  });

  // Sort by score (deterministic due to seeded tie-breaking)
  scoredCandidates.sort((a, b) => b.finalScore - a.finalScore);

  // Calculate target count based on intensity
  const maxSuggestions = Math.min(300, filteredCandidates.length); // Absolute cap
  const targetCount = Math.round((intensity / 100) * maxSuggestions);

  // Select top suggestions
  const topSuggestions = scoredCandidates.slice(0, targetCount);

  // Convert to ExpansionSuggestion format
  const suggestions: ExpansionSuggestion[] = topSuggestions.map((item, index) => {
    const { candidate, finalScore, confidence } = item;
    
    // Generate deterministic POI list (simplified)
    const seed = generateDeterministicSeed(candidate.lat, candidate.lng, scope.value, modelVersion);
    const rng = new SeededRandom(seed + 1000); // Offset for POI generation
    
    const poiOptions = ['Shopping Center', 'Transit Hub', 'University', 'Hospital', 'Office Complex', 'Residential Area'];
    const topPOIs = Array.from({ length: 3 }, () => 
      poiOptions[rng.nextInt(0, poiOptions.length - 1)]
    );

    return {
      id: `suggestion_${hashString(`${candidate.lat}_${candidate.lng}_${modelVersion}`)}`,
      lat: candidate.lat,
      lng: candidate.lng,
      finalScore: Number(finalScore.toFixed(3)),
      confidence: Number(confidence.toFixed(3)),
      dataMode,
      demandScore: Number((candidate.populationDensity * 0.5 + candidate.footfallIndex * 0.3 + candidate.incomeIndex * 0.2).toFixed(3)),
      cannibalizationPenalty: Number((candidate.nearestSubwayDistance > 0 ? 3.0 / candidate.nearestSubwayDistance : 1.0).toFixed(3)),
      opsFitScore: Number(candidate.infrastructureScore.toFixed(3)),
      nearestSubwayDistance: Number(candidate.nearestSubwayDistance.toFixed(1)),
      topPOIs,
      cacheKey: generateCacheKey(scope, intensity, modelVersion, dataMode),
      modelVersion,
      dataSnapshotDate: new Date().toISOString()
    };
  });

  return suggestions;
}

// Worker message handler
self.onmessage = function(event: MessageEvent<WorkerMessage>) {
  const { type, payload } = event.data;
  
  if (type === 'CALCULATE_SUGGESTIONS') {
    try {
      const startTime = performance.now();
      
      const suggestions = calculateSuggestions(payload);
      
      const calculationTimeMs = performance.now() - startTime;
      
      const response: CalculationResult = {
        type: 'CALCULATION_COMPLETE',
        payload: {
          suggestions,
          metadata: {
            totalCandidates: payload.candidateSites.length,
            filteredCandidates: payload.candidateSites.filter(s => s.withinScope).length,
            calculationTimeMs: Math.round(calculationTimeMs),
            cacheKey: generateCacheKey(payload.scope, payload.intensity, payload.modelVersion, payload.dataMode)
          }
        }
      };
      
      self.postMessage(response);
      
    } catch (error) {
      const errorResponse: CalculationError = {
        type: 'CALCULATION_ERROR',
        payload: {
          error: error instanceof Error ? error.message : 'Unknown calculation error',
          details: error
        }
      };
      
      self.postMessage(errorResponse);
    }
  }
};

// Export types for TypeScript
export type { WorkerMessage, WorkerResponse, CandidateSite };