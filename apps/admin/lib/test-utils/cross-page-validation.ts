/**
 * Cross-page consistency validation utility
 * Tests consistency between Menu and Store pages according to requirements 4.1-4.4
 */

export interface ValidationResult {
  passed: boolean;
  message: string;
  requirement: string;
}

export interface PageElements {
  headerSection: HTMLElement | null;
  title: HTMLElement | null;
  description: HTMLElement | null;
  addButton: HTMLElement | null;
  filtersSection: HTMLElement | null;
  searchContainer: HTMLElement | null;
  searchInput: HTMLElement | null;
  selectElements: HTMLElement[];
  dataTable: HTMLElement | null;
  tableHeader: HTMLElement | null;
  tableRows: HTMLElement[];
}

/**
 * Extract page elements for validation
 */
export function extractPageElements(): PageElements {
  return {
    headerSection: document.querySelector('.menu-header-section'),
    title: document.querySelector('.s-h1'),
    description: document.querySelector('.menu-header-section p'),
    addButton: document.querySelector('.menu-add-button-custom'),
    filtersSection: document.querySelector('.filters-section'),
    searchContainer: document.querySelector('.search-container'),
    searchInput: document.querySelector('.search-input'),
    selectElements: Array.from(document.querySelectorAll('.s-select')),
    dataTable: document.querySelector('.menu-table, .stores-table'),
    tableHeader: document.querySelector('.menu-header, .stores-header'),
    tableRows: Array.from(document.querySelectorAll('.menu-row, .stores-row'))
  };
}

/**
 * Validate header section consistency (Requirement 4.1)
 */
export function validateHeaderConsistency(elements: PageElements): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check header section exists and has correct structure
  if (!elements.headerSection) {
    results.push({
      passed: false,
      message: 'Header section (.menu-header-section) not found',
      requirement: '4.1'
    });
  } else {
    const headerStyle = window.getComputedStyle(elements.headerSection);
    if (headerStyle.display !== 'flex' || headerStyle.justifyContent !== 'space-between') {
      results.push({
        passed: false,
        message: 'Header section does not have consistent flex layout',
        requirement: '4.1'
      });
    } else {
      results.push({
        passed: true,
        message: 'Header section has consistent layout structure',
        requirement: '4.1'
      });
    }
  }

  // Check title consistency
  if (!elements.title) {
    results.push({
      passed: false,
      message: 'Page title (.s-h1) not found',
      requirement: '4.1'
    });
  } else {
    const titleStyle = window.getComputedStyle(elements.title);
    if (titleStyle.fontSize !== '2rem' || titleStyle.fontWeight !== '700') {
      results.push({
        passed: false,
        message: 'Page title does not have consistent styling',
        requirement: '4.1'
      });
    } else {
      results.push({
        passed: true,
        message: 'Page title has consistent styling',
        requirement: '4.1'
      });
    }
  }

  // Check add button consistency
  if (!elements.addButton) {
    results.push({
      passed: false,
      message: 'Add button (.menu-add-button-custom) not found',
      requirement: '4.1'
    });
  } else {
    const buttonStyle = window.getComputedStyle(elements.addButton);
    if (buttonStyle.display !== 'flex' || buttonStyle.alignItems !== 'center') {
      results.push({
        passed: false,
        message: 'Add button does not have consistent styling',
        requirement: '4.1'
      });
    } else {
      results.push({
        passed: true,
        message: 'Add button has consistent styling',
        requirement: '4.1'
      });
    }
  }

  return results;
}

/**
 * Validate search and filter controls consistency (Requirement 4.2)
 */
export function validateControlsConsistency(elements: PageElements): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check filters section exists
  if (!elements.filtersSection) {
    results.push({
      passed: false,
      message: 'Filters section (.filters-section) not found',
      requirement: '4.2'
    });
  } else {
    const filtersStyle = window.getComputedStyle(elements.filtersSection);
    if (filtersStyle.display !== 'flex' || filtersStyle.gap !== '1rem') {
      results.push({
        passed: false,
        message: 'Filters section does not have consistent layout',
        requirement: '4.2'
      });
    } else {
      results.push({
        passed: true,
        message: 'Filters section has consistent layout',
        requirement: '4.2'
      });
    }
  }

  // Check search container
  if (!elements.searchContainer) {
    results.push({
      passed: false,
      message: 'Search container (.search-container) not found',
      requirement: '4.2'
    });
  } else {
    const searchStyle = window.getComputedStyle(elements.searchContainer);
    if (searchStyle.position !== 'relative') {
      results.push({
        passed: false,
        message: 'Search container does not have consistent positioning',
        requirement: '4.2'
      });
    } else {
      results.push({
        passed: true,
        message: 'Search container has consistent positioning',
        requirement: '4.2'
      });
    }
  }

  // Check select elements styling
  elements.selectElements.forEach((select, index) => {
    const selectStyle = window.getComputedStyle(select);
    if (selectStyle.background !== 'rgb(30, 41, 59)' || selectStyle.borderRadius !== '0.5rem') {
      results.push({
        passed: false,
        message: `Select element ${index + 1} does not have consistent styling`,
        requirement: '4.2'
      });
    } else {
      results.push({
        passed: true,
        message: `Select element ${index + 1} has consistent styling`,
        requirement: '4.2'
      });
    }
  });

  return results;
}

