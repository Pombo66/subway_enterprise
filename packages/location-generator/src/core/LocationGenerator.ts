import { 
  GenerationRequest, 
  GenerationResult, 
  GenerationConfig,
  ProcessingContext 
} from '../types/config';
import { LocationCandidate, CandidateStatus, SystemDiagnostics, PortfolioSummary, ReproducibilityInfo } from '../types/core';
import { 
  GridService, 
  FeatureService, 
  ScoringService, 
  ConstraintService, 
  ShortlistService,
  RefinementService,
  PortfolioService,
  AIService
} from '../services/impl';

/**
 * Main orchestrator for the National Store Location Generator
 * Implements the deterministic multi-stage pipeline with optional AI enhancement
 */
export class LocationGenerator {
  private gridService: GridService;
  private featureService: FeatureService;
  private scoringService: ScoringService;
  private constraintService: ConstraintService;
  private shortlistService: ShortlistService;
  private refinementService: RefinementService;
  private portfolioService: PortfolioService;
  private aiService: AIService;

  constructor() {
    // Initialize all services
    this.gridService = new GridService();
    this.featureService = new FeatureService();
    this.scoringService = new ScoringService();
    this.constraintService = new ConstraintService();
    this.shortlistService = new ShortlistService();
    this.refinementService = new RefinementService(this.gridService, this.featureService);
    this.portfolioService = new PortfolioService(this.constraintService);
    this.aiService = new AIService();
  }

