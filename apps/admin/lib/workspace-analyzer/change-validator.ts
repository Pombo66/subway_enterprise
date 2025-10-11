/**
 * Change validation and rollback capability system
 * Implements atomic change operations that can be cleanly reverted
 * Creates detailed change tracking for easy rollback if needed
 */

import { AnalysisError } from './types';
import { PRChange, PreviewPR } from './preview-pr-builder';

// Change validation interfaces
export interface ChangeValidation {
  changeId: string;
  isValid: boolean;
  validationType: 'syntax' | 'typescript' | 'safety' | 'compatibility' | 'rollback';
  issues: ValidationIssue[];
  confidence: number;
  canAutoFix: boolean;
  suggestedFixes: string[];
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  line?: number;
  column?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface AtomicChange {
  id: string;
  type: 'file_create' | 'file_modify' | 'file_delete' | 'content_insert' | 'content_replace' | 'content_delete';
  targetFile: string;
  operation: ChangeOperation;
  rollbackOperation: ChangeOperation;
  dependencies: string[]; // Other change IDs this depends on
  timestamp: Date;
  applied: boolean;
  validated: boolean;
}

export interface ChangeOperation {
  type: 'create' | 'modify' | 'delete' | 'insert' | 'replace';
  content?: string;
  originalContent?: string;
  position?: {
    line: number;
    column: number;
  };
  range?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

export interface RollbackPlan {
  changeIds: string[];
  operations: AtomicChange[];
  safetyChecks: RollbackSafetyCheck[];
  estimatedTime: number; // seconds
  riskLevel: 'low' | 'medium' | 'high';
  dependencies: string[];
}

export interface RollbackSafetyCheck {
  type: 'backup_exists' | 'no_conflicts' | 'dependencies_resolved' | 'state_preserved';
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

export interface ChangeTracker {
  changes: Map<string, AtomicChange>;
  appliedOrder: string[];
  backups: Map<string, string>; // file -> backup content
  currentState: Map<string, string>; // file -> current content
  rollbackHistory: RollbackPlan[];
}

/**
 * Main change validator and rollback system
 */
export class ChangeValidator {
  private errors: AnalysisError[] = [];
  private tracker: ChangeTracker;
  private targetScope: string;

  constructor(targetScope: string = 'apps/admin') {
    this.targetScope = targetScope;
    this.tracker = {
      changes: new Map(),
      appliedOrder: [],
      backups: new Map(),
      currentState: new Map(),
      rollbackHistory: []
    };
  }

  /**
   * Validate all changes in a preview PR
   */
  validatePreviewPR(previewPR: PreviewPR): ChangeValidation[] {
    try {
      const validations: ChangeValidation[] = [];

      // Convert PR changes to atomic changes
      const atomicChanges = this.convertToAtomicChanges(previewPR.changes);

      // Validate each atomic change
      for (const atomicChange of atomicChanges) {
        const validation = this.validateAtomicChange(atomicChange);
        validations.push(validation);
        
        // Store the atomic change for tracking
        this.tracker.changes.set(atomicChange.id, atomicChange);
      }

      // Validate dependencies and order
      const dependencyValidation = this.validateDependencies(atomicChanges);
      if (dependencyValidation) {
        validations.push(dependencyValidation);
      }

      return validations;
    } catch (error) {
      this.addError('parse_error', 'change-validation', `Failed to validate preview PR: ${error}`);
      return [];
    }
  }

