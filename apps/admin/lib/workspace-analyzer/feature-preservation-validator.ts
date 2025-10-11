import { readFile, readdir, stat } from 'fs/promises';
import { join, relative } from 'path';

export interface FeaturePreservationResult {
  isValid: boolean;
  preservedFeatures: PreservedFeature[];
  conflicts: FeatureConflict[];
  dataFlowIssues: DataFlowIssue[];
  recommendations: string[];
}

export interface PreservedFeature {
  type: 'telemetry' | 'hook' | 'component' | 'api-call' | 'data-flow';
  name: string;
  file: string;
  line: number;
  description: string;
  isPreserved: boolean;
}

export interface FeatureConflict {
  type: 'naming' | 'import' | 'prop-interface' | 'data-structure';
  feature: string;
  file: string;
  line: number;
  conflict: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface DataFlowIssue {
  type: 'api-change' | 'prop-modification' | 'state-interference' | 'side-effect';
  component: string;
  file: string;
  line: number;
  description: string;
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface KiroFeaturePattern {
  pattern: RegExp;
  type: PreservedFeature['type'];
  description: string;
  critical: boolean;
}

export class FeaturePreservationValidator {
  private kiroFeaturePatterns: KiroFeaturePattern[] = [
    // Telemetry patterns
    {
      pattern: /useTelemetry\s*\(/,
      type: 'telemetry',
      description: 'Kiro telemetry hook usage',
      critical: true
    },
    {
      pattern: /trackEvent\s*\(/,
      type: 'telemetry',
      description: 'Event tracking call',
      critical: true
    },
    {
      pattern: /telemetry\./,
      type: 'telemetry',
      description: 'Telemetry object usage',
      critical: true
    },
    
    // Hook patterns
    {
      pattern: /useKiro\w+/,
      type: 'hook',
      description: 'Kiro-specific hook',
      critical: true
    },
    {
      pattern: /useWorkspace\w+/,
      type: 'hook',
      description: 'Workspace-related hook',
      critical: true
    },
    {
      pattern: /useAgent\w+/,
      type: 'hook',
      description: 'Agent-related hook',
      critical: true
    },
    
    // Component patterns
    {
      pattern: /KiroProvider|AgentProvider|WorkspaceProvider/,
      type: 'component',
      description: 'Kiro context provider',
      critical: true
    },
    {
      pattern: /TelemetryWrapper|AgentPanel|WorkspacePanel/,
      type: 'component',
      description: 'Kiro-specific component',
      critical: true
    },
    
    // API call patterns
    {
      pattern: /\/api\/kiro\//,
      type: 'api-call',
      description: 'Kiro API endpoint',
      critical: true
    },
    {
      pattern: /\/api\/telemetry\//,
      type: 'api-call',
      description: 'Telemetry API endpoint',
      critical: true
    },
    {
      pattern: /\/api\/workspace\//,
      type: 'api-call',
      description: 'Workspace API endpoint',
      critical: false
    },
    
    // Data flow patterns
    {
      pattern: /kiroState\.|kiroData\./,
      type: 'data-flow',
      description: 'Kiro state management',
      critical: true
    },
    {
      pattern: /telemetryData\.|agentData\./,
      type: 'data-flow',
      description: 'Kiro data structures',
      critical: true
    }
  ];

  constructor(private projectRoot: string) {}

  /**
   * Validate that restored code doesn't interfere with Kiro features
   */
  async validateFeaturePreservation(
    modifiedFiles: Map<string, string>,
    originalFiles: Map<string, string>
  ): Promise<FeaturePreservationResult> {
    const result: FeaturePreservationResult = {
      isValid: true,
      preservedFeatures: [],
      conflicts: [],
      dataFlowIssues: [],
      recommendations: []
    };

    // Scan for existing Kiro features
    const existingFeatures = await this.scanForKiroFeatures();
    result.preservedFeatures = existingFeatures;

    // Check each modified file for conflicts
    for (const [filePath, newContent] of modifiedFiles) {
      const originalContent = originalFiles.get(filePath) || '';
      
      // Check for feature conflicts
      const conflicts = await this.detectFeatureConflicts(filePath, originalContent, newContent);
      result.conflicts.push(...conflicts);

      // Check for data flow issues
      const dataFlowIssues = await this.detectDataFlowIssues(filePath, originalContent, newContent);
      result.dataFlowIssues.push(...dataFlowIssues);

      // Validate feature preservation
      const preservationIssues = await this.validatePreservation(filePath, originalContent, newContent, existingFeatures);
      result.conflicts.push(...preservationIssues);
    }

    // Generate recommendations
    result.recommendations = this.generatePreservationRecommendations(result);

    // Determine overall validity
    const criticalIssues = result.conflicts.filter(c => c.severity === 'high').length +
                          result.dataFlowIssues.filter(d => d.impact === 'high').length;
    result.isValid = criticalIssues === 0;

    return result;
  }

  /**
   * Scan the current codebase for Kiro-era features
   */
  async scanForKiroFeatures(): Promise<PreservedFeature[]> {
    const features: PreservedFeature[] = [];
    
    try {
      const files = await this.getAllTSXFiles(this.projectRoot);
      
      for (const file of files) {
        try {
          const content = await readFile(file, 'utf-8');
          const relativeFile = relative(this.projectRoot, file);
          
          // Check each pattern
          for (const pattern of this.kiroFeaturePatterns) {
            const matches = content.matchAll(new RegExp(pattern.pattern.source, 'g'));
            
            for (const match of matches) {
              const line = this.getLineNumber(content, match.index || 0);
              
              features.push({
                type: pattern.type,
                name: match[0],
                file: relativeFile,
                line,
                description: pattern.description,
                isPreserved: true // Will be validated later
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to scan file ${file}:`, error);
        }
      }
    } catch (error) {
      console.warn('Failed to scan for Kiro features:', error);
    }

    return features;
  }

  /**
   * Detect conflicts between restored code and Kiro features
   */
  async detectFeatureConflicts(
    filePath: string,
    originalContent: string,
    newContent: string
  ): Promise<FeatureConflict[]> {
    const conflicts: FeatureConflict[] = [];

    // Check for naming conflicts
    const namingConflicts = this.detectNamingConflicts(filePath, originalContent, newContent);
    conflicts.push(...namingConflicts);

    // Check for import conflicts
    const importConflicts = this.detectImportConflicts(filePath, originalContent, newContent);
    conflicts.push(...importConflicts);

    // Check for prop interface conflicts
    const propConflicts = this.detectPropConflicts(filePath, originalContent, newContent);
    conflicts.push(...propConflicts);

    return conflicts;
  }

  /**
   * Detect data flow issues that could break Kiro functionality
   */
  async detectDataFlowIssues(
    filePath: string,
    originalContent: string,
    newContent: string
  ): Promise<DataFlowIssue[]> {
    const issues: DataFlowIssue[] = [];

    // Check for API call modifications
    const apiIssues = this.detectAPIModifications(filePath, originalContent, newContent);
    issues.push(...apiIssues);

    // Check for state interference
    const stateIssues = this.detectStateInterference(filePath, originalContent, newContent);
    issues.push(...stateIssues);

    // Check for prop modifications
    const propIssues = this.detectPropModifications(filePath, originalContent, newContent);
    issues.push(...propIssues);

    return issues;
  }

  private detectNamingConflicts(filePath: string, original: string, modified: string): FeatureConflict[] {
    const conflicts: FeatureConflict[] = [];
    
    // Extract function/component names from both versions
    const originalNames = this.extractNames(original);
    const modifiedNames = this.extractNames(modified);
    
    // Check for Kiro-specific naming patterns
    const kiroPatterns = [/^Kiro/, /^Agent/, /^Workspace/, /^Telemetry/];
    
    modifiedNames.forEach((name, line) => {
      if (kiroPatterns.some(pattern => pattern.test(name))) {
        conflicts.push({
          type: 'naming',
          feature: name,
          file: filePath,
          line,
          conflict: `New component/function name conflicts with Kiro naming convention`,
          severity: 'medium',
          suggestion: `Rename to avoid Kiro namespace (e.g., ${name.replace(/^(Kiro|Agent|Workspace|Telemetry)/, 'Restored$1')})`
        });
      }
    });

    return conflicts;
  }

  private detectImportConflicts(filePath: string, original: string, modified: string): FeatureConflict[] {
    const conflicts: FeatureConflict[] = [];
    
    const originalImports = this.extractImports(original);
    const modifiedImports = this.extractImports(modified);
    
    // Check for conflicting imports
    modifiedImports.forEach((importPath, line) => {
      if (importPath.includes('/kiro/') || importPath.includes('/telemetry/') || importPath.includes('/agent/')) {
        if (!originalImports.has(importPath)) {
          conflicts.push({
            type: 'import',
            feature: importPath,
            file: filePath,
            line,
            conflict: 'New import conflicts with Kiro module paths',
            severity: 'high',
            suggestion: 'Use different import path or ensure compatibility with existing Kiro modules'
          });
        }
      }
    });

    return conflicts;
  }

  private detectPropConflicts(filePath: string, original: string, modified: string): FeatureConflict[] {
    const conflicts: FeatureConflict[] = [];
    
    // Look for prop interface changes that might affect Kiro components
    const kiroProps = ['telemetryData', 'agentConfig', 'workspaceState', 'kiroSettings'];
    
    kiroProps.forEach(prop => {
      const originalHasProp = original.includes(prop);
      const modifiedHasProp = modified.includes(prop);
      
      if (originalHasProp && !modifiedHasProp) {
        const line = this.getLineNumber(original, original.indexOf(prop));
        conflicts.push({
          type: 'prop-interface',
          feature: prop,
          file: filePath,
          line,
          conflict: `Kiro prop '${prop}' was removed`,
          severity: 'high',
          suggestion: `Preserve '${prop}' prop to maintain Kiro functionality`
        });
      }
    });

    return conflicts;
  }

  private detectAPIModifications(filePath: string, original: string, modified: string): DataFlowIssue[] {
    const issues: DataFlowIssue[] = [];
    
    // Check for API endpoint changes
    const apiPattern = /['"`]\/api\/[^'"`]+['"`]/g;
    const originalAPIs = new Set(original.match(apiPattern) || []);
    const modifiedAPIs = new Set(modified.match(apiPattern) || []);
    
    // Check for removed Kiro API calls
    originalAPIs.forEach(api => {
      if ((api.includes('/kiro/') || api.includes('/telemetry/')) && !modifiedAPIs.has(api)) {
        const line = this.getLineNumber(original, original.indexOf(api));
        issues.push({
          type: 'api-change',
          component: filePath,
          file: filePath,
          line,
          description: `Kiro API call ${api} was removed`,
          impact: 'high',
          mitigation: 'Restore the API call or ensure equivalent functionality exists'
        });
      }
    });

    return issues;
  }

  private detectStateInterference(filePath: string, original: string, modified: string): DataFlowIssue[] {
    const issues: DataFlowIssue[] = [];
    
    // Check for state modifications that could interfere with Kiro
    const statePatterns = [
      /useState\s*\(\s*[^)]*kiro/i,
      /useState\s*\(\s*[^)]*telemetry/i,
      /useState\s*\(\s*[^)]*agent/i
    ];
    
    statePatterns.forEach(pattern => {
      const matches = modified.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        if (!original.includes(match[0])) {
          const line = this.getLineNumber(modified, match.index || 0);
          issues.push({
            type: 'state-interference',
            component: filePath,
            file: filePath,
            line,
            description: `New state management may interfere with Kiro state: ${match[0]}`,
            impact: 'medium',
            mitigation: 'Use different state variable names or ensure proper isolation'
          });
        }
      }
    });

    return issues;
  }

  private detectPropModifications(filePath: string, original: string, modified: string): DataFlowIssue[] {
    const issues: DataFlowIssue[] = [];
    
    // Check for prop drilling changes that might affect Kiro data flow
    const propPattern = /props\.\w+/g;
    const originalProps = new Set(original.match(propPattern) || []);
    const modifiedProps = new Set(modified.match(propPattern) || []);
    
    // Check for removed props that might be Kiro-related
    originalProps.forEach(prop => {
      if ((prop.includes('kiro') || prop.includes('telemetry') || prop.includes('agent')) && !modifiedProps.has(prop)) {
        const line = this.getLineNumber(original, original.indexOf(prop));
        issues.push({
          type: 'prop-modification',
          component: filePath,
          file: filePath,
          line,
          description: `Kiro-related prop ${prop} was removed`,
          impact: 'high',
          mitigation: 'Preserve the prop or ensure data is available through alternative means'
        });
      }
    });

    return issues;
  }

  private async validatePreservation(
    filePath: string,
    original: string,
    modified: string,
    existingFeatures: PreservedFeature[]
  ): Promise<FeatureConflict[]> {
    const conflicts: FeatureConflict[] = [];
    
    // Check if any existing Kiro features were accidentally modified
    existingFeatures.forEach(feature => {
      if (feature.file === filePath) {
        const featureStillExists = modified.includes(feature.name);
        if (!featureStillExists) {
          conflicts.push({
            type: 'naming',
            feature: feature.name,
            file: filePath,
            line: feature.line,
            conflict: `Kiro feature '${feature.name}' was removed during restoration`,
            severity: 'high',
            suggestion: `Restore the ${feature.type} '${feature.name}' to maintain Kiro functionality`
          });
        }
      }
    });

    return conflicts;
  }

  private generatePreservationRecommendations(result: FeaturePreservationResult): string[] {
    const recommendations: string[] = [];
    
    // High severity conflicts
    const highSeverityConflicts = result.conflicts.filter(c => c.severity === 'high');
    if (highSeverityConflicts.length > 0) {
      recommendations.push(`🚨 ${highSeverityConflicts.length} high-severity conflicts detected. Review and resolve before applying changes.`);
    }
    
    // High impact data flow issues
    const highImpactIssues = result.dataFlowIssues.filter(d => d.impact === 'high');
    if (highImpactIssues.length > 0) {
      recommendations.push(`⚠️ ${highImpactIssues.length} high-impact data flow issues detected. Ensure Kiro functionality remains intact.`);
    }
    
    // Telemetry preservation
    const telemetryFeatures = result.preservedFeatures.filter(f => f.type === 'telemetry');
    if (telemetryFeatures.length > 0) {
      recommendations.push(`📊 ${telemetryFeatures.length} telemetry features detected. Ensure all tracking remains functional after restoration.`);
    }
    
    // Hook preservation
    const hookFeatures = result.preservedFeatures.filter(f => f.type === 'hook');
    if (hookFeatures.length > 0) {
      recommendations.push(`🪝 ${hookFeatures.length} Kiro hooks detected. Test hook functionality after applying changes.`);
    }
    
    // General recommendations
    if (result.conflicts.length === 0 && result.dataFlowIssues.length === 0) {
      recommendations.push('✅ No conflicts detected. Changes appear safe to apply.');
    } else {
      recommendations.push('🔍 Review all conflicts and data flow issues before proceeding with restoration.');
    }

    return recommendations;
  }

  private async getAllTSXFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await readdir(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          const subFiles = await this.getAllTSXFiles(fullPath);
          files.push(...subFiles);
        } else if (stats.isFile() && /\.(tsx?|jsx?)$/.test(entry)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Failed to read directory ${dir}:`, error);
    }
    
    return files;
  }

  private extractNames(content: string): Map<string, number> {
    const names = new Map<string, number>();
    
    // Extract function and component names
    const patterns = [
      /(?:function|const)\s+([A-Z][a-zA-Z0-9]*)/g,
      /export\s+(?:function|const)\s+([A-Z][a-zA-Z0-9]*)/g,
      /interface\s+([A-Z][a-zA-Z0-9]*)/g,
      /type\s+([A-Z][a-zA-Z0-9]*)/g
    ];
    
    patterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const name = match[1];
        const line = this.getLineNumber(content, match.index || 0);
        names.set(name, line);
      }
    });
    
    return names;
  }

  private extractImports(content: string): Map<string, number> {
    const imports = new Map<string, number>();
    
    const importPattern = /import\s+.*?from\s+['"`]([^'"`]+)['"`]/g;
    const matches = content.matchAll(importPattern);
    
    for (const match of matches) {
      const importPath = match[1];
      const line = this.getLineNumber(content, match.index || 0);
      imports.set(importPath, line);
    }
    
    return imports;
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }
}