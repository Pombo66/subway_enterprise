/**
 * Regression detection engine for comparing old baseline and current workspace
 * Identifies KPI grid regressions, styling issues, and feature panel losses
 */

import { AnalysisError } from './types';
import { KPIGridStructure, KPITile, StyleToken, FeaturePanel, IconAlignment } from './component-extractor';
import { StyleTokenAnalysis } from './style-extractor';
import { FeaturePanelAnalysis } from './feature-panel-detector';

// Regression detection interfaces
export interface KPIGridRegression {
  type: 'missing_tiles' | 'reduced_grid' | 'layout_change' | 'data_binding_loss';
  severity: 'high' | 'medium' | 'low';
  description: string;
  missingTiles: KPITile[];
  currentTileCount: number;
  expectedTileCount: number;
  gridLayoutChange: {
    old: string;
    current: string;
  };
  dataBindingIssues: string[];
}

export interface StylingRegression {
  type: 'missing_tokens' | 'icon_overlap' | 'spacing_issues' | 'removed_classes';
  severity: 'high' | 'medium' | 'low';
  description: string;
  missingTokens: StyleToken[];
  iconOverlaps: IconOverlap[];
  spacingIssues: SpacingIssue[];
  removedClasses: string[];
}

export interface FeaturePanelRegression {
  type: 'lost_panels' | 'degraded_functionality' | 'missing_empty_states' | 'data_incompatibility';
  severity: 'high' | 'medium' | 'low';
  description: string;
  lostPanels: FeaturePanel[];
  degradedComponents: ComponentRegression[];
  missingEmptyStates: string[];
  dataCompatibilityIssues: string[];
}

export interface IconOverlap {
  component: string;
  issue: string;
  currentSpacing: string;
  recommendedSpacing: string;
}

export interface SpacingIssue {
  element: string;
  issue: string;
  currentValue: string;
  recommendedValue: string;
}

export interface ComponentRegression {
  component: string;
  issue: string;
  impact: string;
}

export interface RegressionReport {
  kpiRegressions: KPIGridRegression[];
  stylingRegressions: StylingRegression[];
  featureRegressions: FeaturePanelRegression[];
  summary: {
    totalIssues: number;
    highSeverityCount: number;
    mediumSeverityCount: number;
    lowSeverityCount: number;
  };
  confidence: number; // 0-1 score for overall detection confidence
}

/**
 * Main regression detection engine
 */
export class RegressionDetector {
  private errors: AnalysisError[] = [];

  /**
   * Compare KPI grids between old baseline and current workspace
   */
  compareKPIGrids(
    oldGrid: KPIGridStructure | null,
    currentGrid: KPIGridStructure | null
  ): KPIGridRegression[] {
    const regressions: KPIGridRegression[] = [];

    if (!oldGrid || !currentGrid) {
      this.addError('parse_error', 'kpi-comparison', 'Missing KPI grid data for comparison');
      return regressions;
    }

    try {
      // Check for reduced tile count (expected 9 vs current 5)
      if (oldGrid.tileCount > currentGrid.tileCount) {
        const missingTiles = this.identifyMissingTiles(oldGrid.tiles, currentGrid.tiles);
        
        regressions.push({
          type: 'reduced_grid',
          severity: 'high',
          description: `KPI grid reduced from ${oldGrid.tileCount} tiles to ${currentGrid.tileCount} tiles`,
          missingTiles,
          currentTileCount: currentGrid.tileCount,
          expectedTileCount: oldGrid.tileCount,
          gridLayoutChange: {
            old: oldGrid.gridLayout,
            current: currentGrid.gridLayout
          },
          dataBindingIssues: this.identifyDataBindingIssues(missingTiles)
        });
      }

      // Check for grid layout changes
      if (oldGrid.gridLayout !== currentGrid.gridLayout) {
        regressions.push({
          type: 'layout_change',
          severity: 'medium',
          description: 'CSS grid layout configuration changed',
          missingTiles: [],
          currentTileCount: currentGrid.tileCount,
          expectedTileCount: oldGrid.tileCount,
          gridLayoutChange: {
            old: oldGrid.gridLayout,
            current: currentGrid.gridLayout
          },
          dataBindingIssues: []
        });
      }

      // Check for missing individual tiles
      const missingTiles = this.identifyMissingTiles(oldGrid.tiles, currentGrid.tiles);
      if (missingTiles.length > 0 && oldGrid.tileCount === currentGrid.tileCount) {
        regressions.push({
          type: 'missing_tiles',
          severity: 'high',
          description: `${missingTiles.length} KPI tiles have different content or structure`,
          missingTiles,
          currentTileCount: currentGrid.tileCount,
          expectedTileCount: oldGrid.tileCount,
          gridLayoutChange: {
            old: oldGrid.gridLayout,
            current: currentGrid.gridLayout
          },
          dataBindingIssues: this.identifyDataBindingIssues(missingTiles)
        });
      }

    } catch (error) {
      this.addError('parse_error', 'kpi-comparison', `KPI grid comparison failed: ${error}`);
    }

    return regressions;
  }

