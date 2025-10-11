/**
 * Styling token extractor for CSS analysis
 */

import { promises as fs } from 'fs';
import path from 'path';
import { AnalysisError } from './types';
import { StyleToken } from './component-extractor';

export interface StyleTokenAnalysis {
  customProperties: StyleToken[];
  classNames: StyleToken[];
  tailwindClasses: StyleToken[];
  cssVariables: StyleToken[];
  missingTokens: string[];
  modifiedTokens: Array<{
    name: string;
    oldValue: string;
    newValue: string;
  }>;
}

/**
 * CSS and styling token extractor
 */
export class StyleTokenExtractor {
  private errors: AnalysisError[] = [];

  /**
   * Parse CSS custom properties from theme.css and component styles
   */
  extractCustomProperties(cssContent: string, filePath: string): StyleToken[] {
    const tokens: StyleToken[] = [];

    try {
      // Extract CSS custom properties (--variable-name: value;)
      const customPropRegex = /--([\w-]+):\s*([^;]+);/g;
      let match;

      while ((match = customPropRegex.exec(cssContent)) !== null) {
        const [, name, value] = match;
        
        tokens.push({
          name: `--${name}`,
          value: value.trim(),
          type: 'custom-property',
          category: this.categorizeCustomProperty(name)
        });
      }

      // Also extract from :root selector specifically
      const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/);
      if (rootMatch) {
        const rootContent = rootMatch[1];
        const rootPropRegex = /--([\w-]+):\s*([^;]+);/g;
        let rootPropMatch;

        while ((rootPropMatch = rootPropRegex.exec(rootContent)) !== null) {
          const [, name, value] = rootPropMatch;
          
          // Avoid duplicates
          if (!tokens.find(t => t.name === `--${name}`)) {
            tokens.push({
              name: `--${name}`,
              value: value.trim(),
              type: 'custom-property',
              category: this.categorizeCustomProperty(name)
            });
          }
        }
      }

    } catch (error) {
      this.addError('parse_error', filePath, `Failed to extract custom properties: ${error}`);
    }

