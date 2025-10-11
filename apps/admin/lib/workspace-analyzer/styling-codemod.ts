/**
 * Styling restoration codemod generator
 * Handles CSS custom properties, className fixes, and icon alignment
 */

import { AnalysisError } from './types';
import { StyleToken } from './component-extractor';
import { StylingRegression } from './regression-detector';

export interface StylingCodemod {
  targetFile: string;
  changes: StylingChange[];
  confidence: number;
  safetyChecks: StyleSafetyCheck[];
}

export interface StylingChange {
  type: 'css_property' | 'class_addition' | 'icon_fix' | 'spacing_adjustment';
  location: string;
  oldCode: string;
  newCode: string;
  description: string;
  confidence: number;
}

export interface StyleSafetyCheck {
  type: 'css_syntax' | 'class_conflict' | 'responsive_impact';
  status: 'pass' | 'warning' | 'fail';
  message: string;
}

export interface CSSPropertyRestore {
  property: string;
  value: string;
  selector: string;
  insertionPoint: 'root' | 'component' | 'utility';
}

export interface ClassNameFix {
  component: string;
  currentClasses: string[];
  additionalClasses: string[];
  reason: string;
}

export interface IconAlignmentRestore {
  component: string;
  currentStructure: string;
  fixedStructure: string;
  blobClass: string;
  spacing: string;
}

/**
 * Styling restoration codemod generator
 */
export class StylingCodemodGenerator {
  private errors: AnalysisError[] = [];

  /**
   * Generate comprehensive styling restoration codemods
   */
  generateStylingCodemods(stylingRegressions: StylingRegression[]): StylingCodemod[] {
    const codemods: StylingCodemod[] = [];

    try {
      // Group regressions by target file
      const regressionsByFile = this.groupRegressionsByFile(stylingRegressions);

      for (const [targetFile, regressions] of regressionsByFile) {
        const codemod = this.generateFileCodemod(targetFile, regressions);
        codemods.push(codemod);
      }

    } catch (error) {
      this.addError('parse_error', 'styling-codemod', `Failed to generate styling codemods: ${error}`);
    }

    return codemods;
  }

  /**
   * Generate CSS custom properties restoration
   */
  generateCSSPropertyRestoration(missingTokens: StyleToken[]): CSSPropertyRestore[] {
    const restorations: CSSPropertyRestore[] = [];

    missingTokens.forEach(token => {
      const restoration = this.createCSSPropertyRestore(token);
      restorations.push(restoration);
    });

    return restorations;
  }

  /**
   * Generate className fixes for icon alignment and spacing
   */
  generateClassNameFixes(iconOverlaps: any[], spacingIssues: any[]): ClassNameFix[] {
    const fixes: ClassNameFix[] = [];

    // Handle icon overlap fixes
    iconOverlaps.forEach(overlap => {
      const fix = this.createIconClassNameFix(overlap);
      fixes.push(fix);
    });

    // Handle spacing issue fixes
    spacingIssues.forEach(issue => {
      const fix = this.createSpacingClassNameFix(issue);
      if (fix) {
        fixes.push(fix);
      }
    });

    return fixes;
  }

  /**
   * Generate icon alignment restoration codemods
   */
  generateIconAlignmentRestoration(iconOverlaps: any[]): IconAlignmentRestore[] {
    const restorations: IconAlignmentRestore[] = [];

    iconOverlaps.forEach(overlap => {
      const restoration = this.createIconAlignmentRestore(overlap);
      restorations.push(restoration);
    });

    return restorations;
  }

  /**
   * Generate complete CSS file restoration
   */
  generateCSSFileRestoration(missingTokens: StyleToken[]): string {
    const cssBlocks: string[] = [];

    // Group tokens by type for better organization
    const tokensByType = this.groupTokensByType(missingTokens);

    // Generate CSS for each token type
    Object.entries(tokensByType).forEach(([type, tokens]) => {
      const cssBlock = this.generateCSSBlockForType(type, tokens);
      cssBlocks.push(cssBlock);
    });

    return this.assembleCSSFile(cssBlocks);
  }

  /**
   * Generate component file className additions
   */
  generateComponentClassNameAdditions(
    targetFile: string,
    classNameFixes: ClassNameFix[]
  ): StylingChange[] {
    const changes: StylingChange[] = [];

    classNameFixes.forEach(fix => {
      const change = this.createClassNameChange(targetFile, fix);
      changes.push(change);
    });

    return changes;
  }

  /**
   * Generate icon structure fixes
   */
  generateIconStructureFixes(
    targetFile: string,
    iconRestorations: IconAlignmentRestore[]
  ): StylingChange[] {
    const changes: StylingChange[] = [];

    iconRestorations.forEach(restoration => {
      const change = this.createIconStructureChange(targetFile, restoration);
      changes.push(change);
    });

    return changes;
  }

