#!/usr/bin/env ts-node

/**
 * Codemod for adding Subway UI base classes to JSX elements
 * 
 * Usage:
 *   ts-node scripts/codemods/add-subway-classes.ts [options]
 * 
 * Options:
 *   --write                Apply changes to files
 *   --include="glob1,glob2" Include specific file patterns
 *   --exclude="glob"       Exclude file patterns
 *   --since=<git ref>      Only process files changed since git ref
 */

import { Project, SyntaxKind, JsxElement, JsxSelfClosingElement, Node, JsxOpeningElement } from 'ts-morph';
import { glob } from 'glob';
import * as path from 'path';
import { execSync } from 'child_process';

interface CodemodOptions {
  write: boolean;
  include?: string[];
  exclude?: string[];
  since?: string;
}

interface ElementRule {
  selector: string;
  classes: string[];
  condition?: (element: JsxOpeningElement | JsxSelfClosingElement) => boolean;
}

interface FileResult {
  file: string;
  added: number;
  changes: Array<{
    element: string;
    line: number;
    before: string;
    after: string;
  }>;
}

const ELEMENT_RULES: ElementRule[] = [
  {
    selector: 'button',
    classes: ['s-btn', 's-btn--md']
  },
  {
    selector: 'a',
    classes: ['s-btn', 's-btn--md'],
    condition: (element) => {
      const roleAttr = element.getAttributes().find(attr => attr.getName() === 'role');
      if (!roleAttr) return false;
      const value = roleAttr.getFirstDescendantByKind(SyntaxKind.StringLiteral);
      return value?.getLiteralValue() === 'button';
    }
  },
  {
    selector: 'input',
    classes: ['s-input'],
    condition: (element) => {
      const typeAttr = element.getAttributes().find(attr => attr.getName() === 'type');
      if (!typeAttr) return true; // Default input type is text
      const value = typeAttr.getFirstDescendantByKind(SyntaxKind.StringLiteral);
      return value?.getLiteralValue() !== 'hidden';
    }
  },
  {
    selector: 'select',
    classes: ['s-select']
  },
  {
    selector: 'textarea',
    classes: ['s-textarea']
  }
];

class SubwayClassCodemod {
  private project: Project;
  private options: CodemodOptions;

  constructor(options: CodemodOptions) {
    this.options = options;
    this.project = new Project({
      tsConfigFilePath: 'apps/admin/tsconfig.json',
      skipAddingFilesFromTsConfig: true
    });
  }

  async run(): Promise<void> {
    console.log('🔍 Subway UI Class Codemod');
    console.log('==========================\n');

    const files = await this.getTargetFiles();
    
    if (files.length === 0) {
      console.log('No files found to process.');
      return;
    }

    console.log(`Processing ${files.length} files...\n`);

    const results: FileResult[] = [];
    let totalChanges = 0;

    for (const filePath of files) {
      const result = await this.processFile(filePath);
      if (result.added > 0) {
        results.push(result);
        totalChanges += result.added;
      }
    }

    this.printSummary(results, totalChanges);

    if (this.options.write && totalChanges > 0) {
      await this.project.save();
      console.log(`\n✅ Applied ${totalChanges} changes to ${results.length} files.`);
    } else if (totalChanges > 0) {
      console.log(`\n📋 Dry run complete. Use --write to apply ${totalChanges} changes.`);
    } else {
      console.log('\n✨ No changes needed. All elements already have proper base classes.');
    }
  }

