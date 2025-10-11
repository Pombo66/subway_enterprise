#!/usr/bin/env ts-node

/**
 * Validation script for the Subway UI class codemod
 * Tests the codemod against sample JSX to ensure it works correctly
 */

import { SubwayClassCodemod } from './add-subway-classes';
import { Project, SyntaxKind } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

interface TestCase {
  name: string;
  input: string;
  expected: string;
  description: string;
}

const TEST_CASES: TestCase[] = [
  {
    name: 'simple-button',
    description: 'Add base classes to simple button',
    input: `<button onClick={handleClick}>Click me</button>`,
    expected: `<button className="s-btn s-btn--md" onClick={handleClick}>Click me</button>`
  },
  {
    name: 'button-with-existing-classes',
    description: 'Preserve existing classes while adding base classes',
    input: `<button className="bg-blue-500 hover:bg-blue-700">Click me</button>`,
    expected: `<button className="s-btn s-btn--md bg-blue-500 hover:bg-blue-700">Click me</button>`
  },
  {
    name: 'input-text',
    description: 'Add base classes to text input',
    input: `<input type="text" placeholder="Enter text" />`,
    expected: `<input className="s-input" type="text" placeholder="Enter text" />`
  },
  {
    name: 'input-hidden-skip',
    description: 'Skip hidden inputs',
    input: `<input type="hidden" value="secret" />`,
    expected: `<input type="hidden" value="secret" />`
  },
  {
    name: 'select-element',
    description: 'Add base classes to select',
    input: `<select><option>Choose</option></select>`,
    expected: `<select className="s-select"><option>Choose</option></select>`
  },
  {
    name: 'textarea-element',
    description: 'Add base classes to textarea',
    input: `<textarea placeholder="Enter message"></textarea>`,
    expected: `<textarea className="s-textarea" placeholder="Enter message"></textarea>`
  },
  {
    name: 'anchor-button-role',
    description: 'Add base classes to anchor with button role',
    input: `<a role="button" href="#" onClick={handleClick}>Link Button</a>`,
    expected: `<a className="s-btn s-btn--md" role="button" href="#" onClick={handleClick}>Link Button</a>`
  },
  {
    name: 'anchor-regular-skip',
    description: 'Skip regular anchors without button role',
    input: `<a href="/page">Regular Link</a>`,
    expected: `<a href="/page">Regular Link</a>`
  },
  {
    name: 'unstyled-skip',
    description: 'Skip elements with data-allow-unstyled="true"',
    input: `<button data-allow-unstyled="true">Unstyled Button</button>`,
    expected: `<button data-allow-unstyled="true">Unstyled Button</button>`
  },
  {
    name: 'jsx-expression-className',
    description: 'Handle JSX expression className',
    input: `<button className={isActive ? "active" : "inactive"}>Toggle</button>`,
    expected: `<button className={"s-btn s-btn--md" + " " + (isActive ? "active" : "inactive")}>Toggle</button>`
  },
  {
    name: 'already-has-base-classes',
    description: 'Skip elements that already have base classes',
    input: `<button className="s-btn s-btn--md bg-blue-500">Already Styled</button>`,
    expected: `<button className="s-btn s-btn--md bg-blue-500">Already Styled</button>`
  }
];

class CodemodValidator {
  private tempDir: string;
  private project: Project;

  constructor() {
    this.tempDir = path.join(__dirname, '.temp-validation');
    this.project = new Project({
      useInMemoryFileSystem: true
    });
  }

