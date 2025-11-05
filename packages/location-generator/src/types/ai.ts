/**
 * AI service related types and interfaces
 */

export interface AIBudget {
  maxTokensPerRun: number; // 20,000
  reservedForWeights: number; // 1,000
  reservedForRationales: number; // 19,000
  currentUsage: number;
}

export interface CacheKey {
  countryHash: string;
  featuresHash: string;
  mode: string;
  version: string;
}

export interface CachedResult {
  weights?: import('./core').ScoreWeights;
  rationales?: Record<string, string>;
  timestamp: number;
  tokenCost: number;
}

export interface AIServiceConfig {
  enabled: boolean;
  level: AIUsageLevel;
  model: string;
  temperature: number;
  maxTokens: number;
  cacheTTL: number; // hours
}

export enum AIUsageLevel {
  OFF = 'L0', // Deterministic only
  EXPLANATIONS = 'L1', // Site rationales + portfolio narrative
  POLICY_ASSIST = 'L2', // L1 + scenario policy mapping
  LEARN = 'L3' // L2 + offline tuner suggestions
}

export interface ScenarioMode {
  name: 'Defend' | 'Balanced' | 'Blitz';
  description: string;
  weightMultipliers: Record<string, number>;
}

export interface PolicyAdjustmentRequest {
  mode: ScenarioMode['name'];
  baseWeights: import('./core').ScoreWeights;
  bounds: WeightBounds;
}

export interface WeightBounds {
  population: { min: number; max: number };
  gap: { min: number; max: number };
  anchor: { min: number; max: number };
  performance: { min: number; max: number };
  saturation: { min: number; max: number };
}

export interface RationaleRequest {
  siteId: string;
  features: import('./core').CandidateFeatures;
  scores: import('./core').ScoreBreakdown;
  mode: ScenarioMode['name'];
}

export interface RationaleResponse {
  id: string;
  primary_reason: string; // ≤160 chars
  risks: string[];
  actions: string[];
  confidence: 'H' | 'M' | 'L';
  counterfactuals?: AICounterfactualThreshold[];
}

export interface AICounterfactualThreshold {
  parameter: string;
  threshold: number;
  direction: 'above' | 'below';
  impact: string;
}

export interface PortfolioNarrativeRequest {
  portfolioKPIs: PortfolioKPIs;
  scenarioComparison?: PortfolioKPIs;
  mode: ScenarioMode['name'];
}

export interface PortfolioKPIs {
  totalSites: number;
  coverage: number;
  regionalBalance: number;
  riskScore: number;
  estimatedROI: number;
}

export interface PortfolioNarrativeResponse {
  bullets: string[];
  summary: string;
  keyChanges?: string[];
}

export interface LearningLoopSuggestion {
  suggestedWeights: import('./core').ScoreWeights;
  confidence: number;
  reasoning: string;
  backtestImprovement: number;
  requiresHumanReview: boolean;
}