  /**
   * Compare styling tokens between old baseline and current workspace
   */
  compareStylingTokens(
    oldAnalysis: StyleTokenAnalysis | null,
    currentAnalysis: StyleTokenAnalysis | null,
    oldIconAlignments?: IconAlignment[],
    currentIconAlignments?: IconAlignment[]
  ): StylingRegression[] {
    const regressions: StylingRegression[] = [];

    if (!oldAnalysis || !currentAnalysis) {
      this.addError('parse_error', 'style-comparison', 'Missing style analysis data for comparison');
      return regressions;
    }

    try {
      // Check for missing CSS custom properties
      const missingTokens = this.identifyMissingStyleTokens(
        oldAnalysis.customProperties,
        currentAnalysis.customProperties
      );

      if (missingTokens.length > 0) {
        regressions.push({
          type: 'missing_tokens',
          severity: 'high',
          description: `${missingTokens.length} CSS custom properties are missing`,
          missingTokens,
          iconOverlaps: [],
          spacingIssues: [],
          removedClasses: []
        });
      }

      // Check for removed className tokens
      const removedClasses = this.identifyRemovedClasses(
        oldAnalysis.classNames.map(c => c.name),
        currentAnalysis.classNames.map(c => c.name)
      );

      if (removedClasses.length > 0) {
        regressions.push({
          type: 'removed_classes',
          severity: 'medium',
          description: `${removedClasses.length} CSS classes have been removed`,
          missingTokens: [],
          iconOverlaps: [],
          spacingIssues: [],
          removedClasses
        });
      }

      // Check for spacing issues
      const spacingIssues = this.identifySpacingIssues(oldAnalysis, currentAnalysis);
      if (spacingIssues.length > 0) {
        regressions.push({
          type: 'spacing_issues',
          severity: 'medium',
          description: `${spacingIssues.length} spacing-related issues detected`,
          missingTokens: [],
          iconOverlaps: [],
          spacingIssues,
          removedClasses: []
        });
      }

      // Check for icon alignment issues
      if (oldIconAlignments && currentIconAlignments) {
        const iconOverlaps = this.identifyIconOverlaps(oldIconAlignments, currentIconAlignments);
        if (iconOverlaps.length > 0) {
          regressions.push({
            type: 'icon_overlap',
            severity: 'medium',
            description: `${iconOverlaps.length} icon alignment issues detected`,
            missingTokens: [],
            iconOverlaps,
            spacingIssues: [],
            removedClasses: []
          });
        }
      }

    } catch (error) {
      this.addError('parse_error', 'style-comparison', `Style comparison failed: ${error}`);
    }

    return regressions;
  }

