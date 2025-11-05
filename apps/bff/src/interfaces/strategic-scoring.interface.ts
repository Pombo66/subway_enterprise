import { 
  StrategicScoringRequest, 
  StrategicScoringResult, 
  ScoredCandidate,
  MarketContextScoring,
  CompetitivePositioning
} from '../types/strategic-scoring.types';
import { LocationCandidate } from '../types/location-discovery.types';
import { MarketAnalysis } from '../types/market-analysis.types';

/**
 * Interface for Strategic Scoring Service using GPT-5-mini
 */
export interface IStrategicScoringService {
  /**
   * Score location candidates using strategic analysis and market context
   */
  scoreStrategically(request: StrategicScoringRequest): Promise<StrategicScoringResult>;

  /**
   * Calculate market context scoring for candidates
   */
  calculateMarketContextScoring(
    candidates: LocationCandidate[],
    marketAnalysis: MarketAnalysis
  ): Promise<MarketContextScoring[]>;

  /**
   * Analyze competitive positioning for candidates
   */
  analyzeCompetitivePositioning(
    candidates: LocationCandidate[],
    existingStores: any[],
    marketAnalysis: MarketAnalysis
  ): Promise<CompetitivePositioning[]>;

  /**
   * Generate detailed rationale for scored candidates
   */
  generateDetailedRationale(
    candidate: ScoredCandidate,
    marketAnalysis: MarketAnalysis
  ): Promise<string>;

  /**
   * Rank and prioritize candidates based on strategic scoring
   */
  rankCandidates(
    scoredCandidates: ScoredCandidate[],
    businessObjectives: any
  ): {
    topCandidates: ScoredCandidate[];
    highValueCandidates: ScoredCandidate[];
    lowRiskCandidates: ScoredCandidate[];
    quickWinCandidates: ScoredCandidate[];
  };

  /**
   * Perform portfolio analysis of candidate selection
   */
  analyzePortfolio(
    candidates: ScoredCandidate[],
    businessObjectives: any
  ): {
    totalProjectedRevenue: number;
    averageRisk: number;
    geographicDistribution: any;
    investmentRequired: number;
    expectedROI: number;
  };

  /**
   * Get service performance statistics
   */
  getServiceStats(): {
    candidatesScored: number;
    averageScoringTime: number;
    totalTokensUsed: number;
    totalCost: number;
    averageStrategicScore: number;
  };
}