import { 
  LocationDiscoveryRequest, 
  LocationDiscoveryResult, 
  LocationCandidate,
  BatchGenerationRequest,
  BatchGenerationResult
} from '../types/location-discovery.types';

/**
 * Interface for Location Discovery Service using GPT-5-nano
 */
export interface ILocationDiscoveryService {
  /**
   * Discover location candidates using strategic zones and AI analysis
   */
  discoverLocations(request: LocationDiscoveryRequest): Promise<LocationDiscoveryResult>;

  /**
   * Generate candidates for a specific strategic zone
   */
  generateCandidatesForZone(
    zoneId: string,
    zoneBoundary: any,
    targetCount: number,
    constraints?: any
  ): Promise<LocationCandidate[]>;

  /**
   * Process batch generation for high-volume candidate discovery
   */
  processBatch(request: BatchGenerationRequest): Promise<BatchGenerationResult>;

  /**
   * Validate and score location candidates
   */
  validateCandidates(candidates: LocationCandidate[]): Promise<LocationCandidate[]>;

  /**
   * Filter candidates based on constraints and quality thresholds
   */
  filterCandidates(
    candidates: LocationCandidate[],
    constraints: any,
    qualityThreshold: number
  ): LocationCandidate[];

  /**
   * Get service performance statistics
   */
  getServiceStats(): {
    totalCandidatesGenerated: number;
    totalBatchesProcessed: number;
    averageGenerationTime: number;
    totalTokensUsed: number;
    totalCost: number;
    averageQualityScore: number;
  };
}