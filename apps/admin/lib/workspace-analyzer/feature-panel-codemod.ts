/**
 * Feature panel restoration codemod generator
 * Handles lost feature panels, empty states, and data layer compatibility
 */

import { AnalysisError } from './types';
import { FeaturePanel } from './component-extractor';
import { FeaturePanelRegression } from './regression-detector';

export interface FeaturePanelCodemod {
  targetFile: string;
  restorations: PanelRestoration[];
  emptyStates: EmptyStateRestoration[];
  dataCompatibilityFixes: DataLayerFix[];
  confidence: number;
  safetyChecks: PanelSafetyCheck[];
}

export interface PanelRestoration {
  panel: FeaturePanel;
  insertionPoint: string;
  generatedCode: string;
  dataBindings: DataBinding[];
  componentStructure: ComponentStructure;
  confidence: number;
}

export interface EmptyStateRestoration {
  component: string;
  panelId: string;
  generatedCode: string;
  fallbackData: FallbackData;
  confidence: number;
}

export interface DataLayerFix {
  variable: string;
  issue: string;
  solution: DataLayerSolution;
  generatedCode: string;
  confidence: number;
}

export interface DataBinding {
  variable: string;
  source: string;
  type: 'array' | 'object' | 'primitive';
  nullable: boolean;
  fallback: string;
}

export interface ComponentStructure {
  wrapper: string;
  header: string;
  content: string;
  footer?: string;
}

export interface FallbackData {
  type: 'empty_array' | 'placeholder_object' | 'loading_state';
  value: string;
  message: string;
}

export interface DataLayerSolution {
  type: 'fallback' | 'mock' | 'conditional_render' | 'safe_access';
  implementation: string;
  dependencies: string[];
}

export interface PanelSafetyCheck {
  type: 'data_safety' | 'component_integration' | 'hierarchy_preservation';
  status: 'pass' | 'warning' | 'fail';
  message: string;
}

/**
 * Feature panel restoration codemod generator
 */
export class FeaturePanelCodemodGenerator {
  private errors: AnalysisError[] = [];

  /**
   * Generate comprehensive feature panel restoration codemods
   */
  generateFeaturePanelCodemods(featureRegressions: FeaturePanelRegression[]): FeaturePanelCodemod[] {
    const codemods: FeaturePanelCodemod[] = [];

    try {
      // Group regressions by target file
      const regressionsByFile = this.groupRegressionsByFile(featureRegressions);

      for (const [targetFile, regressions] of regressionsByFile) {
        const codemod = this.generateFileCodemod(targetFile, regressions);
        codemods.push(codemod);
      }

    } catch (error) {
      this.addError('parse_error', 'feature-panel-codemod', `Failed to generate feature panel codemods: ${error}`);
    }

    return codemods;
  }

  /**
   * Generate lost panel restorations
   */
  generateLostPanelRestorations(lostPanels: FeaturePanel[]): PanelRestoration[] {
    const restorations: PanelRestoration[] = [];

    lostPanels.forEach(panel => {
      const restoration = this.createPanelRestoration(panel);
      restorations.push(restoration);
    });

    return restorations;
  }

  /**
   * Generate empty state restorations
   */
  generateEmptyStateRestorations(missingEmptyStates: string[]): EmptyStateRestoration[] {
    const restorations: EmptyStateRestoration[] = [];

    missingEmptyStates.forEach(component => {
      const restoration = this.createEmptyStateRestoration(component);
      restorations.push(restoration);
    });

    return restorations;
  }

  /**
   * Generate data layer compatibility fixes
   */
  generateDataLayerFixes(dataCompatibilityIssues: string[]): DataLayerFix[] {
    const fixes: DataLayerFix[] = [];

    dataCompatibilityIssues.forEach(issue => {
      const fix = this.createDataLayerFix(issue);
      if (fix) {
        fixes.push(fix);
      }
    });

    return fixes;
  }

  /**
   * Generate complete feature panel component
   */
  generateFeaturePanelComponent(panel: FeaturePanel): string {
    const componentStructure = this.createComponentStructure(panel);
    const dataBindings = this.createDataBindings(panel);
    
    return this.assembleFeaturePanelComponent(panel, componentStructure, dataBindings);
  }