  /**
   * Compare feature panels between old baseline and current workspace
   */
  compareFeaturePanels(
    oldAnalysis: FeaturePanelAnalysis | null,
    currentAnalysis: FeaturePanelAnalysis | null
  ): FeaturePanelRegression[] {
    const regressions: FeaturePanelRegression[] = [];

    if (!oldAnalysis || !currentAnalysis) {
      this.addError('parse_error', 'panel-comparison', 'Missing feature panel data for comparison');
      return regressions;
    }

    try {
      // Check for lost panels
      const lostPanels = this.identifyLostPanels(oldAnalysis.panels, currentAnalysis.panels);
      
      if (lostPanels.length > 0) {
        regressions.push({
          type: 'lost_panels',
          severity: 'high',
          description: `${lostPanels.length} feature panels are missing`,
          lostPanels,
          degradedComponents: [],
          missingEmptyStates: [],
          dataCompatibilityIssues: []
        });
      }

      // Check for degraded component functionality
      const degradedComponents = this.identifyDegradedComponents(
        oldAnalysis.panels,
        currentAnalysis.panels
      );

      if (degradedComponents.length > 0) {
        regressions.push({
          type: 'degraded_functionality',
          severity: 'medium',
          description: `${degradedComponents.length} components have degraded functionality`,
          lostPanels: [],
          degradedComponents,
          missingEmptyStates: [],
          dataCompatibilityIssues: []
        });
      }

      // Check for missing empty states
      const missingEmptyStates = this.identifyMissingEmptyStates(
        oldAnalysis.panels,
        currentAnalysis.panels
      );

      if (missingEmptyStates.length > 0) {
        regressions.push({
          type: 'missing_empty_states',
          severity: 'low',
          description: `${missingEmptyStates.length} panels missing empty state handling`,
          lostPanels: [],
          degradedComponents: [],
          missingEmptyStates,
          dataCompatibilityIssues: []
        });
      }

      // Check for data layer compatibility issues
      const dataCompatibilityIssues = this.identifyDataLayerCompatibilityIssues(
        oldAnalysis,
        currentAnalysis
      );

      if (dataCompatibilityIssues.length > 0) {
        regressions.push({
          type: 'data_incompatibility',
          severity: 'high',
          description: `${dataCompatibilityIssues.length} data layer compatibility issues detected`,
          lostPanels: [],
          degradedComponents: [],
          missingEmptyStates: [],
          dataCompatibilityIssues
        });
      }

    } catch (error) {
      this.addError('parse_error', 'panel-comparison', `Feature panel comparison failed: ${error}`);
    }

    return regressions;
  }

  /**
   * Generate comprehensive regression report
   */
  generateRegressionReport(
    oldGrid: KPIGridStructure | null,
    currentGrid: KPIGridStructure | null,
    oldStyleAnalysis: StyleTokenAnalysis | null,
    currentStyleAnalysis: StyleTokenAnalysis | null,
    oldPanelAnalysis: FeaturePanelAnalysis | null,
    currentPanelAnalysis: FeaturePanelAnalysis | null,
    oldIconAlignments?: IconAlignment[],
    currentIconAlignments?: IconAlignment[]
  ): RegressionReport {
    const kpiRegressions = this.compareKPIGrids(oldGrid, currentGrid);
    const stylingRegressions = this.compareStylingTokens(
      oldStyleAnalysis, 
      currentStyleAnalysis,
      oldIconAlignments,
      currentIconAlignments
    );
    const featureRegressions = this.compareFeaturePanels(oldPanelAnalysis, currentPanelAnalysis);

    const allRegressions = [...kpiRegressions, ...stylingRegressions, ...featureRegressions];
    
    const summary = {
      totalIssues: allRegressions.length,
      highSeverityCount: allRegressions.filter(r => r.severity === 'high').length,
      mediumSeverityCount: allRegressions.filter(r => r.severity === 'medium').length,
      lowSeverityCount: allRegressions.filter(r => r.severity === 'low').length
    };

    // Calculate confidence based on data availability and parsing success
    const confidence = this.calculateConfidence(
      oldGrid, currentGrid,
      oldStyleAnalysis, currentStyleAnalysis,
      oldPanelAnalysis, currentPanelAnalysis
    );

    return {
      kpiRegressions,
      stylingRegressions,
      featureRegressions,
      summary,
      confidence
    };
  }

  // Private helper methods

