/**
 * Interfaces for Redundancy Detector
 * Identifies duplicate services and overlapping functionality
 */

export interface IRedundancyDetector {
  detectDuplicateServices(): Promise<ServiceDuplicate[]>;
  findOverlappingFunctionality(): Promise<FunctionalityOverlap[]>;
  identifyUnusedInterfaces(): Promise<UnusedInterface[]>;
  analyzeCodeDuplication(): Promise<CodeDuplication[]>;
  generateSimilarityMatrix(): Promise<SimilarityMatrix>;
  findCrossServiceDuplication(): Promise<CrossServiceDuplication[]>;
}

export interface ServiceDuplicate {
  primaryService: string;
  duplicateServices: string[];
  similarityScore: number;
  duplicatedMethods: string[];
  consolidationStrategy: string;
  estimatedSavings: {
    linesOfCode: number;
    files: number;
    complexity: number;
  };
  migrationRisk: 'low' | 'medium' | 'high';
}

export interface FunctionalityOverlap {
  services: string[];
  overlappingMethods: MethodOverlap[];
  suggestedConsolidation: string;
  impactAssessment: string;
  overlapPercentage: number;
  extractionOpportunity: ExtractionOpportunity;
}

export interface MethodOverlap {
  methodName: string;
  services: string[];
  similarityScore: number;
  differences: string[];
  signatures: MethodSignature[];
  usagePatterns: UsagePattern[];
}

export interface MethodSignature {
  service: string;
  signature: string;
  parameters: Parameter[];
  returnType: string;
  isAsync: boolean;
}

export interface Parameter {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

export interface UsagePattern {
  service: string;
  calledBy: string[];
  frequency: number;
  context: string;
}

export interface UnusedInterface {
  name: string;
  file: string;
  definedAt: number;
  reason: string;
  potentialUsages: string[];
  removalSafety: 'safe' | 'risky' | 'dangerous';
}

export interface CodeDuplication {
  pattern: string;
  occurrences: CodeOccurrence[];
  extractionOpportunity: string;
  estimatedSavings: number;
  complexity: number;
  type: DuplicationType;
}

export interface CodeOccurrence {
  file: string;
  startLine: number;
  endLine: number;
  code: string;
  context: string;
  hash: string;
}

export interface SimilarityMatrix {
  services: string[];
  matrix: number[][];
  clusters: ServiceCluster[];
  recommendations: ConsolidationRecommendation[];
}

export interface ServiceCluster {
  services: string[];
  averageSimilarity: number;
  clusterType: ClusterType;
  consolidationPotential: number;
}

export interface ConsolidationRecommendation {
  type: 'merge' | 'extract' | 'refactor';
  services: string[];
  description: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  benefits: string[];
  risks: string[];
}

export interface CrossServiceDuplication {
  adminService: string;
  bffService: string;
  duplicatedElements: DuplicatedElement[];
  consolidationStrategy: CrossServiceStrategy;
  sharedPackageCandidate: SharedPackageCandidate;
}

export interface DuplicatedElement {
  type: 'method' | 'interface' | 'type' | 'constant';
  name: string;
  adminLocation: CodeLocation;
  bffLocation: CodeLocation;
  similarity: number;
  differences: string[];
}

export interface CodeLocation {
  file: string;
  startLine: number;
  endLine: number;
  code: string;
}

export interface CrossServiceStrategy {
  approach: 'shared_package' | 'admin_owns' | 'bff_owns' | 'split_responsibility';
  rationale: string;
  migrationSteps: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
}

export interface SharedPackageCandidate {
  packageName: string;
  description: string;
  contents: string[];
  dependencies: string[];
  consumers: string[];
}

export interface ExtractionOpportunity {
  type: 'utility_function' | 'shared_service' | 'common_interface' | 'base_class';
  name: string;
  description: string;
  extractedElements: string[];
  targetLocation: string;
  benefits: string[];
}

export enum DuplicationType {
  EXACT_MATCH = 'exact_match',
  SIMILAR_LOGIC = 'similar_logic',
  PATTERN_MATCH = 'pattern_match',
  STRUCTURAL_SIMILARITY = 'structural_similarity'
}

export enum ClusterType {
  OPENAI_SERVICES = 'openai_services',
  AI_SERVICES = 'ai_services',
  MARKET_ANALYSIS = 'market_analysis',
  LOCATION_SERVICES = 'location_services',
  UTILITY_SERVICES = 'utility_services'
}

export interface RedundancyAnalysisResult {
  summary: {
    totalServicesAnalyzed: number;
    duplicateServicesFound: number;
    overlappingFunctionalityCount: number;
    unusedInterfacesCount: number;
    codeDuplicationInstances: number;
    estimatedCodeReduction: number;
  };
  duplicateServices: ServiceDuplicate[];
  functionalityOverlaps: FunctionalityOverlap[];
  unusedInterfaces: UnusedInterface[];
  codeDuplications: CodeDuplication[];
  similarityMatrix: SimilarityMatrix;
  crossServiceDuplications: CrossServiceDuplication[];
  recommendations: ConsolidationRecommendation[];
}