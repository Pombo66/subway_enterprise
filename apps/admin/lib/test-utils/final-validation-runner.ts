/**
 * Final validation test runner
 * Combines cross-page consistency validation (5.1) and visual/functional testing (5.2)
 */

import { runCrossPageValidation, generateValidationReport, ValidationResult } from './cross-page-validation';
import { runVisualFunctionalTesting, generateVisualFunctionalReport } from './visual-functional-testing';

export interface FinalValidationResults {
  crossPageConsistency: ValidationResult[];
  visualFunctional: {
    responsive: any[];
    hover: any[];
    accessibility: any[];
  };
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
  };
}

/**
 * Run complete final validation (both subtasks 5.1 and 5.2)
 */
export function runFinalValidation(): FinalValidationResults {
  console.log('🚀 Starting Final Validation Testing...');
  
  // Run cross-page consistency validation (5.1)
  console.log('📋 Running cross-page consistency validation...');
  const crossPageResults = runCrossPageValidation();
  
  // Run visual and functional testing (5.2)
  console.log('🎨 Running visual and functional testing...');
  const visualFunctionalResults = runVisualFunctionalTesting();
  
  // Calculate summary statistics
  const crossPagePassed = crossPageResults.filter(r => r.passed).length;
  const visualFunctionalPassed = 
    visualFunctionalResults.responsive.filter(r => r.passed).length +
    visualFunctionalResults.hover.filter(r => r.passed).length +
    visualFunctionalResults.accessibility.filter(r => r.passed).length;
  
  const totalTests = 
    crossPageResults.length +
    visualFunctionalResults.responsive.length +
    visualFunctionalResults.hover.length +
    visualFunctionalResults.accessibility.length;
  
  const passedTests = crossPagePassed + visualFunctionalPassed;
  const failedTests = totalTests - passedTests;
  const successRate = (passedTests / totalTests) * 100;
  
  console.log('✅ Final validation completed');
  
  return {
    crossPageConsistency: crossPageResults,
    visualFunctional: visualFunctionalResults,
    summary: {
      totalTests,
      passedTests,
      failedTests,
      successRate
    }
  };
}

/**
 * Generate comprehensive final validation report
 */
export function generateFinalValidationReport(results: FinalValidationResults): string {
  let report = '\n';
  report += '═══════════════════════════════════════════════════════════════\n';
  report += '                    FINAL VALIDATION REPORT                    \n';
  report += '                 Menu Stores Regression Fix                    \n';
  report += '═══════════════════════════════════════════════════════════════\n\n';
  
  // Executive Summary
  report += '📊 EXECUTIVE SUMMARY:\n';
  report += `Total Tests Executed: ${results.summary.totalTests}\n`;
  report += `Tests Passed: ${results.summary.passedTests}\n`;
  report += `Tests Failed: ${results.summary.failedTests}\n`;
  report += `Overall Success Rate: ${results.summary.successRate.toFixed(1)}%\n\n`;
  
  // Status indicator
  if (results.summary.successRate >= 95) {
    report += '🎉 STATUS: EXCELLENT - Ready for production\n';
  } else if (results.summary.successRate >= 85) {
    report += '✅ STATUS: GOOD - Minor issues to address\n';
  } else if (results.summary.successRate >= 70) {
    report += '⚠️ STATUS: NEEDS ATTENTION - Several issues found\n';
  } else {
    report += '❌ STATUS: CRITICAL - Major issues require fixing\n';
  }
  report += '\n';
  
  // Task 5.1 Results - Cross-page Consistency
  report += '═══ TASK 5.1: CROSS-PAGE CONSISTENCY VALIDATION ═══\n';
  report += generateValidationReport(results.crossPageConsistency);
  
  // Task 5.2 Results - Visual and Functional Testing
  report += '═══ TASK 5.2: VISUAL AND FUNCTIONAL TESTING ═══\n';
  report += generateVisualFunctionalReport(results.visualFunctional);
  
  // Requirements Coverage
  report += '═══ REQUIREMENTS COVERAGE ANALYSIS ═══\n';
  const requirementsCoverage = analyzeRequirementsCoverage(results);
  Object.keys(requirementsCoverage).sort().forEach(req => {
    const coverage = requirementsCoverage[req];
    const status = coverage.passed >= coverage.total * 0.8 ? '✅' : '❌';
    report += `${status} Requirement ${req}: ${coverage.passed}/${coverage.total} tests passed\n`;
  });
  report += '\n';
  
  // Action Items
  report += '═══ RECOMMENDED ACTION ITEMS ═══\n';
  const actionItems = generateActionItems(results);
  if (actionItems.length === 0) {
    report += '🎉 No action items - all tests passed!\n';
  } else {
    actionItems.forEach((item, index) => {
      report += `${index + 1}. ${item}\n`;
    });
  }
  report += '\n';
  
  // Testing Instructions for Manual Verification
  report += '═══ MANUAL VERIFICATION CHECKLIST ═══\n';
  report += getManualVerificationChecklist();
  
  report += '═══════════════════════════════════════════════════════════════\n';
  report += '                        END OF REPORT                          \n';
  report += '═══════════════════════════════════════════════════════════════\n';
  
  return report;
}