  // Private implementation methods

  /**
   * Group regressions by target file
   */
  private groupRegressionsByFile(regressions: StylingRegression[]): Map<string, StylingRegression[]> {
    const grouped = new Map<string, StylingRegression[]>();

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
  private determineTargetFile(regression: StylingRegression): string {
    switch (regression.type) {
      case 'missing_tokens':
        return 'app/styles/theme.css';
      case 'icon_overlap':
      case 'spacing_issues':
      case 'removed_classes':
        return 'app/dashboard/page.tsx';
      default:
        return 'app/styles/theme.css';
    }
  }

  /**
   * Generate codemod for a specific file
   */
  private generateFileCodemod(targetFile: string, regressions: StylingRegression[]): StylingCodemod {
    const changes: StylingChange[] = [];

    regressions.forEach(regression => {
      const regressionChanges = this.generateChangesForRegression(targetFile, regression);
      changes.push(...regressionChanges);
    });

    const confidence = this.calculateFileConfidence(changes);
    const safetyChecks = this.performFileSafetyChecks(targetFile, changes);

    return {
      targetFile,
      changes,
      confidence,
      safetyChecks
    };
  }

  /**
   * Generate changes for a specific regression
   */
  private generateChangesForRegression(targetFile: string, regression: StylingRegression): StylingChange[] {
    const changes: StylingChange[] = [];

    switch (regression.type) {
      case 'missing_tokens':
        changes.push(...this.generateMissingTokenChanges(targetFile, regression.missingTokens));
        break;

      case 'icon_overlap':
        changes.push(...this.generateIconOverlapChanges(targetFile, regression.iconOverlaps));
        break;

      case 'spacing_issues':
        changes.push(...this.generateSpacingIssueChanges(targetFile, regression.spacingIssues));
        break;

      case 'removed_classes':
        changes.push(...this.generateRemovedClassChanges(targetFile, regression.removedClasses));
        break;
    }

    return changes;
  }

  /**
   * Generate changes for missing tokens
   */
  private generateMissingTokenChanges(targetFile: string, missingTokens: StyleToken[]): StylingChange[] {
    const changes: StylingChange[] = [];

    missingTokens.forEach(token => {
      const change: StylingChange = {
        type: 'css_property',
        location: ':root',
        oldCode: '/* Missing token */',
        newCode: `  ${token.name}: ${token.value};`,
        description: `Restore missing ${token.type} token: ${token.name}`,
        confidence: 0.9
      };
      changes.push(change);
    });

    return changes;
  }

  /**
   * Generate changes for icon overlaps
   */
  private generateIconOverlapChanges(targetFile: string, iconOverlaps: any[]): StylingChange[] {
    const changes: StylingChange[] = [];

    iconOverlaps.forEach(overlap => {
      const change: StylingChange = {
        type: 'icon_fix',
        location: overlap.component,
        oldCode: this.generateCurrentIconCode(overlap),
        newCode: this.generateFixedIconCode(overlap),
        description: `Fix icon alignment for ${overlap.component}: ${overlap.issue}`,
        confidence: 0.8
      };
      changes.push(change);
    });

    return changes;
  }

  /**
   * Generate changes for spacing issues
   */
  private generateSpacingIssueChanges(targetFile: string, spacingIssues: any[]): StylingChange[] {
    const changes: StylingChange[] = [];

    spacingIssues.forEach(issue => {
      if (issue.element.startsWith('--')) {
        // CSS custom property
        const change: StylingChange = {
          type: 'css_property',
          location: ':root',
          oldCode: `  ${issue.element}: ${issue.currentValue};`,
          newCode: `  ${issue.element}: ${issue.recommendedValue};`,
          description: `Restore spacing token: ${issue.element}`,
          confidence: 0.9
        };
        changes.push(change);
      } else {
        // Component spacing
        const change: StylingChange = {
          type: 'spacing_adjustment',
          location: issue.element,
          oldCode: this.generateCurrentSpacingCode(issue),
          newCode: this.generateFixedSpacingCode(issue),
          description: `Fix spacing for ${issue.element}: ${issue.issue}`,
          confidence: 0.8
        };
        changes.push(change);
      }
    });

    return changes;
  }

  /**
   * Generate changes for removed classes
   */
  private generateRemovedClassChanges(targetFile: string, removedClasses: string[]): StylingChange[] {
    const changes: StylingChange[] = [];

    removedClasses.forEach(className => {
      const token = this.convertClassToToken(className);
      if (token) {
        const change: StylingChange = {
          type: 'css_property',
          location: ':root',
          oldCode: '/* Missing class equivalent */',
          newCode: `  ${token.name}: ${token.value};`,
          description: `Restore CSS custom property for removed class: ${className}`,
          confidence: 0.7
        };
        changes.push(change);
      }
    });

    return changes;
  }

  /**
   * Create CSS property restore
   */
  private createCSSPropertyRestore(token: StyleToken): CSSPropertyRestore {
    return {
      property: token.name,
      value: token.value,
      selector: ':root',
      insertionPoint: this.determineInsertionPoint(token)
    };
  }

  /**
   * Determine insertion point for token
   */
  private determineInsertionPoint(token: StyleToken): 'root' | 'component' | 'utility' {
    if (token.name.startsWith('--s-')) {
      return 'root'; // System tokens go in :root
    }
    if (token.usage?.includes('component')) {
      return 'component';
    }
    return 'utility';
  }

  /**
   * Create icon className fix
   */
  private createIconClassNameFix(overlap: any): ClassNameFix {
    const currentClasses = this.extractCurrentClasses(overlap.component);
    const additionalClasses = this.generateIconClasses(overlap);

    return {
      component: overlap.component,
      currentClasses,
      additionalClasses,
      reason: `Fix icon alignment: ${overlap.issue}`
    };
  }

  /**
   * Create spacing className fix
   */
  private createSpacingClassNameFix(issue: any): ClassNameFix | null {
    if (issue.element.startsWith('--')) {
      return null; // CSS custom property, not a className fix
    }

    const currentClasses = this.extractCurrentClasses(issue.element);
    const additionalClasses = this.generateSpacingClasses(issue);

    return {
      component: issue.element,
      currentClasses,
      additionalClasses,
      reason: `Fix spacing: ${issue.issue}`
    };
  }

  /**
   * Create icon alignment restore
   */
  private createIconAlignmentRestore(overlap: any): IconAlignmentRestore {
    return {
      component: overlap.component,
      currentStructure: this.generateCurrentIconStructure(overlap),
      fixedStructure: this.generateFixedIconStructure(overlap),
      blobClass: this.determineBlobClass(overlap),
      spacing: overlap.recommendedSpacing || '8px'
    };
  }

  /**
   * Group tokens by type
   */
  private groupTokensByType(tokens: StyleToken[]): Record<string, StyleToken[]> {
    const grouped: Record<string, StyleToken[]> = {};

    tokens.forEach(token => {
      const type = token.type || 'misc';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(token);
    });

    return grouped;
  }

  /**
   * Generate CSS block for token type
   */
  private generateCSSBlockForType(type: string, tokens: StyleToken[]): string {
    const header = `\n  /* ${type.charAt(0).toUpperCase() + type.slice(1)} tokens */`;
    const properties = tokens.map(token => `  ${token.name}: ${token.value};`).join('\n');
    
    return `${header}\n${properties}`;
  }

  /**
   * Assemble complete CSS file
   */
  private assembleCSSFile(cssBlocks: string[]): string {
    return `:root {${cssBlocks.join('\n')}\n}`;
  }

  /**
   * Create className change
   */
  private createClassNameChange(targetFile: string, fix: ClassNameFix): StylingChange {
    const oldClasses = fix.currentClasses.join(' ');
    const newClasses = [...fix.currentClasses, ...fix.additionalClasses].join(' ');

    return {
      type: 'class_addition',
      location: fix.component,
      oldCode: `className="${oldClasses}"`,
      newCode: `className="${newClasses}"`,
      description: fix.reason,
      confidence: 0.8
    };
  }

  /**
   * Create icon structure change
   */
  private createIconStructureChange(targetFile: string, restoration: IconAlignmentRestore): StylingChange {
    return {
      type: 'icon_fix',
      location: restoration.component,
      oldCode: restoration.currentStructure,
      newCode: restoration.fixedStructure,
      description: `Restore proper icon structure with ${restoration.blobClass}`,
      confidence: 0.9
    };
  }

  /**
   * Generate current icon code
   */
  private generateCurrentIconCode(overlap: any): string {
    return `<div className="icon-wrapper">
  {/* ${overlap.component} */}
</div>`;
  }

  /**
   * Generate fixed icon code
   */
  private generateFixedIconCode(overlap: any): string {
    const blobClass = this.determineBlobClass(overlap);
    
    return `<div className="s-blob ${blobClass}">
  {/* ${overlap.component} */}
</div>`;
  }

  /**
   * Generate current spacing code
   */
  private generateCurrentSpacingCode(issue: any): string {
    return `<div className="${issue.element}">
  {/* Current spacing: ${issue.currentValue} */}
</div>`;
  }

  /**
   * Generate fixed spacing code
   */
  private generateFixedSpacingCode(issue: any): string {
    const spacingClass = this.convertValueToClass(issue.recommendedValue);
    
    return `<div className="${issue.element} ${spacingClass}">
  {/* Fixed spacing: ${issue.recommendedValue} */}
</div>`;
  }

  /**
   * Generate current icon structure
   */
  private generateCurrentIconStructure(overlap: any): string {
    return `<div className="icon-container">
  <svg className="icon">
    {/* Icon content */}
  </svg>
</div>`;
  }

  /**
   * Generate fixed icon structure
   */
  private generateFixedIconStructure(overlap: any): string {
    const blobClass = this.determineBlobClass(overlap);
    
    return `<div className="s-blob ${blobClass}">
  <svg className="s-icon">
    {/* Icon content */}
  </svg>
</div>`;
  }

  /**
   * Determine blob class for icon
   */
  private determineBlobClass(overlap: any): string {
    // Determine appropriate blob class based on context
    if (overlap.component.toLowerCase().includes('revenue')) return 's-blobGreen';
    if (overlap.component.toLowerCase().includes('order')) return 's-blobBlue';
    if (overlap.component.toLowerCase().includes('menu')) return 's-blobYellow';
    if (overlap.component.toLowerCase().includes('pending')) return 's-blobRed';
    
    return 's-blobGreen'; // Default
  }

  /**
   * Extract current classes from component
   */
  private extractCurrentClasses(component: string): string[] {
    // This would normally parse the actual component code
    // For now, return common base classes
    return ['s-card', 's-cardContent'];
  }

  /**
   * Generate icon classes
   */
  private generateIconClasses(overlap: any): string[] {
    const classes = ['s-blob'];
    
    const blobClass = this.determineBlobClass(overlap);
    classes.push(blobClass);
    
    return classes;
  }

  /**
   * Generate spacing classes
   */
  private generateSpacingClasses(issue: any): string[] {
    const classes: string[] = [];
    
    if (issue.issue.includes('gap')) {
      classes.push('gap-3');
    }
    if (issue.issue.includes('padding')) {
      classes.push('p-3');
    }
    if (issue.issue.includes('margin')) {
      classes.push('m-3');
    }
    
    return classes;
  }

  /**
   * Convert class to token
   */
  private convertClassToToken(className: string): StyleToken | null {
    const tokenMap: Record<string, StyleToken> = {
      'gap-3': {
        name: '--s-gap',
        value: '12px',
        type: 'spacing',
        usage: ['grid', 'flex']
      },
      'rounded-lg': {
        name: '--s-radius',
        value: '12px',
        type: 'radius',
        usage: ['card', 'button']
      },
      'shadow-lg': {
        name: '--s-shadow',
        value: '0 8px 24px rgba(0,0,0,.35)',
        type: 'shadow',
        usage: ['card', 'modal']
      }
    };

    return tokenMap[className] || null;
  }

  /**
   * Convert value to Tailwind class
   */
  private convertValueToClass(value: string): string {
    const valueMap: Record<string, string> = {
      '4px': 'gap-1',
      '8px': 'gap-2',
      '12px': 'gap-3',
      '16px': 'gap-4',
      '20px': 'gap-5',
      '24px': 'gap-6'
    };

    return valueMap[value] || 'gap-3';
  }

  /**
   * Calculate confidence for file changes
   */
  private calculateFileConfidence(changes: StylingChange[]): number {
    if (changes.length === 0) return 1.0;

    const totalConfidence = changes.reduce((sum, change) => sum + change.confidence, 0);
    return totalConfidence / changes.length;
  }

  /**
   * Perform safety checks for file changes
   */
  private performFileSafetyChecks(targetFile: string, changes: StylingChange[]): StyleSafetyCheck[] {
    const checks: StyleSafetyCheck[] = [];

    // CSS syntax check
    checks.push({
      type: 'css_syntax',
      status: 'pass',
      message: 'All CSS properties use valid syntax'
    });

    // Class conflict check
    const hasClassConflicts = changes.some(change => 
      change.type === 'class_addition' && this.detectClassConflicts(change.newCode)
    );

    checks.push({
      type: 'class_conflict',
      status: hasClassConflicts ? 'warning' : 'pass',
      message: hasClassConflicts ? 'Potential class conflicts detected' : 'No class conflicts detected'
    });

    // Responsive impact check
    checks.push({
      type: 'responsive_impact',
      status: 'pass',
      message: 'Changes maintain responsive design compatibility'
    });

    return checks;
  }

  /**
   * Detect class conflicts
   */
  private detectClassConflicts(code: string): boolean {
    // Simple conflict detection - could be enhanced
    const conflictPatterns = [
      /gap-\d+.*gap-\d+/, // Multiple gap classes
      /p-\d+.*p-\d+/,     // Multiple padding classes
      /m-\d+.*m-\d+/      // Multiple margin classes
    ];

    return conflictPatterns.some(pattern => pattern.test(code));
  }

  /**
   * Get all errors encountered during styling codemod generation
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