/**
 * Feature panel detection system for identifying panels and their structures
 */

import { promises as fs } from 'fs';
import path from 'path';
import { AnalysisError } from './types';
import { FeaturePanel } from './component-extractor';

export interface PanelHierarchy {
  parent: string;
  children: FeaturePanel[];
  layout: 'grid' | 'flex' | 'stack';
  responsive: boolean;
}

export interface DataBindingPattern {
  variable: string;
  source: string;
  type: 'array' | 'object' | 'primitive';
  nullable: boolean;
  fallback?: string;
}

export interface ComponentRelationship {
  component: string;
  dependsOn: string[];
  provides: string[];
  dataFlow: DataBindingPattern[];
}

export interface FeaturePanelAnalysis {
  panels: FeaturePanel[];
  hierarchy: PanelHierarchy[];
  relationships: ComponentRelationship[];
  dataBindings: DataBindingPattern[];
  missingPanels: string[];
  degradedComponents: string[];
}

/**
 * Feature panel detection and analysis system
 */
export class FeaturePanelDetector {
  private errors: AnalysisError[] = [];

  /**
   * Parse React components to identify feature panels and their structures
   */
  detectFeaturePanels(content: string, filePath: string): FeaturePanel[] {
    const panels: FeaturePanel[] = [];

    try {
      // Detect different types of panel sections
      const panelSections = this.identifyPanelSections(content);
      
      for (const section of panelSections) {
        const sectionPanels = this.extractPanelsFromSection(content, section);
        panels.push(...sectionPanels);
      }

    } catch (error) {
      this.addError('parse_error', filePath, `Failed to detect feature panels: ${error}`);
    }

    return panels;
  }

  /**
   * Extract panel titles, content types, and data binding patterns
   */
  extractPanelMetadata(panelContent: string, panelId: string): {
    title: string;
    contentType: FeaturePanel['contentType'];
    dataBindings: string[];
    hasEmptyState: boolean;
  } {
    // Extract title from various possible patterns
    let title = '';
    const titlePatterns = [
      /<p className="s-panelT">([^<]+)<\/p>/, // Standard panel title
      /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/, // Heading elements
      /<div[^>]*title[^>]*>([^<]+)<\/div>/, // Title attribute
    ];

    for (const pattern of titlePatterns) {
      const match = panelContent.match(pattern);
      if (match) {
        title = match[1].trim();
        break;
      }
    }

    // Determine content type based on structure
    const contentType = this.determineContentType(panelContent);

    // Extract data bindings
    const dataBindings = this.extractDataBindings(panelContent);

    // Check for empty state handling
    const hasEmptyState = this.hasEmptyStateHandling(panelContent);

    return {
      title: title || `Panel ${panelId}`,
      contentType,
      dataBindings,
      hasEmptyState
    };
  }

  /**
   * Map component hierarchy and layout relationships
   */
  mapComponentHierarchy(content: string, filePath: string): PanelHierarchy[] {
    const hierarchies: PanelHierarchy[] = [];

    try {
      // Find grid containers
      const gridMatches = content.match(/<section className="s-panGrid">[\s\S]*?<\/section>/g);
      if (gridMatches) {
        gridMatches.forEach((gridContent, index) => {
          const panels = this.extractPanelsFromSection(gridContent, { type: 'grid', selector: 's-panGrid' });
          hierarchies.push({
            parent: `grid-section-${index}`,
            children: panels,
            layout: 'grid',
            responsive: this.isResponsive(gridContent)
          });
        });
      }

      // Find panel containers
      const panelMatches = content.match(/<section className="s-panel">[\s\S]*?<\/section>/g);
      if (panelMatches) {
        panelMatches.forEach((panelContent, index) => {
          const panels = this.extractPanelsFromSection(panelContent, { type: 'panel', selector: 's-panel' });
          hierarchies.push({
            parent: `panel-section-${index}`,
            children: panels,
            layout: 'stack',
            responsive: this.isResponsive(panelContent)
          });
        });
      }

    } catch (error) {
      this.addError('parse_error', filePath, `Failed to map component hierarchy: ${error}`);
    }

    return hierarchies;
  }

