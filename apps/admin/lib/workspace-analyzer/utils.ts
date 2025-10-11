import { promises as fs } from 'fs';
import path from 'path';
import { AnalysisError, PathResolutionOptions } from './types';

/**
 * Utility functions for workspace analysis
 */

/**
 * Safely resolve file path with fallback options
 */
export async function safeResolvePath(
  filePath: string, 
  options: PathResolutionOptions = {}
): Promise<string | null> {
  const { useAbsolutePath = false, fallbackToRelative = true } = options;

  try {
    // Try the provided path first
    let resolvedPath = useAbsolutePath ? path.resolve(filePath) : filePath;
    
    const stats = await fs.stat(resolvedPath);
    if (stats) {
      return resolvedPath;
    }
  } catch (error) {
    // If initial path fails and fallback is enabled
    if (fallbackToRelative && !useAbsolutePath) {
      try {
        const absolutePath = path.resolve(filePath);
        const stats = await fs.stat(absolutePath);
        if (stats) {
          return absolutePath;
        }
      } catch (fallbackError) {
        // Both attempts failed
      }
    }
  }

  return null;
}

/**
 * Check if a path exists and is accessible
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file extension and determine if it should be analyzed
 */
export function shouldAnalyzeFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const analyzableExtensions = ['.tsx', '.ts', '.jsx', '.js', '.css', '.scss', '.sass', '.json'];
  return analyzableExtensions.includes(ext);
}

/**
 * Create standardized error object
 */
export function createAnalysisError(
  type: AnalysisError['type'],
  path: string,
  message: string,
  originalError?: Error
): AnalysisError {
  return {
    type,
    path,
    message: originalError ? `${message}: ${originalError.message}` : message,
    timestamp: new Date()
  };
}

/**
 * Format error for logging or reporting
 */
export function formatAnalysisError(error: AnalysisError): string {
  return `[${error.type.toUpperCase()}] ${error.path}: ${error.message} (${error.timestamp.toISOString()})`;
}

/**
 * Group errors by type for reporting
 */
export function groupErrorsByType(errors: AnalysisError[]): Record<string, AnalysisError[]> {
  return errors.reduce((groups, error) => {
    const type = error.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(error);
    return groups;
  }, {} as Record<string, AnalysisError[]>);
}

/**
 * Normalize file path for cross-platform compatibility
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, '/');
}

/**
 * Get relative path from workspace root
 */
export function getRelativePath(fullPath: string, workspaceRoot: string): string {
  const relativePath = path.relative(workspaceRoot, fullPath);
  return normalizePath(relativePath);
}

/**
 * Check if directory should be skipped during analysis
 */
export function shouldSkipDirectory(dirName: string): boolean {
  const skipPatterns = [
    'node_modules',
    '.next',
    '.turbo',
    'dist',
    'build',
    '.git',
    'coverage',
    '.nyc_output',
    '.swc',
    '__pycache__',
    '.pytest_cache'
  ];
  
  return skipPatterns.includes(dirName) || 
         dirName.startsWith('.') && !dirName.startsWith('.kiro');
}

/**
 * Extract file name without extension
 */
export function getFileNameWithoutExtension(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Check if file is a React component based on content
 */
export function isReactComponent(content: string): boolean {
  return /import.*React|from\s+['"]react['"]|export\s+default\s+function|export\s+const.*=.*\(/.test(content);
}

/**
 * Extract imports from file content (simple regex-based)
 */
export function extractImports(content: string): Array<{ source: string; imports: string[] }> {
  const importRegex = /import\s+(.+?)\s+from\s+['"]([^'"]+)['"]/g;
  const imports: Array<{ source: string; imports: string[] }> = [];
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const [, importStr, source] = match;
    const importNames = importStr
      .replace(/[{}]/g, '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    
    imports.push({ source, imports: importNames });
  }
  
  return imports;
}