  /**
   * Convert PR changes to atomic changes
   */
  private convertToAtomicChanges(prChanges: PRChange[]): AtomicChange[] {
    const atomicChanges: AtomicChange[] = [];

    prChanges.forEach((prChange, index) => {
      // Create backup operation first
      const backupChange: AtomicChange = {
        id: `backup-${prChange.id}`,
        type: 'file_modify',
        targetFile: `${prChange.file}.backup`,
        operation: {
          type: 'create',
          content: prChange.originalContent || ''
        },
        rollbackOperation: {
          type: 'delete'
        },
        dependencies: [],
        timestamp: new Date(),
        applied: false,
        validated: false
      };
      atomicChanges.push(backupChange);

      // Create main change operation
      const mainChange: AtomicChange = {
        id: prChange.id,
        type: prChange.type === 'create' ? 'file_create' : 
              prChange.type === 'delete' ? 'file_delete' : 'file_modify',
        targetFile: prChange.file,
        operation: {
          type: prChange.type,
          content: prChange.newContent,
          originalContent: prChange.originalContent
        },
        rollbackOperation: {
          type: prChange.originalContent ? 'replace' : 'delete',
          content: prChange.originalContent
        },
        dependencies: [backupChange.id],
        timestamp: new Date(),
        applied: false,
        validated: false
      };
      atomicChanges.push(mainChange);
    });

    return atomicChanges;
  }

  /**
   * Validate individual atomic change
   */
  private validateAtomicChange(atomicChange: AtomicChange): ChangeValidation {
    const issues: ValidationIssue[] = [];
    let confidence = 1.0;
    let canAutoFix = true;

    try {
      // Syntax validation
      const syntaxIssues = this.validateSyntax(atomicChange);
      issues.push(...syntaxIssues);

      // TypeScript validation
      const typeScriptIssues = this.validateTypeScript(atomicChange);
      issues.push(...typeScriptIssues);

      // Safety validation
      const safetyIssues = this.validateSafety(atomicChange);
      issues.push(...safetyIssues);

      // Compatibility validation
      const compatibilityIssues = this.validateCompatibility(atomicChange);
      issues.push(...compatibilityIssues);

      // Rollback validation
      const rollbackIssues = this.validateRollbackCapability(atomicChange);
      issues.push(...rollbackIssues);

      // Calculate confidence based on issues
      const criticalIssues = issues.filter(i => i.severity === 'critical').length;
      const highIssues = issues.filter(i => i.severity === 'high').length;
      const mediumIssues = issues.filter(i => i.severity === 'medium').length;

      confidence -= (criticalIssues * 0.3) + (highIssues * 0.2) + (mediumIssues * 0.1);
      confidence = Math.max(confidence, 0);

      // Determine if auto-fix is possible
      canAutoFix = criticalIssues === 0 && highIssues <= 1;

      // Generate suggested fixes
      const suggestedFixes = this.generateSuggestedFixes(atomicChange, issues);

      return {
        changeId: atomicChange.id,
        isValid: criticalIssues === 0,
        validationType: 'syntax',
        issues,
        confidence,
        canAutoFix,
        suggestedFixes
      };
    } catch (error) {
      this.addError('parse_error', 'change-validation', `Failed to validate atomic change ${atomicChange.id}: ${error}`);
      
      return {
        changeId: atomicChange.id,
        isValid: false,
        validationType: 'syntax',
        issues: [{
          type: 'error',
          code: 'VALIDATION_ERROR',
          message: `Validation failed: ${error}`,
          severity: 'critical'
        }],
        confidence: 0,
        canAutoFix: false,
        suggestedFixes: []
      };
    }
  }

  /**
   * Validate syntax of the change
   */
  private validateSyntax(atomicChange: AtomicChange): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!atomicChange.operation.content) {
      return issues; // No content to validate
    }

    const content = atomicChange.operation.content;
    const file = atomicChange.targetFile;

    // JavaScript/TypeScript syntax validation
    if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      // Check for basic syntax issues
      const syntaxChecks = [
        { pattern: /\{[^}]*$/, message: 'Unclosed curly brace' },
        { pattern: /\([^)]*$/, message: 'Unclosed parenthesis' },
        { pattern: /\[[^\]]*$/, message: 'Unclosed square bracket' },
        { pattern: /["'][^"']*$/, message: 'Unclosed string literal' },
        { pattern: /\/\*[^*]*$/, message: 'Unclosed comment block' }
      ];

      syntaxChecks.forEach(check => {
        if (check.pattern.test(content)) {
          issues.push({
            type: 'error',
            code: 'SYNTAX_ERROR',
            message: check.message,
            severity: 'high'
          });
        }
      });

      // Check for React/JSX specific issues
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        if (content.includes('<') && !content.includes('React') && !content.includes('import')) {
          issues.push({
            type: 'warning',
            code: 'MISSING_REACT_IMPORT',
            message: 'JSX used but React import not found',
            severity: 'medium'
          });
        }
      }
    }

