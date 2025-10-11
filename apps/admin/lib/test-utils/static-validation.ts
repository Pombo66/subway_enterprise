/**
 * Static validation - checks code structure without running in browser
 * This validates the implementation against requirements before runtime testing
 */

import fs from 'fs';
import path from 'path';

export interface StaticValidationResult {
  requirement: string;
  test: string;
  passed: boolean;
  message: string;
  file?: string;
}

/**
 * Validate CSS structure and organization (Requirement 3.1-3.4)
 */
export function validateCSSStructure(cssContent: string): StaticValidationResult[] {
  const results: StaticValidationResult[] = [];

  // Check if CSS is properly formatted (not minified)
  const isMinified = cssContent.includes('}{') || cssContent.split('\n').length < 50;
  results.push({
    requirement: '3.1',
    test: 'CSS formatting',
    passed: !isMinified,
    message: isMinified ? 'CSS appears to be minified/compressed' : 'CSS is properly formatted and readable'
  });

  // Check for logical organization with comments
  const hasComments = cssContent.includes('/*') && cssContent.includes('*/');
  const hasBaseStyles = cssContent.includes('Base Styles') || cssContent.includes('base');
  const hasLayoutComponents = cssContent.includes('Layout Components') || cssContent.includes('layout');
  
  results.push({
    requirement: '3.3',
    test: 'CSS organization',
    passed: hasComments && hasBaseStyles && hasLayoutComponents,
    message: hasComments && hasBaseStyles && hasLayoutComponents 
      ? 'CSS is well organized with comments and sections'
      : 'CSS lacks proper organization or comments'
  });

  // Check for consistent naming conventions
  const hasSystemClasses = cssContent.includes('.s-') && cssContent.includes('.menu-') && cssContent.includes('.stores-');
  results.push({
    requirement: '3.3',
    test: 'CSS naming conventions',
    passed: hasSystemClasses,
    message: hasSystemClasses 
      ? 'CSS follows consistent naming conventions (.s-, .menu-, .stores-)'
      : 'CSS naming conventions are inconsistent'
  });

  // Check for grid-based table styles
  const hasGridStyles = cssContent.includes('display: grid') && cssContent.includes('grid-template-columns');
  results.push({
    requirement: '1.1',
    test: 'Grid-based table layout',
    passed: hasGridStyles,
    message: hasGridStyles 
      ? 'CSS includes grid-based table layouts'
      : 'CSS missing grid-based table layouts'
  });

  return results;
}

/**
 * Validate MenuTable component structure (Requirement 1.1-1.4)
 */
export function validateMenuTableStructure(componentContent: string): StaticValidationResult[] {
  const results: StaticValidationResult[] = [];

  // Check if component uses grid structure (not HTML table)
  const usesHTMLTable = componentContent.includes('<table>') || componentContent.includes('<thead>') || componentContent.includes('<tbody>');
  const usesGridStructure = componentContent.includes('menu-table') && componentContent.includes('menu-header') && componentContent.includes('menu-body');
  
  results.push({
    requirement: '1.1',
    test: 'Table structure',
    passed: !usesHTMLTable && usesGridStructure,
    message: usesHTMLTable 
      ? 'Component uses HTML table structure instead of grid'
      : usesGridStructure 
        ? 'Component uses proper grid-based structure'
        : 'Component structure unclear'
  });

  // Check for proper CSS classes
  const hasProperClasses = componentContent.includes('menu-cell-left') && componentContent.includes('menu-cell-center');
  results.push({
    requirement: '1.2',
    test: 'CSS class usage',
    passed: hasProperClasses,
    message: hasProperClasses 
      ? 'Component uses proper alignment classes'
      : 'Component missing proper alignment classes'
  });

  // Check for hover state support
  const hasHoverSupport = componentContent.includes('hover') || componentContent.includes('menu-row');
  results.push({
    requirement: '1.3',
    test: 'Hover state support',
    passed: hasHoverSupport,
    message: hasHoverSupport 
      ? 'Component supports hover states'
      : 'Component may not support hover states'
  });

  // Check for action buttons
  const hasActionButtons = componentContent.includes('onEdit') && componentContent.includes('onDelete');
  results.push({
    requirement: '1.4',
    test: 'Action buttons',
    passed: hasActionButtons,
    message: hasActionButtons 
      ? 'Component includes proper action buttons'
      : 'Component missing action buttons'
  });

  return results;
}

/**
 * Validate page structure consistency (Requirement 4.1-4.4)
 */
