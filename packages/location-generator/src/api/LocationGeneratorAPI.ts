import { LocationGenerator } from '../core/LocationGenerator';
import { GenerationRequest, GenerationResult } from '../types/config';
import { LocationCandidate, ScoreWeights } from '../types/core';
import { 
  ParetoService, 
  ScenarioService, 
  CounterfactualService, 
  StabilityService,
  BacktestService,
  BoardPackService,
  PolicyGuardrailService,
  RegionalFairnessService,
  OperationsService,
  ScoringService,
  PortfolioService,
  ConstraintService,
  GridService,
  FeatureService,
  AIService
} from '../services/impl';
import { z } from 'zod';

/**
 * API interface for the Location Generator
 */
export class LocationGeneratorAPI {
  private generator: LocationGenerator;
  private paretoService: ParetoService;
  private scenarioService: ScenarioService;
  private counterfactualService: CounterfactualService;
  private stabilityService: StabilityService;
  private backtestService: BacktestService;
  private boardPackService: BoardPackService;
  private policyGuardrailService: PolicyGuardrailService;
  private regionalFairnessService: RegionalFairnessService;
  public operationsService: OperationsService; // Made public for alert checking

  constructor() {
    this.generator = new LocationGenerator();
    
    // Initialize executive services
    const scoringService = new ScoringService();
    const portfolioService = new PortfolioService(new ConstraintService());
    const gridService = new GridService();
    
    this.paretoService = new ParetoService(portfolioService);
    this.scenarioService = new ScenarioService(scoringService, portfolioService, this.paretoService);
    this.counterfactualService = new CounterfactualService(scoringService);
    this.stabilityService = new StabilityService(scoringService, portfolioService);
    this.backtestService = new BacktestService(portfolioService, gridService);
    const aiService = new AIService();
    this.boardPackService = new BoardPackService(this.paretoService, this.stabilityService, aiService);
    this.policyGuardrailService = new PolicyGuardrailService();
    this.regionalFairnessService = new RegionalFairnessService();
    this.operationsService = new OperationsService();
  }

