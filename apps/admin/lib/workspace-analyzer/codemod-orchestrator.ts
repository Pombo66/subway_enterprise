/**
 * Codemod orchestrator - integrates all codemod generators
 * Provides unified interface for generating comprehensive restoration codemods
 */

import { AnalysisError } from './types';
import { RegressionReport } from './regression-detector';
import { 
  CodemodGenerator, 
  CodemodPlan,
  KPITileRestoration,
  StylingRestoration,
  ComponentRestoration
} from './codemod-generator';
import { 
  StylingCodemodGenerator, 
  StylingCodemod 
} from './styling-codemod';
import { 
  FeaturePanelCodemodGenerator, 
  FeaturePanelCodemod 
} from './feature-panel-codemod';

export interface ComprehensiveCodemodPlan {
  kpiRestoration: KPITileRestoration;
  stylingCodemods: StylingCodemod[];
  featurePanelCodemods: FeaturePanelCodemod[];
  overallConfidence: number;
  safetyValidation: SafetyValidationResult;
  executionPlan: ExecutionStep[];
  rollbackPlan: RollbackStep[];
}

export interface SafetyValidationResult {
  typeScriptSafety: ValidationCheck;
  dataLayerSafety: ValidationCheck;
  newFeaturePreservation: ValidationCheck;
  importValidation: ValidationCheck;
  overallStatus: 'safe' | 'warning' | 'unsafe';
}

export interface ValidationCheck {
  status: 'pass' | 'warning' | 'fail';
  message: string;
  details: string[];
}

export interface ExecutionStep {
  order: number;
  type: 'kpi' | 'styling' | 'feature_panel';
  targetFile: string;
  description: string;
  changes: CodeChange[];
  dependencies: string[];
  confidence: number;
}

export interface CodeChange {
  type: 'insert' | 'replace' | 'append';
  location: string;
  oldCode?: string;
  newCode: string;
  description: string;
}

export interface RollbackStep {
  order: number;
  targetFile: string;
  action: 'revert_file' | 'remove_additions' | 'restore_original';
  backupLocation: string;
  description: string;
}

/**
 * Main codemod orchestrator
 */
export class CodemodOrchestrator {
  private errors: AnalysisError[] = [];
  private codemodGenerator: CodemodGenerator;
  private stylingGenerator: StylingCodemodGenerator;
  private featurePanelGenerator: FeaturePanelCodemodGenerator;

  constructor() {
    this.codemodGenerator = new CodemodGenerator();
    this.stylingGenerator = new StylingCodemodGenerator();
    this.featurePanelGenerator = new FeaturePanelCodemodGenerator();
  }

