/**
 * Test utilities index - exports all validation functions
 */

// Cross-page consistency validation (Task 5.1)
export {
  runCrossPageValidation,
  generateValidationReport,
  extractPageElements,
  validateHeaderConsistency,
  validateControlsConsistency,
  validateTableConsistency,
  testInteractiveElements,
  type ValidationResult,
  type PageElements
} from './cross-page-validation';

export {
  validateCurrentPage,
  generateComparisonReport,
  testDrawerFunctionality,
  getManualTestingInstructions
} from './run-validation';

// Visual and functional testing (Task 5.2)
export {
  runVisualFunctionalTesting,
  generateVisualFunctionalReport,
  testResponsiveDesign,
  testHoverStates,
  testContrastAndReadability,
  testKeyboardNavigation,
  type ResponsiveTestResult,
  type HoverTestResult,
  type AccessibilityTestResult
} from './visual-functional-testing';

// Final validation runner (combines both tasks)
export {
  runFinalValidation,
  generateFinalValidationReport,
  type FinalValidationResults
} from './final-validation-runner';

// Convenience function for quick testing
export function quickValidation() {
  console.log('🚀 Running Quick Validation...');
  
  const crossPageResults = runCrossPageValidation();
  const visualResults = runVisualFunctionalTesting();
  
  console.log('\n📋 Cross-page Consistency:');
  console.log(generateValidationReport(crossPageResults));
  
  console.log('\n🎨 Visual & Functional:');
  console.log(generateVisualFunctionalReport(visualResults));
  
  return {
    crossPage: crossPageResults,
    visual: visualResults
  };
}

// Import all functions for browser console access
import { runCrossPageValidation, generateValidationReport } from './cross-page-validation';
import { runVisualFunctionalTesting, generateVisualFunctionalReport } from './visual-functional-testing';
import { runFinalValidation, generateFinalValidationReport } from './final-validation-runner';