  private async getTargetFiles(): Promise<string[]> {
    let patterns = [
      'apps/admin/app/**/*.tsx',
      'apps/admin/components/**/*.tsx'
    ];

    if (this.options.include) {
      patterns = this.options.include;
    }

    let files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { 
        ignore: this.options.exclude || [],
        absolute: true 
      });
      files.push(...matches);
    }

    // Filter by git changes if --since is provided
    if (this.options.since) {
      files = this.filterFilesSinceGitRef(files, this.options.since);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  private filterFilesSinceGitRef(files: string[], gitRef: string): string[] {
    try {
      const changedFiles = execSync(`git diff --name-only ${gitRef}`, { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean)
        .map(f => path.resolve(f));

      return files.filter(file => changedFiles.includes(file));
    } catch (error) {
      console.warn(`Warning: Could not get git changes since ${gitRef}:`, error);
      return files;
    }
  }

  private async processFile(filePath: string): Promise<FileResult> {
    const sourceFile = this.project.addSourceFileAtPath(filePath);
    const relativePath = path.relative(process.cwd(), filePath);
    
    const result: FileResult = {
      file: relativePath,
      added: 0,
      changes: []
    };

    // Find all JSX elements that match our rules
    const jsxElements = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
    ];

    for (const element of jsxElements) {
      const openingElement = Node.isJsxElement(element) ? element.getOpeningElement() : element;
      const tagName = this.getTagName(element);
      if (!tagName) continue;

      // Check if element should be skipped
      if (this.shouldSkipElement(openingElement)) continue;

      // Find matching rule
      const rule = ELEMENT_RULES.find(r => {
        if (r.selector !== tagName) return false;
        if (r.condition && !r.condition(openingElement)) return false;
        return true;
      });

      if (!rule) continue;

      // Check if classes need to be added
      const currentClasses = this.getCurrentClasses(openingElement);
      const missingClasses = rule.classes.filter(cls => !currentClasses.includes(cls));

      if (missingClasses.length === 0) continue;

      // Apply the changes
      const beforeSnippet = this.getElementSnippet(openingElement);
      this.addClasses(openingElement, missingClasses);
      const afterSnippet = this.getElementSnippet(openingElement);

      result.changes.push({
        element: `<${tagName}>`,
        line: element.getStartLineNumber(),
        before: beforeSnippet,
        after: afterSnippet
      });

      result.added += missingClasses.length;
    }

    return result;
  }

  private getTagName(element: JsxElement | JsxSelfClosingElement): string | null {
    if (Node.isJsxElement(element)) {
      return element.getOpeningElement().getTagNameNode().getText();
    } else if (Node.isJsxSelfClosingElement(element)) {
      return element.getTagNameNode().getText();
    }
    return null;
  }

  private shouldSkipElement(element: JsxOpeningElement | JsxSelfClosingElement): boolean {
    // Check for data-allow-unstyled="true"
    const allowUnstyled = element.getAttributes().find(attr => attr.getName() === 'data-allow-unstyled');
    if (allowUnstyled) {
      const value = allowUnstyled.getFirstDescendantByKind(SyntaxKind.StringLiteral);
      if (value?.getLiteralValue() === 'true') return true;

      // Check for JSX expression that might evaluate to true
      const jsxExpr = allowUnstyled.getFirstDescendantByKind(SyntaxKind.JsxExpression);
      if (jsxExpr) {
        const expr = jsxExpr.getExpression();
        if (expr?.getText() === 'true') return true;
      }
    }

    return false;
  }

  private getCurrentClasses(element: JsxOpeningElement | JsxSelfClosingElement): string[] {
    const classNameAttr = element.getAttributes().find(attr => attr.getName() === 'className');
    if (!classNameAttr) return [];

    // Handle string literal
    const stringLiteral = classNameAttr.getFirstDescendantByKind(SyntaxKind.StringLiteral);
    if (stringLiteral) {
      return stringLiteral.getLiteralValue().split(/\s+/).filter(Boolean);
    }

    // Handle JSX expression (template literals, variables, etc.)
    const jsxExpr = classNameAttr.getFirstDescendantByKind(SyntaxKind.JsxExpression);
    if (jsxExpr) {
      const expr = jsxExpr.getExpression();
      if (!expr) return [];

      // Handle template literals
      if (Node.isTemplateExpression(expr) || Node.isNoSubstitutionTemplateLiteral(expr)) {
        const text = expr.getText();
        // Extract static parts of template literal
        const staticParts = text.match(/`([^${}]*)`/g);
        if (staticParts) {
          return staticParts.join(' ').replace(/`/g, '').split(/\s+/).filter(Boolean);
        }
      }

      // For other expressions, we'll need to be more conservative
      // and check if the expression contains our target classes
      const exprText = expr.getText();
      const classes: string[] = [];
      
      // Simple heuristic: look for quoted class names in the expression
      const quotedClasses = exprText.match(/['"`]([^'"`\s]+)['"`]/g);
      if (quotedClasses) {
        quotedClasses.forEach((match: string) => {
          const className = match.slice(1, -1); // Remove quotes
          classes.push(className);
        });
      }

      return classes;
    }

    return [];
  }

  private addClasses(element: JsxOpeningElement | JsxSelfClosingElement, newClasses: string[]): void {
    const classNameAttr = element.getAttributes().find(attr => attr.getName() === 'className');
    
    if (!classNameAttr) {
      // Add new className attribute
      const newClassValue = newClasses.join(' ');
      element.addAttribute({
        name: 'className',
        value: `"${newClassValue}"`
      });
      return;
    }

    // Handle existing className attribute
    const stringLiteral = classNameAttr.getFirstDescendantByKind(SyntaxKind.StringLiteral);
    if (stringLiteral) {
      // Simple string literal case
      const currentValue = stringLiteral.getLiteralValue();
      const newValue = currentValue ? `${newClasses.join(' ')} ${currentValue}` : newClasses.join(' ');
      stringLiteral.setLiteralValue(newValue);
      return;
    }

    // Handle JSX expression case
    const jsxExpr = classNameAttr.getFirstDescendantByKind(SyntaxKind.JsxExpression);
    if (jsxExpr) {
      const expr = jsxExpr.getExpression();
      if (!expr) return;

      const baseClasses = `"${newClasses.join(' ')}"`;
      const currentExpr = expr.getText();
      
      // Create a new expression that prepends our base classes
      const newExpr = `${baseClasses} + " " + (${currentExpr})`;
      jsxExpr.setExpression(newExpr);
    }
  }

  private getElementSnippet(element: JsxOpeningElement | JsxSelfClosingElement): string {
    return element.getText();
  }

  private printSummary(results: FileResult[], totalChanges: number): void {
    if (results.length === 0) {
      return;
    }

    console.log('📊 Changes Summary');
    console.log('==================\n');

    // Print table header
    console.log('File'.padEnd(50) + 'Added'.padEnd(8) + 'Changes');
    console.log('-'.repeat(70));

    for (const result of results) {
      console.log(
        result.file.padEnd(50) + 
        result.added.toString().padEnd(8) + 
        result.changes.length
      );
    }

    console.log('-'.repeat(70));
    console.log('Total'.padEnd(50) + totalChanges.toString().padEnd(8) + results.length);

    // Print detailed changes for first few files
    if (results.length > 0) {
      console.log('\n📝 Sample Changes');
      console.log('=================\n');

      const samplesToShow = Math.min(3, results.length);
      for (let i = 0; i < samplesToShow; i++) {
        const result = results[i];
        console.log(`${result.file}:`);
        
        const changesToShow = Math.min(3, result.changes.length);
        for (let j = 0; j < changesToShow; j++) {
          const change = result.changes[j];
          console.log(`  Line ${change.line}: ${change.element}`);
          console.log(`    Before: ${change.before}`);
          console.log(`    After:  ${change.after}`);
          if (j < changesToShow - 1) console.log();
        }
        
        if (result.changes.length > changesToShow) {
          console.log(`    ... and ${result.changes.length - changesToShow} more changes`);
        }
        
        if (i < samplesToShow - 1) console.log();
      }

      if (results.length > samplesToShow) {
        console.log(`\n... and ${results.length - samplesToShow} more files with changes`);
      }
    }
  }
}

// CLI argument parsing
function parseArgs(): CodemodOptions {
  const args = process.argv.slice(2);
  const options: CodemodOptions = {
    write: false
  };

  for (const arg of args) {
    if (arg === '--write') {
      options.write = true;
    } else if (arg.startsWith('--include=')) {
      options.include = arg.split('=')[1].split(',');
    } else if (arg.startsWith('--exclude=')) {
      options.exclude = arg.split('=')[1].split(',');
    } else if (arg.startsWith('--since=')) {
      options.since = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Subway UI Class Codemod

Usage: ts-node scripts/codemods/add-subway-classes.ts [options]

Options:
  --write                Apply changes to files (default: dry run)
  --include="glob1,glob2" Include specific file patterns
  --exclude="glob"       Exclude file patterns  
  --since=<git ref>      Only process files changed since git ref
  --help, -h             Show this help message

Examples:
  ts-node scripts/codemods/add-subway-classes.ts
  ts-node scripts/codemods/add-subway-classes.ts --write
  ts-node scripts/codemods/add-subway-classes.ts --include="apps/admin/app/**/*.tsx"
  ts-node scripts/codemods/add-subway-classes.ts --since=main
      `);
      process.exit(0);
    }
  }

  return options;
}

// Main execution
async function main() {
  try {
    const options = parseArgs();
    const codemod = new SubwayClassCodemod(options);
    await codemod.run();
  } catch (error) {
    console.error('❌ Codemod failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { SubwayClassCodemod, CodemodOptions };