    return tokens;
  }

  /**
   * Extract spacing, color, shadow, and radius tokens with their values
   */
  extractSpacingAndLayoutTokens(cssContent: string, filePath: string): StyleToken[] {
    const tokens: StyleToken[] = [];

    try {
      // Extract spacing tokens
      const spacingRegex = /(?:padding|margin|gap|width|height):\s*([^;]+);/g;
      let match;

      while ((match = spacingRegex.exec(cssContent)) !== null) {
        const [fullMatch, value] = match;
        const property = fullMatch.split(':')[0].trim();
        
        if (this.isSpacingValue(value.trim())) {
          tokens.push({
            name: property,
            value: value.trim(),
            type: 'spacing',
            category: 'layout'
          });
        }
      }

      // Extract color tokens
      const colorRegex = /(?:color|background|border-color|fill|stroke):\s*([^;]+);/g;
      while ((match = colorRegex.exec(cssContent)) !== null) {
        const [fullMatch, value] = match;
        const property = fullMatch.split(':')[0].trim();
        
        if (this.isColorValue(value.trim())) {
          tokens.push({
            name: property,
            value: value.trim(),
            type: 'color',
            category: 'appearance'
          });
        }
      }

      // Extract shadow tokens
      const shadowRegex = /(?:box-shadow|text-shadow|filter):\s*([^;]+);/g;
      while ((match = shadowRegex.exec(cssContent)) !== null) {
        const [fullMatch, value] = match;
        const property = fullMatch.split(':')[0].trim();
        
        tokens.push({
          name: property,
          value: value.trim(),
          type: 'shadow',
          category: 'effects'
        });
      }

      // Extract radius tokens
      const radiusRegex = /border-radius:\s*([^;]+);/g;
      while ((match = radiusRegex.exec(cssContent)) !== null) {
        const [, value] = match;
        
        tokens.push({
          name: 'border-radius',
          value: value.trim(),
          type: 'radius',
          category: 'layout'
        });
      }

    } catch (error) {
      this.addError('parse_error', filePath, `Failed to extract spacing/layout tokens: ${error}`);
    }

    return tokens;
  }

  /**
   * Extract class names and their associated styles
   */
  extractClassNames(cssContent: string, filePath: string): StyleToken[] {
    const tokens: StyleToken[] = [];

    try {
      // Extract class selectors and their rules
      const classRegex = /\.([a-zA-Z][\w-]*)\s*\{([^}]+)\}/g;
      let match;

      while ((match = classRegex.exec(cssContent)) !== null) {
        const [, className, rules] = match;
        
        tokens.push({
          name: className,
          value: rules.trim(),
          type: 'custom-property', // Using existing type
          category: this.categorizeClassName(className)
        });
      }

    } catch (error) {
      this.addError('parse_error', filePath, `Failed to extract class names: ${error}`);
    }

    return tokens;
  }

  /**
   * Extract Tailwind classes from component content
   */
  extractTailwindClasses(componentContent: string, filePath: string): StyleToken[] {
    const tokens: StyleToken[] = [];

    try {
      // Extract className attributes
      const classNameRegex = /className=["'`]([^"'`]+)["'`]/g;
      let match;

      while ((match = classNameRegex.exec(componentContent)) !== null) {
        const [, classString] = match;
        const classes = classString.split(/\s+/).filter(Boolean);

        classes.forEach(cls => {
          // Only include Tailwind-like classes (not custom s- classes)
          if (this.isTailwindClass(cls)) {
            tokens.push({
              name: cls,
              value: cls, // For Tailwind, name and value are the same
              type: 'custom-property',
              category: this.categorizeTailwindClass(cls)
            });
          }
        });
      }

    } catch (error) {
      this.addError('parse_error', filePath, `Failed to extract Tailwind classes: ${error}`);
    }

    return tokens;
  }

  /**
   * Identify missing or modified styling tokens between versions
   */
  compareStyleTokens(oldTokens: StyleToken[], newTokens: StyleToken[]): {
    missing: StyleToken[];
    modified: Array<{ name: string; oldValue: string; newValue: string }>;
    added: StyleToken[];
  } {
    const missing: StyleToken[] = [];
    const modified: Array<{ name: string; oldValue: string; newValue: string }> = [];
    const added: StyleToken[] = [];

    // Create maps for efficient lookup
    const oldTokenMap = new Map(oldTokens.map(t => [t.name, t]));
    const newTokenMap = new Map(newTokens.map(t => [t.name, t]));

    // Find missing tokens (in old but not in new)
    for (const [name, token] of oldTokenMap) {
      if (!newTokenMap.has(name)) {
        missing.push(token);
      }
    }

    // Find modified tokens (different values)
    for (const [name, oldToken] of oldTokenMap) {
      const newToken = newTokenMap.get(name);
      if (newToken && oldToken.value !== newToken.value) {
        modified.push({
          name,
          oldValue: oldToken.value,
          newValue: newToken.value
        });
      }
    }

    // Find added tokens (in new but not in old)
    for (const [name, token] of newTokenMap) {
      if (!oldTokenMap.has(name)) {
        added.push(token);
      }
    }

    return { missing, modified, added };
  }

  /**
   * Perform comprehensive style analysis
   */
  analyzeStyles(cssContent: string, componentContent: string, filePath: string): StyleTokenAnalysis {
    const customProperties = this.extractCustomProperties(cssContent, filePath);
    const spacingTokens = this.extractSpacingAndLayoutTokens(cssContent, filePath);
    const classNames = this.extractClassNames(cssContent, filePath);
    const tailwindClasses = this.extractTailwindClasses(componentContent, filePath);

    return {
      customProperties: [...customProperties, ...spacingTokens],
      classNames,
      tailwindClasses,
      cssVariables: customProperties.filter(t => t.name.startsWith('--')),
      missingTokens: [], // Will be populated by comparison
      modifiedTokens: [] // Will be populated by comparison
    };
  }

  // Helper methods

  private categorizeCustomProperty(name: string): string {
    if (name.includes('color') || name.includes('bg') || name.includes('text')) return 'color';
    if (name.includes('shadow')) return 'shadow';
    if (name.includes('radius')) return 'radius';
    if (name.includes('gap') || name.includes('space')) return 'spacing';
    if (name.includes('accent')) return 'accent';
    return 'general';
  }

  private categorizeClassName(className: string): string {
    if (className.startsWith('s-')) return 'subway-system';
    if (className.includes('card')) return 'card';
    if (className.includes('panel')) return 'panel';
    if (className.includes('nav')) return 'navigation';
    if (className.includes('btn')) return 'button';
    return 'general';
  }

  private categorizeTailwindClass(className: string): string {
    if (className.startsWith('grid') || className.startsWith('flex')) return 'layout';
    if (className.startsWith('p-') || className.startsWith('m-') || className.startsWith('gap-')) return 'spacing';
    if (className.startsWith('bg-') || className.startsWith('text-')) return 'color';
    if (className.startsWith('rounded')) return 'radius';
    if (className.startsWith('shadow')) return 'shadow';
    return 'utility';
  }

  private isTailwindClass(className: string): boolean {
    // Basic heuristic for Tailwind classes
    const tailwindPrefixes = [
      'grid', 'flex', 'block', 'inline', 'hidden',
      'p-', 'm-', 'gap-', 'space-',
      'bg-', 'text-', 'border-',
      'rounded', 'shadow',
      'w-', 'h-', 'max-', 'min-'
    ];
    
    return tailwindPrefixes.some(prefix => className.startsWith(prefix)) && 
           !className.startsWith('s-'); // Exclude custom subway classes
  }

  private isSpacingValue(value: string): boolean {
    return /^\d+(\.\d+)?(px|rem|em|%|vh|vw)$/.test(value.trim()) ||
           value.includes('var(--s-gap)') ||
           value.includes('var(--s-radius)');
  }

  private isColorValue(value: string): boolean {
    return /^#[0-9a-fA-F]{3,8}$/.test(value.trim()) ||
           /^rgba?\([^)]+\)$/.test(value.trim()) ||
           /^hsla?\([^)]+\)$/.test(value.trim()) ||
           value.includes('var(--s-') ||
           ['transparent', 'inherit', 'currentColor'].includes(value.trim());
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