/**
 * Visual and functional testing utility
 * Tests responsive design, hover states, and accessibility according to requirements 1.1-2.4
 */

export interface ResponsiveTestResult {
  breakpoint: string;
  width: number;
  passed: boolean;
  issues: string[];
}

export interface HoverTestResult {
  element: string;
  passed: boolean;
  message: string;
}

export interface AccessibilityTestResult {
  test: string;
  passed: boolean;
  message: string;
  requirement: string;
}

/**
 * Test responsive design at different breakpoints
 */
export function testResponsiveDesign(): ResponsiveTestResult[] {
  const breakpoints = [
    { name: 'Mobile', width: 375 },
    { name: 'Tablet', width: 768 },
    { name: 'Desktop', width: 1024 },
    { name: 'Large Desktop', width: 1440 }
  ];

  const results: ResponsiveTestResult[] = [];
  const originalWidth = window.innerWidth;

  breakpoints.forEach(breakpoint => {
    // Simulate viewport resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: breakpoint.width,
    });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));

    const issues: string[] = [];
    
    // Test header section responsiveness
    const headerSection = document.querySelector('.menu-header-section');
    if (headerSection) {
      const headerStyle = window.getComputedStyle(headerSection);
      if (breakpoint.width < 768 && headerStyle.flexDirection !== 'column') {
        issues.push('Header should stack vertically on mobile');
      }
    }

    // Test filters section responsiveness
    const filtersSection = document.querySelector('.filters-section');
    if (filtersSection) {
      const filtersStyle = window.getComputedStyle(filtersSection);
      if (breakpoint.width < 768 && filtersStyle.flexWrap !== 'wrap') {
        issues.push('Filters should wrap on mobile');
      }
    }

    // Test table responsiveness
    const dataTable = document.querySelector('.menu-table, .stores-table');
    if (dataTable) {
      const tableStyle = window.getComputedStyle(dataTable);
      if (breakpoint.width < 768) {
        // On mobile, table should be scrollable or have modified layout
        const hasHorizontalScroll = dataTable.scrollWidth > dataTable.clientWidth;
        if (!hasHorizontalScroll && tableStyle.overflowX !== 'auto') {
          issues.push('Table should be horizontally scrollable on mobile');
        }
      }
    }

    // Test search container responsiveness
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) {
      const searchStyle = window.getComputedStyle(searchContainer);
      if (breakpoint.width < 768 && searchStyle.minWidth !== 'auto') {
        issues.push('Search container should adapt to mobile width');
      }
    }

    results.push({
      breakpoint: breakpoint.name,
      width: breakpoint.width,
      passed: issues.length === 0,
      issues
    });
  });

  // Restore original width
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: originalWidth,
  });
  window.dispatchEvent(new Event('resize'));

  return results;
}

/**
 * Test hover states and interactive feedback
 */
export function testHoverStates(): HoverTestResult[] {
  const results: HoverTestResult[] = [];

  // Test table row hover
  const tableRows = document.querySelectorAll('.menu-row, .stores-row');
  if (tableRows.length > 0) {
    const firstRow = tableRows[0] as HTMLElement;
    const originalBackground = window.getComputedStyle(firstRow).backgroundColor;
    
    // Simulate hover
    firstRow.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    const hoverBackground = window.getComputedStyle(firstRow).backgroundColor;
    
    if (hoverBackground !== originalBackground) {
      results.push({
        element: 'Table rows',
        passed: true,
        message: 'Table rows have proper hover state'
      });
    } else {
      results.push({
        element: 'Table rows',
        passed: false,
        message: 'Table rows do not change on hover'
      });
    }
    
    // Remove hover
    firstRow.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
  }

  // Test button hover states
  const buttons = document.querySelectorAll('.s-btn, .menu-add-button-custom, .menu-action-btn, .stores-action-btn');
  buttons.forEach((button, index) => {
    const buttonElement = button as HTMLElement;
    const originalBackground = window.getComputedStyle(buttonElement).backgroundColor;
    
    // Simulate hover
    buttonElement.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    const hoverBackground = window.getComputedStyle(buttonElement).backgroundColor;
    
    if (hoverBackground !== originalBackground) {
      results.push({
        element: `Button ${index + 1}`,
        passed: true,
        message: `Button ${index + 1} has proper hover state`
      });
    } else {
      results.push({
        element: `Button ${index + 1}`,
        passed: false,
        message: `Button ${index + 1} does not change on hover`
      });
    }
    
    // Remove hover
    buttonElement.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
  });

  // Test input focus states
  const inputs = document.querySelectorAll('.s-input');
  inputs.forEach((input, index) => {
    const inputElement = input as HTMLElement;
    const originalBorder = window.getComputedStyle(inputElement).borderColor;
    
    // Simulate focus
    inputElement.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    const focusBorder = window.getComputedStyle(inputElement).borderColor;
    
    if (focusBorder !== originalBorder) {
      results.push({
        element: `Input ${index + 1}`,
        passed: true,
        message: `Input ${index + 1} has proper focus state`
      });
    } else {
      results.push({
        element: `Input ${index + 1}`,
        passed: false,
        message: `Input ${index + 1} does not change on focus`
      });
    }
    
    // Remove focus
    inputElement.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  });

  return results;
}

