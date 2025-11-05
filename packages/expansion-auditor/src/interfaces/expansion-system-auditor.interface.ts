/**
 * Interfaces for Expansion System Auditor
 * Provides comprehensive analysis of expansion-related code across the codebase
 */

export interface IExpansionSystemAuditor {
  scanCodebase(): Promise<CodebaseAnalysis>;
  identifyExpansionServices(): Promise<ServiceInventory>;
  analyzeServiceDependencies(): Promise<DependencyGraph>;
  generateSimplificationReport(): Promise<SimplificationReport>;
}

export interface CodebaseAnalysis {
  totalFiles: number;
  expansionRelatedFiles: string[];
  duplicateLogic: DuplicatePattern[];
  unusedCode: UnusedCodeBlock[];
  complexityMetrics: ComplexityMetric[];
}

export interface ServiceInventory {
  services: ExpansionService[];
  duplicateServices: ServiceDuplicate[];
  overlappingFunctionality: FunctionalityOverlap[];
  consolidationOpportunities: ConsolidationOpportunity[];
}

export interface DependencyGraph {
  nodes: ServiceNode[];
  edges: ServiceDependency[];
  circularDependencies: CircularDependency[];
  unusedDependencies: UnusedDependency[];
}

export interface SimplificationReport {
  summary: {
    totalFilesAnalyzed: number;
    duplicateServicesFound: number;
    consolidationOpportunities: number;
    estimatedCodeReduction: number;
  };
  duplicateServices: ServiceDuplicate[];
  overlappingFunctionality: FunctionalityOverlap[];
  consolidationPlan: ConsolidationOpportunity[];
  migrationStrategy: MigrationStep[];
}

export interface ExpansionService {
  name: string;
  path: string;
  type: ServiceType;
  methods: ServiceMethod[];
  dependencies: string[];
  complexity: number;
  linesOfCode: number;
}

export interface ServiceMethod {
  name: string;
  signature: string;
  complexity: number;
  linesOfCode: number;
  dependencies: string[];
}

export interface DuplicatePattern {
  pattern: string;
  occurrences: CodeOccurrence[];
  similarity: number;
  extractionOpportunity: string;
}

export interface CodeOccurrence {
  file: string;
  startLine: number;
  endLine: number;
  code: string;
}

export interface UnusedCodeBlock {
  file: string;
  type: 'method' | 'class' | 'interface' | 'import';
  name: string;
  startLine: number;
  endLine: number;
  reason: string;
}

export interface ComplexityMetric {
  file: string;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  linesOfCode: number;
}

export interface ServiceDuplicate {
  primaryService: string;
  duplicateServices: string[];
  similarityScore: number;
  duplicatedMethods: string[];
  consolidationStrategy: string;
}

export interface FunctionalityOverlap {
  services: string[];
  overlappingMethods: MethodOverlap[];
  suggestedConsolidation: string;
  impactAssessment: string;
}

export interface MethodOverlap {
  methodName: string;
  services: string[];
  similarityScore: number;
  differences: string[];
}

export interface ConsolidationOpportunity {
  type: 'merge_services' | 'extract_common' | 'remove_duplicate';
  description: string;
  affectedServices: string[];
  estimatedSavings: {
    linesOfCode: number;
    files: number;
    complexity: number;
  };
  migrationComplexity: 'low' | 'medium' | 'high';
  priority: 'high' | 'medium' | 'low';
}

export interface ServiceNode {
  id: string;
  name: string;
  path: string;
  type: ServiceType;
}

export interface ServiceDependency {
  from: string;
  to: string;
  type: 'import' | 'injection' | 'method_call';
  strength: number;
}

export interface CircularDependency {
  cycle: string[];
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
}

export interface UnusedDependency {
  service: string;
  dependency: string;
  type: 'import' | 'injection';
  reason: string;
}

export interface MigrationStep {
  order: number;
  description: string;
  type: 'create' | 'modify' | 'delete' | 'move';
  affectedFiles: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  dependencies: number[];
}

export enum ServiceType {
  OPENAI_SERVICE = 'openai_service',
  AI_SERVICE = 'ai_service',
  EXPANSION_SERVICE = 'expansion_service',
  MARKET_ANALYSIS = 'market_analysis',
  STRATEGIC_SCORING = 'strategic_scoring',
  LOCATION_DISCOVERY = 'location_discovery',
  RATIONALE_GENERATION = 'rationale_generation',
  UTILITY_SERVICE = 'utility_service',
  CONFIGURATION_SERVICE = 'configuration_service'
}