import { WorkspaceConfig } from './types';

/**
 * Default workspace configuration based on requirements
 * Requirements 6.1 and 6.2 specify the exact paths
 */
export const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
  // Old baseline (Cursor-era)
  oldRoot: '/Users/khalidgehlan/Documents/subway_enterprise',
  // Current codebase (Kiro-era) 
  newRoot: '/Users/khalidgehlan/subway_enterprise-1',
  // Target scope for analysis
  targetScope: 'apps/admin'
};

/**
 * Create workspace configuration with custom paths
 */
export function createWorkspaceConfig(
  oldRoot: string,
  newRoot: string,
  targetScope: string = 'apps/admin'
): WorkspaceConfig {
  return {
    oldRoot,
    newRoot,
    targetScope
  };
}

/**
 * Validate workspace configuration paths
 */
export function validateWorkspaceConfig(config: WorkspaceConfig): string[] {
  const errors: string[] = [];

  if (!config.oldRoot) {
    errors.push('oldRoot path is required');
  }

  if (!config.newRoot) {
    errors.push('newRoot path is required');
  }

  if (!config.targetScope) {
    errors.push('targetScope is required');
  }

  // Additional validation could be added here to check if paths exist
  // but we'll handle that gracefully in the WorkspaceAnalyzer

  return errors;
}