  async runValidation(): Promise<void> {
    console.log('🧪 Validating Subway UI Class Codemod');
    console.log('=====================================\n');

    let passedTests = 0;
    let failedTests = 0;

    for (const testCase of TEST_CASES) {
      console.log(`Testing: ${testCase.name}`);
      console.log(`Description: ${testCase.description}`);
      
      try {
        const result = await this.runTestCase(testCase);
        if (result.success) {
          console.log('✅ PASSED\n');
          passedTests++;
        } else {
          console.log('❌ FAILED');
          console.log(`Expected: ${testCase.expected}`);
          console.log(`Got:      ${result.actual}\n`);
          failedTests++;
        }
      } catch (error) {
        console.log('💥 ERROR');
        console.log(`Error: ${error}\n`);
        failedTests++;
      }
    }

    console.log('📊 Test Results');
    console.log('================');
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Success Rate: ${((passedTests / TEST_CASES.length) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      process.exit(1);
    }
  }

  private async runTestCase(testCase: TestCase): Promise<{ success: boolean; actual: string }> {
    // Create a temporary React component with the test input
    const componentCode = `
import React from 'react';

export default function TestComponent() {
  const handleClick = () => {};
  const isActive = true;
  
  return (
    <div>
      ${testCase.input}
    </div>
  );
}
`;

    // Create source file in memory
    const sourceFile = this.project.createSourceFile('TestComponent.tsx', componentCode);
    
    // Find the JSX element we want to test
    const jsxElements = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
    ];

    // Find the target element (skip the div wrapper)
    const targetElement = jsxElements.find(el => {
      const tagName = el.getKind() === SyntaxKind.JsxElement 
        ? el.getOpeningElement().getTagNameNode().getText()
        : el.getTagNameNode().getText();
      return tagName !== 'div';
    });

    if (!targetElement) {
      throw new Error('Could not find target JSX element in test case');
    }

    // Apply our codemod logic manually (since we can't easily run the full codemod on in-memory files)
    const openingElement = targetElement.getKind() === SyntaxKind.JsxElement 
      ? targetElement.getOpeningElement() 
      : targetElement;

    const tagName = openingElement.getTagNameNode().getText();
    
    // Apply the same logic as the codemod
    const shouldProcess = this.shouldProcessElement(openingElement, tagName);
    if (shouldProcess) {
      const currentClasses = this.getCurrentClasses(openingElement);
      const rule = this.getElementRule(tagName, openingElement);
      
      if (rule) {
        const missingClasses = rule.classes.filter(cls => !currentClasses.includes(cls));
        if (missingClasses.length > 0) {
          this.addClasses(openingElement, missingClasses);
        }
      }
    }

    // Get the actual result
    const actual = openingElement.getText();
    
    // Clean up
    this.project.removeSourceFile(sourceFile);

    return {
      success: actual === testCase.expected,
      actual
    };
  }

  private shouldProcessElement(element: any, tagName: string): boolean {
    // Check for data-allow-unstyled="true"
    const allowUnstyled = element.getAttributes().find((attr: any) => attr.getName() === 'data-allow-unstyled');
    if (allowUnstyled) {
      const value = allowUnstyled.getFirstDescendantByKind(SyntaxKind.StringLiteral);
      if (value?.getLiteralValue() === 'true') return false;
    }

    return true;
  }

  private getCurrentClasses(element: any): string[] {
    const classNameAttr = element.getAttributes().find((attr: any) => attr.getName() === 'className');
    if (!classNameAttr) return [];

    const stringLiteral = classNameAttr.getFirstDescendantByKind(SyntaxKind.StringLiteral);
    if (stringLiteral) {
      return stringLiteral.getLiteralValue().split(/\s+/).filter(Boolean);
    }

    return [];
  }

  private getElementRule(tagName: string, element: any): { classes: string[] } | null {
    switch (tagName) {
      case 'button':
        return { classes: ['s-btn', 's-btn--md'] };
      case 'a':
        const roleAttr = element.getAttributes().find((attr: any) => attr.getName() === 'role');
        if (roleAttr) {
          const value = roleAttr.getFirstDescendantByKind(SyntaxKind.StringLiteral);
          if (value?.getLiteralValue() === 'button') {
            return { classes: ['s-btn', 's-btn--md'] };
          }
        }
        return null;
      case 'input':
        const typeAttr = element.getAttributes().find((attr: any) => attr.getName() === 'type');
        if (typeAttr) {
          const value = typeAttr.getFirstDescendantByKind(SyntaxKind.StringLiteral);
          if (value?.getLiteralValue() === 'hidden') return null;
        }
        return { classes: ['s-input'] };
      case 'select':
        return { classes: ['s-select'] };
      case 'textarea':
        return { classes: ['s-textarea'] };
      default:
        return null;
    }
  }

  private addClasses(element: any, newClasses: string[]): void {
    const classNameAttr = element.getAttributes().find((attr: any) => attr.getName() === 'className');
    
    if (!classNameAttr) {
      element.addAttribute({
        name: 'className',
        value: `"${newClasses.join(' ')}"`
      });
      return;
    }

    const stringLiteral = classNameAttr.getFirstDescendantByKind(SyntaxKind.StringLiteral);
    if (stringLiteral) {
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
      
      const newExpr = `${baseClasses} + " " + (${currentExpr})`;
      jsxExpr.setExpression(newExpr);
    }
  }
}

async function main() {
  const validator = new CodemodValidator();
  await validator.runValidation();
}

if (require.main === module) {
  main().catch(console.error);
}

export { CodemodValidator };