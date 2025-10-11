/**
 * Core types for workspace analysis and file content handling
 */

export interface FileContent {
  path: string;
  content: string;
  type: 'tsx' | 'css' | 'ts' | 'json' | 'js';
  lastModified: Date;
  size: number;
}

export interface ComponentInfo {
  name: string;
  path: string;
  type: 'component' | 'page' | 'layout' | 'hook' | 'utility';
  exports: string[];
  imports: ImportInfo[];
}

export interface ImportInfo {
  source: string;
  imports: string[];
  isDefault: boolean;
}

export interface StyleTokens {
  customProperties: Record<string, string>;
  classNames: string[];
  tailwindClasses: string[];
  cssVariables: Record<string, string>;
}

export interface WorkspaceConfig {
  oldRoot: string;
  newRoot: string;
  targetScope: string; // e.g., 'apps/admin'
}

export interface AnalysisError {
  type: 'file_not_found' | 'parse_error' | 'path_resolution' | 'permission_denied';
  path: string;
  message: string;
  timestamp: Date;
}

export interface WorkspaceAnalysisResult {
  files: FileContent[];
  components: ComponentInfo[];
  styleTokens: StyleTokens;
  errors: AnalysisError[];
  metadata: {
    totalFiles: number;
    analyzedFiles: number;
    skippedFiles: number;
    analysisTime: number;
  };
}

export type WorkspaceType = 'old' | 'current';

export interface PathResolutionOptions {
  useAbsolutePath?: boolean;
  fallbackToRelative?: boolean;
  createMissingDirectories?: boolean;
}

// Extended interfaces for component structure extraction
export interface ExtendedWorkspaceAnalysisResult extends WorkspaceAnalysisResult {
  componentStructure?: {
    kpiGrid: any; // Will be properly typed when imported
    featurePanels: any[];
    stylingTokens: any[];
    iconAlignments: any[];
  };
}