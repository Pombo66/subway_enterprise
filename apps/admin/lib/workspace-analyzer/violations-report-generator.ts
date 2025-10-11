/**
 * Violations report generator for admin regression audit
 * Generates detailed reports with file:line → issue → proposed fix format
 */

import { AnalysisError } from './types';
import { RegressionReport } from './regression-detector';
import { CodemodPlan } from './codemod-generator';

// Report interfaces
export interface ViolationItem {
  id: string;
  file: string;
  line: number;
  column?: number;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  category: 'kpi' | 'styling' | 'component' | 'data';
  proposedFix: string;
  confidence: number;
  codeContext?: string;
  generatedCode?: string;
  requiresHumanReview: boolean;
}

export interface ViolationsReport {
  summary: {
    totalViolations: number;
    highConfidenceChanges: ViolationItem[];
    needsHumanReview: ViolationItem[];
    byCategory: {
      kpi: number;
      styling: number;
      component: number;
      data: number;
    };
    bySeverity: {
      high: number;
      medium: number;
      low: number;
    };
  };
  violations: ViolationItem[];
  metadata: {
    generatedAt: Date;
    analysisConfidence: number;
    targetScope: string;
    safetyChecks: string[];
  };
}

/**
 * Main violations report generator
 */
export class ViolationsReportGenerator {
  private errors: AnalysisError[] = [];
  private targetScope: string;
  private confidenceThreshold: number;

