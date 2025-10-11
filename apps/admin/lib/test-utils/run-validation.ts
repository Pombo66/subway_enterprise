/**
 * Script to run cross-page validation tests
 * This script can be run in the browser console or as part of automated testing
 */

import { runCrossPageValidation, generateValidationReport, ValidationResult } from './cross-page-validation';

// Store validation results for both pages
let menuPageResults: ValidationResult[] = [];
let storePageResults: ValidationResult[] = [];

/**
 * Run validation on current page and store results
 */
export function validateCurrentPage(): ValidationResult[] {
  const results = runCrossPageValidation();
  const currentPath = window.location.pathname;
  
  if (currentPath.includes('/menu')) {
    menuPageResults = results;
    console.log('Menu page validation completed');
  } else if (currentPath.includes('/stores')) {
    storePageResults = results;
    console.log('Store page validation completed');
  }
  
  return results;
}

/**
 * Generate comprehensive report comparing both pages
 */
export function generateComparisonReport(): string {
  let report = '\n=== CROSS-PAGE CONSISTENCY VALIDATION REPORT ===\n\n';
  
  // Menu page results
  if (menuPageResults.length > 0) {
    report += '📋 MENU PAGE RESULTS:\n';
    report += generateValidationReport(menuPageResults);
  } else {
    report += '📋 MENU PAGE: Not tested yet\n\n';
  }
  
  // Store page results
  if (storePageResults.length > 0) {
    report += '🏪 STORE PAGE RESULTS:\n';
    report += generateValidationReport(storePageResults);
  } else {
    report += '🏪 STORE PAGE: Not tested yet\n\n';
  }
  
  // Comparison summary
  if (menuPageResults.length > 0 && storePageResults.length > 0) {
    const menuPassed = menuPageResults.filter(r => r.passed).length;
    const menuTotal = menuPageResults.length;
    const storePassed = storePageResults.filter(r => r.passed).length;
    const storeTotal = storePageResults.length;
    
    report += '📊 COMPARISON SUMMARY:\n';
    report += `Menu Page Success Rate: ${((menuPassed / menuTotal) * 100).toFixed(1)}%\n`;
    report += `Store Page Success Rate: ${((storePassed / storeTotal) * 100).toFixed(1)}%\n`;
    
    // Find common issues
    const menuIssues = menuPageResults.filter(r => !r.passed).map(r => r.message);
    const storeIssues = storePageResults.filter(r => !r.passed).map(r => r.message);
    const commonIssues = menuIssues.filter(issue => storeIssues.includes(issue));
    
    if (commonIssues.length > 0) {
      report += '\n🔍 COMMON ISSUES ACROSS BOTH PAGES:\n';
      commonIssues.forEach(issue => {
        report += `  ❌ ${issue}\n`;
      });
    }
    
    report += '\n';
  }
  
  return report;
}

/**
 * Test drawer functionality (Requirement 4.3)
 */
export function testDrawerFunctionality(): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  // Test ESC key handling
  const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
  document.dispatchEvent(escEvent);
  
  // Check if any drawers are open
  const drawerOverlay = document.querySelector('.drawer-overlay');
  if (drawerOverlay) {
    const drawerStyle = window.getComputedStyle(drawerOverlay);
    if (drawerStyle.display === 'none' || drawerStyle.visibility === 'hidden') {
      results.push({
        passed: true,
        message: 'ESC key properly closes drawers',
        requirement: '4.3'
      });
    } else {
      results.push({
        passed: false,
        message: 'ESC key does not close drawers',
        requirement: '4.3'
      });
    }
  }
  
  // Test drawer styling consistency
  const drawerContent = document.querySelector('.drawer-content');
  if (drawerContent) {
    const contentStyle = window.getComputedStyle(drawerContent);
    if (contentStyle.background === 'rgb(30, 41, 59)' && contentStyle.width === '500px') {
      results.push({
        passed: true,
        message: 'Drawer has consistent styling',
        requirement: '4.3'
      });
    } else {
      results.push({
        passed: false,
        message: 'Drawer does not have consistent styling',
        requirement: '4.3'
      });
    }
  }
  
  return results;
}

/**
 * Manual testing instructions
 */
export function getManualTestingInstructions(): string {
  return `
=== MANUAL TESTING INSTRUCTIONS ===

To complete the cross-page consistency validation, please follow these steps:

1. NAVIGATION TEST:
   - Navigate to /menu page
   - Run: validateCurrentPage()
   - Navigate to /stores page  
   - Run: validateCurrentPage()
   - Run: generateComparisonReport()

2. INTERACTIVE ELEMENTS TEST:
   - On each page, test:
     ✓ Search functionality (type in search box)
     ✓ Filter dropdowns (change selections)
     ✓ Add button (click to open drawer)
     ✓ Table row hover effects
     ✓ Action buttons in table rows

3. DRAWER FUNCTIONALITY TEST:
   - Open add/edit drawers on both pages
   - Test ESC key to close
   - Verify consistent styling and animations
   - Test form submission and cancellation

4. RESPONSIVE DESIGN TEST:
   - Resize browser window to different sizes
   - Verify layouts remain consistent
   - Check mobile responsiveness

5. VISUAL CONSISTENCY TEST:
   - Compare header sections side by side
   - Verify button styling matches
   - Check table/grid layouts are similar
   - Ensure color scheme is consistent

Run generateComparisonReport() after testing both pages to see the complete results.
`;
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as any).validateCurrentPage = validateCurrentPage;
  (window as any).generateComparisonReport = generateComparisonReport;
  (window as any).testDrawerFunctionality = testDrawerFunctionality;
  (window as any).getManualTestingInstructions = getManualTestingInstructions;
}