/**
 * Test contrast and readability
 */
export function testContrastAndReadability(): AccessibilityTestResult[] {
  const results: AccessibilityTestResult[] = [];

  // Helper function to calculate contrast ratio
  function getContrastRatio(foreground: string, background: string): number {
    // Simplified contrast calculation - in real implementation, use proper color parsing
    const fgLuminance = getLuminance(foreground);
    const bgLuminance = getLuminance(background);
    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function getLuminance(color: string): number {
    // Simplified luminance calculation
    // In real implementation, properly parse RGB values
    if (color.includes('rgb(255, 255, 255)') || color === 'white') return 1;
    if (color.includes('rgb(0, 0, 0)') || color === 'black') return 0;
    if (color.includes('rgb(148, 163, 184)')) return 0.4; // gray-400
    if (color.includes('rgb(30, 41, 59)')) return 0.1; // slate-800
    return 0.5; // default
  }

  // Test main text contrast
  const titleElement = document.querySelector('.s-h1');
  if (titleElement) {
    const titleStyle = window.getComputedStyle(titleElement);
    const titleColor = titleStyle.color;
    const titleBackground = titleStyle.backgroundColor || 'rgb(15, 23, 42)'; // default background
    
    const contrast = getContrastRatio(titleColor, titleBackground);
    results.push({
      test: 'Title contrast',
      passed: contrast >= 4.5, // WCAG AA standard
      message: `Title contrast ratio: ${contrast.toFixed(2)} (minimum 4.5 required)`,
      requirement: '2.2'
    });
  }

  // Test table text contrast
  const tableCell = document.querySelector('.menu-cell, .stores-cell');
  if (tableCell) {
    const cellStyle = window.getComputedStyle(tableCell);
    const cellColor = cellStyle.color;
    const cellBackground = cellStyle.backgroundColor || 'rgb(30, 41, 59)';
    
    const contrast = getContrastRatio(cellColor, cellBackground);
    results.push({
      test: 'Table text contrast',
      passed: contrast >= 4.5,
      message: `Table text contrast ratio: ${contrast.toFixed(2)} (minimum 4.5 required)`,
      requirement: '2.2'
    });
  }

  // Test button text contrast
  const button = document.querySelector('.s-btn');
  if (button) {
    const buttonStyle = window.getComputedStyle(button);
    const buttonColor = buttonStyle.color;
    const buttonBackground = buttonStyle.backgroundColor;
    
    const contrast = getContrastRatio(buttonColor, buttonBackground);
    results.push({
      test: 'Button text contrast',
      passed: contrast >= 4.5,
      message: `Button text contrast ratio: ${contrast.toFixed(2)} (minimum 4.5 required)`,
      requirement: '1.4'
    });
  }

  // Test font sizes for readability
  const bodyText = document.querySelector('.menu-cell, .stores-cell, .form-label');
  if (bodyText) {
    const textStyle = window.getComputedStyle(bodyText);
    const fontSize = parseFloat(textStyle.fontSize);
    
    results.push({
      test: 'Font size readability',
      passed: fontSize >= 14, // 14px minimum for readability
      message: `Body text font size: ${fontSize}px (minimum 14px recommended)`,
      requirement: '2.2'
    });
  }

  return results;
}

/**
 * Test keyboard navigation and accessibility
 */
export function testKeyboardNavigation(): AccessibilityTestResult[] {
  const results: AccessibilityTestResult[] = [];

  // Test tab navigation
  const focusableElements = document.querySelectorAll(
    'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length > 0) {
    results.push({
      test: 'Focusable elements present',
      passed: true,
      message: `Found ${focusableElements.length} focusable elements`,
      requirement: '1.3'
    });

    // Test if elements have proper focus indicators
    let elementsWithFocusIndicator = 0;
    focusableElements.forEach(element => {
      const elementStyle = window.getComputedStyle(element);
      if (elementStyle.outline !== 'none' || elementStyle.boxShadow.includes('focus')) {
        elementsWithFocusIndicator++;
      }
    });

    results.push({
      test: 'Focus indicators',
      passed: elementsWithFocusIndicator > 0,
      message: `${elementsWithFocusIndicator}/${focusableElements.length} elements have focus indicators`,
      requirement: '1.3'
    });
  }

  // Test ARIA labels and roles
  const buttonsWithLabels = document.querySelectorAll('button[aria-label], button[title]');
  const totalButtons = document.querySelectorAll('button').length;
  
  results.push({
    test: 'Button accessibility labels',
    passed: buttonsWithLabels.length === totalButtons,
    message: `${buttonsWithLabels.length}/${totalButtons} buttons have accessibility labels`,
    requirement: '1.4'
  });

  return results;
}

/**
 * Run complete visual and functional testing
 */
export function runVisualFunctionalTesting(): {
  responsive: ResponsiveTestResult[];
  hover: HoverTestResult[];
  accessibility: AccessibilityTestResult[];
} {
  return {
    responsive: testResponsiveDesign(),
    hover: testHoverStates(),
    accessibility: [
      ...testContrastAndReadability(),
      ...testKeyboardNavigation()
    ]
  };
}

/**
 * Generate visual and functional testing report
 */
export function generateVisualFunctionalReport(results: {
  responsive: ResponsiveTestResult[];
  hover: HoverTestResult[];
  accessibility: AccessibilityTestResult[];
}): string {
  let report = '\n=== VISUAL AND FUNCTIONAL TESTING REPORT ===\n\n';

  // Responsive design results
  report += '📱 RESPONSIVE DESIGN TESTING:\n';
  results.responsive.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    report += `  ${status} ${result.breakpoint} (${result.width}px)\n`;
    if (result.issues.length > 0) {
      result.issues.forEach(issue => {
        report += `    - ${issue}\n`;
      });
    }
  });
  report += '\n';

  // Hover states results
  report += '🖱️ HOVER STATES TESTING:\n';
  results.hover.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    report += `  ${status} ${result.message}\n`;
  });
  report += '\n';

  // Accessibility results
  report += '♿ ACCESSIBILITY TESTING:\n';
  const accessibilityByRequirement = results.accessibility.reduce((acc, result) => {
    if (!acc[result.requirement]) {
      acc[result.requirement] = [];
    }
    acc[result.requirement].push(result);
    return acc;
  }, {} as Record<string, AccessibilityTestResult[]>);

  Object.keys(accessibilityByRequirement).sort().forEach(req => {
    report += `  Requirement ${req}:\n`;
    accessibilityByRequirement[req].forEach(result => {
      const status = result.passed ? '✅' : '❌';
      report += `    ${status} ${result.message}\n`;
    });
  });
  report += '\n';

  // Summary
  const totalResponsive = results.responsive.length;
  const passedResponsive = results.responsive.filter(r => r.passed).length;
  const totalHover = results.hover.length;
  const passedHover = results.hover.filter(r => r.passed).length;
  const totalAccessibility = results.accessibility.length;
  const passedAccessibility = results.accessibility.filter(r => r.passed).length;

  report += '📊 SUMMARY:\n';
  report += `Responsive Design: ${passedResponsive}/${totalResponsive} passed (${((passedResponsive/totalResponsive)*100).toFixed(1)}%)\n`;
  report += `Hover States: ${passedHover}/${totalHover} passed (${((passedHover/totalHover)*100).toFixed(1)}%)\n`;
  report += `Accessibility: ${passedAccessibility}/${totalAccessibility} passed (${((passedAccessibility/totalAccessibility)*100).toFixed(1)}%)\n`;

  return report;
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as any).runVisualFunctionalTesting = runVisualFunctionalTesting;
  (window as any).generateVisualFunctionalReport = generateVisualFunctionalReport;
  (window as any).testResponsiveDesign = testResponsiveDesign;
  (window as any).testHoverStates = testHoverStates;
  (window as any).testContrastAndReadability = testContrastAndReadability;
}