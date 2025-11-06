/**
 * AI Pipeline Types
 * Shared types for the AI-driven expansion pipeline
 */

export interface PipelineExecutionRequest {
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
  targetCandidates: number;
  businessObjectives: {
    targetRevenue?: number;
    riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
    expansionSpeed: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
    marketPriorities: string[];
  };
  pipelineConfig?: {
    enableMarketAnalysis: boolean;
    enableZoneIdentification: boolean;
    enableLocationDiscovery: boolean;
    enableViabilityValidation: boolean;
    enableStrategicScoring: boolean;
    qualityThreshold: number;
  };
}

export interface PipelineExecutionResult {
  finalCandidates: any[];
  pipelineStages: {
    marketAnalysis?: any;
    strategicZones?: any[];
    locationCandidates?: any[];
    validatedCandidates?: any[];
    scoredCandidates?: any[];
  };
  metadata: {
    totalExecutionTime: number;
    stagesExecuted: string[];
    totalTokensUsed: number;
    totalCost: number;
    successfulStages: number;
    failedStages: number;
  };
  qualityMetrics: {
    candidateQuality: number;
    pipelineEfficiency: number;
    costEffectiveness: number;
  };
}

export interface IAIPipelineController {
  executePipeline(request: PipelineExecutionRequest): Promise<PipelineExecutionResult>;
}