  /**
   * Generate store locations for a country
   */
  async generateLocations(request: GenerationRequest): Promise<GenerationResult & { degraded?: boolean }> {
    try {
      // Validate request
      this.validateGenerationRequest(request);

      // Check cache availability and set degraded mode if needed
      const cacheAvailable = this.operationsService.isCacheAvailable();
      if (!cacheAvailable) {
        console.warn('Cache unavailable - auto-degrading to L0 mode');
        this.operationsService.setCacheAvailable(false);
      }

      // Execute generation
      const result = await this.generator.generateLocations(request);

      // Check for degradation in AI services
      let degraded = !cacheAvailable;
      
      // If we have selected sites, check rationale generation for degradation
      if (result.selected && result.selected.length > 0) {
        // Mock rationale check - in real implementation would call AI service
        const aiService = new AIService();
        try {
          const rationaleResult = await aiService.generateRationalesWithDegradation([]);
          degraded = degraded || rationaleResult.degraded;
        } catch (error) {
          console.warn('Rationale generation check failed:', error);
          degraded = true;
        }
      }

      return {
        ...result,
        degraded
      };
    } catch (error) {
      throw new Error(`Location generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate generation request
   */
  private validateGenerationRequest(request: GenerationRequest): void {
    const schema = z.object({
      country: z.object({
        countryCode: z.string().min(2).max(3),
        boundary: z.object({
          type: z.literal('Polygon'),
          coordinates: z.array(z.array(z.array(z.number())))
        }),
        administrativeRegions: z.array(z.object({
          id: z.string(),
          name: z.string(),
          boundary: z.object({
            type: z.literal('Polygon'),
            coordinates: z.array(z.array(z.array(z.number())))
          }),
          population: z.number().positive()
        })),
        majorMetropolitanAreas: z.array(z.string()),
        maxRegionShare: z.number().min(0).max(1)
      }),
      existingStores: z.array(z.object({
        id: z.string(),
        name: z.string(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        turnover: z.number().optional()
      })),
      competitors: z.array(z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180)
      })).optional(),
      populationData: z.object({
        cells: z.array(z.object({
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
          population: z.number().nonnegative(),
          h3Index: z.string().optional()
        })),
        resolution: z.number().int().min(0).max(15),
        dataSource: z.string()
      }),
      anchors: z.array(z.object({
        id: z.string(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        type: z.enum(['mall-tenant', 'station-shops', 'grocer-grocer', 'retail-retail']),
        name: z.string().optional()
      })).optional(),
      config: z.object({
        targetK: z.number().int().positive(),
        minSpacingM: z.number().positive(),
        gridResolution: z.number().int().min(0).max(15),
        weights: z.object({
          population: z.number().min(0).max(1),
          gap: z.number().min(0).max(1),
          anchor: z.number().min(0).max(1),
          performance: z.number().min(0).max(1),
          saturation: z.number().min(0).max(1)
        }),
        enableAI: z.boolean(),
        mode: z.enum(['Defend', 'Balanced', 'Blitz']).optional()
      })
    });

    const result = schema.safeParse(request);
    if (!result.success) {
      throw new Error(`Invalid request: ${result.error.message}`);
    }

    // Additional validation
    const weights = request.config.weights;
    const weightSum = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(weightSum - 1.0) > 0.01) {
      throw new Error(`Weights must sum to 1.0, got ${weightSum}`);
    }
  }

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
    timestamp: string;
  }> {
    const services = {
      gridService: true,
      featureService: true,
      scoringService: true,
      constraintService: true,
      aiService: false // Would check actual AI service availability
    };

    const allHealthy = Object.values(services).every(status => status);
    const anyHealthy = Object.values(services).some(status => status);

    return {
      status: allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'unhealthy',
      services,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get system capabilities and configuration
   */
  getCapabilities(): {
    supportedCountries: string[];
    maxTargetK: number;
    supportedGridResolutions: number[];
    aiCapabilities: {
      enabled: boolean;
      supportedModes: string[];
      maxTokensPerRun: number;
    };
    executiveFeatures: {
      paretoFrontier: boolean;
      scenarioTheater: boolean;
      counterfactuals: boolean;
      stabilityAnalysis: boolean;
      boardPackGeneration: boolean;
      backtesting: boolean;
      policyGuardrails: boolean;
      regionalFairness: boolean;
      operationsMonitoring: boolean;
    };
  } {
    return {
      supportedCountries: ['*'], // Supports any country with proper data
      maxTargetK: 1000,
      supportedGridResolutions: [6, 7, 8, 9, 10],
      aiCapabilities: {
        enabled: false, // Would check actual configuration
        supportedModes: ['Defend', 'Balanced', 'Blitz'],
        maxTokensPerRun: 20000
      },
      executiveFeatures: {
        paretoFrontier: true,
        scenarioTheater: true,
        counterfactuals: true,
        stabilityAnalysis: true,
        boardPackGeneration: true,
        backtesting: true,
        policyGuardrails: true,
        regionalFairness: true,
        operationsMonitoring: true
      }
    };
  }

  /**
   * Generate Pareto frontier for portfolio optimization
   */
  async generateParetoFrontier(
    candidates: LocationCandidate[],
    config: any,
    existingStores: any[],
    options: { minK?: number; maxK?: number } = {}
  ) {
    return this.paretoService.generateParetoFrontier(
      candidates,
      config.country,
      existingStores,
      options.minK,
      options.maxK
    );
  }

  /**
   * Switch scenario mode with cached features (< 500ms)
   */
  async switchScenario(
    mode: 'Defend' | 'Balanced' | 'Blitz',
    candidatesWithFeatures: LocationCandidate[],
    baseWeights: ScoreWeights,
    config: any
  ) {
    return this.scenarioService.switchScenario(mode, candidatesWithFeatures, baseWeights, config);
  }

  /**
   * Generate counterfactual analysis for a site
   */
  generateCounterfactuals(
    targetSite: LocationCandidate,
    allCandidates: LocationCandidate[],
    weights: ScoreWeights,
    targetImprovement: 'next_rank' | 'top_10' | 'top_5' = 'next_rank'
  ) {
    return this.counterfactualService.generateCounterfactuals(
      targetSite,
      allCandidates,
      weights,
      targetImprovement
    );
  }

  /**
   * Analyze portfolio stability with weight jittering
   */
  async analyzeStability(
    candidates: LocationCandidate[],
    baseWeights: ScoreWeights,
    config: any,
    iterations: number = 50
  ) {
    return this.stabilityService.analyzePortfolioStability(
      candidates,
      baseWeights,
      config,
      iterations
    );
  }

  /**
   * Get stability summary for UI
   */
  getStabilitySummary(stabilityAnalysis: any) {
    return this.stabilityService.getStabilitySummary(stabilityAnalysis);
  }

  /**
   * Clear scenario cache
   */
  clearScenarioCache(): void {
    this.scenarioService.clearCache();
  }

  /**
   * Get scenario cache statistics
   */
  getScenarioCacheStats() {
    return this.scenarioService.getCacheStats();
  }

  /**
   * Run backtest analysis for model validation
   */
  async runBacktest(
    allStores: any[],
    candidates: LocationCandidate[],
    config: any,
    options?: {
      maskPercentage?: number;
      targetK?: number;
      distanceThreshold?: number;
      iterations?: number;
    }
  ) {
    return this.backtestService.runBacktest(allStores, candidates, config, options);
  }

  /**
   * Generate board pack for executives
   */
  async generateBoardPack(
    paretoFrontier: any[],
    kneePoint: any,
    scenarios: Record<string, any>,
    stabilityAnalysis: any,
    portfolio: LocationCandidate[],
    diagnostics: any,
    config: any
  ) {
    return this.boardPackService.generateBoardPack(
      paretoFrontier,
      kneePoint,
      scenarios,
      stabilityAnalysis,
      portfolio,
      diagnostics,
      config
    );
  }

  /**
   * Export board pack for PDF generation
   */
  exportBoardPackForPDF(boardPack: any) {
    return this.boardPackService.exportForPDF(boardPack);
  }

  /**
   * Validate configuration against policy guardrails
   */
  validatePolicyGuardrails(
    weights: ScoreWeights,
    config: any,
    baseline?: { weights: ScoreWeights; config: any }
  ) {
    return this.policyGuardrailService.validateConfiguration(weights, config, baseline);
  }

  /**
   * Enforce policy guardrails on weights
   */
  enforceWeightGuardrails(weights: ScoreWeights, baselineWeights?: ScoreWeights) {
    return this.policyGuardrailService.enforceWeightGuardrails(weights, baselineWeights);
  }

  /**
   * Get current policy bounds
   */
  getPolicyBounds() {
    return this.policyGuardrailService.getPolicyBounds();
  }

  /**
   * Analyze regional fairness of portfolio
   */
  analyzeRegionalFairness(
    portfolio: LocationCandidate[],
    config: any,
    options?: {
      fairnessThreshold?: number;
      minSitesPerRegion?: number;
    }
  ) {
    return this.regionalFairnessService.analyzeRegionalFairness(portfolio, config, options);
  }

  /**
   * Get fairness-adjusted site recommendations
   */
  getFairnessAdjustedRecommendations(
    candidates: LocationCandidate[],
    currentPortfolio: LocationCandidate[],
    config: any,
    targetAdditionalSites: number
  ) {
    return this.regionalFairnessService.getFairnessAdjustedRecommendations(
      candidates,
      currentPortfolio,
      config,
      targetAdditionalSites
    );
  }

  /**
   * Generate executive fairness report
   */
  generateExecutiveFairnessReport(analysis: any, config: any) {
    return this.regionalFairnessService.generateExecutiveFairnessReport(analysis, config);
  }

  /**
   * Get operational metrics
   */
  getOperationalMetrics() {
    return this.operationsService.getMetrics();
  }

  /**
   * Get operational limits
   */
  getOperationalLimits() {
    return this.operationsService.getLimits();
  }

  /**
   * Check if system is healthy
   */
  isSystemHealthy() {
    return this.operationsService.isHealthy();
  }

  /**
   * Get detailed health status
   */
  getDetailedHealthStatus() {
    return this.operationsService.getHealthStatus();
  }

  /**
   * Check if isochrone request can proceed
   */
  canMakeIsochroneRequest() {
    return this.operationsService.canMakeIsochroneRequest();
  }

  /**
   * Check if LLM request can proceed
   */
  canMakeLLMRequest(estimatedTokens?: number) {
    return this.operationsService.canMakeLLMRequest(estimatedTokens);
  }

  /**
   * Record isochrone request metrics
   */
  recordIsochroneRequest(responseTimeMs: number, success: boolean, usedFallback: boolean) {
    const requestId = this.operationsService.recordIsochroneStart();
    this.operationsService.recordIsochroneComplete(requestId, responseTimeMs, success, usedFallback);
  }

  /**
   * Record LLM request metrics
   */
  recordLLMRequest(responseTimeMs: number, tokensUsed: number, cacheHit: boolean) {
    const requestId = this.operationsService.recordLLMStart();
    this.operationsService.recordLLMComplete(requestId, responseTimeMs, tokensUsed, cacheHit);
  }

  /**
   * Update processing metrics
   */
  updateProcessingMetrics(executionTimeMs: number, memoryUsageMB: number, candidatesProcessed: number, windowsProcessed: number) {
    this.operationsService.updateProcessingMetrics(executionTimeMs, memoryUsageMB, candidatesProcessed, windowsProcessed);
  }
}