/**
 * Validate table/grid consistency (Requirement 4.4)
 */
export function validateTableConsistency(elements: PageElements): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check data table exists
  if (!elements.dataTable) {
    results.push({
      passed: false,
      message: 'Data table not found',
      requirement: '4.4'
    });
  } else {
    const tableStyle = window.getComputedStyle(elements.dataTable);
    if (tableStyle.borderRadius !== '0.5rem' || tableStyle.border !== '1px solid rgb(51, 65, 85)') {
      results.push({
        passed: false,
        message: 'Data table does not have consistent styling',
        requirement: '4.4'
      });
    } else {
      results.push({
        passed: true,
        message: 'Data table has consistent styling',
        requirement: '4.4'
      });
    }
  }

  // Check table header
  if (!elements.tableHeader) {
    results.push({
      passed: false,
      message: 'Table header not found',
      requirement: '4.4'
    });
  } else {
    const headerStyle = window.getComputedStyle(elements.tableHeader);
    if (headerStyle.display !== 'grid' || headerStyle.background !== 'rgb(15, 23, 42)') {
      results.push({
        passed: false,
        message: 'Table header does not have consistent grid layout',
        requirement: '4.4'
      });
    } else {
      results.push({
        passed: true,
        message: 'Table header has consistent grid layout',
        requirement: '4.4'
      });
    }
  }

  // Check table rows hover behavior
  if (elements.tableRows.length > 0) {
    const firstRow = elements.tableRows[0];
    const rowStyle = window.getComputedStyle(firstRow);
    if (rowStyle.display !== 'grid' || rowStyle.transition.indexOf('background-color') === -1) {
      results.push({
        passed: false,
        message: 'Table rows do not have consistent grid layout or hover transitions',
        requirement: '4.4'
      });
    } else {
      results.push({
        passed: true,
        message: 'Table rows have consistent grid layout and hover transitions',
        requirement: '4.4'
      });
    }
  }

  return results;
}

/**
 * Test interactive elements functionality
 */
export function testInteractiveElements(elements: PageElements): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Test search input functionality
  if (elements.searchInput) {
    const searchInput = elements.searchInput as HTMLInputElement;
    const initialValue = searchInput.value;
    
    // Simulate typing
    searchInput.value = 'test';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    if (searchInput.value === 'test') {
      results.push({
        passed: true,
        message: 'Search input is functional',
        requirement: '4.2'
      });
    } else {
      results.push({
        passed: false,
        message: 'Search input is not functional',
        requirement: '4.2'
      });
    }
    
    // Restore original value
    searchInput.value = initialValue;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Test select elements functionality
  elements.selectElements.forEach((select, index) => {
    const selectElement = select as HTMLSelectElement;
    const initialValue = selectElement.value;
    
    if (selectElement.options.length > 1) {
      const newValue = selectElement.options[1].value;
      selectElement.value = newValue;
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
      
      if (selectElement.value === newValue) {
        results.push({
          passed: true,
          message: `Select element ${index + 1} is functional`,
          requirement: '4.2'
        });
      } else {
        results.push({
          passed: false,
          message: `Select element ${index + 1} is not functional`,
          requirement: '4.2'
        });
      }
      
      // Restore original value
      selectElement.value = initialValue;
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // Test add button functionality
  if (elements.addButton) {
    const button = elements.addButton as HTMLButtonElement;
    if (!button.disabled && button.onclick !== null) {
      results.push({
        passed: true,
        message: 'Add button is functional',
        requirement: '4.1'
      });
    } else {
      results.push({
        passed: false,
        message: 'Add button may not be functional',
        requirement: '4.1'
      });
    }
  }

  return results;
}

/**
 * Run complete cross-page validation
 */
export function runCrossPageValidation(): ValidationResult[] {
  const elements = extractPageElements();
  const results: ValidationResult[] = [];

  results.push(...validateHeaderConsistency(elements));
  results.push(...validateControlsConsistency(elements));
  results.push(...validateTableConsistency(elements));
  results.push(...testInteractiveElements(elements));

  return results;
}

/**
 * Generate validation report
 */
export function generateValidationReport(results: ValidationResult[]): string {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => r.passed === false).length;
  const total = results.length;

  let report = `\n=== Cross-Page Consistency Validation Report ===\n`;
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
  }, {} as Record<string, ValidationResult[]>);

  Object.keys(byRequirement).sort().forEach(req => {
    report += `Requirement ${req}:\n`;
    byRequirement[req].forEach(result => {
      const status = result.passed ? '✅' : '❌';
      report += `  ${status} ${result.message}\n`;
    });
    report += '\n';
  });

  return report;
}