  /**
   * Generate comprehensive codemod plan from regression report
   */
  async generateComprehensiveCodemodPlan(regressionReport: RegressionReport): Promise<ComprehensiveCodemodPlan> {
    try {
      // Generate individual codemod plans
      const mainCodemodPlan = this.codemodGenerator.generateCodemodPlan(regressionReport);
      const stylingCodemods = this.stylingGenerator.generateStylingCodemods(regressionReport.stylingRegressions);
      const featurePanelCodemods = this.featurePanelGenerator.generateFeaturePanelCodemods(regressionReport.featureRegressions);

      // Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(
        mainCodemodPlan,
        stylingCodemods,
        featurePanelCodemods
      );

      // Perform comprehensive safety validation
      const safetyValidation = this.performComprehensiveSafetyValidation(
        mainCodemodPlan,
        stylingCodemods,
        featurePanelCodemods
      );

      // Generate execution plan
      const executionPlan = this.generateExecutionPlan(
        mainCodemodPlan,
        stylingCodemods,
        featurePanelCodemods
      );

      // Generate rollback plan
      const rollbackPlan = this.generateRollbackPlan(executionPlan);

      return {
        kpiRestoration: mainCodemodPlan.kpiRestoration,
        stylingCodemods,
        featurePanelCodemods,
        overallConfidence,
        safetyValidation,
        executionPlan,
        rollbackPlan
      };

    } catch (error) {
      this.addError('parse_error', 'codemod-orchestration', `Failed to generate comprehensive codemod plan: ${error}`);
      
      // Return empty plan on error
      return this.createEmptyCodemodPlan();
    }
  }

  /**
   * Validate codemod plan safety
   */
  validateCodemodSafety(plan: ComprehensiveCodemodPlan): SafetyValidationResult {
    return this.performComprehensiveSafetyValidation(
      { kpiRestoration: plan.kpiRestoration } as CodemodPlan,
      plan.stylingCodemods,
      plan.featurePanelCodemods
    );
  }

  /**
   * Generate execution order for codemods
   */
  generateOptimalExecutionOrder(plan: ComprehensiveCodemodPlan): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    let order = 1;

    // 1. First, restore CSS tokens (foundation)
    plan.stylingCodemods.forEach(styleCodemod => {
      if (styleCodemod.targetFile.includes('.css')) {
        steps.push({
          order: order++,
          type: 'styling',
          targetFile: styleCodemod.targetFile,
          description: 'Restore CSS custom properties and tokens',
          changes: this.convertStylingChangesToCodeChanges(styleCodemod.changes),
          dependencies: [],
          confidence: styleCodemod.confidence
        });
      }
    });

    // 2. Then, restore KPI grid structure
    if (plan.kpiRestoration.addMissingTiles.length > 0) {
      steps.push({
        order: order++,
        type: 'kpi',
        targetFile: 'app/dashboard/page.tsx',
        description: 'Restore missing KPI tiles and grid layout',
        changes: this.convertKPIRestorationsToCodeChanges(plan.kpiRestoration),
        dependencies: ['CSS tokens'],
        confidence: this.calculateKPIConfidence(plan.kpiRestoration)
      });
    }

    // 3. Next, restore feature panels
    plan.featurePanelCodemods.forEach(panelCodemod => {
      steps.push({
        order: order++,
        type: 'feature_panel',
        targetFile: panelCodemod.targetFile,
        description: 'Restore feature panels with empty states',
        changes: this.convertFeaturePanelRestorationsToCodeChanges(panelCodemod),
        dependencies: ['CSS tokens', 'KPI grid'],
        confidence: panelCodemod.confidence
      });
    });

    // 4. Finally, apply component styling fixes
    plan.stylingCodemods.forEach(styleCodemod => {
      if (!styleCodemod.targetFile.includes('.css')) {
        steps.push({
          order: order++,
          type: 'styling',
          targetFile: styleCodemod.targetFile,
          description: 'Apply component styling and icon alignment fixes',
          changes: this.convertStylingChangesToCodeChanges(styleCodemod.changes),
          dependencies: ['CSS tokens', 'KPI grid', 'Feature panels'],
          confidence: styleCodemod.confidence
        });
      }
    });

    return steps.sort((a, b) => a.order - b.order);
  }

  /**
   * Generate file modification summary
   */
  generateFileModificationSummary(plan: ComprehensiveCodemodPlan): Map<string, FileModification> {
    const modifications = new Map<string, FileModification>();

    // Collect all file modifications
    plan.executionPlan.forEach(step => {
      if (!modifications.has(step.targetFile)) {
        modifications.set(step.targetFile, {
          file: step.targetFile,
          modifications: [],
          totalChanges: 0,
          confidence: 0,
          safetyLevel: 'safe'
        });
      }

      const mod = modifications.get(step.targetFile)!;
      mod.modifications.push({
        type: step.type,
        description: step.description,
        changeCount: step.changes.length,
        confidence: step.confidence
      });
      mod.totalChanges += step.changes.length;
    });

    // Calculate aggregate confidence and safety for each file
    modifications.forEach(mod => {
      const avgConfidence = mod.modifications.reduce((sum, m) => sum + m.confidence, 0) / mod.modifications.length;
      mod.confidence = avgConfidence;
      mod.safetyLevel = avgConfidence > 0.8 ? 'safe' : avgConfidence > 0.6 ? 'warning' : 'unsafe';
    });

    return modifications;
  }

  /**
   * Estimate execution time
   */
  estimateExecutionTime(plan: ComprehensiveCodemodPlan): ExecutionTimeEstimate {
    const baseTimePerChange = 2; // seconds per change
    const fileSetupTime = 5; // seconds per file
    
    const totalChanges = plan.executionPlan.reduce((sum, step) => sum + step.changes.length, 0);
    const uniqueFiles = new Set(plan.executionPlan.map(step => step.targetFile)).size;
    
    const estimatedSeconds = (totalChanges * baseTimePerChange) + (uniqueFiles * fileSetupTime);
    
    return {
      estimatedSeconds,
      estimatedMinutes: Math.ceil(estimatedSeconds / 60),
      breakdown: {
        cssChanges: plan.stylingCodemods.reduce((sum, mod) => sum + mod.changes.length, 0),
        kpiChanges: plan.kpiRestoration.addMissingTiles.length,
        featurePanelChanges: plan.featurePanelCodemods.reduce((sum, mod) => sum + mod.restorations.length, 0),
        totalFiles: uniqueFiles
      }
    };
  }

  // Private implementation methods

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(
    mainPlan: CodemodPlan,
    stylingCodemods: StylingCodemod[],
    featurePanelCodemods: FeaturePanelCodemod[]
  ): number {
    const confidences = [
      mainPlan.confidence,
      ...stylingCodemods.map(mod => mod.confidence),
      ...featurePanelCodemods.map(mod => mod.confidence)
    ];

    if (confidences.length === 0) return 0;

    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
  }

  /**
   * Perform comprehensive safety validation
   */
  private performComprehensiveSafetyValidation(
    mainPlan: CodemodPlan,
    stylingCodemods: StylingCodemod[],
    featurePanelCodemods: FeaturePanelCodemod[]
  ): SafetyValidationResult {
    // TypeScript safety validation
    const typeScriptSafety = this.validateTypeScriptSafety(mainPlan, stylingCodemods, featurePanelCodemods);
    
    // Data layer safety validation
    const dataLayerSafety = this.validateDataLayerSafety(mainPlan, featurePanelCodemods);
    
    // New feature preservation validation
    const newFeaturePreservation = this.validateNewFeaturePreservation(mainPlan);
    
    // Import validation
    const importValidation = this.validateImports(mainPlan, stylingCodemods, featurePanelCodemods);

    // Determine overall status
    const allChecks = [typeScriptSafety, dataLayerSafety, newFeaturePreservation, importValidation];
    const overallStatus = this.determineOverallSafetyStatus(allChecks);

    return {
      typeScriptSafety,
      dataLayerSafety,
      newFeaturePreservation,
      importValidation,
      overallStatus
    };
  }

  /**
   * Validate TypeScript safety
   */
  private validateTypeScriptSafety(
    mainPlan: CodemodPlan,
    stylingCodemods: StylingCodemod[],
    featurePanelCodemods: FeaturePanelCodemod[]
  ): ValidationCheck {
    const issues: string[] = [];

    // Check for TypeScript compatibility in generated code
    mainPlan.kpiRestoration.addMissingTiles.forEach(tile => {
      if (!tile.generatedCode.includes('useMemo') && tile.dataWiring.includes('kpis.')) {
        issues.push(`KPI tile ${tile.tile.title} may need useMemo for data binding`);
      }
    });

    // Check feature panel TypeScript safety
    featurePanelCodemods.forEach(codemod => {
      codemod.restorations.forEach(restoration => {
        restoration.dataBindings.forEach(binding => {
          if (binding.type === 'array' && !binding.source.includes('Array.isArray')) {
            issues.push(`Data binding ${binding.variable} should include array type checking`);
          }
        });
      });
    });

    return {
      status: issues.length === 0 ? 'pass' : 'warning',
      message: issues.length === 0 ? 'All generated code maintains TypeScript compatibility' : `${issues.length} TypeScript compatibility issues detected`,
      details: issues
    };
  }

  /**
   * Validate data layer safety
   */
  private validateDataLayerSafety(
    mainPlan: CodemodPlan,
    featurePanelCodemods: FeaturePanelCodemod[]
  ): ValidationCheck {
    const issues: string[] = [];

    // Check KPI data wiring safety
    mainPlan.kpiRestoration.restoreDataWiring.forEach(wiring => {
      if (!wiring.generatedCode.includes('??') && !wiring.generatedCode.includes('||')) {
        issues.push(`Data wiring for ${wiring.variable} lacks fallback value`);
      }
    });

    // Check feature panel data safety
    featurePanelCodemods.forEach(codemod => {
      codemod.dataCompatibilityFixes.forEach(fix => {
        if (fix.confidence < 0.7) {
          issues.push(`Low confidence data fix for ${fix.variable}: ${fix.issue}`);
        }
      });
    });

    return {
      status: issues.length === 0 ? 'pass' : 'warning',
      message: issues.length === 0 ? 'All data bindings include proper safety checks' : `${issues.length} data safety issues detected`,
      details: issues
    };
  }

  /**
   * Validate new feature preservation
   */
  private validateNewFeaturePreservation(mainPlan: CodemodPlan): ValidationCheck {
    const issues: string[] = [];

    // Check that generated code doesn't interfere with telemetry
    const generatedCode = [
      ...mainPlan.kpiRestoration.addMissingTiles.map(tile => tile.generatedCode),
      ...mainPlan.stylingFixes.restoreTokens.map(token => token.generatedCSS)
    ].join('\n');

    if (generatedCode.includes('telemetry') || generatedCode.includes('analytics')) {
      issues.push('Generated code may interfere with existing telemetry');
    }

    return {
      status: issues.length === 0 ? 'pass' : 'warning',
      message: issues.length === 0 ? 'New features are preserved' : `${issues.length} potential conflicts with new features`,
      details: issues
    };
  }

  /**
   * Validate imports
   */
  private validateImports(
    mainPlan: CodemodPlan,
    stylingCodemods: StylingCodemod[],
    featurePanelCodemods: FeaturePanelCodemod[]
  ): ValidationCheck {
    const requiredImports = new Set<string>();
    const issues: string[] = [];

    // Check for required React imports
    if (mainPlan.kpiRestoration.addMissingTiles.length > 0) {
      requiredImports.add('useMemo');
    }

    featurePanelCodemods.forEach(codemod => {
      codemod.restorations.forEach(restoration => {
        if (restoration.generatedCode.includes('useMemo')) {
          requiredImports.add('useMemo');
        }
        if (restoration.generatedCode.includes('useState')) {
          requiredImports.add('useState');
        }
      });
    });

    // Validate that imports are properly handled
    if (requiredImports.size > 0) {
      issues.push(`Required imports: ${Array.from(requiredImports).join(', ')}`);
    }

    return {
      status: 'pass',
      message: 'Import requirements identified and will be handled',
      details: Array.from(requiredImports).map(imp => `Import required: ${imp}`)
    };
  }

  /**
   * Determine overall safety status
   */
  private determineOverallSafetyStatus(checks: ValidationCheck[]): 'safe' | 'warning' | 'unsafe' {
    const hasFailures = checks.some(check => check.status === 'fail');
    const hasWarnings = checks.some(check => check.status === 'warning');

    if (hasFailures) return 'unsafe';
    if (hasWarnings) return 'warning';
    return 'safe';
  }

  /**
   * Generate execution plan
   */
  private generateExecutionPlan(
    mainPlan: CodemodPlan,
    stylingCodemods: StylingCodemod[],
    featurePanelCodemods: FeaturePanelCodemod[]
  ): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    let order = 1;

    // Add KPI restoration steps
    if (mainPlan.kpiRestoration.addMissingTiles.length > 0) {
      steps.push({
        order: order++,
        type: 'kpi',
        targetFile: 'app/dashboard/page.tsx',
        description: 'Restore missing KPI tiles',
        changes: this.convertKPIRestorationsToCodeChanges(mainPlan.kpiRestoration),
        dependencies: [],
        confidence: this.calculateKPIConfidence(mainPlan.kpiRestoration)
      });
    }

    // Add styling restoration steps
    stylingCodemods.forEach(styleCodemod => {
      steps.push({
        order: order++,
        type: 'styling',
        targetFile: styleCodemod.targetFile,
        description: 'Apply styling fixes',
        changes: this.convertStylingChangesToCodeChanges(styleCodemod.changes),
        dependencies: [],
        confidence: styleCodemod.confidence
      });
    });

    // Add feature panel restoration steps
    featurePanelCodemods.forEach(panelCodemod => {
      steps.push({
        order: order++,
        type: 'feature_panel',
        targetFile: panelCodemod.targetFile,
        description: 'Restore feature panels',
        changes: this.convertFeaturePanelRestorationsToCodeChanges(panelCodemod),
        dependencies: [],
        confidence: panelCodemod.confidence
      });
    });

    return steps.sort((a, b) => a.order - b.order);
  }

  /**
   * Generate rollback plan
   */
  private generateRollbackPlan(executionPlan: ExecutionStep[]): RollbackStep[] {
    const rollbackSteps: RollbackStep[] = [];

    // Only create rollback steps if there are execution steps
    if (executionPlan.length === 0) {
      return rollbackSteps;
    }

    // Create rollback steps in reverse order
    const reversedSteps = [...executionPlan].reverse();
    
    reversedSteps.forEach((step, index) => {
      rollbackSteps.push({
        order: index + 1,
        targetFile: step.targetFile,
        action: 'revert_file',
        backupLocation: `${step.targetFile}.backup`,
        description: `Revert changes to ${step.targetFile}`
      });
    });

    return rollbackSteps;
  }

  /**
   * Convert styling changes to code changes
   */
  private convertStylingChangesToCodeChanges(changes: any[]): CodeChange[] {
    return changes.map(change => ({
      type: change.oldCode === '/* Missing token */' ? 'insert' : 'replace',
      location: change.location,
      oldCode: change.oldCode,
      newCode: change.newCode,
      description: change.description
    }));
  }

  /**
   * Convert KPI restorations to code changes
   */
  private convertKPIRestorationsToCodeChanges(restoration: KPITileRestoration): CodeChange[] {
    const changes: CodeChange[] = [];

    // Add missing tiles
    restoration.addMissingTiles.forEach(tile => {
      changes.push({
        type: 'insert',
        location: tile.insertionPoint,
        newCode: tile.generatedCode,
        description: `Add missing KPI tile: ${tile.tile.title}`
      });
    });

    // Update grid layout
    if (restoration.updateGridLayout.cssChanges) {
      changes.push({
        type: 'replace',
        location: 'grid-layout',
        oldCode: restoration.updateGridLayout.currentLayout,
        newCode: restoration.updateGridLayout.newLayout,
        description: 'Update grid layout for 9 tiles'
      });
    }

    return changes;
  }

  /**
   * Convert feature panel restorations to code changes
   */
  private convertFeaturePanelRestorationsToCodeChanges(codemod: FeaturePanelCodemod): CodeChange[] {
    const changes: CodeChange[] = [];

    // Add panel restorations
    codemod.restorations.forEach(restoration => {
      changes.push({
        type: 'insert',
        location: restoration.insertionPoint,
        newCode: restoration.generatedCode,
        description: `Restore feature panel: ${restoration.panel.title}`
      });
    });

    // Add empty states
    codemod.emptyStates.forEach(emptyState => {
      changes.push({
        type: 'insert',
        location: emptyState.panelId,
        newCode: emptyState.generatedCode,
        description: `Add empty state for: ${emptyState.component}`
      });
    });

    return changes;
  }

  /**
   * Calculate KPI confidence
   */
  private calculateKPIConfidence(restoration: KPITileRestoration): number {
    if (restoration.addMissingTiles.length === 0) return 1.0;

    const tileConfidences = restoration.addMissingTiles.map(tile => tile.confidence);
    return tileConfidences.reduce((sum, conf) => sum + conf, 0) / tileConfidences.length;
  }

  /**
   * Create empty codemod plan
   */
  private createEmptyCodemodPlan(): ComprehensiveCodemodPlan {
    return {
      kpiRestoration: {
        addMissingTiles: [],
        updateGridLayout: {
          targetFile: '',
          currentLayout: '',
          newLayout: '',
          cssChanges: '',
          confidence: 0
        },
        restoreDataWiring: []
      },
      stylingCodemods: [],
      featurePanelCodemods: [],
      overallConfidence: 0,
      safetyValidation: {
        typeScriptSafety: { status: 'fail', message: 'Error occurred', details: [] },
        dataLayerSafety: { status: 'fail', message: 'Error occurred', details: [] },
        newFeaturePreservation: { status: 'fail', message: 'Error occurred', details: [] },
        importValidation: { status: 'fail', message: 'Error occurred', details: [] },
        overallStatus: 'unsafe'
      },
      executionPlan: [],
      rollbackPlan: []
    };
  }

  /**
   * Validate rollback plan
   */
  async validateRollbackPlan(rollbackPlan: RollbackStep[]): Promise<{
    isValid: boolean;
    potentialIssues: string[];
  }> {
    const result = {
      isValid: true,
      potentialIssues: [] as string[]
    };

    try {
      // Validate each rollback step
      rollbackPlan.forEach(step => {
        // Check if backup location is valid
        if (!step.backupLocation || step.backupLocation === '') {
          result.potentialIssues.push(`Rollback step ${step.order}: Missing backup location`);
          result.isValid = false;
        }

        // Check if action is valid
        const validActions = ['revert_file', 'remove_additions', 'restore_original'];
        if (!validActions.includes(step.action)) {
          result.potentialIssues.push(`Rollback step ${step.order}: Invalid action ${step.action}`);
          result.isValid = false;
        }

        // Check if target file is specified
        if (!step.targetFile || step.targetFile === '') {
          result.potentialIssues.push(`Rollback step ${step.order}: Missing target file`);
          result.isValid = false;
        }
      });

      // Check for proper ordering
      const orders = rollbackPlan.map(step => step.order);
      const sortedOrders = [...orders].sort((a, b) => a - b);
      if (JSON.stringify(orders) !== JSON.stringify(sortedOrders)) {
        result.potentialIssues.push('Rollback steps are not properly ordered');
        result.isValid = false;
      }

    } catch (error) {
      result.isValid = false;
      result.potentialIssues.push(`Rollback validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Get all errors encountered during orchestration
   */
  getErrors(): AnalysisError[] {
    return [
      ...this.errors,
      ...this.codemodGenerator.getErrors(),
      ...this.stylingGenerator.getErrors(),
      ...this.featurePanelGenerator.getErrors()
    ];
  }

  /**
   * Clear accumulated errors
   */
  clearErrors(): void {
    this.errors = [];
    this.codemodGenerator.clearErrors();
    this.stylingGenerator.clearErrors();
    this.featurePanelGenerator.clearErrors();
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

// Supporting interfaces
export interface FileModification {
  file: string;
  modifications: ModificationSummary[];
  totalChanges: number;
  confidence: number;
  safetyLevel: 'safe' | 'warning' | 'unsafe';
}

export interface ModificationSummary {
  type: 'kpi' | 'styling' | 'feature_panel';
  description: string;
  changeCount: number;
  confidence: number;
}

export interface ExecutionTimeEstimate {
  estimatedSeconds: number;
  estimatedMinutes: number;
  breakdown: {
    cssChanges: number;
    kpiChanges: number;
    featurePanelChanges: number;
    totalFiles: number;
  };
}