  /**
   * Identify missing KPI tiles by comparing old and current tiles
   */
  private identifyMissingTiles(oldTiles: KPITile[], currentTiles: KPITile[]): KPITile[] {
    const currentTileIds = new Set(currentTiles.map(tile => tile.id));
    const currentDataSources = new Set(currentTiles.map(tile => tile.dataSource));
    
    return oldTiles.filter(oldTile => {
      // Check if tile exists by ID or data source
      return !currentTileIds.has(oldTile.id) && !currentDataSources.has(oldTile.dataSource);
    });
  }

  /**
   * Identify data binding issues for missing tiles
   */
  private identifyDataBindingIssues(missingTiles: KPITile[]): string[] {
    return missingTiles.map(tile => {
      if (!tile.dataSource) {
        return `${tile.title}: No data source identified`;
      }
      return `${tile.title}: Missing data binding for '${tile.dataSource}'`;
    });
  }

  /**
   * Identify missing style tokens
   */
  private identifyMissingStyleTokens(
    oldTokens: StyleToken[],
    currentTokens: StyleToken[]
  ): StyleToken[] {
    const currentTokenNames = new Set(currentTokens.map(token => token.name));
    
    return oldTokens.filter(oldToken => !currentTokenNames.has(oldToken.name));
  }

  /**
   * Identify removed CSS classes
   */
  private identifyRemovedClasses(oldClasses: string[], currentClasses: string[]): string[] {
    const currentClassSet = new Set(currentClasses);
    return oldClasses.filter(oldClass => !currentClassSet.has(oldClass));
  }

  /**
   * Identify spacing issues between versions
   */
  private identifySpacingIssues(
    oldAnalysis: StyleTokenAnalysis,
    currentAnalysis: StyleTokenAnalysis
  ): SpacingIssue[] {
    const issues: SpacingIssue[] = [];

    // Check for missing gap tokens
    const oldGapTokens = oldAnalysis.customProperties.filter(token => 
      token.name.includes('gap') || token.name.includes('spacing')
    );
    const currentGapTokens = currentAnalysis.customProperties.filter(token => 
      token.name.includes('gap') || token.name.includes('spacing')
    );

    oldGapTokens.forEach(oldToken => {
      const currentToken = currentGapTokens.find(token => token.name === oldToken.name);
      if (!currentToken) {
        issues.push({
          element: oldToken.name,
          issue: 'Missing spacing token',
          currentValue: 'undefined',
          recommendedValue: oldToken.value
        });
      } else if (currentToken.value !== oldToken.value) {
        issues.push({
          element: oldToken.name,
          issue: 'Changed spacing value',
          currentValue: currentToken.value,
          recommendedValue: oldToken.value
        });
      }
    });

    // Check for missing radius tokens
    const oldRadiusTokens = oldAnalysis.customProperties.filter(token => 
      token.name.includes('radius') || token.type === 'radius'
    );
    const currentRadiusTokens = currentAnalysis.customProperties.filter(token => 
      token.name.includes('radius') || token.type === 'radius'
    );

    oldRadiusTokens.forEach(oldToken => {
      const currentToken = currentRadiusTokens.find(token => token.name === oldToken.name);
      if (!currentToken) {
        issues.push({
          element: oldToken.name,
          issue: 'Missing radius token',
          currentValue: 'undefined',
          recommendedValue: oldToken.value
        });
      }
    });

    // Check for missing shadow tokens
    const oldShadowTokens = oldAnalysis.customProperties.filter(token => 
      token.name.includes('shadow') || token.type === 'shadow'
    );
    const currentShadowTokens = currentAnalysis.customProperties.filter(token => 
      token.name.includes('shadow') || token.type === 'shadow'
    );

    oldShadowTokens.forEach(oldToken => {
      const currentToken = currentShadowTokens.find(token => token.name === oldToken.name);
      if (!currentToken) {
        issues.push({
          element: oldToken.name,
          issue: 'Missing shadow token',
          currentValue: 'undefined',
          recommendedValue: oldToken.value
        });
      }
    });

    return issues;
  }

