/**
 * Browser console setup for validation testing
 * This script adds validation functions to the global window object for easy testing
 */

import { runFinalValidation, generateFinalValidationReport } from './final-validation-runner';
import { runCrossPageValidation, generateValidationReport } from './cross-page-validation';
import { runVisualFunctionalTesting, generateVisualFunctionalReport } from './visual-functional-testing';

// Add validation functions to window object for console access
declare global {
  interface Window {
    // Main validation functions
    runCompleteValidation: () => void;
    runCrossPageValidation: () => void;
    runVisualFunctionalTesting: () => void;
    
    // Individual test functions
    testCurrentPage: () => void;
    testResponsiveDesign: () => void;
    testHoverStates: () => void;
    testAccessibility: () => void;
    
    // Utility functions
    showTestingInstructions: () => void;
    clearConsole: () => void;
  }
}

// Setup console functions
if (typeof window !== 'undefined') {
  // Main validation function
  window.runCompleteValidation = function() {
    console.clear();
    console.log('🚀 Starting Complete Validation Testing...');
    console.log('Current page:', window.location.pathname);
    
    try {
      const results = runFinalValidation();
      const report = generateFinalValidationReport(results);
      
      console.log(report);
      
      // Also return results for programmatic access
      return results;
    } catch (error) {
      console.error('❌ Error running validation:', error);
      return null;
    }
  };

  // Cross-page consistency validation
  window.runCrossPageValidation = function() {
    console.log('📋 Running Cross-Page Consistency Validation...');
    
    try {
      const results = runCrossPageValidation();
      const report = generateValidationReport(results);
      
      console.log(report);
      return results;
    } catch (error) {
      console.error('❌ Error running cross-page validation:', error);
      return null;
    }
  };

  // Visual and functional testing
  window.runVisualFunctionalTesting = function() {
    console.log('🎨 Running Visual and Functional Testing...');
    
    try {
      const results = runVisualFunctionalTesting();
      const report = generateVisualFunctionalReport(results);
      
      console.log(report);
      return results;
    } catch (error) {
      console.error('❌ Error running visual/functional testing:', error);
      return null;
    }
  };

  // Test current page specifically
  window.testCurrentPage = function() {
    const currentPath = window.location.pathname;
    console.log(`🔍 Testing current page: ${currentPath}`);
    
    if (currentPath.includes('/menu')) {
      console.log('📋 Detected Menu page - running menu-specific tests...');
    } else if (currentPath.includes('/stores')) {
      console.log('🏪 Detected Store page - running store-specific tests...');
    } else {
      console.log('ℹ️ Generic page detected - running general tests...');
    }
    
    return window.runCompleteValidation();
  };

  // Individual test functions
  window.testResponsiveDesign = function() {
    console.log('📱 Testing Responsive Design...');
    try {
      const { testResponsiveDesign } = require('./visual-functional-testing');
      const results = testResponsiveDesign();
      
      console.log('Responsive Design Results:');
      results.forEach((result: any) => {
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${result.breakpoint} (${result.width}px)`);
        if (result.issues.length > 0) {
          result.issues.forEach((issue: string) => console.log(`  - ${issue}`));
        }
      });
      
      return results;
    } catch (error) {
      console.error('❌ Error testing responsive design:', error);
      return null;
    }
  };

  window.testHoverStates = function() {
    console.log('🖱️ Testing Hover States...');
    try {
      const { testHoverStates } = require('./visual-functional-testing');
      const results = testHoverStates();
      
      console.log('Hover States Results:');
      results.forEach((result: any) => {
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${result.message}`);
      });
      
      return results;
    } catch (error) {
      console.error('❌ Error testing hover states:', error);
      return null;
    }
  };

  window.testAccessibility = function() {
    console.log('♿ Testing Accessibility...');
    try {
      const { testContrastAndReadability, testKeyboardNavigation } = require('./visual-functional-testing');
      const contrastResults = testContrastAndReadability();
      const keyboardResults = testKeyboardNavigation();
      
      console.log('Accessibility Results:');
      [...contrastResults, ...keyboardResults].forEach(result => {
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${result.message}`);
      });
      
      return { contrast: contrastResults, keyboard: keyboardResults };
    } catch (error) {
      console.error('❌ Error testing accessibility:', error);
      return null;
    }
  };

  // Utility functions
  window.showTestingInstructions = function() {
    console.log(`
🧪 VALIDATION TESTING CONSOLE COMMANDS

Main Commands:
  runCompleteValidation()     - Run all validation tests
  testCurrentPage()          - Test the current page specifically
  
Individual Test Categories:
  runCrossPageValidation()   - Test cross-page consistency (Task 5.1)
  runVisualFunctionalTesting() - Test visual/functional aspects (Task 5.2)
  
Specific Tests:
  testResponsiveDesign()     - Test responsive breakpoints
  testHoverStates()          - Test hover interactions
  testAccessibility()        - Test accessibility features
  
Utilities:
  showTestingInstructions()  - Show this help
  clearConsole()             - Clear the console

Testing Workflow:
1. Navigate to /menu page
2. Run: testCurrentPage()
3. Navigate to /stores page  
4. Run: testCurrentPage()
5. Compare results and fix any issues

For best results, test on different screen sizes and with different input methods.
    `);
  };

  window.clearConsole = function() {
    console.clear();
    console.log('🧹 Console cleared. Type showTestingInstructions() for help.');
  };

  // Show instructions on load
  console.log('🧪 Validation testing functions loaded!');
  console.log('Type showTestingInstructions() for available commands.');
}

export {};