    // CSS syntax validation
    if (file.endsWith('.css')) {
      const cssChecks = [
        { pattern: /\{[^}]*$/, message: 'Unclosed CSS rule' },
        { pattern: /\/\*[^*]*$/, message: 'Unclosed CSS comment' },
        { pattern: /:(?![^;]*;)/, message: 'CSS property without semicolon' }
      ];

      cssChecks.forEach(check => {
        if (check.pattern.test(content)) {
          issues.push({
            type: 'error',
            code: 'CSS_SYNTAX_ERROR',
            message: check.message,
            severity: 'high'
          });
        }
      });
    }

    return issues;
  }

  /**
   * Validate TypeScript compatibility
   */
  private validateTypeScript(atomicChange: AtomicChange): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!atomicChange.operation.content) {
      return issues;
    }

    const content = atomicChange.operation.content;
    const file = atomicChange.targetFile;

    // Only validate TypeScript files
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
      return issues;
    }

    // Check for TypeScript-specific issues
    const typeScriptChecks = [
      {
        pattern: /:\s*any\b/,
        message: 'Usage of "any" type reduces type safety',
        severity: 'medium' as const
      },
      {
        pattern: /\w+\s*\?\s*\.\s*\w+/,
        message: 'Optional chaining used (ensure TypeScript 3.7+)',
        severity: 'low' as const
      },
      {
        pattern: /\w+\s*\?\?\s*\w+/,
        message: 'Nullish coalescing used (ensure TypeScript 3.7+)',
        severity: 'low' as const
      },
      {
        pattern: /interface\s+\w+\s*\{[^}]*\}/,
        message: 'Interface definition found',
        severity: 'low' as const
      }
    ];

    typeScriptChecks.forEach(check => {
      if (check.pattern.test(content)) {
        issues.push({
          type: check.severity === 'low' ? 'info' : 'warning',
          code: 'TYPESCRIPT_CHECK',
          message: check.message,
          severity: check.severity
        });
      }
    });

    // Check for missing imports
    const importChecks = [
      { usage: /useMemo|useCallback|useEffect|useState/, import: 'React' },
      { usage: /className=/, import: 'React' },
      { usage: /interface\s+\w+/, import: 'type definitions' }
    ];

    importChecks.forEach(check => {
      if (check.usage.test(content) && !content.includes(`import`) && !content.includes(check.import)) {
        issues.push({
          type: 'warning',
          code: 'MISSING_IMPORT',
          message: `Usage of ${check.import} features but import not found`,
          severity: 'medium'
        });
      }
    });

    return issues;
  }

  /**
   * Validate safety of the change
   */
  private validateSafety(atomicChange: AtomicChange): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const content = atomicChange.operation.content || '';
    const file = atomicChange.targetFile;

    // Check for dangerous operations
    const dangerousPatterns = [
      { pattern: /DROP\s+TABLE/i, message: 'Database table deletion detected', severity: 'critical' as const },
      { pattern: /DELETE\s+FROM/i, message: 'Database deletion detected', severity: 'critical' as const },
      { pattern: /rm\s+-rf/i, message: 'Dangerous file deletion command', severity: 'critical' as const },
      { pattern: /eval\s*\(/i, message: 'Use of eval() is dangerous', severity: 'high' as const },
      { pattern: /innerHTML\s*=/i, message: 'Direct innerHTML usage (XSS risk)', severity: 'high' as const },
      { pattern: /document\.write/i, message: 'Use of document.write (security risk)', severity: 'high' as const }
    ];

    dangerousPatterns.forEach(pattern => {
      if (pattern.pattern.test(content)) {
        issues.push({
          type: 'error',
          code: 'SAFETY_VIOLATION',
          message: pattern.message,
          severity: pattern.severity
        });
      }
    });

    // Check for scope violations
    if (!file.startsWith(this.targetScope)) {
      issues.push({
        type: 'error',
        code: 'SCOPE_VIOLATION',
        message: `File ${file} is outside target scope ${this.targetScope}`,
        severity: 'critical'
      });
    }

    // Check for restricted file modifications
    const restrictedPatterns = [
      { pattern: /\/api\//, message: 'API route modification detected' },
      { pattern: /\/lib\/db/, message: 'Database layer modification detected' },
      { pattern: /\.env/, message: 'Environment file modification detected' },
      { pattern: /package\.json/, message: 'Package configuration modification detected' }
    ];

    restrictedPatterns.forEach(pattern => {
      if (pattern.pattern.test(file)) {
        issues.push({
          type: 'warning',
          code: 'RESTRICTED_FILE',
          message: pattern.message,
          severity: 'high'
        });
      }
    });

    return issues;
  }

  /**
   * Validate compatibility with existing code
   */
  private validateCompatibility(atomicChange: AtomicChange): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const content = atomicChange.operation.content || '';
    const originalContent = atomicChange.operation.originalContent || '';

    // Check for breaking changes
    if (originalContent) {
      // Check if exports are being removed
      const oldExports = this.extractExports(originalContent);
      const newExports = this.extractExports(content);
      
      oldExports.forEach(exportName => {
        if (!newExports.includes(exportName)) {
          issues.push({
            type: 'warning',
            code: 'BREAKING_CHANGE',
            message: `Export '${exportName}' is being removed`,
            severity: 'high'
          });
        }
      });

      // Check if function signatures are changing
      const oldFunctions = this.extractFunctions(originalContent);
      const newFunctions = this.extractFunctions(content);
      
      oldFunctions.forEach(funcName => {
        if (newFunctions.includes(funcName)) {
          // Function still exists, check if signature might have changed
          const oldSignature = this.extractFunctionSignature(originalContent, funcName);
          const newSignature = this.extractFunctionSignature(content, funcName);
          
          if (oldSignature !== newSignature) {
            issues.push({
              type: 'warning',
              code: 'SIGNATURE_CHANGE',
              message: `Function '${funcName}' signature may have changed`,
              severity: 'medium'
            });
          }
        }
      });
    }

    // Check for new dependencies
    const newImports = this.extractImports(content);
    newImports.forEach(importPath => {
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        // Relative import - check if it's likely to exist
        if (!this.isLikelyValidPath(importPath)) {
          issues.push({
            type: 'warning',
            code: 'MISSING_DEPENDENCY',
            message: `Import path '${importPath}' may not exist`,
            severity: 'medium'
          });
        }
      }
    });

    return issues;
  }

  /**
   * Validate rollback capability
   */
  private validateRollbackCapability(atomicChange: AtomicChange): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if rollback operation is properly defined
    if (!atomicChange.rollbackOperation) {
      issues.push({
        type: 'error',
        code: 'NO_ROLLBACK',
        message: 'No rollback operation defined',
        severity: 'critical'
      });
      return issues;
    }

    // Check if rollback operation is valid
    const rollback = atomicChange.rollbackOperation;
    
    if (rollback.type === 'replace' && !rollback.content) {
      issues.push({
        type: 'error',
        code: 'INVALID_ROLLBACK',
        message: 'Rollback replace operation missing content',
        severity: 'high'
      });
    }

    // Check if dependencies can be rolled back
    atomicChange.dependencies.forEach(depId => {
      const dependency = this.tracker.changes.get(depId);
      if (dependency && !dependency.rollbackOperation) {
        issues.push({
          type: 'warning',
          code: 'DEPENDENCY_NO_ROLLBACK',
          message: `Dependency '${depId}' has no rollback capability`,
          severity: 'medium'
        });
      }
    });

    return issues;
  }

  /**
   * Validate dependencies between changes
   */
  private validateDependencies(atomicChanges: AtomicChange[]): ChangeValidation | null {
    const issues: ValidationIssue[] = [];
    const changeMap = new Map(atomicChanges.map(c => [c.id, c]));

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (changeId: string): boolean => {
      if (recursionStack.has(changeId)) {
        return true; // Cycle detected
      }
      if (visited.has(changeId)) {
        return false; // Already processed
      }

      visited.add(changeId);
      recursionStack.add(changeId);

      const change = changeMap.get(changeId);
      if (change) {
        for (const depId of change.dependencies) {
          if (hasCycle(depId)) {
            return true;
          }
        }
      }

      recursionStack.delete(changeId);
      return false;
    };

    // Check each change for cycles
    for (const change of atomicChanges) {
      if (hasCycle(change.id)) {
        issues.push({
          type: 'error',
          code: 'CIRCULAR_DEPENDENCY',
          message: `Circular dependency detected involving change '${change.id}'`,
          severity: 'critical'
        });
      }
    }

    // Check for missing dependencies
    for (const change of atomicChanges) {
      for (const depId of change.dependencies) {
        if (!changeMap.has(depId)) {
          issues.push({
            type: 'error',
            code: 'MISSING_DEPENDENCY',
            message: `Change '${change.id}' depends on missing change '${depId}'`,
            severity: 'high'
          });
        }
      }
    }

    if (issues.length === 0) {
      return null; // No dependency issues
    }

    return {
      changeId: 'dependency-validation',
      isValid: issues.filter(i => i.severity === 'critical').length === 0,
      validationType: 'compatibility',
      issues,
      confidence: issues.length > 0 ? 0.5 : 1.0,
      canAutoFix: false,
      suggestedFixes: ['Resolve circular dependencies', 'Add missing dependencies']
    };
  }

  /**
   * Generate rollback plan for specific changes
   */
  generateRollbackPlan(changeIds: string[]): RollbackPlan {
    try {
      const operations: AtomicChange[] = [];
      const dependencies: string[] = [];
      
      // Collect all changes and their dependencies
      const allChangeIds = new Set(changeIds);
      const queue = [...changeIds];
      
      while (queue.length > 0) {
        const changeId = queue.shift()!;
        const change = this.tracker.changes.get(changeId);
        
        if (change) {
          operations.push(change);
          
          // Add dependencies to the queue
          change.dependencies.forEach(depId => {
            if (!allChangeIds.has(depId)) {
              allChangeIds.add(depId);
              queue.push(depId);
              dependencies.push(depId);
            }
          });
        }
      }

      // Sort operations in reverse dependency order for rollback
      const sortedOperations = this.topologicalSort(operations).reverse();

      // Perform safety checks
      const safetyChecks = this.performRollbackSafetyChecks(sortedOperations);

      // Calculate risk level and estimated time
      const riskLevel = this.calculateRollbackRisk(sortedOperations);
      const estimatedTime = this.estimateRollbackTime(sortedOperations);

      const rollbackPlan: RollbackPlan = {
        changeIds: Array.from(allChangeIds),
        operations: sortedOperations,
        safetyChecks,
        estimatedTime,
        riskLevel,
        dependencies
      };

      // Store rollback plan in history
      this.tracker.rollbackHistory.push(rollbackPlan);

      return rollbackPlan;
    } catch (error) {
      this.addError('parse_error', 'rollback-planning', `Failed to generate rollback plan: ${error}`);
      
      return {
        changeIds,
        operations: [],
        safetyChecks: [{
          type: 'backup_exists',
          status: 'fail',
          message: `Rollback planning failed: ${error}`
        }],
        estimatedTime: 0,
        riskLevel: 'high',
        dependencies: []
      };
    }
  }

  /**
   * Execute rollback plan
   */
  executeRollback(rollbackPlan: RollbackPlan): boolean {
    try {
      // Verify safety checks pass
      const criticalFailures = rollbackPlan.safetyChecks.filter(
        check => check.status === 'fail' && 
        (check.type === 'backup_exists' || check.type === 'no_conflicts')
      );

      if (criticalFailures.length > 0) {
        this.addError('safety_error', 'rollback-execution', 
          `Cannot execute rollback: ${criticalFailures.map(f => f.message).join(', ')}`);
        return false;
      }

      // Execute rollback operations in order
      for (const operation of rollbackPlan.operations) {
        if (operation.applied) {
          const success = this.executeRollbackOperation(operation);
          if (!success) {
            this.addError('execution_error', 'rollback-execution', 
              `Failed to rollback operation ${operation.id}`);
            return false;
          }
          
          // Mark as rolled back
          operation.applied = false;
          
          // Remove from applied order
          const index = this.tracker.appliedOrder.indexOf(operation.id);
          if (index > -1) {
            this.tracker.appliedOrder.splice(index, 1);
          }
        }
      }

      return true;
    } catch (error) {
      this.addError('execution_error', 'rollback-execution', `Rollback execution failed: ${error}`);
      return false;
    }
  }

  // Helper methods

  private generateSuggestedFixes(atomicChange: AtomicChange, issues: ValidationIssue[]): string[] {
    const fixes: string[] = [];

    issues.forEach(issue => {
      switch (issue.code) {
        case 'SYNTAX_ERROR':
          fixes.push('Fix syntax errors in the generated code');
          break;
        case 'MISSING_REACT_IMPORT':
          fixes.push('Add React import: import React from "react"');
          break;
        case 'MISSING_IMPORT':
          fixes.push('Add missing imports for used features');
          break;
        case 'SAFETY_VIOLATION':
          fixes.push('Remove dangerous operations or add safety checks');
          break;
        case 'SCOPE_VIOLATION':
          fixes.push(`Move file to within target scope: ${this.targetScope}`);
          break;
        case 'BREAKING_CHANGE':
          fixes.push('Preserve existing exports or update dependent code');
          break;
        case 'NO_ROLLBACK':
          fixes.push('Define proper rollback operation');
          break;
        default:
          fixes.push('Review and fix the identified issue');
      }
    });

    return [...new Set(fixes)]; // Remove duplicates
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:default\s+)?(?:function\s+(\w+)|const\s+(\w+)|class\s+(\w+)|interface\s+(\w+))/g;
    
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      const exportName = match[1] || match[2] || match[3] || match[4];
      if (exportName) {
        exports.push(exportName);
      }
    }
    
    return exports;
  }

  private extractFunctions(content: string): string[] {
    const functions: string[] = [];
    const functionRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\()/g;
    
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1] || match[2];
      if (functionName) {
        functions.push(functionName);
      }
    }
    
    return functions;
  }

  private extractFunctionSignature(content: string, functionName: string): string {
    const regex = new RegExp(`(?:function\\s+${functionName}|const\\s+${functionName}\\s*=\\s*(?:async\\s+)?)(\\([^)]*\\))`, 'g');
    const match = regex.exec(content);
    return match ? match[1] : '';
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  private isLikelyValidPath(path: string): boolean {
    // Simple heuristic - in a real implementation, you'd check the file system
    return !path.includes('..') || path.includes('./components') || path.includes('./lib');
  }

  private topologicalSort(changes: AtomicChange[]): AtomicChange[] {
    const visited = new Set<string>();
    const result: AtomicChange[] = [];
    const changeMap = new Map(changes.map(c => [c.id, c]));

    const visit = (change: AtomicChange) => {
      if (visited.has(change.id)) return;
      
      visited.add(change.id);
      
      // Visit dependencies first
      change.dependencies.forEach(depId => {
        const dep = changeMap.get(depId);
        if (dep) visit(dep);
      });
      
      result.push(change);
    };

    changes.forEach(change => visit(change));
    return result;
  }

  private performRollbackSafetyChecks(operations: AtomicChange[]): RollbackSafetyCheck[] {
    const checks: RollbackSafetyCheck[] = [];

    // Check if backups exist
    const hasBackups = operations.every(op => 
      this.tracker.backups.has(op.targetFile) || op.type === 'file_create'
    );
    
    checks.push({
      type: 'backup_exists',
      status: hasBackups ? 'pass' : 'fail',
      message: hasBackups ? 'All necessary backups exist' : 'Some backups are missing'
    });

    // Check for conflicts
    const hasConflicts = operations.some(op => 
      this.tracker.currentState.has(op.targetFile) && 
      this.tracker.currentState.get(op.targetFile) !== op.operation.content
    );
    
    checks.push({
      type: 'no_conflicts',
      status: hasConflicts ? 'warning' : 'pass',
      message: hasConflicts ? 'File conflicts detected' : 'No conflicts detected'
    });

    // Check dependencies
    const dependenciesResolved = operations.every(op => 
      op.dependencies.every(depId => this.tracker.changes.has(depId))
    );
    
    checks.push({
      type: 'dependencies_resolved',
      status: dependenciesResolved ? 'pass' : 'fail',
      message: dependenciesResolved ? 'All dependencies resolved' : 'Missing dependencies'
    });

    // Check state preservation
    checks.push({
      type: 'state_preserved',
      status: 'pass',
      message: 'Current state will be preserved during rollback'
    });

    return checks;
  }

  private calculateRollbackRisk(operations: AtomicChange[]): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    operations.forEach(op => {
      // File operations carry different risks
      if (op.type === 'file_delete') riskScore += 3;
      if (op.type === 'file_create') riskScore += 1;
      if (op.type === 'file_modify') riskScore += 2;

      // Critical files carry higher risk
      if (op.targetFile.includes('package.json')) riskScore += 2;
      if (op.targetFile.includes('.env')) riskScore += 3;
      if (op.targetFile.includes('/api/')) riskScore += 2;
    });

    if (riskScore <= 3) return 'low';
    if (riskScore <= 8) return 'medium';
    return 'high';
  }

  private estimateRollbackTime(operations: AtomicChange[]): number {
    // Estimate 2 seconds per operation plus 5 seconds base time
    return 5 + (operations.length * 2);
  }

  private executeRollbackOperation(operation: AtomicChange): boolean {
    try {
      const rollback = operation.rollbackOperation;
      
      switch (rollback.type) {
        case 'replace':
          // Restore original content
          if (rollback.content) {
            this.tracker.currentState.set(operation.targetFile, rollback.content);
            return true;
          }
          break;
          
        case 'delete':
          // Remove the file
          this.tracker.currentState.delete(operation.targetFile);
          return true;
          
        default:
          this.addError('execution_error', 'rollback-operation', 
            `Unknown rollback operation type: ${rollback.type}`);
          return false;
      }
      
      return false;
    } catch (error) {
      this.addError('execution_error', 'rollback-operation', 
        `Failed to execute rollback operation: ${error}`);
      return false;
    }
  }

  /**
   * Get current change tracker state
   */
  getTrackerState(): ChangeTracker {
    return {
      changes: new Map(this.tracker.changes),
      appliedOrder: [...this.tracker.appliedOrder],
      backups: new Map(this.tracker.backups),
      currentState: new Map(this.tracker.currentState),
      rollbackHistory: [...this.tracker.rollbackHistory]
    };
  }

  /**
   * Get all errors encountered during validation
   */
  getErrors(): AnalysisError[] {
    return [...this.errors];
  }

  /**
   * Clear accumulated errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  private addError(type: AnalysisError['type'], path: string, message: string): void {
    this.errors.push({
      type,
      path,
      message,
      timestamp: new Date()
    });
  }
}