  /**
   * Identify icon overlap and alignment issues
   */
  private identifyIconOverlaps(
    oldAlignments: IconAlignment[],
    currentAlignments: IconAlignment[]
  ): IconOverlap[] {
    const overlaps: IconOverlap[] = [];

    // Check for alignment issues in current icons
    currentAlignments.forEach(currentIcon => {
      const oldIcon = oldAlignments.find(old => 
        old.component === currentIcon.component || 
        old.iconClass === currentIcon.iconClass
      );

      // Check for spacing issues
      if (currentIcon.issues.length > 0) {
        currentIcon.issues.forEach(issue => {
          overlaps.push({
            component: currentIcon.component,
            issue: issue,
            currentSpacing: currentIcon.spacing,
            recommendedSpacing: oldIcon?.spacing || '8px'
          });
        });
      }

      // Check for missing blob classes
      if (!currentIcon.iconClass.includes('s-blob')) {
        overlaps.push({
          component: currentIcon.component,
          issue: 'Missing s-blob container class',
          currentSpacing: currentIcon.spacing,
          recommendedSpacing: '8px'
        });
      }

      // Check for improper alignment
      if (oldIcon && oldIcon.alignment !== currentIcon.alignment) {
        overlaps.push({
          component: currentIcon.component,
          issue: `Alignment changed from ${oldIcon.alignment} to ${currentIcon.alignment}`,
          currentSpacing: currentIcon.spacing,
          recommendedSpacing: oldIcon.spacing
        });
      }
    });

    // Check for missing icons (present in old but not current)
    oldAlignments.forEach(oldIcon => {
      const currentIcon = currentAlignments.find(current => 
        current.component === oldIcon.component || 
        current.iconClass === oldIcon.iconClass
      );

      if (!currentIcon) {
        overlaps.push({
          component: oldIcon.component,
          issue: 'Icon component missing entirely',
          currentSpacing: '0px',
          recommendedSpacing: oldIcon.spacing
        });
      }
    });

    return overlaps;
  }

  /**
   * Identify lost feature panels
   */
  private identifyLostPanels(oldPanels: FeaturePanel[], currentPanels: FeaturePanel[]): FeaturePanel[] {
    const currentPanelIds = new Set(currentPanels.map(panel => panel.id));
    const currentPanelTitles = new Set(currentPanels.map(panel => panel.title));
    
    return oldPanels.filter(oldPanel => {
      return !currentPanelIds.has(oldPanel.id) && !currentPanelTitles.has(oldPanel.title);
    });
  }

  /**
   * Identify degraded components
   */
  private identifyDegradedComponents(
    oldPanels: FeaturePanel[],
    currentPanels: FeaturePanel[]
  ): ComponentRegression[] {
    const regressions: ComponentRegression[] = [];

    oldPanels.forEach(oldPanel => {
      const currentPanel = currentPanels.find(panel => 
        panel.id === oldPanel.id || panel.title === oldPanel.title
      );

      if (currentPanel) {
        // Check for reduced data bindings
        if (oldPanel.dataBinding.length > currentPanel.dataBinding.length) {
          const lostBindings = oldPanel.dataBinding.filter(binding => 
            !currentPanel.dataBinding.includes(binding)
          );
          
          regressions.push({
            component: oldPanel.title,
            issue: 'Reduced data bindings',
            impact: `Lost data connections: ${lostBindings.join(', ')}`
          });
        }

        // Check for content type changes
        if (oldPanel.contentType !== currentPanel.contentType) {
          regressions.push({
            component: oldPanel.title,
            issue: 'Content type changed',
            impact: `Changed from ${oldPanel.contentType} to ${currentPanel.contentType}`
          });
        }

        // Check for position/layout changes
        if (oldPanel.position.section !== currentPanel.position.section) {
          regressions.push({
            component: oldPanel.title,
            issue: 'Panel moved to different section',
            impact: `Moved from ${oldPanel.position.section} to ${currentPanel.position.section}`
          });
        }

        // Check for className changes that might affect styling
        if (oldPanel.className !== currentPanel.className) {
          regressions.push({
            component: oldPanel.title,
            issue: 'CSS class structure changed',
            impact: `Class changed from ${oldPanel.className} to ${currentPanel.className}`
          });
        }

        // Check for data layer compatibility issues
        const dataCompatibilityIssues = this.analyzeDataLayerCompatibility(oldPanel, currentPanel);
        dataCompatibilityIssues.forEach(issue => {
          regressions.push({
            component: oldPanel.title,
            issue: 'Data layer compatibility issue',
            impact: issue
          });
        });
      }
    });

    return regressions;
  }