/**
 * Analyze requirements coverage
 */
function analyzeRequirementsCoverage(results: FinalValidationResults): Record<string, { passed: number; total: number }> {
  const coverage: Record<string, { passed: number; total: number }> = {};
  
  // Analyze cross-page consistency results
  results.crossPageConsistency.forEach(result => {
    if (!coverage[result.requirement]) {
      coverage[result.requirement] = { passed: 0, total: 0 };
    }
    coverage[result.requirement].total++;
    if (result.passed) {
      coverage[result.requirement].passed++;
    }
  });
  
  // Analyze visual/functional results
  results.visualFunctional.accessibility.forEach(result => {
    if (!coverage[result.requirement]) {
      coverage[result.requirement] = { passed: 0, total: 0 };
    }
    coverage[result.requirement].total++;
    if (result.passed) {
      coverage[result.requirement].passed++;
    }
  });
  
  return coverage;
}

/**
 * Generate action items based on test results
 */
function generateActionItems(results: FinalValidationResults): string[] {
  const actionItems: string[] = [];
  
  // Check for failed cross-page consistency tests
  const failedConsistency = results.crossPageConsistency.filter(r => !r.passed);
  if (failedConsistency.length > 0) {
    actionItems.push(`Fix ${failedConsistency.length} cross-page consistency issues`);
  }
  
  // Check for responsive design issues
  const failedResponsive = results.visualFunctional.responsive.filter(r => !r.passed);
  if (failedResponsive.length > 0) {
    actionItems.push(`Address responsive design issues on ${failedResponsive.length} breakpoints`);
  }
  
  // Check for hover state issues
  const failedHover = results.visualFunctional.hover.filter(r => !r.passed);
  if (failedHover.length > 0) {
    actionItems.push(`Fix hover states for ${failedHover.length} interactive elements`);
  }
  
  // Check for accessibility issues
  const failedAccessibility = results.visualFunctional.accessibility.filter(r => !r.passed);
  if (failedAccessibility.length > 0) {
    actionItems.push(`Improve accessibility for ${failedAccessibility.length} elements`);
  }
  
  return actionItems;
}

/**
 * Get manual verification checklist
 */
function getManualVerificationChecklist(): string {
  return `
Please manually verify the following items:

🔍 NAVIGATION TESTING:
  □ Navigate between /menu and /stores pages
  □ Verify consistent header layout and styling
  □ Check that page transitions are smooth
  □ Confirm breadcrumbs or navigation indicators work

🎯 INTERACTIVE ELEMENTS:
  □ Click all buttons and verify they respond appropriately
  □ Test search functionality on both pages
  □ Try all filter dropdowns and verify they work
  □ Test table sorting (if implemented)
  □ Verify pagination controls (if applicable)

📱 RESPONSIVE DESIGN:
  □ Test on mobile devices (375px width)
  □ Test on tablets (768px width)
  □ Test on desktop (1024px+ width)
  □ Verify horizontal scrolling works on mobile tables
  □ Check that touch targets are appropriately sized

🎨 VISUAL CONSISTENCY:
  □ Compare color schemes between pages
  □ Verify font sizes and weights are consistent
  □ Check spacing and padding consistency
  □ Ensure icons and graphics are aligned

♿ ACCESSIBILITY:
  □ Navigate using only keyboard (Tab, Enter, Escape)
  □ Test with screen reader (if available)
  □ Verify sufficient color contrast
  □ Check that all interactive elements have focus indicators

🔧 DRAWER/MODAL FUNCTIONALITY:
  □ Open add/edit drawers on both pages
  □ Test ESC key to close drawers
  □ Verify form validation works
  □ Test successful form submission
  □ Check error handling in forms

📊 DATA OPERATIONS:
  □ Create new menu items and stores
  □ Edit existing items
  □ Delete items (with confirmation)
  □ Verify data persistence
  □ Test error scenarios (network issues, validation errors)

`;
}

/**
 * Export test runner for browser console
 */
if (typeof window !== 'undefined') {
  (window as any).runFinalValidation = runFinalValidation;
  (window as any).generateFinalValidationReport = generateFinalValidationReport;
  
  // Convenience function to run everything and display results
  (window as any).runCompleteValidation = function() {
    const results = runFinalValidation();
    const report = generateFinalValidationReport(results);
    console.log(report);
    return results;
  };
}