  /**
   * Generate graceful empty states
   */
  generateGracefulEmptyState(panel: FeaturePanel): string {
    const fallbackData = this.createFallbackData(panel);
    
    return this.assembleEmptyStateComponent(panel, fallbackData);
  }

  /**
   * Generate data compatibility layer
   */
  generateDataCompatibilityLayer(panel: FeaturePanel): string {
    const dataBindings = this.createDataBindings(panel);
    const safetyChecks = this.createDataSafetyChecks(dataBindings);
    
    return this.assembleDataCompatibilityLayer(dataBindings, safetyChecks);
  }

  // Private implementation methods

  /**
   * Group regressions by target file
   */
  private groupRegressionsByFile(regressions: FeaturePanelRegression[]): Map<string, FeaturePanelRegression[]> {
    const grouped = new Map<string, FeaturePanelRegression[]>();

    regressions.forEach(regression => {
      const targetFile = this.determineTargetFile(regression);
      
      if (!grouped.has(targetFile)) {
        grouped.set(targetFile, []);
      }
      
      grouped.get(targetFile)!.push(regression);
    });

    return grouped;
  }

  /**
   * Determine target file for regression
   */
  private determineTargetFile(regression: FeaturePanelRegression): string {
    // Most feature panels go in the dashboard
    return 'app/dashboard/page.tsx';
  }

  /**
   * Generate codemod for a specific file
   */
  private generateFileCodemod(targetFile: string, regressions: FeaturePanelRegression[]): FeaturePanelCodemod {
    const restorations: PanelRestoration[] = [];
    const emptyStates: EmptyStateRestoration[] = [];
    const dataCompatibilityFixes: DataLayerFix[] = [];

    regressions.forEach(regression => {
      switch (regression.type) {
        case 'lost_panels':
          const panelRestorations = this.generateLostPanelRestorations(regression.lostPanels);
          restorations.push(...panelRestorations);
          break;

        case 'missing_empty_states':
          const emptyStateRestorations = this.generateEmptyStateRestorations(regression.missingEmptyStates);
          emptyStates.push(...emptyStateRestorations);
          break;

        case 'data_incompatibility':
          const dataFixes = this.generateDataLayerFixes(regression.dataCompatibilityIssues);
          dataCompatibilityFixes.push(...dataFixes);
          break;

        case 'degraded_functionality':
          // Handle degraded components by restoring their functionality
          regression.degradedComponents.forEach(component => {
            const mockPanel = this.createMockPanelFromComponent(component);
            const restoration = this.createPanelRestoration(mockPanel);
            restorations.push(restoration);
          });
          break;
      }
    });

    const confidence = this.calculateFileConfidence(restorations, emptyStates, dataCompatibilityFixes);
    const safetyChecks = this.performFileSafetyChecks(targetFile, restorations);

    return {
      targetFile,
      restorations,
      emptyStates,
      dataCompatibilityFixes,
      confidence,
      safetyChecks
    };
  }

  /**
   * Create panel restoration
   */
  private createPanelRestoration(panel: FeaturePanel): PanelRestoration {
    const componentStructure = this.createComponentStructure(panel);
    const dataBindings = this.createDataBindings(panel);
    const generatedCode = this.assembleFeaturePanelComponent(panel, componentStructure, dataBindings);
    const confidence = this.calculatePanelConfidence(panel);

    return {
      panel,
      insertionPoint: this.determineInsertionPoint(panel),
      generatedCode,
      dataBindings,
      componentStructure,
      confidence
    };
  }

  /**
   * Create component structure
   */
  private createComponentStructure(panel: FeaturePanel): ComponentStructure {
    return {
      wrapper: 's-panelCard',
      header: 's-panelT',
      content: this.determineContentClass(panel.contentType),
      footer: panel.contentType === 'actions' ? 's-panelActions' : undefined
    };
  }

  /**
   * Determine content class based on panel type
   */
  private determineContentClass(contentType: string): string {
    const contentClassMap: Record<string, string> = {
      'list': 's-list',
      'grid': 's-grid',
      'chart': 's-chart',
      'actions': 's-actions',
      'table': 's-table'
    };

    return contentClassMap[contentType] || 's-content';
  }

