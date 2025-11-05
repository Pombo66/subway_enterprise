import { LocationCandidate } from './location-discovery.types';
import { MarketAnalysis } from './market-analysis.types';

export interface ScoredCandidate extends LocationCandidate {
  strategicScore: number; // 0-1, overall strategic value
  marketContextScore: number; // 0-1, how well it fits market context
  competitivePositionScore: number; // 0-1, competitive advantage
  demographicAlignmentScore: number; // 0-1, demographic fit
  revenueProjection: number; // Annual revenue projection
  riskAssessment: RiskAssessment;
  strategicReasoning: string;
  priorityRank: number; // 1-N ranking among all candidates
}

export interface RiskAssessment {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number; // 0-1, higher = more risky
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
}

export interface RiskFactor {
  type: 'MARKET' | 'COMPETITIVE' | 'OPERATIONAL' | 'FINANCIAL' | 'REGULATORY';
  severity: number; // 0-1
  description: string;
  likelihood: number; // 0-1
  impact: number; // 0-1
}

export interface StrategicScoringRequest {
  candidates: LocationCandidate[];
  marketAnalysis: MarketAnalysis;
  existingStores: {
    lat: number;
    lng: number;
    performance?: number;
    revenue?: number;
  }[];
  scoringCriteria: {
    marketContextWeight: number; // 0-1
    competitivePositionWeight: number; // 0-1
    demographicAlignmentWeight: number; // 0-1
    viabilityWeight: number; // 0-1
    riskWeight: number; // 0-1 (negative weight)
  };
  businessObjectives: {
    targetRevenue?: number;
    riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
    expansionSpeed: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
    marketPriorities: string[]; // e.g., ['urban', 'high-income', 'young-demographics']
  };
}

export interface StrategicScoringResult {
  scoredCandidates: ScoredCandidate[];
  rankings: {
    topCandidates: ScoredCandidate[]; // Top 10 candidates
    highValueCandidates: ScoredCandidate[]; // High strategic value
    lowRiskCandidates: ScoredCandidate[]; // Low risk options
    quickWinCandidates: ScoredCandidate[]; // Fast implementation
  };
  portfolioAnalysis: {
    totalProjectedRevenue: number;
    averageRisk: number;
    geographicDistribution: {
      clustered: number;
      distributed: number;
      sparse: number;
    };
    investmentRequired: number;
    expectedROI: number;
  };
  recommendations: {
    primaryRecommendations: string[];
    alternativeStrategies: string[];
    riskMitigations: string[];
    implementationPriority: string[];
  };
  metadata: {
    candidatesProcessed: number;
    processingTimeMs: number;
    tokensUsed: number;
    cost: number;
    aiModel: string;
  };
}

export interface MarketContextScoring {
  saturationAlignment: number; // How well candidate fits market saturation level
  growthOpportunityAlignment: number; // Alignment with identified growth opportunities
  competitiveGapAlignment: number; // How well it addresses competitive gaps
  demographicFit: number; // Fit with demographic insights
  strategicZoneAlignment: number; // Alignment with strategic zones
}

export interface CompetitivePositioning {
  competitorProximity: number; // Distance advantage/disadvantage
  marketSharePotential: number; // Potential to capture market share
  differentiationOpportunity: number; // Opportunity to differentiate
  competitiveThreats: string[];
  competitiveAdvantages: string[];
}