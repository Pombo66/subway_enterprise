export interface LocationCandidate {
  id: string;
  lat: number;
  lng: number;
  confidence: number; // 0-1
  viabilityScore: number; // 0-1
  discoveryMethod: 'AI_GENERATED' | 'STRATEGIC_ZONE' | 'COMPETITIVE_GAP' | 'DEMOGRAPHIC_INSIGHT';
  reasoning: string;
  factors: LocationFactor[];
  metadata: {
    generatedAt: Date;
    aiModel: string;
    tokensUsed: number;
    batchId?: string;
  };
}

export interface LocationFactor {
  type: 'POPULATION_DENSITY' | 'FOOT_TRAFFIC' | 'ACCESSIBILITY' | 'COMPETITION' | 'DEMOGRAPHICS' | 'INFRASTRUCTURE';
  score: number; // 0-1
  weight: number; // 0-1
  description: string;
}

export interface LocationDiscoveryRequest {
  strategicZones: {
    id: string;
    boundary: {
      type: 'Polygon';
      coordinates: number[][][];
    };
    priority: number;
    expectedStores: number;
  }[];
  targetCount: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  existingStores: {
    lat: number;
    lng: number;
  }[];
  constraints?: {
    minDistanceFromExisting?: number; // meters
    maxDistanceFromRoad?: number; // meters
    minPopulationDensity?: number;
    excludeAreas?: {
      lat: number;
      lng: number;
      radius: number;
    }[];
  };
  batchSize?: number;
  qualityThreshold?: number; // 0-1, minimum viability score
}

export interface LocationDiscoveryResult {
  candidates: LocationCandidate[];
  metadata: {
    totalGenerated: number;
    totalFiltered: number;
    averageViabilityScore: number;
    batchesProcessed: number;
    totalTokensUsed: number;
    totalCost: number;
    generationTimeMs: number;
    aiModel: string;
  };
  qualityMetrics: {
    highQualityCandidates: number; // score > 0.8
    mediumQualityCandidates: number; // score 0.5-0.8
    lowQualityCandidates: number; // score < 0.5
    averageConfidence: number;
    spatialDistribution: 'CLUSTERED' | 'DISTRIBUTED' | 'SPARSE';
  };
}

export interface BatchGenerationRequest {
  zoneId: string;
  zoneBoundary: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  targetCandidates: number;
  existingStores: { lat: number; lng: number }[];
  constraints: any;
  batchId: string;
}

export interface BatchGenerationResult {
  batchId: string;
  candidates: LocationCandidate[];
  tokensUsed: number;
  processingTimeMs: number;
  qualityScore: number;
}