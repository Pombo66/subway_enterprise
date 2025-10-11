/**
 * Workspace Analysis Infrastructure
 * 
 * This module provides the core infrastructure for analyzing two workspace directories
 * (old baseline and current state) to identify regressions and generate fixes.
 */

export { WorkspaceAnalyzer } from './workspace-analyzer';
export * from './types';
export * from './config';
export * from './utils';

// Re-export commonly used types for convenience
export type {
  FileContent,
  ComponentInfo,
  StyleTokens,
  WorkspaceConfig,
  AnalysisError,
  WorkspaceAnalysisResult,
  WorkspaceType,
  PathResolutionOptions
} from './types';