  /**
   * Extract data binding patterns from component content
   */
  extractDataBindingPatterns(content: string, filePath: string): DataBindingPattern[] {
    const patterns: DataBindingPattern[] = [];

    try {
      // Find template expressions
      const bindingRegex = /\{([^}]+)\}/g;
      let match;

      while ((match = bindingRegex.exec(content)) !== null) {
        const expression = match[1].trim();
        
        // Skip simple literals and functions
        if (this.isDataBinding(expression)) {
          const pattern = this.parseDataBinding(expression);
          if (pattern) {
            patterns.push(pattern);
          }
        }
      }

      // Find async data fetching patterns
      const asyncPatterns = this.extractAsyncDataPatterns(content);
      patterns.push(...asyncPatterns);

    } catch (error) {
      this.addError('parse_error', filePath, `Failed to extract data binding patterns: ${error}`);
    }

    return patterns;
  }

  /**
   * Analyze component relationships and dependencies
   */
  analyzeComponentRelationships(content: string, filePath: string): ComponentRelationship[] {
    const relationships: ComponentRelationship[] = [];

    try {
      // Extract imports to understand dependencies
      const imports = this.extractImportDependencies(content);
      
      // Extract props and data flow
      const dataFlow = this.extractDataBindingPatterns(content, filePath);
      
      // Extract component exports
      const exports = this.extractComponentExports(content);

      // Create relationship mapping
      const componentName = path.basename(filePath, path.extname(filePath));
      
      relationships.push({
        component: componentName,
        dependsOn: imports,
        provides: exports,
        dataFlow
      });

    } catch (error) {
      this.addError('parse_error', filePath, `Failed to analyze component relationships: ${error}`);
    }

    return relationships;
  }

  /**
   * Perform comprehensive feature panel analysis
   */
  analyzeFeaturePanels(content: string, filePath: string): FeaturePanelAnalysis {
    const panels = this.detectFeaturePanels(content, filePath);
    const hierarchy = this.mapComponentHierarchy(content, filePath);
    const relationships = this.analyzeComponentRelationships(content, filePath);
    const dataBindings = this.extractDataBindingPatterns(content, filePath);

    return {
      panels,
      hierarchy,
      relationships,
      dataBindings,
      missingPanels: [], // Will be populated by comparison
      degradedComponents: [] // Will be populated by comparison
    };
  }

  // Helper methods

  private identifyPanelSections(content: string): Array<{ type: string; selector: string }> {
    const sections = [];
    
    if (content.includes('s-panGrid')) {
      sections.push({ type: 'grid', selector: 's-panGrid' });
    }
    
    if (content.includes('s-panel')) {
      sections.push({ type: 'panel', selector: 's-panel' });
    }
    
    if (content.includes('s-kpis')) {
      sections.push({ type: 'kpi', selector: 's-kpis' });
    }

    return sections;
  }

  private extractPanelsFromSection(content: string, section: { type: string; selector: string }): FeaturePanel[] {
    const panels: FeaturePanel[] = [];
    
    // Extract individual panel cards
    const panelMatches = content.match(/<div className="s-panelCard">[\s\S]*?<\/div>\s*(?=<div className="s-panelCard">|<\/section>|$)/g);
    
    if (panelMatches) {
      panelMatches.forEach((panelContent, index) => {
        const metadata = this.extractPanelMetadata(panelContent, `${section.type}-${index}`);
        
        const panel: FeaturePanel = {
          id: `${section.type}-${index}`,
          title: metadata.title,
          contentType: metadata.contentType,
          dataBinding: metadata.dataBindings,
          className: 's-panelCard',
          position: { section: section.selector, order: index },
          hasEmptyState: metadata.hasEmptyState
        };
        
        panels.push(panel);
      });
    }

    return panels;
  }

  private determineContentType(panelContent: string): FeaturePanel['contentType'] {
    if (panelContent.includes('s-chart') || panelContent.includes('<svg')) return 'chart';
    if (panelContent.includes('qa') || panelContent.includes('btn')) return 'actions';
    if (panelContent.includes('sys') || panelContent.includes('state')) return 'status';
    if (panelContent.includes('list') || panelContent.includes('list-row')) return 'list';
    if (panelContent.includes('grid') || panelContent.includes('s-panGrid')) return 'grid';
    return 'list'; // Default
  }

  private extractDataBindings(panelContent: string): string[] {
    const bindings: string[] = [];
    const bindingRegex = /\{([^}]+)\}/g;
    let match;

    while ((match = bindingRegex.exec(panelContent)) !== null) {
      const expression = match[1].trim();
      
      // Extract variable references
      const variableMatches = expression.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*/g);
      if (variableMatches) {
        variableMatches.forEach(variable => {
          if (!bindings.includes(variable) && this.isDataVariable(variable)) {
            bindings.push(variable);
          }
        });
      }
    }

    return bindings;
  }

  private hasEmptyStateHandling(panelContent: string): boolean {
    const emptyStatePatterns = [
      /\.length\s*===\s*0/,
      /No\s+recent/i,
      /empty/i,
      /muted.*style/,
      /fallback/i
    ];

    return emptyStatePatterns.some(pattern => pattern.test(panelContent));
  }

  private isResponsive(content: string): boolean {
    return content.includes('@media') || 
           content.includes('responsive') ||
           content.includes('grid-template-columns');
  }

  private isDataBinding(expression: string): boolean {
    // Skip simple literals, functions, and operators
    if (/^['"`]/.test(expression)) return false; // String literals
    if (/^\d+/.test(expression)) return false; // Numbers
    if (/^[()[\]{}]/.test(expression)) return false; // Brackets only
    if (expression.includes('=>')) return false; // Arrow functions
    
    return /[a-zA-Z_$]/.test(expression); // Contains identifiers
  }

  private parseDataBinding(expression: string): DataBindingPattern | null {
    try {
      // Extract the main variable
      const variableMatch = expression.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)/);
      if (!variableMatch) return null;

      const variable = variableMatch[1];
      
      // Determine type based on usage
      let type: DataBindingPattern['type'] = 'primitive';
      if (expression.includes('.map(') || expression.includes('.length')) type = 'array';
      else if (expression.includes('.') && !expression.includes('()')) type = 'object';

      // Check for nullable access
      const nullable = expression.includes('?.') || expression.includes('??');

      // Extract fallback value
      let fallback: string | undefined;
      const fallbackMatch = expression.match(/\?\?\s*(.+)$/);
      if (fallbackMatch) {
        fallback = fallbackMatch[1].trim();
      }

      return {
        variable,
        source: this.determineDataSource(variable),
        type,
        nullable,
        fallback
      };
    } catch (error) {
      return null;
    }
  }

  private extractAsyncDataPatterns(content: string): DataBindingPattern[] {
    const patterns: DataBindingPattern[] = [];
    
    // Find await expressions
    const awaitMatches = content.match(/await\s+([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)/g);
    if (awaitMatches) {
      awaitMatches.forEach(match => {
        const variable = match.replace('await ', '').trim();
        patterns.push({
          variable,
          source: 'async',
          type: 'object',
          nullable: true
        });
      });
    }

    return patterns;
  }

  private extractImportDependencies(content: string): string[] {
    const dependencies: string[] = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    return dependencies;
  }

  private extractComponentExports(content: string): string[] {
    const exports: string[] = [];
    
    // Find export statements
    const exportMatches = content.match(/export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/g);
    if (exportMatches) {
      exportMatches.forEach(match => {
        const nameMatch = match.match(/(\w+)$/);
        if (nameMatch) {
          exports.push(nameMatch[1]);
        }
      });
    }

    return exports;
  }

  private isDataVariable(variable: string): boolean {
    // Filter out common non-data variables
    const nonDataVariables = [
      'React', 'useState', 'useEffect', 'console', 'window', 'document',
      'Math', 'Date', 'JSON', 'Object', 'Array', 'String', 'Number'
    ];
    
    return !nonDataVariables.includes(variable.split('.')[0]);
  }

  private determineDataSource(variable: string): string {
    if (variable.startsWith('kpis')) return 'kpi-api';
    if (variable.startsWith('recent')) return 'orders-api';
    if (variable.startsWith('daily')) return 'analytics-api';
    if (variable.startsWith('health')) return 'health-api';
    return 'unknown';
  }

  /**
   * Get all parsing errors
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