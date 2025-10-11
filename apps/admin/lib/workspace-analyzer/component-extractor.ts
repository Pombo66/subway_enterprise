/**
 * Component structure extraction for KPI grid analysis, styling tokens, and feature panels
 */

import { promises as fs } from 'fs';
import path from 'path';
import { FileContent, ComponentInfo, AnalysisError } from './types';

// New interfaces for component structure extraction
export interface KPITile {
  id: string;
  title: string;
  dataSource: string;
  iconSvg: string;
  accentColor: string;
  position: { row: number; col: number };
  className: string;
  blobVariant?: string;
}

export interface KPIGridStructure {
  tileCount: number;
  tiles: KPITile[];
  gridLayout: string; // CSS grid template
  containerClass: string;
  responsiveBreakpoints: string[];
}

export interface StyleToken {
  name: string;
  value: string;
  type: 'color' | 'spacing' | 'shadow' | 'radius' | 'custom-property';
  category: string;
}

export interface IconAlignment {
  component: string;
  iconClass: string;
  alignment: string;
  spacing: string;
  issues: string[];
}

export interface FeaturePanel {
  id: string;
  title: string;
  contentType: 'list' | 'grid' | 'chart' | 'actions' | 'status';
  dataBinding: string[];
  className: string;
  position: { section: string; order: number };
  hasEmptyState: boolean;
}

export interface ComponentStructure {
  kpiGrid: KPIGridStructure;
  featurePanels: FeaturePanel[];
  stylingTokens: StyleToken[];
  iconAlignments: IconAlignment[];
}

/**
 * React component parser for KPI grid analysis
 */
export class ReactComponentParser {
  private errors: AnalysisError[] = [];

  /**
   * Extract KPI grid structure from React component content
   */
  extractKPIGrid(content: string, filePath: string): KPIGridStructure {
    const tiles: KPITile[] = [];
    let gridLayout = '';
    let containerClass = '';
    let responsiveBreakpoints: string[] = [];

    try {
      // Find KPI container class
      const kpiContainerMatch = content.match(/className="([^"]*s-kpis[^"]*)"/);
      if (kpiContainerMatch) {
        containerClass = kpiContainerMatch[1];
      }

      // Extract individual KPI tiles
      const cardMatches = content.match(/<div className="s-card">[\s\S]*?<\/div>\s*(?=<div className="s-card">|<\/section>)/g);
      
      if (cardMatches) {
        cardMatches.forEach((cardContent, index) => {
          const tile = this.parseKPITile(cardContent, index);
          if (tile) {
            tiles.push(tile);
          }
        });
      }

      // Extract grid layout from CSS or component
      gridLayout = this.extractGridLayout(content);
      
      // Extract responsive breakpoints
      responsiveBreakpoints = this.extractResponsiveBreakpoints(content);

    } catch (error) {
      this.addError('parse_error', filePath, `Failed to extract KPI grid: ${error}`);
    }

    return {
      tileCount: tiles.length,
      tiles,
      gridLayout,
      containerClass,
      responsiveBreakpoints
    };
  }