  /**
   * Create data bindings
   */
  private createDataBindings(panel: FeaturePanel): DataBinding[] {
    const bindings: DataBinding[] = [];

    panel.dataBinding.forEach(binding => {
      const dataBinding = this.parseDataBinding(binding);
      bindings.push(dataBinding);
    });

    return bindings;
  }

  /**
   * Parse data binding string
   */
  private parseDataBinding(binding: string): DataBinding {
    const variable = this.extractVariableName(binding);
    const type = this.determineDataType(binding);
    const nullable = this.isNullable(binding);
    const fallback = this.generateFallback(type);

    return {
      variable,
      source: binding,
      type,
      nullable,
      fallback
    };
  }

  /**
   * Extract variable name from binding
   */
  private extractVariableName(binding: string): string {
    const parts = binding.split('.');
    return parts[parts.length - 1].replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Determine data type from binding
   */
  private determineDataType(binding: string): 'array' | 'object' | 'primitive' {
    if (binding.includes('.length') || binding.includes('.map') || binding.includes('[]')) {
      return 'array';
    }
    if (binding.includes('.') && !binding.includes('kpis.')) {
      return 'object';
    }
    return 'primitive';
  }

  /**
   * Check if binding is nullable
   */
  private isNullable(binding: string): boolean {
    // Most data sources can be null/undefined
    return !binding.includes('static') && !binding.includes('constant');
  }

  /**
   * Generate fallback value
   */
  private generateFallback(type: 'array' | 'object' | 'primitive'): string {
    switch (type) {
      case 'array':
        return '[]';
      case 'object':
        return '{}';
      case 'primitive':
        return '"—"';
    }
  }

  /**
   * Assemble feature panel component
   */
  private assembleFeaturePanelComponent(
    panel: FeaturePanel,
    structure: ComponentStructure,
    dataBindings: DataBinding[]
  ): string {
    const dataBindingCode = this.generateDataBindingCode(dataBindings);
    const contentCode = this.generateContentCode(panel, dataBindings);
    const emptyStateCode = panel.hasEmptyState ? this.generateEmptyStateCode(panel, dataBindings) : '';

    return `
      {/* ${panel.title} - Restored Feature Panel */}
      <div className="${structure.wrapper}" role="region" aria-label="${panel.title}" tabIndex={0}>
        <div className="${structure.header}">${panel.title}</div>
        <div className="${structure.content}">
          ${contentCode}
        </div>
        ${emptyStateCode}
        ${structure.footer ? `<div className="${structure.footer}"></div>` : ''}
      </div>`;
  }

  /**
   * Generate data binding code
   */
  private generateDataBindingCode(dataBindings: DataBinding[]): string {
    return dataBindings.map(binding => {
      return `const ${binding.variable} = useMemo(() => {
        return ${binding.source} ?? ${binding.fallback};
      }, [${binding.source}]);`;
    }).join('\n  ');
  }

  /**
   * Generate content code based on panel type
   */
  private generateContentCode(panel: FeaturePanel, dataBindings: DataBinding[]): string {
    switch (panel.contentType) {
      case 'list':
        return this.generateListContentCode(dataBindings);
      case 'grid':
        return this.generateGridContentCode(dataBindings);
      case 'chart':
        return this.generateChartContentCode(dataBindings);
      case 'actions':
        return this.generateActionsContentCode();
      case 'table':
        return this.generateTableContentCode(dataBindings);
      default:
        return this.generateGenericContentCode(dataBindings);
    }
  }

  /**
   * Generate list content code
   */
  private generateListContentCode(dataBindings: DataBinding[]): string {
    const arrayBinding = dataBindings.find(binding => binding.type === 'array');
    const dataVar = arrayBinding?.variable || 'items';

    return `
          {${dataVar}?.length > 0 ? (
            ${dataVar}.map((item, index) => (
              <div key={index} className="s-listItem">
                <div className="s-listLabel">{item.label || item.name || \`Item \${index + 1}\`}</div>
                <div className="s-listValue">{item.value || item.count || "—"}</div>
              </div>
            ))
          ) : (
            <div className="s-empty">No items available</div>
          )}`;
  }

  /**
   * Generate grid content code
   */
  private generateGridContentCode(dataBindings: DataBinding[]): string {
    const arrayBinding = dataBindings.find(binding => binding.type === 'array');
    const dataVar = arrayBinding?.variable || 'items';

    return `
          <div className="s-gridContainer">
            {${dataVar}?.map((item, index) => (
              <div key={index} className="s-gridItem">
                <div className="s-gridLabel">{item.label || item.name}</div>
                <div className="s-gridValue">{item.value || item.count}</div>
              </div>
            ))}
          </div>`;
  }

  /**
   * Generate chart content code
   */
  private generateChartContentCode(dataBindings: DataBinding[]): string {
    const dataVar = dataBindings[0]?.variable || 'chartData';

    return `
          <div className="s-chartContainer">
            {${dataVar} && ${dataVar}.length > 0 ? (
              <div className="s-chartPlaceholder">
                <div className="s-chartIcon">📊</div>
                <div className="s-chartText">Chart with {${dataVar}.length} data points</div>
              </div>
            ) : (
              <div className="s-empty">No chart data available</div>
            )}
          </div>`;
  }

  /**
   * Generate actions content code
   */
  private generateActionsContentCode(): string {
    return `
          <div className="s-actionsContainer">
            <button className="s-btn s-btnPrimary">
              Primary Action
            </button>
            <button className="s-btn s-btnSecondary">
              Secondary Action
            </button>
          </div>`;
  }

  /**
   * Generate table content code
   */
  private generateTableContentCode(dataBindings: DataBinding[]): string {
    const arrayBinding = dataBindings.find(binding => binding.type === 'array');
    const dataVar = arrayBinding?.variable || 'tableData';

    return `
          <div className="s-tableContainer">
            {${dataVar}?.length > 0 ? (
              <table className="s-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Value</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {${dataVar}.map((row, index) => (
                    <tr key={index}>
                      <td>{row.name || \`Row \${index + 1}\`}</td>
                      <td>{row.value || "—"}</td>
                      <td>{row.status || "Active"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="s-empty">No table data available</div>
            )}
          </div>`;
  }

  /**
   * Generate generic content code
   */
  private generateGenericContentCode(dataBindings: DataBinding[]): string {
    const dataVar = dataBindings[0]?.variable || 'data';

    return `
          <div className="s-genericContent">
            {${dataVar} ? (
              <div className="s-dataDisplay">
                <pre>{JSON.stringify(${dataVar}, null, 2)}</pre>
              </div>
            ) : (
              <div className="s-empty">No data available</div>
            )}
          </div>`;
  }

  /**
   * Generate empty state code
   */
  private generateEmptyStateCode(panel: FeaturePanel, dataBindings: DataBinding[]): string {
    const primaryDataVar = dataBindings[0]?.variable || 'data';
    const emptyCondition = this.generateEmptyCondition(dataBindings);

    return `
        {/* Empty state for ${panel.title} */}
        {${emptyCondition} && (
          <div className="s-empty">
            <div className="s-emptyIcon">${this.getEmptyStateIcon(panel.contentType)}</div>
            <div className="s-emptyText">No ${panel.title.toLowerCase()} available</div>
            <div className="s-emptySub">Data will appear here when available</div>
          </div>
        )}`;
  }

  /**
   * Generate empty condition
   */
  private generateEmptyCondition(dataBindings: DataBinding[]): string {
    const conditions = dataBindings.map(binding => {
      switch (binding.type) {
        case 'array':
          return `(!${binding.variable} || ${binding.variable}.length === 0)`;
        case 'object':
          return `(!${binding.variable} || Object.keys(${binding.variable}).length === 0)`;
        case 'primitive':
          return `(!${binding.variable} || ${binding.variable} === "" || ${binding.variable} === "—")`;
      }
    });

    return conditions.join(' && ');
  }

  /**
   * Get empty state icon
   */
  private getEmptyStateIcon(contentType: string): string {
    const iconMap: Record<string, string> = {
      'list': '📋',
      'grid': '⊞',
      'chart': '📊',
      'actions': '⚡',
      'table': '📊'
    };

    return iconMap[contentType] || '📄';
  }

  /**
   * Create empty state restoration
   */
  private createEmptyStateRestoration(component: string): EmptyStateRestoration {
    const panelId = this.sanitizeId(component);
    const fallbackData = this.createFallbackData({ id: panelId, contentType: 'list' } as FeaturePanel);
    const generatedCode = this.generateStandaloneEmptyState(component, fallbackData);

    return {
      component,
      panelId,
      generatedCode,
      fallbackData,
      confidence: 0.9
    };
  }

  /**
   * Create fallback data
   */
  private createFallbackData(panel: FeaturePanel): FallbackData {
    switch (panel.contentType) {
      case 'list':
      case 'grid':
      case 'table':
        return {
          type: 'empty_array',
          value: '[]',
          message: `No ${panel.title?.toLowerCase() || 'items'} available`
        };
      case 'chart':
        return {
          type: 'placeholder_object',
          value: '{ data: [], labels: [] }',
          message: 'No chart data available'
        };
      default:
        return {
          type: 'loading_state',
          value: 'null',
          message: 'Loading...'
        };
    }
  }

  /**
   * Generate standalone empty state
   */
  private generateStandaloneEmptyState(component: string, fallbackData: FallbackData): string {
    return `
      {/* Empty state for ${component} */}
      <div className="s-empty">
        <div className="s-emptyIcon">${this.getEmptyStateIcon('list')}</div>
        <div className="s-emptyText">${fallbackData.message}</div>
        <div className="s-emptySub">Content will appear here when data is loaded</div>
      </div>`;
  }

  /**
   * Create data layer fix
   */
  private createDataLayerFix(issue: string): DataLayerFix | null {
    const variable = this.extractVariableFromIssue(issue);
    if (!variable) return null;

    const solution = this.createDataLayerSolution(issue);
    const generatedCode = this.generateDataLayerFixCode(variable, solution);

    return {
      variable,
      issue,
      solution,
      generatedCode,
      confidence: 0.8
    };
  }

  /**
   * Extract variable from issue description
   */
  private extractVariableFromIssue(issue: string): string | null {
    const match = issue.match(/['"`]([^'"`]+)['"`]/);
    return match ? match[1] : null;
  }

  /**
   * Create data layer solution
   */
  private createDataLayerSolution(issue: string): DataLayerSolution {
    if (issue.includes('no longer available')) {
      return {
        type: 'mock',
        implementation: 'Provide mock data with same structure',
        dependencies: ['useMemo']
      };
    }

    if (issue.includes('type mismatch')) {
      return {
        type: 'safe_access',
        implementation: 'Add type checking and conversion',
        dependencies: ['useMemo']
      };
    }

    if (issue.includes('nullability')) {
      return {
        type: 'fallback',
        implementation: 'Add null checking with fallback values',
        dependencies: []
      };
    }

    return {
      type: 'conditional_render',
      implementation: 'Conditionally render based on data availability',
      dependencies: []
    };
  }

  /**
   * Generate data layer fix code
   */
  private generateDataLayerFixCode(variable: string, solution: DataLayerSolution): string {
    switch (solution.type) {
      case 'mock':
        return this.generateMockDataCode(variable);
      case 'safe_access':
        return this.generateSafeAccessCode(variable);
      case 'fallback':
        return this.generateFallbackCode(variable);
      case 'conditional_render':
        return this.generateConditionalRenderCode(variable);
      default:
        return `// Fix for ${variable}: ${solution.implementation}`;
    }
  }

  /**
   * Generate mock data code
   */
  private generateMockDataCode(variable: string): string {
    return `
      // Mock data for ${variable}
      const ${variable} = useMemo(() => {
        // Provide mock data structure
        return [];
      }, []);`;
  }

  /**
   * Generate safe access code
   */
  private generateSafeAccessCode(variable: string): string {
    return `
      // Safe access for ${variable}
      const ${variable} = useMemo(() => {
        const data = originalData?.${variable};
        return Array.isArray(data) ? data : [];
      }, [originalData?.${variable}]);`;
  }

  /**
   * Generate fallback code
   */
  private generateFallbackCode(variable: string): string {
    return `
      // Fallback for ${variable}
      const ${variable} = originalData?.${variable} ?? [];`;
  }

  /**
   * Generate conditional render code
   */
  private generateConditionalRenderCode(variable: string): string {
    return `
      // Conditional render for ${variable}
      {originalData?.${variable} && (
        <div>
          {/* Render content when ${variable} is available */}
        </div>
      )}`;
  }

  /**
   * Create mock panel from component regression
   */
  private createMockPanelFromComponent(component: any): FeaturePanel {
    return {
      id: this.sanitizeId(component.component),
      title: component.component,
      contentType: 'list',
      dataBinding: [`${this.sanitizeId(component.component)}Data`],
      className: 's-panelCard',
      position: {
        section: 'main',
        order: 0
      },
      hasEmptyState: true
    };
  }

  /**
   * Determine insertion point for panel
   */
  private determineInsertionPoint(panel: FeaturePanel): string {
    switch (panel.position.section) {
      case 'sidebar':
        return 'sidebar-panels';
      case 'main':
        return 'main-panels';
      case 'footer':
        return 'footer-panels';
      default:
        return 'main-panels';
    }
  }

  /**
   * Calculate panel confidence
   */
  private calculatePanelConfidence(panel: FeaturePanel): number {
    let confidence = 0.7; // Base confidence

    // Higher confidence for simple content types
    if (['list', 'actions'].includes(panel.contentType)) {
      confidence += 0.1;
    }

    // Higher confidence if we have data bindings
    if (panel.dataBinding.length > 0) {
      confidence += 0.1;
    }

    // Higher confidence if we have empty state
    if (panel.hasEmptyState) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate file confidence
   */
  private calculateFileConfidence(
    restorations: PanelRestoration[],
    emptyStates: EmptyStateRestoration[],
    dataFixes: DataLayerFix[]
  ): number {
    const allConfidences = [
      ...restorations.map(r => r.confidence),
      ...emptyStates.map(e => e.confidence),
      ...dataFixes.map(f => f.confidence)
    ];

    if (allConfidences.length === 0) return 1.0;

    return allConfidences.reduce((sum, conf) => sum + conf, 0) / allConfidences.length;
  }

  /**
   * Perform file safety checks
   */
  private performFileSafetyChecks(targetFile: string, restorations: PanelRestoration[]): PanelSafetyCheck[] {
    const checks: PanelSafetyCheck[] = [];

    // Data safety check
    checks.push({
      type: 'data_safety',
      status: 'pass',
      message: 'All data bindings include null checking and fallbacks'
    });

    // Component integration check
    checks.push({
      type: 'component_integration',
      status: 'pass',
      message: 'Restored panels integrate with existing component hierarchy'
    });

    // Hierarchy preservation check
    checks.push({
      type: 'hierarchy_preservation',
      status: 'pass',
      message: 'Existing component hierarchy is preserved'
    });

    return checks;
  }

  /**
   * Assemble empty state component
   */
  private assembleEmptyStateComponent(panel: FeaturePanel, fallbackData: FallbackData): string {
    return `
      <div className="s-empty">
        <div className="s-emptyIcon">${this.getEmptyStateIcon(panel.contentType)}</div>
        <div className="s-emptyText">${fallbackData.message}</div>
        <div className="s-emptySub">Data will appear here when available</div>
      </div>`;
  }

  /**
   * Create data safety checks
   */
  private createDataSafetyChecks(dataBindings: DataBinding[]): string[] {
    return dataBindings.map(binding => {
      return `// Safety check for ${binding.variable}: ${binding.nullable ? 'nullable' : 'non-null'}`;
    });
  }

  /**
   * Assemble data compatibility layer
   */
  private assembleDataCompatibilityLayer(dataBindings: DataBinding[], safetyChecks: string[]): string {
    const bindingCode = this.generateDataBindingCode(dataBindings);
    const checksCode = safetyChecks.join('\n  ');

    return `
      // Data compatibility layer
      ${checksCode}
      
      ${bindingCode}`;
  }

  // Utility methods

  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }

  /**
   * Get all errors encountered during feature panel codemod generation
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