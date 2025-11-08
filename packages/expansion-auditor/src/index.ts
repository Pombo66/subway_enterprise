/**
 * Expansion Auditor Package
 * Provides comprehensive analysis and auditing of expansion-related code
 */

export * from './interfaces/expansion-system-auditor.interface';
export * from './services/expansion-system-auditor.service';
export { 
  IRedundancyDetector,
  UnusedInterface,
  CodeDuplication,
  SimilarityMatrix,
  ServiceCluster,
  ConsolidationRecommendation,
  CrossServiceDuplication,
  DuplicatedElement,
  CodeLocation,
  CrossServiceStrategy,
  SharedPackageCandidate,
  ExtractionOpportunity,
  DuplicationType,
  ClusterType,
  RedundancyAnalysisResult,
  MethodSignature,
  Parameter,
  UsagePattern
} from './interfaces/redundancy-detector.interface';
export * from './services/redundancy-detector.service';
export * from './services/audit-report-generator.service';
export * from './cli/audit-cli';