  /**
   * Analyze data layer compatibility between old and current panels
   */
  private analyzeDataLayerCompatibility(
    oldPanel: FeaturePanel,
    currentPanel: FeaturePanel
  ): string[] {
    const issues: string[] = [];

    // Check for missing data sources
    oldPanel.dataBinding.forEach(oldBinding => {
      if (!currentPanel.dataBinding.includes(oldBinding)) {
        // Analyze the type of data binding to determine severity
        if (oldBinding.includes('kpis.')) {
          issues.push(`Missing KPI data binding: ${oldBinding}`);
        } else if (oldBinding.includes('recent')) {
          issues.push(`Missing recent data binding: ${oldBinding}`);
        } else if (oldBinding.includes('daily') || oldBinding.includes('analytics')) {
          issues.push(`Missing analytics data binding: ${oldBinding}`);
        } else {
          issues.push(`Missing data binding: ${oldBinding}`);
        }
      }
    });

    // Check for data structure changes
    const oldDataSources = new Set(oldPanel.dataBinding.map(binding => binding.split('.')[0]));
    const currentDataSources = new Set(currentPanel.dataBinding.map(binding => binding.split('.')[0]));

    oldDataSources.forEach(source => {
      if (!currentDataSources.has(source)) {
        issues.push(`Data source '${source}' no longer available`);
      }
    });

    // Check for array vs object binding mismatches
    oldPanel.dataBinding.forEach(oldBinding => {
      const currentBinding = currentPanel.dataBinding.find(binding => 
        binding.split('.')[0] === oldBinding.split('.')[0]
      );
      
      if (currentBinding) {
        const oldIsArray = oldBinding.includes('.length') || oldBinding.includes('.map');
        const currentIsArray = currentBinding.includes('.length') || currentBinding.includes('.map');
        
        if (oldIsArray !== currentIsArray) {
          issues.push(`Data structure mismatch for ${oldBinding.split('.')[0]}: expected ${oldIsArray ? 'array' : 'object'}`);
        }
      }
    });

    return issues;
  }

  /**
   * Identify missing empty states
   */
  private identifyMissingEmptyStates(
    oldPanels: FeaturePanel[],
    currentPanels: FeaturePanel[]
  ): string[] {
    const missingEmptyStates: string[] = [];

    oldPanels.forEach(oldPanel => {
      if (oldPanel.hasEmptyState) {
        const currentPanel = currentPanels.find(panel => 
          panel.id === oldPanel.id || panel.title === oldPanel.title
        );

        if (currentPanel && !currentPanel.hasEmptyState) {
          missingEmptyStates.push(oldPanel.title);
        }
      }
    });

    return missingEmptyStates;
  }