  /**
   * Generate optimal store locations for a country
   */
  async generateLocations(request: GenerationRequest): Promise<GenerationResult> {
    const context = this.createProcessingContext(request);
    
    try {
      // Stage 1: Grid Generation
      const grid = await this.generateGrid(request, context);
      
      // Stage 2: National Sweep (Basic Features)
      const candidates = await this.performNationalSweep(grid, request, context);
      
      // Stage 3: Shortlisting and Fairness
      const shortlisted = await this.performShortlisting(candidates, request, context);
      
      // Stage 4: Windowed Refinement
      const refined = await this.performWindowedRefinement(shortlisted, request, context);
      
      // Stage 5: Scoring and Ranking
      const scored = await this.performScoring(refined, request, context);
      
      // Stage 6: Constraint Validation
      const validated = await this.performConstraintValidation(scored, request, context);
      
      // Stage 7: Portfolio Building
      const portfolio = await this.buildPortfolio(validated, request, context);
      
      // Stage 8: AI Enhancement (Optional)
      const enhanced = await this.performAIEnhancement(portfolio, request, context);
      
      // Stage 9: Result Generation
      return this.generateResult(enhanced, request, context);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Location generation failed: ${errorMessage}`);
    }
  }

  private createProcessingContext(request: GenerationRequest): ProcessingContext {
    return {
      startTime: new Date(),
      seed: this.generateSeed(),
      dataVersions: this.extractDataVersions(request),
      config: request.config,
      country: request.country
    };
  }

  private async generateGrid(request: GenerationRequest, context: ProcessingContext) {
    return this.gridService.generateCountryGrid(request.country.boundary, request.config.gridResolution);
  }

  private async performNationalSweep(grid: any, request: GenerationRequest, context: ProcessingContext): Promise<LocationCandidate[]> {
    const analysisContext = {
      existingStores: request.existingStores,
      competitors: request.competitors || [],
      populationData: request.populationData,
      anchors: request.anchors || [],
      countryBoundary: request.country.boundary
    };

    const candidates: LocationCandidate[] = [];

    for (const cell of grid) {
      try {
        const features = this.featureService.computeBasicFeatures(cell, analysisContext);
        const dataQuality = {
          completeness: 0.8, // Default completeness
          estimated: {
            population: false,
            anchors: false,
            travelTime: false
          },
          confidence: 0.8
        };

        const scores = this.scoringService.calculateScores(features, request.config.weights, dataQuality);

        const candidate: LocationCandidate = {
          id: `candidate_${cell.index}`,
          lat: cell.lat,
          lng: cell.lng,
          h3Index: cell.index,
          administrativeRegion: this.determineAdministrativeRegion(cell, request.country),
          features,
          scores,
          constraints: { spacingOk: false, stateShareOk: false },
          dataQuality,
          status: CandidateStatus.SELECTED
        };

        candidates.push(candidate);
      } catch (error) {
        console.warn(`Failed to process cell ${cell.index}:`, error);
      }
    }

    return candidates;
  }

  private async performShortlisting(candidates: LocationCandidate[], request: GenerationRequest, context: ProcessingContext): Promise<LocationCandidate[]> {
    return this.shortlistService.shortlistCandidates(candidates, request.country, request.config.targetK);
  }

  private async performWindowedRefinement(shortlisted: LocationCandidate[], request: GenerationRequest, context: ProcessingContext): Promise<LocationCandidate[]> {
    const analysisContext = {
      existingStores: request.existingStores,
      competitors: request.competitors || [],
      populationData: request.populationData,
      anchors: request.anchors || [],
      countryBoundary: request.country.boundary
    };

    return this.refinementService.refineShortlistedCandidates(shortlisted, analysisContext);
  }

  private async performScoring(refined: LocationCandidate[], request: GenerationRequest, context: ProcessingContext): Promise<LocationCandidate[]> {
    // Recalculate scores with refined features
    for (const candidate of refined) {
      candidate.scores = this.scoringService.calculateScores(
        candidate.features, 
        request.config.weights, 
        candidate.dataQuality
      );
    }

    // Normalize scores across all candidates
    return this.scoringService.normalizeScores(refined);
  }

  private async performConstraintValidation(scored: LocationCandidate[], request: GenerationRequest, context: ProcessingContext): Promise<LocationCandidate[]> {
    // Constraint validation is handled in portfolio building
    return scored;
  }

  private async buildPortfolio(validated: LocationCandidate[], request: GenerationRequest, context: ProcessingContext): Promise<LocationCandidate[]> {
    const result = this.portfolioService.buildPortfolio(
      validated,
      request.country,
      request.existingStores,
      request.config.targetK,
      request.config.minSpacingM
    );

    return result.selected;
  }

  private async performAIEnhancement(portfolio: LocationCandidate[], request: GenerationRequest, context: ProcessingContext): Promise<LocationCandidate[]> {
    if (!request.config.enableAI) {
      return portfolio;
    }

    // AI enhancement would add rationales and other AI-powered insights
    // For now, return portfolio as-is
    return portfolio;
  }

  private generateResult(enhanced: LocationCandidate[], request: GenerationRequest, context: ProcessingContext): GenerationResult {
    const portfolio: PortfolioSummary = {
      selectedCount: enhanced.length,
      rejectedCount: 0, // Would be calculated during portfolio building
      stateDistribution: this.calculateStateDistribution(enhanced),
      acceptanceRate: 1.0 // Would be calculated from actual selection process
    };

    const diagnostics: SystemDiagnostics = {
      weightsUsed: request.config.weights,
      anchorDedupReport: {
        totalAnchors: 0,
        deduplicatedAnchors: 0,
        mergesByType: {} as any
      },
      rejectionBreakdown: {} as any,
      scoringDistribution: this.scoringService.calculateScoringDistribution(enhanced)
    };

    const reproducibility: ReproducibilityInfo = {
      seed: context.seed,
      dataVersions: context.dataVersions,
      scenarioHash: this.generateScenarioHash(request, context)
    };

    return {
      sites: enhanced,
      portfolio,
      diagnostics,
      reproducibility
    };
  }

  // Helper methods
  private determineAdministrativeRegion(cell: any, country: any): string {
    // Simple implementation - would use proper geographic lookup in production
    return country.administrativeRegions[0]?.id || 'unknown';
  }

  private calculateStateDistribution(candidates: LocationCandidate[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const candidate of candidates) {
      distribution[candidate.administrativeRegion] = 
        (distribution[candidate.administrativeRegion] || 0) + 1;
    }
    return distribution;
  }

  private generateScenarioHash(request: GenerationRequest, context: ProcessingContext): string {
    const hashInput = JSON.stringify({
      country: request.country.countryCode,
      targetK: request.config.targetK,
      weights: request.config.weights,
      seed: context.seed
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private generateSeed(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private extractDataVersions(request: GenerationRequest): Record<string, string> {
    return {
      country: '1.0.0',
      population: request.populationData.dataSource || '1.0.0',
      stores: '1.0.0',
      anchors: '1.0.0'
    };
  }
}