  constructor(targetScope: string = 'apps/admin', confidenceThreshold: number = 0.8) {
    this.targetScope = targetScope;
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * Generate comprehensive violations report from regression analysis and codemod plan
   */
  generateViolationsReport(
    regressionReport: RegressionReport,
    codemodPlan: CodemodPlan
  ): ViolationsReport {
    try {
      const violations: ViolationItem[] = [];

      // Generate KPI violations
      const kpiViolations = this.generateKPIViolations(
        regressionReport.kpiRegressions,
        codemodPlan.kpiRestoration
      );
      violations.push(...kpiViolations);

      // Generate styling violations
      const stylingViolations = this.generateStylingViolations(
        regressionReport.stylingRegressions,
        codemodPlan.stylingFixes
      );
      violations.push(...stylingViolations);

      // Generate component violations
      const componentViolations = this.generateComponentViolations(
        regressionReport.featureRegressions,
        codemodPlan.componentRestoration
      );
      violations.push(...componentViolations);

      // Separate high-confidence changes from needs-human-review
      const highConfidenceChanges = violations.filter(v => 
        v.confidence >= this.confidenceThreshold && !v.requiresHumanReview
      );
      const needsHumanReview = violations.filter(v => 
        v.confidence < this.confidenceThreshold || v.requiresHumanReview
      );

      // Generate summary
      const summary = this.generateSummary(violations, highConfidenceChanges, needsHumanReview);

      // Generate metadata
      const metadata = this.generateMetadata(regressionReport.confidence, codemodPlan.safetyChecks);

      return {
        summary,
        violations,
        metadata
      };
    } catch (error) {
      this.addError('parse_error', 'report-generation', `Failed to generate violations report: ${error}`);
      
      // Return empty report on error
      return this.createEmptyReport();
    }
  }

  /**
   * Generate KPI-related violations
   */
  private generateKPIViolations(
    kpiRegressions: any[],
    kpiRestoration: any
  ): ViolationItem[] {
    const violations: ViolationItem[] = [];

    kpiRegressions.forEach((regression, index) => {
      switch (regression.type) {
        case 'reduced_grid':
          violations.push({
            id: `kpi-reduced-grid-${index}`,
            file: 'app/dashboard/page.tsx',
            line: this.estimateKPIGridLine(),
            issue: `KPI grid reduced from ${regression.expectedTileCount} to ${regression.currentTileCount} tiles`,
            severity: 'high',
            category: 'kpi',
            proposedFix: `Restore ${regression.missingTiles.length} missing KPI tiles and update grid layout`,
            confidence: 0.9,
            codeContext: this.generateKPIGridContext(),
            generatedCode: this.generateKPIRestorationCode(regression.missingTiles),
            requiresHumanReview: regression.missingTiles.length > 4
          });
          break;

        case 'missing_tiles':
          regression.missingTiles.forEach((tile: any, tileIndex: number) => {
            violations.push({
              id: `kpi-missing-tile-${index}-${tileIndex}`,
              file: 'app/dashboard/page.tsx',
              line: this.estimateKPIGridLine() + tileIndex + 1,
              issue: `Missing KPI tile: ${tile.title}`,
              severity: 'high',
              category: 'kpi',
              proposedFix: `Add KPI tile for ${tile.title} with data binding to ${tile.dataSource || 'kpis.' + tile.id}`,
              confidence: tile.dataSource ? 0.85 : 0.65,
              generatedCode: this.generateSingleKPITileCode(tile),
              requiresHumanReview: !tile.dataSource
            });
          });
          break;

        case 'layout_change':
          violations.push({
            id: `kpi-layout-change-${index}`,
            file: 'app/dashboard/page.tsx',
            line: this.estimateKPIGridLine(),
            issue: `Grid layout changed from ${regression.gridLayoutChange.old} to ${regression.gridLayoutChange.current}`,
            severity: 'medium',
            category: 'kpi',
            proposedFix: `Update CSS grid layout to support proper tile arrangement`,
            confidence: 0.9,
            generatedCode: this.generateGridLayoutCode(regression.gridLayoutChange.old),
            requiresHumanReview: false
          });
          break;

        case 'data_binding_loss':
          regression.dataBindingIssues.forEach((issue: string, issueIndex: number) => {
            violations.push({
              id: `kpi-data-binding-${index}-${issueIndex}`,
              file: 'app/dashboard/page.tsx',
              line: this.estimateKPIGridLine() + issueIndex + 10,
              issue: `Data binding issue: ${issue}`,
              severity: 'high',
              category: 'data',
              proposedFix: `Restore data binding with safe fallback values`,
              confidence: 0.7,
              generatedCode: this.generateDataBindingCode(issue),
              requiresHumanReview: true
            });
          });
          break;
      }
    });

    return violations;
  }

  /**
   * Generate styling-related violations
   */
  private generateStylingViolations(
    stylingRegressions: any[],
    stylingFixes: any
  ): ViolationItem[] {
    const violations: ViolationItem[] = [];

    stylingRegressions.forEach((regression, index) => {
      switch (regression.type) {
        case 'missing_tokens':
          regression.missingTokens.forEach((token: any, tokenIndex: number) => {
            violations.push({
              id: `style-missing-token-${index}-${tokenIndex}`,
              file: 'app/styles/theme.css',
              line: this.estimateStyleTokenLine(token.name),
              issue: `Missing CSS custom property: ${token.name}`,
              severity: 'medium',
              category: 'styling',
              proposedFix: `Restore CSS custom property with value: ${token.value}`,
              confidence: 0.95,
              generatedCode: `  ${token.name}: ${token.value};`,
              requiresHumanReview: false
            });
          });
          break;

        case 'icon_overlap':
          regression.iconOverlaps.forEach((overlap: any, overlapIndex: number) => {
            violations.push({
              id: `style-icon-overlap-${index}-${overlapIndex}`,
              file: 'app/dashboard/page.tsx',
              line: this.estimateComponentLine(overlap.component),
              issue: `Icon alignment issue in ${overlap.component}: ${overlap.issue}`,
              severity: 'medium',
              category: 'styling',
              proposedFix: `Fix icon spacing from ${overlap.currentSpacing} to ${overlap.recommendedSpacing}`,
              confidence: 0.8,
              codeContext: this.generateIconContext(overlap.component),
              generatedCode: this.generateIconFixCode(overlap),
              requiresHumanReview: false
            });
          });
          break;

        case 'spacing_issues':
          regression.spacingIssues.forEach((issue: any, issueIndex: number) => {
            violations.push({
              id: `style-spacing-issue-${index}-${issueIndex}`,
              file: issue.element.startsWith('--') ? 'app/styles/theme.css' : 'app/dashboard/page.tsx',
              line: issue.element.startsWith('--') 
                ? this.estimateStyleTokenLine(issue.element)
                : this.estimateComponentLine(issue.element),
              issue: `Spacing issue in ${issue.element}: ${issue.issue}`,
              severity: 'medium',
              category: 'styling',
              proposedFix: `Update spacing from ${issue.currentValue} to ${issue.recommendedValue}`,
              confidence: 0.9,
              generatedCode: this.generateSpacingFixCode(issue),
              requiresHumanReview: false
            });
          });
          break;

        case 'removed_classes':
          regression.removedClasses.forEach((className: string, classIndex: number) => {
            violations.push({
              id: `style-removed-class-${index}-${classIndex}`,
              file: 'app/dashboard/page.tsx',
              line: this.estimateComponentLine(className),
              issue: `Removed CSS class: ${className}`,
              severity: 'low',
              category: 'styling',
              proposedFix: `Restore CSS class or equivalent styling token`,
              confidence: 0.7,
              generatedCode: this.generateClassRestorationCode(className),
              requiresHumanReview: true
            });
          });
          break;
      }
    });

    return violations;
  }

  /**
   * Generate component-related violations
   */
  private generateComponentViolations(
    featureRegressions: any[],
    componentRestoration: any
  ): ViolationItem[] {
    const violations: ViolationItem[] = [];

    featureRegressions.forEach((regression, index) => {
      switch (regression.type) {
        case 'lost_panels':
          regression.lostPanels.forEach((panel: any, panelIndex: number) => {
            violations.push({
              id: `component-lost-panel-${index}-${panelIndex}`,
              file: 'app/dashboard/page.tsx',
              line: this.estimateFeaturePanelLine(panel.title),
              issue: `Missing feature panel: ${panel.title}`,
              severity: 'high',
              category: 'component',
              proposedFix: `Restore feature panel with ${panel.contentType} content and data bindings`,
              confidence: panel.dataBinding.length > 0 ? 0.75 : 0.55,
              generatedCode: this.generateFeaturePanelCode(panel),
              requiresHumanReview: panel.dataBinding.length === 0
            });
          });
          break;

        case 'degraded_functionality':
          regression.degradedComponents.forEach((component: any, compIndex: number) => {
            violations.push({
              id: `component-degraded-${index}-${compIndex}`,
              file: 'app/dashboard/page.tsx',
              line: this.estimateComponentLine(component.component),
              issue: `Degraded component functionality: ${component.issue}`,
              severity: 'medium',
              category: 'component',
              proposedFix: `Restore component functionality: ${component.impact}`,
              confidence: 0.6,
              generatedCode: this.generateComponentRestorationCode(component),
              requiresHumanReview: true
            });
          });
          break;

        case 'missing_empty_states':
          regression.missingEmptyStates.forEach((component: string, stateIndex: number) => {
            violations.push({
              id: `component-empty-state-${index}-${stateIndex}`,
              file: 'app/dashboard/page.tsx',
              line: this.estimateComponentLine(component),
              issue: `Missing empty state for component: ${component}`,
              severity: 'low',
              category: 'component',
              proposedFix: `Add graceful empty state handling`,
              confidence: 0.9,
              generatedCode: this.generateEmptyStateCode(component),
              requiresHumanReview: false
            });
          });
          break;

        case 'data_incompatibility':
          regression.dataCompatibilityIssues.forEach((issue: string, issueIndex: number) => {
            violations.push({
              id: `component-data-incompatibility-${index}-${issueIndex}`,
              file: 'app/dashboard/page.tsx',
              line: this.estimateDataBindingLine(issue),
              issue: `Data layer compatibility issue: ${issue}`,
              severity: 'high',
              category: 'data',
              proposedFix: `Resolve data layer compatibility with safe fallbacks`,
              confidence: 0.5,
              generatedCode: this.generateDataCompatibilityCode(issue),
              requiresHumanReview: true
            });
          });
          break;
      }
    });

    return violations;
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(
    violations: ViolationItem[],
    highConfidenceChanges: ViolationItem[],
    needsHumanReview: ViolationItem[]
  ) {
    const byCategory = {
      kpi: violations.filter(v => v.category === 'kpi').length,
      styling: violations.filter(v => v.category === 'styling').length,
      component: violations.filter(v => v.category === 'component').length,
      data: violations.filter(v => v.category === 'data').length
    };

    const bySeverity = {
      high: violations.filter(v => v.severity === 'high').length,
      medium: violations.filter(v => v.severity === 'medium').length,
      low: violations.filter(v => v.severity === 'low').length
    };

    return {
      totalViolations: violations.length,
      highConfidenceChanges,
      needsHumanReview,
      byCategory,
      bySeverity
    };
  }

  /**
   * Generate report metadata
   */
  private generateMetadata(analysisConfidence: number, safetyChecks: any[]) {
    return {
      generatedAt: new Date(),
      analysisConfidence,
      targetScope: this.targetScope,
      safetyChecks: safetyChecks.map(check => `${check.type}: ${check.status}`)
    };
  }

  /**
   * Create empty report for error cases
   */
  private createEmptyReport(): ViolationsReport {
    return {
      summary: {
        totalViolations: 0,
        highConfidenceChanges: [],
        needsHumanReview: [],
        byCategory: { kpi: 0, styling: 0, component: 0, data: 0 },
        bySeverity: { high: 0, medium: 0, low: 0 }
      },
      violations: [],
      metadata: {
        generatedAt: new Date(),
        analysisConfidence: 0,
        targetScope: this.targetScope,
        safetyChecks: []
      }
    };
  }

  // Code generation helper methods

  private generateKPIRestorationCode(missingTiles: any[]): string {
    return missingTiles.map(tile => `
      {/* Restored KPI Tile: ${tile.title} */}
      <div className="s-card s-cardAccent">
        <div className="s-blob s-blobGreen">
          ${tile.iconSvg || this.getDefaultIcon()}
        </div>
        <div className="s-cardContent">
          <div className="s-k">${tile.title}</div>
          <div className="s-v">{kpis?.${tile.dataSource || tile.id} ?? "—"}</div>
        </div>
      </div>`).join('\n');
  }

  private generateSingleKPITileCode(tile: any): string {
    return `
      {/* Restored KPI Tile: ${tile.title} */}
      <div className="s-card s-cardAccent">
        <div className="s-blob s-blobGreen">
          ${tile.iconSvg || this.getDefaultIcon()}
        </div>
        <div className="s-cardContent">
          <div className="s-k">${tile.title}</div>
          <div className="s-v">{kpis?.${tile.dataSource || tile.id} ?? "—"}</div>
        </div>
      </div>`;
  }

  private generateGridLayoutCode(oldLayout: string): string {
    return `
      {/* Updated grid layout for restored tiles */}
      <div className="grid grid-cols-3 gap-3 md:grid-cols-3 lg:grid-cols-3">
        {/* KPI tiles will be rendered here */}
      </div>`;
  }

  private generateDataBindingCode(issue: string): string {
    const variable = this.extractVariableFromIssue(issue);
    return `
      // Restored data binding with fallback
      const ${variable} = useMemo(() => {
        return kpis?.${variable} ?? "—";
      }, [kpis?.${variable}]);`;
  }

  private generateIconFixCode(overlap: any): string {
    return `
      {/* Fixed icon alignment for ${overlap.component} */}
      <div className="s-blob s-blobGreen">
        {/* Icon content */}
      </div>`;
  }

  private generateSpacingFixCode(issue: any): string {
    if (issue.element.startsWith('--')) {
      return `  ${issue.element}: ${issue.recommendedValue};`;
    } else {
      return `className="${issue.element} gap-3"`;
    }
  }

  private generateClassRestorationCode(className: string): string {
    return `className="${className}"`;
  }

  private generateFeaturePanelCode(panel: any): string {
    return `
      {/* Restored Feature Panel: ${panel.title} */}
      <div className="s-panelCard">
        <div className="s-panelT">${panel.title}</div>
        <div className="s-panelContent">
          {/* Panel content based on ${panel.contentType} */}
        </div>
      </div>`;
  }

  private generateComponentRestorationCode(component: any): string {
    return `
      {/* Restored component functionality for ${component.component} */}
      {/* Fix: ${component.impact} */}`;
  }

  private generateEmptyStateCode(component: string): string {
    return `
      {/* Empty state for ${component} */}
      {(!${component.toLowerCase()}Data || ${component.toLowerCase()}Data.length === 0) && (
        <div className="s-empty">
          <div className="s-emptyText">No ${component.toLowerCase()} available</div>
        </div>
      )}`;
  }

  private generateDataCompatibilityCode(issue: string): string {
    return `
      // Data compatibility fix for: ${issue}
      // TODO: Implement proper data layer integration`;
  }

  // Line estimation helper methods

  private estimateKPIGridLine(): number {
    return 45; // Estimated line number for KPI grid in dashboard
  }

  private estimateStyleTokenLine(tokenName: string): number {
    // Estimate line based on token type
    if (tokenName.includes('color')) return 10;
    if (tokenName.includes('spacing') || tokenName.includes('gap')) return 25;
    if (tokenName.includes('radius')) return 35;
    if (tokenName.includes('shadow')) return 40;
    return 50;
  }

  private estimateComponentLine(component: string): number {
    // Estimate line based on component type
    const componentLineMap: Record<string, number> = {
      'kpi': 45,
      'panel': 80,
      'chart': 120,
      'table': 150,
      'button': 200
    };

    for (const [key, line] of Object.entries(componentLineMap)) {
      if (component.toLowerCase().includes(key)) {
        return line;
      }
    }

    return 100; // Default estimate
  }

  private estimateFeaturePanelLine(title: string): number {
    // Estimate based on panel title
    const panelLineMap: Record<string, number> = {
      'recent': 80,
      'orders': 100,
      'analytics': 120,
      'users': 140,
      'settings': 160
    };

    for (const [key, line] of Object.entries(panelLineMap)) {
      if (title.toLowerCase().includes(key)) {
        return line;
      }
    }

    return 90; // Default estimate
  }

  private estimateDataBindingLine(issue: string): number {
    return 30; // Estimated line for data binding declarations
  }

  // Utility helper methods

  private generateKPIGridContext(): string {
    return `
      <div className="grid grid-cols-4 gap-3 md:grid-cols-4 lg:grid-cols-4">
        {/* Current KPI tiles */}
      </div>`;
  }

  private generateIconContext(component: string): string {
    return `
      <div className="icon-container">
        {/* ${component} icon */}
      </div>`;
  }

  private getDefaultIcon(): string {
    return `
      <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      </svg>`;
  }

  private extractVariableFromIssue(issue: string): string {
    // Extract variable name from issue description
    const match = issue.match(/kpis\.(\w+)/);
    return match ? match[1] : 'unknownVariable';
  }

  /**
   * Get all errors encountered during report generation
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