  /**
   * Identify data layer compatibility issues between old and current analyses
   */
  private identifyDataLayerCompatibilityIssues(
    oldAnalysis: FeaturePanelAnalysis,
    currentAnalysis: FeaturePanelAnalysis
  ): string[] {
    const issues: string[] = [];

    // Compare data binding patterns
    const oldBindings = new Map(oldAnalysis.dataBindings.map(binding => [binding.variable, binding]));
    const currentBindings = new Map(currentAnalysis.dataBindings.map(binding => [binding.variable, binding]));

    // Check for missing data sources
    for (const [variable, oldBinding] of oldBindings) {
      const currentBinding = currentBindings.get(variable);
      
      if (!currentBinding) {
        issues.push(`Data source '${variable}' is no longer available`);
      } else {
        // Check for type mismatches
        if (oldBinding.type !== currentBinding.type) {
          issues.push(`Data type mismatch for '${variable}': expected ${oldBinding.type}, got ${currentBinding.type}`);
        }

        // Check for nullability changes
        if (oldBinding.nullable !== currentBinding.nullable) {
          issues.push(`Nullability changed for '${variable}': was ${oldBinding.nullable ? 'nullable' : 'non-null'}, now ${currentBinding.nullable ? 'nullable' : 'non-null'}`);
        }

        // Check for missing fallbacks
        if (oldBinding.fallback && !currentBinding.fallback) {
          issues.push(`Missing fallback value for '${variable}': previously had '${oldBinding.fallback}'`);
        }
      }
    }

    // Check for component relationship changes
    const oldRelationships = new Map(oldAnalysis.relationships.map(rel => [rel.component, rel]));
    const currentRelationships = new Map(currentAnalysis.relationships.map(rel => [rel.component, rel]));

    for (const [component, oldRel] of oldRelationships) {
      const currentRel = currentRelationships.get(component);
      
      if (!currentRel) {
        issues.push(`Component '${component}' relationship mapping is missing`);
      } else {
        // Check for missing dependencies
        const missingDeps = oldRel.dependsOn.filter(dep => !currentRel.dependsOn.includes(dep));
        if (missingDeps.length > 0) {
          issues.push(`Component '${component}' missing dependencies: ${missingDeps.join(', ')}`);
        }

        // Check for reduced data flow
        if (oldRel.dataFlow.length > currentRel.dataFlow.length) {
          issues.push(`Component '${component}' has reduced data flow: ${oldRel.dataFlow.length} -> ${currentRel.dataFlow.length} connections`);
        }
      }
    }

    // Check for hierarchy changes that might affect data flow
    const oldHierarchyMap = new Map(oldAnalysis.hierarchy.map(h => [h.parent, h]));
    const currentHierarchyMap = new Map(currentAnalysis.hierarchy.map(h => [h.parent, h]));

    for (const [parent, oldHierarchy] of oldHierarchyMap) {
      const currentHierarchy = currentHierarchyMap.get(parent);
      
      if (!currentHierarchy) {
        issues.push(`Panel hierarchy '${parent}' is missing`);
      } else {
        // Check for layout changes that might affect data rendering
        if (oldHierarchy.layout !== currentHierarchy.layout) {
          issues.push(`Layout changed for '${parent}': ${oldHierarchy.layout} -> ${currentHierarchy.layout}`);
        }

        // Check for missing child panels
        const oldChildIds = new Set(oldHierarchy.children.map(child => child.id));
        const currentChildIds = new Set(currentHierarchy.children.map(child => child.id));
        
        for (const oldChildId of oldChildIds) {
          if (!currentChildIds.has(oldChildId)) {
            issues.push(`Child panel '${oldChildId}' missing from hierarchy '${parent}'`);
          }
        }
      }
    }

    return issues;
  }

  /**
   * Calculate confidence score for regression detection
   */
  private calculateConfidence(
    oldGrid: KPIGridStructure | null,
    currentGrid: KPIGridStructure | null,
    oldStyleAnalysis: StyleTokenAnalysis | null,
    currentStyleAnalysis: StyleTokenAnalysis | null,
    oldPanelAnalysis: FeaturePanelAnalysis | null,
    currentPanelAnalysis: FeaturePanelAnalysis | null
  ): number {
    let score = 0;
    let maxScore = 0;

    // KPI grid data availability (30% weight)
    maxScore += 30;
    if (oldGrid && currentGrid) {
      score += 30;
    } else if (oldGrid || currentGrid) {
      score += 15;
    }

    // Style analysis data availability (30% weight)
    maxScore += 30;
    if (oldStyleAnalysis && currentStyleAnalysis) {
      score += 30;
    } else if (oldStyleAnalysis || currentStyleAnalysis) {
      score += 15;
    }

    // Feature panel data availability (30% weight)
    maxScore += 30;
    if (oldPanelAnalysis && currentPanelAnalysis) {
      score += 30;
    } else if (oldPanelAnalysis || currentPanelAnalysis) {
      score += 15;
    }

    // Error count penalty (10% weight)
    maxScore += 10;
    const errorPenalty = Math.min(this.errors.length * 2, 10);
    score += Math.max(0, 10 - errorPenalty);

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Get all errors encountered during regression detection
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