export function validatePageStructureConsistency(menuPageContent: string, storePageContent: string): StaticValidationResult[] {
  const results: StaticValidationResult[] = [];

  // Check header section consistency
  const menuHasHeaderSection = menuPageContent.includes('menu-header-section');
  const storeHasHeaderSection = storePageContent.includes('menu-header-section');
  
  results.push({
    requirement: '4.1',
    test: 'Header section consistency',
    passed: menuHasHeaderSection && storeHasHeaderSection,
    message: menuHasHeaderSection && storeHasHeaderSection 
      ? 'Both pages use consistent header section structure'
      : 'Pages have inconsistent header section structure'
  });

  // Check filters section consistency
  const menuHasFilters = menuPageContent.includes('filters-section');
  const storeHasFilters = storePageContent.includes('filters-section');
  
  results.push({
    requirement: '4.2',
    test: 'Filters section consistency',
    passed: menuHasFilters && storeHasFilters,
    message: menuHasFilters && storeHasFilters 
      ? 'Both pages use consistent filters section'
      : 'Pages have inconsistent filters section'
  });

  // Check search container consistency
  const menuHasSearch = menuPageContent.includes('search-container');
  const storeHasSearch = storePageContent.includes('search-container');
  
  results.push({
    requirement: '4.2',
    test: 'Search container consistency',
    passed: menuHasSearch && storeHasSearch,
    message: menuHasSearch && storeHasSearch 
      ? 'Both pages use consistent search containers'
      : 'Pages have inconsistent search containers'
  });

  // Check drawer component consistency
  const menuHasDrawer = menuPageContent.includes('drawer-overlay') && menuPageContent.includes('drawer-content');
  const storeHasDrawer = storePageContent.includes('drawer-overlay') && storePageContent.includes('drawer-content');
  
  results.push({
    requirement: '4.3',
    test: 'Drawer component consistency',
    passed: menuHasDrawer && storeHasDrawer,
    message: menuHasDrawer && storeHasDrawer 
      ? 'Both pages use consistent drawer components'
      : 'Pages have inconsistent drawer components'
  });

  // Check ESC key handling
  const menuHasEscHandling = menuPageContent.includes('Escape') && menuPageContent.includes('keydown');
  const storeHasEscHandling = storePageContent.includes('Escape') && storePageContent.includes('keydown');
  
  results.push({
    requirement: '4.3',
    test: 'ESC key handling',
    passed: menuHasEscHandling && storeHasEscHandling,
    message: menuHasEscHandling && storeHasEscHandling 
      ? 'Both pages implement ESC key handling'
      : 'Pages have inconsistent ESC key handling'
  });

  return results;
}

/**
 * Run complete static validation
 */
export function runStaticValidation(): StaticValidationResult[] {
  const results: StaticValidationResult[] = [];

  try {
    // Read CSS file
    const cssPath = path.join(process.cwd(), 'apps/admin/app/globals.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    results.push(...validateCSSStructure(cssContent));

    // Read MenuTable component
    const menuTablePath = path.join(process.cwd(), 'apps/admin/app/menu/components/MenuTable.tsx');
    const menuTableContent = fs.readFileSync(menuTablePath, 'utf-8');
    results.push(...validateMenuTableStructure(menuTableContent));

    // Read page files
    const menuPagePath = path.join(process.cwd(), 'apps/admin/app/menu/page.tsx');
    const storePagePath = path.join(process.cwd(), 'apps/admin/app/stores/page.tsx');
    const menuPageContent = fs.readFileSync(menuPagePath, 'utf-8');
    const storePageContent = fs.readFileSync(storePagePath, 'utf-8');
    results.push(...validatePageStructureConsistency(menuPageContent, storePageContent));

  } catch (error) {
    results.push({
      requirement: 'SYSTEM',
      test: 'File access',
      passed: false,
      message: `Error reading files: ${error}`,
    });
  }

  return results;
}

/**
 * Generate static validation report
 */
export function generateStaticValidationReport(results: StaticValidationResult[]): string {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  let report = '\n=== STATIC CODE VALIDATION REPORT ===\n';
  report += `Total Tests: ${total}\n`;
  report += `Passed: ${passed}\n`;
  report += `Failed: ${failed}\n`;
  report += `Success Rate: ${((passed / total) * 100).toFixed(1)}%\n\n`;

  // Group by requirement
  const byRequirement = results.reduce((acc, result) => {
    if (!acc[result.requirement]) {
      acc[result.requirement] = [];
    }
    acc[result.requirement].push(result);
    return acc;
  }, {} as Record<string, StaticValidationResult[]>);

  Object.keys(byRequirement).sort().forEach(req => {
    report += `Requirement ${req}:\n`;
    byRequirement[req].forEach(result => {
      const status = result.passed ? '✅' : '❌';
      report += `  ${status} ${result.test}: ${result.message}\n`;
      if (result.file) {
        report += `    File: ${result.file}\n`;
      }
    });
    report += '\n';
  });

  return report;
}