  /**
   * Parse individual KPI tile from card content
   */
  private parseKPITile(cardContent: string, index: number): KPITile | null {
    try {
      // Extract title from s-k class element
      const titleMatch = cardContent.match(/<p className="s-k">[\s\S]*?<\/span>\s*([^<]+)/);
      const title = titleMatch ? titleMatch[1].trim() : `KPI ${index + 1}`;

      // Extract data source from template literals or variables
      const dataSourceMatch = cardContent.match(/\{kpis\?\.(\w+)|kpis\.(\w+)/);
      const dataSource = dataSourceMatch ? (dataSourceMatch[1] || dataSourceMatch[2]) : '';

      // Extract SVG icon
      const svgMatch = cardContent.match(/<svg[^>]*>[\s\S]*?<\/svg>/);
      const iconSvg = svgMatch ? svgMatch[0] : '';

      // Extract accent color class
      const accentMatch = cardContent.match(/s-cardAccent\s+(s-accent\w+)/);
      const accentColor = accentMatch ? accentMatch[1] : '';

      // Extract blob variant
      const blobMatch = cardContent.match(/s-blob([^"]*)/);
      const blobVariant = blobMatch ? blobMatch[1].trim() : '';

      // Generate ID from title
      const id = title.toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '');

      return {
        id,
        title,
        dataSource,
        iconSvg,
        accentColor,
        position: { row: Math.floor(index / 4), col: index % 4 },
        className: 's-card',
        blobVariant
      };
    } catch (error) {
      this.addError('parse_error', 'kpi-tile', `Failed to parse KPI tile: ${error}`);
      return null;
    }
  }

  /**
   * Extract CSS grid layout configuration
   */
  private extractGridLayout(content: string): string {
    // Look for grid-template-columns in CSS or inline styles
    const gridMatch = content.match(/grid-template-columns:\s*([^;]+)/);
    if (gridMatch) {
      return gridMatch[1].trim();
    }

    // Default based on s-kpis class behavior
    return 'repeat(4, minmax(0,1fr))';
  }

  /**
   * Extract responsive breakpoints from CSS
   */
  private extractResponsiveBreakpoints(content: string): string[] {
    const breakpoints: string[] = [];
    
    // Look for media queries
    const mediaMatches = content.match(/@media\s*\([^)]+\)/g);
    if (mediaMatches) {
      breakpoints.push(...mediaMatches);
    }

    return breakpoints;
  }

  /**
   * Extract feature panels from component content
   */
  extractFeaturePanels(content: string, filePath: string): FeaturePanel[] {
    const panels: FeaturePanel[] = [];

    try {
      // Find panel sections
      const panelSections = [
        { selector: 's-panGrid', type: 'grid' },
        { selector: 's-panel', type: 'chart' }
      ];

      panelSections.forEach(section => {
        const sectionMatches = content.match(new RegExp(`<section className="${section.selector}">([\\s\\S]*?)<\\/section>`, 'g'));
        
        if (sectionMatches) {
          sectionMatches.forEach((sectionContent, sectionIndex) => {
            const panelMatches = sectionContent.match(/<div className="s-panelCard">[\s\S]*?<\/div>\s*(?=<div className="s-panelCard">|<\/section>)/g);
            
            if (panelMatches) {
              panelMatches.forEach((panelContent, panelIndex) => {
                const panel = this.parseFeaturePanel(panelContent, section.selector, panelIndex);
                if (panel) {
                  panels.push(panel);
                }
              });
            }
          });
        }
      });

    } catch (error) {
      this.addError('parse_error', filePath, `Failed to extract feature panels: ${error}`);
    }

    return panels;
  }

  /**
   * Parse individual feature panel
   */
  private parseFeaturePanel(panelContent: string, section: string, index: number): FeaturePanel | null {
    try {
      // Extract title from s-panelT class
      const titleMatch = panelContent.match(/<p className="s-panelT">([^<]+)<\/p>/);
      const title = titleMatch ? titleMatch[1].trim() : `Panel ${index + 1}`;

      // Determine content type based on inner structure
      let contentType: FeaturePanel['contentType'] = 'list';
      if (panelContent.includes('s-chart')) contentType = 'chart';
      else if (panelContent.includes('qa')) contentType = 'actions';
      else if (panelContent.includes('sys')) contentType = 'status';
      else if (panelContent.includes('list')) contentType = 'list';

      // Extract data bindings
      const dataBindings: string[] = [];
      const bindingMatches = panelContent.match(/\{(\w+(?:\.\w+)*)\}/g);
      if (bindingMatches) {
        bindingMatches.forEach(match => {
          const binding = match.replace(/[{}]/g, '');
          if (!dataBindings.includes(binding)) {
            dataBindings.push(binding);
          }
        });
      }

      // Check for empty state handling
      const hasEmptyState = panelContent.includes('length === 0') || 
                           panelContent.includes('No recent') ||
                           panelContent.includes('muted');

      const id = title.toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '');

      return {
        id,
        title,
        contentType,
        dataBinding: dataBindings,
        className: 's-panelCard',
        position: { section, order: index },
        hasEmptyState
      };
    } catch (error) {
      this.addError('parse_error', 'feature-panel', `Failed to parse feature panel: ${error}`);
      return null;
    }
  }

  /**
   * Extract icon alignment information
   */
  extractIconAlignments(content: string, filePath: string): IconAlignment[] {
    const alignments: IconAlignment[] = [];

    try {
      // Find icon containers (s-blob elements)
      const blobMatches = content.match(/<span className="s-blob[^"]*">[\s\S]*?<\/span>/g);
      
      if (blobMatches) {
        blobMatches.forEach((blobContent, index) => {
          const alignment = this.parseIconAlignment(blobContent, index);
          if (alignment) {
            alignments.push(alignment);
          }
        });
      }

    } catch (error) {
      this.addError('parse_error', filePath, `Failed to extract icon alignments: ${error}`);
    }

    return alignments;
  }

  /**
   * Parse icon alignment from blob content
   */
  private parseIconAlignment(blobContent: string, index: number): IconAlignment | null {
    try {
      // Extract class names
      const classMatch = blobContent.match(/className="([^"]+)"/);
      const iconClass = classMatch ? classMatch[1] : '';

      // Check for alignment issues
      const issues: string[] = [];
      
      // Check for proper spacing
      if (!iconClass.includes('s-blob')) {
        issues.push('Missing s-blob base class');
      }

      // Check for SVG structure
      const svgMatch = blobContent.match(/<svg[^>]*>/);
      if (!svgMatch) {
        issues.push('Missing SVG icon');
      } else {
        const svgAttrs = svgMatch[0];
        if (!svgAttrs.includes('width') || !svgAttrs.includes('height')) {
          issues.push('SVG missing dimensions');
        }
      }

      return {
        component: `icon-${index}`,
        iconClass,
        alignment: 'center', // s-blob uses flexbox centering
        spacing: '8px', // gap from s-k class
        issues
      };
    } catch (error) {
      this.addError('parse_error', 'icon-alignment', `Failed to parse icon alignment: ${error}`);
      return null;
    }
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